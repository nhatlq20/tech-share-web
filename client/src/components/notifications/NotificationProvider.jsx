import React, { useEffect, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  Bell,
  Package,
  Clock,
  Star,
  Tag,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAppDispatch } from '../../store/store';
import {
  setNotifications,
  addNotification,
  markNotificationAsRead,
  markAllAsRead,
} from '../../store/slices/notificationSlice';
import {
  subscribeUserNotifications,
  onForegroundMessage,
  requestNotificationPermission,
  markAsReadApi,
  fetchNotificationsApi,
} from '../../services/firebaseNotificationService';
import { connectSocket } from '../../services/socketService.js';

/**
 * Modern Glassmorphic Toast Notification Banner
 */
const renderCustomToast = (notification, navigate, dispatch, currentUser = null) => {
  const getTypeTheme = () => {
    const lowerTitle = (notification?.title || '').toLowerCase();
    const lowerType = (notification?.type || '').toLowerCase();

    // 1. Đơn bị từ chối / Đã hủy
    if (
      lowerTitle.includes('từ chối') ||
      lowerTitle.includes('hủy') ||
      lowerType === 'booking_rejected' ||
      lowerType === 'booking_cancelled'
    ) {
      return {
        icon: <XCircle size={18} className="text-rose-600" />,
        badgeBg: 'bg-rose-50 border-rose-200/80',
        accent: 'border-l-rose-500',
        label: 'Từ chối',
        labelColor: 'text-rose-700 bg-rose-50',
      };
    }

    // 2. Đơn được duyệt / Thành công
    if (
      lowerTitle.includes('duyệt') ||
      lowerTitle.includes('thành công') ||
      lowerType === 'booking_approved'
    ) {
      return {
        icon: <CheckCircle2 size={18} className="text-emerald-600" />,
        badgeBg: 'bg-emerald-50 border-emerald-200/80',
        accent: 'border-l-emerald-500',
        label: 'Đã duyệt',
        labelColor: 'text-emerald-700 bg-emerald-50',
      };
    }

    // 3. Đơn thuê mới / Đơn đặt hàng
    if (
      lowerTitle.includes('yêu cầu thuê') ||
      lowerTitle.includes('đơn thuê') ||
      lowerType === 'order' ||
      lowerType === 'booking'
    ) {
      return {
        icon: <Package size={18} className="text-teal-600" />,
        badgeBg: 'bg-teal-50 border-teal-200/80',
        accent: 'border-l-teal-500',
        label: 'Đơn thuê',
        labelColor: 'text-teal-700 bg-teal-50',
      };
    }

    // 4. Nhắc nhở / Hạn trả
    if (
      lowerTitle.includes('nhắc nhở') ||
      lowerTitle.includes('hạn trả') ||
      lowerType === 'reminder'
    ) {
      return {
        icon: <Clock size={18} className="text-amber-600" />,
        badgeBg: 'bg-amber-50 border-amber-200/80',
        accent: 'border-l-amber-500',
        label: 'Nhắc nhở',
        labelColor: 'text-amber-700 bg-amber-50',
      };
    }

    // 5. Đánh giá
    if (lowerType === 'review') {
      return {
        icon: <Star size={18} className="text-yellow-600" />,
        badgeBg: 'bg-yellow-50 border-yellow-200/80',
        accent: 'border-l-yellow-500',
        label: 'Đánh giá',
        labelColor: 'text-yellow-700 bg-yellow-50',
      };
    }

    // 6. Ưu đãi
    if (lowerType === 'promo') {
      return {
        icon: <Tag size={18} className="text-pink-600" />,
        badgeBg: 'bg-pink-50 border-pink-200/80',
        accent: 'border-l-pink-500',
        label: 'Ưu đãi',
        labelColor: 'text-pink-700 bg-pink-50',
      };
    }

    // 7. Mặc định / Hệ thống
    return {
      icon: <Bell size={18} className="text-teal-600" />,
      badgeBg: 'bg-teal-50 border-teal-200/80',
      accent: 'border-l-teal-500',
      label: 'Hệ thống',
      labelColor: 'text-teal-700 bg-teal-50',
    };
  };

  const theme = getTypeTheme();
  const cleanTitle = (notification?.title || '')
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}❌🎉📦🔔!]/gu, '')
    .trim();

  toast.custom(
    (t) => (
      <div
        className={`${
          t.visible ? 'animate-in fade-in slide-in-from-top-3' : 'animate-out fade-out slide-out-to-top-2'
        } max-w-sm w-full bg-white/95 backdrop-blur-xl shadow-2xl rounded-2xl pointer-events-auto border border-slate-200/80 border-l-4 ${theme.accent} overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.015] hover:shadow-2xl group`}
        onClick={() => {
          toast.dismiss(t.id);
          dispatch(markNotificationAsRead(notification._id));
          markAsReadApi(notification._id).catch(() => {});

          let targetUrl = notification.url;
          const isOwner = currentUser?.role === 'owner';
          const lowerTitle = (notification?.title || '').toLowerCase();

          if (isOwner) {
            if (
              notification.type === 'order' ||
              lowerTitle.includes('thuê') ||
              lowerTitle.includes('đơn') ||
              lowerTitle.includes('duyệt')
            ) {
              targetUrl = '/owner/bookings';
            } else if (lowerTitle.includes('thiết bị')) {
              targetUrl = '/owner/devices';
            }
          }

          if (!targetUrl) {
            if (notification.relatedId) {
              if (notification.type === 'order') {
                targetUrl = isOwner ? '/owner/bookings' : `/my-bookings/${notification.relatedId}`;
              } else {
                targetUrl = isOwner ? '/owner/devices' : `/device/${notification.relatedId}`;
              }
            } else {
              targetUrl = isOwner ? '/owner/bookings' : '/my-bookings';
            }
          }

          // Chuẩn hóa đường dẫn
          if (targetUrl && targetUrl.startsWith('/bookings/')) {
            targetUrl = targetUrl.replace('/bookings/', '/my-bookings/');
          }

          if (targetUrl) {
            navigate(targetUrl);
          }
        }}
      >
        <div className="p-3.5 sm:p-4 flex items-start gap-3">
          <div className={`flex-shrink-0 p-2.5 rounded-xl border ${theme.badgeBg} shadow-xs`}>
            {theme.icon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${theme.labelColor}`}>
                {theme.label}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Vừa xong</span>
            </div>

            <p className="text-xs font-bold text-slate-900 leading-snug truncate">
              {cleanTitle || notification.title}
            </p>

            <p className="mt-1 text-xs text-slate-600 line-clamp-2 leading-relaxed">
              {notification.body}
            </p>

            <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-100">
              <span className="text-[11px] font-semibold text-teal-600 group-hover:text-teal-700 group-hover:underline flex items-center gap-1">
                Xem chi tiết &rarr;
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toast.dismiss(t.id);
            }}
            className="flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Dismiss notification"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    ),
    {
      duration: 5000,
      position: 'top-right',
    }
  );
};

export const NotificationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const isInitialLoadRef = useRef(true);
  const knownIdsRef = useRef(new Set());

  useEffect(() => {
    const currentUserId = user?._id || user?.id;
    if (!isAuthenticated || !currentUserId) {
      isInitialLoadRef.current = true;
      knownIdsRef.current.clear();
      return;
    }

    // 1. Tự động xin quyền Web Push Notifications khi user đã đăng nhập
    requestNotificationPermission().catch((err) => {
      console.warn('⚠️ Notification permission init:', err);
    });

    // 2. Fetch danh sách ban đầu qua REST API để nạp ngay dữ liệu
    fetchNotificationsApi()
      .then((res) => {
        if (res && res.data) {
          dispatch(setNotifications(res.data));
          res.data.forEach((item) => knownIdsRef.current.add(item._id));
        }
      })
      .catch((err) => {
        console.warn('⚠️ Fetch initial notifications via REST:', err);
      });

    // 3. Kết nối Firestore onSnapshot lắng nghe Real-time
    const unsubscribeSnapshot = subscribeUserNotifications(
      String(currentUserId),
      (notifications) => {
        dispatch(setNotifications(notifications));

        if (isInitialLoadRef.current) {
          // Lần đầu mount: lưu lại danh sách id đã có, không bắn toast
          notifications.forEach((item) => knownIdsRef.current.add(item._id));
          isInitialLoadRef.current = false;
        } else {
          // Các lần sau: nếu có thông báo mới chưa đọc, bắn Toast banner nổi ngay lập tức
          notifications.forEach((item) => {
            if (!knownIdsRef.current.has(item._id) && !item.isRead) {
              renderCustomToast(item, navigate, dispatch, user);
              knownIdsRef.current.add(item._id);
            }
          });
        }
      }
    );

    // 4. Lắng nghe Foreground FCM messages
    let unsubscribeForeground = null;
    onForegroundMessage((payload) => {
      if (payload.title && payload.body) {
        const dummyNotification = {
          _id: payload.data?.notificationId || String(Date.now()),
          userId: String(currentUserId),
          title: payload.title,
          body: payload.body,
          type: payload.data?.type || 'system',
          relatedId: payload.data?.relatedId,
          url: payload.data?.url || null,
          isRead: false,
          createdAt: new Date().toISOString(),
        };
        dispatch(addNotification(dummyNotification));
        renderCustomToast(dummyNotification, navigate, dispatch, user);
      }
    }).then((unsub) => {
      unsubscribeForeground = unsub;
    });

    // 5. Kết nối Socket.IO lắng nghe thông báo thời gian thực
    const socket = connectSocket();
    const handleSocketNewNotification = (data) => {
      if (!data) return;
      const notifId = data._id || data.notificationId || `notif_${Date.now()}`;
      if (!knownIdsRef.current.has(notifId)) {
        const newNotif = {
          _id: notifId,
          userId: String(currentUserId),
          title: data.title || 'New notification',
          body: data.body || '',
          type: data.type || 'system',
          relatedId: data.relatedId || data.metadata?.bookingId,
          url: data.url || null,
          isRead: false,
          createdAt: data.createdAt || new Date().toISOString(),
        };
        knownIdsRef.current.add(notifId);
        dispatch(addNotification(newNotif));
        // Nếu không phải dạng tin nhắn chat thuần (đã có InAppNotificationBanner lo)
        if (data.type !== 'chat') {
          renderCustomToast(newNotif, navigate, dispatch, user);
        }
      }
    };

    const handleSocketNotificationRead = (payload) => {
      if (payload?.id) {
        dispatch(markNotificationAsRead(payload.id));
      }
    };

    const handleSocketNotificationsReadAll = () => {
      dispatch(markAllAsRead());
    };

    if (socket) {
      socket.on('new_notification', handleSocketNewNotification);
      socket.on('notification_read', handleSocketNotificationRead);
      socket.on('notifications_read_all', handleSocketNotificationsReadAll);
    }

    return () => {
      if (typeof unsubscribeSnapshot === 'function') {
        unsubscribeSnapshot();
      }
      if (typeof unsubscribeForeground === 'function') {
        unsubscribeForeground();
      }
      if (socket) {
        socket.off('new_notification', handleSocketNewNotification);
        socket.off('notification_read', handleSocketNotificationRead);
        socket.off('notifications_read_all', handleSocketNotificationsReadAll);
      }
    };
  }, [isAuthenticated, user, dispatch, navigate]);

  return (
    <>
      {children}
      {/* Container Toast nổi ở góc trên bên phải */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4500,
          style: {
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(12px)',
            color: '#0f172a',
            borderRadius: '16px',
            boxShadow: '0 20px 30px -10px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05)',
            border: '1px solid #e2e8f0',
            padding: '12px 16px',
            fontSize: '13px',
            fontWeight: 500,
          },
        }}
      />
    </>
  );
};

export default NotificationProvider;
