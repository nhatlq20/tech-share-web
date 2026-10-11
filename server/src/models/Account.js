import mongoose from 'mongoose';

/**
 * Account Schema - Collection: accounts
 * Đại diện cho tài khoản đăng nhập và xác thực hệ thống
 */
const accountSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Tên đăng nhập là bắt buộc'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: [true, 'Email là bắt buộc'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Mật khẩu băm là bắt buộc'],
    },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId liên kết với hồ sơ người dùng là bắt buộc'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'accounts',
  }
);

export const Account = mongoose.models.Account || mongoose.model('Account', accountSchema, 'accounts');
export default Account;
