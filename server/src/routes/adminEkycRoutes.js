import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { requireAdmin } from '../middlewares/roleMiddleware.js';
import {
  getAdminEkycList,
  approveAdminEkyc,
  rejectAdminEkyc,
} from '../controllers/adminEkycController.js';

const router = express.Router();

/**
 * Route cho Quản trị viên (Admin) xét duyệt định danh eKYC:
 * - GET   /api/admin/ekyc (hoặc /api/admin/ekyc-requests): Tải danh sách đơn eKYC từ ekyc_requests
 * - PATCH /api/admin/ekyc/:id/approve: Duyệt đơn và cấp tích xanh
 * - PATCH /api/admin/ekyc/:id/reject: Từ chối đơn và gửi lý do
 */
router.get('/ekyc', protect, requireAdmin, getAdminEkycList);
router.get('/ekyc-requests', protect, requireAdmin, getAdminEkycList);
router.patch('/ekyc/:id/approve', protect, requireAdmin, approveAdminEkyc);
router.patch('/ekyc/:id/reject', protect, requireAdmin, rejectAdminEkyc);

export default router;
