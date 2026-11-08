import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { requireAdmin } from '../middlewares/roleMiddleware.js';
import {
  getAdminOwnerEkycList,
  approveAdminOwnerEkyc,
  rejectAdminOwnerEkyc,
} from '../controllers/adminOwnerEkycController.js';

const router = express.Router();

/**
 * Route cho Quản trị viên (Admin) xét duyệt hồ sơ eKYC nâng cấp Owner:
 * - GET   /api/admin/owner-ekyc: Tải danh sách đơn nâng cấp Owner từ collection owner_request
 * - PATCH /api/admin/owner-ekyc/:id/approve: Duyệt đơn và chuyển role thành Owner
 * - PATCH /api/admin/owner-ekyc/:id/reject: Từ chối đơn và gửi lý do
 */
router.get('/owner-ekyc', protect, requireAdmin, getAdminOwnerEkycList);
router.patch('/owner-ekyc/:id/approve', protect, requireAdmin, approveAdminOwnerEkyc);
router.patch('/owner-ekyc/:id/reject', protect, requireAdmin, rejectAdminOwnerEkyc);

export default router;

