import express from 'express';
import { login, getProfile, getCurrentUser, updateAvatar } from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Đăng nhập
router.post('/login', login);

// Lấy thông tin user hiện tại (cần Token)
router.get('/me', protect, getCurrentUser);

// Cập nhật ảnh đại diện lên Cloudinary
router.post('/avatar', protect, updateAvatar);
router.patch('/avatar', protect, updateAvatar);

// Lấy thông tin Profile theo userId (hoặc của chính mình qua token)
router.get('/profile', protect, getProfile);
router.get('/profile/:userId', getProfile);

export default router;
