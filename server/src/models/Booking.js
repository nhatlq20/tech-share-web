import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    bookingCode: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    device: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
      required: true,
      index: true,
    },
    deviceId: {
      type: String,
      index: true,
    },
    renter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    renterId: {
      type: String,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    ownerId: {
      type: String,
      index: true,
    },
    renterInfo: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      email: { type: String, trim: true },
    },
    startDate: {
      type: Date,
      required: [true, 'Ngày nhận máy là bắt buộc'],
    },
    endDate: {
      type: Date,
      required: [true, 'Ngày trả máy là bắt buộc'],
    },
    totalDays: {
      type: Number,
      required: true,
      min: 1,
    },
    dailyRate: {
      type: Number,
      required: true,
      min: 0,
    },
    rentalFee: {
      type: Number,
      required: true,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    voucherCode: {
      type: String,
      trim: true,
      default: '',
    },
    depositValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
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
    deliveryAddress: {
      recipientName: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      address: { type: String, required: true, trim: true },
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    handoverPhotos: {
      beforeRental: [{ type: String }],
      afterRental: [{ type: String }],
    },
    digitalSignature: {
      type: String,
      default: '',
    },
    timeline: [
      {
        status: { type: String, required: true },
        updatedAt: { type: Date, default: Date.now },
        note: { type: String, default: '' },
      },
    ],
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
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

bookingSchema.index({ renter: 1, status: 1, createdAt: -1 });
bookingSchema.index({ owner: 1, status: 1, createdAt: -1 });
bookingSchema.index({ device: 1, startDate: 1, endDate: 1 });

export const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
export default Booking;
