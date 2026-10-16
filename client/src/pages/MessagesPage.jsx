import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useChat } from '../context/ChatContext.jsx';
import { ROUTES } from '../routes/routes.js';
import { connectSocket } from '../services/socketService.js';
import { getConversations } from '../services/chatService.js';
import { ConversationList } from '../components/chat/ConversationList.jsx';
import { ChatDetailView } from '../components/chat/ChatDetailView.jsx';

export const MessagesPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { refreshUnreadCount } = useChat();
  const currentUserId = (user?._id || user?.id)?.toString();

  const isOwnerContext = location.pathname.startsWith('/owner');
  const getMessagesPath = (bId) =>
    isOwnerContext ? ROUTES.OWNER_MESSAGES_PATH(bId) : ROUTES.MESSAGES_PATH(bId);
  const getBackPath = () =>
    isOwnerContext ? ROUTES.OWNER_MESSAGES : ROUTES.MESSAGES;

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Tải danh sách hội thoại
  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getConversations();
      const list = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.conversations)
        ? res.data.conversations
        : Array.isArray(res?.conversations)
        ? res.conversations
        : [];
      setConversations(list);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // 2. Kết nối Socket & lắng nghe cập nhật realtime cho danh sách hội thoại
  useEffect(() => {
    const socket = connectSocket();
    if (!socket) return;

    // Lắng nghe tin nhắn mới để cập nhật danh sách hội thoại ngay lập tức
    const handleNewMessage = (msg) => {
      if (!msg) return;
      const bId = (msg.bookingId?._id || msg.bookingId)?.toString();

      setConversations((prev) => {
        const index = prev.findIndex(
          (c) => c.bookingId === bId || c.bookings?.some((b) => String(b.bookingId) === String(bId))
        );
        if (index === -1) {
          // Nếu chưa có trong danh sách (booking mới có tin), tải lại danh sách
          loadConversations();
          return prev;
        }

        const existing = prev[index];
        const isCurrentlyViewing = bookingId === bId;
        const senderIdStr = (msg.senderId?._id || msg.senderId)?.toString();
        const isFromPartner = senderIdStr !== currentUserId;

        const updatedItem = {
          ...existing,
          lastMessage: {
            _id: msg._id,
            content: msg.content,
            type: msg.type,
            senderId: senderIdStr,
            status: msg.status,
            createdAt: msg.createdAt,
          },
          updatedAt: msg.createdAt,
          unreadCount:
            isFromPartner && !isCurrentlyViewing
              ? (existing.unreadCount || 0) + 1
              : isCurrentlyViewing
                ? 0
                : existing.unreadCount,
        };

        // Đẩy hội thoại vừa có tin lên đầu danh sách
        const nextList = [...prev];
        nextList.splice(index, 1);
        nextList.unshift(updatedItem);
        return nextList;
      });
    };

    const handleConversationsUpdated = () => {
      loadConversations();
    };

    socket.on('new_message', handleNewMessage);
    socket.on('conversations_updated', handleConversationsUpdated);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('conversations_updated', handleConversationsUpdated);
    };
  }, [bookingId, currentUserId, loadConversations]);

  // Khi chọn một hội thoại
  const handleSelectConversation = (bId) => {
    // Đặt unreadCount của hội thoại đó về 0 trên giao diện
    setConversations((prev) =>
      prev.map((c) =>
        c.bookingId === bId || c.bookings?.some((b) => String(b.bookingId) === String(bId))
          ? { ...c, unreadCount: 0 }
          : c
      )
    );
    navigate(getMessagesPath(bId));
    if (refreshUnreadCount) {
      setTimeout(refreshUnreadCount, 400);
    }
  };

  // Tìm thông tin hội thoại đang active
  const activeConversation = conversations.find(
    (c) => c.bookingId === bookingId || c.bookings?.some((b) => String(b.bookingId) === String(bookingId))
  );

  return (
    <div
      className={`flex gap-4 overflow-hidden select-none ${
        isOwnerContext
          ? 'h-full w-full p-2 sm:p-3'
          : 'h-[calc(100vh-80px)] max-w-7xl mx-auto px-4 py-4'
      }`}
    >
      {/* CỘT TRÁI: Sidebar Danh sách hội thoại */}
      <div
        className={`w-full md:w-80 lg:w-96 shrink-0 h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden ${
          bookingId ? 'hidden md:flex' : 'flex'
        }`}
      >
        <ConversationList
          conversations={conversations}
          selectedBookingId={bookingId}
          onSelectConversation={handleSelectConversation}
          isLoading={loading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          currentUserId={currentUserId}
        />
      </div>

      {/* CỘT PHẢI: Khung Chat chính */}
      <div
        className={`flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-full ${
          !bookingId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {bookingId ? (
          <ChatDetailView
            key={bookingId}
            bookingId={bookingId}
            conversation={activeConversation}
            currentUserId={currentUserId}
            onBack={() => navigate(getBackPath())}
            onMessageSent={(savedMsg) => {
              // Đẩy hội thoại lên đầu
              setConversations((prev) => {
                const idx = prev.findIndex(
                  (c) =>
                    c.bookingId === bookingId ||
                    c.bookings?.some((b) => String(b.bookingId) === String(bookingId))
                );
                if (idx === -1) return prev;
                const item = {
                  ...prev[idx],
                  lastMessage: savedMsg,
                  updatedAt: savedMsg.createdAt,
                };
                const nextList = [...prev];
                nextList.splice(idx, 1);
                nextList.unshift(item);
                return nextList;
              });
            }}
          />
        ) : (
          // Placeholder khi chưa chọn cuộc hội thoại nào
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 select-none">
            <div className="w-20 h-20 rounded-3xl bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center mb-4 shadow-sm">
              <MessageSquare size={36} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">
              Tin nhắn giao dịch thiết bị
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1.5 leading-relaxed">
              Chọn một cuộc trò chuyện từ danh sách bên trái để trao đổi thông tin giao nhận, thời gian thuê và kiểm tra thiết bị với đối tác.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-600 bg-white border border-slate-200 px-4 py-2.5 rounded-full shadow-2xs">
              <ShieldCheck size={14} className="text-teal-600" />
              <span>Mọi giao dịch & tin nhắn đều được bảo vệ bởi TechShare Escrow</span>
              <Sparkles size={12} className="text-amber-500" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;

