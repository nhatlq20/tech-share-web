import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { requireAdmin } from '../middlewares/roleMiddleware.js';
import {
  getAdminAnalytics,
  getAdminUsers,
  toggleUserStatus,
  getAdminDevices,
  getAdminDeviceDetails,
  moderateDevice,
  removeDevice,
} from '../controllers/adminController.js';
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
  getAdminReviews,
  getAdminReviewDetails,
  moderateAdminReview,
} from '../controllers/admin/adminReviewController.js';
import {
  getAdminNotifications,
  sendAdminNotification,
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
router.patch('/users/:id/status', toggleUserStatus);

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

// ── PHASE 2: MODULE 5 — REVIEW MODERATION ─────────────────────────
router.get('/reviews/:id', getAdminReviewDetails);
router.patch('/reviews/:id/moderation', moderateAdminReview);
router.get('/reviews', getAdminReviews);

// ── PHASE 3: MODULE 7 — NOTIFICATION MANAGEMENT ───────────────────
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

export default router;
