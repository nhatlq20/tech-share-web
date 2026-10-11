import React, { useEffect, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Package, Clock, ShieldAlert, Star, Tag, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAppDispatch } from '../../store/store';
import {
  setNotifications,
  addNotification,
  markNotificationAsRead,
} from '../../store/slices/notificationSlice';
import {
  subscribeUserNotifications,
  onForegroundMessage,
  requestNotificationPermission,
  markAsReadApi,
  fetchNotificationsApi,
} from '../../services/firebaseNotificationService';

/**
 * Toast Banner hiển thị thông báo thời gian thực nổi ở góc phải
 */
const renderCustomToast = (notification, navigate, dispatch) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'order':
        return <Package size={20} className="text-teal-600" />;
      case 'reminder':
        return <Clock size={20} className="text-amber-600" />;
      case 'review':
        return <Star size={20} className="text-yellow-600" />;
      case 'promo':
        return <Tag size={20} className="text-pink-600" />;
      case 'system':
      default:
        return <ShieldAlert size={20} className="text-indigo-600" />;
    }
  };

  const getBgColor = () => {
    switch (notification.type) {
      case 'order':
        return 'bg-teal-50 border-teal-200';
      case 'reminder':
        return 'bg-amber-50 border-amber-200';
      case 'review':
        return 'bg-yellow-50 border-yellow-200';
      case 'promo':
        return 'bg-pink-50 border-pink-200';
      case 'system':
      default:
        return 'bg-indigo-50 border-indigo-200';
    }
  };

  toast.custom(
    (t) => (
      <div
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-sm w-full bg-white shadow-xl rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 border border-slate-200 overflow-hidden cursor-pointer transition-all hover:scale-[1.02]`}
        onClick={() => {
          toast.dismiss(t.id);
          dispatch(markNotificationAsRead(notification._id));
          markAsReadApi(notification._id).catch(() => {});

          if (notification.relatedId) {
            if (notification.type === 'order') {
              navigate(`/bookings/${notification.relatedId}`);
            } else {
              navigate(`/devices/${notification.relatedId}`);
            }
          }
        }}
      >
        <div className="flex-1 w-0 p-4">
          <div className="flex items-start">
            <div className={`flex-shrink-0 pt-0.5 p-2 rounded-xl border ${getBgColor()}`}>
              {getIcon()}
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-bold text-slate-900 leading-snug">
                {notification.title}
              </p>
              <p className="mt-1 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                {notification.body}
              </p>
              <span className="mt-1 inline-block text-[10px] font-semibold text-teal-600">
                Nhấn để xem chi tiết →
              </span>
            </div>
          </div>
        </div>
        <div className="flex border-l border-slate-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toast.dismiss(t.id);
            }}
            className="w-full border border-transparent rounded-none rounded-r-2xl p-3 flex items-center justify-center text-xs font-medium text-slate-400 hover:text-slate-600 focus:outline-none"
            aria-label="Đóng thông báo"
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
              renderCustomToast(item, navigate, dispatch);
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
          isRead: false,
          createdAt: new Date().toISOString(),
        };
        dispatch(addNotification(dummyNotification));
        renderCustomToast(dummyNotification, navigate, dispatch);
      }
    }).then((unsub) => {
      unsubscribeForeground = unsub;
    });

    return () => {
      if (typeof unsubscribeSnapshot === 'function') {
        unsubscribeSnapshot();
      }
      if (typeof unsubscribeForeground === 'function') {
        unsubscribeForeground();
      }
    };
  }, [isAuthenticated, user?._id, user?.id, dispatch, navigate]);

  return (
    <>
      {children}
      {/* Container Toast nổi ở góc trên bên phải */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4500,
          style: {
            background: '#ffffff',
            color: '#0f172a',
            borderRadius: '14px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0',
          },
        }}
      />
    </>
  );
};

export default NotificationProvider;

