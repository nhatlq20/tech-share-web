import React, { useMemo } from 'react';
import { Search, X, MessageSquareOff } from 'lucide-react';

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

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m`;
  if (diffHours < 24) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' });
};

export const ConversationList = ({
  conversations = [],
  selectedBookingId,
  onSelectConversation,
  isLoading = false,
  searchQuery = '',
  onSearchChange,
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
            <h2 className="text-base font-bold text-slate-800">Messages</h2>
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
            placeholder="Search conversations"
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
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {isLoading ? (
          // Skeleton loading
          <div aria-hidden="true">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-2.5 px-2.5 py-2 motion-safe:animate-pulse">
                <div className="h-10 w-10 shrink-0 rounded-full bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-2/3 rounded bg-slate-200" />
                  <div className="h-3 w-1/2 rounded bg-slate-100" />
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
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
              {searchQuery
                ? 'Try another search'
                : 'Open a device and contact its owner to start a conversation.'}
            </p>
          </div>
        ) : (
          filteredConversations.map((item) => {
            const isSelected =
              selectedBookingId === item.bookingId ||
              item.bookings?.some((b) => String(b.bookingId) === String(selectedBookingId));
            const partner = item.partner || {};
            const displayName = partner.name || 'Profile unavailable';
            const lastMsg = item.lastMessage;
            const timestamp = formatConversationTime(lastMsg?.createdAt);
            const unread = Number(item.unreadCount) || 0;

            // Preview nội dung tin nhắn cuối
            let lastMessagePreview = 'No messages yet';
            if (lastMsg) {
              if (lastMsg.type === 'image') {
                lastMessagePreview = 'Image';
              } else if (lastMsg.type === 'location') {
                lastMessagePreview = 'Shared location';
              } else if (lastMsg.content) {
                lastMessagePreview = lastMsg.content;
              }
            }

            return (
              <button
                key={item.bookingId}
                type="button"
                aria-current={isSelected ? 'true' : undefined}
                onClick={() => {
                  const currentInGroup = item.bookings?.find(
                    (b) => String(b.bookingId) === String(selectedBookingId)
                  );
                  onSelectConversation(currentInGroup ? currentInGroup.bookingId : item.bookingId);
                }}
                className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-700 ${isSelected
                    ? 'bg-brand-100'
                    : 'hover:bg-slate-50'
                  }`}
              >
                <div aria-hidden="true" className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-sm font-semibold text-brand-900">
                  <span>{(partner.name || 'U').charAt(0).toUpperCase()}</span>
                  {partner.avatar && (
                    <img
                      key={partner.avatar}
                      src={partner.avatar}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                      onError={(event) => { event.currentTarget.hidden = true; }}
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={`truncate text-sm leading-5 ${
                        unread > 0 ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'
                      }`}
                    >
                      {displayName}
                    </span>
                    {timestamp && (
                      <time dateTime={lastMsg.createdAt} className="shrink-0 whitespace-nowrap text-[11px] text-slate-600">
                        {timestamp}
                      </time>
                    )}
                  </div>

                  <div className="flex min-h-5 items-center justify-between gap-2">
                    <span className={`truncate text-xs leading-5 ${unread > 0 ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                      {lastMessagePreview}
                    </span>
                    {unread > 0 && (
                      <span className="inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-brand-800 px-1.5 text-[10px] font-bold text-white">
                        <span aria-hidden="true">{unread > 99 ? '99+' : unread}</span>
                        <span className="sr-only">{unread} unread {unread === 1 ? 'message' : 'messages'}</span>
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

