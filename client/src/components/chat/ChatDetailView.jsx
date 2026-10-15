import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  ExternalLink,
  MapPin,
  X,
  ChevronLeft,
  ChevronDown,
  RotateCw,
  Smartphone,
  Eye,
  FileText,
  Calendar,
} from 'lucide-react';
import { getSocket, joinChat, leaveChat } from '../../services/socketService.js';
import {
  getMessages,
  sendMessage as apiSendMessage,
  markAsRead as apiMarkAsRead,
  uploadChatImage,
} from '../../services/chatService.js';
import { ROUTES } from '../../routes/routes.js';
import { formatPrice, formatDate } from '../../utils/formatters.js';
import { QuickMessageBar } from './QuickMessageBar.jsx';
import { ChatInputBox } from './ChatInputBox.jsx';

/**
 * Helper format thời gian tin nhắn
 */
const formatMessageTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

/**
 * Helper format khoảng thời gian thuê (startDate -> endDate)
 */
const formatDateRange = (start, end) => {
  if (!start) return 'Chưa xác định ngày';
  const s = formatDate(start);
  if (!end) return s;
  const e = formatDate(end);
  return `${s} ➔ ${e}`;
};

/**
 * Badge trạng thái đơn hàng
 */
const BookingStatusBadge = ({ status }) => {
  const config = {
    pending: { label: 'Chờ duyệt', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
    approved: { label: 'Đã duyệt', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
    active: { label: 'Đang thuê', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    completed: { label: 'Hoàn tất', bg: 'bg-slate-100 text-slate-700 border-slate-200' },
    cancelled: { label: 'Đã hủy', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
    rejected: { label: 'Từ chối', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
  }[status] || { label: status || 'Đơn thuê', bg: 'bg-slate-50 text-slate-600 border-slate-200' };

  return (
    <span
      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border leading-none ${config.bg}`}
    >
      {config.label}
    </span>
  );
};

/**
 * Lightbox Modal xem ảnh full screen
 */
const ImageLightboxModal = ({ imageUrl, onClose }) => {
  if (!imageUrl) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition cursor-pointer"
        title="Đóng (Esc)"
      >
        <X size={22} />
      </button>
      <div
        className="max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt="Phóng to ảnh"
          className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl select-none"
        />
      </div>
    </div>
  );
};

export const ChatDetailView = ({
  bookingId,
  conversation,
  currentUserId,
  onBack,
  onMessageSent,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isOwnerContext = location.pathname.startsWith('/owner');
  const getMessagesPath = (bId) =>
    isOwnerContext ? ROUTES.OWNER_MESSAGES_PATH(bId) : ROUTES.MESSAGES_PATH(bId);

  const [messages, setMessages] = useState([]);
  const [bookingContext, setBookingContext] = useState(conversation || null);
  const [loading, setLoading] = useState(true);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);
  const currentBookingIdRef = useRef(bookingId);
  const switcherDropdownRef = useRef(null);

  currentBookingIdRef.current = bookingId;

  // Cập nhật bookingContext khi prop conversation thay đổi
  useEffect(() => {
    if (conversation) {
      setBookingContext((prev) => ({ ...(prev || {}), ...conversation }));
    }
  }, [conversation]);

  // Đóng dropdown chuyển đổi đơn thuê khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        switcherDropdownRef.current &&
        !switcherDropdownRef.current.contains(event.target)
      ) {
        setIsSwitcherOpen(false);
      }
    };
    if (isSwitcherOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSwitcherOpen]);

  // Cuộn xuống tin nhắn mới nhất
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
    }
  }, []);

  // 1. Tải lịch sử tin nhắn & thông tin booking context
  const fetchHistoryAndMarkRead = useCallback(async (bId, retryCount = 0) => {
    if (!bId) return;
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await getMessages(bId);
      if (res && res.data) {
        setMessages(res.data);
      }
      if (res && res.booking) {
        setBookingContext((prev) => ({ ...(prev || {}), ...res.booking }));
      }
      // Đánh dấu đã đọc
      apiMarkAsRead(bId).catch(() => {});
      setTimeout(() => scrollToBottom('auto'), 100);
    } catch (err) {
      console.error('Error fetching chat messages:', err);
      // Tự động thử lại 1 lần nếu gặp sự cố mạng hoặc dev server reload
      if (retryCount < 1) {
        setTimeout(() => {
          fetchHistoryAndMarkRead(bId, retryCount + 1);
        }, 500);
        return;
      }
      const isNetworkErr =
        err.message === 'Failed to fetch' ||
        err.name === 'AbortError' ||
        err.message?.includes('NetworkError');
      setErrorMsg(
        isNetworkErr
          ? 'Kết nối máy chủ bị gián đoạn. Vui lòng bấm thử lại.'
          : (err.message || 'Không thể tải lịch sử trò chuyện.')
      );
    } finally {
      setLoading(false);
    }
  }, [scrollToBottom]);

  // 2. Lifecycle Socket & Room Management
  useEffect(() => {
    if (!bookingId) return;

    fetchHistoryAndMarkRead(bookingId);

    const socket = getSocket();
    joinChat(bookingId);

    // Xử lý tin nhắn mới nhận từ socket
    const handleNewMessage = (msg) => {
      if (!msg) return;
      const msgBookingId = (msg.bookingId?._id || msg.bookingId)?.toString();
      if (msgBookingId === bookingId) {
        setMessages((prev) => {
          // Tránh duplicate nếu tin nhắn đã có
          const exists = prev.some(
            (m) => m._id === msg._id || (m.tempId && m.tempId === msg.tempId)
          );
          if (exists) {
            return prev.map((m) =>
              m._id === msg._id || (m.tempId && m.tempId === msg.tempId) ? msg : m
            );
          }
          return [...prev, msg];
        });

        // Nếu tin nhắn là từ đối phương gửi cho mình -> đánh dấu đã đọc ngay
        const senderIdStr = (msg.senderId?._id || msg.senderId)?.toString();
        if (senderIdStr !== currentUserId) {
          apiMarkAsRead(bookingId).catch(() => {});
        }

        setTimeout(() => scrollToBottom('smooth'), 50);
      }
    };

    // Xử lý sự kiện tin nhắn đã được đối phương đọc
    const handleMessagesRead = (payload) => {
      if (payload && payload.bookingId === bookingId) {
        setMessages((prev) =>
          prev.map((m) => {
            const senderIdStr = (m.senderId?._id || m.senderId)?.toString();
            if (senderIdStr === currentUserId) {
              return { ...m, status: 'read' };
            }
            return m;
          })
        );
      }
    };

    // Xử lý typing indicator
    const handleUserTyping = (data) => {
      if (data && data.bookingId === bookingId && data.userId !== currentUserId) {
        setPartnerTyping(true);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => {
          setPartnerTyping(false);
        }, 3000);
      }
    };

    const handleUserStopTyping = (data) => {
      if (data && data.bookingId === bookingId) {
        setPartnerTyping(false);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('messages_read', handleMessagesRead);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stop_typing', handleUserStopTyping);

    // Page Visibility API: khi tab active trở lại, tự động đánh dấu đã đọc
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && currentBookingIdRef.current === bookingId) {
        apiMarkAsRead(bookingId).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      leaveChat(bookingId);
      socket.off('new_message', handleNewMessage);
      socket.off('messages_read', handleMessagesRead);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stop_typing', handleUserStopTyping);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [bookingId, currentUserId, fetchHistoryAndMarkRead, scrollToBottom]);

  // 3. Optimistic UI: Gửi tin nhắn tức thì (0ms delay)
  const handleSendMessage = async (payload) => {
    if (!bookingId) return;

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const optimisticMessage = {
      _id: tempId,
      tempId,
      bookingId,
      senderId: {
        _id: currentUserId,
        name: 'Tôi',
      },
      type: payload.type || 'text',
      content: payload.content || '',
      mediaUrl: payload.mediaUrl || '',
      location: payload.location || null,
      status: 'sending',
      createdAt: new Date().toISOString(),
    };

    // Đẩy ngay vào state local (Optimistic UI)
    setMessages((prev) => [...prev, optimisticMessage]);
    setTimeout(() => scrollToBottom('smooth'), 20);

    try {
      let finalMediaUrl = payload.mediaUrl;

      // Nếu là ảnh Base64 hoặc File, upload qua API trước
      if (payload.type === 'image' && payload.mediaUrl && payload.mediaUrl.startsWith('data:image/')) {
        const uploadRes = await uploadChatImage(payload.mediaUrl);
        if (uploadRes && uploadRes.mediaUrl) {
          finalMediaUrl = uploadRes.mediaUrl;
        }
      }

      // Gọi API lưu vào DB và phát socket
      const res = await apiSendMessage(bookingId, {
        type: payload.type,
        content: payload.content,
        mediaUrl: finalMediaUrl,
        location: payload.location,
      });

      const savedMessage = res.data;

      // Cập nhật tin nhắn tạm bằng tin nhắn chính thức từ DB
      setMessages((prev) =>
        prev.map((m) => (m.tempId === tempId ? { ...savedMessage, tempId } : m))
      );

      if (onMessageSent) {
        onMessageSent(savedMessage);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      // Đánh dấu lỗi để người dùng có thể thử lại
      setMessages((prev) =>
        prev.map((m) =>
          m.tempId === tempId ? { ...m, status: 'error', errorMsg: err.message } : m
        )
      );
    }
  };

  // Thử lại tin nhắn bị lỗi
  const handleRetryMessage = (failedMsg) => {
    setMessages((prev) => prev.filter((m) => m.tempId !== failedMsg.tempId));
    handleSendMessage({
      type: failedMsg.type,
      content: failedMsg.content,
      mediaUrl: failedMsg.mediaUrl,
      location: failedMsg.location,
    });
  };

  const partner = bookingContext?.partner || {};
  const device = bookingContext?.device || {};
  const partnerBookings = bookingContext?.bookings || [];
  const otherBookings = partnerBookings.filter(
    (b) => String(b.bookingId) !== String(bookingId)
  );

  return (
    <div className="flex flex-col h-full bg-slate-50/50 relative overflow-hidden">
      {/* =========================================================================
          TẦNG 1: USER INFO HEADER
          ========================================================================= */}
      <div className="bg-white border-b border-slate-100 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 shadow-2xs z-10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {/* Nút quay lại trên mobile */}
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition cursor-pointer"
              title="Quay lại danh sách"
            >
              <ChevronLeft size={20} />
            </button>
          )}

          {/* Avatar đối tác kèm chấm xanh Online */}
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center font-bold text-slate-700 text-sm border border-slate-200">
              {partner.avatar ? (
                <img
                  src={partner.avatar}
                  alt={partner.name || 'Partner'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <span>{(partner.name || 'U').charAt(0).toUpperCase()}</span>
              )}
            </div>
            {/* Chấm xanh Online */}
            <span
              className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white shadow-2xs"
              title="Đang hoạt động"
            />
            {partner.isVerified && (
              <span
                title="Tài khoản đã xác minh"
                className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-2xs"
              >
                <ShieldCheck size={12} className="text-teal-600 fill-teal-100" />
              </span>
            )}
          </div>

          {/* Tên & vai trò */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-sm font-bold text-slate-800 truncate">
                {partner.name || 'Đối tác TechShare'}
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {partner.role === 'owner' ? 'Chủ thiết bị' : 'Người thuê'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {partnerTyping ? (
                <span className="text-teal-600 font-medium animate-pulse">
                  Đang soạn tin nhắn...
                </span>
              ) : (
                <span className="text-emerald-600 font-medium">Trực tuyến</span>
              )}
            </p>
          </div>
        </div>

        {/* Nút hành động nhanh bên phải: Xem chi tiết đơn & Xem thiết bị */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to={ROUTES.MY_BOOKINGS || '/my-bookings'}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition flex items-center gap-1.5 shadow-2xs"
            title="Xem chi tiết đơn hàng"
          >
            <FileText size={13} className="text-slate-500" />
            <span className="hidden sm:inline">Xem chi tiết đơn</span>
          </Link>
          {device._id && (
            <Link
              to={
                ROUTES.DEVICE_DETAIL_PATH
                  ? ROUTES.DEVICE_DETAIL_PATH(device._id)
                  : `/device/${device._id}`
              }
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 transition flex items-center gap-1.5 shadow-2xs"
              title="Xem trang thiết bị"
            >
              <ExternalLink size={13} className="text-teal-600" />
              <span className="hidden sm:inline">Xem thiết bị</span>
            </Link>
          )}
        </div>
      </div>

      {/* =========================================================================
          TẦNG 2: MINI BOOKING CONTEXT BAR
          ========================================================================= */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 text-xs select-none shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {/* Ảnh thumbnail thiết bị */}
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-white border border-slate-200 shrink-0 flex items-center justify-center">
            {device.image ? (
              <img
                src={device.image}
                alt={device.name || 'Thiết bị'}
                className="w-full h-full object-cover"
              />
            ) : (
              <Smartphone size={18} className="text-slate-400" />
            )}
          </div>

          {/* Tên & Ngày thuê & Tổng tiền */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-slate-800 text-xs truncate max-w-[180px] sm:max-w-xs md:max-w-sm">
                {device.name || 'Thiết bị công nghệ'}
              </p>
              <span className="text-[10px] text-slate-400 font-mono">
                #{bookingContext?.bookingCode || bookingId.substring(0, 8).toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar size={11} className="text-slate-400" />
                {formatDateRange(bookingContext?.startDate, bookingContext?.endDate)}
              </span>
              <span className="text-slate-300">•</span>
              <span className="font-semibold text-slate-700">
                Tổng: {formatPrice(bookingContext?.totalAmount || 0)}
              </span>
              {bookingContext?.deposit > 0 && (
                <span className="text-slate-500 hidden sm:inline">
                  (Cọc: {formatPrice(bookingContext.deposit)})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Badge trạng thái đơn hàng & Multi-Booking Switcher */}
        <div className="shrink-0 flex items-center gap-2 relative">
          <BookingStatusBadge status={bookingContext?.status} />

          {/* Multi-Booking Switcher Dropdown */}
          {otherBookings.length > 0 && (
            <div className="relative" ref={switcherDropdownRef}>
              <button
                type="button"
                onClick={() => setIsSwitcherOpen((prev) => !prev)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition cursor-pointer shadow-2xs"
                title="Chuyển sang đơn thuê khác giữa bạn và đối tác này"
              >
                <span>Đơn thuê khác ({otherBookings.length})</span>
                <ChevronDown
                  size={13}
                  className={`transition-transform duration-200 ${
                    isSwitcherOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {isSwitcherOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-72 sm:w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-1.5 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2.5 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Đơn thuê khác với đối tác</span>
                    <span className="text-teal-600 font-semibold">{otherBookings.length} đơn</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1 pt-1 divide-y divide-slate-50">
                    {otherBookings.map((b) => (
                      <button
                        key={b.bookingId}
                        type="button"
                        onClick={() => {
                          setIsSwitcherOpen(false);
                          navigate(getMessagesPath(b.bookingId));
                        }}
                        className="w-full text-left p-2 rounded-lg hover:bg-teal-50/70 border border-transparent hover:border-teal-200 transition flex items-start gap-2.5 cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center mt-0.5">
                          {b.device?.image ? (
                            <img
                              src={b.device.image}
                              alt={b.device.name || 'Thiết bị'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Smartphone size={14} className="text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="text-xs font-bold text-slate-800 truncate group-hover:text-teal-700">
                              {b.device?.name || 'Thiết bị'}
                            </span>
                            <BookingStatusBadge status={b.status} />
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                            <span className="font-mono text-slate-400">#{b.bookingCode}</span>
                            <span>•</span>
                            <span className="font-semibold text-slate-700">
                              {formatPrice(b.totalAmount || 0)}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                            <Calendar size={10} />
                            <span>{formatDateRange(b.startDate, b.endDate)}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          KHUNG HIỂN THỊ TIN NHẮN (MESSAGE FEED & EMPTY STATE)
          ========================================================================= */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-slate-50/50">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 space-y-2">
            <RotateCw size={20} className="animate-spin text-teal-600" />
            <span className="text-xs">Đang tải tin nhắn...</span>
          </div>
        ) : errorMsg ? (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center text-xs text-rose-700 flex flex-col items-center gap-2">
            <AlertCircle size={20} className="text-rose-500" />
            <p>{errorMsg}</p>
            <button
              type="button"
              onClick={() => fetchHistoryAndMarkRead(bookingId)}
              className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition"
            >
              Thử lại
            </button>
          </div>
        ) : messages.length === 0 ? (
          // Empty State Card
          <div className="flex flex-col items-center justify-center h-full text-center p-6 max-w-md mx-auto my-auto animate-in fade-in zoom-in-95 duration-200 select-none">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center mb-3 shadow-xs">
              <ShieldCheck size={28} />
            </div>
            <h4 className="text-sm font-bold text-slate-800">
              Bắt đầu cuộc trò chuyện với {partner.name || 'đối tác'} về đơn thuê này
            </h4>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Hãy xác nhận thời gian, địa điểm bàn giao máy hoặc hỏi thêm thông tin phụ kiện kèm theo.
            </p>
            <div className="mt-4 p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-left text-[11px] text-amber-900 flex items-start gap-2 shadow-2xs">
              <span className="text-sm shrink-0">💡</span>
              <p className="leading-relaxed">
                <strong>Mẹo an toàn:</strong> Hãy trao đổi và gửi ảnh chụp hiện trạng thiết bị trực tiếp trên TechShare để được bảo vệ quyền lợi cọc Escrow.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const senderIdStr = (msg.senderId?._id || msg.senderId)?.toString();
            const isOwn = senderIdStr === currentUserId;
            const isError = msg.status === 'error';
            const isSending = msg.status === 'sending';
            const isRead = msg.status === 'read';

            return (
              <div
                key={msg._id || msg.tempId || index}
                className={`flex w-full group ${
                  isOwn ? 'justify-end items-end' : 'justify-start items-end gap-2.5'
                }`}
              >
                {/* Avatar đối tác ở cạnh dưới cùng bên trái bubble chat */}
                {!isOwn && (
                  <div
                    className="w-8 h-8 rounded-full bg-slate-200 border border-slate-200 overflow-hidden shrink-0 shadow-2xs flex items-center justify-center font-bold text-xs text-slate-600 mb-0.5 select-none"
                    title={partner.name || 'Đối tác'}
                  >
                    {partner.avatar ? (
                      <img
                        src={partner.avatar}
                        alt={partner.name || 'Partner'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <span>{(partner.name || 'U').charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                )}

                {/* Bong bóng chat wrapper */}
                <div
                  className={`flex flex-col ${
                    isOwn ? 'items-end' : 'items-start'
                  } max-w-[78%] sm:max-w-[65%]`}
                >
                  <div
                    className={`w-full rounded-2xl p-3 shadow-2xs transition-all relative ${
                      isOwn
                        ? 'bg-teal-600 text-white rounded-br-xs'
                        : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs'
                    } ${isError ? 'border-2 border-rose-500 bg-rose-50 text-rose-900' : ''}`}
                  >
                    {/* TYPE: Text / Quick Template */}
                    {(msg.type === 'text' || msg.type === 'quick_template') && (
                      <p className="text-xs sm:text-[13px] whitespace-pre-wrap break-words leading-relaxed">
                        {msg.content}
                      </p>
                    )}

                    {/* TYPE: Image */}
                    {msg.type === 'image' && (
                      <div className="space-y-1.5">
                        <div
                          className="rounded-xl overflow-hidden bg-slate-900/10 cursor-pointer relative group/img max-h-64"
                          onClick={() => setLightboxImage(msg.mediaUrl)}
                        >
                          <img
                            src={msg.mediaUrl}
                            alt="Ảnh đính kèm"
                            className="w-full h-auto max-h-64 object-cover rounded-xl transition duration-200 group-hover/img:scale-[1.02]"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center text-white">
                            <Eye size={20} />
                          </div>
                        </div>
                        {msg.content && (
                          <p className="text-xs sm:text-[13px] whitespace-pre-wrap break-words leading-relaxed pt-1">
                            {msg.content}
                          </p>
                        )}
                      </div>
                    )}

                    {/* TYPE: Location */}
                    {msg.type === 'location' && msg.location && (
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <MapPin
                            size={18}
                            className={`shrink-0 mt-0.5 ${
                              isOwn ? 'text-teal-200' : 'text-teal-600'
                            }`}
                          />
                          <div>
                            <p className="text-xs font-bold leading-tight">
                              {msg.location.address || 'Vị trí được chia sẻ'}
                            </p>
                            <p
                              className={`text-[10px] font-mono mt-0.5 ${
                                isOwn ? 'text-teal-100' : 'text-slate-500'
                              }`}
                            >
                              Tọa độ: {msg.location.latitude?.toFixed(5)},{' '}
                              {msg.location.longitude?.toFixed(5)}
                            </p>
                          </div>
                        </div>

                        <a
                          href={`https://www.google.com/maps?q=${msg.location.latitude},${msg.location.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            isOwn
                              ? 'bg-white text-teal-800 hover:bg-teal-50'
                              : 'bg-teal-600 text-white hover:bg-teal-700'
                          }`}
                        >
                          <span>Mở trên Google Maps</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    )}

                    {/* Footer chân bong bóng: Giờ & Trạng thái gửi */}
                    <div
                      className={`flex items-center justify-end gap-1 mt-1 text-[10px] select-none ${
                        isOwn ? 'text-teal-100' : 'text-slate-400'
                      }`}
                    >
                      <span>{formatMessageTime(msg.createdAt)}</span>

                      {isOwn && (
                        <span className="inline-flex items-center">
                          {isSending ? (
                            <Clock size={11} className="animate-spin text-teal-200" title="Đang gửi..." />
                          ) : isError ? (
                            <AlertCircle size={11} className="text-rose-500" title="Lỗi gửi tin" />
                          ) : isRead ? (
                            <CheckCheck size={13} className="text-white" title="Đã xem" />
                          ) : (
                            <Check size={12} title="Đã gửi" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Nút Thử lại nếu tin nhắn bị lỗi */}
                  {isError && (
                    <div className="flex items-center gap-2 mt-1 mr-1">
                      <span className="text-[11px] text-rose-600 font-medium">Không thể gửi</span>
                      <button
                        type="button"
                        onClick={() => handleRetryMessage(msg)}
                        className="text-[11px] text-teal-600 hover:underline font-bold cursor-pointer"
                      >
                        Thử lại
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator bubble */}
        {partnerTyping && (
          <div className="flex items-end gap-2.5 justify-start">
            <div
              className="w-8 h-8 rounded-full bg-slate-200 border border-slate-200 overflow-hidden shrink-0 shadow-2xs flex items-center justify-center font-bold text-xs text-slate-600 mb-0.5 select-none"
              title={partner.name || 'Đối tác'}
            >
              {partner.avatar ? (
                <img
                  src={partner.avatar}
                  alt={partner.name || 'Partner'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <span>{(partner.name || 'U').charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-xs px-3 py-2 shadow-2xs flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* =========================================================================
          THANH GỢI Ý TIN NHẮN MẪU NHANH
          ========================================================================= */}
      <QuickMessageBar
        disabled={loading}
        onSelectTemplate={(templateText) => {
          handleSendMessage({
            type: 'quick_template',
            content: templateText,
          });
        }}
      />

      {/* =========================================================================
          THANH NHẬP LIỆU ĐA NĂNG
          ========================================================================= */}
      <ChatInputBox
        bookingId={bookingId}
        onSendMessage={handleSendMessage}
        disabled={loading}
      />

      {/* Lightbox hiển thị ảnh phóng to */}
      {lightboxImage && (
        <ImageLightboxModal
          imageUrl={lightboxImage}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </div>
  );
};

export default ChatDetailView;
