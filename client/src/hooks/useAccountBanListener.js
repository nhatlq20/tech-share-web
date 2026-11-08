import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { connectSocket, getSocket } from '../services/socketService.js';

/**
 * Hook lắng nghe sự kiện tài khoản bị khóa (Real-time Socket.IO & API 403 Interceptor)
 * Khi nhận được thông báo, kích hoạt hiển thị Modal và thực hiện tự động đăng xuất
 */
export const useAccountBanListener = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [isBannedModalOpen, setIsBannedModalOpen] = useState(false);
  const [banReason, setBanReason] = useState('');

  const triggerBanAlert = useCallback((reason) => {
    const finalReason = reason || 'Vi phạm chính sách và quy định nền tảng TechShare.';
    setBanReason(finalReason);
    setIsBannedModalOpen(true);
  }, []);

  const handleConfirmLogout = useCallback(() => {
    setIsBannedModalOpen(false);
    logout();
  }, [logout]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // 1. Lắng nghe qua Socket.IO thời gian thực
    const socket = connectSocket() || getSocket();

    const handleSocketBan = (data) => {
      console.warn('🚨 [Socket.IO] Nhận tín hiệu tài khoản bị khóa:', data);
      const reason = data?.banReason || data?.reason || data?.message;
      triggerBanAlert(reason);
    };

    if (socket) {
      socket.on('account_banned', handleSocketBan);
      socket.on('force_logout', handleSocketBan);
    }

    // 2. Lắng nghe qua custom DOM Event từ HTTP API Client (Khi API trả về mã 403 Banned)
    const handleCustomEvent = (event) => {
      console.warn('🚨 [API Client] Phát hiện tài khoản bị khóa từ phản hồi máy chủ:', event.detail);
      const reason = event.detail?.reason || event.detail?.message;
      triggerBanAlert(reason);
    };

    window.addEventListener('techshare:account_banned', handleCustomEvent);

    return () => {
      if (socket) {
        socket.off('account_banned', handleSocketBan);
        socket.off('force_logout', handleSocketBan);
      }
      window.removeEventListener('techshare:account_banned', handleCustomEvent);
    };
  }, [isAuthenticated, user, triggerBanAlert]);

  return {
    isBannedModalOpen,
    banReason,
    handleConfirmLogout,
  };
};

export default useAccountBanListener;

