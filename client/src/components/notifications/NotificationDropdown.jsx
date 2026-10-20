import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Sparkles,
  Inbox,
  Volume2,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/store';
import {
  markNotificationAsRead,
  markAllAsRead,
  setFilter,
} from '../../store/slices/notificationSlice';
import {
  markAsReadApi,
  markAllAsReadApi,
  sendTestNotificationApi,
  requestNotificationPermission,
} from '../../services/firebaseNotificationService';
import NotificationItem from './NotificationItem';
import './NotificationDropdown.css';
import { useAuth } from '../../context/AuthContext.jsx';

const FILTER_TABS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'order', label: 'Đơn thuê' },
  { id: 'system', label: 'Hệ thống' },
  { id: 'reminder', label: 'Nhắc nhở' },
  { id: 'promo', label: 'Ưu đãi' },
];

export const NotificationDropdown = ({ className = '' }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { items, unreadCount, filter, permission } = useAppSelector(
    (state) => state.notification
  );

  // Lọc thông báo theo tab đang chọn
  const filteredNotifications = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((item) => item.type === filter);
  }, [items, filter]);

  // Đóng popover khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Đánh dấu tất cả đã đọc
  const handleMarkAllAsRead = async () => {
    try {
      dispatch(markAllAsRead());
      await markAllAsReadApi();
    } catch (err) {
      console.warn('⚠️ Error marking all notifications as read:', err);
    }
  };

  // Nhấn vào một thông báo cụ thể
  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.isRead) {
        dispatch(markNotificationAsRead(notification._id));
        await markAsReadApi(notification._id);
      }
    } catch (err) {
      console.warn('⚠️ Error marking notification as read:', err);
    }

    setIsOpen(false);

    // Xác định đường dẫn điều hướng an toàn, ngăn ngừa tuyệt đối 404
    let targetUrl = notification.url;
    const isOwner = user?.role === 'owner';
    const lowerTitle = (notification.title || '').toLowerCase();

    // 1. Phân luồng ưu tiên cho Chủ thiết bị (Owner)
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

    // 2. Nếu chưa có url hoặc url generic, suy luận đường dẫn theo role
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

    // 3. Chuẩn hóa đường dẫn: nếu là /bookings/:id -> tự động chuyển thành chuẩn /my-bookings/:id
    if (targetUrl && targetUrl.startsWith('/bookings/')) {
      targetUrl = targetUrl.replace('/bookings/', '/my-bookings/');
    }

    if (targetUrl) {
      navigate(targetUrl);
    }
  };

  // Gửi thông báo thử nghiệm
  const handleSendTestNotification = async () => {
    if (isSendingTest) return;
    setIsSendingTest(true);
    try {
      await sendTestNotificationApi({
        title: 'Xác nhận đơn thuê thiết bị',
        body: 'Khách hàng vừa đặt thuê máy ảnh Sony A7 IV của bạn. Vui lòng bấm để xem chi tiết.',
        type: 'order',
      });
    } catch (err) {
      console.warn('⚠️ Error sending test notification:', err);
    } finally {
      setIsSendingTest(false);
    }
  };

  // Bật quyền Web Push
  const handleEnablePermission = async () => {
    await requestNotificationPermission();
  };

  return (
    <div className={`notification-bell-container ${className}`} ref={containerRef}>
      {/* Bell Button */}
      <button
        type="button"
        className={`notification-bell-btn relative ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Thông báo"
        aria-label="Thông báo"
        aria-expanded={isOpen}
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span
            className="bg-red-500 text-white text-[11px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center absolute -top-1 -right-1 shadow-xs leading-none"
            aria-label={`${unreadCount} thông báo chưa đọc`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="notification-popover shadow-2xl border border-slate-200" role="dialog" aria-label="Trung tâm thông báo">
          {/* Header */}
          <div className="notification-popover-header">
            <div className="notification-header-title-box">
              <span className="notification-header-title">Thông báo</span>
              {unreadCount > 0 && (
                <span className="notification-count-pill">{unreadCount} mới</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                className="notification-mark-all-btn"
                onClick={handleMarkAllAsRead}
                title="Đánh dấu tất cả là đã đọc"
              >
                <CheckCheck size={14} style={{ display: 'inline', marginRight: 4 }} />
                Đánh dấu đã đọc
              </button>
            )}
          </div>

          {/* Quick Filter Tabs */}
          <div className="notification-tabs" role="tablist">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={filter === tab.id}
                className={`notification-tab-btn ${filter === tab.id ? 'active' : ''}`}
                onClick={() => dispatch(setFilter(tab.id))}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Notification List */}
          <div className="notification-list" role="list">
            {filteredNotifications.length === 0 ? (
              <div className="notification-empty py-10">
                <div className="notification-empty-icon">
                  <Inbox size={24} />
                </div>
                <h4 className="notification-empty-title">Chưa có thông báo nào</h4>
                <p className="notification-empty-desc">
                  {filter === 'all'
                    ? 'Bạn đã cập nhật hết tất cả thông báo mới nhất.'
                    : `Không có thông báo nào trong mục "${FILTER_TABS.find((t) => t.id === filter)?.label}".`}
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => (
                <NotificationItem
                  key={item._id}
                  notification={item}
                  onClick={() => handleNotificationClick(item)}
                />
              ))
            )}
          </div>

          {/* Footer */}
          <div className="notification-popover-footer">
            {permission !== 'granted' ? (
              <button
                type="button"
                className="notification-permission-pill"
                onClick={handleEnablePermission}
              >
                <Volume2 size={13} />
                Bật Push
              </button>
            ) : (
              <span style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Sparkles size={12} /> Web Push đang bật
              </span>
            )}

            <button
              type="button"
              className="notification-test-btn"
              onClick={handleSendTestNotification}
              disabled={isSendingTest}
            >
              {isSendingTest ? 'Đang gửi...' : 'Gửi thông báo thử'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
