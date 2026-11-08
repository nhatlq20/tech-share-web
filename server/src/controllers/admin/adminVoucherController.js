import mongoose from 'mongoose';
import Voucher from '../../models/Voucher.js';
import Booking from '../../models/Booking.js';
import { logAdminAction } from '../../utils/auditLogger.js';

/**
 * 1. GET /api/admin/vouchers
 * Danh sách vouchers với bộ lọc và phân trang
 */
export const getAdminVouchers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 15));
    const skip = (page - 1) * limit;

    const { status, type, search } = req.query;
    const query = {};
    const now = new Date();

    // Lọc theo trạng thái
    if (status === 'active') {
      query.isActive = true;
      query.expiryDate = { $gte: now };
    } else if (status === 'inactive') {
      query.isActive = false;
    } else if (status === 'expired') {
      query.expiryDate = { $lt: now };
    }

    // Lọc theo loại giảm giá
    if (type && type !== 'all') {
      query.type = type;
    }

    // Tìm kiếm theo mã code
    if (search && search.trim()) {
      const q = search.trim();
      query.code = new RegExp(q, 'i');
    }

    const total = await Voucher.countDocuments(query);
    const vouchers = await Voucher.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.json({
      success: true,
      data: vouchers,
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
 * 2. GET /api/admin/vouchers/:id
 * Chi tiết voucher và thống kê lượt sử dụng
 */
export const getAdminVoucherDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'ID voucher không hợp lệ.' });
    }

    const voucher = await Voucher.findById(id).lean();
    if (!voucher) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy voucher.' });
    }

    // Đếm số đơn thuê đã áp dụng voucher này
    let bookingUsageCount = 0;
    try {
      bookingUsageCount = await Booking.countDocuments({ voucherCode: voucher.code });
    } catch {}

    return res.json({
      success: true,
      data: {
        ...voucher,
        bookingUsageCount,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 3. POST /api/admin/vouchers
 * Tạo voucher mới với ràng buộc xác thực dữ liệu
 */
export const createAdminVoucher = async (req, res, next) => {
  try {
    const {
      code,
      type = 'fixed',
      value,
      minDays = 1,
      maxDiscount = 0,
      expiryDate,
      usageLimit = 100,
      perUserLimit = 1,
      isActive = true,
    } = req.body;

    // 1. Kiểm tra mã voucher
    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mã voucher.' });
    }
    const cleanCode = code.trim().toUpperCase();

    const existing = await Voucher.findOne({ code: cleanCode });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Mã voucher '${cleanCode}' đã tồn tại trong hệ thống.`,
      });
    }

    // 2. Kiểm tra loại và giá trị
    if (!['fixed', 'percent'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Loại voucher phải là fixed hoặc percent.' });
    }

    const numValue = Number(value);
    if (isNaN(numValue) || numValue < 0) {
      return res.status(400).json({ success: false, message: 'Giá trị voucher không hợp lệ.' });
    }

    if (type === 'percent' && (numValue <= 0 || numValue > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Tỷ lệ giảm giá (%) phải nằm trong khoảng từ 1% đến 100%.',
      });
    }

    // 3. Kiểm tra ngày hết hạn
    if (!expiryDate) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn ngày hết hạn.' });
    }
    const exp = new Date(expiryDate);
    if (isNaN(exp.getTime())) {
      return res.status(400).json({ success: false, message: 'Định dạng ngày hết hạn không hợp lệ.' });
    }
    if (exp <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Ngày hết hạn voucher phải lớn hơn thời điểm hiện tại.',
      });
    }

    // 4. Kiểm tra giới hạn sử dụng
    const numUsageLimit = Math.max(1, parseInt(usageLimit, 10) || 100);
    const numPerUser = Math.max(1, parseInt(perUserLimit, 10) || 1);
    const numMinDays = Math.max(1, parseInt(minDays, 10) || 1);
    const numMaxDiscount = Math.max(0, Number(maxDiscount) || 0);

    const voucher = await Voucher.create({
      code: cleanCode,
      type,
      value: numValue,
      minDays: numMinDays,
      maxDiscount: numMaxDiscount,
      expiryDate: exp,
      usageLimit: numUsageLimit,
      usedCount: 0,
      perUserLimit: numPerUser,
      isActive: Boolean(isActive),
    });

    await logAdminAction(req, {
      action: 'voucher_create',
      targetType: 'Voucher',
      targetId: voucher._id,
      reason: `Tạo mã voucher ${voucher.code}`,
      metadata: {
        code: voucher.code,
        type: voucher.type,
        value: voucher.value,
        usageLimit: voucher.usageLimit,
        expiryDate: voucher.expiryDate,
      },
      status: 'success',
    });

    return res.status(201).json({
      success: true,
      data: voucher,
      message: 'Tạo voucher thành công.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 4. PATCH /api/admin/vouchers/:id
 * Cập nhật voucher (bảo toàn usedCount lịch sử)
 */
export const updateAdminVoucher = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'ID voucher không hợp lệ.' });
    }

    const voucher = await Voucher.findById(id);
    if (!voucher) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy voucher.' });
    }

    const {
      code,
      type,
      value,
      minDays,
      maxDiscount,
      expiryDate,
      usageLimit,
      perUserLimit,
      isActive,
      reason,
    } = req.body;

    // Kiểm tra trùng lặp nếu đổi code
    if (code && typeof code === 'string' && code.trim()) {
      const cleanCode = code.trim().toUpperCase();
      if (cleanCode !== voucher.code) {
        const dup = await Voucher.findOne({ code: cleanCode, _id: { $ne: voucher._id } });
        if (dup) {
          return res.status(400).json({
            success: false,
            message: `Mã voucher '${cleanCode}' đã được sử dụng.`,
          });
        }
        voucher.code = cleanCode;
      }
    }

    if (type !== undefined) {
      if (!['fixed', 'percent'].includes(type)) {
        return res.status(400).json({ success: false, message: 'Loại voucher phải là fixed hoặc percent.' });
      }
      voucher.type = type;
    }

    if (value !== undefined) {
      const numValue = Number(value);
      if (isNaN(numValue) || numValue < 0) {
        return res.status(400).json({ success: false, message: 'Giá trị voucher không hợp lệ.' });
      }
      if (voucher.type === 'percent' && (numValue <= 0 || numValue > 100)) {
        return res.status(400).json({
          success: false,
          message: 'Tỷ lệ phần trăm giảm giá phải từ 1% đến 100%.',
        });
      }
      voucher.value = numValue;
    }

    if (minDays !== undefined) {
      voucher.minDays = Math.max(1, parseInt(minDays, 10) || 1);
    }

    if (maxDiscount !== undefined) {
      voucher.maxDiscount = Math.max(0, Number(maxDiscount) || 0);
    }

    if (expiryDate !== undefined) {
      const exp = new Date(expiryDate);
      if (isNaN(exp.getTime())) {
        return res.status(400).json({ success: false, message: 'Định dạng ngày hết hạn không hợp lệ.' });
      }
      voucher.expiryDate = exp;
    }

    if (usageLimit !== undefined) {
      const numLimit = parseInt(usageLimit, 10);
      if (isNaN(numLimit) || numLimit < 0) {
        return res.status(400).json({ success: false, message: 'Giới hạn sử dụng không hợp lệ.' });
      }
      // Quy tắc bảo mật: Không được đặt giới hạn thấp hơn số lượt đã sử dụng
      if (numLimit < voucher.usedCount) {
        return res.status(400).json({
          success: false,
          message: `Giới hạn sử dụng (${numLimit}) không thể nhỏ hơn số lượt đã dùng thực tế (${voucher.usedCount}).`,
        });
      }
      voucher.usageLimit = numLimit;
    }

    if (perUserLimit !== undefined) {
      voucher.perUserLimit = Math.max(1, parseInt(perUserLimit, 10) || 1);
    }

    if (isActive !== undefined) {
      voucher.isActive = Boolean(isActive);
    }

    // Bảo toàn usedCount lịch sử: KHÔNG bao giờ reset usedCount trong hàm edit này
    await voucher.save();

    await logAdminAction(req, {
      action: 'voucher_update',
      targetType: 'Voucher',
      targetId: voucher._id,
      reason: reason || `Cập nhật cấu hình voucher ${voucher.code}`,
      metadata: req.body,
      status: 'success',
    });

    return res.json({
      success: true,
      data: voucher,
      message: 'Cập nhật voucher thành công.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 5. PATCH /api/admin/vouchers/:id/status
 * Kích hoạt hoặc Vô hiệu hóa voucher
 */
export const toggleAdminVoucherStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'ID voucher không hợp lệ.' });
    }

    const voucher = await Voucher.findById(id);
    if (!voucher) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy voucher.' });
    }

    const targetActive = req.body.isActive !== undefined ? Boolean(req.body.isActive) : !voucher.isActive;
    voucher.isActive = targetActive;
    await voucher.save();

    await logAdminAction(req, {
      action: 'voucher_status_toggle',
      targetType: 'Voucher',
      targetId: voucher._id,
      reason: targetActive ? 'Kích hoạt voucher' : 'Tạm dừng voucher',
      metadata: { isActive: targetActive },
      status: 'success',
    });

    return res.json({
      success: true,
      data: voucher,
      message: targetActive ? 'Đã kích hoạt voucher.' : 'Đã tạm dừng voucher.',
    });
  } catch (err) {
    next(err);
  }
};
