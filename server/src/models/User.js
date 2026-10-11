import mongoose from 'mongoose';

/**
 * User Schema - Collection: users
 * Lưu thông tin hồ sơ cá nhân, vai trò, tín nhiệm, ví tiền, v.v.
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Họ tên là bắt buộc'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email là bắt buộc'],
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
    },
    phone: {
      type: String,
      default: '',
    },
    address: {
      type: String,
      default: '',
    },
    avatar: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['admin', 'owner', 'renter'],
      default: 'renter',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    trustScore: {
      type: Number,
      default: 100,
    },
    badges: {
      type: [String],
      default: [],
    },
    referralCode: {
      type: String,
      default: '',
    },
    referredBy: {
      type: String,
      default: null,
    },
    wishlist: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Device',
      default: [],
    },
    walletBalance: {
      type: Number,
      default: 0,
    },
    walletEscrowBalance: {
      type: Number,
      default: 0,
    },
    expoPushToken: {
      type: String,
      default: '',
    },
    pushTokens: {
      type: [String],
      default: [],
    },
    fcmTokens: {
      type: [String],
      default: [],
    },
    biometricEnabled: {
      type: Boolean,
      default: false,
    },
    location: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    rating: {
      type: Number,
      default: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

export const User = mongoose.models.User || mongoose.model('User', userSchema, 'users');
export default User;
