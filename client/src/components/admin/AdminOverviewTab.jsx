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
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { STRINGS } from '../../constants/strings';

const formatVND = (amount = 0) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

// Soft UI Tooltip for Recharts
const CustomRevenueTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    const orders = payload[0].payload?.orders;
    const t = STRINGS.admin.overview;

    return (
      <div className="bg-slate-900/95 text-white px-3.5 py-2.5 rounded-xl shadow-xl text-xs border border-slate-700/60 backdrop-blur-md">
        <div className="text-[11px] text-slate-400 font-medium">{label}</div>
        <div className="font-bold text-[#67BEC3] text-sm mt-0.5">
          {formatVND(val)}
        </div>
        {typeof orders === 'number' && (
          <div className="text-[11px] text-slate-300 mt-1 flex items-center gap-1">
            <span>{t.totalOrdersPrefix}</span>
            <span className="font-semibold text-white">{orders}</span>
            <span>{t.totalOrdersSuffix}</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const AdminOverviewTab = ({
  kpi,
  chartData,
  categoryStats,
  onRefresh,
  isLoading = false,
}) => {
  const t = STRINGS.admin.overview;
  const [timeRange, setTimeRange] = useState('7d');

  // Fallbacks using standard sample metrics
  const safeKpi = {
    totalUsers: kpi?.totalUsers ?? 18,
    activeUsers: kpi?.activeUsers ?? 16,
    totalDevices: kpi?.totalDevices ?? 98,
    availableDevices: kpi?.availableDevices ?? 84,
    activeBookings: kpi?.activeBookings ?? 28,
    pendingEkyc: kpi?.pendingEkyc ?? 3,
    totalRevenue: kpi?.totalRevenue ?? 838381000,
    revenueFormatted:
      kpi?.revenueFormatted || formatVND(kpi?.totalRevenue ?? 838381000),
  };

  const safeChartData = chartData || {
    '7d': [
      { name: 'Mon', revenue: 65000000, orders: 8 },
      { name: 'Tue', revenue: 98000000, orders: 12 },
      { name: 'Wed', revenue: 84000000, orders: 10 },
      { name: 'Thu', revenue: 146000000, orders: 18 },
      { name: 'Fri', revenue: 162000000, orders: 20 },
      { name: 'Sat', revenue: 198000000, orders: 25 },
      { name: 'Sun', revenue: 185381000, orders: 23 },
    ],
    month: [
      { name: 'Week 1', revenue: 165000000, orders: 24 },
      { name: 'Week 2', revenue: 210000000, orders: 32 },
      { name: 'Week 3', revenue: 198000000, orders: 29 },
      { name: 'Week 4', revenue: 265381000, orders: 41 },
    ],
    year: [
      { name: 'Jan', revenue: 52000000, orders: 14 },
      { name: 'Feb', revenue: 64000000, orders: 18 },
      { name: 'Mar', revenue: 78000000, orders: 22 },
      { name: 'Apr', revenue: 85000000, orders: 25 },
      { name: 'May', revenue: 92000000, orders: 28 },
      { name: 'Jun', revenue: 110000000, orders: 34 },
      { name: 'Jul', revenue: 125000000, orders: 38 },
      { name: 'Aug', revenue: 118000000, orders: 36 },
      { name: 'Sep', revenue: 135000000, orders: 42 },
      { name: 'Oct', revenue: 148000000, orders: 46 },
      { name: 'Nov', revenue: 162000000, orders: 50 },
      { name: 'Dec', revenue: 185000000, orders: 58 },
    ],
  };

  const activePoints =
    (safeChartData && (safeChartData[timeRange] || safeChartData['7d'])) || [];

  const VI_TO_EN_CATEGORY_MAP = {
    'Máy ảnh & Ống kính': t.categories.camera,
    'Flycam & Gimbal': t.categories.drone,
    'Tai nghe & Âm thanh': t.categories.audio,
    'Máy chơi game & VR': t.categories.gaming,
    'Phụ kiện công nghệ': t.categories.accessory,
    'Điện thoại & Tablet': t.categories.smartphone,
    'Smartphone & Tablet': t.categories.smartphone,
    'Laptop & Workstation': t.categories.laptop,
  };

  const rawCategories =
    Array.isArray(categoryStats) && categoryStats.length > 0
      ? categoryStats
      : [
          {
            id: 'smartphone',
            name: t.categories.smartphone,
            count: 36,
            percent: 37,
            color: '#67BEC3',
          },
          {
            id: 'laptop',
            name: t.categories.laptop,
            count: 24,
            percent: 25,
            color: '#38BDF8',
          },
          {
            id: 'camera',
            name: t.categories.camera,
            count: 18,
            percent: 18,
            color: '#818CF8',
          },
          {
            id: 'drone',
            name: t.categories.drone,
            count: 10,
            percent: 10,
            color: '#F472B6',
          },
          {
            id: 'audio',
            name: t.categories.audio,
            count: 6,
            percent: 6,
            color: '#FBBF24',
          },
          {
            id: 'gaming',
            name: t.categories.gaming,
            count: 4,
            percent: 4,
            color: '#34D399',
          },
        ];

  const safeCategories = rawCategories.map((cat) => ({
    ...cat,
    name: VI_TO_EN_CATEGORY_MAP[cat.name] || cat.name,
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header Section */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {t.title}
          </h1>
          <p className="text-xs text-slate-500 mt-1">{t.subtitle}</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs disabled:opacity-60 cursor-pointer"
            disabled={isLoading}
            title={t.refreshTooltip}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>{isLoading ? t.loading : t.refresh}</span>
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-[#67BEC3] text-white hover:bg-[#4CA6AC] transition-all shadow-xs cursor-pointer"
            onClick={() => alert(t.reportAlert)}
          >
            <Download size={14} />
            <span>{t.downloadCsv}</span>
          </button>
        </div>
      </div>

      {/* 2. Lưới 4 Thẻ KPI (Overview Stat Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* KPI 1: Total Users */}
        <div className="admin-kpi-card bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="w-11 h-11 rounded-xl bg-[#EEF8F8] text-[#67BEC3] flex items-center justify-center">
              <Users size={22} />
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
              <ArrowUpRight size={13} />
              +18%
            </span>
          </div>
          <div>
            <p className="text-3xl font-bold text-slate-800 tracking-tight">
              {safeKpi.totalUsers}
            </p>
            <p className="text-sm font-medium text-slate-500 mt-1">
              {t.totalUsers}
            </p>
          </div>
        </div>

        {/* KPI 2: Total Devices */}
        <div className="admin-kpi-card bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="w-11 h-11 rounded-xl bg-[#EEF8F8] text-[#67BEC3] flex items-center justify-center">
              <Cpu size={22} />
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
              <ArrowUpRight size={13} />
              +12%
            </span>
          </div>
          <div>
            <p className="text-3xl font-bold text-slate-800 tracking-tight">
              {safeKpi.totalDevices}
            </p>
            <p className="text-sm font-medium text-slate-500 mt-1">
              {t.totalDevices}
            </p>
          </div>
        </div>

        {/* KPI 3: Active Rentals */}
        <div className="admin-kpi-card bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="w-11 h-11 rounded-xl bg-[#EEF8F8] text-[#67BEC3] flex items-center justify-center">
              <ShoppingBag size={22} />
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
              <ArrowUpRight size={13} />
              +24%
            </span>
          </div>
          <div>
            <p className="text-3xl font-bold text-slate-800 tracking-tight">
              {safeKpi.activeBookings}
            </p>
            <p className="text-sm font-medium text-slate-500 mt-1">
              {t.activeOrders}
            </p>
          </div>
        </div>

        {/* KPI 4: Total Revenue */}
        <div className="admin-kpi-card bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="w-11 h-11 rounded-xl bg-[#EEF8F8] text-[#67BEC3] flex items-center justify-center">
              <TrendingUp size={22} />
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
              <ArrowUpRight size={13} />
              +15%
            </span>
          </div>
          <div>
            <p className="text-3xl font-bold text-[#67BEC3] tracking-tight">
              {safeKpi.revenueFormatted || formatVND(safeKpi.totalRevenue)}
            </p>
            <p className="text-sm font-medium text-slate-500 mt-1">
              {t.totalRevenue}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Lưới Biểu đồ Doanh thu (Recharts) & Phân bổ Danh mục */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột trái (lg:col-span-2): Biểu đồ doanh thu Recharts AreaChart */}
        <div className="admin-card lg:col-span-2 bg-white rounded-2xl p-6 lg:p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                {t.revenueChartTitle}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{t.subtitle}</p>
            </div>

            {/* Time Range Selector Tabs */}
            <div
              className="inline-flex items-center p-1 bg-slate-50 rounded-xl border border-slate-200 self-start sm:self-auto"
              role="tablist"
            >
              <button
                type="button"
                role="tab"
                aria-selected={timeRange === '7d'}
                onClick={() => setTimeRange('7d')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all cursor-pointer ${
                  timeRange === '7d'
                    ? 'bg-white text-[#286E74] font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                {t.timeRanges['7d']}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={timeRange === 'month'}
                onClick={() => setTimeRange('month')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all cursor-pointer ${
                  timeRange === 'month'
                    ? 'bg-white text-[#286E74] font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                {t.timeRanges.month}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={timeRange === 'year'}
                onClick={() => setTimeRange('year')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all cursor-pointer ${
                  timeRange === 'year'
                    ? 'bg-white text-[#286E74] font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                {t.timeRanges.year}
              </button>
            </div>
          </div>

          {/* Recharts AreaChart Container */}
          <div className="w-full h-72 md:h-80 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={activePoints}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <defs>
                  <linearGradient
                    id="adminRevenueGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#67BEC3" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#67BEC3" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#F1F5F9"
                />
                <XAxis
                  dataKey="name"
                  stroke="#94A3B8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`}
                />
                <RechartsTooltip content={<CustomRevenueTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#67BEC3"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#adminRevenueGradient)"
                  activeDot={{
                    r: 6,
                    fill: '#FFFFFF',
                    stroke: '#286E74',
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cột phải: Phân bổ Danh mục Thiết bị (Category Breakdown) */}
        <div className="admin-card bg-white rounded-2xl p-6 lg:p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                {t.categoryDistributionTitle}
              </h2>
              <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-[#EEF8F8] text-[#286E74]">
                {t.platformWide}
              </span>
            </div>

            <div className="flex flex-col">
              {safeCategories.map((cat) => (
                <div key={cat.id} className="flex flex-col gap-2 mb-4 last:mb-0">
                  <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                    <span className="font-semibold text-slate-800">
                      {cat.name}
                    </span>
                    <span className="ml-auto text-xs text-slate-500">
                      <strong className="text-slate-700 font-semibold">
                        {cat.count}
                      </strong>{' '}
                      {t.deviceUnit} ({cat.percent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden mt-1">
                    <div
                      className="h-full rounded-full transition-all duration-500"
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
    </div>
  );
};

export default AdminOverviewTab;