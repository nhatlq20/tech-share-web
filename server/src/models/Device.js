import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    title: {
      type: String,
      required: [true, 'Tên thiết bị là bắt buộc'],
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    brand: {
      type: String,
      required: [true, 'Thương hiệu là bắt buộc'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Danh mục thiết bị là bắt buộc'],
      enum: ['smartphone', 'laptop', 'camera', 'drone', 'audio', 'accessory', 'tablet', 'other'],
    },
    condition: {
      type: String,
      enum: ['new', 'like_new', 'good', 'fair'],
      default: 'like_new',
    },
    dailyRate: {
      type: Number,
      required: [true, 'Giá thuê mỗi ngày là bắt buộc'],
      min: 0,
    },
    pricePerDay: {
      type: Number,
      min: 0,
    },
    depositValue: {
      type: Number,
      default: 0,
    },
    images: {
      type: [String],
      default: [],
    },
    specs: {
      type: Map,
      of: String,
      default: {},
    },
    description: {
      type: String,
      default: '',
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        default: [105.7826, 21.0285],
      },
    },
    address: {
      type: String,
      default: 'Hà Nội, Việt Nam',
    },
    status: {
      type: String,
      enum: ['available', 'rented', 'maintenance', 'hidden'],
      default: 'available',
    },
    blockedDates: [
      {
        type: Date,
      },
    ],
    rating: {
      type: Number,
      default: 5.0,
      min: 1.0,
      max: 5.0,
    },
    ratingAvg: {
      type: Number,
      default: 5.0,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    viewsCount: {
      type: Number,
      default: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        if (!ret.name && ret.title) ret.name = ret.title;
        if (!ret.title && ret.name) ret.title = ret.name;
        if (ret.pricePerDay === undefined && ret.dailyRate !== undefined) ret.pricePerDay = ret.dailyRate;
        if (ret.dailyRate === undefined && ret.pricePerDay !== undefined) ret.dailyRate = ret.pricePerDay;
        if (ret.ratingAvg === undefined && ret.rating !== undefined) ret.ratingAvg = ret.rating;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Auto-sync aliases before saving
deviceSchema.pre('save', function (next) {
  if (!this.title && this.name) this.title = this.name;
  if (!this.name && this.title) this.name = this.title;
  if (this.dailyRate === undefined && this.pricePerDay !== undefined) this.dailyRate = this.pricePerDay;
  if (this.pricePerDay === undefined && this.dailyRate !== undefined) this.pricePerDay = this.dailyRate;
  if (this.ratingAvg === undefined && this.rating !== undefined) this.ratingAvg = this.rating;
  next();
});

deviceSchema.index({ location: '2dsphere' });
deviceSchema.index({ category: 1, dailyRate: 1, status: 1 });

export const Device = mongoose.models.Device || mongoose.model('Device', deviceSchema);
export default Device;
