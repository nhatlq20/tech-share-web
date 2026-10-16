import mongoose from 'mongoose';

/**
 * 10. Bảng vouchers (Tier 2 - Khuyến mãi & Giảm giá)
 * Quản lý mã ưu đãi, voucher giảm giá cho các đơn thuê
 */
const voucherSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['fixed', 'percent'],
      default: 'fixed',
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    minDays: {
      type: Number,
      default: 1,
      min: 1,
    },
    maxDiscount: {
      type: Number,
      default: 0,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    usageLimit: {
      type: Number,
      default: 100,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    perUserLimit: {
      type: Number,
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: 'vouchers',
  }
);

export const Voucher = mongoose.models.Voucher || mongoose.model('Voucher', voucherSchema, 'vouchers');
export default Voucher;

