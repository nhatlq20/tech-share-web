import React, { useMemo } from 'react';
import {
  Search,
  X,
  Check,
  CheckCheck,
  ShieldCheck,
  Smartphone,
  MessageSquareOff,
} from 'lucide-react';

/**
 * Format timestamp ngắn gọn hiển thị ở danh sách
 */
const formatConversationTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Vừa xong';
  if (diffMinutes < 60) return `${diffMinutes}m`;
  if (diffHours < 24) {
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Hôm qua';
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

/**
 * Badge trạng thái đơn thuê
 */
const BookingStatusBadge = ({ status }) => {
  const config = {
    pending: { label: 'Chờ duyệt', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
    approved: { label: 'Đã duyệt', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
    active: { label: 'Đang thuê', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    completed: { label: 'Hoàn tất', bg: 'bg-slate-100 text-slate-700 border-slate-200' },
    cancelled: { label: 'Đã hủy', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
    rejected: { label: 'Từ chối', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
  }[status] || { label: status, bg: 'bg-slate-50 text-slate-600 border-slate-200' };

  return (
    <span
      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border leading-none ${config.bg}`}
    >
      {config.label}
    </span>
  );
};

export const ConversationList = ({
  conversations = [],
  selectedBookingId,
  onSelectConversation,
  isLoading = false,
  searchQuery = '',
  onSearchChange,
  currentUserId,
}) => {
  // Lọc theo từ khóa tìm kiếm (tên đối phương, tên thiết bị, mã đơn)
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase().trim();
    return conversations.filter((c) => {
      const partnerName = (c.partner?.name || '').toLowerCase();
      const deviceName = (c.device?.name || '').toLowerCase();
      const bookingCode = (c.bookingCode || '').toLowerCase();
      const lastContent = (c.lastMessage?.content || '').toLowerCase();
      const anyBookingMatch = c.bookings?.some((b) => {
        const bDev = (b.device?.name || '').toLowerCase();
        const bCode = (b.bookingCode || '').toLowerCase();
        return bDev.includes(q) || bCode.includes(q);
      });
      return (
        partnerName.includes(q) ||
        deviceName.includes(q) ||
        bookingCode.includes(q) ||
        lastContent.includes(q) ||
        Boolean(anyBookingMatch)
      );
    });
  }, [conversations, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-white select-none">
      {/* 1. Header & Search Bar */}
      <div className="p-3.5 border-b border-slate-100 flex flex-col gap-2.5 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-800">Tin nhắn giao dịch</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
              {conversations.length}
            </span>
          </div>
        </div>

        {/* Ô tìm kiếm */}
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            placeholder="Tìm theo tên máy hoặc đối phương..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all text-slate-800 placeholder-slate-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange && onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Conversations Scrollable List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {isLoading ? (
          // Skeleton loading
          <div className="p-3 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 animate-pulse rounded-xl">
                <div className="w-12 h-12 rounded-full bg-slate-200 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-slate-200 rounded w-2/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                  <div className="h-2.5 bg-slate-100 rounded w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center h-64 p-6 text-center text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3 text-slate-400">
              <MessageSquareOff size={22} />
            </div>
            <p className="text-xs font-semibold text-slate-600">
              {searchQuery ? 'Không tìm thấy cuộc trò chuyện nào' : 'Chưa có cuộc trò chuyện nào'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
              {searchQuery
                ? 'Hãy thử tìm bằng từ khóa khác'
                : 'Khi bạn đặt thuê hoặc có khách thuê thiết bị, hội thoại sẽ hiển thị ở đây.'}
            </p>
          </div>
        ) : (
          filteredConversations.map((item) => {
            const isSelected =
              selectedBookingId === item.bookingId ||
              item.bookings?.some((b) => String(b.bookingId) === String(selectedBookingId));
            const partner = item.partner || {};
            const device = item.device || {};
            const lastMsg = item.lastMessage;
            const isOwnLastMsg = lastMsg && currentUserId && (lastMsg.senderId === currentUserId || lastMsg.senderId?._id === currentUserId);
            const unread = Number(item.unreadCount) || 0;
            const multiBookingsCount = item.bookings?.length || 1;

            // Preview nội dung tin nhắn cuối
            let lastMessagePreview = 'Chưa có tin nhắn nào';
            if (lastMsg) {
              if (lastMsg.type === 'image') {
                lastMessagePreview = '📷 [Hình ảnh]';
              } else if (lastMsg.type === 'location') {
                lastMessagePreview = '📍 [Vị trí]';
              } else if (lastMsg.content) {
                lastMessagePreview = lastMsg.content;
              }
            }

            return (
              <button
                key={item.bookingId}
                type="button"
                onClick={() => {
                  const currentInGroup = item.bookings?.find(
                    (b) => String(b.bookingId) === String(selectedBookingId)
                  );
                  onSelectConversation(currentInGroup ? currentInGroup.bookingId : item.bookingId);
                }}
                className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors relative cursor-pointer ${isSelected
                    ? 'bg-teal-50/70 border-l-4 border-teal-600'
                    : 'hover:bg-slate-50/90 border-l-4 border-transparent'
                  }`}
              >
                {/* Avatar with Verified checkmark & Online Dot */}
                <div className="relative flex-shrink-0">
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-200 border border-slate-200 flex items-center justify-center font-bold text-slate-600 text-sm">
                    {partner.avatar ? (
                      <img
                        src={partner.avatar}
                        alt={partner.name || 'User'}
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
                    className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-2xs"
                    title="Đang trực tuyến"
                  />
                  {partner.isVerified && (
                    <span
                      title="Tài khoản đã xác minh"
                      className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-xs"
                    >
                      <ShieldCheck size={13} className="text-teal-600 fill-teal-100" />
                    </span>
                  )}
                </div>

                {/* Main conversation info */}
                <div className="flex-1 min-w-0">
                  {/* Row 1: Partner Name + Time */}
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span
                      className={`text-xs truncate ${
                        unread > 0 ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'
                      }`}
                    >
                      {partner.name || 'Người dùng TechShare'}
                    </span>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0">
                      {formatConversationTime(item.updatedAt || lastMsg?.createdAt)}
                    </span>
                  </div>

                  {/* Row 2: Device name (màu teal đậm) + Booking status + Multi-booking badge */}
                  <div className="flex items-center gap-1.5 mb-1.5 text-[11px] flex-wrap">
                    <Smartphone size={12} className="text-teal-600 flex-shrink-0" />
                    <span className="truncate font-semibold text-teal-700 text-xs max-w-[130px]">
                      {device.name || 'Thiết bị'}
                    </span>
                    <span className="text-slate-300">•</span>
                    <BookingStatusBadge status={item.status} />
                    {multiBookingsCount > 1 && (
                      <span
                        className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 shrink-0"
                        title={`${multiBookingsCount} đơn thuê với người này`}
                      >
                        {multiBookingsCount} đơn
                      </span>
                    )}
                  </div>

                  {/* Row 3: Last Message snippet + Status/Unread Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 min-w-0 text-xs">
                      {isOwnLastMsg && (
                        <span className="flex-shrink-0 text-slate-400">
                          {lastMsg.status === 'read' ? (
                            <CheckCheck size={13} className="text-teal-500" />
                          ) : (
                            <Check size={13} />
                          )}
                        </span>
                      )}
                      <span
                        className={`truncate ${unread > 0
                            ? 'font-bold text-slate-900'
                            : 'text-slate-500 font-normal'
                          }`}
                      >
                        {lastMessagePreview}
                      </span>
                    </div>

                    {unread > 0 && (
                      <span className="flex-shrink-0 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center shadow-xs">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ConversationList;

