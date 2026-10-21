import mongoose from 'mongoose';
import Device from '../models/Device.js';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
import Account from '../models/Account.js';
import { createAndSendNotification } from '../services/notificationService.js';
import { getIO } from '../socket.js';

/**
 * My Bookings hub tabs. Each tab maps to one or more persisted booking statuses.
 * The "cancelled" tab also groups owner-rejected bookings.
 */
const MY_BOOKING_TAB_STATUSES = {
  pending: ['pending'],
  approved: ['approved'],
  active: ['active'],
  completed: ['completed'],
  cancelled: ['cancelled', 'rejected'],
};

const MY_BOOKINGS_DEFAULT_LIMIT = 10;
const MY_BOOKINGS_MAX_LIMIT = 50;
const CANCEL_REASON_MAX_LENGTH = 300;
const CANCELLABLE_STATUS = 'pending';

const BOOKING_DEVICE_LIST_FIELDS =
  'title name brand category images dailyRate pricePerDay depositValue depositAmount address location stats';
const BOOKING_DEVICE_DETAIL_FIELDS =
  'title name brand category images dailyRate pricePerDay depositValue depositAmount address location specs condition stats';
const BOOKING_PARTY_FIELDS = 'name email phone avatar rating totalReviews isVerified address';

/**
 * Resolve the authenticated user's ObjectId from the JWT payload set by `protect`.
 */
const getAuthUserObjectId = (req) => {
  const rawId = req.user?.userId || req.user?._id || req.user?.id;
  return rawId && mongoose.isValidObjectId(rawId)
    ? new mongoose.Types.ObjectId(String(rawId))
    : null;
};

/**
 * Build a query that matches bookings by ObjectId or bookingCode.
 */
const buildBookingLookup = (id) => (
  mongoose.isValidObjectId(id)
    ? { $or: [{ _id: id }, { bookingCode: id }] }
    : { bookingCode: id }
);

const isSameId = (a, b) => Boolean(a && b) && String(a._id || a) === String(b._id || b);

/**
 * Normalize alias fields (device/deviceId, renter/renterId, owner/ownerId) on lean documents.
 * Flattens pricing, delivery, handover, and statusReason into root fields for 100% compatibility.
 */
const normalizeBookingAliases = (booking) => {
  if (!booking) return booking;

  const rawDevice = booking.device || booking.deviceId || null;
  const device = rawDevice && typeof rawDevice === 'object' ? {
    ...rawDevice,
    title: rawDevice.title || rawDevice.name || '',
    name: rawDevice.name || rawDevice.title || '',
    address: rawDevice.address || rawDevice.location?.addressText || '',
    dailyRate: rawDevice.dailyRate ?? rawDevice.pricePerDay ?? 0,
    pricePerDay: rawDevice.pricePerDay ?? rawDevice.dailyRate ?? 0,
    depositValue: rawDevice.depositValue ?? rawDevice.depositAmount ?? 0,
    depositAmount: rawDevice.depositAmount ?? rawDevice.depositValue ?? 0,
  } : rawDevice;

  const resolveParty = (a, b) => {
    if (a && typeof a === 'object' && (a.name || a.email || a._id)) return a;
    if (b && typeof b === 'object' && (b.name || b.email || b._id)) return b;
    return a || b || null;
  };
  const owner = resolveParty(booking.owner, booking.ownerId);
  const renter = resolveParty(booking.renter, booking.renterId);

  // Unpack nested blocks if present, or fallback to root fields
  const pricing = booking.pricing || {};
  const delivery = booking.delivery || {};
  const handover = booking.handover || {};

  const pricePerDayAtBooking =
    booking.pricePerDayAtBooking ??
    pricing.pricePerDayAtBooking ??
    booking.dailyRate ??
    (device && typeof device === 'object' ? device.dailyRate : 0);

  const rentalFee = booking.rentalFee ?? pricing.rentalFee ?? 0;
  const discountPercent = booking.discountPercent ?? pricing.discountPercent ?? 0;
  const voucherCode = booking.voucherCode ?? pricing.voucherCode ?? '';
  const voucherDiscount = booking.voucherDiscount ?? pricing.voucherDiscount ?? 0;
  const discountAmount =
    booking.discountAmount ??
    (rentalFee * (discountPercent / 100) + voucherDiscount);

  const depositFee =
    booking.depositFee ??
    pricing.depositFee ??
    booking.depositValue ??
    booking.depositAmount ??
    (device && typeof device === 'object' ? device.depositValue : 0);

  const totalAmount =
    booking.totalAmount ??
    pricing.totalAmount ??
    booking.totalPrice ??
    (Math.max(0, rentalFee - discountAmount) + depositFee);

  const deliveryMethod =
    (typeof booking.deliveryMethod === 'string' ? booking.deliveryMethod : null) ??
    delivery.method ??
    'pickup';

  const deliveryAddress =
    (typeof booking.deliveryAddress === 'string'
      ? booking.deliveryAddress
      : (booking.deliveryAddress?.address || '')) ||
    delivery.address ||
    (deliveryMethod === 'pickup' ? (device?.address || '') : (renter?.address || '')) ||
    '';

  const renterInfo = booking.renterInfo || (renter && typeof renter === 'object' ? {
    name: renter.name || '',
    phone: renter.phone || '',
    email: renter.email || '',
  } : null);

  const qrToken = booking.qrToken ?? handover.qrToken ?? '';
  const handoverPhotos = booking.handoverPhotos ?? {
    beforeRental: handover.beforePhotos ?? [],
    afterRental: handover.afterPhotos ?? [],
  };
  const conditionNotes = booking.conditionNotes ?? {
    before: handover.beforeNote ?? '',
    after: handover.afterNote ?? '',
  };

  const cancelReason =
    booking.cancelReason ??
    (booking.status === 'cancelled' ? booking.statusReason : '');
  const rejectReason =
    booking.rejectReason ??
    (booking.status === 'rejected' ? booking.statusReason : '');

  // Calculate totalDays accurately if not provided
  let totalDays = booking.totalDays;
  if (!totalDays && booking.startDate && booking.endDate) {
    const diff = new Date(booking.endDate) - new Date(booking.startDate);
    totalDays = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }
  totalDays = totalDays || 1;

  return {
    ...booking,
    device,
    deviceId: device,
    owner,
    ownerId: owner,
    renter,
    renterId: renter,
    renterInfo,
    totalDays,
    pricePerDayAtBooking,
    dailyRate: pricePerDayAtBooking,
    rentalFee,
    discountPercent,
    discountAmount,
    voucherCode,
    voucherDiscount,
    depositFee,
    depositValue: depositFee,
    depositAmount: depositFee,
    totalAmount,
    totalPrice: totalAmount,
    deliveryMethod,
    deliveryAddress,
    qrToken,
    handoverPhotos,
    conditionNotes,
    cancelReason,
    rejectReason,
  };
};

/**
 * Format Date to YYYY-MM-DD in local string
 */
const formatDateKey = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Generate Atlas system standard booking code (Format BXXXXXXXXX, e.g. B967685850)
 * 100% consistent with tech-share-app mobile format
 */
const generateBookingCode = async () => {
  let code = '';
  let exists = true;
  while (exists) {
    const randomNum = Math.floor(100000000 + Math.random() * 900000000);
    code = `B${randomNum}`;
    const found = await Booking.findOne({ bookingCode: code });
    if (!found) {
      exists = false;
    }
  }
  return code;
};

/**
 * Generate device handover QR token (Format: TSQR-BXXXXXXXXX-XXXX)
 */
const generateQrToken = (bookingCode) => {
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TSQR-${bookingCode}-${suffix}`;
};

/**
 * 1. GET /api/devices/:id/availability
 * Retrieve busy schedule (owner's blockedDates and existing booked ranges)
 */
export const getDeviceAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid device ID.',
      });
    }

    const device = await Device.findOne({ _id: id, isDeleted: { $ne: true } }).lean();
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found.',
      });
    }

    // Get today's start date (00:00:00)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Query all valid active bookings for device (supporting both deviceId and device)
    const deviceObjId = new mongoose.Types.ObjectId(id);
    const bookings = await Booking.find({
      $or: [{ device: deviceObjId }, { deviceId: deviceObjId }],
      status: { $in: ['pending', 'approved', 'active'] },
      endDate: { $gte: today },
    })
      .select('bookingCode startDate endDate status')
      .lean();

    const disabledDatesSet = new Set();

    // 1. Get dates explicitly blocked by owner (blockedDates)
    const blockedDates = Array.isArray(device.blockedDates) ? device.blockedDates : [];
    blockedDates.forEach((date) => {
      disabledDatesSet.add(formatDateKey(date));
    });

    // 2. Get date ranges already booked by renters
    const bookedRanges = bookings.map((b) => {
      const start = new Date(b.startDate);
      const end = new Date(b.endDate);

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
        pricePerDayAtBooking: device.dailyRate ?? device.pricePerDay ?? 0,
        dailyRate: device.dailyRate ?? device.pricePerDay ?? 0,
        depositFee: device.depositValue || 0,
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
 * Create new booking with all fields synchronized with MongoDB Atlas schema
 */
export const createBooking = async (req, res, next) => {
  try {
    const {
      deviceId,
      startDate,
      endDate,
      deliveryMethod = 'delivery',
      deliveryAddress,
      renterId,
      renterInfo,
      voucherCode,
      note,
      paymentMethod = 'escrow',
    } = req.body;

    // Validate deviceId
    if (!deviceId || !mongoose.isValidObjectId(deviceId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid device ID.',
      });
    }

    const device = await Device.findOne({ _id: deviceId, isDeleted: { $ne: true } });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found or has been removed.',
      });
    }

    // Normalize handover delivery address to String format (Atlas / tech-share-app standard)
    let formattedDeliveryAddress = '';
    let recipientName = '';
    let phone = '';

    if (typeof deliveryAddress === 'object' && deliveryAddress !== null) {
      recipientName = deliveryAddress.recipientName || '';
      phone = deliveryAddress.phone || '';
      formattedDeliveryAddress = deliveryAddress.address || '';
    } else if (typeof deliveryAddress === 'string') {
      formattedDeliveryAddress = deliveryAddress.trim();
    }

    if (!formattedDeliveryAddress) {
      return res.status(400).json({
        success: false,
        message: 'Please provide delivery / handover address.',
      });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pickup date or return date format.',
      });
    }

    if (req.body.pickupTime && typeof req.body.pickupTime === 'string') {
      const [h, m] = req.body.pickupTime.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) start.setHours(h, m, 0, 0);
    } else if (startDate && String(startDate).length <= 10) {
      start.setHours(0, 0, 0, 0);
    }

    if (req.body.returnTime && typeof req.body.returnTime === 'string') {
      const [h, m] = req.body.returnTime.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) end.setHours(h, m, 0, 0);
    } else if (endDate && String(endDate).length <= 10) {
      end.setHours(23, 59, 59, 999);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      return res.status(400).json({
        success: false,
        message: 'Pickup date cannot be in the past.',
      });
    }

    if (end < start) {
      return res.status(400).json({
        success: false,
        message: 'Return date must be greater than or equal to pickup date.',
      });
    }

    // Calculate total rental days
    const diffTime = end.getTime() - start.getTime();
    const totalDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    // 1. Check date conflict against active / approved / pending bookings
    const deviceObjId = new mongoose.Types.ObjectId(deviceId);
    const conflictBooking = await Booking.findOne({
      $or: [{ device: deviceObjId }, { deviceId: deviceObjId }],
      status: { $in: ['pending', 'approved', 'active'] },
      startDate: { $lte: end },
      endDate: { $gte: start },
    });

    if (conflictBooking) {
      return res.status(409).json({
        success: false,
        message: 'Sorry! This device is already booked for the selected date range.',
      });
    }

    // 2. Check date conflict against owner blockedDates
    if (Array.isArray(device.blockedDates) && device.blockedDates.length > 0) {
      const hasBlockedConflict = device.blockedDates.some((bDate) => {
        const bd = new Date(bDate);
        bd.setHours(12, 0, 0, 0);
        return bd >= start && bd <= end;
      });

      if (hasBlockedConflict) {
        return res.status(409).json({
          success: false,
          message: 'Selected date range conflicts with owner blocked dates.',
        });
      }
    }

    // 3. Calculate rental fees and long-term rental discounts
    const dailyRate = device.dailyRate ?? device.pricePerDay ?? 0;
    const rentalFee = dailyRate * totalDays;

    let discountPercent = 0;
    let longRentalDiscount = 0;
    if (totalDays >= 7) {
      discountPercent = 20;
      longRentalDiscount = Math.round(rentalFee * 0.2);
    } else if (totalDays >= 3) {
      discountPercent = 10;
      longRentalDiscount = Math.round(rentalFee * 0.1);
    }

    const discountAmount = longRentalDiscount;
    const depositFee = device.depositValue ?? device.depositAmount ?? 0;
    const finalRentalFee = Math.max(0, rentalFee - discountAmount);
    const totalAmount = finalRentalFee + depositFee;

    // Generate booking code and handover QR token
    const bookingCode = await generateBookingCode();
    const qrToken = generateQrToken(bookingCode);

    // Resolve effective renterId & ownerId
    const effectiveRenterId = renterId && mongoose.isValidObjectId(renterId)
      ? new mongoose.Types.ObjectId(renterId)
      : (req.user?._id || null);

    const rawOwnerId = device.ownerId || device.owner || device._doc?.ownerId || device._doc?.owner;
    const effectiveOwnerId = rawOwnerId && mongoose.isValidObjectId(rawOwnerId)
      ? new mongoose.Types.ObjectId(String(rawOwnerId._id || rawOwnerId))
      : null;

    // Renter bắt buộc phải hoàn tất xác thực định danh (eKYC trong collection accounts) mới được thuê thiết bị
    if (effectiveRenterId) {
      const renterUser = await User.findById(effectiveRenterId).populate('account');
      const renterAccount = renterUser?.account || (renterUser?.accountId ? await Account.findById(renterUser.accountId) : null);
      const isRenterVerified = Boolean(renterAccount?.isVerified === true || renterUser?.trust?.isVerified === true || renterUser?.isVerified === true);

      if (renterUser && !isRenterVerified) {
        return res.status(403).json({
          success: false,
          requireEkyc: true,
          message: 'Bạn cần hoàn tất xác thực định danh (eKYC) trước khi đặt thuê thiết bị. Vui lòng vào trang cá nhân để nộp hồ sơ eKYC.',
        });
      }
    }

    // Create Booking instance with 100% Atlas B303349941 field ordering
    const newBooking = new Booking({
      bookingCode,
      qrToken,
      deviceId: device._id,
      device: device._id,
      renterId: effectiveRenterId,
      renter: effectiveRenterId,
      renterInfo: renterInfo || {
        name: recipientName || 'Renter',
        phone: phone || '',
        email: req.user?.email || '',
      },
      ownerId: effectiveOwnerId,
      owner: effectiveOwnerId,
      startDate: start,
      endDate: end,
      totalDays,
      pricePerDayAtBooking: dailyRate,
      dailyRate: dailyRate,
      rentalFee,
      discountPercent,
      discountAmount,
      voucherCode: '',
      voucherDiscount: 0,
      depositFee,
      depositValue: depositFee,
      totalAmount,
      deliveryMethod: deliveryMethod || 'delivery',
      deliveryAddress: formattedDeliveryAddress,
      note: (note || '').trim(),
      status: 'pending',
      paymentStatus: 'unpaid',
      statusReason: '',
      paymentMethod,
      rejectReason: '',
      cancelReason: '',
      pricing: {
        pricePerDayAtBooking: dailyRate,
        rentalFee,
        discountPercent,
        depositFee,
        voucherCode: '',
        voucherDiscount: 0,
        totalAmount,
      },
      delivery: {
        method: deliveryMethod || 'delivery',
        address: formattedDeliveryAddress,
      },
      handover: {
        qrToken,
        beforePhotos: [],
        afterPhotos: [],
        beforeNote: '',
        afterNote: '',
      },
      digitalSignature: '',
      timeline: [
        {
          status: 'pending',
          note: 'Booking created',
          timestamp: new Date(),
          updatedAt: new Date(),
        },
      ],
      extensionRequest: {
        requestedDays: 0,
        additionalFee: 0,
        status: 'none',
      },
      disputeStatus: 'none',
      disputeNote: '',
      dispute: {
        isDisputed: false,
        reason: '',
        requestedAmount: 0,
        proofPhotos: [],
        resolutionStatus: 'none',
        adminNote: '',
      },
      reminder6hSent: false,
      reminder2hSent: false,
      isReviewed: false,
    });

    await newBooking.save();

    // 4. Send real-time notification & Socket.IO event to device owner
    if (effectiveOwnerId) {
      const ownerTargetId = effectiveOwnerId.toString();
      const renterDisplayName =
        (typeof renterInfo === 'object' ? renterInfo?.name : '') ||
        recipientName ||
        req.user?.name ||
        req.user?.username ||
        'Khách thuê';
      const bookedDeviceName = device.name || device.title || 'Thiết bị';

      try {
        await createAndSendNotification({
          userId: ownerTargetId,
          title: 'Yêu cầu thuê thiết bị mới',
          body: `${renterDisplayName} vừa gửi yêu cầu thuê "${bookedDeviceName}" (Mã: ${bookingCode}). Vui lòng kiểm tra và duyệt đơn.`,
          type: 'order',
          relatedId: newBooking._id.toString(),
          url: '/owner/bookings',
        });
      } catch (notifErr) {
        console.warn('⚠️ Gửi thông báo yêu cầu thuê tới chủ thiết bị thất bại:', notifErr.message);
      }

      try {
        const io = getIO();
        if (io) {
          io.to(`user_${ownerTargetId}`).emit('new_booking_request', {
            bookingId: newBooking._id.toString(),
            bookingCode: newBooking.bookingCode,
            deviceId: device._id.toString(),
            deviceName: bookedDeviceName,
            renterName: renterDisplayName,
            status: 'pending',
          });
        }
      } catch (ioErr) {
        console.warn('⚠️ Socket emit new_booking_request error:', ioErr.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Device booked successfully! Awaiting owner approval.',
      data: newBooking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. GET /api/bookings/my-bookings?status=pending|approved|active|completed|cancelled
 * Retrieve the authenticated renter's bookings for one tab, with pagination
 * and per-tab badge counts in a single round trip.
 */
export const getMyBookings = async (req, res, next) => {
  try {
    const renterObjId = getAuthUserObjectId(req);
    if (!renterObjId) {
      return res.status(401).json({
        success: false,
        message: 'Unable to identify the current user. Please log in again.',
      });
    }

    const { status, limit = MY_BOOKINGS_DEFAULT_LIMIT, page = 1 } = req.query;
    const ownershipFilter = { $or: [{ renterId: renterObjId }, { renter: renterObjId }] };
    const filter = { ...ownershipFilter };

    if (status && status !== 'all') {
      const tabStatuses = MY_BOOKING_TAB_STATUSES[status];
      if (!tabStatuses) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Allowed values: ${Object.keys(MY_BOOKING_TAB_STATUSES).join(', ')}.`,
        });
      }
      filter.status = { $in: tabStatuses };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(
      1,
      Math.min(MY_BOOKINGS_MAX_LIMIT, parseInt(limit, 10) || MY_BOOKINGS_DEFAULT_LIMIT)
    );
    const skip = (pageNum - 1) * limitNum;

    const [total, bookings, statusGroups] = await Promise.all([
      Booking.countDocuments(filter),
      Booking.find(filter)
        .select('-digitalSignature -handoverPhotos -qrToken')
        .populate('device', BOOKING_DEVICE_LIST_FIELDS)
        .populate('deviceId', BOOKING_DEVICE_LIST_FIELDS)
        .populate('ownerId', BOOKING_PARTY_FIELDS)
        .populate('owner', BOOKING_PARTY_FIELDS)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Booking.aggregate([
        { $match: ownershipFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const counts = Object.fromEntries(
      Object.entries(MY_BOOKING_TAB_STATUSES).map(([tab, statuses]) => [
        tab,
        statusGroups
          .filter((group) => statuses.includes(group._id))
          .reduce((sum, group) => sum + group.count, 0),
      ])
    );

    return res.status(200).json({
      success: true,
      count: bookings.length,
      counts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
      data: bookings.map(normalizeBookingAliases),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. GET /api/bookings/:id
 * Retrieve booking details by ID or bookingCode.
 * Only the renter, the device owner, or an admin may view a booking.
 */
export const getBookingById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userObjId = getAuthUserObjectId(req);

    const booking = await Booking.findOne(buildBookingLookup(id))
      .select('-digitalSignature')
      .populate('device', BOOKING_DEVICE_DETAIL_FIELDS)
      .populate('deviceId', BOOKING_DEVICE_DETAIL_FIELDS)
      .populate('ownerId', BOOKING_PARTY_FIELDS)
      .populate('owner', BOOKING_PARTY_FIELDS)
      .populate('renterId', BOOKING_PARTY_FIELDS)
      .populate('renter', BOOKING_PARTY_FIELDS)
      .lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    const isRenter = isSameId(booking.renterId, userObjId) || isSameId(booking.renter, userObjId);
    const isOwner = isSameId(booking.ownerId, userObjId) || isSameId(booking.owner, userObjId);
    const isAdmin = req.user?.role === 'admin';

    if (!isRenter && !isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this booking.',
      });
    }

    // Handover QR token is only meaningful for the renter once the booking is approved
    if (!isRenter || booking.status === CANCELLABLE_STATUS) {
      delete booking.qrToken;
    }

    return res.status(200).json({
      success: true,
      data: {
        ...normalizeBookingAliases(booking),
        canCancel: isRenter && booking.status === CANCELLABLE_STATUS,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 5. PATCH /api/bookings/:id/cancel
 * Renter cancels their own booking while it is still pending.
 * Uses an atomic conditional update so a concurrent owner approval cannot be overwritten.
 */
export const cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userObjId = getAuthUserObjectId(req);

    if (!userObjId) {
      return res.status(401).json({
        success: false,
        message: 'Unable to identify the current user. Please log in again.',
      });
    }

    const reason = (req.body?.reason || '').toString().trim();
    if (reason.length > CANCEL_REASON_MAX_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Cancellation reason must not exceed ${CANCEL_REASON_MAX_LENGTH} characters.`,
      });
    }

    const existing = await Booking.findOne(buildBookingLookup(id))
      .select('_id status renterId renter')
      .lean();

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    const isRenter = isSameId(existing.renterId, userObjId) || isSameId(existing.renter, userObjId);
    if (!isRenter) {
      return res.status(403).json({
        success: false,
        message: 'Only the renter who created this booking can cancel it.',
      });
    }

    if (existing.status !== CANCELLABLE_STATUS) {
      return res.status(409).json({
        success: false,
        message: `This booking can no longer be cancelled (current status: ${existing.status}).`,
      });
    }

    const now = new Date();
    const timelineNote = reason ? `Cancelled by renter: ${reason}` : 'Cancelled by renter';

    const updated = await Booking.findOneAndUpdate(
      { _id: existing._id, status: CANCELLABLE_STATUS },
      {
        $set: { status: 'cancelled', cancelReason: reason },
        $push: {
          timeline: { status: 'cancelled', note: timelineNote, timestamp: now, updatedAt: now },
        },
      },
      { new: true }
    )
      .select('-digitalSignature -qrToken')
      .populate('device', BOOKING_DEVICE_DETAIL_FIELDS)
      .populate('deviceId', BOOKING_DEVICE_DETAIL_FIELDS)
      .populate('ownerId', BOOKING_PARTY_FIELDS)
      .populate('owner', BOOKING_PARTY_FIELDS)
      .lean();

    // Status changed between the read and the conditional write (e.g. owner just approved)
    if (!updated) {
      return res.status(409).json({
        success: false,
        message: 'This booking was just updated by the owner and can no longer be cancelled.',
      });
    }

    // Notify owner about renter cancellation
    const ownerTargetId = (updated.ownerId?._id || updated.ownerId || updated.owner?._id || updated.owner)?.toString();
    if (ownerTargetId) {
      const devName = updated.device?.name || updated.device?.title || updated.deviceName || 'Thiết bị';
      try {
        await createAndSendNotification({
          userId: ownerTargetId,
          title: 'Yêu cầu thuê đã bị hủy',
          body: `Khách thuê đã hủy yêu cầu thuê "${devName}" (Mã đơn: ${updated.bookingCode || id}).`,
          type: 'order',
          relatedId: updated._id.toString(),
          url: '/owner/bookings',
        });
      } catch (notifErr) {
        console.warn('⚠️ Gửi thông báo hủy đơn cho chủ thiết bị thất bại:', notifErr.message);
      }

      try {
        const io = getIO();
        if (io) {
          io.to(`user_${ownerTargetId}`).emit('booking_status_updated', {
            bookingId: updated._id.toString(),
            bookingCode: updated.bookingCode,
            status: 'cancelled',
          });
        }
      } catch (ioErr) {
        console.warn('⚠️ Socket emit warning:', ioErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully.',
      data: { ...normalizeBookingAliases(updated), canCancel: false },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 5. POST /api/bookings/validate-pricing
 * Calculate rental pricing and validate promotional voucher
 */
export const validatePricing = async (req, res, next) => {
  try {
    const { deviceId, startDate, endDate, voucherCode } = req.body;

    if (!deviceId || !mongoose.isValidObjectId(deviceId)) {
      return res.status(400).json({ success: false, message: 'Invalid device ID.' });
    }

    const device = await Device.findOne({ _id: deviceId, isDeleted: { $ne: true } }).lean();
    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found.' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return res.status(400).json({ success: false, message: 'Invalid date range.' });
    }

    const diffTime = end.getTime() - start.getTime();
    const totalDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const dailyRate = device.dailyRate ?? device.pricePerDay ?? 0;
    const rentalFee = dailyRate * totalDays;

    let discountPercent = 0;
    let longRentalDiscount = 0;
    if (totalDays >= 7) {
      discountPercent = 20;
      longRentalDiscount = Math.round(rentalFee * 0.2);
    } else if (totalDays >= 3) {
      discountPercent = 10;
      longRentalDiscount = Math.round(rentalFee * 0.1);
    }

    const discountAmount = longRentalDiscount;
    const depositFee = device.depositValue ?? device.depositAmount ?? 0;
    const finalRentalFee = Math.max(0, rentalFee - discountAmount);
    const totalAmount = finalRentalFee + depositFee;

    return res.status(200).json({
      success: true,
      data: {
        totalDays,
        pricePerDayAtBooking: dailyRate,
        dailyRate,
        rentalFee,
        discountPercent,
        longRentalDiscount,
        longRentalDiscountPercent: discountPercent,
        voucherDiscount,
        voucherValid,
        voucherMessage,
        discountAmount,
        depositFee,
        depositValue: depositFee,
        finalRentalFee,
        totalAmount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 6. POST /api/bookings/:id/extend
 * Renter requests an extension of their active / approved rental.
 */
export const requestBookingExtension = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userObjId = getAuthUserObjectId(req);

    if (!userObjId) {
      return res.status(401).json({
        success: false,
        message: 'Please log in to request an extension.',
      });
    }

    const days = parseInt(req.body?.days, 10);
    if (!days || days < 1 || days > 30) {
      return res.status(400).json({
        success: false,
        message: 'Extension days must be between 1 and 30.',
      });
    }

    const note = (req.body?.note || '').toString().trim();

    const booking = await Booking.findOne(buildBookingLookup(id))
      .populate('device', BOOKING_DEVICE_DETAIL_FIELDS)
      .populate('deviceId', BOOKING_DEVICE_DETAIL_FIELDS);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    const isRenter = isSameId(booking.renterId, userObjId) || isSameId(booking.renter, userObjId);
    if (!isRenter) {
      return res.status(403).json({
        success: false,
        message: 'Only the renter can request an extension for this booking.',
      });
    }

    if (!['active', 'approved'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot extend booking with status "${booking.status}". Only active rentals can be extended.`,
      });
    }

    if (booking.extensionRequest?.status === 'pending') {
      return res.status(409).json({
        success: false,
        message: 'An extension request is already pending owner review.',
      });
    }

    const currentEnd = new Date(booking.endDate);
    const requestedEndDate = new Date(currentEnd.getTime() + days * 24 * 60 * 60 * 1000);

    const rawDevice = booking.device || booking.deviceId;
    const dailyRate =
      booking.pricePerDayAtBooking ||
      booking.dailyRate ||
      rawDevice?.dailyRate ||
      rawDevice?.pricePerDay ||
      0;
    const additionalFee = dailyRate * days;

    // Check conflict with other bookings during the extension window
    const rawDevId = rawDevice?._id || booking.device || booking.deviceId;
    if (rawDevId && mongoose.isValidObjectId(rawDevId)) {
      const devObjId = new mongoose.Types.ObjectId(String(rawDevId));
      const conflict = await Booking.findOne({
        _id: { $ne: booking._id },
        $or: [{ device: devObjId }, { deviceId: devObjId }],
        status: { $in: ['pending', 'approved', 'active'] },
        startDate: { $lt: requestedEndDate },
        endDate: { $gt: currentEnd },
      });

      if (conflict) {
        return res.status(409).json({
          success: false,
          message: 'The device is already booked by another user during the requested extension period.',
        });
      }

      if (Array.isArray(rawDevice?.blockedDates) && rawDevice.blockedDates.length > 0) {
        const hasBlockedConflict = rawDevice.blockedDates.some((bDate) => {
          const bd = new Date(bDate);
          return bd >= currentEnd && bd <= requestedEndDate;
        });

        if (hasBlockedConflict) {
          return res.status(409).json({
            success: false,
            message: 'The requested extension period conflicts with owner blocked dates.',
          });
        }
      }
    }

    const now = new Date();
    const formattedFee = additionalFee.toLocaleString('vi-VN');
    const timelineNote = `Requested extension for +${days} ${days === 1 ? 'day' : 'days'} (until ${requestedEndDate.toLocaleDateString('en-US')}), additional fee: ${formattedFee} VND${note ? ` · Note: "${note}"` : ''}`;

    booking.extensionRequest = {
      requestedEndDate,
      requestedDays: days,
      additionalFee,
      status: 'pending',
    };

    if (!Array.isArray(booking.timeline)) {
      booking.timeline = [];
    }

    booking.timeline.push({
      status: 'extension_requested',
      note: timelineNote,
      timestamp: now,
      updatedAt: now,
    });

    await booking.save();

    const populated = await Booking.findById(booking._id)
      .populate('device', BOOKING_DEVICE_DETAIL_FIELDS)
      .populate('deviceId', BOOKING_DEVICE_DETAIL_FIELDS)
      .populate('ownerId', BOOKING_PARTY_FIELDS)
      .populate('owner', BOOKING_PARTY_FIELDS)
      .populate('renterId', BOOKING_PARTY_FIELDS)
      .populate('renter', BOOKING_PARTY_FIELDS)
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Extension request submitted successfully and is pending owner approval.',
      data: normalizeBookingAliases(populated),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 7. PATCH /api/bookings/:id/extension/approve
 * Owner approves renter's extension request.
 */
export const approveBookingExtension = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userObjId = getAuthUserObjectId(req);

    if (!userObjId) {
      return res.status(401).json({
        success: false,
        message: 'Please log in to perform this action.',
      });
    }

    const booking = await Booking.findOne(buildBookingLookup(id));
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const isOwner = isSameId(booking.ownerId, userObjId) || isSameId(booking.owner, userObjId);
    if (!isOwner && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only the owner can approve extensions.' });
    }

    if (booking.extensionRequest?.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'No pending extension request found for this booking.' });
    }

    const { requestedEndDate, requestedDays, additionalFee } = booking.extensionRequest;
    const now = new Date();

    booking.endDate = requestedEndDate;
    booking.totalDays = (booking.totalDays || 1) + (requestedDays || 0);

    const prevRentalFee = booking.rentalFee ?? booking.pricing?.rentalFee ?? 0;
    const prevTotalAmount = booking.totalAmount ?? booking.pricing?.totalAmount ?? 0;

    booking.rentalFee = prevRentalFee + (additionalFee || 0);
    booking.totalAmount = prevTotalAmount + (additionalFee || 0);

    if (booking.pricing) {
      booking.pricing.rentalFee = (booking.pricing.rentalFee || 0) + (additionalFee || 0);
      booking.pricing.totalAmount = (booking.pricing.totalAmount || 0) + (additionalFee || 0);
    }

    booking.extensionRequest.status = 'approved';

    if (!Array.isArray(booking.timeline)) {
      booking.timeline = [];
    }

    booking.timeline.push({
      status: 'approved',
      note: `Owner approved rental extension for +${requestedDays} ${requestedDays === 1 ? 'day' : 'days'} (new return date: ${new Date(requestedEndDate).toLocaleDateString('en-US')})`,
      timestamp: now,
      updatedAt: now,
    });

    await booking.save();

    const populated = await Booking.findById(booking._id)
      .populate('device', BOOKING_DEVICE_DETAIL_FIELDS)
      .populate('deviceId', BOOKING_DEVICE_DETAIL_FIELDS)
      .populate('ownerId', BOOKING_PARTY_FIELDS)
      .populate('owner', BOOKING_PARTY_FIELDS)
      .populate('renterId', BOOKING_PARTY_FIELDS)
      .populate('renter', BOOKING_PARTY_FIELDS)
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Rental extension approved successfully.',
      data: normalizeBookingAliases(populated),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 8. PATCH /api/bookings/:id/extension/reject
 * Owner rejects renter's extension request.
 */
export const rejectBookingExtension = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userObjId = getAuthUserObjectId(req);

    if (!userObjId) {
      return res.status(401).json({
        success: false,
        message: 'Please log in to perform this action.',
      });
    }

    const reason = (req.body?.reason || '').toString().trim();

    const booking = await Booking.findOne(buildBookingLookup(id));
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const isOwner = isSameId(booking.ownerId, userObjId) || isSameId(booking.owner, userObjId);
    if (!isOwner && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only the owner can reject extensions.' });
    }

    if (booking.extensionRequest?.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'No pending extension request found for this booking.' });
    }

    const now = new Date();
    booking.extensionRequest.status = 'rejected';

    if (!Array.isArray(booking.timeline)) {
      booking.timeline = [];
    }

    booking.timeline.push({
      status: 'rejected',
      note: `Owner declined rental extension request${reason ? `: ${reason}` : ''}`,
      timestamp: now,
      updatedAt: now,
    });

    await booking.save();

    const populated = await Booking.findById(booking._id)
      .populate('device', BOOKING_DEVICE_DETAIL_FIELDS)
      .populate('deviceId', BOOKING_DEVICE_DETAIL_FIELDS)
      .populate('ownerId', BOOKING_PARTY_FIELDS)
      .populate('owner', BOOKING_PARTY_FIELDS)
      .populate('renterId', BOOKING_PARTY_FIELDS)
      .populate('renter', BOOKING_PARTY_FIELDS)
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Rental extension request rejected.',
      data: normalizeBookingAliases(populated),
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
  cancelBooking,
  validatePricing,
  requestBookingExtension,
  approveBookingExtension,
  rejectBookingExtension,
};
