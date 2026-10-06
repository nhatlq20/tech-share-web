import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle,
  XCircle,
  X,
  AlertCircle,
  ZoomIn,
  User,
  CreditCard,
  MapPin,
  Calendar,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { AdminEkycRequest } from '../../types/admin';
import { COLORS, PRIMARY, PRIMARY_HOVER, PRIMARY_SURFACE, SUCCESS, DANGER } from '../../constants/colors';
import { STRINGS, API_CONFIG, MAGIC_NUMBERS } from '../../constants';
import './AdminWorkspace.css';

export interface EkycApprovalTabProps {
  requests?: AdminEkycRequest[];
  onApprove?: (requestId: string) => Promise<void>;
  onReject?: (requestId: string, reason: string) => Promise<void>;
  isLoading?: boolean;
}

const COMMON_REJECT_REASONS = STRINGS.admin.ekyc.reasons;

export const EkycApprovalTab: React.FC<EkycApprovalTabProps> = ({
  requests: propsRequests,
  onApprove: propsOnApprove,
  onReject: propsOnReject,
  isLoading: propsIsLoading = false,
}) => {
  const [requestList, setRequestList] = useState<AdminEkycRequest[]>(propsRequests || []);
  const [loading, setLoading] = useState<boolean>(propsIsLoading);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);
  const [rejectModalReq, setRejectModalReq] = useState<AdminEkycRequest | null>(null);
  const [rejectReason, setRejectReason] = useState<string>(COMMON_REJECT_REASONS[0]);
  const [customRejectReason, setCustomRejectReason] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), MAGIC_NUMBERS.UI.TOAST_AUTO_DISMISS_MS);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Sync props
  useEffect(() => {
    if (propsRequests) {
      setRequestList(propsRequests);
    }
  }, [propsRequests]);

  // Fetch from API fallback if no props provided
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ADMIN_EKYC}`);
      if (res.ok) {
        const json = await res.json();
        const items = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
        if (items.length > 0) {
          setRequestList(items);
        }
      }
    } catch (err) {
      console.warn('Lỗi fetch eKYC requests:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!propsRequests || propsRequests.length === 0) {
      fetchRequests();
    }
  }, [fetchRequests, propsRequests]);

  // Stats count
  const pendingCount = requestList.filter((r) => r.status === 'pending').length;
  const approvedCount = requestList.filter((r) => r.status === 'approved').length;
  const rejectedCount = requestList.filter((r) => r.status === 'rejected').length;

  // Filtered requests
  const filteredRequests = requestList.filter((r) => {
    if (statusFilter === 'all') return true;
    return r.status === statusFilter;
  });

  // Action: Approve
  const handleApprove = async (id: string, name: string) => {
    try {
      setActionLoadingId(id);
      if (propsOnApprove) {
        await propsOnApprove(id);
      } else {
        await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ADMIN_APPROVE_EKYC(id)}`, { method: 'PATCH' });
      }

      // Optimistic update
      setRequestList((prev) =>
        prev.map((r) => (r._id === id ? { ...r, status: 'approved' as const } : r))
      );

      setToast({
        message: `Đã phê duyệt hồ sơ và cấp Tích Xanh cho "${name}" thành công!`,
        type: 'success',
      });
    } catch {
      setToast({
        message: `Đã xảy ra lỗi khi duyệt hồ sơ "${name}".`,
        type: 'error',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Action: Reject
  const handleConfirmReject = async () => {
    if (!rejectModalReq) return;
    const finalReason = customRejectReason.trim() || rejectReason;

    try {
      setActionLoadingId(rejectModalReq._id);
      if (propsOnReject) {
        await propsOnReject(rejectModalReq._id, finalReason);
      } else {
        await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ADMIN_REJECT_EKYC(rejectModalReq._id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: finalReason }),
        });
      }

      // Optimistic update
      setRequestList((prev) =>
        prev.map((r) =>
          r._id === rejectModalReq._id
            ? { ...r, status: 'rejected' as const, rejectReason: finalReason }
            : r
        )
      );

      setToast({
        message: `Đã từ chối hồ sơ của "${rejectModalReq.fullName}".`,
        type: 'info',
      });

      setRejectModalReq(null);
      setCustomRejectReason('');
    } catch {
      setToast({
        message: `Đã xảy ra lỗi khi từ chối hồ sơ "${rejectModalReq.fullName}".`,
        type: 'error',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Toast Notification Container */}
      {toast && (
        <div className="admin-toast-container">
          <div className={`admin-toast ${toast.type}`}>
            {toast.type === 'success' && <CheckCircle2 size={18} style={{ color: SUCCESS }} />}
            {toast.type === 'error' && <AlertTriangle size={18} style={{ color: DANGER }} />}
            {toast.type === 'info' && <Sparkles size={18} style={{ color: PRIMARY }} />}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              style={{
                marginLeft: 'auto',
                border: 'none',
                background: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '2px',
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* A. Header & Thanh lọc (Tabs Filter) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        {/* Tiêu đề */}
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 800,
            color: '#1E293B',
            letterSpacing: '-0.02em',
            margin: 0,
          }}
        >
          Xét duyệt Hồ sơ eKYC Cấp Tích Xanh
        </h1>

        {/* Cụm Tabs lọc (Bên phải): Liền khối Button Group nền xám nhạt bg-slate-100 */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: '#F1F5F9',
            padding: '4px',
            borderRadius: '12px',
            gap: '4px',
          }}
          role="tablist"
        >
          {/* Tab 1: Chờ duyệt */}
          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === 'pending'}
            onClick={() => setStatusFilter('pending')}
            style={{
              padding: '7px 16px',
              fontSize: '13px',
              fontWeight: statusFilter === 'pending' ? 700 : 500,
              borderRadius: '9px',
              border: statusFilter === 'pending' ? '1px solid #E2E8F0' : '1px solid transparent',
              backgroundColor: statusFilter === 'pending' ? '#FFFFFF' : 'transparent',
              color: statusFilter === 'pending' ? '#286E74' : '#64748B',
              boxShadow: statusFilter === 'pending' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            Chờ duyệt ({pendingCount})
          </button>

          {/* Tab 2: Đã duyệt */}
          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === 'approved'}
            onClick={() => setStatusFilter('approved')}
            style={{
              padding: '7px 16px',
              fontSize: '13px',
              fontWeight: statusFilter === 'approved' ? 700 : 500,
              borderRadius: '9px',
              border: statusFilter === 'approved' ? '1px solid #E2E8F0' : '1px solid transparent',
              backgroundColor: statusFilter === 'approved' ? '#FFFFFF' : 'transparent',
              color: statusFilter === 'approved' ? '#286E74' : '#64748B',
              boxShadow: statusFilter === 'approved' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            Đã duyệt ({approvedCount})
          </button>

          {/* Tab 3: Đã từ chối */}
          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === 'rejected'}
            onClick={() => setStatusFilter('rejected')}
            style={{
              padding: '7px 16px',
              fontSize: '13px',
              fontWeight: statusFilter === 'rejected' ? 700 : 500,
              borderRadius: '9px',
              border: statusFilter === 'rejected' ? '1px solid #E2E8F0' : '1px solid transparent',
              backgroundColor: statusFilter === 'rejected' ? '#FFFFFF' : 'transparent',
              color: statusFilter === 'rejected' ? '#286E74' : '#64748B',
              boxShadow: statusFilter === 'rejected' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            Đã từ chối ({rejectedCount})
          </button>

          {/* Tab 4: Tất cả */}
          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
            style={{
              padding: '7px 16px',
              fontSize: '13px',
              fontWeight: statusFilter === 'all' ? 700 : 500,
              borderRadius: '9px',
              border: statusFilter === 'all' ? '1px solid #E2E8F0' : '1px solid transparent',
              backgroundColor: statusFilter === 'all' ? '#FFFFFF' : 'transparent',
              color: statusFilter === 'all' ? '#286E74' : '#64748B',
              boxShadow: statusFilter === 'all' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            Tất cả ({requestList.length})
          </button>
        </div>
      </div>

      {/* B. Trạng thái Trống (Empty State) - Khi tab rỗng */}
      {filteredRequests.length === 0 ? (
        <div
          className="admin-card rounded-2xl shadow-sm bg-white"
          style={{
            padding: '56px 24px',
            borderRadius: '16px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          }}
        >
          {/* Icon Checkmark lớn bọc trong vòng tròn nền màu xanh Teal nhạt (PRIMARY_SURFACE), màu icon PRIMARY */}
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: PRIMARY_SURFACE,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: PRIMARY,
              marginBottom: '18px',
            }}
          >
            <CheckCircle size={42} strokeWidth={2.2} />
          </div>

          {/* Tiêu đề */}
          <h3
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#1E293B',
              margin: '0 0 8px',
            }}
          >
            {loading
              ? 'Đang tải danh sách hồ sơ...'
              : statusFilter === 'pending'
              ? 'Không có hồ sơ nào đang chờ duyệt!'
              : 'Không có hồ sơ nào trong mục này!'}
          </h3>

          {/* Mô tả */}
          <p
            style={{
              fontSize: '14px',
              color: '#64748B',
              maxWidth: '440px',
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            {statusFilter === 'pending'
              ? 'Tuyệt vời! Toàn bộ hồ sơ định danh điện tử eKYC trên hệ thống đã được kiểm tra và xử lý hoàn tất.'
              : 'Hãy chuyển qua các tab bộ lọc khác để kiểm tra hoặc đợi thành viên gửi yêu cầu xác thực mới.'}
          </p>
        </div>
      ) : (
        /* C. Trạng thái Có Dữ liệu (Danh sách Card hồ sơ eKYC) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredRequests.map((req) => {
            const formattedDate = req.createdAt
              ? new Date(req.createdAt).toLocaleDateString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })
              : 'Gần đây';

            return (
              <div
                key={req._id}
                className="admin-card rounded-2xl shadow-sm bg-white"
                style={{
                  padding: '24px',
                  borderRadius: '16px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderLeft:
                    req.status === 'pending'
                      ? '4px solid #EAB308'
                      : req.status === 'approved'
                      ? '4px solid #22C55E'
                      : '4px solid #EF4444',
                }}
              >
                {/* Header Card: User Info & Actions */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '16px',
                    marginBottom: '20px',
                  }}
                >
                  {/* Cụm thông tin User */}
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                    <div
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '12px',
                        backgroundColor: '#E8F6F7',
                        color: '#286E74',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <User size={22} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h3
                          style={{
                            margin: 0,
                            fontSize: '16.5px',
                            fontWeight: 800,
                            color: '#0F172A',
                          }}
                        >
                          {req.fullName}
                        </h3>

                        {/* Badge trạng thái */}
                        <span
                          className="admin-pill-badge"
                          style={{
                            backgroundColor:
                              req.status === 'pending'
                                ? '#FEF3C7'
                                : req.status === 'approved'
                                ? '#DCFCE7'
                                : '#FEE2E2',
                            color:
                              req.status === 'pending'
                                ? '#D97706'
                                : req.status === 'approved'
                                ? '#15803D'
                                : '#DC2626',
                            fontWeight: 700,
                          }}
                        >
                          {req.status === 'pending'
                            ? 'Chờ duyệt'
                            : req.status === 'approved'
                            ? 'Đã duyệt'
                            : 'Đã từ chối'}
                        </span>
                      </div>

                      {/* Thông tin liên hệ & ngày gửi */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          marginTop: '6px',
                          fontSize: '12.5px',
                          color: '#64748B',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CreditCard size={13} style={{ color: PRIMARY }} />
                          Số CCCD: <strong style={{ color: COLORS.neutral[900] }}>{req.idCardNumber}</strong>
                        </span>
                        <span>•</span>
                        <span>SĐT: {req.phone}</span>
                        <span>•</span>
                        <span>Email: {req.email}</span>
                        <span>•</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={13} style={{ color: COLORS.neutral[400] }} />
                          Ngày gửi: {formattedDate}
                        </span>
                        {req.address && (
                          <>
                            <span>•</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin size={13} style={{ color: COLORS.neutral[400] }} />
                              {req.address}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Cụm Action Buttons (Hiển thị khi đang Pending) */}
                  {req.status === 'pending' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {/* Nút Từ chối: Viền đỏ, chữ đỏ */}
                      <button
                        type="button"
                        onClick={() => setRejectModalReq(req)}
                        disabled={actionLoadingId === req._id}
                        className="admin-btn-danger-soft whitespace-nowrap"
                        style={{
                          padding: '7px 16px',
                          fontSize: '12.5px',
                          borderRadius: '10px',
                        }}
                        title="Từ chối hồ sơ này"
                      >
                        <XCircle size={14} />
                        <span>Từ chối</span>
                      </button>

                      {/* Nút Duyệt: Nền PRIMARY, chữ trắng */}
                      <button
                        type="button"
                        onClick={() => handleApprove(req._id, req.fullName)}
                        disabled={actionLoadingId === req._id}
                        className="admin-btn admin-btn-primary whitespace-nowrap"
                        style={{
                          padding: '7px 18px',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          borderRadius: '10px',
                          backgroundColor: PRIMARY,
                          border: `1px solid ${PRIMARY_HOVER}`,
                        }}
                        title="Duyệt hồ sơ và cấp Tích Xanh"
                      >
                        {actionLoadingId === req._id ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Đang xử lý...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle size={14} />
                            <span>Duyệt</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Cụm 3 ảnh thu nhỏ (Thumbnails: CCCD Mặt trước, CCCD Mặt sau, Selfie) */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '14px',
                  }}
                >
                  {/* Ảnh 1: Mặt trước CCCD */}
                  <div
                    style={{
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      overflow: 'hidden',
                      backgroundColor: '#F8FAFC',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s',
                    }}
                    onClick={() =>
                      setLightboxImage({
                        url: req.idCardFrontUrl,
                        title: `CCCD Mặt Trước - ${req.fullName}`,
                      })
                    }
                  >
                    <div
                      style={{
                        padding: '8px 12px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#475569',
                        backgroundColor: '#F1F5F9',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span>1. Mặt trước CCCD</span>
                      <ZoomIn size={13} style={{ color: PRIMARY }} />
                    </div>
                    <img
                      src={req.idCardFrontUrl}
                      alt="CCCD mặt trước"
                      style={{
                        width: '100%',
                        height: '140px',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                      loading="lazy"
                    />
                  </div>

                  {/* Ảnh 2: Mặt sau CCCD */}
                  <div
                    style={{
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      overflow: 'hidden',
                      backgroundColor: '#F8FAFC',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s',
                    }}
                    onClick={() =>
                      setLightboxImage({
                        url: req.idCardBackUrl,
                        title: `CCCD Mặt Sau - ${req.fullName}`,
                      })
                    }
                  >
                    <div
                      style={{
                        padding: '8px 12px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#475569',
                        backgroundColor: '#F1F5F9',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span>2. Mặt sau CCCD</span>
                      <ZoomIn size={13} style={{ color: PRIMARY }} />
                    </div>
                    <img
                      src={req.idCardBackUrl}
                      alt="CCCD mặt sau"
                      style={{
                        width: '100%',
                        height: '140px',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                      loading="lazy"
                    />
                  </div>

                  {/* Ảnh 3: Selfie cầm CCCD */}
                  <div
                    style={{
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      overflow: 'hidden',
                      backgroundColor: '#F8FAFC',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s',
                    }}
                    onClick={() =>
                      setLightboxImage({
                        url: req.selfieUrl,
                        title: `Chân dung đối soát Selfie - ${req.fullName}`,
                      })
                    }
                  >
                    <div
                      style={{
                        padding: '8px 12px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#475569',
                        backgroundColor: '#F1F5F9',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span>3. Chân dung cầm CCCD</span>
                      <ZoomIn size={13} style={{ color: PRIMARY }} />
                    </div>
                    <img
                      src={req.selfieUrl}
                      alt="Ảnh chân dung selfie"
                      style={{
                        width: '100%',
                        height: '140px',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                      loading="lazy"
                    />
                  </div>
                </div>

                {/* Hiển thị lý do từ chối (nếu status === rejected) */}
                {req.status === 'rejected' && req.rejectReason && (
                  <div
                    style={{
                      marginTop: '14px',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      backgroundColor: '#FEF2F2',
                      border: '1px solid #FECACA',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12.5px',
                      color: '#991B1B',
                    }}
                  >
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>
                      Lý do từ chối: <strong>{req.rejectReason}</strong>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Phóng to tài liệu CCCD/Selfie (Lightbox) */}
      {lightboxImage && (
        <div className="admin-modal-overlay" onClick={() => setLightboxImage(null)}>
          <div
            className="admin-modal-card"
            style={{ maxWidth: '780px', width: '100%', padding: '20px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-header" style={{ marginBottom: '14px' }}>
              <h3 className="admin-modal-title" style={{ fontSize: '15.5px' }}>
                {lightboxImage.title}
              </h3>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                style={{
                  cursor: 'pointer',
                  color: '#94A3B8',
                  border: 'none',
                  background: 'none',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>
            <img
              src={lightboxImage.url}
              alt={lightboxImage.title}
              className="admin-lightbox-img"
              style={{
                width: '100%',
                maxHeight: '520px',
                objectFit: 'contain',
                borderRadius: '12px',
                backgroundColor: '#0F172A',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={() => setLightboxImage(null)}
                style={{ backgroundColor: PRIMARY, padding: '8px 20px', fontSize: '13px' }}
              >
                Đóng ảnh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Nhập lý do từ chối hồ sơ */}
      {rejectModalReq && (
        <div className="admin-modal-overlay" onClick={() => setRejectModalReq(null)}>
          <div
            className="admin-modal-card"
            style={{ maxWidth: '480px', width: '100%', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-header" style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={20} style={{ color: '#DC2626' }} />
                <h3 className="admin-modal-title" style={{ fontSize: '16.5px', color: '#DC2626' }}>
                  Từ chối hồ sơ eKYC
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalReq(null)}
                style={{
                  cursor: 'pointer',
                  color: '#94A3B8',
                  border: 'none',
                  background: 'none',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13.5px', color: '#475569', margin: '0 0 14px' }}>
              Vui lòng chọn hoặc nhập lý do từ chối hồ sơ của{' '}
              <strong style={{ color: '#0F172A' }}>{rejectModalReq.fullName}</strong>:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
              {COMMON_REJECT_REASONS.map((reason) => (
                <label
                  key={reason}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    fontSize: '12.5px',
                    color: '#334155',
                    cursor: 'pointer',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    backgroundColor: rejectReason === reason ? '#FEF2F2' : '#F8FAFC',
                    border: `1px solid ${rejectReason === reason ? '#FECACA' : '#E2E8F0'}`,
                  }}
                >
                  <input
                    type="radio"
                    name="rejectReason"
                    checked={rejectReason === reason && !customRejectReason}
                    onChange={() => {
                      setRejectReason(reason);
                      setCustomRejectReason('');
                    }}
                    style={{ marginTop: '2px', accentColor: '#DC2626' }}
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <textarea
                placeholder="Hoặc nhập lý do cụ thể khác..."
                value={customRejectReason}
                onChange={(e) => setCustomRejectReason(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  outline: 'none',
                  resize: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="admin-btn admin-btn-outline"
                onClick={() => setRejectModalReq(null)}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-danger"
                onClick={handleConfirmReject}
                style={{
                  padding: '8px 20px',
                  fontSize: '13px',
                  fontWeight: 700,
                  backgroundColor: '#DC2626',
                }}
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EkycApprovalTab;

