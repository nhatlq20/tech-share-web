import crypto from 'crypto';

/**
 * Dịch vụ tải ảnh lên Cloudinary
 * Sử dụng REST API của Cloudinary với upload_preset (unsigned upload)
 * Hỗ trợ:
 *  - base64 Data URI (data:image/...;base64,...)
 *  - URL ảnh công khai
 */
export const uploadToCloudinary = async (fileData, folder = 'techshare/avatars') => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      'Thiếu cấu hình Cloudinary (CLOUDINARY_CLOUD_NAME hoặc CLOUDINARY_UPLOAD_PRESET) trong .env'
    );
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  // Cloudinary unsigned upload yêu cầu multipart/form-data
  const formData = new FormData();
  formData.append('file', fileData);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', folder);

  const response = await fetch(endpoint, {
    method: 'POST',
    // Không set Content-Type thủ công – fetch tự thiết lập boundary cho FormData
    body: formData,
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    const errorMsg =
      data.error?.message ||
      `Lỗi tải ảnh lên Cloudinary (HTTP ${response.status})`;
    throw new Error(errorMsg);
  }

  return {
    url: data.secure_url || data.url,
    publicId: data.public_id,
    width: data.width,
    height: data.height,
    format: data.format,
  };
};

/**
 * Xoá ảnh trên Cloudinary theo publicId
 * Yêu cầu CLOUDINARY_API_KEY và CLOUDINARY_API_SECRET (signed request)
 */
export const deleteFromCloudinary = async (publicId) => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.warn(
      '[Cloudinary] Thiếu CLOUDINARY_API_KEY hoặc CLOUDINARY_API_SECRET – bỏ qua xoá ảnh cũ.'
    );
    return null;
  }

  // Tạo chữ ký xoá ảnh (signed destroy)
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHash('sha1')
    .update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
    .digest('hex');

  const formData = new FormData();
  formData.append('public_id', publicId);
  formData.append('api_key', apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signature);

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`;

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  return data;
};

export default {
  uploadToCloudinary,
  deleteFromCloudinary,
};
