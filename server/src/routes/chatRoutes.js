import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
  getConversations,
  getMessages,
  uploadImage,
  sendMessage,
  markAsRead,
  getUnreadCount,
} from '../controllers/chatController.js';

const router = express.Router();

// Tất cả endpoints chat đều yêu cầu đăng nhập
router.use(protect);

// 1. Danh sách hội thoại của user
router.get('/conversations', getConversations);

// 2. Tổng số tin nhắn chưa đọc của user
router.get('/unread-count', getUnreadCount);

// 2. Upload ảnh cho chat
router.post('/upload-image', uploadImage);

// 3. Chi tiết lịch sử chat theo booking
router.get('/:bookingId', getMessages);

// 4. Gửi tin nhắn mới
router.post('/:bookingId/messages', sendMessage);

// 5. Đánh dấu đã đọc
router.patch('/:bookingId/read', markAsRead);

export default router;

