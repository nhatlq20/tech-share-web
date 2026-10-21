import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { submitEkycRequest, getMyEkycStatus } from '../controllers/ekycController.js';

const router = express.Router();

/**
 * Route cho người dùng (Renter / Member):
 * - POST /api/ekyc/submit: Nộp hồ sơ định danh CCCD 2 mặt
 * - GET  /api/ekyc/status: Kiểm tra trạng thái duyệt eKYC hiện tại
 */
router.post('/submit', protect, submitEkycRequest);
router.get('/status', protect, getMyEkycStatus);

export default router;
