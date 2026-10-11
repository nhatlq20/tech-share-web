import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    // Standard Atlas booking code (Format: BXXXXXXXXX e.g. B967685850)
    bookingCode: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    // Handover QR token (Format: TSQR-BXXXXXXXXX-XXXX)
    qrToken: {
      type: String,
      default: '',
      index: true,
    },

    // Device reference (Uniform ObjectId reference for web & mobile app)
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
      required: true,
      index: true,
    },
    device: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
      index: true,
    },

    // Renter reference (User)
    renterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    renter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    // Recipient display information
    renterInfo: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      email: { type: String, trim: true },
    },

    // Device owner reference (User)
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    // Rental period
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    totalDays: {
      type: Number,
      required: true,
      min: 1,
    },

    // Rental rate & discounts (Synchronized pricePerDayAtBooking & dailyRate)
    pricePerDayAtBooking: {
      type: Number,
      required: true,
      min: 0,
    },
    dailyRate: {
      type: Number,
      min: 0,
    },
    rentalFee: {
      type: Number,
      required: true,
      min: 0,
    },
    discountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Promotional voucher
    voucherCode: {
      type: String,
      trim: true,
      default: '',
    },
    voucherDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Security deposit (Synchronized depositFee & depositValue)
    depositFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    depositValue: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Total payment amount
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Delivery method and handover address
    deliveryMethod: {
      type: String,
      enum: ['pickup', 'delivery'],
      default: 'delivery',
    },
    deliveryAddress: {
      type: mongoose.Schema.Types.Mixed, // Supports both String (Atlas Mobile) and Object
      required: true,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },

    // Order status lifecycle
    status: {
      type: String,
      enum: ['pending', 'approved', 'active', 'completed', 'cancelled', 'rejected'],
      default: 'pending',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'deposit_held', 'paid', 'refunded'],
      default: 'unpaid',
    },
    paymentMethod: {
      type: String,
      enum: ['escrow', 'bank_transfer', 'cash_on_delivery'],
      default: 'escrow',
    },

    // Cancellation and rejection reasons
    rejectReason: {
      type: String,
      default: '',
    },
    cancelReason: {
      type: String,
      default: '',
    },

    // Handover condition photos (before & after)
    handoverPhotos: {
      beforeRental: [{ type: String }],
      afterRental: [{ type: String }],
    },

    // Device condition inspection notes
    conditionNotes: {
      before: { type: String, default: '' },
      after: { type: String, default: '' },
    },

    // Digital signature
    digitalSignature: {
      type: String,
      default: '',
    },

    // Order history timeline (Supports both timestamp and updatedAt)
    timeline: [
      {
        status: { type: String, required: true },
        note: { type: String, default: '' },
        timestamp: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      },
    ],

    // Rental extension request
    extensionRequest: {
      requestedDays: { type: Number, default: 0 },
      additionalFee: { type: Number, default: 0 },
      status: { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' },
      requestedEndDate: { type: Date },
    },

    // Dispute resolution (Synchronized disputeStatus & dispute)
    disputeStatus: {
      type: String,
      enum: ['none', 'pending', 'resolved_owner_compensated', 'resolved_renter_refunded', 'resolved_partial'],
      default: 'none',
    },
    disputeNote: {
      type: String,
      default: '',
    },
    dispute: {
      isDisputed: { type: Boolean, default: false },
      reason: { type: String, default: '' },
      requestedAmount: { type: Number, default: 0 },
      proofPhotos: [{ type: String }],
      resolutionStatus: {
        type: String,
        enum: ['none', 'pending', 'resolved_owner_compensated', 'resolved_renter_refunded', 'resolved_partial'],
        default: 'none',
      },
      adminNote: { type: String, default: '' },
      resolvedAt: { type: Date },
    },

    // Automated reminder flags
    reminder6hSent: { type: Boolean, default: false },
    reminder2hSent: { type: Boolean, default: false },
    isReviewed: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        // Synchronize field aliases on JSON export
        if (!ret.deviceId && ret.device) ret.deviceId = ret.device;
        if (!ret.device && ret.deviceId) ret.device = ret.deviceId;
        if (!ret.renterId && ret.renter) ret.renterId = ret.renter;
        if (!ret.renter && ret.renterId) ret.renter = ret.renterId;
        if (!ret.ownerId && ret.owner) ret.ownerId = ret.owner;
        if (!ret.owner && ret.ownerId) ret.owner = ret.ownerId;
        if (ret.pricePerDayAtBooking === undefined && ret.dailyRate !== undefined) {
          ret.pricePerDayAtBooking = ret.dailyRate;
        }
        if (ret.dailyRate === undefined && ret.pricePerDayAtBooking !== undefined) {
          ret.dailyRate = ret.pricePerDayAtBooking;
        }
        if (ret.depositFee === undefined && ret.depositValue !== undefined) {
          ret.depositFee = ret.depositValue;
        }
        if (ret.depositValue === undefined && ret.depositFee !== undefined) {
          ret.depositValue = ret.depositFee;
        }
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Synchronize field aliases before persisting to MongoDB Atlas
bookingSchema.pre('save', function (next) {
  if (!this.deviceId && this.device) this.deviceId = this.device;
  if (!this.device && this.deviceId) this.device = this.deviceId;
  if (!this.renterId && this.renter) this.renterId = this.renter;
  if (!this.renter && this.renterId) this.renter = this.renterId;
  if (!this.ownerId && this.owner) this.ownerId = this.owner;
  if (!this.owner && this.ownerId) this.owner = this.ownerId;

  if (this.pricePerDayAtBooking === undefined && this.dailyRate !== undefined) {
    this.pricePerDayAtBooking = this.dailyRate;
  }
  if (this.dailyRate === undefined && this.pricePerDayAtBooking !== undefined) {
    this.dailyRate = this.pricePerDayAtBooking;
  }

  if (this.depositFee === undefined && this.depositValue !== undefined) {
    this.depositFee = this.depositValue;
  }
  if (this.depositValue === undefined && this.depositFee !== undefined) {
    this.depositValue = this.depositFee;
  }

  // Auto-generate qrToken if missing
  if (!this.qrToken && this.bookingCode) {
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.qrToken = `TSQR-${this.bookingCode}-${suffix}`;
  }

  next();
});

bookingSchema.index({ renterId: 1, status: 1, createdAt: -1 });
bookingSchema.index({ renter: 1, status: 1, createdAt: -1 });
bookingSchema.index({ ownerId: 1, status: 1, createdAt: -1 });
bookingSchema.index({ owner: 1, status: 1, createdAt: -1 });
bookingSchema.index({ deviceId: 1, startDate: 1, endDate: 1 });
bookingSchema.index({ device: 1, startDate: 1, endDate: 1 });

export const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
export default Booking;
