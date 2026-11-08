import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Modal thông báo tài khoản bị khóa đơn giản, gọn gàng
 * Hiển thị khi tài khoản bị khóa trong phiên đăng nhập và đăng xuất người dùng
 */
export const AccountBannedModal = ({ isOpen, reason, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          maxWidth: '380px',
          width: '100%',
          padding: '24px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
          textAlign: 'center',
        }}
      >
        {/* Biểu tượng cảnh báo đơn giản */}
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: '#FEE2E2',
            color: '#DC2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
          }}
        >
          <AlertCircle size={24} />
        </div>

        {/* Tiêu đề */}
        <h3
          style={{
            fontSize: '17px',
            fontWeight: 700,
            color: '#0F172A',
            margin: '0 0 8px',
          }}
        >
          Tài Khoản Đã Bị Khóa
        </h3>

        {/* Nội dung thông báo */}
        <p
          style={{
            fontSize: '13.5px',
            color: '#475569',
            margin: '0 0 14px',
            lineHeight: 1.5,
          }}
        >
          Tài khoản của bạn đã bị khóa bởi quản trị viên.
        </p>

        {/* Lý do khóa (nếu có) */}
        {reason && (
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '13px',
              color: '#334155',
              marginBottom: '18px',
              textAlign: 'left',
              wordBreak: 'break-word',
            }}
          >
            <strong style={{ color: '#DC2626' }}>Lý do:</strong> {reason}
          </div>
        )}

        {/* Nút xác nhận đăng xuất */}
        <button
          type="button"
          onClick={onConfirm}
          style={{
            width: '100%',
            backgroundColor: '#DC2626',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Đăng xuất ngay
        </button>
      </div>
    </div>
  );
};

export default AccountBannedModal;
