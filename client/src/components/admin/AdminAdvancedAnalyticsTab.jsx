import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShieldCheck,
  RotateCw,
  Download,
  Layers,
  PieChart,
  Tag,
  ShoppingBag,
} from 'lucide-react';
import {
  getAdminAdvancedAnalytics,
  getAdminAnalyticsExportUrl,
} from '../../services/adminService.js';
import { formatPrice } from '../../utils/formatters.js';

export const AdminAdvancedAnalyticsTab = () => {
  const [period, setPeriod] = useState('7d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAdminAdvancedAnalytics({ period });
      if (res && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải báo cáo phân tích chuyên sâu:', err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleExportCsv = () => {
    const url = getAdminAnalyticsExportUrl({ period });
    window.open(url, '_blank');
  };

  const kpi = data?.kpi || {};
  const charts = data?.charts || {};

  return (
    <div className="space-y-6">
      {/* 1. Header & Period Filter Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Báo cáo & Phân tích chuyên sâu</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Dữ liệu tài chính, hiệu suất vận hành và xu hướng tăng trưởng nền tảng TechShare
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
            {[
              { id: '7d', label: '7 ngày qua' },
              { id: 'month', label: '30 ngày' },
              { id: 'year', label: 'Năm nay' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  period === p.id ? 'bg-white text-teal-700 shadow-sm font-bold' : 'hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchAnalytics}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            title="Làm mới"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            Xuất file CSV
          </button>
        </div>
      </div>

      {/* 2. Top Tier Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Booking Value */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Tổng giá trị giao dịch (Gross)</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {formatPrice(kpi.grossBookingValue || 0)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Bao gồm tiền thuê máy và cọc ban đầu</p>
        </div>

        {/* Realized Platform Fee Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Doanh thu sàn thực tế</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">
            {formatPrice(kpi.platformServiceFeeRevenue || 0)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">10% phí dịch vụ trên tiền thuê (không tính cọc)</p>
        </div>

        {/* Escrow Held */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Ký quỹ đang giữ (Escrow)</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-700">
            {formatPrice(kpi.totalEscrowHeld || 0)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Tiền cọc và tiền thuê các đơn đang diễn ra</p>
        </div>

        {/* Completion Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Tỷ lệ hoàn tất đơn thuê</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {kpi.bookingCompletionRate || 0}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Đơn thuê đã trả máy thành công</p>
        </div>
      </div>

      {/* 3. Operational Mini Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-100 text-center">
          <span className="text-slate-400 text-[11px] block">Người dùng active</span>
          <span className="text-lg font-bold text-slate-800">{kpi.activeUsers || 0}</span>
          <span className="text-[10px] text-slate-400 block">/ {kpi.totalUsers || 0} tổng</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-100 text-center">
          <span className="text-slate-400 text-[11px] block">Thiết bị đã duyệt</span>
          <span className="text-lg font-bold text-emerald-600">{kpi.approvedDevices || 0}</span>
          <span className="text-[10px] text-slate-400 block">/ {kpi.totalDevices || 0} tổng</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-100 text-center">
          <span className="text-slate-400 text-[11px] block">Đang cho thuê</span>
          <span className="text-lg font-bold text-blue-600">{kpi.activeBookings || 0}</span>
          <span className="text-[10px] text-slate-400 block">đơn thực tế</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-100 text-center">
          <span className="text-slate-400 text-[11px] block">Đơn chờ duyệt</span>
          <span className="text-lg font-bold text-amber-600">{kpi.pendingBookings || 0}</span>
          <span className="text-[10px] text-slate-400 block">cần chủ duyệt</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-100 text-center">
          <span className="text-slate-400 text-[11px] block">Tranh chấp mở</span>
          <span className="text-lg font-bold text-rose-600">{kpi.openDisputes || 0}</span>
          <span className="text-[10px] text-slate-400 block">cần xử lý</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-100 text-center">
          <span className="text-slate-400 text-[11px] block">eKYC chờ duyệt</span>
          <span className="text-lg font-bold text-teal-600">{kpi.pendingEkyc || 0}</span>
          <span className="text-[10px] text-slate-400 block">hồ sơ mới</span>
        </div>
      </div>

      {/* 4. Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart A: Booking Trends */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-teal-600" />
              Xu hướng phát sinh đơn thuê
            </h3>
            <span className="text-[11px] text-slate-400">Số đơn theo ngày</span>
          </div>

          <div className="space-y-3 pt-2">
            {Array.isArray(charts.bookingTrends) &&
              charts.bookingTrends.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700">{item.name}</span>
                    <span className="font-bold text-teal-700">{item.orders} đơn</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, item.orders * 8)}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Chart B: Category Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-600" />
              Phân bổ danh mục thiết bị
            </h3>
            <span className="text-[11px] text-slate-400">Tỷ lệ trên toàn sàn</span>
          </div>

          <div className="space-y-3 pt-2">
            {Array.isArray(charts.categoryDistribution) && charts.categoryDistribution.length > 0 ? (
              charts.categoryDistribution.map((cat, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700 capitalize">{cat.category}</span>
                    <span className="font-bold text-slate-800">
                      {cat.count} máy ({cat.percent}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                      style={{ width: `${cat.percent}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">Chưa có dữ liệu danh mục</p>
            )}
          </div>
        </div>
      </div>

      {/* 5. Bottom Distribution Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Status Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-teal-600" />
            Cơ cấu trạng thái đơn thuê
          </h3>
          <div className="grid grid-cols-2 gap-3 pt-2">
            {Array.isArray(charts.bookingStatusDistribution) &&
              charts.bookingStatusDistribution.map((item, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[11px] text-slate-500 font-medium block">{item.status}</span>
                  <span className="text-xl font-bold text-slate-800 mt-1 block">{item.count}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Voucher Usage Ranking */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Tag className="w-4 h-4 text-teal-600" />
            Top Voucher áp dụng nhiều nhất
          </h3>
          <div className="space-y-2.5 pt-2">
            {Array.isArray(charts.voucherUsage) && charts.voucherUsage.length > 0 ? (
              charts.voucherUsage.map((v, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 font-mono font-bold text-slate-800">
                    <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <span>{v.code}</span>
                  </div>
                  <div className="text-slate-600">
                    Đã dùng: <span className="font-bold text-teal-700">{v.usedCount} lượt</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">Chưa có lượt sử dụng voucher nào</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAdvancedAnalyticsTab;
