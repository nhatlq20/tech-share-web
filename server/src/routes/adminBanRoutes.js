import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { requireAdmin } from '../middlewares/roleMiddleware.js';
import { toggleUserBanStatus, getUserBanInfo } from '../controllers/admin/adminBanController.js';

const router = express.Router();

// Áp dụng xác thực JWT và quyền Quản trị viên
router.use(protect, requireAdmin);

// Các endpoint chuyên biệt quản lý Khóa / Mở khóa tài khoản
router.patch('/users/:id/ban', toggleUserBanStatus);
router.patch('/users/:id/status', toggleUserBanStatus);
router.get('/users/:id/ban-info', getUserBanInfo);

export default router;

