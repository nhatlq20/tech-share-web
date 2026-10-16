import mongoose from 'mongoose';

/**
 * 11. Bảng disputes (Tier 3 - Khiếu nại & Tranh chấp)
 * Quản lý tranh chấp tiền cọc, hư hỏng thiết bị giữa Renter và Owner do Admin xử lý
 */
const disputeSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    evidenceImages: [{
      type: String,
    }],
    requestedDeductAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'resolved'],
      default: 'pending',
      index: true,
    },
    adminDecision: {
      type: String,
      enum: ['full_refund', 'partial_deduct', 'full_deduct', 'none'],
      default: 'none',
    },
    finalDeductAmount: {
      type: Number,
      default: 0,
    },
    adminNote: {
      type: String,
      default: '',
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: 'disputes',
  }
);

disputeSchema.virtual('booking', {
  ref: 'Booking',
  localField: 'bookingId',
  foreignField: '_id',
  justOne: true,
});

disputeSchema.virtual('claimant', {
  ref: 'User',
  localField: 'raisedBy',
  foreignField: '_id',
  justOne: true,
});

export const Dispute = mongoose.models.Dispute || mongoose.model('Dispute', disputeSchema, 'disputes');
export default Dispute;

