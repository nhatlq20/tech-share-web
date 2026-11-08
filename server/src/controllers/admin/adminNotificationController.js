import AdminNotification from '../../models/AdminNotification.js';
import {
  adminNotificationReader,
  countUnreadAdminNotifications,
  listAdminNotifications,
} from '../../services/adminNotificationService.js';

export function requireAdminNotificationReader(req, res, next) {
  const reader = req.verifiedAdmin && adminNotificationReader(req.user);
  if (!reader) {
    return res.status(403).json({ success: false, message: 'A verified administrator account is required.' });
  }
  req.adminNotificationReader = reader;
  res.set('Cache-Control', 'no-store');
  return next();
}

export async function getAdminNotifications(req, res, next) {
  try {
    const result = await listAdminNotifications(req.adminNotificationReader, req.query);
    return res.json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
}

export async function getAdminNotificationUnreadCount(req, res, next) {
  try {
    const unread = await countUnreadAdminNotifications(req.adminNotificationReader);
    return res.json({ success: true, unread });
  } catch (error) {
    return next(error);
  }
}

export async function markAdminNotificationRead(req, res, next) {
  try {
    const id = req.params.id;
    if (!/^(ekyc|owner-verification|devices):[a-f\d]{24}$/.test(id)) {
      return res.status(400).json({ success: false, message: 'Invalid notification ID.' });
    }
    const result = await AdminNotification.updateOne(
      { _id: id }, { $addToSet: { readBy: req.adminNotificationReader } }
    );
    if (!result.matchedCount) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }
    return getAdminNotificationUnreadCount(req, res, next);
  } catch (error) {
    return next(error);
  }
}

export async function markAllAdminNotificationsRead(req, res, next) {
  try {
    const reader = req.adminNotificationReader;
    await AdminNotification.updateMany({ readBy: { $ne: reader } }, { $addToSet: { readBy: reader } });
    return getAdminNotificationUnreadCount(req, res, next);
  } catch (error) {
    return next(error);
  }
}
