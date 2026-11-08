import mongoose from 'mongoose';

const pointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true },
  },
  { _id: false }
);

/**
 * 3. Bảng users (Tier 1 - Hồ sơ Đa nền tảng Web & Mobile)
 * Nhóm thông tin tín nhiệm và cấu hình thông báo cho web và ứng dụng di động.
 */
const userSchema = new mongoose.Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      sparse: true,
      trim: true,
      lowercase: true,
      index: true,
      get: function (v) {
        return v || this.account?.email || this._email || '';
      },
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    address: {
      type: String,
      default: '',
    },
    avatar: {
      type: String,
      default: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
    },
    role: {
      type: String,
      enum: ['renter', 'owner', 'both', 'admin'],
      default: 'renter',
      get: function (v) {
        return v || this.account?.roleId?.code || this.account?.roleId || this._role || 'renter';
      },
    },

    // 1. Nhóm Tín nhiệm & Định danh (Issue #7, #8)
    trust: {
      isVerified: { type: Boolean, default: false },
      score: { type: Number, default: 100, min: 0, max: 200 },
      badges: [{ type: String }],
    },

    // 3. Nhóm Thiết bị & Push Notification (Hỗ trợ cả Mobile Expo & Web FCM)
    pushConfig: {
      expoPushToken: { type: String, default: '' },
      fcmTokens: [{ type: String }], // Dùng cho Web Push & FCM
      biometricEnabled: { type: Boolean, default: false }, // Dùng cho Mobile App FaceID/TouchID
    },

    // 4. Vị trí Địa lý GeoJSON & Cá nhân hóa
    location: {
      type: pointSchema,
      default: undefined,
      required: false,
    },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Device' }],

    referralCode: {
      type: String,
      unique: true,
      sparse: true,
      set: (v) => (v && v.trim() ? v.trim() : undefined),
    },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    rating: { type: Number, default: 5.0, min: 1.0, max: 5.0 },
    totalReviews: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isbanned: { type: Boolean, default: false },
    banReason: { type: String, default: '' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, getters: true },
    toObject: { virtuals: true, getters: true },
    collection: 'users',
  }
);

// Virtual liên kết Account
userSchema.virtual('account', {
  ref: 'Account',
  localField: 'accountId',
  foreignField: '_id',
  justOne: true,
});

// Virtual Getters & Setters 2 chiều (Đảm bảo Mobile App & Web gọi kiểu cũ hay mới đều chạy)
userSchema.virtual('isVerified')
  .get(function () { return this.trust?.isVerified ?? false; })
  .set(function (v) { this.set('trust.isVerified', v); });

userSchema.virtual('trustScore')
  .get(function () { return this.trust?.score ?? 100; })
  .set(function (v) { this.set('trust.score', v); });

userSchema.virtual('badges')
  .get(function () { return this.trust?.badges ?? []; })
  .set(function (v) { this.set('trust.badges', v); });

userSchema.virtual('expoPushToken')
  .get(function () { return this.pushConfig?.expoPushToken ?? ''; })
  .set(function (v) { this.set('pushConfig.expoPushToken', v); });

userSchema.virtual('biometricEnabled')
  .get(function () { return this.pushConfig?.biometricEnabled ?? false; })
  .set(function (v) { this.set('pushConfig.biometricEnabled', v); });

// Alias cho avatarUrl
userSchema.virtual('avatarUrl')
  .get(function () { return this.avatar; })
  .set(function (v) { this.avatar = v; });

userSchema.index({ location: '2dsphere' });
userSchema.index({ 'trust.score': -1 });

export const User = mongoose.models.User || mongoose.model('User', userSchema, 'users');
export default User;
