import { api } from './api.js';
import { STORAGE_KEYS } from '../constants/config.js';

const getAuthHeaders = () => {
  const token =
    localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) ||
    localStorage.getItem('techshare_auth_token') ||
    localStorage.getItem('techshare_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ── OVERVIEW & KPIS ───────────────────────────────────────────────
export const getAdminAnalytics = async (options = {}) => {
  return api.get('/admin/analytics', { headers: getAuthHeaders(), ...options });
};

// ── MODULE 1: BOOKING MANAGEMENT ──────────────────────────────────
export const getAdminBookings = async (params = {}, options = {}) => {
  return api.get('/admin/bookings', { params, headers: getAuthHeaders(), ...options });
};

export const getAdminBookingDetails = async (bookingId, options = {}) => {
  return api.get(`/admin/bookings/${bookingId}`, { headers: getAuthHeaders(), ...options });
};

export const getAdminBookingTimeline = async (bookingId, options = {}) => {
  return api.get(`/admin/bookings/${bookingId}/timeline`, { headers: getAuthHeaders(), ...options });
};

export const getAdminBookingsExportUrl = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return `/api/admin/bookings/export${query ? `?${query}` : ''}`;
};

// ── MODULE 2: DISPUTE RESOLUTION ──────────────────────────────────
export const getAdminDisputes = async (params = {}, options = {}) => {
  return api.get('/admin/disputes', { params, headers: getAuthHeaders(), ...options });
};

export const getAdminDisputeDetails = async (disputeId, options = {}) => {
  return api.get(`/admin/disputes/${disputeId}`, { headers: getAuthHeaders(), ...options });
};

export const reviewAdminDispute = async (disputeId, payload = {}, options = {}) => {
  return api.patch(`/admin/disputes/${disputeId}/review`, payload, { headers: getAuthHeaders(), ...options });
};

export const resolveAdminDispute = async (disputeId, payload = {}, options = {}) => {
  return api.patch(`/admin/disputes/${disputeId}/resolve`, payload, { headers: getAuthHeaders(), ...options });
};

export const dismissAdminDispute = async (disputeId, payload = {}, options = {}) => {
  return api.patch(`/admin/disputes/${disputeId}/dismiss`, payload, { headers: getAuthHeaders(), ...options });
};

// ── MODULE 3: WALLET & TRANSACTION MANAGEMENT ─────────────────────
export const getAdminWalletOverview = async (options = {}) => {
  return api.get('/admin/wallet/overview', { headers: getAuthHeaders(), ...options });
};

export const getAdminWalletTransactions = async (params = {}, options = {}) => {
  return api.get('/admin/wallet/transactions', { params, headers: getAuthHeaders(), ...options });
};

export const getAdminWalletTransactionDetails = async (txId, options = {}) => {
  return api.get(`/admin/wallet/transactions/${txId}`, { headers: getAuthHeaders(), ...options });
};

export const getAdminUserWalletProfile = async (userId, options = {}) => {
  return api.get(`/admin/wallet/users/${userId}`, { headers: getAuthHeaders(), ...options });
};

export const getAdminWalletExportUrl = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return `/api/admin/wallet/export${query ? `?${query}` : ''}`;
};

// ── MODULE 4: VOUCHER MANAGEMENT ──────────────────────────────────
export const getAdminVouchers = async (params = {}, options = {}) => {
  return api.get('/admin/vouchers', { params, headers: getAuthHeaders(), ...options });
};

export const getAdminVoucherDetails = async (voucherId, options = {}) => {
  return api.get(`/admin/vouchers/${voucherId}`, { headers: getAuthHeaders(), ...options });
};

export const createAdminVoucher = async (payload = {}, options = {}) => {
  return api.post('/admin/vouchers', payload, { headers: getAuthHeaders(), ...options });
};

export const updateAdminVoucher = async (voucherId, payload = {}, options = {}) => {
  return api.patch(`/admin/vouchers/${voucherId}`, payload, { headers: getAuthHeaders(), ...options });
};

export const toggleAdminVoucherStatus = async (voucherId, payload = {}, options = {}) => {
  return api.patch(`/admin/vouchers/${voucherId}/status`, payload, { headers: getAuthHeaders(), ...options });
};

// ── MODULE 5: REVIEW MODERATION ───────────────────────────────────
export const getAdminReviews = async (params = {}, options = {}) => {
  return api.get('/admin/reviews', { params, headers: getAuthHeaders(), ...options });
};

export const getAdminReviewDetails = async (reviewId, options = {}) => {
  return api.get(`/admin/reviews/${reviewId}`, { headers: getAuthHeaders(), ...options });
};

export const moderateAdminReview = async (reviewId, payload = {}, options = {}) => {
  return api.patch(`/admin/reviews/${reviewId}/moderation`, payload, { headers: getAuthHeaders(), ...options });
};

// ── MODULE 6: ROLES & PERMISSIONS ─────────────────────────────────
export const getAdminRoles = async (options = {}) => {
  return api.get('/admin/roles', { headers: getAuthHeaders(), ...options });
};

export const getAdminRoleDetails = async (roleId, options = {}) => {
  return api.get(`/admin/roles/${roleId}`, { headers: getAuthHeaders(), ...options });
};

export const getAdminRoleAccounts = async (roleId, params = {}, options = {}) => {
  return api.get(`/admin/roles/${roleId}/accounts`, { params, headers: getAuthHeaders(), ...options });
};

export const updateAdminAccountRole = async (accountId, payload = {}, options = {}) => {
  return api.patch(`/admin/accounts/${accountId}/role`, payload, { headers: getAuthHeaders(), ...options });
};

// ── MODULE 7: NOTIFICATION MANAGEMENT ─────────────────────────────
export const getAdminNotifications = async (params = {}, options = {}) => {
  return api.get('/admin/notifications', { params, headers: getAuthHeaders(), ...options });
};

export const sendAdminNotification = async (payload = {}, options = {}) => {
  return api.post('/admin/notifications/send', payload, { headers: getAuthHeaders(), ...options });
};

export const getAdminNotificationHistory = async (params = {}, options = {}) => {
  return api.get('/admin/notifications/history', { params, headers: getAuthHeaders(), ...options });
};

// ── MODULE 8: ADVANCED ANALYTICS & REPORTS ────────────────────────
export const getAdminAdvancedAnalytics = async (params = {}, options = {}) => {
  return api.get('/admin/analytics/advanced', { params, headers: getAuthHeaders(), ...options });
};

export const getAdminAnalyticsExportUrl = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return `/api/admin/analytics/export${query ? `?${query}` : ''}`;
};

// ── MODULE 9: SYSTEM SETTINGS ─────────────────────────────────────
export const getAdminSettings = async (options = {}) => {
  return api.get('/admin/settings', { headers: getAuthHeaders(), ...options });
};

export const getAdminSettingByKey = async (key, options = {}) => {
  return api.get(`/admin/settings/${key}`, { headers: getAuthHeaders(), ...options });
};

export const updateAdminSetting = async (key, payload = {}, options = {}) => {
  return api.patch(`/admin/settings/${key}`, payload, { headers: getAuthHeaders(), ...options });
};

// ── MODULE 10: CENTRALIZED AUDIT LOGS ─────────────────────────────
export const getAdminAuditLogs = async (params = {}, options = {}) => {
  return api.get('/admin/audit-logs', { params, headers: getAuthHeaders(), ...options });
};

export const getAdminAuditStats = async (options = {}) => {
  return api.get('/admin/audit-logs/stats', { headers: getAuthHeaders(), ...options });
};

export const getAdminAuditLogsExportUrl = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return `/api/admin/audit-logs/export${query ? `?${query}` : ''}`;
};

export const adminService = {
  getAdminAnalytics,
  getAdminBookings,
  getAdminBookingDetails,
  getAdminBookingTimeline,
  getAdminBookingsExportUrl,
  getAdminDisputes,
  getAdminDisputeDetails,
  reviewAdminDispute,
  resolveAdminDispute,
  dismissAdminDispute,
  getAdminWalletOverview,
  getAdminWalletTransactions,
  getAdminWalletTransactionDetails,
  getAdminUserWalletProfile,
  getAdminWalletExportUrl,
  getAdminVouchers,
  getAdminVoucherDetails,
  createAdminVoucher,
  updateAdminVoucher,
  toggleAdminVoucherStatus,
  getAdminReviews,
  getAdminReviewDetails,
  moderateAdminReview,
  getAdminRoles,
  getAdminRoleDetails,
  getAdminRoleAccounts,
  updateAdminAccountRole,
  getAdminNotifications,
  sendAdminNotification,
  getAdminNotificationHistory,
  getAdminAdvancedAnalytics,
  getAdminAnalyticsExportUrl,
  getAdminSettings,
  getAdminSettingByKey,
  updateAdminSetting,
  getAdminAuditLogs,
  getAdminAuditStats,
  getAdminAuditLogsExportUrl,
};

export default adminService;
