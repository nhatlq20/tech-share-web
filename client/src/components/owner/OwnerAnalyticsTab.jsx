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

export const OwnerAnalyticsTab = ({ 
  recentBookings = [], 
  kpi: propKpi, 
  charts = {},
  utilization = [],
  onNavigate 
}) => {
  const t = STRINGS.owner.analytics;
  const [timeRange, setTimeRange] = useState('month');

  // Live KPI data from MongoDB
  const kpiData = {
    totalRevenue: propKpi?.monthlyRevenue ?? 0,
    activeRentals: propKpi?.activeRentals ?? 0,
    totalDevices: propKpi?.totalDevices ?? 0,
    escrowHolding: propKpi?.escrowHolding ?? 0,
    utilizationRate: propKpi?.utilizationRate ?? 0,
  };

  // Live chart data from MongoDB
  const chartData = (charts && charts[timeRange]) || (charts && charts.month) || [];
  const topDevices = Array.isArray(utilization) ? utilization : [];
  const totalRevenue = chartData.reduce((acc, cur) => acc + (cur.revenue || 0), 0) || kpiData.totalRevenue;

  // Live pending rental requests from MongoDB
  const pendingRequests = useMemo(() => {
    return recentBookings
      .filter((b) => b.status === 'pending')
      .map((b) => ({
        id: b.id || b.bookingCode || b._id,
        deviceName: b.device?.name || b.deviceName || 'Tech Equipment',
        renterName: b.renter?.name || 'Customer',
        rentalFee: b.totalPrice ?? b.totalRentalPrice ?? 0,
        status: 'pending',
        rentalDuration: b.rentalPeriod
          ? `${b.rentalPeriod.totalDays} ${STRINGS.owner.overview.recentBookings.unitDays} (${b.rentalPeriod.startDate} - ${b.rentalPeriod.endDate})`
          : '2 days',
        renterAvatar: b.renter?.avatarUrl || b.renter?.avatar,
      }));
  }, [recentBookings]);

  return (
    <div className="owner-analytics-container flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto thin-scrollbar pr-1">
      {/* ================================================================= */}
      {/* SECTION 1: HEADER & PERIOD SELECTOR                               */}
      {/* ================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800 leading-none">
              {t.title}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#EEF8F8] text-[#286E74] border border-[#67BEC3]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#67BEC3] animate-pulse" />
              {t.realTimeBadge || 'Real-time'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {t.subtitle}
          </p>
        </div>

        {/* Period Selector Tabs: 7d | month | year */}
        <div className="flex items-center p-1 bg-slate-100 rounded-full border border-slate-200 shadow-xs">
          {Object.entries(t.timeRanges).map(([key, label]) => {
            const isActive = timeRange === key;
            return (
              <button
                key={key}
                type="button"
                className={`px-3.5 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#67BEC3] text-white shadow-xs'
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
      {/* SECTION 2: 4 OVERVIEW KPI STAT CARDS                              */}
      {/* ================================================================= */}
      <div className="shrink-0">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800">
              {t.kpiSectionTitle || 'KPI Overview'}
            </span>
            <span className="text-xs text-slate-400 font-normal">
              {t.kpiSectionSubtitle || '(Financial & Asset Utilization Metrics)'}
            </span>
          </div>
          <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <TrendingUp size={12} />
            <span>{t.growthBadge || '+18.5% this cycle'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* KPI 1: Net Revenue */}
          <div className="bg-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-all border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {t.kpis?.totalRevenue || 'Total Net Revenue'}
              </span>
              <div className="w-8 h-8 rounded-xl bg-[#EEF8F8] text-[#286E74] flex items-center justify-center border border-[#67BEC3]/30">
                <DollarSign size={17} color={COLORS.primary.DEFAULT} />
              </div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-slate-900 leading-tight">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(kpiData.totalRevenue)}
              </div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                <ArrowUpRight size={13} />
                <span>{t.growthComparison || '+18.5% compared to last period'}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {t.kpis?.totalRevenueSub || 'After platform fees'}
              </div>
            </div>
          </div>

          {/* KPI 2: Active Rented Equipment */}
          <div className="bg-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-all border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {t.kpis?.activeRentals || 'Active Rented Equipment'}
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <Laptop size={17} />
              </div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-slate-900 leading-tight">
                {kpiData.activeRentals} {t.unitsSuffix || 'units'}
              </div>
              <div className="text-[11px] text-[#286E74] font-semibold mt-1">
                {kpiData.totalDevices} {t.kpis?.activeRentalsSub || 'units in fleet'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {t.kpis?.activeRentalsDesc || 'Active revenue generating'}
              </div>
            </div>
          </div>

          {/* KPI 3: Escrow Held Deposit */}
          <div className="bg-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-all border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {t.kpis?.escrowHolding || 'Escrow Deposits Held'}
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
                <span>{t.kpis?.escrowHoldingSub || 'TechShare Guaranteed'}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {t.kpis?.escrowHoldingDesc || '100% asset protection'}
              </div>
            </div>
          </div>

          {/* KPI 4: Fleet Utilization Rate */}
          <div className="bg-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-all border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {t.kpis?.utilizationRate || 'Fleet Utilization Rate'}
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
                  className="bg-[#67BEC3] h-1.5 rounded-full transition-all duration-500" 
                  style={{ width: `${kpiData.utilizationRate}%` }} 
                />
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {t.kpis?.utilizationRateSub || 'High utilization efficiency'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* SECTION 3: REVENUE RECHARTS AREA CHART & FLEET UTILIZATION        */}
      {/* ================================================================= */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#EEF8F8] text-[#286E74] flex items-center justify-center">
              <BarChart3 size={17} color={COLORS.primary.DEFAULT} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 leading-tight">
                {t.revenueTitle}
              </h2>
              <span className="text-[11px] text-slate-400">
                {t.totalPeriodPrefix || 'Total this period:'} <strong className="text-[#286E74]">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalRevenue)}</strong>
              </span>
            </div>
          </div>
          <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
            {t.unitVnd || 'Unit: VND'}
          </span>
        </div>

        {/* 2 Columns: Recharts AreaChart + Fleet Utilization */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Column 1 (lg:col-span-8): Recharts AreaChart */}
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

          {/* Column 2 (lg:col-span-4): Equipment Utilization */}
          <div className="lg:col-span-4 bg-slate-50/70 rounded-xl p-4 border border-slate-100 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800">
                  {t.utilizationInsight?.title || 'Fleet Utilization Rate'}
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {kpiData.utilizationRate}% {t.utilizationInsight?.occupancySuffix || 'Occupancy'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">
                {t.utilizationInsight?.topDevicesTitle || 'Top Revenue Generating Equipment'}
              </p>
            </div>

            {/* Top Devices Progress Bars */}
            <div className="flex flex-col gap-3 my-auto">
              {topDevices.length > 0 ? (
                topDevices.map((item, idx) => (
                  <div key={item.id || idx} className="flex flex-col">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-700 truncate max-w-[150px]" title={item.name}>
                        {item.name}
                      </span>
                      <span className="font-bold text-slate-800">{item.percent}%</span>
                    </div>
                    <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ width: `${item.percent}%`, backgroundColor: item.color || '#67BEC3' }} 
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">
                  {STRINGS.admin?.devices?.table?.emptyMessage || 'No equipment utilization data yet.'}
                </div>
              )}
            </div>

            <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between">
              <span>{t.utilizationInsight?.assetEfficiency || 'Asset efficiency:'}</span>
              <span className="font-semibold text-emerald-600">{t.utilizationInsight?.efficiencyOptimal || 'Optimal 92/100'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* SECTION 4: RECENT RENTAL REQUESTS (FADED TO FOCUS ON FINANCIALS)  */}
      {/* ================================================================= */}
      <div className="opacity-60 transition-opacity hover:opacity-85 bg-transparent shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {t.recentRequests?.title || 'Recent Rental Requests'}
            </span>
            <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium">
              {pendingRequests.length} {t.recentRequests?.badge || 'pending'}
            </span>
          </div>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate(ROUTES.OWNER_BOOKINGS)}
              className="text-[11px] text-slate-500 hover:text-slate-800 font-medium inline-flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>{t.recentRequests?.viewAllBtn || 'View all requests'}</span>
              <ArrowRight size={11} />
            </button>
          )}
        </div>
        <p className="text-[11px] text-slate-400 mb-2.5">
          {t.recentRequests?.hint || 'Secondary data • Faded to maintain focus on primary financial KPIs'}
        </p>

        {/* Faded requests list from MongoDB */}
        {pendingRequests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="bg-slate-100/70 p-3 rounded-xl border border-slate-200/80 shadow-none flex items-center gap-2.5"
              >
                {/* Renter Avatar */}
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

                {/* Booking details */}
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
                    {t.recentRequests?.customerPrefix || 'Customer:'} {req.renterName} • {req.rentalDuration}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-semibold text-slate-600">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(req.rentalFee)}
                    </span>
                    <span className="text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                      {t.recentRequests?.statusPending || 'Pending'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-4 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            {STRINGS.owner.overview.recentBookings.emptyMessage || 'No pending rental requests currently.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerAnalyticsTab;
