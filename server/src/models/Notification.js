import mongoose from 'mongoose';

/**
 * 8. Bảng notifications (Tier 2 - Thông báo đa nền tảng)
 * Lưu trữ vĩnh viễn các thông báo hệ thống, đơn hàng, nhắc nhở trên MongoDB
 * Index tối ưu hóa: { userId: 1, isRead: 1, createdAt: -1 }
 */
const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['order', 'message', 'promo', 'system', 'reminder', 'review'],
      default: 'system',
      index: true,
    },
    url: {
      type: String,
      default: null,
      trim: true,
    },
    relatedId: {
      type: String,
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: 'notifications',
  }
);

// Compound index tối ưu tốc độ đếm và hiển thị badge thông báo chưa đọc
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export const Notification =
  mongoose.models.Notification || mongoose.model('Notification', notificationSchema, 'notifications');

export default Notification;
