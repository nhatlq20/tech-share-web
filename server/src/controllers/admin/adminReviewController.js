import mongoose from 'mongoose';
import Review from '../../models/Review.js';
import Device from '../../models/Device.js';
import Booking from '../../models/Booking.js';
import User from '../../models/User.js';
import { syncDeviceRating } from '../../services/reviewService.js';

/**
 * 1. GET /api/admin/reviews
 * Danh sách đánh giá hệ thống với bộ lọc đối tượng, điểm số và trạng thái kiểm duyệt
 */
export const getAdminReviews = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 15));
    const skip = (page - 1) * limit;

    const { rating, targetType, moderationStatus, search } = req.query;
    const query = {};

    if (rating && rating !== 'all') {
      const numRating = parseInt(rating, 10);
      if (!isNaN(numRating) && numRating >= 1 && numRating <= 5) {
        query.rating = numRating;
      }
    }

    if (targetType && targetType !== 'all') {
      query.targetType = targetType;
    }

    if (moderationStatus && moderationStatus !== 'all') {
      query.moderationStatus = moderationStatus;
    }

    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q, 'i');
      query.$or = [
        { comment: regex },
        { moderationReason: regex },
      ];
    }

    const total = await Review.countDocuments(query);
    const reviews = await Review.find(query)
      .populate('reviewerId', 'name email avatar role')
      .populate('deviceId', 'name brand category images dailyRate ratingAvg ratingCount')
      .populate('ownerId', 'name email avatar')
      .populate('renterId', 'name email avatar')
      .populate('bookingId', 'bookingCode status startDate endDate')
      .populate('moderatedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Chuẩn hóa tên trường hiển thị cho frontend
    const mapped = reviews.map((r) => ({
      ...r,
      reviewer: r.reviewerId,
      device: r.deviceId,
      owner: r.ownerId,
      renter: r.renterId,
      booking: r.bookingId,
    }));

    return res.json({
      success: true,
      data: mapped,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 2. GET /api/admin/reviews/:id
 * Chi tiết đánh giá, ngữ cảnh đơn thuê và lịch sử kiểm duyệt
 */
export const getAdminReviewDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'ID đánh giá không hợp lệ.' });
    }

    const review = await Review.findById(id)
      .populate('reviewerId', 'name email avatar phone role')
      .populate('deviceId', 'name brand category images dailyRate depositValue ratingAvg ratingCount')
      .populate('ownerId', 'name email avatar phone')
      .populate('renterId', 'name email avatar phone')
      .populate('bookingId', 'bookingCode status startDate endDate totalDays totalAmount')
      .populate('moderatedBy', 'name email')
      .lean();

    if (!review) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá.' });
    }

    return res.json({
      success: true,
      data: {
        ...review,
        reviewer: review.reviewerId,
        device: review.deviceId,
        owner: review.ownerId,
        renter: review.renterId,
        booking: review.bookingId,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 3. PATCH /api/admin/reviews/:id/moderation
 * Kiểm duyệt đánh giá (Duyệt, Ẩn vi phạm, Cảnh báo) và tự động đồng bộ rating aggregate
 */
export const moderateAdminReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'ID đánh giá không hợp lệ.' });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá.' });
    }

    const { moderationStatus, reason } = req.body;
    if (!['approved', 'hidden', 'flagged'].includes(moderationStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái kiểm duyệt phải là approved, hidden hoặc flagged.',
      });
    }

    const adminUserId = req.user?.userId || req.user?._id || req.user?.id;

    review.moderationStatus = moderationStatus;
    review.isHidden = moderationStatus === 'hidden';
    review.moderationReason = reason ? String(reason).trim() : review.moderationReason;
    if (adminUserId && mongoose.isValidObjectId(adminUserId)) {
      review.moderatedBy = new mongoose.Types.ObjectId(String(adminUserId));
    }
    review.moderatedAt = new Date();

    await review.save();

    // ĐỒNG BỘ ĐIỂM ĐÁNH GIÁ (Cross-module rating consistency)
    // Nếu đánh giá thuộc về thiết bị, tính toán lại ratingAvg và ratingCount ngay lập tức
    let updatedSummary = null;
    if (review.deviceId && (review.targetType === 'device' || !review.targetType)) {
      try {
        updatedSummary = await syncDeviceRating(review.deviceId);
      } catch (syncErr) {
        console.warn('Lỗi đồng bộ điểm đánh giá thiết bị:', syncErr.message);
      }
    }

    return res.json({
      success: true,
      data: review,
      summary: updatedSummary,
      message: 'Cập nhật trạng thái kiểm duyệt thành công.',
    });
  } catch (err) {
    next(err);
  }
};
