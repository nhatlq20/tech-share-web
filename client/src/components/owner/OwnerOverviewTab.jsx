import React, { useState } from 'react';
import {
  Plus,
  RefreshCw,
  ArrowUpRight,
  ArrowRight,
  Layers,
  ShoppingBag,
  Clock,
  TrendingUp,
  Calendar,
  Eye,
  ShieldCheck,
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
import { ROUTES } from '../../routes/routes';

const formatVND = (amount = 0) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

// Normalize Rental Booking Item
const normalizeRentalItem = (item) => ({
  id: item.id || item.bookingCode || item._id,
  device: {
    name: item.device?.name || item.deviceName || 'Equipment Item',
    imageUrl:
      item.device?.imageUrl ||
      item.deviceImage ||
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=150&q=80',
    category: item.deviceCategory || item.device?.category || 'Tech',
  },
  renter: {
    name: item.renter?.name || 'Customer',
    avatarUrl:
      item.renter?.avatarUrl ||
      item.renter?.avatar ||
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    trustScore: item.renter?.trustScore ?? 90,
  },
  rentalPeriod: {
    startDate: item.rentalPeriod?.startDate || item.startDate || '2026-10-08',
    endDate: item.rentalPeriod?.endDate || item.endDate || '2026-10-10',
    totalDays: item.rentalPeriod?.totalDays || item.totalDays || 1,
  },
  totalPrice: item.totalPrice ?? item.totalRentalPrice ?? 0,
  status: item.status === 'active' ? 'renting' : item.status || 'pending',
});

// Soft UI Tooltip for Recharts
const CustomRevenueTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    const orders = payload[0].payload?.orders;

    return (
      <div className="bg-slate-900/95 text-white px-3.5 py-2.5 rounded-xl shadow-xl text-xs border border-slate-700/60 backdrop-blur-md">
        <div className="text-[11px] text-slate-400 font-medium">{label}</div>
        <div className="font-bold text-[#67BEC3] text-sm mt-0.5">
          {formatVND(val)}
        </div>
        {typeof orders === 'number' && (
          <div className="text-[11px] text-slate-300 mt-1 flex items-center gap-1">
            <span>Orders:</span>
            <span className="font-semibold text-white">{orders}</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

// Status Badge Renderer
const renderStatusBadge = (status) => {
  switch (status) {
    case 'pending':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          Pending
        </span>
      );
    case 'renting':
    case 'active':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#E8F6F7] text-[#286E74] border border-[#B2E2E4]">
          Renting
        </span>
      );
    case 'approved':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          Approved
        </span>
      );
    case 'completed':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          Completed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 capitalize">
          {status}
        </span>
      );
  }
};

export const OwnerOverviewTab = ({
  kpi,
  charts = {},
  utilization = [],
  recentBookings = [],
  onNavigate,
  onOpenPostModal,
  onRefresh,
  isLoading = false,
}) => {
  const t = STRINGS.owner.overview;
  const [revenueTimeRange, setRevenueTimeRange] = useState('month');

  // Safe fallback KPI values from live DB
  const safeKpi = {
    totalDevices: kpi?.totalDevices ?? 0,
    activeRentals: kpi?.activeRentals ?? 0,
    pendingApprovals: kpi?.pendingApprovals ?? 0,
    monthlyRevenue: kpi?.monthlyRevenue ?? 0,
    monthlyRevenueFormatted:
      kpi?.monthlyRevenueFormatted ||
      formatVND(kpi?.monthlyRevenue ?? 0),
    trustScore: kpi?.trustScore ?? 100,
    ratingAvg: kpi?.ratingAvg ?? 5.0,
    utilizationRate: kpi?.utilizationRate ?? 0,
  };

  const normalizedBookings = recentBookings.map(normalizeRentalItem);
  const activeRevenueData =
    (charts && charts[revenueTimeRange]) ||
    (charts && charts.month) ||
    [];
  const topDevices = Array.isArray(utilization) ? utilization : [];

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {t.title}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{t.subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs disabled:opacity-60 cursor-pointer"
            disabled={isLoading}
            title={t.refresh}
          >
            <RefreshCw
              size={14}
              className={isLoading ? 'animate-spin' : ''}
            />
            <span>{isLoading ? t.loading : t.refresh}</span>
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-[#67BEC3] text-white hover:bg-[#4CA6AC] transition-all shadow-xs cursor-pointer"
            onClick={onOpenPostModal}
          >
            <Plus size={14} />
            <span>{t.postDeviceBtn}</span>
          </button>
        </div>
      </div>

      {/* 2. 4 KPI Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* KPI 1: Total Devices */}
        <div className="admin-kpi-card bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="w-11 h-11 rounded-xl bg-[#EEF8F8] text-[#67BEC3] flex items-center justify-center">
              <Layers size={22} />
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 whitespace-nowrap shrink-0">
              <ArrowUpRight size={13} />
              +12%
            </span>
          </div>
          <div>
            <p className="text-3xl font-bold text-slate-800 tracking-tight">
              {safeKpi.totalDevices}
            </p>
            <p className="text-sm font-medium text-slate-500 mt-1">
              {t.kpis.totalDevices}
            </p>
          </div>
        </div>

        {/* KPI 2: Active Rentals */}
        <div className="admin-kpi-card bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="w-11 h-11 rounded-xl bg-[#EEF8F8] text-[#67BEC3] flex items-center justify-center">
              <ShoppingBag size={22} />
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 whitespace-nowrap shrink-0">
              <ArrowUpRight size={13} />
              +25%
            </span>
          </div>
          <div>
            <p className="text-3xl font-bold text-slate-800 tracking-tight">
              {safeKpi.activeRentals}
            </p>
            <p className="text-sm font-medium text-slate-500 mt-1">
              {t.kpis.activeRentals}
            </p>
          </div>
        </div>

        {/* KPI 3: Pending Requests */}
        <div className="admin-kpi-card bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="w-11 h-11 rounded-xl bg-[#EEF8F8] text-[#67BEC3] flex items-center justify-center">
              <Clock size={22} />
            </div>
            <span
              className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${
                safeKpi.pendingApprovals > 0
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-emerald-50 text-emerald-600'
              }`}
            >
              {safeKpi.pendingApprovals > 0 ? 'Requires action' : 'All clear'}
            </span>
          </div>
          <div>
            <p className="text-3xl font-bold text-slate-800 tracking-tight">
              {safeKpi.pendingApprovals}
            </p>
            <p className="text-sm font-medium text-slate-500 mt-1">
              {t.kpis.pendingApprovals}
            </p>
          </div>
        </div>

        {/* KPI 4: Monthly Revenue */}
        <div className="admin-kpi-card bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="w-11 h-11 rounded-xl bg-[#EEF8F8] text-[#67BEC3] flex items-center justify-center">
              <TrendingUp size={22} />
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 whitespace-nowrap shrink-0">
              <ArrowUpRight size={13} />
              +18.5%
            </span>
          </div>
          <div>
            <p className="text-3xl font-bold text-[#67BEC3] tracking-tight">
              {safeKpi.monthlyRevenueFormatted}
            </p>
            <p className="text-sm font-medium text-slate-500 mt-1">
              {t.kpis.monthlyRevenue}
            </p>
          </div>
        </div>
      </div>

      {/* 3. 2-Column Grid: Recharts Revenue Chart & Equipment Utilization */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (lg:col-span-7 xl:col-span-8): Recharts AreaChart */}
        <div className="admin-card lg:col-span-7 xl:col-span-8 bg-white rounded-2xl p-6 lg:p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight whitespace-nowrap">
                {t.kpiAndRevenueTitle}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{t.subtitle}</p>
            </div>

            {/* Time Range Selector Tabs */}
            <div
              className="inline-flex items-center p-1 bg-slate-50 rounded-xl border border-slate-200 self-start sm:self-auto shrink-0"
              role="tablist"
            >
              <button
                type="button"
                role="tab"
                aria-selected={revenueTimeRange === '7d'}
                onClick={() => setRevenueTimeRange('7d')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  revenueTimeRange === '7d'
                    ? 'bg-white text-[#286E74] font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                {t.revenueReport.timeRanges['7d']}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={revenueTimeRange === 'month'}
                onClick={() => setRevenueTimeRange('month')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  revenueTimeRange === 'month'
                    ? 'bg-white text-[#286E74] font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                {t.revenueReport.timeRanges.month}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={revenueTimeRange === 'year'}
                onClick={() => setRevenueTimeRange('year')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  revenueTimeRange === 'year'
                    ? 'bg-white text-[#286E74] font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                {t.revenueReport.timeRanges.year}
              </button>
            </div>
          </div>

          {/* Recharts AreaChart Container */}
          <div className="w-full h-72 md:h-80 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={activeRevenueData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <defs>
                  <linearGradient
                    id="ownerRevenueGradient"
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
                  fill="url(#ownerRevenueGradient)"
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

        {/* Right (lg:col-span-5 xl:col-span-4): Equipment Utilization Breakdown */}
        <div className="admin-card lg:col-span-5 xl:col-span-4 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3 mb-6">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight whitespace-nowrap">
                {t.utilizationInsight.title}
              </h2>
              <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-[#EEF8F8] text-[#286E74] whitespace-nowrap shrink-0">
                {safeKpi.utilizationRate}% {t.utilizationInsight.occupancySuffix || 'Occupancy'}
              </span>
            </div>

            <div className="flex flex-col">
              {topDevices.length > 0 ? (
                topDevices.map((item, idx) => (
                  <div key={item.id || idx} className="flex flex-col gap-2 mb-4 last:mb-0">
                    <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                      <span
                        className="font-semibold text-slate-800 truncate max-w-[140px] sm:max-w-[190px]"
                        title={item.name}
                      >
                        {item.name}
                      </span>
                      <span className="ml-auto text-xs text-slate-500 whitespace-nowrap shrink-0 pl-2">
                        <strong className="text-slate-700 font-semibold">
                          {item.count}
                        </strong>{' '}
                        {t.utilizationInsight.deviceUnit} ({item.percent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden mt-1">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${item.percent}%`,
                          backgroundColor: item.color || '#67BEC3',
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  {STRINGS.admin?.devices?.table?.emptyMessage || 'No equipment utilization data yet.'}
                </div>
              )}
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="pt-4 mt-4 border-t border-slate-100 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => onNavigate(ROUTES.OWNER_DEVICES)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-[#EEF8F8] text-slate-700 hover:text-[#286E74] text-xs font-semibold transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-[#67BEC3]" />
                <span>{t.quickActions.manageDevices}</span>
              </div>
              <ArrowRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => onNavigate(ROUTES.OWNER_CALENDAR)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-[#EEF8F8] text-slate-700 hover:text-[#286E74] text-xs font-semibold transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-[#67BEC3]" />
                <span>{t.quickActions.blockCalendar}</span>
              </div>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Recent Rental Requests Table */}
      <div className="bg-white rounded-2xl p-6 lg:p-8 border border-slate-100 shadow-sm flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              {t.recentBookings.title}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.recentBookings.subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate(ROUTES.OWNER_BOOKINGS)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#286E74] hover:text-[#1F5459] bg-[#EEF8F8] px-3.5 py-2 rounded-xl transition-all cursor-pointer self-start sm:self-auto"
          >
            <span>{t.recentBookings.viewAll}</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {normalizedBookings.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-sm">
            <ShoppingBag size={32} className="mb-2 text-slate-300" />
            <p>{t.recentBookings.emptyMessage}</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 px-3">{t.recentBookings.colOrder}</th>
                  <th className="pb-3 px-3">{t.recentBookings.colDevice}</th>
                  <th className="pb-3 px-3">{t.recentBookings.colRenter}</th>
                  <th className="pb-3 px-3">{t.recentBookings.colPeriod}</th>
                  <th className="pb-3 px-3">{t.recentBookings.colAmount}</th>
                  <th className="pb-3 px-3">{t.recentBookings.colStatus}</th>
                  <th className="pb-3 px-3 text-right">
                    {t.recentBookings.colActions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {normalizedBookings.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    {/* Order ID */}
                    <td className="py-3 px-3 font-mono font-bold text-slate-700 whitespace-nowrap">
                      {item.id}
                    </td>

                    {/* Equipment */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.device.imageUrl}
                          alt={item.device.name}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-100"
                        />
                        <div className="flex flex-col">
                          <span
                            className="font-bold text-slate-900 max-w-[200px] truncate"
                            title={item.device.name}
                          >
                            {item.device.name}
                          </span>
                          <span className="text-[10px] text-slate-500 capitalize">
                            {item.device.category}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={item.renter.avatarUrl}
                          alt={item.renter.name}
                          className="w-8 h-8 rounded-full object-cover border border-slate-100"
                        />
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800">
                            {item.renter.name}
                          </span>
                          <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                            <ShieldCheck size={11} />
                            {t.recentBookings.trustScoreLabel}{' '}
                            {item.renter.trustScore}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Rental Period */}
                    <td className="py-3 px-3 whitespace-nowrap text-slate-600">
                      <div>
                        {item.rentalPeriod.startDate} →{' '}
                        {item.rentalPeriod.endDate}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                        {item.rentalPeriod.totalDays}{' '}
                        {t.recentBookings.unitDays}
                      </div>
                    </td>

                    {/* Total Amount */}
                    <td className="py-3 px-3 whitespace-nowrap font-bold text-[#286E74]">
                      {formatVND(item.totalPrice)}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {renderStatusBadge(item.status)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 whitespace-nowrap text-right">
                      <button
                        type="button"
                        onClick={() => onNavigate(ROUTES.OWNER_BOOKINGS)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-[#EEF8F8] hover:text-[#286E74] hover:border-[#67BEC3] font-semibold transition-all cursor-pointer shadow-2xs"
                        title={t.recentBookings.detailsBtn}
                      >
                        <Eye size={12} />
                        <span>{t.recentBookings.detailsBtn}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerOverviewTab;
