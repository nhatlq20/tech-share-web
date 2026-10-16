import mongoose from 'mongoose';

/**
 * 9. Bảng wallet_transactions (Tier 2 - Quản lý Ví & Giao dịch ký quỹ)
 * Lưu trữ lịch sử giao dịch: nạp tiền, thanh toán đơn, giữ cọc, hoàn cọc, nhận tiền thuê, rút tiền.
 */
const walletTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['topup', 'payment', 'deposit_hold', 'deposit_release', 'rental_income', 'withdrawal'],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    relatedBookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed'],
      default: 'success',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: 'wallet_transactions',
  }
);

walletTransactionSchema.index({ userId: 1, createdAt: -1 });

export const WalletTransaction =
  mongoose.models.WalletTransaction || mongoose.model('WalletTransaction', walletTransactionSchema, 'wallet_transactions');

export default WalletTransaction;

