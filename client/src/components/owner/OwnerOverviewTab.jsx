import React, { useState } from 'react';
import { 
  Laptop, 
  Clock, 
  DollarSign, 
  ShieldCheck, 
  Star, 
  ArrowRight, 
  Layers, 
  Calendar, 
  Wallet,
  CheckCircle,
  Eye,
  TrendingUp
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

/**
 * Interface RentalRequestItem (Chuẩn hóa đầu vào theo đề bài):
 * - id: string
 * - device: { name: string; imageUrl: string }
 * - renter: { name: string; avatarUrl: string; trustScore: number }
 * - rentalPeriod: { startDate: string; endDate: string; totalDays: number }
 * - totalPrice: number
 * - status: 'pending' | 'renting' | 'completed'
 */
const normalizeRentalItem = (item) => ({
  id: item.id || item.bookingCode || item._id,
  device: {
    name: item.device?.name || item.deviceName || 'Thiết bị công nghệ',
    imageUrl: item.device?.imageUrl || item.deviceImage || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=150&q=80',
  },
  renter: {
    name: item.renter?.name || 'Khách thuê',
    avatarUrl: item.renter?.avatarUrl || item.renter?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    trustScore: item.renter?.trustScore ?? 90,
  },
  rentalPeriod: {
    startDate: item.rentalPeriod?.startDate || item.startDate || '2026-10-08',
    endDate: item.rentalPeriod?.endDate || item.endDate || '2026-10-10',
    totalDays: item.rentalPeriod?.totalDays || item.totalDays || 1,
  },
  totalPrice: item.totalPrice ?? item.totalRentalPrice ?? 0,
  status: item.status === 'active' ? 'renting' : (item.status || 'pending'),
});

const REVENUE_DATA_BY_PERIOD = {
  '7d': [
    { name: 'T2', revenue: 6500000 },
    { name: 'T3', revenue: 11200000 },
    { name: 'T4', revenue: 8400000 },
    { name: 'T5', revenue: 14600000 },
    { name: 'T6', revenue: 12500000 },
    { name: 'T7', revenue: 19800000 },
    { name: 'CN', revenue: 16200000 },
  ],
  month: [
    { name: 'Tuần 1', revenue: 25000000 },
    { name: 'Tuần 2', revenue: 42000000 },
    { name: 'Tuần 3', revenue: 38500000 },
    { name: 'Tuần 4', revenue: 50900000 },
  ],
  year: [
    { name: 'Q1', revenue: 95000000 },
    { name: 'Q2', revenue: 128000000 },
    { name: 'Q3', revenue: 145000000 },
    { name: 'Q4', revenue: 168000000 },
  ],
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

export const OwnerOverviewTab = ({ 
  kpi, 
  recentBookings = [], 
  onNavigate 
}) => {
  const t = STRINGS.owner.overview;
  const tc = STRINGS.common;

  // Chuẩn hóa danh sách đơn thuê
  const normalizedBookings = recentBookings.map(normalizeRentalItem);

  // Time Range & Revenue Data for Unified UI Section
  const [revenueTimeRange, setRevenueTimeRange] = useState('month');
  const activeRevenueData = REVENUE_DATA_BY_PERIOD[revenueTimeRange] || REVENUE_DATA_BY_PERIOD.month;
  const periodTotalRevenue = activeRevenueData.reduce((acc, cur) => acc + cur.revenue, 0);

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden gap-3.5">
      {/* 1. [Header & Thao tác nhanh] - Gộp chung dòng để triệt tiêu chiều cao thừa */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-800 leading-none">
            {t.title}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {t.subtitle}
          </p>
        </div>

        {/* Dải nút Thao tác nhanh tinh gọn: Đặt cùng hàng Header */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button 
            type="button" 
            className="px-2.5 py-1 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 text-[11px] font-semibold transition-all inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            onClick={() => onNavigate(ROUTES.OWNER_DEVICES)}
            title={t.quickActions.manageDevices}
          >
            <Layers size={13} color={COLORS.primary.DEFAULT} />
            <span>{t.quickActions.manageDevices}</span>
          </button>

          <button 
            type="button" 
            className="px-2.5 py-1 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 text-[11px] font-semibold transition-all inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            onClick={() => onNavigate(ROUTES.OWNER_BOOKINGS)}
            title={t.quickActions.manageBookings}
          >
            <CheckCircle size={13} color={COLORS.status.warning.DEFAULT} />
            <span>{t.quickActions.manageBookings} ({kpi.pendingApprovals})</span>
          </button>

          <button 
            type="button" 
            className="px-2.5 py-1 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 text-[11px] font-semibold transition-all inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            onClick={() => onNavigate(ROUTES.OWNER_CALENDAR)}
            title={t.quickActions.blockCalendar}
          >
            <Calendar size={13} color={COLORS.neutral[500]} />
            <span>{t.quickActions.blockCalendar}</span>
          </button>

          <button 
            type="button" 
            className="px-2.5 py-1 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 text-[11px] font-semibold transition-all inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            onClick={() => onNavigate(ROUTES.OWNER_WALLET)}
            title={t.quickActions.viewWallet}
          >
            <Wallet size={13} color={COLORS.primary.DEFAULT} />
            <span>{t.quickActions.viewWallet}</span>
          </button>
        </div>
      </div>

      {/* 2. [TỔNG QUAN KPI & BÁO CÁO DOANH THU] - Chung 1 khối UI tối ưu không gian */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-2.5 sm:p-3 shrink-0">
        {/* Header khối Tổng quan & Doanh thu */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100/60">
              <TrendingUp size={14} color={COLORS.primary.DEFAULT} />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-800 leading-none">
                {t.kpiAndRevenueTitle}
              </h2>
            </div>
          </div>

          {/* Bộ lọc thời gian cho Báo cáo doanh thu: 7 ngày | Tháng này | Năm nay */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
            {Object.entries(t.revenueReport.timeRanges).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-all cursor-pointer ${
                  revenueTimeRange === key
                    ? 'bg-white text-brand-700 shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                onClick={() => setRevenueTimeRange(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Nội dung kết hợp: 4 Thẻ KPI (trái lg:col-span-4) + Recharts Biểu đồ Doanh thu & Tỷ lệ khai thác (phải lg:col-span-8) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-stretch">
          {/* Cột trái (lg:col-span-4): 4 Chỉ số KPI trong lưới 2x2 gọn gàng */}
          <div className="lg:col-span-4 grid grid-cols-2 gap-2">
            {/* KPI 1: Tổng thiết bị */}
            <div className="bg-slate-50/70 p-2 rounded-lg border border-slate-100 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  {t.kpis.totalDevices}
                </span>
                <Laptop size={13} color={COLORS.primary.DEFAULT} />
              </div>
              <div className="mt-0.5">
                <div className="text-base font-bold text-slate-800 leading-none">
                  {kpi.totalDevices}
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-medium truncate">
                  <span className="text-brand-600 font-semibold">{kpi.activeRentals}</span> {t.kpis.activeRentals}
                </div>
              </div>
            </div>

            {/* KPI 2: Chờ duyệt */}
            <div className="bg-slate-50/70 p-2 rounded-lg border border-slate-100 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  {t.kpis.pendingApprovals}
                </span>
                <Clock size={13} className="text-amber-500" />
              </div>
              <div className="mt-0.5">
                <div className="text-base font-bold text-slate-800 leading-none">
                  {kpi.pendingApprovals}
                </div>
                <div className="text-[10px] text-amber-600 mt-1 font-medium truncate">
                  {kpi.pendingApprovals > 0 ? 'Cần duyệt đơn' : 'Đã duyệt xong'}
                </div>
              </div>
            </div>

            {/* KPI 3: Doanh thu tháng */}
            <div className="bg-slate-50/70 p-2 rounded-lg border border-slate-100 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  {t.kpis.monthlyRevenue}
                </span>
                <DollarSign size={13} className="text-emerald-500" />
              </div>
              <div className="mt-0.5">
                <div className="text-sm font-bold text-slate-800 leading-none truncate">
                  {kpi.monthlyRevenueFormatted}
                </div>
                <div className="text-[10px] text-emerald-600 mt-1 font-semibold truncate">
                  {t.revenueReport.growthText}
                </div>
              </div>
            </div>

            {/* KPI 4: Điểm tín nhiệm */}
            <div className="bg-slate-50/70 p-2 rounded-lg border border-slate-100 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  {t.kpis.trustScore}
                </span>
                <ShieldCheck size={13} color={COLORS.primary.DEFAULT} />
              </div>
              <div className="mt-0.5">
                <div className="text-base font-bold text-slate-800 leading-none">
                  {kpi.trustScore}/100
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-medium flex items-center gap-1 truncate">
                  <Star size={10} fill="#F59E0B" color="#F59E0B" />
                  <span className="font-semibold text-slate-700">{kpi.ratingAvg}</span> / 5.0
                </div>
              </div>
            </div>
          </div>

          {/* Cột phải (lg:col-span-8): BÁO CÁO DOANH THU & TỶ LỆ KHAI THÁC THIẾT BỊ (RECHARTS) */}
          <div className="lg:col-span-8 bg-slate-50/80 border border-slate-100 rounded-lg p-2.5 flex flex-col justify-between">
            {/* Top row: Tổng doanh thu chu kỳ + Tăng trưởng + Nút xem chi tiết */}
            <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-slate-200/60">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-medium text-slate-500">
                  {t.revenueReport.periodRevenuePrefix}
                </span>
                <span className="text-sm font-bold text-brand-700">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(periodTotalRevenue)}
                </span>
                <span 
                  className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200"
                  title={t.revenueReport.growthTooltip}
                >
                  {t.revenueReport.growthText}
                </span>
                <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
                  (Đơn vị: VNĐ)
                </span>
              </div>

              <button
                type="button"
                onClick={() => onNavigate(ROUTES.OWNER_ANALYTICS)}
                className="text-[11px] text-brand-600 hover:text-brand-800 font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                title={t.revenueReport.viewDetails}
              >
                <span>{t.revenueReport.viewDetails}</span>
                <ArrowRight size={11} />
              </button>
            </div>

            {/* Bottom Row: 2 Cột (Biểu đồ Recharts + Tỷ lệ khai thác kho máy) */}
            <div className="flex flex-col lg:flex-row items-stretch gap-3 flex-1 min-h-0">
              {/* Phân hệ 1: Recharts AreaChart với Gradient Soft Teal #67BEC3 */}
              <div className="flex-1 min-w-0 flex flex-col justify-end">
                <div className="w-full h-[115px]">
                  <ResponsiveContainer width="100%" height={115}>
                    <AreaChart 
                      data={activeRevenueData} 
                      margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="ownerRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#67BEC3" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="#67BEC3" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#64748B' }} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 9, fill: '#94A3B8' }}
                        tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`}
                        width={28}
                      />
                      <RechartsTooltip content={<CustomRevenueTooltip />} />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#67BEC3" 
                        strokeWidth={2.5} 
                        fillOpacity={1} 
                        fill="url(#ownerRevenueGrad)" 
                        dot={{ r: 2.5, fill: '#67BEC3', stroke: '#fff', strokeWidth: 1.5 }}
                        activeDot={{ r: 4.5, fill: '#286E74', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Phân hệ 2: Biểu đồ phụ / Thanh Progress Tỷ lệ khai thác & Thiết bị đóng góp */}
              <div className="w-full lg:w-[190px] shrink-0 border-t lg:border-t-0 lg:border-l border-slate-200/80 pt-2 lg:pt-0 lg:pl-3 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-slate-700">
                    {t.utilizationInsight?.title || 'Tỷ lệ khai thác'}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    {t.utilizationInsight?.rateBadge || '82% lấp đầy'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mb-1.5">
                  {t.utilizationInsight?.topDevicesTitle || 'Đóng góp doanh thu'}
                </div>

                {/* Top Devices Progress Bars */}
                <div className="flex flex-col gap-1.5">
                  {TOP_DEVICES_DATA.map((item, idx) => (
                    <div key={idx} className="flex flex-col">
                      <div className="flex items-center justify-between text-[10px] mb-0.5">
                        <span className="font-medium text-slate-600 truncate max-w-[125px]" title={item.name}>
                          {item.name}
                        </span>
                        <span className="font-bold text-slate-700">{item.percent}%</span>
                      </div>
                      <div className="w-full bg-slate-200/70 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ width: `${item.percent}%`, backgroundColor: item.color }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. [Table Container (flex-1)] - Vừa vặn 100% không bị che cột Hành động */}
      <div className="flex-1 min-h-0 bg-white rounded-xl shadow-xs border border-slate-100 flex flex-col overflow-hidden">
        {/* Header của Bảng */}
        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <h2 className="text-sm font-bold text-slate-800">
            {t.recentBookings.title}
          </h2>
          <button 
            type="button" 
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors cursor-pointer"
            onClick={() => onNavigate(ROUTES.OWNER_BOOKINGS)}
          >
            <span>{t.recentBookings.viewAll}</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {normalizedBookings.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            {t.recentBookings.emptyMessage}
          </div>
        ) : (
          /* Khối cuộn nội bộ: flex-1 overflow-y-auto overflow-x-auto thin-scrollbar */
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto thin-scrollbar">
            {/* Thẻ table: w-full text-left table-auto (bỏ min-w-[1000px] để không bị tràn mép phải) */}
            <table className="w-full text-left table-auto border-collapse">
              <thead className="sticky top-0 bg-slate-50 z-10 shadow-2xs">
                <tr className="border-b border-slate-200">
                  <th className="py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap w-[100px]">
                    Mã đơn
                  </th>
                  <th className="py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap min-w-[170px]">
                    Thiết bị
                  </th>
                  <th className="py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap min-w-[150px]">
                    Khách thuê
                  </th>
                  <th className="py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap min-w-[140px]">
                    Thời gian thuê
                  </th>
                  <th className="py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap min-w-[95px]">
                    Tổng tiền
                  </th>
                  <th className="py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap min-w-[105px]">
                    Trạng thái
                  </th>
                  <th className="py-2.5 px-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right min-w-[90px]">
                    {tc.actions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {normalizedBookings.map((item) => {
                  const isPending = item.status === 'pending';
                  const isRenting = item.status === 'renting';
                  const isCompleted = item.status === 'completed';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Cột 1: Mã đơn */}
                      <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                        <span className="font-semibold text-slate-700 text-xs bg-slate-100 px-2 py-0.5 rounded">
                          #{item.id}
                        </span>
                      </td>

                      {/* Cột 2: Thiết bị */}
                      <td className="py-2.5 px-3 align-middle min-w-[170px]">
                        <div className="flex gap-2.5 items-center">
                          <img 
                            src={item.device.imageUrl} 
                            alt={item.device.name} 
                            className="w-9 h-9 rounded-md object-cover border border-slate-200 shrink-0" 
                          />
                          <span className="text-xs sm:text-sm font-medium text-slate-800 line-clamp-1 leading-snug">
                            {item.device.name}
                          </span>
                        </div>
                      </td>

                      {/* Cột 3: Khách thuê */}
                      <td className="py-2.5 px-3 align-middle min-w-[150px] whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <img 
                            src={item.renter.avatarUrl} 
                            alt={item.renter.name} 
                            className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0" 
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-xs text-slate-800 whitespace-nowrap">
                              {item.renter.name}
                            </div>
                            <div className="text-[10px] text-slate-400 whitespace-nowrap flex items-center gap-1">
                              <span>Điểm uy tín:</span>
                              <span className="font-semibold text-emerald-600">{item.renter.trustScore}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Cột 4: Thời gian thuê */}
                      <td className="py-2.5 px-3 align-middle min-w-[140px] whitespace-nowrap">
                        <div className="text-xs font-medium text-slate-700 whitespace-nowrap">
                          {item.rentalPeriod.startDate} - {item.rentalPeriod.endDate}
                        </div>
                        <div className="mt-0.5">
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 whitespace-nowrap">
                            {item.rentalPeriod.totalDays} {tc.day}
                          </span>
                        </div>
                      </td>

                      {/* Cột 5: Tổng tiền */}
                      <td className="py-2.5 px-3 align-middle whitespace-nowrap min-w-[95px]">
                        <span className="font-bold text-slate-800 text-xs">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.totalPrice)}
                        </span>
                      </td>

                      {/* Cột 6: Trạng thái */}
                      <td className="py-2.5 px-3 align-middle whitespace-nowrap min-w-[105px]">
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Chờ duyệt
                          </span>
                        )}
                        {isRenting && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                            Đang thuê
                          </span>
                        )}
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Hoàn tất
                          </span>
                        )}
                        {!isPending && !isRenting && !isCompleted && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 whitespace-nowrap capitalize">
                            {item.status}
                          </span>
                        )}
                      </td>

                      {/* Cột 7: Hành động (luôn hiển thị rõ ràng, không bị che) */}
                      <td className="py-2.5 px-3 pr-4 align-middle text-right whitespace-nowrap min-w-[90px]">
                        <button 
                          type="button" 
                          className="whitespace-nowrap px-3 py-1 rounded-full inline-flex items-center justify-center gap-1 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium transition-all shadow-xs cursor-pointer ml-auto"
                          onClick={() => onNavigate(ROUTES.OWNER_BOOKINGS)}
                        >
                          <Eye size={12} color={COLORS.neutral[500]} />
                          <span>{tc.viewDetails}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerOverviewTab;
