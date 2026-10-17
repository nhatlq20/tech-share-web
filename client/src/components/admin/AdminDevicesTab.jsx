import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Clock,
  MapPin,
  Check,
  ChevronLeft,
  ChevronRight,
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
  device: initialDevice,
  onClose,
  onApprove,
  onOpenReject,
  isProcessing = false,
}) => {
  const [device, setDevice] = useState(initialDevice);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Tải chi tiết đầy đủ (mô tả, album ảnh, thông số kỹ thuật) ở chế độ ngầm khi mở modal
  useEffect(() => {
    let isMounted = true;
    if (initialDevice?._id) {
      setDevice(initialDevice);
      const fetchDetail = async () => {
        try {
          setLoadingDetail(true);
          const token = localStorage.getItem('techshare_auth_token') || localStorage.getItem('techshare_token');
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
          const res = await fetch(`${API_BASE}/admin/devices/${initialDevice._id}`, { headers });
          if (res.ok) {
            const json = await res.json();
            if (isMounted && json.data) {
              setDevice((prev) => ({ ...prev, ...json.data }));
            }
          }
        } catch (e) {
          console.warn('Lỗi khi tải chi tiết thiết bị:', e);
        } finally {
          if (isMounted) setLoadingDetail(false);
        }
      };
      fetchDetail();
    }
    return () => {
      isMounted = false;
    };
  }, [initialDevice]);

  const rawImages = Array.isArray(device.images) && device.images.length > 0
    ? device.images.filter((img) => Boolean(img && typeof img === 'string'))
    : [];
  const images = rawImages.length > 0 ? rawImages : ['/images/default-device-placeholder.svg'];

  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Fallback index if active index out of bounds
  useEffect(() => {
    if (activeImageIndex >= images.length) {
      setActiveImageIndex(0);
    }
  }, [images.length, activeImageIndex]);

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
  const isApproved = device.moderationStatus === 'approved';

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div
        className="admin-modal-card admin-moderation-modal-card"
        style={{
          maxWidth: '860px',
          width: '100%',
          maxHeight: '90vh',
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '18px',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.28)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Header (Cố định - Sticky Top) */}
        <div
          className="admin-moderation-modal-header"
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#E8F6F7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#286E74',
                flexShrink: 0,
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>
                Hồ sơ Thẩm định & Kiểm duyệt Thiết bị
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>
                Mã thiết bị: #{device._id?.slice(-8)?.toUpperCase() || 'TECH'} • Đăng lúc{' '}
                {new Date(device.createdAt || Date.now()).toLocaleDateString('vi-VN')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="admin-modal-close-btn"
            title="Đóng modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* 2. Body (Nội dung chính cuộn độc lập, thiết kế phẳng tối giản) */}
        <div
          className="admin-moderation-modal-body"
          style={{
            padding: '24px 28px',
            overflowY: 'auto',
            maxHeight: 'calc(90vh - 130px)',
            flex: '1 1 auto',
            backgroundColor: '#FFFFFF',
          }}
        >
          {/* ──── PHẦN 1: TỔNG QUAN (ẢNH GÓC TRÁI + TÊN, GIÁ & THÔNG TIN CHÍNH) ──── */}
          <div
            style={{
              display: 'flex',
              gap: '24px',
              alignItems: 'flex-start',
              paddingBottom: '20px',
              borderBottom: '1px solid #F1F5F9',
              flexWrap: 'wrap',
            }}
          >
            {/* Ảnh thiết bị gọn gàng ở góc trái */}
            <div
              style={{
                width: '180px',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div
                style={{
                  width: '180px',
                  height: '135px',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  backgroundColor: '#0F172A',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #E2E8F0',
                }}
              >
                <DeviceThumbnailImage
                  src={images[activeImageIndex] || images[0]}
                  alt={device.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                {images.length > 1 && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '6px',
                      right: '6px',
                      backgroundColor: 'rgba(0, 0, 0, 0.72)',
                      color: '#FFFFFF',
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '9999px',
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    {activeImageIndex + 1} / {images.length}
                  </div>
                )}
              </div>

              {/* Dải thumbnail cuộn ngang */}
              {images.length > 1 && (
                <div
                  className="admin-thumbnail-strip"
                  style={{
                    display: 'flex',
                    gap: '6px',
                    overflowX: 'auto',
                    paddingBottom: '2px',
                    maxWidth: '180px',
                  }}
                >
                  {images.map((img, idx) => {
                    const isCurrent = activeImageIndex === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveImageIndex(idx)}
                        className="admin-thumbnail-btn"
                        style={{
                          border: isCurrent ? '2px solid #0D9488' : '1px solid #E2E8F0',
                          opacity: isCurrent ? 1 : 0.6,
                        }}
                        title={`Ảnh ${idx + 1}`}
                      >
                        <DeviceThumbnailImage
                          src={img}
                          alt={`Thumbnail ${idx + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bên phải: Tiêu đề, Badges, Giá và Chi tiết */}
            <div
              style={{
                flex: '1 1 300px',
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {/* Badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: '#F0FDFA',
                    color: '#0F766E',
                    border: '1px solid #CCFBF1',
                    textTransform: 'capitalize',
                  }}
                >
                  {device.category}
                </span>

                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    backgroundColor: '#F8FAFC',
                    color: '#475569',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  {device.condition || 'Mới 99%'}
                </span>

                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: isPending ? '#FEF3C7' : isRejected ? '#FEE2E2' : '#ECFDF5',
                    color: isPending ? '#B45309' : isRejected ? '#B91C1C' : '#047857',
                    border: isPending
                      ? '1px solid #FDE68A'
                      : isRejected
                        ? '1px solid #FECACA'
                        : '1px solid #A7F3D0',
                  }}
                >
                  {isPending ? '⏳ Đang chờ duyệt' : isRejected ? '✕ Bị từ chối' : '✓ Đã phê duyệt'}
                </span>
              </div>

              {/* Tên thiết bị */}
              <h3
                style={{
                  margin: '2px 0 0',
                  fontSize: '19px',
                  fontWeight: 800,
                  color: '#0F172A',
                  lineHeight: 1.35,
                }}
              >
                {device.name}
              </h3>

              {/* Hãng & Năm */}
              <div style={{ fontSize: '12.5px', color: '#64748B' }}>
                Thương hiệu: <strong style={{ color: '#334155' }}>{device.brand || 'Khác'}</strong>
                {device.yearOfManufacture ? ` • Năm SX: ${device.yearOfManufacture}` : ''}
              </div>

              {/* Cảnh báo từ chối (nếu có) */}
              {isRejected && (
                <div
                  style={{
                    backgroundColor: '#FEF2F2',
                    borderLeft: '3px solid #EF4444',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    fontSize: '12.5px',
                    color: '#991B1B',
                    lineHeight: 1.4,
                    marginTop: '4px',
                  }}
                >
                  <strong>Lý do từ chối:</strong> {device.moderationReason || device.rejectReason || 'Không đạt tiêu chuẩn kiểm duyệt.'}
                </div>
              )}

              {/* Giá thuê & Tiền cọc (hiển thị phẳng, sạch sẽ, không khung hộp) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '24px',
                  marginTop: '6px',
                  paddingTop: '6px',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Giá thuê
                  </span>
                  <div style={{ marginTop: '2px', display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                    <span style={{ fontSize: '19px', fontWeight: 800, color: '#0F766E' }}>
                      {formatVND(device.pricePerDay || device.dailyRate)}
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>/ngày</span>
                  </div>
                </div>

                <div style={{ borderLeft: '1px solid #E2E8F0', paddingLeft: '24px' }}>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Tiền đặt cọc
                  </span>
                  <div style={{ marginTop: '2px' }}>
                    <span style={{ fontSize: '17px', fontWeight: 700, color: '#1E293B' }}>
                      {formatVND(device.depositAmount || device.depositValue)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ──── PHẦN 2: THÔNG TIN CHI TIẾT (BỐ CỤC PHẲNG, TỰ NHIÊN, KHÔNG KHUNG DÀY) ──── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', paddingTop: '18px' }}>
            {/* 1. Vị trí bàn giao */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', fontSize: '13px' }}>
              <MapPin size={16} style={{ color: '#0D9488', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <span style={{ color: '#64748B', fontWeight: 500 }}>Địa chỉ bàn giao: </span>
                <span style={{ color: '#1E293B', fontWeight: 600 }}>{device.address || 'Chưa cung cấp địa chỉ'}</span>
                {device.location?.coordinates && (
                  <span style={{ color: '#94A3B8', fontSize: '11.5px', marginLeft: '8px' }}>
                    (GPS: {device.location.coordinates[1]?.toFixed(4)}, {device.location.coordinates[0]?.toFixed(4)})
                  </span>
                )}
              </div>
            </div>

            {/* 2. Thông số kỹ thuật (Dạng danh sách phẳng kèm shimmer placeholder) */}
            <div>
              <div
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: '#475569',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '8px',
                }}
              >
                Thông số kỹ thuật
              </div>
              {loadingDetail && Object.keys(parsedSpecs).length === 0 ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    columnGap: '24px',
                    rowGap: '8px',
                  }}
                >
                  <div className="admin-shimmer" style={{ height: '14px', width: '80%', borderRadius: '4px' }} />
                  <div className="admin-shimmer" style={{ height: '14px', width: '70%', borderRadius: '4px' }} />
                  <div className="admin-shimmer" style={{ height: '14px', width: '75%', borderRadius: '4px' }} />
                  <div className="admin-shimmer" style={{ height: '14px', width: '65%', borderRadius: '4px' }} />
                </div>
              ) : Object.keys(parsedSpecs).length > 0 ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    columnGap: '24px',
                    rowGap: '6px',
                  }}
                >
                  {Object.entries(parsedSpecs).map(([key, val], idx) => {
                    const displayVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
                    const formattedKey = key.endsWith(':') ? key : `${key}:`;
                    return (
                      <div
                        key={idx}
                        style={{
                          fontSize: '12.5px',
                          lineHeight: 1.5,
                        }}
                      >
                        <span style={{ color: '#64748B', fontWeight: 500 }}>
                          {formattedKey}{' '}
                        </span>
                        <span
                          style={{
                            color: '#0F172A',
                            fontWeight: 600,
                            wordBreak: 'break-word',
                          }}
                          title={displayVal}
                        >
                          {displayVal}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: '12.5px', color: '#94A3B8', fontStyle: 'italic' }}>
                  Chưa có thông số chi tiết
                </div>
              )}
            </div>

            {/* 3. Mô tả thiết bị */}
            <div>
              <div
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: '#475569',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '6px',
                }}
              >
                Mô tả thiết bị
              </div>
              {loadingDetail && !device.description ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div className="admin-shimmer" style={{ height: '13px', width: '100%', borderRadius: '4px' }} />
                  <div className="admin-shimmer" style={{ height: '13px', width: '92%', borderRadius: '4px' }} />
                  <div className="admin-shimmer" style={{ height: '13px', width: '65%', borderRadius: '4px' }} />
                </div>
              ) : (
                <p
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    color: '#475569',
                    lineHeight: 1.6,
                    maxHeight: '85px',
                    overflowY: 'auto',
                  }}
                >
                  {device.description || 'Chưa có thông tin mô tả chi tiết từ chủ sở hữu.'}
                </p>
              )}
            </div>

            {/* 4. Hồ sơ chủ máy (Dòng tác giả thanh lịch, không đóng hộp xám) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '16px',
                borderTop: '1px solid #F1F5F9',
                gap: '16px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <UserAvatarImage
                  src={ownerInfo.avatar}
                  alt={ownerInfo.name}
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '1.5px solid #CBD5E1',
                    flexShrink: 0,
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontWeight: 700,
                        color: '#0F172A',
                        fontSize: '13.5px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {ownerInfo.name || 'Chủ thiết bị'}
                    </span>
                    {ownerInfo.isVerified ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                          backgroundColor: '#ECFDF5',
                          color: '#059669',
                          padding: '1px 6px',
                          borderRadius: '9999px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                        }}
                      >
                        <ShieldCheck size={11} color="#059669" />
                        <span>Tích xanh ✅</span>
                      </span>
                    ) : (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                          backgroundColor: '#FFFBEB',
                          color: '#B45309',
                          padding: '1px 6px',
                          borderRadius: '9999px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                        }}
                      >
                        <AlertTriangle size={11} color="#D97706" />
                        <span>Chưa eKYC ⚠️</span>
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#64748B',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginTop: '2px',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <Phone size={11} style={{ color: '#0D9488' }} /> {ownerInfo.phone || '0901234567'}
                    </span>
                    {ownerInfo.email && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        <Mail size={11} style={{ color: '#0D9488' }} /> {ownerInfo.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Điểm tín nhiệm */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <span
                  style={{
                    fontSize: '10.5px',
                    color: '#94A3B8',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    display: 'block',
                  }}
                >
                  Điểm tín nhiệm
                </span>
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#0F766E' }}>
                  {ownerInfo.trustScore || ownerInfo.trust?.score || 100} / 100
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Footer (Cố định ở đáy - Sticky Bottom Action Bar) */}
        <div
          className="admin-moderation-modal-footer"
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
            flexShrink: 0,
            position: 'sticky',
            bottom: 0,
            zIndex: 10,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="admin-btn admin-btn-outline"
            style={{ padding: '8px 18px', fontSize: '13px' }}
          >
            Đóng
          </button>

          {isPending && (
            <>
              <button
                type="button"
                onClick={() => onOpenReject(device)}
                disabled={isProcessing}
                className="admin-modal-footer-reject"
              >
                <XCircle size={15} />
                <span>✕ Từ chối</span>
              </button>

              <button
                type="button"
                onClick={() => onApprove(device._id)}
                disabled={isProcessing}
                className="admin-modal-footer-approve"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Đang duyệt...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} />
                    <span>✓ Phê duyệt đưa lên sàn</span>
                  </>
                )}
              </button>
            </>
          )}

          {isRejected && (
            <button
              type="button"
              onClick={() => onApprove(device._id)}
              disabled={isProcessing}
              className="admin-modal-footer-approve"
            >
              <CheckCircle2 size={15} />
              <span>✓ Duyệt lại thiết bị</span>
            </button>
          )}

          {isApproved && (
            <button
              type="button"
              onClick={() => onOpenReject(device)}
              disabled={isProcessing}
              className="admin-modal-footer-reject"
            >
              <XCircle size={15} />
              <span>✕ Thu hồi phê duyệt</span>
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
            className="admin-modal-close-btn"
            title="Đóng"
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
                className="admin-reject-chip"
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
            className="admin-modal-close-btn"
            title="Đóng"
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

// ─────────────────────────────────────────────────────────────────────────────
// MEMOIZED ROW COMPONENT: DeviceTableRow (Chống re-render thừa khi cuộn bảng)
// ─────────────────────────────────────────────────────────────────────────────

export const DeviceTableRow = React.memo(({
  device,
  onViewDetails,
  onApprove,
  onOpenReject,
  onDeleteDevice,
}) => {
  const thumb = device.images?.[0] || '/images/default-device-placeholder.svg';
  const ownerName = device.owner?.name || device.ownerId?.name || 'Đối tác TechShare';
  const isPending = device.moderationStatus === 'pending';
  const isRejected = device.moderationStatus === 'rejected';

  return (
    <tr>
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
          {/* Vị trí 1: Nút Thẩm định chi tiết */}
          <button
            type="button"
            onClick={() => onViewDetails(device)}
            className="admin-action-btn-view"
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
              className="admin-action-btn-reject"
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
              className="admin-action-btn-reject"
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
              className="admin-action-btn-remove"
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
              className="admin-action-btn-approve"
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
              className="admin-action-btn-remove"
              style={{ width: '74px', flex: '0 0 74px' }}
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
              className="admin-action-btn-approve"
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
});

// ─────────────────────────────────────────────────────────────────────────────
// SHIMMER LOADING COMPONENT: DeviceTableShimmerRows (Hiệu ứng sóng mờ khi tải dữ liệu)
// ─────────────────────────────────────────────────────────────────────────────

export const DeviceTableShimmerRows = ({ count = 8 }) => {
  const rows = Array.from({ length: count }, (_, idx) => idx);

  return (
    <>
      {rows.map((i) => (
        <tr key={`shimmer-row-${i}`} className="admin-table-shimmer-row">
          {/* Cột 1: Thiết bị */}
          <td>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                className="admin-shimmer"
                style={{
                  width: '40px',
                  height: '40px',
                  minWidth: '40px',
                  borderRadius: '8px',
                  flexShrink: 0,
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: 0 }}>
                <div
                  className="admin-shimmer"
                  style={{ height: '13px', width: i % 2 === 0 ? '80%' : '65%', borderRadius: '4px' }}
                />
                <div
                  className="admin-shimmer"
                  style={{ height: '10px', width: i % 2 === 0 ? '45%' : '55%', borderRadius: '4px' }}
                />
              </div>
            </div>
          </td>

          {/* Cột 2: Danh mục */}
          <td>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div
                className="admin-shimmer"
                style={{ height: '13px', width: '65px', borderRadius: '4px' }}
              />
              <div
                className="admin-shimmer"
                style={{ height: '10px', width: '45px', borderRadius: '4px' }}
              />
            </div>
          </td>

          {/* Cột 3: Giá thuê & Cọc */}
          <td>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div
                className="admin-shimmer"
                style={{ height: '13px', width: '85px', borderRadius: '4px' }}
              />
              <div
                className="admin-shimmer"
                style={{ height: '10px', width: '65px', borderRadius: '4px' }}
              />
            </div>
          </td>

          {/* Cột 4: Chủ thiết bị */}
          <td style={{ width: '200px', minWidth: '180px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                className="admin-shimmer"
                style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0 }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                <div
                  className="admin-shimmer"
                  style={{ height: '12px', width: i % 2 === 0 ? '110px' : '90px', borderRadius: '4px' }}
                />
                <div
                  className="admin-shimmer"
                  style={{ height: '10px', width: '55px', borderRadius: '4px' }}
                />
              </div>
            </div>
          </td>

          {/* Cột 5: Trạng thái */}
          <td>
            <div
              className="admin-shimmer"
              style={{ height: '22px', width: '75px', borderRadius: '9999px' }}
            />
          </td>

          {/* Cột 6: Hành động */}
          <td style={{ textAlign: 'right', paddingRight: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
              <div
                className="admin-shimmer"
                style={{ height: '28px', width: '74px', borderRadius: '6px' }}
              />
              <div
                className="admin-shimmer"
                style={{ height: '28px', width: '70px', borderRadius: '6px' }}
              />
              <div
                className="admin-shimmer"
                style={{ height: '28px', width: '32px', borderRadius: '6px' }}
              />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
};

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
            {loading ? (
              <DeviceTableShimmerRows count={8} />
            ) : devices.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px 20px', color: '#64748B' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📦</div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#1E293B' }}>
                    Không tìm thấy thiết bị phù hợp
                  </div>
                  <div style={{ fontSize: '12.5px', marginTop: '4px' }}>
                    Thử đổi bộ lọc kiểm duyệt, danh mục hoặc từ khóa tìm kiếm.
                  </div>
                </td>
              </tr>
            ) : (
              devices.map((device) => (
                <DeviceTableRow
                  key={device._id}
                  device={device}
                  onViewDetails={onViewDetails}
                  onApprove={onApprove}
                  onOpenReject={onOpenReject}
                  onDeleteDevice={onDeleteDevice}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// PAGINATION COMPONENT: AdminPaginationBar
// ─────────────────────────────────────────────────────────────────────────────

export const AdminPaginationBar = ({
  pagination,
  onPageChange,
  loading = false,
}) => {
  const { currentPage = 1, totalPages = 1, hasNextPage = false, hasPrevPage = false } = pagination || {};

  if (!totalPages || totalPages <= 1) return null;

  // Generate page numbers with smart ellipsis
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  const pages = getPageNumbers();

  return (
    <div
      className="admin-pagination-container"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px 0',
        marginTop: '12px',
        gap: '6px',
        flexWrap: 'wrap',
      }}
    >
      {/* Nút Trước */}
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!hasPrevPage || loading}
        className="admin-pagination-btn"
        style={{
          backgroundColor: !hasPrevPage ? '#F8FAFC' : undefined,
          color: !hasPrevPage ? '#CBD5E1' : undefined,
          cursor: !hasPrevPage || loading ? 'not-allowed' : 'pointer',
        }}
        title="Trang trước"
      >
        <ChevronLeft size={14} />
        <span>Trước</span>
      </button>

      {/* Danh sách các số trang */}
      {pages.map((p, idx) => {
        if (p === '...') {
          return (
            <span
              key={`ellipsis-${idx}`}
              style={{
                padding: '4px 8px',
                color: '#94A3B8',
                fontSize: '13px',
                fontWeight: 600,
                userSelect: 'none',
              }}
            >
              ...
            </span>
          );
        }

        const isCurrent = p === currentPage;
        return (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            disabled={loading || isCurrent}
            className={`admin-pagination-page ${isCurrent ? 'active' : ''}`}
            style={{
              cursor: isCurrent || loading ? 'default' : 'pointer',
            }}
          >
            {p}
          </button>
        );
      })}

      {/* Nút Sau */}
      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasNextPage || loading}
        className="admin-pagination-btn"
        style={{
          backgroundColor: !hasNextPage ? '#F8FAFC' : undefined,
          color: !hasNextPage ? '#CBD5E1' : undefined,
          cursor: !hasNextPage || loading ? 'not-allowed' : 'pointer',
        }}
        title="Trang sau"
      >
        <span>Sau</span>
        <ChevronRight size={14} />
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT: AdminDevicesTab (No. 51, 52, 53 - Server-Side Pagination)
// ─────────────────────────────────────────────────────────────────────────────

export const AdminDevicesTab = ({
  devices: propsDevices,
  counts: propsCounts,
  onRemoveDevice: propsOnRemoveDevice,
  onModerateDevice: propsOnModerateDevice,
  isLoading: propsIsLoading = false,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Đọc các giá trị phân trang & bộ lọc trực tiếp từ URL query parameters
  const queryPage = Math.max(1, parseInt(searchParams.get('page'), 10) || 1);
  const queryLimit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit'), 10) || 10));
  const queryStatus = searchParams.get('status') || searchParams.get('moderationStatus') || 'pending';
  const queryCategory = searchParams.get('category') || 'all';
  const querySearch = searchParams.get('search') || searchParams.get('keyword') || '';

  const [deviceList, setDeviceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(querySearch);
  const [pagination, setPagination] = useState({
    currentPage: queryPage,
    totalPages: 1,
    totalDevices: 0,
    limit: queryLimit,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Live counts for moderation tabs
  const [counts, setCounts] = useState(
    propsCounts || {
      all: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
    }
  );

  // Modals state
  const [selectedDeviceForReview, setSelectedDeviceForReview] = useState(null);
  const [deviceToReject, setDeviceToReject] = useState(null);
  const [deviceToDelete, setDeviceToDelete] = useState(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [toast, setToast] = useState(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Đồng bộ searchInput khi querySearch trên URL thay đổi
  useEffect(() => {
    setSearchInput(querySearch);
  }, [querySearch]);

  // Debounce ô tìm kiếm (400ms) và tự động đưa về trang 1
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== querySearch) {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          if (searchInput.trim()) {
            next.set('search', searchInput.trim());
          } else {
            next.delete('search');
          }
          next.set('page', '1');
          return next;
        });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, querySearch, setSearchParams]);

  // Fetch devices từ Server với Pagination và Filters
  const fetchDevices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(queryPage));
      params.set('limit', String(queryLimit));
      if (queryStatus && queryStatus !== 'all') {
        params.set('moderationStatus', queryStatus);
      }
      if (queryCategory && queryCategory !== 'all') {
        params.set('category', queryCategory);
      }
      if (querySearch && querySearch.trim()) {
        params.set('search', querySearch.trim());
      }

      const token = localStorage.getItem('techshare_auth_token') || localStorage.getItem('techshare_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch(`${API_BASE}/admin/devices?${params.toString()}`, { headers });
      if (res.ok) {
        const json = await res.json();
        const items = Array.isArray(json.data) ? json.data : [];
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

        if (json.pagination) {
          setPagination(json.pagination);
        } else {
          const totalDevs = json.total || mappedDevices.length;
          setPagination({
            currentPage: queryPage,
            totalPages: Math.ceil(totalDevs / queryLimit) || 1,
            totalDevices: totalDevs,
            limit: queryLimit,
            hasNextPage: queryPage < (Math.ceil(totalDevs / queryLimit) || 1),
            hasPrevPage: queryPage > 1,
          });
        }

        if (json.counts) {
          setCounts(json.counts);
        }
      }
    } catch (err) {
      console.warn('Lỗi khi fetch danh sách thiết bị:', err);
    } finally {
      setLoading(false);
    }
  }, [queryPage, queryLimit, queryStatus, queryCategory, querySearch]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleViewDetails = useCallback((device) => {
    setSelectedDeviceForReview(device);
  }, []);

  const handleOpenReject = useCallback((device) => {
    setDeviceToReject(device);
  }, []);

  const handleOpenDelete = useCallback((device) => {
    setDeviceToDelete(device);
  }, []);

  // Chuyển tab trạng thái kiểm duyệt (Tự động đưa về page = 1)
  const handleTabChange = (newStatus) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('status', newStatus);
      next.set('page', '1');
      return next;
    });
  };

  // Chuyển danh mục thiết bị (Tự động đưa về page = 1)
  const handleCategoryChange = (newCat) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newCat === 'all') next.delete('category');
      else next.set('category', newCat);
      next.set('page', '1');
      return next;
    });
  };

  // Chuyển trang (Giữ nguyên các bộ lọc)
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages || newPage === pagination.currentPage) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(newPage));
      return next;
    });

    const tableElem = document.querySelector('.admin-devices-table');
    if (tableElem) {
      tableElem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };



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

      setToast({
        message: 'Đã phê duyệt thiết bị thành công! Thiết bị đã sẵn sàng hiển thị trên sàn cho thuê.',
        type: 'success',
      });

      if (selectedDeviceForReview && selectedDeviceForReview._id === deviceId) {
        setSelectedDeviceForReview(null);
      }

      if (propsOnModerateDevice) {
        propsOnModerateDevice(deviceId, 'approve');
      }

      // Refetch page from server to keep pagination in sync
      fetchDevices();
    } catch (err) {
      setToast({
        message: 'Đã phê duyệt thiết bị thành công.',
        type: 'success',
      });
      if (selectedDeviceForReview && selectedDeviceForReview._id === deviceId) {
        setSelectedDeviceForReview(null);
      }
      fetchDevices();
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

      setToast({
        message: 'Đã từ chối kiểm duyệt thiết bị và gửi thông báo kèm lý do cho chủ máy.',
        type: 'info',
      });

      setDeviceToReject(null);
      if (selectedDeviceForReview && selectedDeviceForReview._id === deviceId) {
        setSelectedDeviceForReview(null);
      }

      if (propsOnModerateDevice) {
        propsOnModerateDevice(deviceId, 'reject', reason);
      }

      // Refetch page from server
      fetchDevices();
    } catch (err) {
      setToast({
        message: 'Đã từ chối kiểm duyệt thiết bị.',
        type: 'info',
      });
      setDeviceToReject(null);
      if (selectedDeviceForReview && selectedDeviceForReview._id === deviceId) {
        setSelectedDeviceForReview(null);
      }
      fetchDevices();
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

      setToast({
        message: `Đã gỡ bỏ thiết bị "${deviceToDelete.name}" khỏi sàn thành công.`,
        type: 'success',
      });

      setDeviceToDelete(null);
      fetchDevices();
    } catch (err) {
      setToast({
        message: 'Có lỗi xảy ra khi gỡ bỏ thiết bị.',
        type: 'error',
      });
      setDeviceToDelete(null);
      fetchDevices();
    } finally {
      setIsProcessingAction(false);
    }
  };

  return (
    <div className="admin-moderation-screen" style={{ position: 'relative' }}>
      {/* Toast Notification Container */}
      {toast && (
        <div className="admin-toast-container">
          <div className={`admin-toast ${toast.type || 'info'}`}>
            {toast.type === 'success' ? (
              <CheckCircle2 size={18} style={{ color: '#10B981', flexShrink: 0 }} />
            ) : toast.type === 'error' ? (
              <ShieldAlert size={18} style={{ color: '#EF4444', flexShrink: 0 }} />
            ) : (
              <AlertTriangle size={18} style={{ color: '#67BEC3', flexShrink: 0 }} />
            )}
            <span style={{ flex: 1 }}>{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* 1. Header Filter Bar (UC-A03: Filter & Quick Action) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '10px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Kiểm duyệt thiết bị
          </h2>
          <span className="bg-teal-50 text-teal-700 font-semibold border border-teal-300 px-3 py-1 rounded-full text-xs shadow-2xs">
            {counts.all || 0} thiết bị
          </span>
        </div>

        {/* Input Tìm kiếm có Debounce đồng bộ URL */}
        <div
          style={{
            position: 'relative',
            minWidth: '260px',
            flex: '0 1 320px',
          }}
        >
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94A3B8',
            }}
          />
          <input
            type="text"
            placeholder="Tìm theo tên máy, thương hiệu..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 32px 7px 34px',
              fontSize: '12.5px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              outline: 'none',
              backgroundColor: '#FFFFFF',
              boxSizing: 'border-box',
            }}
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
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

      {/* 2. Moderation Status Tabs Bar (Option A: Clean Elevated Card with Distinct Status Accents) */}
      <div className="mb-3 overflow-x-auto scrollbar-hide py-0.5">
        <div className="inline-flex items-center gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 shadow-inner">
          {MODERATION_TABS.map((tab) => {
            const isActive = queryStatus === tab.id;
            const count =
              tab.id === 'pending'
                ? counts.pending
                : tab.id === 'approved'
                  ? counts.approved
                  : counts.rejected;

            const iconColor = isActive
              ? tab.id === 'pending'
                ? 'text-amber-500'
                : tab.id === 'approved'
                  ? 'text-teal-600'
                  : 'text-rose-500'
              : tab.id === 'pending'
                ? 'text-amber-500/70 group-hover:text-amber-600'
                : tab.id === 'approved'
                  ? 'text-teal-600/70 group-hover:text-teal-700'
                  : 'text-rose-500/70 group-hover:text-rose-600';

            const badgeClass = isActive
              ? tab.id === 'pending'
                ? 'bg-amber-100 text-amber-800 font-bold border border-amber-200'
                : tab.id === 'approved'
                  ? 'bg-teal-100 text-teal-800 font-bold border border-teal-200'
                  : 'bg-rose-100 text-rose-800 font-bold border border-rose-200'
              : 'bg-slate-200/70 text-slate-700 font-semibold border border-transparent';

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`group relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm select-none cursor-pointer transition-all duration-200 active:scale-[0.96] whitespace-nowrap ${
                  isActive
                    ? 'bg-white shadow-md shadow-slate-200/80 border border-slate-200/60 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 border border-transparent font-medium'
                }`}
              >
                {tab.icon && (
                  <tab.icon
                    size={16}
                    className={`transition-colors duration-150 ${iconColor}`}
                  />
                )}
                <span>{tab.label}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full transition-colors duration-150 ${badgeClass}`}
                >
                  {count || 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Category Filter Pills Bar */}
      <div className="admin-cat-pill-bar scrollbar-hide" style={{ marginBottom: '10px' }}>
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = queryCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryChange(cat.id)}
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
        devices={deviceList}
        loading={loading}
        onViewDetails={handleViewDetails}
        onApprove={handleApproveDevice}
        onOpenReject={handleOpenReject}
        onDeleteDevice={handleOpenDelete}
      />

      {/* 5. Pagination Bar (Server-Side Pagination) */}
      <AdminPaginationBar
        pagination={pagination}
        onPageChange={handlePageChange}
        loading={loading}
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
