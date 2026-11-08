import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { submitOwnerEkycRequest, getMyOwnerEkycStatus } from '../controllers/ownerEkycController.js';

const router = express.Router();

/**
 * Route cho người dùng (Renter nâng cấp lên Owner):
 * - POST /api/owner-ekyc/submit: Nộp hồ sơ định danh 3 ảnh (CCCD 2 mặt + chân dung cầm CCCD)
 * - GET  /api/owner-ekyc/status: Kiểm tra trạng thái nâng cấp Owner hiện tại
 */
router.post('/submit', protect, submitOwnerEkycRequest);
router.get('/status', protect, getMyOwnerEkycStatus);

export default router;

