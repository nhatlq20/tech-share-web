/**
 * Dịch vụ tải ảnh lên Cloudinary
 * Sử dụng REST API của Cloudinary với CLOUDINARY_CLOUD_NAME và CLOUDINARY_UPLOAD_PRESET từ .env
 */
export const uploadToCloudinary = async (fileData, folder = 'techshare/avatars') => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'oigtlazh';
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || 'techshare_avatar';

  if (!cloudName || !uploadPreset) {
    throw new Error('Thiếu cấu hình Cloudinary (CLOUDINARY_CLOUD_NAME hoặc CLOUDINARY_UPLOAD_PRESET) trong .env');
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  const payload = {
    file: fileData,
    upload_preset: uploadPreset,
    folder,
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    const errorMsg = data.error?.message || `Lỗi tải ảnh lên Cloudinary (HTTP ${response.status})`;
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

export default {
  uploadToCloudinary,
};
