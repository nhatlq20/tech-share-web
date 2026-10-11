import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  registerFcmToken,
  createTestNotification,
} from '../controllers/notificationController.js';

const router = express.Router();

// Tất cả routes thông báo đều yêu cầu xác thực JWT
router.use(protect);

router.get('/', getNotifications);
router.patch('/read-all', markAllNotificationsRead);
router.patch('/:id/read', markNotificationRead);
router.post('/fcm-token', registerFcmToken);
router.post('/test', createTestNotification);

export default router;

