import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Eye,
  X,
  AlertCircle,
  ZoomIn,
  Clock,
  User,
  CreditCard,
  MapPin,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { AdminEkycRequest } from '../../types/admin';

interface AdminEkycTabProps {
  requests: AdminEkycRequest[];
  onApprove: (requestId: string) => Promise<void>;
  onReject: (requestId: string, reason: string) => Promise<void>;
  isLoading?: boolean;
}

export const AdminEkycTab: React.FC<AdminEkycTabProps> = ({
  requests,
  onApprove,
  onReject,
  isLoading = false,
}) => {
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);
  const [rejectModalReq, setRejectModalReq] = useState<AdminEkycRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('Hình ảnh CCCD bị mờ, lóa sáng hoặc thông tin không rõ nét.');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const filteredRequests = requests.filter((r) => {
    if (statusFilter === 'all') return true;
    return r.status === statusFilter;
  });

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  const handleApprove = async (id: string) => {
    try {
      setActionLoadingId(id);
      await onApprove(id);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectModalReq) return;
    try {
      setActionLoadingId(rejectModalReq._id);
      await onReject(rejectModalReq._id, rejectReason);
      setRejectModalReq(null);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header & Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
            Xét duyệt Hồ sơ eKYC Cấp Tích Xanh
          </h1>
        </div>

        {/* Status Filter Tabs */}
        <div className="admin-tab-group" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === 'pending'}
            onClick={() => setStatusFilter('pending')}
            className={`admin-tab-pill ${statusFilter === 'pending' ? 'active' : ''}`}
          >
            Chờ duyệt ({pendingCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === 'approved'}
            onClick={() => setStatusFilter('approved')}
            className={`admin-tab-pill ${statusFilter === 'approved' ? 'active' : ''}`}
          >
            Đã duyệt
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === 'rejected'}
            onClick={() => setStatusFilter('rejected')}
            className={`admin-tab-pill ${statusFilter === 'rejected' ? 'active' : ''}`}
          >
            Đã từ chối
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
            className={`admin-tab-pill ${statusFilter === 'all' ? 'active' : ''}`}
          >
            Tất cả ({requests.length})
          </button>
        </div>
      </div>

      {/* 2. Requests List or Empty State */}
      {filteredRequests.length === 0 ? (
        <div
          className="admin-card"
          style={{
            padding: '60px 20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              backgroundColor: '#DCFCE7',
              color: '#15803D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            <CheckCircle size={38} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>
            {statusFilter === 'pending'
              ? 'Không có hồ sơ nào đang chờ duyệt!'
              : 'Chưa có dữ liệu hồ sơ phù hợp'}
          </h3>
          <p style={{ fontSize: '13.5px', color: '#64748B', maxWidth: '420px', margin: 0, lineHeight: 1.5 }}>
            {statusFilter === 'pending'
              ? 'Tuyệt vời! Toàn bộ hồ sơ định danh điện tử eKYC trên hệ thống đã được kiểm tra và xử lý hoàn tất.'
              : 'Hãy chuyển qua tab "Tất cả" hoặc chờ người dùng mới gửi hồ sơ định danh.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredRequests.map((req) => (
            <div
              key={req._id}
              className="admin-card"
              style={{
                padding: '24px',
                borderLeft:
                  req.status === 'pending'
                    ? '4px solid #EAB308'
                    : req.status === 'approved'
                    ? '4px solid #22C55E'
                    : '4px solid #EF4444',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                {/* Applicant Info */}
                <div style={{ display: 'flex', gap: '16px' }}>
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
                    }}
                  >
                    <User size={24} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: 800, color: '#0F172A' }}>
                        {req.fullName}
                      </h3>
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
                        }}
                      >
                        {req.status === 'pending'
                          ? '⏳ Chờ duyệt'
                          : req.status === 'approved'
                          ? '✓ Đã cấp tích xanh'
                          : '✕ Đã từ chối'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '6px', fontSize: '13px', color: '#64748B', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CreditCard size={14} style={{ color: '#67BEC3' }} />
                        Số CCCD: <strong style={{ color: '#0F172A' }}>{req.idCardNumber}</strong>
                      </span>
                      <span>•</span>
                      <span>SĐT: {req.phone}</span>
                      <span>•</span>
                      <span>Email: {req.email}</span>
                      <span>•</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={14} style={{ color: '#94A3B8' }} />
                        {req.address}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions (if pending) */}
                {req.status === 'pending' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setRejectModalReq(req)}
                      disabled={actionLoadingId === req._id}
                      className="admin-btn admin-btn-danger"
                      style={{ padding: '8px 16px' }}
                    >
                      <XCircle size={15} />
                      <span>Từ chối</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApprove(req._id)}
                      disabled={actionLoadingId === req._id}
                      className="admin-btn admin-btn-success"
                      style={{ padding: '8px 18px', backgroundColor: '#67BEC3', color: '#FFFFFF', borderColor: '#4CA6AC' }}
                    >
                      <CheckCircle size={15} />
                      <span>Duyệt & Cấp Tích Xanh</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 3 Preview Images (Front, Back, Selfie) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                {/* 1. Mặt trước CCCD */}
                <div
                  style={{
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    overflow: 'hidden',
                    backgroundColor: '#F8FAFC',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                  onClick={() => setLightboxImage({ url: req.idCardFrontUrl, title: `CCCD Mặt Trước - ${req.fullName}` })}
                >
                  <div style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 700, color: '#475569', backgroundColor: '#F1F5F9', display: 'flex', justifyContent: 'space-between' }}>
                    <span>1. Mặt trước CCCD</span>
                    <ZoomIn size={14} style={{ color: '#67BEC3' }} />
                  </div>
                  <img
                    src={req.idCardFrontUrl}
                    alt="CCCD mặt trước"
                    style={{ width: '100%', height: '140px', objectFit: 'cover' }}
                  />
                </div>

                {/* 2. Mặt sau CCCD */}
                <div
                  style={{
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    overflow: 'hidden',
                    backgroundColor: '#F8FAFC',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                  onClick={() => setLightboxImage({ url: req.idCardBackUrl, title: `CCCD Mặt Sau - ${req.fullName}` })}
                >
                  <div style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 700, color: '#475569', backgroundColor: '#F1F5F9', display: 'flex', justifyContent: 'space-between' }}>
                    <span>2. Mặt sau CCCD</span>
                    <ZoomIn size={14} style={{ color: '#67BEC3' }} />
                  </div>
                  <img
                    src={req.idCardBackUrl}
                    alt="CCCD mặt sau"
                    style={{ width: '100%', height: '140px', objectFit: 'cover' }}
                  />
                </div>

                {/* 3. Ảnh chân dung Selfie */}
                <div
                  style={{
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    overflow: 'hidden',
                    backgroundColor: '#F8FAFC',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                  onClick={() => setLightboxImage({ url: req.selfieUrl, title: `Chân dung đối soát Selfie - ${req.fullName}` })}
                >
                  <div style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 700, color: '#475569', backgroundColor: '#F1F5F9', display: 'flex', justifyContent: 'space-between' }}>
                    <span>3. Chân dung cầm CCCD</span>
                    <ZoomIn size={14} style={{ color: '#67BEC3' }} />
                  </div>
                  <img
                    src={req.selfieUrl}
                    alt="Ảnh chân dung selfie"
                    style={{ width: '100%', height: '140px', objectFit: 'cover' }}
                  />
                </div>
              </div>

              {/* Reject Reason Display if rejected */}
              {req.status === 'rejected' && req.rejectReason && (
                <div style={{ marginTop: '14px', padding: '10px 14px', borderRadius: '10px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#991B1B' }}>
                  <AlertCircle size={16} />
                  <span>Lý do từ chối: <strong>{req.rejectReason}</strong></span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* LIGHTBOX MODAL: Phóng to ảnh tài liệu CCCD/Selfie */}
      {lightboxImage && (
        <div className="admin-modal-overlay" onClick={() => setLightboxImage(null)}>
          <div className="admin-modal-card" style={{ maxWidth: '720px', padding: '20px' }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header" style={{ marginBottom: '12px' }}>
              <h3 className="admin-modal-title" style={{ fontSize: '16px' }}>{lightboxImage.title}</h3>
              <button onClick={() => setLightboxImage(null)} style={{ cursor: 'pointer', color: '#94A3B8' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ backgroundColor: '#0F172A', borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src={lightboxImage.url}
                alt={lightboxImage.title}
                className="admin-lightbox-img"
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={() => setLightboxImage(null)}
              >
                Đóng ảnh phóng to
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT REASON MODAL */}
      {rejectModalReq && (
        <div className="admin-modal-overlay" onClick={() => setRejectModalReq(null)}>
          <div className="admin-modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <XCircle size={20} style={{ color: '#DC2626' }} />
                <h3 className="admin-modal-title">Từ chối hồ sơ eKYC</h3>
              </div>
              <button onClick={() => setRejectModalReq(null)} style={{ cursor: 'pointer', color: '#94A3B8' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#475569', marginBottom: '12px' }}>
              Vui lòng nhập lý do từ chối để gửi thông báo hướng dẫn bổ sung lại cho ứng viên{' '}
              <strong>{rejectModalReq.fullName}</strong>:
            </p>

            <textarea
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                color: '#0F172A',
                outline: 'none',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
              placeholder="Nhập lý do chi tiết..."
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
              <button
                type="button"
                className="admin-btn admin-btn-outline"
                onClick={() => setRejectModalReq(null)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-danger"
                onClick={handleConfirmReject}
              >
                Xác nhận Từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEkycTab;

