/**
 * uploadService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Tối ưu upload avatar:
 *   1. Nén + resize ảnh bằng Canvas API (không cần thư viện ngoài)
 *   2. Upload thẳng từ browser → Cloudinary (unsigned preset)
 *   3. Chỉ trả về URL ngắn → server chỉ cần lưu URL vào DB (payload ~100 bytes)
 *
 * So sánh hiệu suất:
 *   ❌ Cũ: File → base64(+33%) → JSON → Server (~MB) → Cloudinary (~MB) → 2 lần truyền
 *   ✅ Mới: File → Canvas compress → Blob → Cloudinary trực tiếp → URL → Server (~100B)
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Nén và resize ảnh bằng Canvas API
 * @param {File} file - File ảnh gốc
 * @param {Object} opts
 * @param {number} opts.maxWidth  - Chiều rộng tối đa (px), mặc định 800
 * @param {number} opts.maxHeight - Chiều cao tối đa (px), mặc định 800
 * @param {number} opts.quality   - Chất lượng JPEG 0–1, mặc định 0.82
 * @param {string} opts.mimeType  - Định dạng output, mặc định 'image/webp'
 * @returns {Promise<Blob>} Blob ảnh đã nén
 */
export const compressImage = (
  file,
  { maxWidth = 800, maxHeight = 800, quality = 0.82, mimeType = 'image/webp' } = {}
) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl); // Giải phóng bộ nhớ ngay

      // Tính tỉ lệ scale để giữ aspect ratio
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      // Smooth interpolation cho ảnh resize
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas toBlob thất bại – định dạng không được hỗ trợ'));
          }
        },
        mimeType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Không thể đọc file ảnh'));
    };

    img.src = objectUrl;
  });
};

/**
 * Upload Blob/File trực tiếp lên Cloudinary (unsigned preset)
 * Không qua server – tiết kiệm ~1 lần round-trip mạng
 *
 * @param {Blob|File} blob
 * @param {Object} opts
 * @param {string} opts.folder       - Thư mục trên Cloudinary
 * @param {string} opts.cloudName    - Cloud name (từ env)
 * @param {string} opts.uploadPreset - Unsigned upload preset (từ env)
 * @param {function} opts.onProgress - Callback(percent) theo dõi tiến độ upload
 * @returns {Promise<{url: string, publicId: string, width: number, height: number}>}
 */
export const uploadToCloudinaryDirect = (
  blob,
  {
    folder = 'techshare/avatars',
    // cloud_name và upload_preset là PUBLIC values – an toàn khi để ở client
    // Giống như thấy trong URL: res.cloudinary.com/oigtlazh/image/upload/...
    cloudName =
      process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || 'oigtlazh',
    uploadPreset =
      process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || 'techshare_avatar',
    onProgress = null,
  } = {}
) => {
  return new Promise((resolve, reject) => {
    if (!cloudName || !uploadPreset) {
      reject(new Error('Thiếu cấu hình Cloudinary trong biến môi trường client'));
      return;
    }

    const formData = new FormData();
    formData.append('file', blob, 'avatar.webp');
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', folder);

    const xhr = new XMLHttpRequest();
    const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    // Theo dõi tiến độ upload (chỉ có với XHR, không có với fetch)
    if (onProgress && typeof onProgress === 'function') {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.error) {
            reject(new Error(data.error.message || 'Cloudinary upload error'));
          } else {
            resolve({
              url: data.secure_url || data.url,
              publicId: data.public_id,
              width: data.width,
              height: data.height,
              format: data.format,
              bytes: data.bytes,
            });
          }
        } catch {
          reject(new Error('Phản hồi Cloudinary không hợp lệ'));
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err?.error?.message || `Cloudinary HTTP ${xhr.status}`));
        } catch {
          reject(new Error(`Cloudinary HTTP ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Lỗi kết nối khi tải lên Cloudinary'));
    xhr.onabort = () => reject(new Error('Upload bị huỷ'));

    xhr.open('POST', endpoint);
    xhr.send(formData);
  });
};

/**
 * Hàm tổng hợp: nén ảnh → upload Cloudinary → trả về URL
 * Dùng trong ProfilePage thay vì gửi base64 lên server
 *
 * @param {File} file - File ảnh từ input[type=file]
 * @param {Object} opts
 * @param {function} opts.onProgress - Callback(percent) 0→100
 * @param {number}   opts.maxSize    - Kích thước tối đa avatar (px), mặc định 800
 * @param {number}   opts.quality    - Chất lượng nén 0–1, mặc định 0.82
 * @returns {Promise<{url, publicId, originalSize, compressedSize, savings}>}
 */
export const uploadAvatar = async (file, { onProgress = null, maxSize = 800, quality = 0.82 } = {}) => {
  const originalSize = file.size;

  // Bước 1: Nén + resize bằng Canvas
  const compressed = await compressImage(file, {
    maxWidth: maxSize,
    maxHeight: maxSize,
    quality,
    mimeType: 'image/webp', // WebP nhỏ hơn JPEG ~25-35%
  });

  const compressedSize = compressed.size;
  const savingsPct = Math.round((1 - compressedSize / originalSize) * 100);

  console.info(
    `[Avatar] Nén: ${(originalSize / 1024).toFixed(0)}KB → ${(compressedSize / 1024).toFixed(0)}KB (-${savingsPct}%)`
  );

  // Bước 2: Upload thẳng lên Cloudinary từ browser
  const result = await uploadToCloudinaryDirect(compressed, { onProgress });

  return {
    ...result,
    originalSize,
    compressedSize,
    savingsPct,
  };
};

/**
 * Tải ảnh CCCD (Mặt trước / Mặt sau) lên Cloudinary thư mục techshare/ekyc
 * @param {File} file
 * @param {Object} opts
 * @param {function} opts.onProgress - Callback(percent) 0->100
 */
export const uploadEkycImage = async (file, { onProgress = null } = {}) => {
  const originalSize = file.size;

  // Nén nhẹ để giữ độ sắc nét các chi tiết số CCCD và chữ
  const compressed = await compressImage(file, {
    maxWidth: 1600,
    maxHeight: 1600,
    quality: 0.88,
    mimeType: 'image/jpeg',
  });

  const result = await uploadToCloudinaryDirect(compressed, {
    folder: 'techshare/ekyc',
    onProgress,
  });

  return {
    ...result,
    originalSize,
  };
};

const uploadService = { compressImage, uploadToCloudinaryDirect, uploadAvatar, uploadEkycImage };

export default uploadService;

