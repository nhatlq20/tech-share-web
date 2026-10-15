import mongoose from 'mongoose';

/**
 * Otp Schema - Collection: otps
 * Quản lý mã OTP xác thực email khi đăng ký tài khoản (hết hạn sau 5 phút)
 */
const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otp: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      default: 'register',
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // Tự động xóa khỏi MongoDB sau khi expiresAt
    },
  },
  {
    timestamps: true,
    collection: 'otps',
  }
);

export const Otp = mongoose.models.Otp || mongoose.model('Otp', otpSchema, 'otps');
export default Otp;
