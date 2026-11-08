import mongoose from 'mongoose';

/**
 * Bảng owner_request (Định danh nâng cấp từ Renter lên Owner)
 * Quản lý hồ sơ định danh 3 ảnh: CCCD 2 mặt + Ảnh chân dung cầm CCCD của người dùng
 */
const ownerEkycRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fullName: {
      type: String,
      default: '',
      trim: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    idCardNumber: {
      type: String,
      default: '',
      trim: true,
    },
    idCardFrontUrl: {
      type: String,
      required: true,
    },
    idCardBackUrl: {
      type: String,
      required: true,
    },
    idCardHoldingUrl: {
      type: String,
      required: true, // Ảnh chân dung người dùng cầm CCCD trước ngực
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    rejectReason: {
      type: String,
      default: '',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: 'owner_request',
  }
);

ownerEkycRequestSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

export const OwnerEkycRequest =
  mongoose.models.OwnerRequest ||
  mongoose.models.OwnerEkycRequest ||
  mongoose.model('OwnerRequest', ownerEkycRequestSchema, 'owner_request');

export const OwnerRequest = OwnerEkycRequest;

export default OwnerEkycRequest;

