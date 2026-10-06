import React, { useState } from 'react';
import {
  Search,
  AlertTriangle,
  Wallet,
  X,
} from 'lucide-react';
import { UserItem } from '../../types/admin';
import { COLORS, PRIMARY } from '../../constants/colors';
import { STRINGS } from '../../constants';
import { AdminUsersTable } from './AdminUsersTable';
import './AdminWorkspace.css';

interface AdminUsersTabProps {
  users: UserItem[];
  onToggleStatus: (userId: string, currentStatus: boolean) => Promise<void>;
  isLoading?: boolean;
}

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  users,
  onToggleStatus,
  isLoading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUserForWallet, setSelectedUserForWallet] = useState<UserItem | null>(null);
  const [confirmLockUser, setConfirmLockUser] = useState<UserItem | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phone.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && u.isActive) ||
      (statusFilter === 'locked' && !u.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(num || 0);
  };

  const handleStatusChange = async (user: UserItem) => {
    try {
      setActionLoadingId(user._id);
      await onToggleStatus(user._id, user.isActive);
      setConfirmLockUser(null);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header & Search Filters */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: COLORS.neutral[900], letterSpacing: '-0.02em', margin: 0 }}>
            {STRINGS.admin.users.title}
          </h1>
        </div>

        {/* Filter Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div className="admin-search-pill" style={{ width: '280px' }}>
            <Search size={16} style={{ color: PRIMARY }} />
            <input
              type="text"
              placeholder={STRINGS.admin.users.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: '9999px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              fontSize: '13px',
              color: '#334155',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="all">{STRINGS.admin.users.roles.all}</option>
            <option value="admin">{STRINGS.admin.users.roles.admin}</option>
            <option value="owner">{STRINGS.admin.users.roles.owner}</option>
            <option value="renter">{STRINGS.admin.users.roles.renter}</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: '9999px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              fontSize: '13px',
              color: '#334155',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="all">Mọi trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="locked">Đã bị khóa</option>
          </select>
        </div>
      </div>

      {/* 2. Data Table (Tách thành AdminUsersTable chống ép chữ, layout rộng rãi) */}
      <AdminUsersTable
        users={filteredUsers}
        loading={isLoading}
        actionLoadingId={actionLoadingId}
        onViewDetails={(user) => setSelectedUserForWallet(user)}
        onToggleStatus={(user) => setConfirmLockUser(user)}
      />

      {/* MODAL 1: Xác nhận Khóa / Mở khóa tài khoản */}
      {confirmLockUser && (
        <div className="admin-modal-overlay" onClick={() => setConfirmLockUser(null)}>
          <div className="admin-modal-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={20} style={{ color: confirmLockUser.isActive ? '#DC2626' : '#16A34A' }} />
                <h3 className="admin-modal-title">
                  {confirmLockUser.isActive ? 'Xác nhận khóa tài khoản' : 'Xác nhận mở khóa tài khoản'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmLockUser(null)}
                style={{ cursor: 'pointer', color: '#94A3B8', border: 'none', background: 'none' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6 }}>
              Bạn có chắc chắn muốn {confirmLockUser.isActive ? 'khóa tài khoản' : 'mở khóa tài khoản'} của{' '}
              <strong>{confirmLockUser.name}</strong> ({confirmLockUser.email})?{' '}
              {confirmLockUser.isActive && 'Người dùng này sẽ không thể đăng nhập, đăng tin hoặc thực hiện giao dịch thuê máy trên TechShare.'}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button
                type="button"
                className="admin-btn admin-btn-outline"
                onClick={() => setConfirmLockUser(null)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className={`admin-btn ${confirmLockUser.isActive ? 'admin-btn-danger' : 'admin-btn-success'}`}
                onClick={() => handleStatusChange(confirmLockUser)}
              >
                {confirmLockUser.isActive ? 'Đồng ý Khóa' : 'Đồng ý Mở khóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Xem chi tiết ví Escrow & Điểm tín nhiệm */}
      {selectedUserForWallet && (
        <div className="admin-modal-overlay" onClick={() => setSelectedUserForWallet(null)}>
          <div className="admin-modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wallet size={20} style={{ color: PRIMARY }} />
                <h3 className="admin-modal-title">Hồ sơ Tài chính & Tín nhiệm Escrow</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserForWallet(null)}
                style={{ cursor: 'pointer', color: COLORS.neutral[400], border: 'none', background: 'none' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              <img
                src={selectedUserForWallet.avatar}
                alt={selectedUserForWallet.name}
                style={{ width: '56px', height: '56px', borderRadius: '50%', border: `2px solid ${PRIMARY}` }}
              />
              <div>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: COLORS.neutral[900] }}>
                  {selectedUserForWallet.name}
                </h4>
                <div style={{ fontSize: '12.5px', color: COLORS.neutral[500], marginTop: '2px' }}>
                  {selectedUserForWallet.email} • {selectedUserForWallet.phone}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '12px', color: '#64748B' }}>Số dư ví khả dụng</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                  {formatVND(selectedUserForWallet.walletBalance)}
                </div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#E8F6F7', borderRadius: '12px', border: '1px solid #BCE5E8' }}>
                <div style={{ fontSize: '12px', color: '#286E74' }}>Tiền ký quỹ an toàn (Escrow)</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#286E74', marginTop: '4px' }}>
                  {formatVND(selectedUserForWallet.walletEscrowBalance || 0)}
                </div>
              </div>
            </div>

            <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                  Chỉ số uy tín Trust Score
                </span>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#286E74' }}>
                  {selectedUserForWallet.trustScore}/100
                </span>
              </div>
              <div className="admin-progress-track">
                <div
                  className="admin-progress-bar"
                  style={{
                    width: `${selectedUserForWallet.trustScore}%`,
                    backgroundColor: selectedUserForWallet.trustScore >= 85 ? '#22C55E' : '#EAB308',
                  }}
                />
              </div>
              <p style={{ fontSize: '12px', color: '#64748B', marginTop: '8px', lineHeight: 1.5 }}>
                {selectedUserForWallet.isVerified
                  ? '✓ Tài khoản đã hoàn tất xác thực eKYC CCCD cấp độ cao nhất.'
                  : '⚠️ Tài khoản chưa xác thực danh tính điện tử eKYC.'}
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={() => setSelectedUserForWallet(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersTab;
