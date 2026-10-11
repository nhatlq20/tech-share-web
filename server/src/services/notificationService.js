import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { getAdminMessaging, getAdminFirestore } from '../config/firebaseAdmin.js';

/**
 * Kiểm tra xem token có phải là Expo Push Token không
 */
const isExpoPushToken = (token) => {
  return typeof token === 'string' && (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken['));
};

/**
 * Gửi thông báo đến Expo Push API (dành cho Mobile App)
 */
const sendExpoPushNotification = async (expoTokens, { title, body, data }) => {
  const validTokens = expoTokens.filter((token) => isExpoPushToken(token));
  if (validTokens.length === 0) return;

  const messages = validTokens.map((to) => ({
    to,
    sound: 'default',
    title,
    body,
    data: data || {},
    priority: 'high',
  }));

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
    const result = await response.json();
    console.log('📱 Expo Push Notification result:', result);
  } catch (error) {
    console.error('❌ Failed to send Expo Push notification:', error.message);
  }
};

/**
 * Gửi thông báo Push đến Web FCM qua Firebase Admin SDK
 */
const sendWebPushNotification = async (fcmTokens, { title, body, data }) => {
  const messaging = getAdminMessaging();
  if (!messaging) {
    console.warn('⚠️ Firebase Admin Messaging is not initialized. Skipping FCM push.');
    return;
  }

  const validTokens = [...new Set(fcmTokens.filter((t) => t && !isExpoPushToken(t)))];
  if (validTokens.length === 0) return;

  try {
    const messagePayload = {
      tokens: validTokens,
      notification: {
        title,
        body,
      },
      data: {
        notificationId: String(data?.notificationId || ''),
        type: String(data?.type || 'system'),
        relatedId: String(data?.relatedId || ''),
        url: String(data?.url || '/'),
      },
      webpush: {
        fcmOptions: {
          link: data?.url || '/',
        },
        notification: {
          icon: '/assets/logo.svg',
          badge: '/assets/logo.svg',
          requireInteraction: false,
        },
      },
    };

    const response = await messaging.sendEachForMulticast(messagePayload);
    console.log(`🌐 Web FCM Push sent: ${response.successCount} success, ${response.failureCount} failed.`);
  } catch (error) {
    console.error('❌ Failed to send Web FCM push:', error.message);
  }
};

/**
 * Đồng bộ Notification document lên Firestore để phục vụ onSnapshot Real-time
 */
const syncToFirestore = async (notificationDoc) => {
  const firestore = getAdminFirestore();
  if (!firestore) return;

  try {
    const docId = notificationDoc._id.toString();
    await firestore.collection('notifications').doc(docId).set({
      _id: docId,
      userId: notificationDoc.userId.toString(),
      title: notificationDoc.title,
      body: notificationDoc.body,
      type: notificationDoc.type,
      relatedId: notificationDoc.relatedId || null,
      isRead: Boolean(notificationDoc.isRead),
      createdAt: notificationDoc.createdAt
        ? notificationDoc.createdAt.toISOString()
        : new Date().toISOString(),
    });
  } catch (error) {
    console.warn('⚠️ Firestore sync warning (will rely on MongoDB fallback):', error.message);
  }
};

/**
 * Tạo bản ghi thông báo mới, đồng bộ Firestore và gửi Push Notification đa nền tảng
 */
export const createAndSendNotification = async ({
  userId,
  title,
  body,
  type = 'system',
  relatedId = null,
}) => {
  if (!userId || !title || !body) {
    throw new Error('userId, title, and body are required to create a notification.');
  }

  // 1. Lưu bản ghi cứng vào MongoDB
  const notification = await Notification.create({
    userId: new mongoose.Types.ObjectId(userId),
    title: title.trim(),
    body: body.trim(),
    type,
    relatedId: relatedId ? String(relatedId) : null,
    isRead: false,
  });

  // 2. Đồng bộ document lên Firebase Firestore
  await syncToFirestore(notification);

  // 3. Phân luồng gửi Push Notification dựa trên token của User
  try {
    const user = await User.findById(userId).select('expoPushToken pushTokens fcmTokens');
    if (user) {
      // Tập hợp các token
      const allTokens = [
        ...(Array.isArray(user.pushTokens) ? user.pushTokens : []),
        ...(Array.isArray(user.fcmTokens) ? user.fcmTokens : []),
        ...(user.expoPushToken ? [user.expoPushToken] : []),
      ];

      const expoTokens = allTokens.filter(isExpoPushToken);
      const fcmTokens = allTokens.filter((token) => token && !isExpoPushToken(token));

      const payloadData = {
        notificationId: notification._id.toString(),
        type,
        relatedId,
        url: relatedId ? `/devices/${relatedId}` : '/',
      };

      // Gửi Mobile (Expo)
      if (expoTokens.length > 0) {
        sendExpoPushNotification(expoTokens, { title, body, data: payloadData });
      }

      // Gửi Web (FCM)
      if (fcmTokens.length > 0) {
        sendWebPushNotification(fcmTokens, { title, body, data: payloadData });
      }
    }
  } catch (pushErr) {
    console.warn('⚠️ Push notification dispatch warning:', pushErr.message);
  }

  return notification;
};

/**
 * Lấy danh sách thông báo của User từ MongoDB
 */
export const getUserNotifications = async (userId, { limit = 30, page = 1, type = null } = {}) => {
  const query = { userId: new mongoose.Types.ObjectId(userId) };
  if (type && type !== 'all') {
    query.type = type;
  }

  const skip = (Math.max(1, page) - 1) * limit;

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ userId: new mongoose.Types.ObjectId(userId), isRead: false }),
  ]);

  return {
    items: items.map((doc) => ({
      _id: doc._id.toString(),
      userId: doc.userId.toString(),
      title: doc.title,
      body: doc.body,
      type: doc.type,
      relatedId: doc.relatedId || null,
      isRead: doc.isRead,
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    })),
    total,
    unreadCount,
    page,
    limit,
  };
};

/**
 * Đánh dấu một thông báo là đã đọc
 */
export const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId: new mongoose.Types.ObjectId(userId) },
    { $set: { isRead: true } },
    { new: true }
  );

  if (notification) {
    // Cập nhật lại trên Firestore
    const firestore = getAdminFirestore();
    if (firestore) {
      try {
        await firestore.collection('notifications').doc(notificationId).update({ isRead: true });
      } catch (err) {
        console.warn('⚠️ Firestore update warning:', err.message);
      }
    }
  }

  return notification;
};

/**
 * Đánh dấu tất cả thông báo của User là đã đọc
 */
export const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { userId: new mongoose.Types.ObjectId(userId), isRead: false },
    { $set: { isRead: true } }
  );

  // Cập nhật batch trên Firestore
  const firestore = getAdminFirestore();
  if (firestore) {
    try {
      const snapshot = await firestore
        .collection('notifications')
        .where('userId', '==', userId.toString())
        .where('isRead', '==', false)
        .get();

      if (!snapshot.empty) {
        const batch = firestore.batch();
        snapshot.forEach((doc) => {
          batch.update(doc.ref, { isRead: true });
        });
        await batch.commit();
      }
    } catch (err) {
      console.warn('⚠️ Firestore batch update warning:', err.message);
    }
  }

  return result;
};

/**
 * Lưu/cập nhật FCM Web Token vào User profile
 */
export const saveFcmToken = async (userId, fcmToken) => {
  if (!userId || !fcmToken) return null;

  return User.findByIdAndUpdate(
    userId,
    {
      $addToSet: {
        fcmTokens: fcmToken,
        pushTokens: fcmToken,
      },
    },
    { new: true }
  );
};

export default {
  createAndSendNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  saveFcmToken,
};

