import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Package,
  Clock,
  ShieldAlert,
  Star,
  Tag,
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
import './NotificationDropdown.css';

/**
 * Format relative time (time ago) in Vietnamese
 */
const formatTimeAgo = (dateString) => {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.max(1, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffInSeconds < 60) return 'Vừa xong';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} giờ trước`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays} ngày trước`;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

/**
 * Lấy Icon và class tương ứng với Type của thông báo
 */
const getTypeConfig = (type) => {
  switch (type) {
    case 'order':
      return {
        icon: Package,
        className: 'notification-icon-order',
        label: 'Đơn hàng',
      };
    case 'reminder':
      return {
        icon: Clock,
        className: 'notification-icon-reminder',
        label: 'Nhắc nhở',
      };
    case 'review':
      return {
        icon: Star,
        className: 'notification-icon-review',
        label: 'Đánh giá',
      };
    case 'promo':
      return {
        icon: Tag,
        className: 'notification-icon-promo',
        label: 'Ưu đãi',
      };
    case 'system':
    default:
      return {
        icon: ShieldAlert,
        className: 'notification-icon-system',
        label: 'Hệ thống',
      };
  }
};

const FILTER_TABS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'order', label: 'Đơn hàng' },
  { id: 'system', label: 'Hệ thống' },
  { id: 'reminder', label: 'Nhắc nhở' },
  { id: 'promo', label: 'Ưu đãi' },
];

export const NotificationDropdown = ({ className = '' }) => {
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

    // Điều hướng nếu có liên kết đơn hàng hoặc thiết bị
    if (notification.relatedId) {
      if (notification.type === 'order') {
        navigate(`/bookings/${notification.relatedId}`);
      } else {
        navigate(`/devices/${notification.relatedId}`);
      }
    }
  };

  // Gửi thông báo test
  const handleSendTestNotification = async () => {
    if (isSendingTest) return;
    setIsSendingTest(true);
    try {
      await sendTestNotificationApi({
        title: 'Đơn hàng mới đã được xác nhận! 📦',
        body: 'Khách hàng vừa đặt thuê máy ảnh Sony A7 IV của bạn. Nhấn vào để xem chi tiết.',
        type: 'order',
      });
    } catch (err) {
      console.warn('⚠️ Error sending test notification:', err);
    } finally {
      setIsSendingTest(false);
    }
  };

  // Bật quyền thông báo
  const handleEnablePermission = async () => {
    await requestNotificationPermission();
  };

  return (
    <div className={`notification-bell-container ${className}`} ref={containerRef}>
      {/* Nút Chuông */}
      <button
        type="button"
        className={`notification-bell-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Thông báo"
        aria-label="Thông báo"
        aria-expanded={isOpen}
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="notification-badge" aria-label={`${unreadCount} thông báo chưa đọc`}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="notification-popover" role="dialog" aria-label="Hộp thông báo">
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
                Đã đọc tất cả
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

          {/* Danh sách thông báo */}
          <div className="notification-list" role="list">
            {filteredNotifications.length === 0 ? (
              <div className="notification-empty">
                <div className="notification-empty-icon">
                  <Inbox size={24} />
                </div>
                <h4 className="notification-empty-title">Không có thông báo nào</h4>
                <p className="notification-empty-desc">
                  {filter === 'all'
                    ? 'Bạn đã xem hết các thông báo gần đây.'
                    : `Chưa có thông báo thuộc mục "${FILTER_TABS.find((t) => t.id === filter)?.label}".`}
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => {
                const config = getTypeConfig(item.type);
                const IconComponent = config.icon;

                return (
                  <div
                    key={item._id}
                    className={`notification-item ${!item.isRead ? 'unread' : ''}`}
                    onClick={() => handleNotificationClick(item)}
                    role="listitem"
                  >
                    <div className={`notification-icon-wrap ${config.className}`}>
                      <IconComponent size={18} />
                    </div>

                    <div className="notification-content">
                      <div className="notification-item-header">
                        <h5 className="notification-title">{item.title}</h5>
                        {!item.isRead && <span className="notification-dot" />}
                      </div>
                      <p className="notification-body">{item.body}</p>
                      <div className="notification-time">{formatTimeAgo(item.createdAt)}</div>
                    </div>
                  </div>
                );
              })
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
                Bật thông báo đẩy
              </button>
            ) : (
              <span style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Sparkles size={12} /> Web Push sẵn sàng
              </span>
            )}

            <button
              type="button"
              className="notification-test-btn"
              onClick={handleSendTestNotification}
              disabled={isSendingTest}
            >
              {isSendingTest ? 'Đang gửi...' : 'Gửi thông báo test'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;

