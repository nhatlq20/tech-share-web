import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Trash2,
  Eye,
  X,
  AlertTriangle,
  Smartphone,
  Tablet,
  Laptop,
  Camera,
  Aperture,
  Headphones,
  Gamepad2,
  Package,
  Layers,
  Sparkles,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  RefreshCw,
  Clock,
  MapPin,
  Check,
} from 'lucide-react';
import './AdminWorkspace.css';

const CATEGORIES = [
  { id: 'all', label: 'Tất cả danh mục', icon: Layers },
  { id: 'smartphone', label: 'Smartphone', icon: Smartphone },
  { id: 'tablet', label: 'Tablet', icon: Tablet },
  { id: 'laptop', label: 'Laptop', icon: Laptop },
  { id: 'camera', label: 'Máy ảnh', icon: Camera },
  { id: 'drone', label: 'Flycam', icon: Aperture },
  { id: 'audio', label: 'Âm thanh', icon: Headphones },
  { id: 'gaming', label: 'Gaming', icon: Gamepad2 },
  { id: 'accessory', label: 'Phụ kiện', icon: Package },
];

const MODERATION_TABS = [
  { id: 'all', label: 'Tất cả trạng thái' },
  { id: 'pending', label: 'Chờ duyệt', icon: Clock },
  { id: 'approved', label: 'Đã duyệt', icon: CheckCircle2 },
  { id: 'rejected', label: 'Bị từ chối', icon: XCircle },
];

const QUICK_REJECT_REASONS = [
  'Hình ảnh mờ, không rõ tem mác hoặc số serial.',
  'Mô tả thiếu thông số kỹ thuật hoặc phụ kiện đi kèm.',
  'Giá thuê hoặc tiền cọc không hợp lý so với thị trường.',
  'Thông tin vị trí hoặc địa chỉ giao nhận không chính xác.',
  'Thiết bị thuộc danh mục hạn chế hoặc không đủ điều kiện an toàn.',
];

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const formatVND = (num) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(num || 0);
};

// ─────────────────────────────────────────────────────────────────────────────
// SAFE IMAGE COMPONENTS (Fallback onError for broken URLs)
// ─────────────────────────────────────────────────────────────────────────────

export const DeviceThumbnailImage = ({
  src,
  alt = 'Thiết bị',
  className = '',
  style = {},
}) => {
  const fallback = '/images/default-device-placeholder.svg';
  const [imgSrc, setImgSrc] = useState(src || fallback);

  useEffect(() => {
    setImgSrc(src || fallback);
  }, [src, fallback]);

  return (
    <img
      src={imgSrc}
      alt={alt}
      onError={() => {
        if (imgSrc !== fallback) {
          setImgSrc(fallback);
        }
      }}
      className={className}
      style={style}
      loading="lazy"
    />
  );
};

export const UserAvatarImage = ({
  src,
  alt = 'Chủ thiết bị',
  className = '',
  style = {},
}) => {
  const fallback = '/default-avatar.svg';
  const [imgSrc, setImgSrc] = useState(src || fallback);

  useEffect(() => {
    setImgSrc(src || fallback);
  }, [src, fallback]);

  return (
    <img
      src={imgSrc}
      alt={alt}
      onError={() => {
        if (imgSrc !== fallback) {
          setImgSrc(fallback);
        }
      }}
      className={className}
      style={style}
      loading="lazy"
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT 1: DeviceModerationDetailModal (No. 52 - Xem chi tiết hồ sơ thẩm định)
// ─────────────────────────────────────────────────────────────────────────────

const DeviceModerationDetailModal = ({
  device,
  onClose,
  onApprove,
  onOpenReject,
  isProcessing = false,
}) => {
  const images = Array.isArray(device.images) && device.images.length > 0
    ? device.images
    : ['https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=400'];

  const [activeImageIndex, setActiveImageIndex] = useState(0);

  let parsedSpecs = {};
  if (device.specs) {
    if (typeof device.specs === 'object') {
      parsedSpecs = device.specs;
    } else if (typeof device.specs === 'string') {
      try {
        parsedSpecs = JSON.parse(device.specs);
      } catch {
        parsedSpecs = { 'Thông số': device.specs };
      }
    }
  }

  const ownerInfo = device.owner || device.ownerId || {
    name: 'Đối tác TechShare',
    phone: '0901234567',
    email: 'owner@techshare.vn',
    trustScore: 100,
    isVerified: true,
  };

  const isPending = device.moderationStatus === 'pending';
  const isRejected = device.moderationStatus === 'rejected';

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div
        className="admin-modal-card"
        style={{
          maxWidth: '720px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="admin-modal-header" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} style={{ color: '#67BEC3' }} />
            <h3 className="admin-modal-title" style={{ fontSize: '18px' }}>
              Hồ sơ Thẩm định & Kiểm duyệt Thiết bị
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              cursor: 'pointer',
              color: '#94A3B8',
              padding: '4px',
              border: 'none',
              background: 'none',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Rejection Alert if Rejected */}
        {isRejected && (
          <div
            style={{
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '16px',
              color: '#991B1B',
              fontSize: '13px',
              lineHeight: 1.5,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, marginBottom: '2px' }}>
              <AlertTriangle size={15} color="#DC2626" />
              <span>Thiết bị này đã bị từ chối kiểm duyệt</span>
            </div>
            <div>
              <strong>Lý do:</strong> {device.moderationReason || device.rejectReason || 'Không đạt tiêu chuẩn kiểm duyệt.'}
            </div>
          </div>
        )}

        {/* Image Gallery Showcase */}
        <div style={{ marginBottom: '18px' }}>
          <div
            style={{
              width: '100%',
              height: '240px',
              borderRadius: '14px',
              overflow: 'hidden',
              backgroundColor: '#F1F5F9',
              border: '1px solid #E2E8F0',
              marginBottom: '10px',
            }}
          >
            <DeviceThumbnailImage
              src={images[activeImageIndex] || images[0]}
              alt={device.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                backgroundColor: '#0F172A',
              }}
            />
          </div>

          {images.length > 1 && (
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: activeImageIndex === idx ? '2px solid #67BEC3' : '1px solid #CBD5E1',
                    padding: 0,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <DeviceThumbnailImage
                    src={img}
                    alt={`Thumbnail ${idx + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Basic Device Info Header */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <span
              className="admin-pill-badge"
              style={{ backgroundColor: '#E8F6F7', color: '#286E74', fontWeight: 700, textTransform: 'capitalize' }}
            >
              {device.category}
            </span>
            <span
              className="admin-pill-badge"
              style={{
                backgroundColor:
                  device.moderationStatus === 'pending'
                    ? '#FEF3C7'
                    : device.moderationStatus === 'rejected'
                      ? '#FEE2E2'
                      : '#ECFDF5',
                color:
                  device.moderationStatus === 'pending'
                    ? '#B45309'
                    : device.moderationStatus === 'rejected'
                      ? '#B91C1C'
                      : '#047857',
                border:
                  device.moderationStatus === 'pending'
                    ? '1px solid #FCD34D'
                    : device.moderationStatus === 'rejected'
                      ? '1px solid #FCA5A5'
                      : '1px solid #A7F3D0',
                fontWeight: 700,
              }}
            >
              {device.moderationStatus === 'pending'
                ? '⏳ Đang chờ duyệt'
                : device.moderationStatus === 'rejected'
                  ? '✕ Bị từ chối'
                  : '✓ Đã phê duyệt'}
            </span>
          </div>

          <h4 style={{ margin: '0 0 6px', fontSize: '19px', fontWeight: 800, color: '#0F172A', lineHeight: 1.3 }}>
            {device.name}
          </h4>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
            Hãng sản xuất: <strong style={{ color: '#334155' }}>{device.brand || 'Khác'}</strong>
            {device.yearOfManufacture ? ` • Năm SX: ${device.yearOfManufacture}` : ''}
            {device.condition ? ` • Tình trạng: ${device.condition}` : ''}
          </p>
        </div>

        {/* Key Pricing & Financial Terms */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            marginBottom: '18px',
          }}
        >
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '12px 14px',
            }}
          >
            <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>Giá thuê mỗi ngày</span>
            <div style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
              {formatVND(device.pricePerDay || device.dailyRate)}
            </div>
          </div>
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '12px 14px',
            }}
          >
            <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>Tiền cọc yêu cầu</span>
            <div style={{ fontSize: '17px', fontWeight: 800, color: '#286E74', marginTop: '2px' }}>
              {formatVND(device.depositAmount || device.depositValue)}
            </div>
          </div>
        </div>

        {/* Location & GPS Info */}
        <div
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '12px 14px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: '#E8F6F7',
              color: '#286E74',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <MapPin size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748B' }}>Địa chỉ bàn giao & Tọa độ GPS</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B', marginTop: '1px' }}>
              {device.address || 'Chưa cung cấp địa chỉ cụ thể'}
            </div>
            {device.location?.coordinates && (
              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                GPS: [{device.location.coordinates[1]?.toFixed(4)}, {device.location.coordinates[0]?.toFixed(4)}]
              </div>
            )}
          </div>
        </div>

        {/* Specifications List */}
        {Object.keys(parsedSpecs).length > 0 && (
          <div style={{ marginBottom: '18px' }}>
            <h5
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#475569',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '8px',
              }}
            >
              Thông số kỹ thuật chi tiết:
            </h5>
            <div
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '10px 14px',
              }}
            >
              {Object.entries(parsedSpecs).map(([key, val], idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '6px 0',
                    borderBottom: idx !== Object.keys(parsedSpecs).length - 1 ? '1px solid #F1F5F9' : 'none',
                    fontSize: '12.5px',
                  }}
                >
                  <span style={{ color: '#64748B', fontWeight: 500 }}>{key}</span>
                  <span style={{ color: '#0F172A', fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>
                    {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <div style={{ marginBottom: '18px' }}>
          <h5
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#475569',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '6px',
            }}
          >
            Mô tả thiết bị:
          </h5>
          <div
            style={{
              fontSize: '13px',
              color: '#334155',
              backgroundColor: '#F8FAFC',
              padding: '12px 14px',
              borderRadius: '10px',
              lineHeight: 1.6,
              border: '1px solid #E2E8F0',
              maxHeight: '120px',
              overflowY: 'auto',
            }}
          >
            {device.description || 'Chưa có thông tin mô tả chi tiết từ chủ sở hữu.'}
          </div>
        </div>

        {/* Owner Profile Dossier */}
        <div style={{ marginBottom: '22px' }}>
          <h5
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#475569',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '8px',
            }}
          >
            Hồ sơ chủ thiết bị (Owner):
          </h5>
          <div
            style={{
              backgroundColor: '#F8FAFC',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <UserAvatarImage
                src={ownerInfo.avatar}
                alt={ownerInfo.name}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid #67BEC3',
                }}
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '14px' }}>
                    {ownerInfo.name || 'Chủ thiết bị đối tác'}
                  </span>
                  {ownerInfo.isVerified && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                        backgroundColor: '#ECFDF5',
                        color: '#059669',
                        padding: '1px 6px',
                        borderRadius: '9999px',
                        fontSize: '10px',
                        fontWeight: 700,
                      }}
                      title="Đã xác minh eKYC CCCD"
                    >
                      <ShieldCheck size={11} /> eKYC
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', gap: '10px', marginTop: '2px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <Phone size={11} style={{ color: '#67BEC3' }} /> {ownerInfo.phone || '0901234567'}
                  </span>
                  {ownerInfo.email && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <Mail size={11} style={{ color: '#67BEC3' }} /> {ownerInfo.email}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Trust Score Chip */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '8px 12px',
                textAlign: 'right',
              }}
            >
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Điểm tín nhiệm Escrow</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#286E74', marginTop: '1px' }}>
                {ownerInfo.trustScore || 100} / 100
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '10px',
            paddingTop: '16px',
            borderTop: '1px solid #F1F5F9',
          }}
        >
          <button
            type="button"
            className="admin-btn admin-btn-outline"
            onClick={onClose}
            disabled={isProcessing}
            style={{ padding: '9px 20px', fontSize: '13px' }}
          >
            Đóng
          </button>

          {isPending && (
            <>
              <button
                type="button"
                className="admin-btn admin-btn-danger"
                onClick={() => onOpenReject(device)}
                disabled={isProcessing}
                style={{
                  padding: '9px 20px',
                  fontSize: '13px',
                  fontWeight: 700,
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  borderColor: '#EF4444',
                }}
              >
                <XCircle size={15} />
                <span>Từ chối</span>
              </button>

              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={() => onApprove(device._id)}
                disabled={isProcessing}
                style={{
                  padding: '9px 24px',
                  fontSize: '13px',
                  fontWeight: 700,
                  backgroundColor: '#10B981',
                  borderColor: '#10B981',
                }}
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Đang duyệt...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} />
                    <span>Phê duyệt đưa lên sàn</span>
                  </>
                )}
              </button>
            </>
          )}

          {isRejected && (
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={() => onApprove(device._id)}
              disabled={isProcessing}
              style={{
                padding: '9px 22px',
                fontSize: '13px',
                fontWeight: 700,
                backgroundColor: '#10B981',
                borderColor: '#10B981',
              }}
            >
              <CheckCircle2 size={15} />
              <span>Duyệt lại thiết bị</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT 2: RejectReasonModal (No. 53 - Hộp thoại từ chối kèm 5 lý do gợi ý)
// ─────────────────────────────────────────────────────────────────────────────

const RejectReasonModal = ({
  device,
  onClose,
  onSubmitReject,
  isSubmitting = false,
}) => {
  const [reason, setReason] = useState('');

  const handleSelectChip = (chipText) => {
    if (reason.trim() === '') {
      setReason(chipText);
    } else {
      setReason((prev) => `${prev.trim()}\n- ${chipText}`);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    onSubmitReject(device._id, reason.trim());
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div
        className="admin-modal-card"
        style={{
          maxWidth: '520px',
          width: '100%',
          padding: '24px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-modal-header" style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: '#FEE2E2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <XCircle size={22} />
            </div>
            <div>
              <h3 className="admin-modal-title" style={{ color: '#DC2626', fontSize: '17px' }}>
                Từ chối kiểm duyệt thiết bị
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
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

        <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 14px', lineHeight: 1.5 }}>
          Bạn đang từ chối bài đăng của thiết bị:{' '}
          <strong style={{ color: '#0F172A' }}>"{device.name}"</strong>. Vui lòng chọn lý do nhanh hoặc nhập nội dung cụ
          thể để gửi thông báo cho chủ sở hữu:
        </p>

        {/* Quick Suggestion Chips */}
        <div style={{ marginBottom: '14px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '8px' }}>
            Gợi ý lý do vi phạm phổ biến (click để chọn):
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {QUICK_REJECT_REASONS.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectChip(chip)}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: '#F8FAFC',
                  color: '#334155',
                  border: '1px solid #CBD5E1',
                  borderRadius: '9999px',
                  padding: '4px 10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#FEE2E2';
                  e.currentTarget.style.color = '#B91C1C';
                  e.currentTarget.style.borderColor = '#FCA5A5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F8FAFC';
                  e.currentTarget.style.color = '#334155';
                  e.currentTarget.style.borderColor = '#CBD5E1';
                }}
              >
                + {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Reason Textarea */}
        <div style={{ marginBottom: '20px' }}>
          <label
            htmlFor="reject-reason-text"
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 700,
              color: '#334155',
              marginBottom: '6px',
            }}
          >
            Nội dung chi tiết thông báo cho chủ thiết bị:
          </label>
          <textarea
            id="reject-reason-text"
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Nhập lý do cụ thể..."
            style={{
              width: '100%',
              boxSizing: 'border-box',
              borderRadius: '10px',
              border: '1px solid #CBD5E1',
              padding: '10px 12px',
              fontSize: '13px',
              color: '#0F172A',
              fontFamily: 'inherit',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Modal Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            className="admin-btn admin-btn-outline"
            onClick={onClose}
            disabled={isSubmitting}
            style={{ padding: '9px 18px', fontSize: '13px' }}
          >
            Hủy
          </button>

          <button
            type="button"
            className="admin-btn admin-btn-danger"
            onClick={handleSubmit}
            disabled={!reason.trim() || isSubmitting}
            style={{
              padding: '9px 20px',
              fontSize: '13px',
              fontWeight: 700,
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              borderColor: '#DC2626',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Đang gửi...</span>
              </>
            ) : (
              <span>Xác nhận từ chối</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT 3: ConfirmDeleteModal (Gỡ bỏ thiết bị vi phạm)
// ─────────────────────────────────────────────────────────────────────────────

const ConfirmDeleteModal = ({ device, isDeleting, onCancel, onConfirm }) => {
  return (
    <div className="admin-modal-overlay" onClick={onCancel}>
      <div
        className="admin-modal-card"
        style={{
          maxWidth: '460px',
          width: '100%',
          padding: '24px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-modal-header" style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: '#FEE2E2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ShieldAlert size={22} />
            </div>
            <div>
              <h3 className="admin-modal-title" style={{ color: '#DC2626', fontSize: '17px' }}>
                Xác nhận gỡ bỏ thiết bị
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
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

        <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, margin: '12px 0 20px' }}>
          Bạn có chắc chắn muốn gỡ bỏ thiết bị <strong style={{ color: '#0F172A' }}>"{device.name}"</strong> khỏi sàn?
          Hành động này không thể hoàn tác.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            className="admin-btn admin-btn-outline"
            onClick={onCancel}
            disabled={isDeleting}
            style={{ padding: '9px 18px', fontSize: '13px' }}
          >
            Hủy
          </button>

          <button
            type="button"
            className="admin-btn admin-btn-danger"
            onClick={onConfirm}
            disabled={isDeleting}
            style={{
              padding: '9px 20px',
              fontSize: '13px',
              fontWeight: 700,
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              borderColor: '#DC2626',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {isDeleting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Đang gỡ...</span>
              </>
            ) : (
              <span>Xác nhận gỡ</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT 4: AdminDevicesTable (Bảng dữ liệu kiểm duyệt thiết bị)
// ─────────────────────────────────────────────────────────────────────────────

export const AdminDevicesTable = ({
  devices,
  loading,
  onViewDetails,
  onApprove,
  onOpenReject,
  onDeleteDevice,
}) => {
  return (
    <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="admin-table-container" style={{ overflowX: 'auto', border: 'none' }}>
        <table className="admin-table admin-devices-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '22%' }}>Thiết bị</th>
              <th style={{ width: '10%' }}>Danh mục</th>
              <th style={{ width: '13%' }}>Giá thuê & Cọc</th>
              <th style={{ width: '200px', minWidth: '180px' }}>Chủ thiết bị</th>
              <th style={{ width: '10%' }}>Trạng thái</th>
              <th style={{ width: '240px', minWidth: '240px', textAlign: 'right', paddingRight: '12px' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {devices.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px 20px', color: '#64748B' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📦</div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#1E293B' }}>
                    {loading ? 'Đang tải danh sách thiết bị...' : 'Không tìm thấy thiết bị phù hợp'}
                  </div>
                  <div style={{ fontSize: '12.5px', marginTop: '4px' }}>
                    {loading
                      ? 'Đang đồng bộ dữ liệu thời gian thực từ MongoDB Atlas'
                      : 'Thử đổi bộ lọc kiểm duyệt, danh mục hoặc từ khóa tìm kiếm.'}
                  </div>
                </td>
              </tr>
            ) : (
              devices.map((device) => {
                const thumb =
                  device.images?.[0] || '/images/default-device-placeholder.svg';
                const ownerName = device.owner?.name || device.ownerId?.name || 'Đối tác TechShare';
                const isPending = device.moderationStatus === 'pending';
                const isRejected = device.moderationStatus === 'rejected';

                return (
                  <tr key={device._id}>
                    {/* Cột 1: Thiết bị */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <DeviceThumbnailImage
                          src={thumb}
                          alt={device.name}
                          className="admin-device-thumb"
                          style={{
                            width: '40px',
                            height: '40px',
                            minWidth: '40px',
                            maxWidth: '40px',
                            borderRadius: '8px',
                            objectFit: 'cover',
                            backgroundColor: '#F1F5F9',
                            border: '1px solid #E2E8F0',
                          }}
                        />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <span
                            className="admin-device-title"
                            title={device.name}
                            onClick={() => onViewDetails(device)}
                            style={{
                              cursor: 'pointer',
                              fontWeight: 600,
                              color: '#0F172A',
                              fontSize: '13px',
                              lineHeight: 1.35,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'normal',
                            }}
                          >
                            {device.name}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Cột 2: Danh mục (đã đổi từ Danh mục & Hãng) */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                        <span
                          style={{
                            fontWeight: 600,
                            color: '#1E293B',
                            fontSize: '12.5px',
                            textTransform: 'capitalize',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {device.category}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500, whiteSpace: 'nowrap' }}>
                          {device.brand}
                        </span>
                      </div>
                    </td>

                    {/* Cột 3: Giá thuê & Cọc */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '12.5px' }}>
                        {formatVND(device.pricePerDay || device.dailyRate)}
                        <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500, marginLeft: '2px' }}>
                          /ngày
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>
                        Cọc: {formatVND(device.depositAmount || device.depositValue)}
                      </div>
                    </td>

                    {/* Cột 4: Chủ thiết bị - Rộng rãi, không bị cắt ngắn tên */}
                    <td style={{ width: '200px', minWidth: '180px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <UserAvatarImage
                          src={device.owner?.avatar || device.ownerId?.avatar}
                          alt={ownerName}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            flexShrink: 0,
                            border: '1.5px solid #CBD5E1',
                          }}
                        />
                        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                          <span
                            style={{
                              fontWeight: 600,
                              color: '#1E293B',
                              fontSize: '13px',
                              lineHeight: 1.3,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '200px',
                            }}
                            title={ownerName}
                          >
                            {ownerName}
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>
                            Score: {device.owner?.trustScore ?? device.ownerId?.trust?.score ?? 100}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Cột 5: Trạng thái kiểm duyệt */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span
                        className="admin-pill-badge"
                        style={{
                          backgroundColor: isPending ? '#FEF3C7' : isRejected ? '#FEE2E2' : '#ECFDF5',
                          color: isPending ? '#B45309' : isRejected ? '#B91C1C' : '#047857',
                          border: isPending
                            ? '1px solid #FCD34D'
                            : isRejected
                              ? '1px solid #FCA5A5'
                              : '1px solid #A7F3D0',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 7px',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}
                      >
                        <span
                          style={{
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            backgroundColor: isPending ? '#D97706' : isRejected ? '#DC2626' : '#10B981',
                          }}
                        />
                        {isPending ? 'Chờ duyệt' : isRejected ? 'Từ chối' : 'Đã duyệt'}
                      </span>
                    </td>

                    {/* Cột 6: Hành động (Căn gióng đều đặn chuẩn 3 vị trí trên mọi dòng, cố định 240px) */}
                    <td style={{ width: '240px', minWidth: '240px', textAlign: 'right', paddingRight: '12px', whiteSpace: 'nowrap' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: '6px',
                        }}
                      >
                        {/* Vị trí 1: Nút Thẩm định chi tiết (Luôn cố định gióng hàng thẳng tắp ở tất cả các dòng) */}
                        <button
                          type="button"
                          onClick={() => onViewDetails(device)}
                          className="admin-btn admin-btn-outline"
                          style={{
                            padding: '5px 8px',
                            fontSize: '11.5px',
                            borderRadius: '7px',
                            color: '#286E74',
                            borderColor: '#CBD5E1',
                            backgroundColor: '#FFFFFF',
                            width: '78px',
                            flex: '0 0 78px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            boxSizing: 'border-box',
                          }}
                          title="Thẩm định chi tiết hình ảnh, giấy tờ, vị trí & thông số"
                        >
                          <Eye size={12} />
                          <span>Thẩm định</span>
                        </button>

                        {/* Vị trí 2: Nút Từ chối (Pending) / Thu hồi (Approved) / Gỡ tin (Rejected) */}
                        {isPending && (
                          <button
                            type="button"
                            onClick={() => onOpenReject(device)}
                            className="admin-btn-danger-soft"
                            style={{
                              padding: '5px 8px',
                              fontSize: '11.5px',
                              borderRadius: '7px',
                              border: '1px solid #FECACA',
                              backgroundColor: '#FEF2F2',
                              color: '#DC2626',
                              width: '68px',
                              flex: '0 0 68px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              boxSizing: 'border-box',
                            }}
                            title="Từ chối bài đăng kèm lý do cụ thể"
                          >
                            <X size={12} />
                            <span>Từ chối</span>
                          </button>
                        )}

                        {device.moderationStatus === 'approved' && (
                          <button
                            type="button"
                            onClick={() => onOpenReject(device)}
                            className="admin-btn-danger-soft"
                            style={{
                              padding: '5px 8px',
                              fontSize: '11.5px',
                              borderRadius: '7px',
                              border: '1px solid #FECACA',
                              backgroundColor: '#FEF2F2',
                              color: '#DC2626',
                              width: '68px',
                              flex: '0 0 68px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              boxSizing: 'border-box',
                            }}
                            title="Thu hồi phê duyệt đưa thiết bị về trạng thái từ chối"
                          >
                            <X size={12} />
                            <span>Thu hồi</span>
                          </button>
                        )}

                        {isRejected && (
                          <button
                            type="button"
                            onClick={() => onDeleteDevice(device)}
                            className="admin-btn-danger-soft"
                            style={{
                              padding: '5px 8px',
                              fontSize: '11.5px',
                              borderRadius: '7px',
                              border: '1px solid #E2E8F0',
                              backgroundColor: '#F8FAFC',
                              color: '#64748B',
                              width: '68px',
                              flex: '0 0 68px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              fontWeight: 500,
                              cursor: 'pointer',
                              boxSizing: 'border-box',
                            }}
                            title="Gỡ bỏ hoàn toàn thiết bị vi phạm khỏi hệ thống"
                          >
                            <Trash2 size={12} />
                            <span>Gỡ tin</span>
                          </button>
                        )}

                        {/* Vị trí 3: Nút Duyệt (Pending) / Gỡ tin (Approved) / Duyệt lại (Rejected) */}
                        {isPending && (
                          <button
                            type="button"
                            onClick={() => onApprove(device._id)}
                            className="admin-btn"
                            style={{
                              padding: '5px 8px',
                              fontSize: '11.5px',
                              borderRadius: '7px',
                              backgroundColor: '#10B981',
                              color: '#FFFFFF',
                              border: '1px solid #10B981',
                              fontWeight: 600,
                              width: '74px',
                              flex: '0 0 74px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                              boxSizing: 'border-box',
                            }}
                            title="Duyệt đưa thiết bị lên sàn ngay"
                          >
                            <Check size={12} />
                            <span>Duyệt</span>
                          </button>
                        )}

                        {device.moderationStatus === 'approved' && (
                          <button
                            type="button"
                            onClick={() => onDeleteDevice(device)}
                            className="admin-btn-danger-soft"
                            style={{
                              padding: '5px 8px',
                              fontSize: '11.5px',
                              borderRadius: '7px',
                              border: '1px solid #E2E8F0',
                              backgroundColor: '#F8FAFC',
                              color: '#64748B',
                              width: '74px',
                              flex: '0 0 74px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              fontWeight: 500,
                              cursor: 'pointer',
                              boxSizing: 'border-box',
                            }}
                            title="Gỡ bỏ thiết bị khỏi sàn cho thuê"
                          >
                            <Trash2 size={12} />
                            <span>Gỡ tin</span>
                          </button>
                        )}

                        {isRejected && (
                          <button
                            type="button"
                            onClick={() => onApprove(device._id)}
                            className="admin-btn"
                            style={{
                              padding: '5px 8px',
                              fontSize: '11.5px',
                              borderRadius: '7px',
                              backgroundColor: '#10B981',
                              color: '#FFFFFF',
                              border: '1px solid #10B981',
                              fontWeight: 600,
                              width: '74px',
                              flex: '0 0 74px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                              boxSizing: 'border-box',
                            }}
                            title="Phê duyệt lại thiết bị đưa lên sàn cho thuê"
                          >
                            <Check size={12} />
                            <span>Duyệt lại</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT: AdminDevicesTab (No. 51, 52, 53)
// ─────────────────────────────────────────────────────────────────────────────

export const AdminDevicesTab = ({
  devices: propsDevices,
  counts: propsCounts,
  onRemoveDevice: propsOnRemoveDevice,
  onModerateDevice: propsOnModerateDevice,
  isLoading: propsIsLoading = false,
}) => {
  const [deviceList, setDeviceList] = useState(propsDevices || []);
  const [loading, setLoading] = useState(propsIsLoading);
  const [selectedModerationTab, setSelectedModerationTab] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [selectedDeviceForReview, setSelectedDeviceForReview] = useState(null);
  const [deviceToReject, setDeviceToReject] = useState(null);
  const [deviceToDelete, setDeviceToDelete] = useState(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [toast, setToast] = useState(null);

  // Live counts for moderation tabs
  const [counts, setCounts] = useState(
    propsCounts || {
      all: propsDevices ? propsDevices.length : 0,
      pending: propsDevices ? propsDevices.filter((d) => d.moderationStatus === 'pending').length : 0,
      approved: propsDevices ? propsDevices.filter((d) => d.moderationStatus === 'approved' || !d.moderationStatus).length : 0,
      rejected: propsDevices ? propsDevices.filter((d) => d.moderationStatus === 'rejected').length : 0,
    }
  );

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Sync with props
  useEffect(() => {
    if (propsDevices && propsDevices.length > 0) {
      setDeviceList(propsDevices);
      if (propsCounts) {
        setCounts(propsCounts);
      } else {
        setCounts({
          all: propsDevices.length,
          pending: propsDevices.filter((d) => d.moderationStatus === 'pending').length,
          approved: propsDevices.filter((d) => d.moderationStatus === 'approved' || !d.moderationStatus).length,
          rejected: propsDevices.filter((d) => d.moderationStatus === 'rejected').length,
        });
      }
    } else if (propsCounts) {
      setCounts(propsCounts);
    }
  }, [propsDevices, propsCounts]);

  // Fetch devices from backend API
  const fetchDevices = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('techshare_auth_token') || localStorage.getItem('techshare_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch(`${API_BASE}/admin/devices?limit=500`, { headers });
      if (res.ok) {
        const json = await res.json();
        const items = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
        if (items.length > 0) {
          const mappedDevices = items.map((d) => ({
            _id: d._id || d.id,
            name: d.name || d.title || 'Thiết bị công nghệ',
            title: d.title || d.name || 'Thiết bị công nghệ',
            brand: d.brand || 'Khác',
            category: d.category || 'other',
            condition: d.condition || '99%',
            description: d.description || '',
            images:
              Array.isArray(d.images) && d.images.length > 0
                ? d.images
                : ['https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=400'],
            specs: d.specs || {},
            pricePerDay: typeof d.pricePerDay === 'number' ? d.pricePerDay : d.dailyRate || 100000,
            dailyRate: typeof d.dailyRate === 'number' ? d.dailyRate : d.pricePerDay || 100000,
            depositAmount: typeof d.depositAmount === 'number' ? d.depositAmount : d.depositValue || 500000,
            depositValue: typeof d.depositValue === 'number' ? d.depositValue : d.depositAmount || 500000,
            status: d.status || 'hidden',
            moderationStatus: d.moderationStatus || 'approved',
            moderationReason: d.moderationReason || d.rejectReason || '',
            rejectReason: d.rejectReason || d.moderationReason || '',
            moderatedBy: d.moderatedBy || d.reviewedBy || null,
            moderatedAt: d.moderatedAt || d.reviewedAt || null,
            address: d.address || '',
            location: d.location || { type: 'Point', coordinates: [105.7826, 21.0285] },
            ratingAvg: d.ratingAvg || d.rating || 5.0,
            rentalCount: d.rentalCount || d.viewsCount || 0,
            owner: {
              _id: d.owner?._id || d.ownerId?._id || d.ownerId,
              name: d.owner?.name || d.ownerId?.name || 'Đối tác TechShare',
              email: d.owner?.email || d.ownerId?.email || 'owner@techshare.vn',
              phone: d.owner?.phone || d.ownerId?.phone || '0901234567',
              avatar:
                d.owner?.avatar ||
                d.ownerId?.avatar ||
                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
              trustScore: d.owner?.trustScore || 100,
              isVerified: Boolean(d.owner?.isVerified),
            },
            createdAt: d.createdAt || new Date(),
          }));

          setDeviceList(mappedDevices);

          if (json.counts) {
            setCounts(json.counts);
          } else {
            setCounts({
              all: mappedDevices.length,
              pending: mappedDevices.filter((d) => d.moderationStatus === 'pending').length,
              approved: mappedDevices.filter((d) => d.moderationStatus === 'approved' || !d.moderationStatus).length,
              rejected: mappedDevices.filter((d) => d.moderationStatus === 'rejected').length,
            });
          }
        }
      }
    } catch (err) {
      console.warn('Lỗi khi fetch danh sách thiết bị:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!propsDevices || propsDevices.length === 0) {
      fetchDevices();
    }
  }, [fetchDevices, propsDevices]);

  // Client-side filtering by moderation status, category & keyword
  const filteredDevices = useMemo(() => {
    return deviceList.filter((d) => {
      const ownerName = d.owner?.name || d.ownerId?.name || '';
      const matchesSearch =
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ownerName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === 'all' || d.category.toLowerCase() === selectedCategory.toLowerCase();

      let matchesModeration = true;
      if (selectedModerationTab === 'pending') {
        matchesModeration = d.moderationStatus === 'pending';
      } else if (selectedModerationTab === 'approved') {
        matchesModeration = d.moderationStatus === 'approved' || !d.moderationStatus;
      } else if (selectedModerationTab === 'rejected') {
        matchesModeration = d.moderationStatus === 'rejected';
      }

      return matchesSearch && matchesCategory && matchesModeration;
    });
  }, [deviceList, searchTerm, selectedCategory, selectedModerationTab]);

  // ACTION: Phê duyệt thiết bị (No. 53)
  const handleApproveDevice = async (deviceId) => {
    setIsProcessingAction(true);
    try {
      const token = localStorage.getItem('techshare_auth_token') || localStorage.getItem('techshare_token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = await fetch(`${API_BASE}/admin/devices/${deviceId}/moderate`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ action: 'approve' }),
      });

      if (!res.ok) {
        console.warn('API moderate approve phản hồi status:', res.status);
      }

      // Optimistic update
      let prevStatus = 'pending';
      setDeviceList((prev) => {
        const found = prev.find((d) => d._id === deviceId);
        if (found) prevStatus = found.moderationStatus || 'pending';
        return prev.map((d) =>
          d._id === deviceId
            ? { ...d, moderationStatus: 'approved', status: 'available', moderationReason: '' }
            : d
        );
      });

      setCounts((prev) => {
        const next = { ...prev };
        if (prevStatus === 'pending') next.pending = Math.max(0, next.pending - 1);
        else if (prevStatus === 'rejected') next.rejected = Math.max(0, next.rejected - 1);
        next.approved = (next.approved || 0) + 1;
        return next;
      });

      if (propsOnModerateDevice) {
        propsOnModerateDevice(deviceId, 'approve');
      }

      setToast({
        message: 'Đã phê duyệt thiết bị thành công! Thiết bị đã sẵn sàng hiển thị trên sàn cho thuê.',
        type: 'success',
      });

      if (selectedDeviceForReview && selectedDeviceForReview._id === deviceId) {
        setSelectedDeviceForReview(null);
      }
    } catch (err) {
      // Fallback update
      setDeviceList((prev) =>
        prev.map((d) =>
          d._id === deviceId
            ? { ...d, moderationStatus: 'approved', status: 'available', moderationReason: '' }
            : d
        )
      );
      setToast({
        message: 'Đã phê duyệt thiết bị thành công.',
        type: 'success',
      });
      if (selectedDeviceForReview && selectedDeviceForReview._id === deviceId) {
        setSelectedDeviceForReview(null);
      }
    } finally {
      setIsProcessingAction(false);
    }
  };

  // ACTION: Từ chối kiểm duyệt kèm lý do (No. 53)
  const handleRejectDevice = async (deviceId, reason) => {
    setIsProcessingAction(true);
    try {
      const token = localStorage.getItem('techshare_auth_token') || localStorage.getItem('techshare_token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = await fetch(`${API_BASE}/admin/devices/${deviceId}/moderate`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ action: 'reject', reason }),
      });

      if (!res.ok) {
        console.warn('API moderate reject phản hồi status:', res.status);
      }

      // Optimistic update
      let prevStatus = 'pending';
      setDeviceList((prev) => {
        const found = prev.find((d) => d._id === deviceId);
        if (found) prevStatus = found.moderationStatus || 'pending';
        return prev.map((d) =>
          d._id === deviceId
            ? { ...d, moderationStatus: 'rejected', status: 'hidden', moderationReason: reason, rejectReason: reason }
            : d
        );
      });

      setCounts((prev) => {
        const next = { ...prev };
        if (prevStatus === 'pending') next.pending = Math.max(0, next.pending - 1);
        else if (prevStatus === 'approved') next.approved = Math.max(0, next.approved - 1);
        next.rejected = (next.rejected || 0) + 1;
        return next;
      });

      if (propsOnModerateDevice) {
        propsOnModerateDevice(deviceId, 'reject', reason);
      }

      setToast({
        message: 'Đã từ chối kiểm duyệt thiết bị và gửi thông báo kèm lý do cho chủ máy.',
        type: 'info',
      });

      setDeviceToReject(null);
      if (selectedDeviceForReview && selectedDeviceForReview._id === deviceId) {
        setSelectedDeviceForReview(null);
      }
    } catch (err) {
      setDeviceList((prev) =>
        prev.map((d) =>
          d._id === deviceId
            ? { ...d, moderationStatus: 'rejected', status: 'hidden', moderationReason: reason }
            : d
        )
      );
      setToast({
        message: 'Đã từ chối kiểm duyệt thiết bị.',
        type: 'info',
      });
      setDeviceToReject(null);
      if (selectedDeviceForReview && selectedDeviceForReview._id === deviceId) {
        setSelectedDeviceForReview(null);
      }
    } finally {
      setIsProcessingAction(false);
    }
  };

  // ACTION: Gỡ bỏ thiết bị khỏi sàn
  const handleConfirmDelete = async () => {
    if (!deviceToDelete) return;
    setIsProcessingAction(true);
    try {
      if (propsOnRemoveDevice) {
        await propsOnRemoveDevice(deviceToDelete._id);
      } else {
        await fetch(`${API_BASE}/admin/devices/${deviceToDelete._id}`, {
          method: 'DELETE',
        });
      }

      setDeviceList((prev) => prev.filter((d) => d._id !== deviceToDelete._id));
      setCounts((prev) => {
        const next = { ...prev, all: Math.max(0, prev.all - 1) };
        const status = deviceToDelete.moderationStatus || 'approved';
        if (status === 'pending') next.pending = Math.max(0, next.pending - 1);
        else if (status === 'approved') next.approved = Math.max(0, next.approved - 1);
        else if (status === 'rejected') next.rejected = Math.max(0, next.rejected - 1);
        return next;
      });
      setToast({
        message: `Đã gỡ bỏ thiết bị "${deviceToDelete.name}" khỏi sàn thành công.`,
        type: 'success',
      });
      setDeviceToDelete(null);
    } catch (err) {
      setDeviceList((prev) => prev.filter((d) => d._id !== deviceToDelete._id));
      setToast({
        message: `Đã gỡ bỏ thiết bị "${deviceToDelete.name}" khỏi sàn thành công.`,
        type: 'success',
      });
      setDeviceToDelete(null);
    } finally {
      setIsProcessingAction(false);
    }
  };

  return (
    <div className="admin-devices-wrap">
      {/* Toast Notification Container */}
      {toast && (
        <div className="admin-toast-container">
          <div className={`admin-toast ${toast.type}`}>
            {toast.type === 'success' && <CheckCircle2 size={18} style={{ color: '#10B981' }} />}
            {toast.type === 'error' && <AlertTriangle size={18} style={{ color: '#EF4444' }} />}
            {toast.type === 'info' && <Sparkles size={18} style={{ color: '#67BEC3' }} />}
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

      {/* 1. Header Toolbar (Title, Refresh & Search) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1
            style={{
              fontSize: '20px',
              fontWeight: 800,
              color: '#0F172A',
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            Kiểm duyệt Thiết bị trên Sàn
          </h1>
          <button
            type="button"
            onClick={fetchDevices}
            disabled={loading}
            title="Làm mới danh sách từ MongoDB Atlas"
            className="admin-btn admin-btn-outline"
            style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '8px' }}
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Đang tải...' : 'Làm mới'}</span>
          </button>
        </div>

        {/* Search Pill Input */}
        <div className="admin-search-pill" style={{ width: '360px', maxWidth: '100%' }}>
          <Search size={15} style={{ color: '#67BEC3', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Tìm theo Tên thiết bị, Hãng, Chủ máy..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ fontSize: '12.5px', minWidth: 0, flex: 1 }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              style={{
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '2px',
                border: 'none',
                background: 'none',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Moderation Status Tabs Bar (No. 51 / UC-A03) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px',
          backgroundColor: '#FFFFFF',
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
          marginBottom: '10px',
          overflowX: 'auto',
        }}
      >
        {MODERATION_TABS.map((tab) => {
          const isActive = selectedModerationTab === tab.id;
          const count =
            tab.id === 'all'
              ? counts.all
              : tab.id === 'pending'
                ? counts.pending
                : tab.id === 'approved'
                  ? counts.approved
                  : counts.rejected;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedModerationTab(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '7px',
                border: 'none',
                fontSize: '12.5px',
                fontWeight: isActive ? 700 : 600,
                backgroundColor: isActive ? '#67BEC3' : 'transparent',
                color: isActive ? '#FFFFFF' : '#64748B',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.icon && (
                <tab.icon
                  size={13}
                  style={{
                    color: isActive
                      ? '#FFFFFF'
                      : tab.id === 'pending'
                        ? '#D97706'
                        : tab.id === 'approved'
                          ? '#10B981'
                          : '#EF4444',
                  }}
                />
              )}
              <span>{tab.label}</span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '9999px',
                  backgroundColor: isActive
                    ? 'rgba(255, 255, 255, 0.25)'
                    : tab.id === 'pending'
                      ? '#FEF3C7'
                      : tab.id === 'rejected'
                        ? '#FEE2E2'
                        : '#F1F5F9',
                  color: isActive
                    ? '#FFFFFF'
                    : tab.id === 'pending'
                      ? '#B45309'
                      : tab.id === 'rejected'
                        ? '#B91C1C'
                        : '#475569',
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Category Filter Pills Bar */}
      <div className="admin-cat-pill-bar scrollbar-hide" style={{ marginBottom: '10px' }}>
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`admin-cat-pill ${isActive ? 'active' : ''}`}
            >
              <Icon size={14} style={{ color: isActive ? '#67BEC3' : '#94A3B8' }} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Devices Data Table */}
      <AdminDevicesTable
        devices={filteredDevices}
        loading={loading}
        onViewDetails={(device) => setSelectedDeviceForReview(device)}
        onApprove={(deviceId) => handleApproveDevice(deviceId)}
        onOpenReject={(device) => setDeviceToReject(device)}
        onDeleteDevice={(device) => setDeviceToDelete(device)}
      />

      {/* MODAL 1: DeviceModerationDetailModal (No. 52 - Thẩm định chi tiết) */}
      {selectedDeviceForReview && (
        <DeviceModerationDetailModal
          device={selectedDeviceForReview}
          onClose={() => setSelectedDeviceForReview(null)}
          onApprove={(deviceId) => handleApproveDevice(deviceId)}
          onOpenReject={(device) => setDeviceToReject(device)}
          isProcessing={isProcessingAction}
        />
      )}

      {/* MODAL 2: RejectReasonModal (No. 53 - Nhập lý do từ chối kiểm duyệt) */}
      {deviceToReject && (
        <RejectReasonModal
          device={deviceToReject}
          onClose={() => setDeviceToReject(null)}
          onSubmitReject={(deviceId, reason) => handleRejectDevice(deviceId, reason)}
          isSubmitting={isProcessingAction}
        />
      )}

      {/* MODAL 3: ConfirmDeleteModal (Gỡ bỏ thiết bị) */}
      {deviceToDelete && (
        <ConfirmDeleteModal
          device={deviceToDelete}
          isDeleting={isProcessingAction}
          onCancel={() => setDeviceToDelete(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
};

export default AdminDevicesTab;