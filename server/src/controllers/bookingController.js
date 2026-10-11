import mongoose from 'mongoose';
import Device from '../models/Device.js';
import Booking from '../models/Booking.js';

/**
 * Format Date to YYYY-MM-DD in local/UTC string
 */
const formatDateKey = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Helper to generate unique booking code: TS-XXXXXX
 */
const generateBookingCode = async () => {
  let code = '';
  let exists = true;
  while (exists) {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    code = `TS-${randomNum}`;
    const found = await Booking.findOne({ bookingCode: code });
    if (!found) {
      exists = false;
    }
  }
  return code;
};

/**
 * 1. GET /api/devices/:id/availability
 * Returns blocked dates and active bookings for a device
 */
export const getDeviceAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Mã thiết bị không hợp lệ.',
      });
    }

    const device = await Device.findOne({ _id: id, isDeleted: { $ne: true } }).lean();
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thiết bị.',
      });
    }

    // Get today's start date (00:00:00)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get active/approved/pending bookings that end today or later
    const deviceQuery = mongoose.isValidObjectId(id)
      ? { $or: [{ device: new mongoose.Types.ObjectId(id) }, { deviceId: id.toString() }] }
      : { deviceId: id.toString() };

    const bookings = await Booking.find({
      ...deviceQuery,
      status: { $in: ['pending', 'approved', 'active'] },
      endDate: { $gte: today },
    })
      .select('bookingCode startDate endDate status')
      .lean();

    const disabledDatesSet = new Set();

    // 1. Add owner blocked dates
    const blockedDates = Array.isArray(device.blockedDates) ? device.blockedDates : [];
    blockedDates.forEach((date) => {
      disabledDatesSet.add(formatDateKey(date));
    });

    // 2. Add booked ranges
    const bookedRanges = bookings.map((b) => {
      const start = new Date(b.startDate);
      const end = new Date(b.endDate);

      // Iterate each day in range and mark as disabled
      const cur = new Date(start);
      cur.setHours(0, 0, 0, 0);
      const endClean = new Date(end);
      endClean.setHours(0, 0, 0, 0);

      while (cur <= endClean) {
        disabledDatesSet.add(formatDateKey(cur));
        cur.setDate(cur.getDate() + 1);
      }

      return {
        bookingCode: b.bookingCode,
        startDate: b.startDate,
        endDate: b.endDate,
        status: b.status,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        deviceId: id,
        title: device.title || device.name,
        dailyRate: device.dailyRate ?? device.pricePerDay ?? 0,
        depositValue: device.depositValue || 0,
        blockedDates,
        bookedRanges,
        disabledDates: Array.from(disabledDatesSet),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. POST /api/bookings
 * Create a new rental booking request
 */
export const createBooking = async (req, res, next) => {
  try {
    const {
      deviceId,
      startDate,
      endDate,
      deliveryAddress,
      renterInfo,
      voucherCode,
      note,
      paymentMethod = 'escrow',
    } = req.body;

    // Validate deviceId
    if (!deviceId || !mongoose.isValidObjectId(deviceId)) {
      return res.status(400).json({
        success: false,
        message: 'Mã thiết bị không hợp lệ.',
      });
    }

    const device = await Device.findOne({ _id: deviceId, isDeleted: { $ne: true } });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Thiết bị không tồn tại hoặc đã bị gỡ bỏ.',
      });
    }

    // Validate delivery address
    if (!deliveryAddress || !deliveryAddress.recipientName || !deliveryAddress.phone || !deliveryAddress.address) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin giao nhận (Tên, SĐT, Địa chỉ).',
      });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Ngày nhận hoặc ngày trả không đúng định dạng.',
      });
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      return res.status(400).json({
        success: false,
        message: 'Ngày nhận máy không thể ở trong quá khứ.',
      });
    }

    if (end < start) {
      return res.status(400).json({
        success: false,
        message: 'Ngày trả máy phải lớn hơn hoặc bằng ngày nhận máy.',
      });
    }

    // Calculate total days (1 day minimum)
    const diffTime = end.getTime() - start.getTime();
    const totalDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    // 1. Check conflicts with existing active/approved/pending bookings
    const conflictBooking = await Booking.findOne({
      $or: [{ device: device._id }, { deviceId: device._id.toString() }],
      status: { $in: ['pending', 'approved', 'active'] },
      startDate: { $lte: end },
      endDate: { $gte: start },
    });

    if (conflictBooking) {
      return res.status(409).json({
        success: false,
        message: 'Rất tiếc! Thiết bị đã có người đặt trong khoảng thời gian bạn chọn.',
      });
    }

    // 2. Check conflicts with owner blocked dates
    if (Array.isArray(device.blockedDates) && device.blockedDates.length > 0) {
      const hasBlockedConflict = device.blockedDates.some((bDate) => {
        const bd = new Date(bDate);
        bd.setHours(12, 0, 0, 0);
        return bd >= start && bd <= end;
      });

      if (hasBlockedConflict) {
        return res.status(409).json({
          success: false,
          message: 'Khoảng thời gian bạn chọn trùng với lịch bận đã khóa của chủ máy.',
        });
      }
    }

    // 3. Pricing & Discounts calculation
    const dailyRate = device.dailyRate ?? device.pricePerDay ?? 0;
    const rentalFee = dailyRate * totalDays;

    // Long rental discount (>=3 days: 10%, >=7 days: 20%)
    let longRentalDiscount = 0;
    if (totalDays >= 7) {
      longRentalDiscount = Math.round(rentalFee * 0.2);
    } else if (totalDays >= 3) {
      longRentalDiscount = Math.round(rentalFee * 0.1);
    }

    // Voucher discount validation
    let voucherDiscount = 0;
    const cleanVoucher = (voucherCode || '').toString().trim().toUpperCase();
    if (cleanVoucher === 'WELCOME50') {
      voucherDiscount = Math.min(50000, rentalFee);
    } else if (cleanVoucher === 'WEEKEND10') {
      voucherDiscount = Math.round(rentalFee * 0.1);
    }

    const discountAmount = longRentalDiscount + voucherDiscount;
    const depositValue = device.depositValue || 0;
    const finalRentalFee = Math.max(0, rentalFee - discountAmount);
    const totalAmount = finalRentalFee + depositValue;

    // Generate unique booking code
    const bookingCode = await generateBookingCode();

    const newBooking = new Booking({
      bookingCode,
      device: device._id,
      deviceId: device._id.toString(),
      owner: device.owner || null,
      ownerId: device.owner ? device.owner.toString() : '',
      renterInfo: renterInfo || {
        name: deliveryAddress.recipientName,
        phone: deliveryAddress.phone,
        email: '',
      },
      startDate: start,
      endDate: end,
      totalDays,
      dailyRate,
      rentalFee,
      discountAmount,
      voucherCode: cleanVoucher,
      depositValue,
      totalAmount,
      status: 'pending',
      paymentStatus: 'unpaid',
      paymentMethod,
      deliveryAddress,
      note: (note || '').trim(),
      timeline: [
        {
          status: 'pending',
          updatedAt: new Date(),
          note: 'Đơn thuê đã được gửi thành công, chờ chủ máy phê duyệt.',
        },
      ],
    });

    await newBooking.save();

    return res.status(201).json({
      success: true,
      message: 'Đặt thuê thiết bị thành công! Đơn của bạn đang chờ chủ máy duyệt.',
      data: newBooking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. GET /api/bookings/my-bookings
 * Returns bookings list with optional status filtering
 */
export const getMyBookings = async (req, res, next) => {
  try {
    const { status, limit = 20, page = 1 } = req.query;
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const total = await Booking.countDocuments(filter);
    const bookings = await Booking.find(filter)
      .populate('device', 'title name brand category images dailyRate depositValue location address')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    return res.status(200).json({
      success: true,
      count: bookings.length,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. GET /api/bookings/:id
 * Retrieve details of a single booking
 */
export const getBookingById = async (req, res, next) => {
  try {
    const { id } = req.params;

    let query = { bookingCode: id };
    if (mongoose.isValidObjectId(id)) {
      query = { $or: [{ _id: id }, { bookingCode: id }] };
    }

    const booking = await Booking.findOne(query)
      .populate('device', 'title name brand category images dailyRate depositValue location address specs condition')
      .lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin đơn thuê.',
      });
    }

    return res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 5. POST /api/bookings/validate-pricing
 * Helper endpoint to calculate exact pricing and preview discount breakdown
 */
export const validatePricing = async (req, res, next) => {
  try {
    const { deviceId, startDate, endDate, voucherCode } = req.body;

    if (!deviceId || !mongoose.isValidObjectId(deviceId)) {
      return res.status(400).json({ success: false, message: 'Mã thiết bị không hợp lệ.' });
    }

    const device = await Device.findOne({ _id: deviceId, isDeleted: { $ne: true } }).lean();
    if (!device) {
      return res.status(404).json({ success: false, message: 'Thiết bị không tồn tại.' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return res.status(400).json({ success: false, message: 'Khoảng thời gian không hợp lệ.' });
    }

    const diffTime = end.getTime() - start.getTime();
    const totalDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const dailyRate = device.dailyRate ?? device.pricePerDay ?? 0;
    const rentalFee = dailyRate * totalDays;

    let longRentalDiscount = 0;
    let longRentalDiscountPercent = 0;
    if (totalDays >= 7) {
      longRentalDiscountPercent = 20;
      longRentalDiscount = Math.round(rentalFee * 0.2);
    } else if (totalDays >= 3) {
      longRentalDiscountPercent = 10;
      longRentalDiscount = Math.round(rentalFee * 0.1);
    }

    let voucherDiscount = 0;
    let voucherValid = false;
    let voucherMessage = '';
    const cleanVoucher = (voucherCode || '').toString().trim().toUpperCase();

    if (cleanVoucher === 'WELCOME50') {
      voucherDiscount = Math.min(50000, rentalFee);
      voucherValid = true;
      voucherMessage = 'Đã áp dụng mã WELCOME50 (-50.000đ)';
    } else if (cleanVoucher === 'WEEKEND10') {
      voucherDiscount = Math.round(rentalFee * 0.1);
      voucherValid = true;
      voucherMessage = 'Đã áp dụng mã WEEKEND10 (-10%)';
    } else if (cleanVoucher) {
      voucherMessage = 'Mã voucher không hợp lệ hoặc đã hết hạn';
    }

    const discountAmount = longRentalDiscount + voucherDiscount;
    const depositValue = device.depositValue || 0;
    const finalRentalFee = Math.max(0, rentalFee - discountAmount);
    const totalAmount = finalRentalFee + depositValue;

    return res.status(200).json({
      success: true,
      data: {
        totalDays,
        dailyRate,
        rentalFee,
        longRentalDiscount,
        longRentalDiscountPercent,
        voucherDiscount,
        voucherValid,
        voucherMessage,
        discountAmount,
        depositValue,
        finalRentalFee,
        totalAmount,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getDeviceAvailability,
  createBooking,
  getMyBookings,
  getBookingById,
  validatePricing,
};
