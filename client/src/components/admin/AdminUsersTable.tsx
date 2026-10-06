import React from 'react';
import {
  Eye,
  Lock,
  Unlock,
  CheckCircle2,
  Mail,
  Phone,
  Shield,
} from 'lucide-react';
import { UserItem } from '../../types/admin';
import { COLORS, PRIMARY_DARK, PRIMARY_SURFACE, SUCCESS, DANGER } from '../../constants/colors';
import { STRINGS, MAGIC_NUMBERS } from '../../constants';
import './AdminWorkspace.css';

export interface AdminUsersTableProps {
  users: UserItem[];
  loading?: boolean;
  actionLoadingId?: string | null;
  onViewDetails: (user: UserItem) => void;
  onToggleStatus: (user: UserItem) => void;
}

export const AdminUsersTable: React.FC<AdminUsersTableProps> = ({
  users,
  loading = false,
  actionLoadingId,
  onViewDetails,
  onToggleStatus,
}) => {
  return (
    <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Container chống ép bảng với overflow-x-auto & hide-scrollbar */}
      <div className="w-full overflow-x-auto hide-scrollbar admin-table-container">
        <table
          className="admin-table w-full text-left"
          style={{ width: '100%', minWidth: `${MAGIC_NUMBERS.UI.TABLE_MIN_WIDTH_PX}px`, borderCollapse: 'collapse' }}
        >
          <thead>
            <tr>
              {/* Cột 1: Thành viên & Liên hệ (Tích hợp Tích xanh eKYC) */}
              <th style={{ minWidth: '280px', width: '38%', paddingLeft: '20px' }}>
                {STRINGS.admin.users.table.colMember}
              </th>
              {/* Cột 2: Vai trò */}
              <th style={{ minWidth: '140px', width: '18%' }}>
                {STRINGS.admin.users.table.colRole}
              </th>
              {/* Cột 3: Điểm tín nhiệm (Rút gọn) */}
              <th style={{ minWidth: '120px', width: '14%' }}>
                {STRINGS.admin.users.table.colTrustScore}
              </th>
              {/* Cột 4: Trạng thái */}
              <th style={{ minWidth: '120px', width: '14%' }}>
                {STRINGS.admin.users.table.colStatus}
              </th>
              {/* Cột 5: Hành động (Đầy đủ bên phải) */}
              <th
                style={{
                  minWidth: '160px',
                  width: '16%',
                  textAlign: 'right',
                  paddingRight: '24px',
                }}
              >
                {STRINGS.admin.users.table.colActions}
              </th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    textAlign: 'center',
                    padding: '56px 20px',
                    color: '#64748B',
                    verticalAlign: 'middle',
                  }}
                >
                  <div style={{ fontSize: '36px', marginBottom: '10px' }}>🔍</div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: '#1E293B' }}>
                    {loading ? 'Đang tải danh sách người dùng...' : 'Không tìm thấy người dùng phù hợp'}
                  </div>
                  <div style={{ fontSize: '13px', marginTop: '4px' }}>
                    {loading
                      ? 'Đang đồng bộ dữ liệu thời gian thực từ MongoDB Atlas'
                      : 'Hãy thử đổi từ khóa tìm kiếm hoặc đặt lại các bộ lọc vai trò.'}
                  </div>
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user._id}>
                  {/* Cột 1: Thành viên & Liên hệ + Tích hợp Tích xanh eKYC */}
                  <td style={{ verticalAlign: 'middle', paddingLeft: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <img
                        src={
                          user.avatar ||
                          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400'
                        }
                        alt={user.name}
                        style={{
                          width: '44px',
                          height: '44px',
                          minWidth: '44px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '2px solid #E2E8F0',
                          backgroundColor: '#F8FAFC',
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            color: '#0F172A',
                            fontSize: '13.5px',
                            lineHeight: 1.3,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span className="whitespace-nowrap">{user.name}</span>
                          {/* Tích hợp Tích xanh eKYC ngay sát bên cạnh Tên người dùng */}
                          {user.isVerified && (
                            <span
                              title="Tài khoản đã hoàn tất xác thực eKYC CCCD"
                              style={{ display: 'inline-flex', alignItems: 'center' }}
                            >
                              <CheckCircle2
                                size={15}
                                style={{
                                  color: PRIMARY_DARK,
                                  fill: PRIMARY_SURFACE,
                                  flexShrink: 0,
                                }}
                              />
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: '11px',
                              color: COLORS.neutral[400],
                              fontWeight: 500,
                              fontFamily: 'monospace',
                            }}
                          >
                            #{user._id.slice(-5)}
                          </span>
                        </div>

                        {/* Flex row chứa Email và SĐT */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginTop: '4px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <span
                            className="whitespace-nowrap"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                              color: '#64748B',
                            }}
                          >
                            <Mail size={12} style={{ color: '#94A3B8', flexShrink: 0 }} />
                            {user.email}
                          </span>
                          <span
                            className="whitespace-nowrap"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                              color: '#64748B',
                            }}
                          >
                            <Phone size={12} style={{ color: '#94A3B8', flexShrink: 0 }} />
                            {user.phone || 'Chưa cập nhật'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Cột 2: Vai trò */}
                  <td style={{ verticalAlign: 'middle' }}>
                    <span
                      className="admin-pill-badge whitespace-nowrap"
                      style={{
                        backgroundColor:
                          user.role === 'admin'
                            ? '#F3E8FF'
                            : user.role === 'owner'
                            ? COLORS.status.info.badgeBg
                            : user.role === 'both'
                            ? PRIMARY_SURFACE
                            : COLORS.neutral[100],
                        color:
                          user.role === 'admin'
                            ? '#7E22CE'
                            : user.role === 'owner'
                            ? COLORS.status.info.text
                            : user.role === 'both'
                            ? PRIMARY_DARK
                            : COLORS.neutral[600],
                      }}
                    >
                      {user.role === 'admin'
                        ? STRINGS.admin.users.roles.admin
                        : user.role === 'owner'
                        ? STRINGS.admin.users.roles.owner
                        : user.role === 'both'
                        ? STRINGS.admin.users.roles.both
                        : STRINGS.admin.users.roles.renter}
                    </span>
                  </td>

                  {/* Cột 3: Điểm tín nhiệm (Rút gọn: Chỉ con số + icon Khiên nhỏ) */}
                  <td style={{ verticalAlign: 'middle' }}>
                    <div
                      className="whitespace-nowrap"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontWeight: 800,
                        fontSize: '12.5px',
                        border: '1px solid',
                        backgroundColor:
                          user.trustScore >= MAGIC_NUMBERS.TRUST_SCORE.EXCELLENT_THRESHOLD
                            ? COLORS.status.success.bg
                            : user.trustScore >= MAGIC_NUMBERS.TRUST_SCORE.GOOD_THRESHOLD
                            ? COLORS.status.warning.bg
                            : COLORS.status.danger.bg,
                        color:
                          user.trustScore >= MAGIC_NUMBERS.TRUST_SCORE.EXCELLENT_THRESHOLD
                            ? COLORS.status.success.text
                            : user.trustScore >= MAGIC_NUMBERS.TRUST_SCORE.GOOD_THRESHOLD
                            ? COLORS.status.warning.text
                            : COLORS.status.danger.text,
                        borderColor:
                          user.trustScore >= MAGIC_NUMBERS.TRUST_SCORE.EXCELLENT_THRESHOLD
                            ? COLORS.status.success.border
                            : user.trustScore >= MAGIC_NUMBERS.TRUST_SCORE.GOOD_THRESHOLD
                            ? COLORS.status.warning.border
                            : COLORS.status.danger.border,
                      }}
                      title={`${STRINGS.admin.users.table.trustScoreTitle} ${user.trustScore}/${MAGIC_NUMBERS.TRUST_SCORE.MAX}`}
                    >
                      <Shield size={13} style={{ flexShrink: 0 }} />
                      <span>{user.trustScore}</span>
                    </div>
                  </td>

                  {/* Cột 4: Trạng thái */}
                  <td style={{ verticalAlign: 'middle' }}>
                    {user.isActive ? (
                      <span className="admin-pill-badge active whitespace-nowrap">
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: SUCCESS,
                            flexShrink: 0,
                          }}
                        />
                        {STRINGS.admin.users.table.activeStatus}
                      </span>
                    ) : (
                      <span className="admin-pill-badge locked whitespace-nowrap">
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: DANGER,
                            flexShrink: 0,
                          }}
                        />
                        {STRINGS.admin.users.table.lockedStatus}
                      </span>
                    )}
                  </td>

                  {/* Cột 5: Hành động (Rộng rãi, hiển thị đầy đủ bên phải) */}
                  <td
                    style={{
                      verticalAlign: 'middle',
                      textAlign: 'right',
                      paddingRight: '24px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: '12px',
                        minWidth: '160px',
                      }}
                    >
                      {/* Nút Chi tiết (Nền trắng, viền mảnh, chữ xám đậm) */}
                      <button
                        type="button"
                        onClick={() => onViewDetails(user)}
                        className="admin-user-btn-detail whitespace-nowrap"
                        title="Xem thông tin chi tiết & Ví Escrow"
                      >
                        <Eye size={13} style={{ flexShrink: 0 }} />
                        <span>{STRINGS.admin.users.table.detailBtn}</span>
                      </button>

                      {/* Nút Khóa / Mở khóa (Nền đỏ/xanh, chữ trắng) */}
                      <button
                        type="button"
                        onClick={() => onToggleStatus(user)}
                        disabled={actionLoadingId === user._id}
                        className={`whitespace-nowrap ${
                          user.isActive ? 'admin-user-btn-lock' : 'admin-user-btn-unlock'
                        }`}
                        title={user.isActive ? 'Khóa tài khoản này' : 'Mở khóa tài khoản'}
                      >
                        {user.isActive ? (
                          <Lock size={13} style={{ flexShrink: 0 }} />
                        ) : (
                          <Unlock size={13} style={{ flexShrink: 0 }} />
                        )}
                        <span>{user.isActive ? STRINGS.admin.users.table.lockBtn : STRINGS.admin.users.table.unlockBtn}</span>
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
  );
};

export default AdminUsersTable;
