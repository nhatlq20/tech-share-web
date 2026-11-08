import mongoose from 'mongoose';
import SystemSetting from '../../models/SystemSetting.js';

// Danh sách cấu hình mặc định ban đầu của TechShare
const DEFAULT_SETTINGS = [
  {
    key: 'platform_maintenance',
    value: { enabled: false, message: 'Hệ thống TechShare đang bảo trì định kỳ để nâng cấp hạ tầng.' },
    description: 'Chế độ bảo trì hệ thống và thông báo bảo trì',
    category: 'general',
  },
  {
    key: 'booking_rules',
    value: {
      autoCancelUnpaidHours: 24,
      maxRentalDays: 30,
      minRentalDays: 1,
      allowExtend: true,
      maxExtendDays: 14,
    },
    description: 'Quy tắc thời hạn thanh toán, thuê tối đa và gia hạn đơn thuê',
    category: 'booking',
  },
  {
    key: 'financial_policy',
    value: {
      platformServiceFeePercent: 10,
      minDepositPercent: 30,
      allowPartialDeposit: true,
    },
    description: 'Chính sách tỷ lệ phí dịch vụ sàn, giữ ký quỹ và mức cọc tối thiểu',
    category: 'finance',
  },
  {
    key: 'notification_channels',
    value: {
      pushEnabled: true,
      emailEnabled: false,
      socketEnabled: true,
      maintenanceAlertToAll: true,
    },
    description: 'Kênh phát sóng thông báo và cảnh báo bảo trì',
    category: 'notification',
  },
];

// Danh sách các khóa bảo mật nghiêm ngặt CẤM không cho phép sửa đổi qua API cấu hình thông thường
const FORBIDDEN_SECRET_KEYS = [
  'jwt_secret',
  'jwtsecret',
  'db_uri',
  'mongouri',
  'firebase_key',
  'cloudinary_secret',
  'password',
  'api_key',
];

/**
 * 1. GET /api/admin/settings
 * Lấy danh sách toàn bộ cấu hình hệ thống, tự động khởi tạo mặc định nếu chưa có
 */
export const getAdminSettings = async (req, res, next) => {
  try {
    let settings = await SystemSetting.find().populate('updatedBy', 'name email').lean();

    // Khởi tạo các cấu hình mặc định nếu bảng đang rỗng
    if (settings.length === 0) {
      for (const def of DEFAULT_SETTINGS) {
        await SystemSetting.findOneAndUpdate(
          { key: def.key },
          { $setOnInsert: def },
          { upsert: true, new: true }
        );
      }
      settings = await SystemSetting.find().populate('updatedBy', 'name email').lean();
    }

    // Nhóm theo chuyên mục
    const grouped = {
      general: [],
      booking: [],
      finance: [],
      notification: [],
    };

    settings.forEach((s) => {
      const cat = s.category || 'general';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(s);
    });

    return res.json({
      success: true,
      data: settings,
      grouped,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 2. GET /api/admin/settings/:key
 * Lấy chi tiết một khóa cấu hình
 */
export const getAdminSettingByKey = async (req, res, next) => {
  try {
    const { key } = req.params;
    const cleanKey = String(key).trim();

    const setting = await SystemSetting.findOne({ key: cleanKey })
      .populate('updatedBy', 'name email')
      .lean();

    if (!setting) {
      return res.status(404).json({ success: false, message: `Không tìm thấy cấu hình '${cleanKey}'.` });
    }

    return res.json({
      success: true,
      data: setting,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 3. PATCH /api/admin/settings/:key
 * Cập nhật giá trị cấu hình hệ thống (Ràng buộc bảo mật: Ngăn sửa đổi bí mật máy chủ)
 */
export const updateAdminSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    const cleanKey = String(key).trim().toLowerCase();

    // KIỂM TRA BẢO MẬT: Không bao giờ cho phép can thiệp vào các khóa bí mật hệ thống
    const isSecretAttempt = FORBIDDEN_SECRET_KEYS.some((sec) => cleanKey.includes(sec));
    if (isSecretAttempt) {
      return res.status(403).json({
        success: false,
        message: 'Bảo mật từ chối: Không được phép truy cập hoặc thay đổi các khóa bí mật máy chủ qua giao diện quản trị.',
      });
    }

    const { value, description } = req.body;
    if (value === undefined) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp giá trị cấu hình mới.' });
    }

    const adminUserId = req.user?.userId || req.user?._id || req.user?.id;

    let setting = await SystemSetting.findOne({ key: cleanKey });

    if (!setting) {
      setting = new SystemSetting({
        key: cleanKey,
        value,
        description: description || '',
        updatedBy: adminUserId && mongoose.isValidObjectId(adminUserId) ? adminUserId : null,
      });
    } else {
      setting.value = value;
      if (description !== undefined) setting.description = description;
      if (adminUserId && mongoose.isValidObjectId(adminUserId)) {
        setting.updatedBy = new mongoose.Types.ObjectId(String(adminUserId));
      }
    }

    await setting.save();

    return res.json({
      success: true,
      data: setting,
      message: `Cập nhật cấu hình '${cleanKey}' thành công.`,
    });
  } catch (err) {
    next(err);
  }
};
