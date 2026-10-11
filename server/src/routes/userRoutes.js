import express from 'express';
import { getProfile, getCurrentUser, updateAvatar } from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * Routes cho phân hệ người dùng chung (Users - phân theo roles: renter, owner, admin)
 */
// Lấy profile của người dùng hiện tại từ token
router.get('/me', protect, getCurrentUser);
router.get('/profile', protect, getProfile);

// Cập nhật ảnh đại diện (Upload Cloudinary)
router.post('/avatar', protect, updateAvatar);
router.patch('/avatar', protect, updateAvatar);

// Lấy thông tin profile người dùng theo userId từ collection users
router.get('/:userId', getProfile);

export default router;
