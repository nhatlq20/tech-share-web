import mongoose from 'mongoose';

/**
 * 12. Bảng ekyc_requests (Tier 3 - Định danh điện tử eKYC)
 * Quản lý hồ sơ định danh CCCD/CMND và ảnh selfie của người dùng
 */
const ekycRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    idCardFrontUrl: {
      type: String,
      required: true,
    },
    idCardBackUrl: {
      type: String,
      required: true,
    },
    selfieUrl: {
      type: String,
      required: true,
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
    collection: 'ekyc_requests',
  }
);

ekycRequestSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

export const EkycRequest =
  mongoose.models.EkycRequest || mongoose.model('EkycRequest', ekycRequestSchema, 'ekyc_requests');

export default EkycRequest;

