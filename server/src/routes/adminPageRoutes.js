import express from 'express';
import { protectAdminPage } from '../middlewares/adminPageAuthMiddleware.js';
import { requireAdmin } from '../middlewares/roleMiddleware.js';
import {
  renderLoginPage,
  handleLogin,
  handleLogout,
  renderDashboardPage,
  renderUserManagerPage,
  renderDeviceModerationPage,
  renderEkycVerificationPage,
  renderOwnerEkycPage,
  renderBookingManagementPage,
  renderReviewModerationPage,
  renderNotificationManagementPage,
  renderAnalyticsPage,
  renderSettingsPage,
} from '../controllers/admin/adminPageController.js';

const router = express.Router();

// ── AUTHENTICATION ────────────────────────────────────────────────────────
router.get('/login', renderLoginPage);
router.post('/login', handleLogin);
router.get('/logout', handleLogout);

// ── PROTECTED ADMIN EJS PAGES (Requires Active Admin Session) ───────────────
router.use(protectAdminPage);

router.get('/', renderDashboardPage);
router.get('/dashboard', renderDashboardPage);

router.get('/user-manager', renderUserManagerPage);
router.get('/users', renderUserManagerPage);

router.get('/device-moderation', renderDeviceModerationPage);
router.get('/devices', renderDeviceModerationPage);

router.get('/ekyc-verification', renderEkycVerificationPage);
router.get('/ekyc', renderEkycVerificationPage);
router.get(['/owner-ekyc-verification', '/owner-ekyc'], requireAdmin, renderOwnerEkycPage);

router.get('/booking-management', renderBookingManagementPage);
router.get('/bookings', renderBookingManagementPage);

router.get('/review-moderation', renderReviewModerationPage);
router.get('/reviews', renderReviewModerationPage);

router.get('/notification-management', renderNotificationManagementPage);
router.get('/notifications', renderNotificationManagementPage);

router.get('/analytics', renderAnalyticsPage);

router.get('/settings', renderSettingsPage);

export default router;
