import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Laptop, 
  ShieldCheck, 
  Clock, 
  Lock, 
  ArrowUpRight,
  User,
  ArrowRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip 
} from 'recharts';
import { STRINGS } from '../../constants/strings';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../routes/routes';

// Dữ liệu mẫu theo 3 chu kỳ thời gian: '7d' | 'month' | 'quarter'
const MOCK_ANALYTICS_DATA = {
  '7d': {
    kpi: {
      totalRevenue: 5450000,
      activeRentals: 4,
      escrowHolding: 18500000,
      utilizationRate: 68.5,
    },
    chart: [
      { name: 'T2', label: 'T2', revenue: 6500000, rentals: 1 },
      { name: 'T3', label: 'T3', revenue: 11200000, rentals: 2 },
      { name: 'T4', label: 'T4', revenue: 8400000, rentals: 1 },
      { name: 'T5', label: 'T5', revenue: 14600000, rentals: 3 },
      { name: 'T6', label: 'T6', revenue: 12500000, rentals: 2 },
      { name: 'T7', label: 'T7', revenue: 19800000, rentals: 4 },
      { name: 'CN', label: 'CN', revenue: 16200000, rentals: 3 },
    ],
  },
  month: {
    kpi: {
      totalRevenue: 156400000,
      activeRentals: 6,
      escrowHolding: 32000000,
      utilizationRate: 82.0,
    },
    chart: [
      { name: 'Tuần 1', label: 'Tuần 1', revenue: 25000000, rentals: 4 },
      { name: 'Tuần 2', label: 'Tuần 2', revenue: 42000000, rentals: 7 },
      { name: 'Tuần 3', label: 'Tuần 3', revenue: 38500000, rentals: 5 },
      { name: 'Tuần 4', label: 'Tuần 4', revenue: 50900000, rentals: 10 },
    ],
  },
  quarter: {
    kpi: {
      totalRevenue: 536000000,
      activeRentals: 8,
      escrowHolding: 48500000,
      utilizationRate: 89.5,
    },
    chart: [
      { name: 'Tháng 7', label: 'Tháng 7', revenue: 162000000, rentals: 18 },
      { name: 'Tháng 8', label: 'Tháng 8', revenue: 195000000, rentals: 22 },
      { name: 'Tháng 9', label: 'Tháng 9', revenue: 232000000, rentals: 28 },
    ],
  },
};

const TOP_DEVICES_DATA = [
  { name: 'MacBook Pro 16 M3', percent: 45, color: '#67BEC3' },
  { name: 'Sony Alpha A7 IV', percent: 30, color: '#388E94' },
  { name: 'DJI Mini 4 Pro', percent: 25, color: '#A4DEE2' },
];

const CustomRevenueTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    return (
      <div className="bg-slate-900/90 text-white px-2.5 py-1.5 rounded-lg shadow-lg text-xs backdrop-blur-xs border border-slate-700/50">
        <div className="text-[10px] text-slate-300 font-medium">{label}</div>
        <div className="font-bold text-[#67BEC3] text-xs mt-0.5">
          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)}
        </div>
      </div>
    );
  }
  return null;
};

const DEFAULT_PENDING_REQUESTS = [
  {
    id: 'TS-881',
    deviceName: 'Sony Alpha A7 IV Kit 28-70mm OSS',
    renterName: 'Nguyễn Văn Minh',
    rentalFee: 700000,
    status: 'pending',
    rentalDuration: '2 ngày (08/10 - 10/10)',
    renterAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
  },
  {
    id: 'TS-882',
    deviceName: 'MacBook Pro 16" M3 Pro 36GB / 512GB',
    renterName: 'Lê Hoàng Yến',
    rentalFee: 2025000,
    status: 'pending',
    rentalDuration: '5 ngày (09/10 - 14/10)',
    renterAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
  },
  {
    id: 'TS-883',
    deviceName: 'Flycam DJI Mini 4 Pro Fly More Combo',
    renterName: 'Trần Đình Trọng',
    rentalFee: 850000,
    status: 'pending',
    rentalDuration: '3 ngày (11/10 - 14/10)',
    renterAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&q=80',
  },
];

export const OwnerAnalyticsTab = ({ 
  analyticsData, 
  recentBookings = [], 
  kpi: propKpi, 
  onNavigate 
}) => {
  const t = STRINGS.owner.analytics;
  const [timeRange, setTimeRange] = useState('month');

  // Lấy dữ liệu KPI & Biểu đồ theo chu kỳ đang chọn
  const activeDataset = analyticsData?.[timeRange] || MOCK_ANALYTICS_DATA[timeRange] || MOCK_ANALYTICS_DATA.month;
  const chartData = activeDataset.chart || activeDataset;
  const kpiData = propKpi ? {
    totalRevenue: propKpi.monthlyRevenue || activeDataset.kpi?.totalRevenue || 18450000,
    activeRentals: propKpi.activeRentals ?? activeDataset.kpi?.activeRentals ?? 6,
    escrowHolding: activeDataset.kpi?.escrowHolding || 32000000,
    utilizationRate: propKpi.utilizationRate ?? activeDataset.kpi?.utilizationRate ?? 82,
  } : (activeDataset.kpi || MOCK_ANALYTICS_DATA.month.kpi);

  const totalRevenue = chartData.reduce((acc, cur) => acc + (cur.revenue || 0), 0);

  // Lọc danh sách đơn đang chờ duyệt (Ưu tiên từ props, nếu không có lấy fallback mẫu)
  const pendingRequests = useMemo(() => {
    const fromProps = recentBookings
      .filter((b) => b.status === 'pending')
      .map((b) => ({
        id: b.id || b.bookingCode || b._id,
        deviceName: b.device?.name || b.deviceName || 'Thiết bị công nghệ',
        renterName: b.renter?.name || 'Khách thuê',
        rentalFee: b.totalPrice ?? b.totalRentalPrice ?? 0,
        status: 'pending',
        rentalDuration: b.rentalPeriod ? `${b.rentalPeriod.totalDays} ngày (${b.rentalPeriod.startDate} - ${b.rentalPeriod.endDate})` : '2 ngày',
        renterAvatar: b.renter?.avatarUrl || b.renter?.avatar,
      }));
    return fromProps.length > 0 ? fromProps : DEFAULT_PENDING_REQUESTS;
  }, [recentBookings]);

  return (
    <div className="owner-analytics-container flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto thin-scrollbar pr-1">
      {/* ================================================================= */}
      {/* KHỐI 1: HEADER & BỘ LỌC THỜI GIAN (PERIOD SELECTOR)               */}
      {/* ================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800 leading-none">
              {t.title}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-brand-50 text-brand-700 border border-brand-200">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
              Thời gian thực
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {t.subtitle}
          </p>
        </div>

        {/* Cụm Segmented Control (Pill-shaped Tabs): 7 ngày qua | Tháng này | Quý này */}
        <div className="flex items-center p-1 bg-slate-100 rounded-full border border-slate-200 shadow-xs">
          {Object.entries(t.timeRanges).map(([key, label]) => {
            const isActive = timeRange === key;
            return (
              <button
                key={key}
                type="button"
                className={`px-3.5 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                  isActive
                    ? 'bg-brand-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                onClick={() => setTimeRange(key)}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ================================================================= */}
      {/* KHỐI 2: 4 THẺ KPI TỔNG QUAN (GRID 2x2 / 4 CỘT) [NỔI BẬT NHẤT]     */}
      {/* ================================================================= */}
      <div className="shrink-0">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800">
              {t.kpiSectionTitle || 'Tổng quan KPI'}
            </span>
            <span className="text-xs text-slate-400 font-normal">
              (Chỉ số tài chính & khai thác thiết bị)
            </span>
          </div>
          <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <TrendingUp size={12} />
            <span>{t.growthBadge || '+18.5% kỳ này'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* KPI 1: Tổng doanh thu thực nhận */}
          <div className="bg-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-all border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {t.kpis?.totalRevenue || 'Tổng doanh thu thực nhận'}
              </span>
              <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100">
                <DollarSign size={17} color={COLORS.primary.DEFAULT} />
              </div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-slate-900 leading-tight">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(kpiData.totalRevenue)}
              </div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                <ArrowUpRight size={13} />
                <span>+18.5% so với kỳ trước</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {t.kpis?.totalRevenueSub || 'Đã trừ chiết khấu sàn'}
              </div>
            </div>
          </div>

          {/* KPI 2: Thiết bị đang cho thuê */}
          <div className="bg-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-all border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {t.kpis?.activeRentals || 'Thiết bị đang cho thuê'}
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <Laptop size={17} />
              </div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-slate-900 leading-tight">
                {kpiData.activeRentals} máy
              </div>
              <div className="text-[11px] text-brand-700 font-semibold mt-1">
                {t.kpis?.activeRentalsSub || '8 máy trong kho'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Đang vận hành sinh lời liên tục
              </div>
            </div>
          </div>

          {/* KPI 3: Tiền cọc ký quỹ an toàn */}
          <div className="bg-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-all border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {t.kpis?.escrowHolding || 'Tiền cọc ký quỹ an toàn'}
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <ShieldCheck size={17} />
              </div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-slate-900 leading-tight">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(kpiData.escrowHolding)}
              </div>
              <div className="text-[11px] text-amber-700 font-semibold mt-1 flex items-center gap-1">
                <Lock size={12} />
                <span>{t.kpis?.escrowHoldingSub || 'Bảo chứng TechShare'}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Được bảo vệ 100% rủi ro tài sản
              </div>
            </div>
          </div>

          {/* KPI 4: Tỷ lệ khai thác kho máy */}
          <div className="bg-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-all border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {t.kpis?.utilizationRate || 'Tỷ lệ khai thác kho máy'}
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                <TrendingUp size={17} />
              </div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-slate-900 leading-tight">
                {kpiData.utilizationRate}%
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                <div 
                  className="bg-brand-500 h-1.5 rounded-full transition-all duration-500" 
                  style={{ width: `${kpiData.utilizationRate}%` }} 
                />
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {t.kpis?.utilizationRateSub || 'Hiệu suất khai thác cao'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* KHỐI 3: BIỂU ĐỒ BÁO CÁO DOANH THU & TỶ LỆ KHAI THÁC (RECHARTS)    */}
      {/* ================================================================= */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
              <BarChart3 size={17} color={COLORS.primary.DEFAULT} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 leading-tight">
                {t.revenueTitle}
              </h2>
              <span className="text-[11px] text-slate-400">
                Tổng cộng chu kỳ này: <strong className="text-brand-700">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalRevenue)}</strong>
              </span>
            </div>
          </div>
          <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
            Đơn vị: VNĐ
          </span>
        </div>

        {/* 2 Cột: Biểu đồ Recharts AreaChart + Khối phụ Tỷ lệ khai thác thiết bị */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Cột 1 (lg:col-span-8): Recharts AreaChart */}
          <div className="lg:col-span-8 bg-slate-50/70 rounded-xl p-3 border border-slate-100 flex flex-col justify-end">
            <div className="w-full h-56">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart 
                  data={chartData} 
                  margin={{ top: 12, right: 15, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="analyticsRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#67BEC3" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#67BEC3" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#64748B' }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#94A3B8' }}
                    tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`}
                    width={38}
                  />
                  <RechartsTooltip content={<CustomRevenueTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#67BEC3" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#analyticsRevenueGrad)" 
                    dot={{ r: 3.5, fill: '#67BEC3', stroke: '#fff', strokeWidth: 2 }}
                    activeDot={{ r: 5.5, fill: '#286E74', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cột 2 (lg:col-span-4): Tỷ lệ khai thác kho & Thiết bị đóng góp doanh thu cao nhất */}
          <div className="lg:col-span-4 bg-slate-50/70 rounded-xl p-4 border border-slate-100 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800">
                  {t.utilizationInsight?.title || 'Tỷ lệ khai thác kho'}
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {kpiData.utilizationRate}% lấp đầy
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">
                {t.utilizationInsight?.topDevicesTitle || 'Thiết bị mang lại doanh thu cao nhất'}
              </p>
            </div>

            {/* Top Devices Progress Bars */}
            <div className="flex flex-col gap-3 my-auto">
              {TOP_DEVICES_DATA.map((item, idx) => (
                <div key={idx} className="flex flex-col">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700 truncate max-w-[150px]" title={item.name}>
                      {item.name}
                    </span>
                    <span className="font-bold text-slate-800">{item.percent}%</span>
                  </div>
                  <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ width: `${item.percent}%`, backgroundColor: item.color }} 
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between">
              <span>Hiệu suất tài sản:</span>
              <span className="font-semibold text-emerald-600">Tối ưu 92/100</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* KHỐI 4: YÊU CẦU THUÊ MÁY GẦN ĐÂY [MỜ NHẠT - FADED / LOW OPACITY]  */}
      {/* ================================================================= */}
      <div className="opacity-60 transition-opacity hover:opacity-85 bg-transparent shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {t.recentRequests?.title || 'Yêu cầu thuê máy gần đây'}
            </span>
            <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium">
              {pendingRequests.length} {t.recentRequests?.badge || 'chờ duyệt'}
            </span>
          </div>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate(ROUTES.OWNER_BOOKINGS)}
              className="text-[11px] text-slate-500 hover:text-slate-800 font-medium inline-flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>{t.recentRequests?.viewAllBtn || 'Xem tất cả'}</span>
              <ArrowRight size={11} />
            </button>
          )}
        </div>
        <p className="text-[11px] text-slate-400 mb-2.5">
          {t.recentRequests?.hint || 'Dữ liệu thứ yếu • Được làm mờ để tối ưu tập trung vào chỉ số tài chính'}
        </p>

        {/* Danh sách thẻ mờ nhạt (Lược bỏ hoàn toàn đổ bóng, dùng tông màu slate trung tính) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {pendingRequests.map((req) => (
            <div
              key={req.id}
              className="bg-slate-100/70 p-3 rounded-xl border border-slate-200/80 shadow-none flex items-center gap-2.5"
            >
              {/* Avatar mờ / Grayscale */}
              <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-300 flex items-center justify-center">
                {req.renterAvatar ? (
                  <img
                    src={req.renterAvatar}
                    alt={req.renterName}
                    className="w-full h-full object-cover grayscale opacity-60"
                  />
                ) : (
                  <User size={14} className="text-slate-400" />
                )}
              </div>

              {/* Thông tin đơn */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-slate-600 truncate">
                    {req.deviceName}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 shrink-0">
                    #{req.id}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                  Khách: {req.renterName} • {req.rentalDuration}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs font-semibold text-slate-600">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(req.rentalFee)}
                  </span>
                  <span className="text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                    {t.recentRequests?.statusPending || 'Chờ duyệt'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OwnerAnalyticsTab;
