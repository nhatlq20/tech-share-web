import React from 'react';
import { useAccountBanListener } from '../../hooks/useAccountBanListener.js';
import { AccountBannedModal } from './AccountBannedModal.jsx';

/**
 * Component giám sát trạng thái khóa tài khoản toàn cục (JSX)
 * Tự động gắn vào App.jsx để bảo vệ mọi trang người dùng
 */
export const AccountBanWatcher = () => {
  const { isBannedModalOpen, banReason, handleConfirmLogout } = useAccountBanListener();

  return (
    <AccountBannedModal
      isOpen={isBannedModalOpen}
      reason={banReason}
      onConfirm={handleConfirmLogout}
    />
  );
};

export default AccountBanWatcher;

