import React, { useState } from 'react';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Wallet,
  Shield,
  Eye,
  X,
  Phone,
  Mail,
  UserCheck,
} from 'lucide-react';
import { AdminUser } from '../../types/admin';

interface AdminUsersTabProps {
  users: AdminUser[];
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
  const [selectedUserForWallet, setSelectedUserForWallet] = useState<AdminUser | null>(null);
  const [confirmLockUser, setConfirmLockUser] = useState<AdminUser | null>(null);
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
    }).format(num);
  };

  const handleStatusChange = async (user: AdminUser) => {
    try {
      setActionLoadingId(user._id);
      await onToggleStatus(user._id, user.isActive);
      setConfirmLockUser(null);
    } finally {
      setActionLoadingId(null);
    }
  };

  const getTrustBadgeClass = (score: number) => {
    if (score >= 85) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score >= 70) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-rose-700 bg-rose-50 border-rose-200';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header & Search Filters */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
            Quản lý Người dùng & Tín nhiệm
          </h1>
        </div>

        {/* Filter Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div className="admin-search-pill" style={{ width: '280px' }}>
            <Search size={16} style={{ color: '#67BEC3' }} />
            <input
              type="text"
              placeholder="Tìm theo Tên, Email, SĐT..."
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
            <option value="all">Tất cả vai trò</option>
            <option value="admin">Quản trị viên (Admin)</option>
            <option value="owner">Chủ thiết bị (Owner)</option>
            <option value="renter">Người thuê (Renter)</option>
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

      {/* 2. Data Table */}
      <div className="admin-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Thành viên</th>
                <th>Liên hệ</th>
                <th>Vai trò</th>
                <th>Điểm tín nhiệm</th>
                <th>Tích xanh eKYC</th>
                <th>Ví & Ký quỹ</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '48px 20px', color: '#64748B' }}>
                    <div style={{ fontSize: '36px', marginBottom: '10px' }}>🔍</div>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: '#1E293B' }}>
                      Không tìm thấy người dùng phù hợp
                    </div>
                    <div style={{ fontSize: '13px', marginTop: '4px' }}>
                      Hãy thử đổi từ khóa tìm kiếm hoặc đặt lại các bộ lọc vai trò.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user._id}>
                    {/* User info */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img
                          src={user.avatar}
                          alt={user.name}
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '2px solid #E2E8F0',
                            backgroundColor: '#F8FAFC',
                          }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '13.5px' }}>
                            {user.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'monospace' }}>
                            ID: {user._id.slice(-6)}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#334155' }}>
                          <Mail size={12} style={{ color: '#94A3B8' }} /> {user.email}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#64748B' }}>
                          <Phone size={12} style={{ color: '#94A3B8' }} /> {user.phone || 'Chưa cập nhật'}
                        </span>
                      </div>
                    </td>

                    {/* Role */}
                    <td>
                      <span
                        className="admin-pill-badge"
                        style={{
                          backgroundColor:
                            user.role === 'admin'
                              ? '#F3E8FF'
                              : user.role === 'owner'
                              ? '#E0F2FE'
                              : '#F1F5F9',
                          color:
                            user.role === 'admin'
                              ? '#7E22CE'
                              : user.role === 'owner'
                              ? '#0369A1'
                              : '#475569',
                        }}
                      >
                        {user.role === 'admin'
                          ? '👑 Quản trị viên'
                          : user.role === 'owner'
                          ? '🏢 Chủ thiết bị'
                          : '👤 Khách thuê'}
                      </span>
                    </td>

                    {/* Trust Score */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            padding: '3px 8px',
                            borderRadius: '8px',
                            fontWeight: 800,
                            fontSize: '12px',
                            border: '1px solid',
                            backgroundColor:
                              user.trustScore >= 85 ? '#F0FDF4' : user.trustScore >= 70 ? '#FEFCE8' : '#FEF2F2',
                            color:
                              user.trustScore >= 85 ? '#15803D' : user.trustScore >= 70 ? '#A16207' : '#B91C1C',
                            borderColor:
                              user.trustScore >= 85 ? '#BBF7D0' : user.trustScore >= 70 ? '#FEF08A' : '#FECACA',
                          }}
                        >
                          {user.trustScore}/100
                        </div>
                        <span style={{ fontSize: '11px', color: '#64748B' }}>
                          {user.trustScore >= 85 ? 'Tín nhiệm cao' : user.trustScore >= 70 ? 'Bình thường' : 'Cần lưu ý'}
                        </span>
                      </div>
                    </td>

                    {/* eKYC */}
                    <td>
                      {user.isVerified ? (
                        <span className="admin-pill-badge verified" title="Đã đối soát CCCD hợp lệ">
                          <CheckCircle2 size={13} style={{ color: '#286E74' }} />
                          Đã định danh
                        </span>
                      ) : (
                        <span className="admin-pill-badge" style={{ backgroundColor: '#F1F5F9', color: '#64748B' }}>
                          Chưa xác minh
                        </span>
                      )}
                    </td>

                    {/* Wallet */}
                    <td>
                      <button
                        type="button"
                        onClick={() => setSelectedUserForWallet(user)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          background: 'none',
                          border: 'none',
                          padding: '4px 8px',
                          borderRadius: '8px',
                          transition: 'all 0.2s',
                        }}
                        className="hover:bg-slate-100"
                        title="Xem chi tiết ví Escrow"
                      >
                        <Wallet size={15} style={{ color: '#67BEC3' }} />
                        <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '12.5px' }}>
                          {formatVND(user.walletBalance)}
                        </span>
                      </button>
                    </td>

                    {/* Status */}
                    <td>
                      {user.isActive ? (
                        <span className="admin-pill-badge active">
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22C55E' }} />
                          Hoạt động
                        </span>
                      ) : (
                        <span className="admin-pill-badge locked">
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
                          Đã khóa
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedUserForWallet(user)}
                          className="admin-btn admin-btn-outline"
                          style={{ padding: '6px 10px', fontSize: '11.5px' }}
                          title="Xem thông tin chi tiết & Ví"
                        >
                          <Eye size={13} />
                          <span>Chi tiết</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setConfirmLockUser(user)}
                          disabled={actionLoadingId === user._id}
                          className={`admin-btn ${user.isActive ? 'admin-btn-danger' : 'admin-btn-success'}`}
                          style={{ padding: '6px 10px', fontSize: '11.5px' }}
                        >
                          {user.isActive ? <Lock size={13} /> : <Unlock size={13} />}
                          <span>{user.isActive ? 'Khóa' : 'Mở khóa'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
              <button onClick={() => setConfirmLockUser(null)} style={{ cursor: 'pointer', color: '#94A3B8' }}>
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
                <Wallet size={20} style={{ color: '#67BEC3' }} />
                <h3 className="admin-modal-title">Hồ sơ Tài chính & Tín nhiệm Escrow</h3>
              </div>
              <button onClick={() => setSelectedUserForWallet(null)} style={{ cursor: 'pointer', color: '#94A3B8' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              <img
                src={selectedUserForWallet.avatar}
                alt={selectedUserForWallet.name}
                style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2px solid #67BEC3' }}
              />
              <div>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                  {selectedUserForWallet.name}
                </h4>
                <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '2px' }}>
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

