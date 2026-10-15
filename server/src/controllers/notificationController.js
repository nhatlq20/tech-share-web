import notificationService from '../services/notificationService.js';

/**
 * GET /api/notifications
 * Lấy danh sách thông báo của người dùng hiện tại
 */
export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const { limit, page, type } = req.query;

    const result = await notificationService.getUserNotifications(userId, {
      limit: limit ? Number(limit) : 30,
      page: page ? Number(page) : 1,
      type: type || null,
    });

    res.status(200).json({
      success: true,
      data: result.items,
      unreadCount: result.unreadCount,
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Đánh dấu một thông báo là đã đọc
 */
export const markNotificationRead = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const { id } = req.params;

    const updated = await notificationService.markAsRead(id, userId);
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or access denied.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/notifications/read-all
 * Đánh dấu tất cả thông báo của người dùng là đã đọc
 */
export const markAllNotificationsRead = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    await notificationService.markAllAsRead(userId);

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/notifications/fcm-token
 * Lưu FCM Web Token khi người dùng cấp quyền trình duyệt
 */
export const registerFcmToken = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'FCM token is required.',
      });
    }

    await notificationService.saveFcmToken(userId, token);

    res.status(200).json({
      success: true,
      message: 'FCM token registered successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/notifications/test
 * Gửi thông báo thử nghiệm cho chính user để test Web Push & Firestore Real-time
 */
export const createTestNotification = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const { title, body, type = 'system', relatedId } = req.body;

    const notification = await notificationService.createAndSendNotification({
      userId,
      title: title || 'Chào mừng đến với TechShare! 🚀',
      body: body || 'Hệ thống thông báo thời gian thực trên nền tảng Web đã được kết nối thành công.',
      type,
      relatedId,
    });

    res.status(201).json({
      success: true,
      message: 'Test notification created and sent.',
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

