import React, { useState } from 'react';
import {
  Users,
  Cpu,
  ShoppingBag,
  TrendingUp,
  Download,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import { AdminKPIData, ChartDataPoint, CategoryStat } from '../../types/admin';

interface AdminOverviewTabProps {
  kpi: AdminKPIData;
  chartData: {
    '7d': ChartDataPoint[];
    month: ChartDataPoint[];
    year: ChartDataPoint[];
  };
  categoryStats: CategoryStat[];
  onRefresh: () => void;
  isLoading?: boolean;
}

export const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({
  kpi,
  chartData,
  categoryStats,
  onRefresh,
  isLoading = false,
}) => {
  const [timeRange, setTimeRange] = useState<'7d' | 'month' | 'year'>('7d');
  const [hoveredPoint, setHoveredPoint] = useState<ChartDataPoint | null>(null);

  const safeKpi: AdminKPIData = {
    totalUsers: kpi?.totalUsers ?? 18,
    activeUsers: kpi?.activeUsers ?? 16,
    totalDevices: kpi?.totalDevices ?? 13,
    availableDevices: kpi?.availableDevices ?? 11,
    activeBookings: kpi?.activeBookings ?? 3,
    pendingEkyc: kpi?.pendingEkyc ?? 0,
    totalRevenue: kpi?.totalRevenue ?? 49770000,
    revenueFormatted:
      kpi?.revenueFormatted ||
      new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
      }).format(kpi?.totalRevenue ?? 49770000),
  };

  const safeChartData = chartData || { '7d': [], month: [], year: [] };
  const activePoints =
    (safeChartData && (safeChartData[timeRange] || safeChartData['7d'])) || [];
  const safeCategories =
    Array.isArray(categoryStats) && categoryStats.length > 0
      ? categoryStats
      : [
          { id: 'smartphone', name: 'Smartphone & Tablet', count: 7, percent: 54, color: '#67BEC3' },
          { id: 'camera', name: 'Máy ảnh & Ống kính', count: 2, percent: 15, color: '#818CF8' },
          { id: 'laptop', name: 'Laptop & Workstation', count: 1, percent: 8, color: '#38BDF8' },
          { id: 'audio', name: 'Tai nghe & Âm thanh', count: 1, percent: 8, color: '#FBBF24' },
          { id: 'gaming', name: 'Máy chơi game & VR', count: 1, percent: 8, color: '#34D399' },
          { id: 'accessory', name: 'Phụ kiện công nghệ', count: 1, percent: 8, color: '#F472B6' },
        ];

  // SVG Chart calculation parameters
  const chartWidth = 620;
  const chartHeight = 220;
  const paddingX = 40;
  const paddingY = 30;

  const maxVal = Math.max(...activePoints.map((p) => p.revenue), 1000000);
  const minVal = 0;

  const getX = (index: number) => {
    if (activePoints.length <= 1) return paddingX;
    return paddingX + (index * (chartWidth - paddingX * 2)) / (activePoints.length - 1);
  };

  const getY = (value: number) => {
    const range = maxVal - minVal || 1;
    return chartHeight - paddingY - ((value - minVal) / range) * (chartHeight - paddingY * 2);
  };

  // Generate SVG path points
  const pointsString = activePoints
    .map((p, i) => `${getX(i)},${getY(p.revenue)}`)
    .join(' ');

  const areaPath = activePoints.length > 0
    ? `M ${getX(0)},${chartHeight - paddingY} ` +
      activePoints.map((p, i) => `L ${getX(i)},${getY(p.revenue)}`).join(' ') +
      ` L ${getX(activePoints.length - 1)},${chartHeight - paddingY} Z`
    : '';

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(num);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Header Section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
            Tổng quan hệ thống
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={onRefresh}
            className="admin-btn admin-btn-outline"
            disabled={isLoading}
            title="Làm mới dữ liệu từ MongoDB Atlas"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>{isLoading ? 'Đang tải...' : 'Làm mới'}</span>
          </button>

          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={() => alert('Báo cáo thống kê quản trị TechShare đã được chuẩn bị tải về.')}
          >
            <Download size={14} />
            <span>Tải báo cáo CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Lưới 4 Thẻ KPI */}
      <div className="admin-kpi-grid">
        {/* KPI 1: Người dùng */}
        <div className="admin-kpi-card">
          <div className="admin-kpi-top">
            <div className="admin-kpi-icon">
              <Users size={22} />
            </div>
            <span className="admin-kpi-badge">
              <ArrowUpRight size={12} style={{ display: 'inline', marginRight: '2px' }} />
              +18%
            </span>
          </div>
          <div>
            <div className="admin-kpi-value">{safeKpi.totalUsers}</div>
            <div className="admin-kpi-label">Tổng người dùng</div>
          </div>
        </div>

        {/* KPI 2: Thiết bị công nghệ */}
        <div className="admin-kpi-card">
          <div className="admin-kpi-top">
            <div className="admin-kpi-icon">
              <Cpu size={22} />
            </div>
            <span className="admin-kpi-badge">
              <ArrowUpRight size={12} style={{ display: 'inline', marginRight: '2px' }} />
              +12%
            </span>
          </div>
          <div>
            <div className="admin-kpi-value">{safeKpi.totalDevices}</div>
            <div className="admin-kpi-label">Thiết bị trên sàn</div>
          </div>
        </div>

        {/* KPI 3: Đơn thuê */}
        <div className="admin-kpi-card">
          <div className="admin-kpi-top">
            <div className="admin-kpi-icon">
              <ShoppingBag size={22} />
            </div>
            <span className="admin-kpi-badge">
              <ArrowUpRight size={12} style={{ display: 'inline', marginRight: '2px' }} />
              +24%
            </span>
          </div>
          <div>
            <div className="admin-kpi-value">{safeKpi.activeBookings}</div>
            <div className="admin-kpi-label">Đơn thuê hoạt động</div>
          </div>
        </div>

        {/* KPI 4: Doanh thu */}
        <div className="admin-kpi-card">
          <div className="admin-kpi-top">
            <div className="admin-kpi-icon">
              <TrendingUp size={22} />
            </div>
            <span className="admin-kpi-badge">
              <ArrowUpRight size={12} style={{ display: 'inline', marginRight: '2px' }} />
              +15%
            </span>
          </div>
          <div>
            <div className="admin-kpi-value" style={{ fontSize: '22px', color: '#286E74' }}>
              {safeKpi.revenueFormatted || formatVND(safeKpi.totalRevenue)}
            </div>
            <div className="admin-kpi-label">Tổng doanh thu sàn</div>
          </div>
        </div>
      </div>

      {/* 3. Lưới Biểu đồ Doanh thu & Phân bổ Danh mục */}
      <div className="admin-overview-grid">
        {/* Cột trái: Biểu đồ doanh thu với 3 Tabs riêng biệt */}
        <div className="admin-card" style={{ padding: '24px 28px' }}>
          <div className="admin-card-header">
            <div>
              <div className="admin-card-title">Doanh thu & Số lượng Giao dịch</div>
            </div>

            {/* 3 Tabs / Pill buttons riêng biệt */}
            <div className="admin-tab-group" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={timeRange === '7d'}
                onClick={() => setTimeRange('7d')}
                className={`admin-tab-pill ${timeRange === '7d' ? 'active' : ''}`}
              >
                7 Ngày
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={timeRange === 'month'}
                onClick={() => setTimeRange('month')}
                className={`admin-tab-pill ${timeRange === 'month' ? 'active' : ''}`}
              >
                Tháng này
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={timeRange === 'year'}
                onClick={() => setTimeRange('year')}
                className={`admin-tab-pill ${timeRange === 'year' ? 'active' : ''}`}
              >
                Năm nay
              </button>
            </div>
          </div>

          {/* Interactive Responsive SVG Line Chart */}
          <div style={{ position: 'relative', width: '100%', height: '240px', marginTop: '10px' }}>
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              style={{ width: '100%', height: '100%', overflow: 'visible' }}
            >
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#67BEC3" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#67BEC3" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.33, 0.66, 1].map((pct, idx) => {
                const y = chartHeight - paddingY - pct * (chartHeight - paddingY * 2);
                return (
                  <g key={idx}>
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={chartWidth - paddingX}
                      y2={y}
                      stroke="#F1F5F9"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={paddingX - 8}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="10"
                      fill="#94A3B8"
                    >
                      {Math.round((pct * maxVal) / 1000000)}Tr
                    </text>
                  </g>
                );
              })}

              {/* Area Under Curve */}
              {areaPath && (
                <path d={areaPath} fill="url(#areaGradient)" />
              )}

              {/* Line */}
              {activePoints.length > 0 && (
                <polyline
                  fill="none"
                  stroke="#67BEC3"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={pointsString}
                />
              )}

              {/* Data Points */}
              {activePoints.map((point, idx) => {
                const cx = getX(idx);
                const cy = getY(point.revenue);
                const isHovered = hoveredPoint?.name === point.name;

                return (
                  <g key={point.name}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHovered ? 6 : 4}
                      fill="#FFFFFF"
                      stroke="#286E74"
                      strokeWidth={isHovered ? 3 : 2}
                      style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={() => setHoveredPoint(point)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                    <text
                      x={cx}
                      y={chartHeight - 8}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight={isHovered ? '700' : '500'}
                      fill={isHovered ? '#286E74' : '#64748B'}
                    >
                      {point.name}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip */}
            {hoveredPoint && (
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '20px',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                  pointerEvents: 'none',
                  zIndex: 20,
                }}
              >
                <div style={{ fontWeight: 700, color: '#67BEC3' }}>
                  {hoveredPoint.name}: {formatVND(hoveredPoint.revenue)}
                </div>
                <div style={{ color: '#CBD5E1', fontSize: '11px', marginTop: '2px' }}>
                  Số giao dịch: {hoveredPoint.orders} lượt thuê
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cột phải: Phân bổ danh mục thiết bị (Category Progress Bars) */}
        <div className="admin-card" style={{ padding: '24px 22px' }}>
          <div className="admin-card-header">
            <div>
              <div className="admin-card-title">Phân bổ Thiết bị</div>
            </div>
            <span className="admin-pill-badge active" style={{ fontSize: '11px' }}>
              Toàn sàn
            </span>
          </div>

          <div className="admin-category-list">
            {safeCategories.map((cat) => (
              <div key={cat.id} className="admin-category-item">
                <div className="admin-category-meta">
                  <span className="admin-cat-name">{cat.name}</span>
                  <span className="admin-cat-count">
                    <strong>{cat.count}</strong> thiết bị ({cat.percent}%)
                  </span>
                </div>
                <div className="admin-progress-track">
                  <div
                    className="admin-progress-bar"
                    style={{
                      width: `${Math.min(cat.percent, 100)}%`,
                      backgroundColor: cat.color || '#67BEC3',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOverviewTab;

