import mongoose from 'mongoose';

/**
 * 6. Bảng reviews (Tier 1 - Hỗ trợ Đánh giá 3 mục: Thiết bị, Chủ máy, Người thuê)
 * Unique Index trên { bookingId: 1, reviewerId: 1, targetType: 1 } để cả 3 luồng
 * đánh giá chạy trơn tru trên cùng 1 đơn hàng mà không bị lỗi trùng khóa bookingId.
 */
const reviewSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
      required: true,
      index: true,
    },
    renterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Người thực hiện đánh giá & Loại đối tượng được đánh giá (Hỗ trợ Mục 32, 33, 48)
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    targetType: {
      type: String,
      enum: ['device', 'owner', 'renter'],
      default: 'device',
    },

    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
    images: [{
      type: String,
    }],
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: 'reviews',
  }
);

// Virtual references
reviewSchema.virtual('reviewer', {
  ref: 'User',
  localField: 'reviewerId',
  foreignField: '_id',
  justOne: true,
});

reviewSchema.virtual('booking', {
  ref: 'Booking',
  localField: 'bookingId',
  foreignField: '_id',
  justOne: true,
});

reviewSchema.virtual('device', {
  ref: 'Device',
  localField: 'deviceId',
  foreignField: '_id',
  justOne: true,
});

// Tự động gán reviewerId nếu code cũ của App không truyền reviewerId
reviewSchema.pre('validate', function (next) {
  if (!this.reviewerId) {
    this.reviewerId = this.targetType === 'renter' ? this.ownerId : this.renterId;
  }
  next();
});

// Compound Indexes
reviewSchema.index({ bookingId: 1, reviewerId: 1, targetType: 1 }, { unique: true });
reviewSchema.index({ deviceId: 1, createdAt: -1 });

export const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema, 'reviews');
export default Review;

