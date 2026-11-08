import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { requireAdmin } from '../middlewares/roleMiddleware.js';
import {
  getAdminAnalytics,
  getAdminUsers,
  getAdminDevices,
  getAdminDeviceDetails,
  moderateDevice,
  removeDevice,
} from '../controllers/adminController.js';
import { toggleUserBanStatus } from '../controllers/admin/adminBanController.js';
import {
  getAdminEkycList,
  approveAdminEkyc,
  rejectAdminEkyc,
} from '../controllers/adminEkycController.js';
import {
  getAdminBookings,
  getAdminBookingDetails,
  getAdminBookingTimeline,
  exportAdminBookings,
} from '../controllers/admin/adminBookingController.js';
import {
  getAdminDisputes,
  getAdminDisputeDetails,
  reviewAdminDispute,
  resolveAdminDispute,
  dismissAdminDispute,
} from '../controllers/admin/adminDisputeController.js';
import {
  getAdminWalletOverview,
  getAdminWalletTransactions,
  getAdminWalletTransactionDetails,
  getAdminUserWalletProfile,
  exportAdminWalletTransactions,
} from '../controllers/admin/adminWalletController.js';
import {
  getAdminAuditLogs,
  exportAdminAuditLogs,
  getAdminAuditStats,
} from '../controllers/admin/adminAuditController.js';
import {
  getAdminVouchers,
  getAdminVoucherDetails,
  createAdminVoucher,
  updateAdminVoucher,
  toggleAdminVoucherStatus,
} from '../controllers/admin/adminVoucherController.js';
import {
  getAdminReviews,
  getAdminReviewDetails,
  moderateAdminReview,
} from '../controllers/admin/adminReviewController.js';
import {
  getAdminRoles,
  getAdminRoleDetails,
  getAdminRoleAccounts,
  updateAdminAccountRole,
} from '../controllers/admin/adminRoleController.js';
import {
  getAdminNotifications,
  sendAdminNotification,
  getAdminNotificationHistory,
} from '../controllers/admin/adminNotificationController.js';
import {
  getAdminAdvancedAnalytics,
  exportAdminAnalyticsReport,
} from '../controllers/admin/adminAdvancedAnalyticsController.js';
import {
  getAdminSettings,
  getAdminSettingByKey,
  updateAdminSetting,
} from '../controllers/admin/adminSettingsController.js';

const router = express.Router();

// Áp dụng xác thực JWT và phân quyền Admin chặt chẽ cho toàn bộ route /api/admin
router.use(protect, requireAdmin);

// ── OVERVIEW & KPIS ───────────────────────────────────────────────
router.get('/analytics', getAdminAnalytics);
router.get('/overview', getAdminAnalytics);

// ── USER MANAGEMENT & TRUST SCORE ─────────────────────────────────
router.get('/users', getAdminUsers);
router.patch('/users/:id/status', toggleUserBanStatus);
router.patch('/users/:id/ban', toggleUserBanStatus);

// ── DEVICE MODERATION ─────────────────────────────────────────────
router.get('/devices', getAdminDevices);
router.get('/devices/moderation', getAdminDevices);
router.get('/devices/:id', getAdminDeviceDetails);
router.patch('/devices/:id/moderate', moderateDevice);
router.post('/devices/:id/moderate', moderateDevice);
router.delete('/devices/:id', removeDevice);

// ── eKYC VERIFICATION ─────────────────────────────────────────────
router.get('/ekyc', getAdminEkycList);
router.get('/ekyc-requests', getAdminEkycList);
router.patch('/ekyc/:id/approve', approveAdminEkyc);
router.patch('/ekyc/:id/reject', rejectAdminEkyc);

// ── PHASE 1: MODULE 1 — BOOKING MANAGEMENT ────────────────────────
router.get('/bookings/export', exportAdminBookings);
router.get('/bookings/:id/timeline', getAdminBookingTimeline);
router.get('/bookings/:id', getAdminBookingDetails);
router.get('/bookings', getAdminBookings);

// ── PHASE 1: MODULE 2 — DISPUTE RESOLUTION ────────────────────────
router.get('/disputes/:id', getAdminDisputeDetails);
router.patch('/disputes/:id/review', reviewAdminDispute);
router.patch('/disputes/:id/resolve', resolveAdminDispute);
router.patch('/disputes/:id/dismiss', dismissAdminDispute);
router.get('/disputes', getAdminDisputes);

// ── PHASE 1: MODULE 3 — WALLET & TRANSACTION MANAGEMENT ───────────
router.get('/wallet/overview', getAdminWalletOverview);
router.get('/wallet/export', exportAdminWalletTransactions);
router.get('/wallet/users/:userId', getAdminUserWalletProfile);
router.get('/wallet/transactions/:id', getAdminWalletTransactionDetails);
router.get('/wallet/transactions', getAdminWalletTransactions);

// ── PHASE 2: MODULE 4 — VOUCHER MANAGEMENT ────────────────────────
router.get('/vouchers/:id', getAdminVoucherDetails);
router.patch('/vouchers/:id/status', toggleAdminVoucherStatus);
router.patch('/vouchers/:id', updateAdminVoucher);
router.post('/vouchers', createAdminVoucher);
router.get('/vouchers', getAdminVouchers);

// ── PHASE 2: MODULE 5 — REVIEW MODERATION ─────────────────────────
router.get('/reviews/:id', getAdminReviewDetails);
router.patch('/reviews/:id/moderation', moderateAdminReview);
router.get('/reviews', getAdminReviews);

// ── PHASE 2: MODULE 6 — ROLES & PERMISSIONS ───────────────────────
router.get('/roles/:id/accounts', getAdminRoleAccounts);
router.get('/roles/:id', getAdminRoleDetails);
router.get('/roles', getAdminRoles);
router.patch('/accounts/:id/role', updateAdminAccountRole);

// ── PHASE 3: MODULE 7 — NOTIFICATION MANAGEMENT ───────────────────
router.get('/notifications/history', getAdminNotificationHistory);
router.post('/notifications/send', sendAdminNotification);
router.get('/notifications', getAdminNotifications);

// ── PHASE 3: MODULE 8 — ADVANCED ANALYTICS & REPORTS ──────────────
router.get('/analytics/advanced', getAdminAdvancedAnalytics);
router.get('/analytics/export', exportAdminAnalyticsReport);

// ── PHASE 3: MODULE 9 — SYSTEM SETTINGS ───────────────────────────
router.get('/settings/:key', getAdminSettingByKey);
router.patch('/settings/:key', updateAdminSetting);
router.put('/settings/:key', updateAdminSetting);
router.get('/settings', getAdminSettings);

// ── PHASE 3: MODULE 10 — AUDIT LOGS ───────────────────────────────
router.get('/audit-logs/export', exportAdminAuditLogs);
router.get('/audit-logs/stats', getAdminAuditStats);
router.get('/audit-logs', getAdminAuditLogs);

export default router;
