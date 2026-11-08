import express from "express";
import {
  getDevices,
  getNearbyDevices,
  getRecommendedDevices,
  getDeviceById,
  createDevice,
  updateDevice,
  myDevices,
  deleteOwner,
} from "../controllers/deviceController.js";
import {
  getOwnerDevices,
  getOwnerAnalytics,
  toggleDeviceStatus,
  toggleBlockedDate,
} from "../controllers/ownerController.js";
import { getDeviceAvailability } from "../controllers/bookingController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { requireOwner } from "../middlewares/roleMiddleware.js";
import { getDeviceReviews, getDeviceRatingSummary, getReviewEligibility, createReview,
  updateReview, deleteReview, replyToReview } from '../controllers/reviewController.js';

// ============================================================================
// KHAI BÁO CÁC ENDPOINT ROUTE CHO DEVICE (THIẾT BỊ)
// ============================================================================
const router = express.Router();

// --- 1. Các route công khai không cần đăng nhập (Public Discovery Routes) ---
// Chức năng Bản đồ Nearby: Tìm thiết bị trong bán kính lân cận 10 km
router.get("/nearby", getNearbyDevices);

// Chức năng Trang chủ (Home): Gợi ý thiết bị gần nhất theo tọa độ hoặc thành phố (bán kính 100 km)
router.get("/recommended", getRecommendedDevices);

// --- 2. Các route quản lý của Owner (Cần xác thực & quyền Owner) ---
router.get("/my-devices", protect, requireOwner, getOwnerDevices);
router.get("/owner/analytics", getOwnerAnalytics);

// --- 3. Route danh sách thiết bị chung (Tìm kiếm, phân trang, lọc danh mục) ---
router.get("/", getDevices);

// --- 4. Các route chi tiết thiết bị & đánh giá (Device Detail & Reviews) ---
// Lấy lịch bận của thiết bị phục vụ chọn ngày thuê trên trang Detail
router.get("/:id/availability", getDeviceAvailability);

// Quản lý trạng thái và ngày bận thiết bị (Dành cho Owner)
router.delete("/:deviceId", protect, requireOwner, deleteOwner);
router.patch("/:id/status", toggleDeviceStatus);
router.patch("/:id/blocked-dates", toggleBlockedDate);

// Các endpoint đánh giá liên quan đến thiết bị
router.get('/:id/reviews/summary', getDeviceRatingSummary);
router.get('/:id/reviews/eligibility', protect, getReviewEligibility);
router.get('/:id/reviews', getDeviceReviews);
router.post('/:id/reviews', protect, createReview);
router.patch('/:id/reviews/:reviewId', protect, updateReview);
router.delete('/:id/reviews/:reviewId', protect, deleteReview);
router.put('/:id/reviews/:reviewId/reply', protect, replyToReview);

// Chức năng xem chi tiết một thiết bị (Device Detail - Public)
// Lưu ý: Đặt route parameterized /:id ở cuối danh sách GET để tránh trùng lặp với các route cố định
router.get("/:id", getDeviceById);

router.post("/", protect, requireOwner, createDevice);
router.put("/:id", protect, requireOwner, updateDevice);
router.patch("/:id/update", protect, requireOwner, updateDevice);

export default router;
