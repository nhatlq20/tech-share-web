import mongoose from 'mongoose';
import Booking from '../../models/Booking.js';

/**
 * MODULE 1: BOOKING MANAGEMENT CONTROLLER
 */

/**
 * 1. GET /api/admin/bookings
 * Danh sách toàn bộ đơn thuê với bộ lọc, tìm kiếm và phân trang
 */
export const getAdminBookings = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const { status, paymentStatus, startDate, endDate, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (paymentStatus && paymentStatus !== 'all') {
      query.paymentStatus = paymentStatus;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    // Aggregation pipeline để hỗ trợ search đa trường qua populated collections
    let bookings;
    let total;

    if (search && search.trim()) {
      const q = search.trim();
      const searchRegex = new RegExp(q, 'i');

      const pipeline = [
        {
          $lookup: {
            from: 'devices',
            localField: 'deviceId',
            foreignField: '_id',
            as: 'device',
          },
        },
        { $unwind: { path: '$device', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'users',
            localField: 'renterId',
            foreignField: '_id',
            as: 'renter',
          },
        },
        { $unwind: { path: '$renter', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'users',
            localField: 'ownerId',
            foreignField: '_id',
            as: 'owner',
          },
        },
        { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } },
        {
          $match: {
            ...query,
            $or: [
              { bookingCode: searchRegex },
              { 'device.name': searchRegex },
              { 'renter.name': searchRegex },
              { 'renter.email': searchRegex },
              { 'owner.name': searchRegex },
              { 'owner.email': searchRegex },
            ],
          },
        },
      ];

      const countPipeline = [...pipeline, { $count: 'total' }];
      const countResult = await Booking.aggregate(countPipeline);
      total = countResult[0]?.total || 0;

      const sortDir = sortOrder === 'asc' ? 1 : -1;
      const dataPipeline = [
        ...pipeline,
        { $sort: { [sortBy]: sortDir } },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            bookingCode: 1,
            startDate: 1,
            endDate: 1,
            status: 1,
            paymentStatus: 1,
            pricing: 1,
            delivery: 1,
            handover: 1,
            timeline: 1,
            createdAt: 1,
            updatedAt: 1,
            'device._id': 1,
            'device.name': 1,
            'device.category': 1,
            'device.images': 1,
            'device.pricePerDay': 1,
            'renter._id': 1,
            'renter.name': 1,
            'renter.avatar': 1,
            'renter.email': 1,
            'renter.phone': 1,
            'owner._id': 1,
            'owner.name': 1,
            'owner.avatar': 1,
            'owner.email': 1,
            'owner.phone': 1,
          },
        },
      ];

      bookings = await Booking.aggregate(dataPipeline);
    } else {
      total = await Booking.countDocuments(query);
      const sortDir = sortOrder === 'asc' ? 1 : -1;

      bookings = await Booking.find(query)
        .populate('deviceId', 'name category images pricePerDay depositAmount')
        .populate('renterId', 'name avatar email phone')
        .populate('ownerId', 'name avatar email phone')
        .sort({ [sortBy]: sortDir })
        .skip(skip)
        .limit(limit)
        .lean();

      // Normalize shape
      bookings = bookings.map((b) => ({
        ...b,
        device: b.deviceId,
        renter: b.renterId,
        owner: b.ownerId,
      }));
    }

    return res.json({
      success: true,
      data: bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 2. GET /api/admin/bookings/:id
 * Chi tiết đơn thuê đầy đủ
 */
export const getAdminBookingDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'ID đơn thuê không hợp lệ.' });
    }

    const booking = await Booking.findById(id)
      .populate('deviceId', 'name brand category condition description images pricePerDay depositAmount status')
      .populate('renterId', 'name avatar email phone address trust')
      .populate('ownerId', 'name avatar email phone address trust location')
      .lean();

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn thuê.' });
    }

    return res.json({
      success: true,
      data: {
        ...booking,
        device: booking.deviceId,
        renter: booking.renterId,
        owner: booking.ownerId,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 3. GET /api/admin/bookings/:id/timeline
 * Lịch sử dòng thời gian đơn thuê
 */
export const getAdminBookingTimeline = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'ID đơn thuê không hợp lệ.' });
    }

    const booking = await Booking.findById(id).select('bookingCode timeline status createdAt').lean();
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn thuê.' });
    }

    return res.json({
      success: true,
      data: {
        bookingId: booking._id,
        bookingCode: booking.bookingCode,
        currentStatus: booking.status,
        timeline: booking.timeline || [],
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 4. GET /api/admin/bookings/export
 * Xuất dữ liệu đơn thuê ra file CSV theo bộ lọc hiện tại
 */
export const exportAdminBookings = async (req, res, next) => {
  try {
    const { status, paymentStatus, startDate, endDate } = req.query;
    const query = {};

    if (status && status !== 'all') query.status = status;
    if (paymentStatus && paymentStatus !== 'all') query.paymentStatus = paymentStatus;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    const bookings = await Booking.find(query)
      .populate('deviceId', 'name')
      .populate('renterId', 'name email phone')
      .populate('ownerId', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(5000)
      .lean();

    const headers = [
      'Mã đơn',
      'Thiết bị',
      'Người thuê',
      'Email người thuê',
      'SĐT người thuê',
      'Chủ máy',
      'Email chủ máy',
      'SĐT chủ máy',
      'Ngày bắt đầu',
      'Ngày kết thúc',
      'Tiền thuê',
      'Tiền cọc',
      'Phí dịch vụ',
      'Tổng tiền',
      'Trạng thái đơn',
      'Trạng thái thanh toán',
      'Ngày tạo',
    ];

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = bookings.map((b) => [
      escapeCsv(b.bookingCode),
      escapeCsv(b.deviceId?.name || 'N/A'),
      escapeCsv(b.renterId?.name || 'N/A'),
      escapeCsv(b.renterId?.email || 'N/A'),
      escapeCsv(b.renterId?.phone || 'N/A'),
      escapeCsv(b.ownerId?.name || 'N/A'),
      escapeCsv(b.ownerId?.email || 'N/A'),
      escapeCsv(b.ownerId?.phone || 'N/A'),
      escapeCsv(b.startDate ? new Date(b.startDate).toISOString().split('T')[0] : ''),
      escapeCsv(b.endDate ? new Date(b.endDate).toISOString().split('T')[0] : ''),
      b.pricing?.rentalFee || 0,
      b.pricing?.deposit || 0,
      b.pricing?.serviceFee || 0,
      b.pricing?.totalAmount || 0,
      escapeCsv(b.status),
      escapeCsv(b.paymentStatus),
      escapeCsv(b.createdAt ? new Date(b.createdAt).toISOString() : ''),
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="TechShare_Bookings_${Date.now()}.csv"`);
    return res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
};
