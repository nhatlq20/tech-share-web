import mongoose from 'mongoose';

/**
 * Notification Schema - Collection: notifications
 * Lưu trữ vĩnh viễn các thông báo hệ thống, đơn hàng, nhắc nhở trên MongoDB
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
      enum: ['order', 'reminder', 'system', 'review', 'promo'],
      default: 'system',
      index: true,
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
    collection: 'notifications',
  }
);

// Compound index for fast queries by user and read state/creation date
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

export const Notification =
  mongoose.models.Notification || mongoose.model('Notification', notificationSchema, 'notifications');

export default Notification;

