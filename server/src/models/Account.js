import mongoose from 'mongoose';

/**
 * 2. Bảng accounts (Tier 1 - Xác thực & Bảo mật)
 * Quản lý đăng nhập JWT cho cả Mobile (AsyncStorage) và Web (localStorage / Cookie).
 */
const accountSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
    collection: 'accounts',
  }
);

// Virtual liên kết User profile từ collection users qua foreignField accountId
accountSchema.virtual('user', {
  ref: 'User',
  localField: '_id',
  foreignField: 'accountId',
  justOne: true,
});

// Tương thích ngược getter & setter cho userId
accountSchema.virtual('resolvedUserId')
  .get(function () {
    return this.userId || this.user?._id;
  });

export const Account = mongoose.models.Account || mongoose.model('Account', accountSchema, 'accounts');
export default Account;
