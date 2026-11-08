import mongoose from 'mongoose';
import Notification from '../../models/Notification.js';
import User from '../../models/User.js';
import AdminAuditLog from '../../models/AdminAuditLog.js';
import { getIO } from '../../socket.js';
import { logAdminAction } from '../../utils/auditLogger.js';

/**
 * 1. GET /api/admin/notifications
 * Danh sách thông báo toàn sàn có bộ lọc loại, trạng thái đọc và người nhận
 */
export const getAdminNotifications = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 15));
    const skip = (page - 1) * limit;

    const { type, isRead, search, userId } = req.query;
    const query = {};

    if (type && type !== 'all') {
      query.type = type;
    }

    if (isRead !== undefined && isRead !== 'all') {
      query.isRead = isRead === 'true';
    }

    if (userId && mongoose.isValidObjectId(userId)) {
      query.userId = new mongoose.Types.ObjectId(userId);
    }

    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q, 'i');
      query.$or = [{ title: regex }, { body: regex }];
    }

    const total = await Notification.countDocuments(query);
    const notifications = await Notification.find(query)
      .populate('userId', 'name email avatar role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.json({
      success: true,
      data: notifications,
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
 * 2. POST /api/admin/notifications/send
 * Phát thông báo nền tảng đến toàn bộ người dùng, nhóm vai trò hoặc danh sách chỉ định
 */
export const sendAdminNotification = async (req, res, next) => {
  try {
    const {
      targetType = 'all', // 'all' | 'role' | 'specific_users'
      targetRole, // 'renter' | 'owner' | 'both' | 'admin'
      userIds, // array of strings
      title,
      body,
      type = 'system',
      url,
      relatedId,
    } = req.body;

    // 1. Kiểm tra tiêu đề và nội dung
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Tiêu đề thông báo không được để trống.' });
    }
    if (!body || typeof body !== 'string' || !body.trim()) {
      return res.status(400).json({ success: false, message: 'Nội dung thông báo không được để trống.' });
    }

    // 2. Xác định danh sách người nhận hợp lệ
    let recipientUserIds = [];

    if (targetType === 'specific_users') {
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn ít nhất một người dùng nhận thông báo.',
        });
      }
      const validIds = userIds.filter((id) => mongoose.isValidObjectId(id));
      if (validIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Danh sách ID người dùng không hợp lệ.',
        });
      }

      // Xác minh người dùng thực sự tồn tại trong cơ sở dữ liệu
      const existingUsers = await User.find({ _id: { $in: validIds } }).select('_id').lean();
      recipientUserIds = existingUsers.map((u) => u._id);

      if (recipientUserIds.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy người dùng hợp lệ nào trong danh sách cung cấp.',
        });
      }
    } else if (targetType === 'role') {
      if (!targetRole || !['renter', 'owner', 'both', 'admin'].includes(targetRole)) {
        return res.status(400).json({
          success: false,
          message: 'Vai trò đích không hợp lệ (renter, owner, both, admin).',
        });
      }
      const usersByRole = await User.find({
        role: targetRole,
        isActive: { $ne: false },
      })
        .select('_id')
        .lean();
      recipientUserIds = usersByRole.map((u) => u._id);
    } else {
      // Gửi toàn bộ người dùng đang hoạt động
      const allActiveUsers = await User.find({ isActive: { $ne: false } }).select('_id').lean();
      recipientUserIds = allActiveUsers.map((u) => u._id);
    }

    // 3. Giới hạn số lượng gửi hàng loạt an toàn
    const MAX_BULK_LIMIT = 5000;
    if (recipientUserIds.length > MAX_BULK_LIMIT) {
      recipientUserIds = recipientUserIds.slice(0, MAX_BULK_LIMIT);
    }

    if (recipientUserIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Không có người nhận phù hợp với điều kiện đã chọn.',
      });
    }

    // 4. Tạo bản ghi thông báo vĩnh viễn trong MongoDB
    const cleanTitle = title.trim();
    const cleanBody = body.trim();
    const notificationDocs = recipientUserIds.map((uId) => ({
      userId: uId,
      title: cleanTitle,
      body: cleanBody,
      type: ['system', 'promo', 'booking', 'wallet'].includes(type) ? type : 'system',
      url: url || null,
      relatedId: relatedId || null,
      isRead: false,
    }));

    await Notification.insertMany(notificationDocs);

    // 5. Phát sóng sự kiện Real-time qua Socket.io
    try {
      const io = getIO();
      if (io) {
        recipientUserIds.forEach((uId) => {
          io.to(`user_${String(uId)}`).emit('new_notification', {
            title: cleanTitle,
            body: cleanBody,
            type,
            url: url || null,
            createdAt: new Date(),
          });
        });
      }
    } catch (socketErr) {
      console.warn('Lỗi phát sự kiện socket thông báo:', socketErr.message);
    }

    // 6. Ghi nhật ký kiểm toán bảo mật
    await logAdminAction(req, {
      action: 'notification_broadcast',
      targetType: 'Notification',
      reason: `Phát thông báo: ${cleanTitle}`,
      metadata: {
        targetType,
        targetRole,
        recipientCount: recipientUserIds.length,
        title: cleanTitle,
        type,
      },
      status: 'success',
    });

    return res.status(201).json({
      success: true,
      sentCount: recipientUserIds.length,
      message: `Đã gửi thông báo thành công đến ${recipientUserIds.length} người dùng.`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 3. GET /api/admin/notifications/history
 * Lịch sử các lần phát thông báo diện rộng của ban quản trị
 */
export const getAdminNotificationHistory = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 15));
    const skip = (page - 1) * limit;

    const total = await AdminAuditLog.countDocuments({ action: 'notification_broadcast' });
    const history = await AdminAuditLog.find({ action: 'notification_broadcast' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.json({
      success: true,
      data: history,
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
