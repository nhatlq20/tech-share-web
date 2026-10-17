import mongoose from 'mongoose';

/**
 * 4. Bảng devices (Tier 1 - Đã tối ưu & Tương thích cả Web + App)
 * Gom nhóm stats (sao, lượt thuê, doanh thu), gộp addressText vào location,
 * bổ sung trạng thái kiểm duyệt moderationStatus cho Admin.
 * Tương thích App & Web: Có sẵn Virtual Getters & Setters 2 chiều cho addressText,
 * ratingAvg, ratingCount, rentalCount, revenueTotal, dailyRate, title, v.v.
 */
const deviceSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // 1. Định danh & Phân loại thiết bị
    name: {
      type: String,
      required: true,
      trim: true,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['smartphone', 'laptop', 'camera', 'drone', 'audio', 'gaming', 'accessory'],
      required: true,
      index: true,
    },
    yearOfManufacture: {
      type: Number,
    },
    condition: {
      type: String,
      enum: ['new99', 'used95', 'scratched'],
      default: 'new99',
    },
    description: {
      type: String,
      required: true,
    },

    // 2. Đa phương tiện & Thông số kỹ thuật động (Specs Map)
    images: {
      type: [String],
      required: true,
      validate: [val => Array.isArray(val) && val.length > 0 && val.length <= 8, 'Cần từ 1 - 8 ảnh'],
    },
    specs: {
      type: Map,
      of: String,
      default: {},
    },
    accessories: [{
      type: String,
    }],

    // 3. Chi phí thuê & Tiền cọc
    pricePerDay: {
      type: Number,
      required: true,
      min: 10000,
      index: true,
    },
    depositAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    // 4. Vị trí Địa lý GeoJSON
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
      },
      addressText: {
        type: String,
        required: true,
      },
    },

    // 5. Trạng thái Kho, Lịch bận & Kiểm duyệt Admin
    status: {
      type: String,
      enum: ['available', 'maintenance', 'hidden', 'rented'],
      default: 'hidden',
      index: true,
    },
    moderationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    moderationReason: {
      type: String,
      default: '',
      trim: true,
    },
    rejectReason: {
      type: String,
      default: '',
      trim: true,
    },
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    moderatedAt: {
      type: Date,
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    blockedDates: [
      {
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        reason: { type: String, default: '' },
        _id: false,
      },
    ],

    // 6. Nhóm Thống kê Hiệu quả Kinh doanh
    stats: {
      ratingAvg: { type: Number, default: 5.0, min: 1.0, max: 5.0 },
      ratingCount: { type: Number, default: 0 },
      rentalCount: { type: Number, default: 0 },
      revenueTotal: { type: Number, default: 0 },
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: 'devices',
  }
);

// Virtuals 2 chiều giúp code App và Web truy cập trực tiếp
deviceSchema.virtual('owner', {
  ref: 'User',
  localField: 'ownerId',
  foreignField: '_id',
  justOne: true,
});

deviceSchema.virtual('addressText')
  .get(function () { return this.location?.addressText ?? ''; })
  .set(function (v) { this.set('location.addressText', v); });

deviceSchema.virtual('address')
  .get(function () { return this.location?.addressText ?? ''; })
  .set(function (v) { this.set('location.addressText', v); });

deviceSchema.virtual('ratingAvg')
  .get(function () { return this.stats?.ratingAvg ?? 5.0; })
  .set(function (v) { this.set('stats.ratingAvg', v); });

deviceSchema.virtual('rating')
  .get(function () { return this.stats?.ratingAvg ?? 5.0; })
  .set(function (v) { this.set('stats.ratingAvg', v); });

deviceSchema.virtual('ratingCount')
  .get(function () { return this.stats?.ratingCount ?? 0; })
  .set(function (v) { this.set('stats.ratingCount', v); });

deviceSchema.virtual('reviewCount')
  .get(function () { return this.stats?.ratingCount ?? 0; })
  .set(function (v) { this.set('stats.ratingCount', v); });

deviceSchema.virtual('rentalCount')
  .get(function () { return this.stats?.rentalCount ?? 0; })
  .set(function (v) { this.set('stats.rentalCount', v); });

deviceSchema.virtual('revenueTotal')
  .get(function () { return this.stats?.revenueTotal ?? 0; })
  .set(function (v) { this.set('stats.revenueTotal', v); });

deviceSchema.virtual('title')
  .get(function () { return this.name; })
  .set(function (v) { this.name = v; });

deviceSchema.virtual('dailyRate')
  .get(function () { return this.pricePerDay; })
  .set(function (v) { this.pricePerDay = v; });

deviceSchema.virtual('depositValue')
  .get(function () { return this.depositAmount; })
  .set(function (v) { this.depositAmount = v; });

// Pre-save hook đồng bộ các trường alias
deviceSchema.pre('save', function (next) {
  if (!this.name && this.title) this.name = this.title;
  if (!this.pricePerDay && this.dailyRate) this.pricePerDay = this.dailyRate;
  if (this.depositAmount === undefined && this.depositValue !== undefined) this.depositAmount = this.depositValue;
  if (this.stats?.ratingAvg === undefined && this.rating !== undefined) {
    if (!this.stats) this.stats = {};
    this.stats.ratingAvg = this.rating;
  }
  next();
});

deviceSchema.index({ location: '2dsphere' });
deviceSchema.index({ category: 1, status: 1, isDeleted: 1 });
deviceSchema.index({ name: 'text', brand: 'text', description: 'text' });
deviceSchema.index({ isDeleted: 1, moderationStatus: 1, createdAt: -1 });
deviceSchema.index({ isDeleted: 1, category: 1, moderationStatus: 1, createdAt: -1 });
deviceSchema.index({ isDeleted: 1, name: 1, brand: 1 });

export const Device = mongoose.models.Device || mongoose.model('Device', deviceSchema, 'devices');
export default Device;
