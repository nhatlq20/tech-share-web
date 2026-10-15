import mongoose from 'mongoose';

/**
 * Message Schema - Collection: messages
 * Lưu trữ lịch sử tin nhắn 1-1 giữa Renter và Owner theo từng Booking
 */
const messageSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['text', 'image', 'location', 'quick_template'],
      default: 'text',
    },
    content: {
      type: String,
      trim: true,
      default: '',
    },
    mediaUrl: {
      type: String,
      default: '',
    },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
      address: { type: String, default: '' },
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: 'messages',
  }
);

// Compound Index để truy vấn lịch sử chat theo booking và thời gian
messageSchema.index({ bookingId: 1, createdAt: 1 });
messageSchema.index({ receiverId: 1, status: 1 });

export const Message =
  mongoose.models.Message || mongoose.model('Message', messageSchema, 'messages');

export default Message;

