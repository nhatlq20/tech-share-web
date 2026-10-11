import { collection, query, where, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';
import { db, getFirebaseMessaging } from '../lib/firebase';
import { api } from './api';
import { STORAGE_KEYS, API_CONFIG } from '../constants/config';
import type { Notification } from '../types/notification';

/**
 * Lấy Bearer Authorization headers từ localStorage
 */
const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Xin quyền thông báo từ trình duyệt & Đăng ký FCM Token lên Server
 */
export const requestNotificationPermission = async (): Promise<string | null> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('⚠️ Notifications are not supported in this browser.');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('ℹ️ Notification permission status:', permission);
      return null;
    }

    const messaging = await getFirebaseMessaging();
    if (!messaging) return null;

    // Đăng ký Service Worker
    let swRegistration: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      try {
        swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        await navigator.serviceWorker.ready;
      } catch (swErr) {
        console.warn('⚠️ Failed to register firebase-messaging-sw.js:', swErr);
      }
    }

    // Lấy FCM Web Registration Token
    const currentToken = await getToken(messaging, {
      serviceWorkerRegistration: swRegistration,
    });

    if (currentToken) {
      console.log('🔑 FCM Web Push Token obtained:', currentToken.substring(0, 16) + '...');

      // Lưu FCM Token lên Backend Server
      try {
        await api.post(
          API_CONFIG.ENDPOINTS.NOTIFICATIONS_FCM_TOKEN,
          { token: currentToken },
          { headers: getAuthHeaders() }
        );
      } catch (postErr) {
        console.warn('⚠️ Could not save FCM token to backend:', postErr);
      }

      return currentToken;
    } else {
      console.warn('⚠️ No registration token available. Request permission to generate one.');
      return null;
    }
  } catch (error) {
    console.error('❌ Error requesting notification permission:', error);
    return null;
  }
};

/**
 * Lắng nghe Real-time thông báo qua Firestore onSnapshot
 * Đồng bộ ngay lập tức khi backend ghi document vào collection 'notifications'
 */
export const subscribeUserNotifications = (
  userId: string,
  callback: (notifications: Notification[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  if (!userId) {
    callback([]);
    return () => {};
  }

  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(notificationsRef, where('userId', '==', String(userId)));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notifications: Notification[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          notifications.push({
            _id: doc.id,
            userId: data.userId || userId,
            title: data.title || 'Thông báo',
            body: data.body || '',
            type: data.type || 'system',
            relatedId: data.relatedId || undefined,
            isRead: Boolean(data.isRead),
            createdAt: data.createdAt || new Date().toISOString(),
          });
        });

        // Sắp xếp thời gian giảm dần (mới nhất lên đầu)
        notifications.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        callback(notifications);
      },
      (error) => {
        console.warn('⚠️ Firestore onSnapshot notice (falling back to REST):', error.message);
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('❌ Failed to establish Firestore onSnapshot listener:', error);
    if (onError && error instanceof Error) onError(error);
    return () => {};
  }
};

/**
 * Lắng nghe thông báo khi ứng dụng đang mở ở Foreground
 */
export const onForegroundMessage = async (
  callback: (payload: { title?: string; body?: string; data?: any }) => void
): Promise<(() => void) | null> => {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return null;

  return onMessage(messaging, (payload) => {
    callback({
      title: payload.notification?.title || payload.data?.title,
      body: payload.notification?.body || payload.data?.body,
      data: payload.data,
    });
  });
};

/**
 * REST API: Lấy danh sách thông báo từ MongoDB
 */
export const fetchNotificationsApi = async (type?: string) => {
  const params: Record<string, string> = {};
  if (type && type !== 'all') params.type = type;

  return api.get<{
    success: boolean;
    data: Notification[];
    unreadCount: number;
    total: number;
  }>(API_CONFIG.ENDPOINTS.NOTIFICATIONS, {
    params,
    headers: getAuthHeaders(),
  });
};

/**
 * REST API: Đánh dấu một thông báo là đã đọc
 */
export const markAsReadApi = async (notificationId: string) => {
  return api.patch(API_CONFIG.ENDPOINTS.NOTIFICATIONS_READ(notificationId), {}, {
    headers: getAuthHeaders(),
  });
};

/**
 * REST API: Đánh dấu tất cả thông báo là đã đọc
 */
export const markAllAsReadApi = async () => {
  return api.patch(API_CONFIG.ENDPOINTS.NOTIFICATIONS_READ_ALL, {}, {
    headers: getAuthHeaders(),
  });
};

/**
 * REST API: Gửi thông báo test để kiểm tra real-time
 */
export const sendTestNotificationApi = async (payload: {
  title?: string;
  body?: string;
  type?: string;
  relatedId?: string;
}) => {
  return api.post(API_CONFIG.ENDPOINTS.NOTIFICATIONS_TEST, payload, {
    headers: getAuthHeaders(),
  });
};

const firebaseNotificationService = {
  requestNotificationPermission,
  subscribeUserNotifications,
  onForegroundMessage,
  fetchNotificationsApi,
  markAsReadApi,
  markAllAsReadApi,
  sendTestNotificationApi,
};

export default firebaseNotificationService;

