import { api } from './api.js';

/**
 * Service chuyên biệt cho tính năng eKYC nâng cấp từ Renter lên Owner
 */

/**
 * Lấy trạng thái eKYC nâng cấp Owner của người dùng hiện tại
 */
export const getMyOwnerEkycStatus = async () => {
  return await api.get('/owner-ekyc/status');
};

/**
 * Nộp hồ sơ xác thực nâng cấp Owner (yêu cầu 3 ảnh: CCCD 2 mặt + chân dung cầm CCCD)
 * @param {Object} data
 * @param {string} data.idCardFrontUrl - Ảnh mặt trước CCCD
 * @param {string} data.idCardBackUrl - Ảnh mặt sau CCCD
 * @param {string} data.idCardHoldingUrl - Ảnh chân dung cầm CCCD
 * @param {string} [data.idCardNumber] - Số CCCD
 */
export const submitOwnerEkyc = async (data) => {
  return await api.post('/owner-ekyc/submit', data);
};

/**
 * Lấy danh sách hồ sơ nâng cấp Owner cho Quản trị viên (Admin)
 * @param {Object} [params] - { status: 'all'|'pending'|'approved'|'rejected', page: 1, limit: 100 }
 */
export const getAdminOwnerEkycList = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return await api.get(`/admin/owner-ekyc${query ? `?${query}` : ''}`);
};

/**
 * Phê duyệt hồ sơ nâng cấp Owner (chuyển role thành Owner)
 * @param {string} id - ID của hồ sơ owner_ekyc_requests
 */
export const approveAdminOwnerEkyc = async (id) => {
  return await api.patch(`/admin/owner-ekyc/${id}/approve`);
};

/**
 * Từ chối hồ sơ nâng cấp Owner kèm lý do
 * @param {string} id - ID của hồ sơ owner_ekyc_requests
 * @param {string} reason - Lý do từ chối
 */
export const rejectAdminOwnerEkyc = async (id, reason) => {
  return await api.patch(`/admin/owner-ekyc/${id}/reject`, { reason });
};

export default {
  getMyOwnerEkycStatus,
  submitOwnerEkyc,
  getAdminOwnerEkycList,
  approveAdminOwnerEkyc,
  rejectAdminOwnerEkyc,
};

