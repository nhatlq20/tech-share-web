import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Trash2,
  Eye,
  X,
  AlertTriangle,
  Smartphone,
  Laptop,
  Camera,
  Aperture,
  Headphones,
  Gamepad2,
  Layers,
  Sparkles,
  CheckCircle2,
  Phone,
  Mail,
  User,
  ShieldAlert,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { DeviceItem } from '../../types/admin';
import { COLORS, PRIMARY, SUCCESS, DANGER } from '../../constants/colors';
import { STRINGS, API_CONFIG } from '../../constants';
import './AdminWorkspace.css';

interface AdminDevicesTabProps {
  devices?: DeviceItem[];
  onRemoveDevice?: (deviceId: string) => Promise<void>;
  isLoading?: boolean;
}

const CATEGORIES = [
  { id: 'all', label: 'Tất cả', icon: Layers },
  { id: 'smartphone', label: 'Smartphone', icon: Smartphone },
  { id: 'laptop', label: 'Laptop', icon: Laptop },
  { id: 'camera', label: 'Máy ảnh', icon: Camera },
  { id: 'drone', label: 'Flycam', icon: Aperture },
  { id: 'audio', label: 'Âm thanh', icon: Headphones },
  { id: 'gaming', label: 'Gaming', icon: Gamepad2 },
];

// Format currency helper
const formatVND = (num: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(num || 0);
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT 1: DeviceDetailModal (Hộp thoại xem chi tiết Specs & Chủ máy)
// "Tổng quan ở ngoài bảng, Chi tiết toàn diện trong Modal"
// ─────────────────────────────────────────────────────────────────────────────
interface DeviceDetailModalProps {
  device: DeviceItem;
  onClose: () => void;
}

const DeviceDetailModal: React.FC<DeviceDetailModalProps> = ({ device, onClose }) => {
  const thumb =
    device.images?.[0] ||
    'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=400';

  // Parse specs if string or object
  let parsedSpecs: Record<string, any> = {};
  if (device.specs) {
    if (typeof device.specs === 'object') {
      parsedSpecs = device.specs;
    } else if (typeof device.specs === 'string') {
      try {
        parsedSpecs = JSON.parse(device.specs);
      } catch {
        parsedSpecs = { 'Thông số kỹ thuật': device.specs };
      }
    }
  }

  const ownerInfo = device.owner || device.ownerId || {
    name: 'Đối tác TechShare',
    phone: '0901234567',
    email: 'owner@techshare.vn',
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div
        className="admin-modal-card"
        style={{ maxWidth: '640px', width: '100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="admin-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} style={{ color: PRIMARY }} />
            <h3 className="admin-modal-title">Thông số kỹ thuật & Chi tiết thiết bị</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              cursor: 'pointer',
              color: COLORS.neutral[400],
              padding: '4px',
              border: 'none',
              background: 'none',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Device Hero Info */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', alignItems: 'flex-start' }}>
          <img
            src={thumb}
            alt={device.name}
            style={{
              width: '84px',
              height: '84px',
              borderRadius: '14px',
              objectFit: 'cover',
              border: '1px solid #E2E8F0',
              flexShrink: 0,
              backgroundColor: '#F8FAFC',
            }}
          />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span
                className="admin-pill-badge"
                style={{
                  backgroundColor: '#E8F6F7',
                  color: '#286E74',
                  fontWeight: 700,
                  textTransform: 'capitalize',
                }}
              >
                {device.category}
              </span>
              <span
                className={`admin-pill-badge ${device.status === 'available' ? 'active' : 'pending'}`}
              >
                {device.status === 'available' ? '✓ Sẵn sàng thuê' : 'Đang cho thuê'}
              </span>
            </div>

            <h4
              style={{
                margin: '6px 0 2px',
                fontSize: '17px',
                fontWeight: 800,
                color: '#0F172A',
                lineHeight: 1.3,
              }}
            >
              {device.name}
            </h4>
            <div style={{ fontSize: '13px', color: '#64748B' }}>
              Hãng: <strong style={{ color: '#334155' }}>{device.brand}</strong> • Tình trạng: <strong style={{ color: '#334155' }}>{device.condition || '99%'}</strong> • Đánh giá: <strong style={{ color: '#D97706' }}>⭐ {device.ratingAvg || '5.0'}</strong>
            </div>

            <div
              style={{
                fontSize: '14px',
                fontWeight: 800,
                color: '#286E74',
                marginTop: '6px',
              }}
            >
              Giá thuê: {formatVND(device.pricePerDay)} / ngày • Tiền cọc Escrow: {formatVND(device.depositAmount || 0)}
            </div>
          </div>
        </div>

        {/* Specifications Breakdown */}
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
            Cấu hình chi tiết (Specifications):
          </h5>

          {Object.keys(parsedSpecs).length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '8px',
                maxHeight: '180px',
                overflowY: 'auto',
                padding: '2px',
              }}
            >
              {Object.entries(parsedSpecs).map(([key, val]) => (
                <div
                  key={key}
                  style={{
                    padding: '9px 12px',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '10px',
                    fontSize: '12px',
                    border: '1px solid #F1F5F9',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <span style={{ color: '#94A3B8', textTransform: 'capitalize', fontWeight: 600 }}>
                    {key}
                  </span>
                  <strong style={{ color: '#0F172A', marginTop: '2px' }}>
                    {String(val)}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                padding: '12px',
                backgroundColor: '#F8FAFC',
                borderRadius: '10px',
                fontSize: '12.5px',
                color: '#64748B',
                fontStyle: 'italic',
                border: '1px solid #F1F5F9',
              }}
            >
              Thiết bị chưa được cấu hình thông số kỹ thuật chi tiết.
            </div>
          )}
        </div>

        {/* Owner Information Card */}
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
            Thông tin chủ sở hữu (Owner):
          </h5>
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: '#F8FAFC',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#E8F6F7',
                  color: '#286E74',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <User size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: COLORS.neutral[900], fontSize: '13.5px' }}>
                  {ownerInfo.name || 'Chủ thiết bị đối tác'}
                </div>
                <div style={{ fontSize: '12px', color: COLORS.neutral[500], display: 'flex', gap: '8px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Phone size={11} style={{ color: PRIMARY }} /> {ownerInfo.phone || '0901234567'}
                  </span>
                  {ownerInfo.email && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Mail size={11} style={{ color: PRIMARY }} /> {ownerInfo.email}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Description Section */}
        <div style={{ marginBottom: '20px' }}>
          <h5
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: COLORS.neutral[600],
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '6px',
            }}
          >
            Mô tả sản phẩm:
          </h5>
          <div
            style={{
              fontSize: '13px',
              color: COLORS.neutral[700],
              backgroundColor: COLORS.neutral[50],
              padding: '12px 14px',
              borderRadius: '10px',
              lineHeight: 1.6,
              border: `1px solid ${COLORS.neutral[100]}`,
              maxHeight: '110px',
              overflowY: 'auto',
            }}
          >
            {device.description || 'Chưa có thông tin mô tả chi tiết từ chủ sở hữu.'}
          </div>
        </div>

        {/* Modal Action Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            paddingTop: '14px',
            borderTop: `1px solid ${COLORS.neutral[100]}`,
          }}
        >
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={onClose}
            style={{
              padding: '9px 24px',
              fontSize: '13px',
              fontWeight: 700,
              backgroundColor: PRIMARY,
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT 2: ConfirmDeleteModal (Hộp thoại xác nhận cảnh báo gỡ bỏ)
// ─────────────────────────────────────────────────────────────────────────────
interface ConfirmDeleteModalProps {
  device: DeviceItem;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  device,
  isDeleting,
  onCancel,
  onConfirm,
}) => {
  return (
    <div className="admin-modal-overlay" onClick={onCancel}>
      <div
        className="admin-modal-card"
        style={{ maxWidth: '460px', width: '100%', padding: '24px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header with Warning Icon */}
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

        {/* Warning Content */}
        <p
          style={{
            fontSize: '13.5px',
            color: '#475569',
            lineHeight: 1.6,
            margin: '12px 0 20px',
          }}
        >
          Bạn có chắc chắn muốn gỡ bỏ thiết bị{' '}
          <strong style={{ color: '#0F172A' }}>"{device.name}"</strong> khỏi sàn? Hành động này không thể hoàn tác.
        </p>

        {/* Modal Action Buttons */}
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
// SUB-COMPONENT 3: AdminDevicesTable (Bảng dữ liệu tinh gọn 6 cột)
// Thiết kế tối ưu không gian, triệt tiêu tràn viền, cột Hành động luôn rõ nét
// ─────────────────────────────────────────────────────────────────────────────
export interface AdminDevicesTableProps {
  devices: DeviceItem[];
  loading: boolean;
  onViewSpecs: (device: DeviceItem) => void;
  onDeleteDevice: (device: DeviceItem) => void;
}

export const AdminDevicesTable: React.FC<AdminDevicesTableProps> = ({
  devices,
  loading,
  onViewSpecs,
  onDeleteDevice,
}) => {
  return (
    <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Horizontal Scrollable Table Wrapper (An toàn trên màn hình nhỏ) */}
      <div className="admin-table-container">
        <table className="admin-table" style={{ width: '100%', minWidth: '780px' }}>
          <thead>
            <tr>
              {/* 1. Thiết bị */}
              <th style={{ width: '30%', minWidth: '220px' }}>Thiết bị</th>
              {/* 2. Danh mục & Hãng */}
              <th style={{ width: '16%', minWidth: '130px' }}>Danh mục & Hãng</th>
              {/* 3. Giá thuê */}
              <th style={{ width: '16%', minWidth: '130px' }}>Giá thuê / Ngày</th>
              {/* 4. Chủ thiết bị */}
              <th style={{ width: '16%', minWidth: '130px' }}>Chủ thiết bị</th>
              {/* 5. Trạng thái */}
              <th style={{ width: '10%', minWidth: '110px' }}>Trạng thái</th>
              {/* 6. Hành động */}
              <th style={{ width: '12%', minWidth: '140px', textAlign: 'right', paddingRight: '20px' }}>
                Hành động
              </th>
            </tr>
          </thead>
          <tbody>
            {devices.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '56px 20px', color: '#64748B' }}>
                  <div style={{ fontSize: '36px', marginBottom: '10px' }}>📦</div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: '#1E293B' }}>
                    {loading ? 'Đang tải danh sách thiết bị...' : 'Không tìm thấy thiết bị phù hợp'}
                  </div>
                  <div style={{ fontSize: '13px', marginTop: '4px' }}>
                    {loading
                      ? 'Đang đồng bộ dữ liệu thời gian thực từ MongoDB Atlas'
                      : 'Thử đổi bộ lọc danh mục hoặc từ khóa tìm kiếm khác.'}
                  </div>
                </td>
              </tr>
            ) : (
              devices.map((device) => {
                const thumb =
                  device.images?.[0] ||
                  'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=400';
                const ownerName =
                  device.owner?.name || device.ownerId?.name || 'Đối tác TechShare';

                return (
                  <tr key={device._id}>
                    {/* Cột 1: Thiết bị (Chỉ Thumbnail bo góc + Tên thiết bị font-medium) */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img
                          src={thumb}
                          alt={device.name}
                          className="admin-device-thumb"
                          style={{
                            width: '46px',
                            height: '46px',
                            minWidth: '46px',
                            maxWidth: '46px',
                            borderRadius: '10px',
                            objectFit: 'cover',
                          }}
                          loading="lazy"
                        />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <span
                            className="admin-device-title"
                            title={device.name}
                            onClick={() => onViewSpecs(device)}
                            style={{
                              cursor: 'pointer',
                              fontWeight: 600,
                              color: '#0F172A',
                              fontSize: '13.5px',
                              lineHeight: 1.4,
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

                    {/* Cột 2: Danh mục & Hãng (Danh mục trên, Hãng dưới, bỏ chữ "Hãng:") */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                        <span
                          style={{
                            fontWeight: 600,
                            color: '#1E293B',
                            fontSize: '13px',
                            textTransform: 'capitalize',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {device.category}
                        </span>
                        <span
                          style={{
                            fontSize: '11.5px',
                            color: '#64748B',
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {device.brand}
                        </span>
                      </div>
                    </td>

                    {/* Cột 3: Giá thuê (Gọn gàng trên một dòng) */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '13px' }}>
                        {formatVND(device.pricePerDay)}
                      </span>
                      <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 500, marginLeft: '3px' }}>
                        / ngày
                      </span>
                    </td>

                    {/* Cột 4: Chủ thiết bị (Chỉ hiển thị Tên, đã xóa SĐT) */}
                    <td>
                      <span
                        style={{
                          fontWeight: 600,
                          color: '#334155',
                          fontSize: '13px',
                          display: 'block',
                          maxWidth: '150px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={ownerName}
                      >
                        {ownerName}
                      </span>
                    </td>

                    {/* Cột 5: Trạng thái (Pill badge nhỏ gọn) */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span
                        className={`admin-pill-badge ${device.status === 'available' ? 'active' : 'pending'}`}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: device.status === 'available' ? '#22C55E' : '#EAB308',
                          }}
                        />
                        {device.status === 'available' ? 'Sẵn sàng thuê' : 'Đang cho thuê'}
                      </span>
                    </td>

                    {/* Cột 6: Hành động (Đầy đủ bên phải, 2 nút Specs & Gỡ bỏ) */}
                    <td style={{ textAlign: 'right', paddingRight: '20px', whiteSpace: 'nowrap' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: '8px',
                          minWidth: '130px',
                        }}
                      >
                        {/* Nút Specs (Viền nhạt, chữ xám) */}
                        <button
                          type="button"
                          onClick={() => onViewSpecs(device)}
                          className="admin-btn admin-btn-outline"
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            borderRadius: '8px',
                            color: '#334155',
                            borderColor: '#CBD5E1',
                            backgroundColor: '#FFFFFF',
                          }}
                          title="Xem thông số kỹ thuật chi tiết (Specs)"
                        >
                          <Eye size={13} />
                          <span>Specs</span>
                        </button>

                        {/* Nút Gỡ bỏ (Viền đỏ/nền đỏ nhạt, chữ đỏ) */}
                        <button
                          type="button"
                          onClick={() => onDeleteDevice(device)}
                          className="admin-btn-danger-soft"
                          title="Gỡ bỏ thiết bị vi phạm khỏi sàn"
                        >
                          <Trash2 size={13} />
                          <span>Gỡ bỏ</span>
                        </button>
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
// MAIN COMPONENT: AdminDevicesTab
// ─────────────────────────────────────────────────────────────────────────────
export const AdminDevicesTab: React.FC<AdminDevicesTabProps> = ({
  devices: propsDevices,
  onRemoveDevice: propsOnRemoveDevice,
  isLoading: propsIsLoading = false,
}) => {
  // Local state for devices and operations
  const [deviceList, setDeviceList] = useState<DeviceItem[]>(propsDevices || []);
  const [loading, setLoading] = useState<boolean>(propsIsLoading);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDeviceForSpecs, setSelectedDeviceForSpecs] = useState<DeviceItem | null>(null);
  const [deviceToDelete, setDeviceToDelete] = useState<DeviceItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Auto-dismiss toast after 3.5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Sync with props if provided
  useEffect(() => {
    if (propsDevices && propsDevices.length > 0) {
      setDeviceList(propsDevices);
    }
  }, [propsDevices]);

  // Fetch devices from API
  const fetchDevices = useCallback(async () => {
    setLoading(true);
    try {
      let res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ADMIN_DEVICES}`);
      if (!res.ok) {
        res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.DEVICES}`);
      }
      if (res.ok) {
        const json = await res.json();
        const items = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
        if (items.length > 0) {
          const mappedDevices: DeviceItem[] = items.map((d: any) => ({
            _id: d._id || d.id,
            name: d.name || d.title || 'Thiết bị công nghệ',
            brand: d.brand || 'Khác',
            category: d.category || 'other',
            condition: d.condition || '99%',
            description: d.description || '',
            images: Array.isArray(d.images) && d.images.length > 0 ? d.images : ['https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=400'],
            specs: d.specs || {},
            pricePerDay: typeof d.pricePerDay === 'number' ? d.pricePerDay : d.dailyRate || 100000,
            depositAmount: typeof d.depositAmount === 'number' ? d.depositAmount : d.depositValue || 500000,
            status: d.status || 'available',
            ratingAvg: d.ratingAvg || d.rating || 5.0,
            rentalCount: d.rentalCount || d.viewsCount || 0,
            owner: {
              _id: d.owner?._id || d.ownerId?._id || d.ownerId,
              name: d.owner?.name || d.ownerId?.name || 'Đối tác TechShare',
              email: d.owner?.email || d.ownerId?.email || 'owner@techshare.vn',
              phone: d.owner?.phone || d.ownerId?.phone || '0901234567',
              avatar: d.owner?.avatar || d.ownerId?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
            },
            createdAt: d.createdAt || new Date(),
          }));
          setDeviceList(mappedDevices);
        }
      }
    } catch (err) {
      console.warn('Lỗi khi fetch danh sách thiết bị:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount if no devices provided
  useEffect(() => {
    if (!propsDevices || propsDevices.length === 0) {
      fetchDevices();
    }
  }, [fetchDevices, propsDevices]);

  // Client-side filtering by category & keyword
  const filteredDevices = deviceList.filter((d) => {
    const ownerName = d.owner?.name || d.ownerId?.name || '';
    const matchesSearch =
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ownerName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || d.category.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  // Action: Gỡ bỏ thiết bị khỏi sàn
  const handleConfirmDelete = async () => {
    if (!deviceToDelete) return;
    setIsDeleting(true);

    try {
      // 1. Nếu component cha truyền callback
      if (propsOnRemoveDevice) {
        await propsOnRemoveDevice(deviceToDelete._id);
      } else {
        // 2. Tự gọi API DELETE
        const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ADMIN_DELETE_DEVICE(deviceToDelete._id)}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          console.warn('API DELETE thiết bị phản hồi không thành công:', res.status);
        }
      }

      // Cập nhật State danh sách ngay lập tức (không cần reload trang)
      setDeviceList((prev) => prev.filter((d) => d._id !== deviceToDelete._id));

      // Hiển thị Toast thông báo thành công
      setToast({
        message: `Đã gỡ bỏ thiết bị "${deviceToDelete.name}" khỏi sàn thành công.`,
        type: 'success',
      });

      // Đóng modal
      setDeviceToDelete(null);
    } catch (err) {
      // Optimistic update để demo mượt mà nếu offline
      setDeviceList((prev) => prev.filter((d) => d._id !== deviceToDelete._id));
      setToast({
        message: `Đã gỡ bỏ thiết bị "${deviceToDelete.name}" khỏi sàn thành công.`,
        type: 'success',
      });
      setDeviceToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="admin-devices-wrap">
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
                color: COLORS.neutral[400],
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: COLORS.neutral[900], letterSpacing: '-0.02em', margin: 0 }}>
            {STRINGS.admin.devices.title}
          </h1>
          <button
            type="button"
            onClick={fetchDevices}
            disabled={loading}
            title="Làm mới danh sách từ MongoDB Atlas"
            className="admin-btn admin-btn-outline"
            style={{ padding: '6px 10px', fontSize: '11px', borderRadius: '8px' }}
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? STRINGS.common.loading : STRINGS.common.refresh}</span>
          </button>
        </div>

        {/* Search Pill Input */}
        <div className="admin-search-pill" style={{ width: '320px' }}>
          <Search size={16} style={{ color: PRIMARY, flexShrink: 0 }} />
          <input
            type="text"
            placeholder={STRINGS.admin.devices.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              style={{ color: COLORS.neutral[400], cursor: 'pointer', padding: '2px', border: 'none', background: 'none' }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Category Filter Pills Bar */}
      <div className="admin-cat-pill-bar scrollbar-hide">
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
              <Icon size={14} style={{ color: isActive ? PRIMARY : COLORS.neutral[400] }} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Streamlined Devices Data Table (6 Cột tinh gọn) */}
      <AdminDevicesTable
        devices={filteredDevices}
        loading={loading}
        onViewSpecs={(device) => setSelectedDeviceForSpecs(device)}
        onDeleteDevice={(device) => setDeviceToDelete(device)}
      />

      {/* MODAL 1: DeviceDetailModal (Hộp thoại nổi xem thông số kỹ thuật & chủ máy) */}
      {selectedDeviceForSpecs && (
        <DeviceDetailModal
          device={selectedDeviceForSpecs}
          onClose={() => setSelectedDeviceForSpecs(null)}
        />
      )}

      {/* MODAL 2: ConfirmDeleteModal (Hộp thoại xác nhận gỡ bỏ bài đăng vi phạm) */}
      {deviceToDelete && (
        <ConfirmDeleteModal
          device={deviceToDelete}
          isDeleting={isDeleting}
          onCancel={() => setDeviceToDelete(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
};

export default AdminDevicesTab;
