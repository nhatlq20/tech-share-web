import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { getUnreadChatCount } from '../services/chatService.js';
import { connectSocket } from '../services/socketService.js';

const ChatContext = createContext({
  unreadMessagesCount: 0,
  refreshUnreadCount: () => {},
  setUnreadMessagesCount: () => {},
});

export const ChatProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  const locationRef = useRef(location.pathname);
  locationRef.current = location.pathname;

  const currentUserId = (user?._id || user?.id)?.toString();

  // Tải số lượng tin nhắn chưa đọc từ Backend
  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated || !currentUserId) {
      setUnreadMessagesCount(0);
      return;
    }
    try {
      const res = await getUnreadChatCount();
      if (res && typeof res.count === 'number') {
        setUnreadMessagesCount(res.count);
      }
    } catch (err) {
      console.warn('⚠️ Failed to fetch unread chat count:', err.message);
    }
  }, [isAuthenticated, currentUserId]);

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  // Lắng nghe sự kiện Real-time qua Socket.IO
  useEffect(() => {
    if (!isAuthenticated || !currentUserId) return;

    const socket = connectSocket();
    if (!socket) return;

    // 1. Nhận cập nhật số đếm chính xác từ server
    const handleUnreadCountUpdate = (payload) => {
      if (payload && typeof payload.count === 'number') {
        setUnreadMessagesCount(payload.count);
      }
    };

    // 2. Nhận tin nhắn mới: nếu không ở đúng phòng chat, tăng +1 tức thì
    const handleNewMessage = (msg) => {
      if (!msg) return;
      const senderIdStr = (msg.senderId?._id || msg.senderId)?.toString();
      if (senderIdStr === currentUserId) return; // Bỏ qua tin nhắn do chính mình gửi

      const msgBookingId = (msg.bookingId?._id || msg.bookingId)?.toString();
      const isViewingCurrentChat = locationRef.current.includes(`/messages/${msgBookingId}`);

      if (!isViewingCurrentChat) {
        setUnreadMessagesCount((prev) => prev + 1);
      }
    };

    // 3. Khi cuộc hội thoại được cập nhật hoặc đã đọc
    const handleConversationsUpdated = () => {
      refreshUnreadCount();
    };

    const handleMessagesRead = (payload) => {
      if (payload && payload.readBy === currentUserId) {
        refreshUnreadCount();
      }
    };

    socket.on('unread_messages_count', handleUnreadCountUpdate);
    socket.on('new_message', handleNewMessage);
    socket.on('conversations_updated', handleConversationsUpdated);
    socket.on('messages_read', handleMessagesRead);

    return () => {
      socket.off('unread_messages_count', handleUnreadCountUpdate);
      socket.off('new_message', handleNewMessage);
      socket.off('conversations_updated', handleConversationsUpdated);
      socket.off('messages_read', handleMessagesRead);
    };
  }, [isAuthenticated, currentUserId, refreshUnreadCount]);

  return (
    <ChatContext.Provider
      value={{
        unreadMessagesCount,
        refreshUnreadCount,
        setUnreadMessagesCount,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export default ChatContext;

