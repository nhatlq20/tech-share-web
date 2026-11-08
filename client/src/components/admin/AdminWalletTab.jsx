import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  Search,
  Filter,
  Download,
  RotateCw,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  X,
  CreditCard,
  DollarSign,
} from 'lucide-react';
import {
  getAdminWalletOverview,
  getAdminWalletTransactions,
  getAdminWalletTransactionDetails,
  getAdminWalletExportUrl,
} from '../../services/adminService.js';
import { formatPrice, formatDate } from '../../utils/formatters.js';

const TYPE_CONFIG = {
  topup: { label: 'Nạp tiền', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  withdrawal: { label: 'Rút tiền', color: 'text-rose-700 bg-rose-50 border-rose-200' },
  withdraw: { label: 'Rút tiền', color: 'text-rose-700 bg-rose-50 border-rose-200' },
  deposit_hold: { label: 'Giữ cọc Escrow', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  deposit_lock: { label: 'Giữ cọc Escrow', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  deposit_release: { label: 'Hoàn cọc', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  deposit_refund: { label: 'Hoàn cọc', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  rental_income: { label: 'Tiền thuê thiết bị', color: 'text-teal-700 bg-teal-50 border-teal-200' },
  rental_payout: { label: 'Chi trả tiền thuê', color: 'text-teal-700 bg-teal-50 border-teal-200' },
  payment: { label: 'Thanh toán đơn', color: 'text-slate-700 bg-slate-100 border-slate-200' },
};

const STATUS_CONFIG = {
  success: { label: 'Thành công', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  completed: { label: 'Thành công', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending: { label: 'Đang xử lý', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  failed: { label: 'Thất bại', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
};

export const AdminWalletTab = () => {
  const [overview, setOverview] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selected Transaction Modal
  const [selectedTx, setSelectedTx] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch overview
      const ovRes = await getAdminWalletOverview();
      if (ovRes && ovRes.data) {
        setOverview(ovRes.data);
      }

      // Fetch transactions
      const txRes = await getAdminWalletTransactions({
        page,
        limit: 10,
        type: typeFilter,
        status: statusFilter,
        search,
      });
      if (txRes && txRes.data) {
        setTransactions(Array.isArray(txRes.data) ? txRes.data : []);
        setTotalPages(txRes.pagination?.totalPages || 1);
        setTotalCount(txRes.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu ví hệ thống:', err);
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, statusFilter, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExportCsv = () => {
    const url = getAdminWalletExportUrl({
      type: typeFilter,
      status: statusFilter,
    });
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span>Ví & Giao dịch Toàn sàn (Escrow Ledger)</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
              Đối soát thời gian thực
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Giám sát số dư khả dụng, hạn mức ký quỹ tiền cọc Escrow và luồng tiền ra vào nền tảng TechShare.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-2xs cursor-pointer"
          >
            <Download size={14} className="text-slate-500" />
            <span>Xuất CSV</span>
          </button>
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-xl hover:bg-teal-100 transition shadow-2xs cursor-pointer"
          >
            <RotateCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* 2. Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Số dư ví thành viên */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block mb-1">
              Tổng số dư ví thành viên
            </span>
            <span className="text-xl font-bold text-slate-800">
              {formatPrice(overview?.totalWalletBalance || 0)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-1">Tiền khả dụng của User & Owner</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center shrink-0">
            <Wallet size={20} />
          </div>
        </div>

        {/* Card 2: Ký quỹ Escrow đang giữ */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block mb-1">
              Ký quỹ cọc Escrow (Nghĩa vụ)
            </span>
            <span className="text-xl font-bold text-amber-600">
              {formatPrice(overview?.totalEscrowBalance || 0)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-1">Đang khóa an toàn theo đơn thuê</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <ShieldCheck size={20} />
          </div>
        </div>

        {/* Card 3: Tổng tiền chi trả chủ máy */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block mb-1">
              Tổng chi trả tiền thuê (Owner)
            </span>
            <span className="text-xl font-bold text-emerald-600">
              {formatPrice(overview?.totalPayouts || 0)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-1">Giải ngân khi đơn hoàn tất</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <ArrowUpRight size={20} />
          </div>
        </div>

        {/* Card 4: Tổng cọc đã hoàn */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block mb-1">
              Tổng cọc đã hoàn (Renter)
            </span>
            <span className="text-xl font-bold text-blue-600">
              {formatPrice(overview?.totalRefunds || 0)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-1">Sau khi trả thiết bị nguyên vẹn</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <ArrowDownLeft size={20} />
          </div>
        </div>
      </div>

      {/* 3. Filters & Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo người dùng, mã đơn..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
          >
            <option value="all">Mọi loại giao dịch</option>
            <option value="topup">Nạp tiền</option>
            <option value="withdraw">Rút tiền</option>
            <option value="deposit_lock">Giữ cọc</option>
            <option value="deposit_refund">Hoàn cọc</option>
            <option value="rental_payout">Nhận tiền thuê</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
          >
            <option value="all">Mọi trạng thái</option>
            <option value="completed">Thành công</option>
            <option value="pending">Đang xử lý</option>
            <option value="failed">Thất bại</option>
          </select>
        </div>
      </div>

      {/* 4. Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Mã GD</th>
                <th className="py-3.5 px-4">Người dùng</th>
                <th className="py-3.5 px-4">Loại giao dịch</th>
                <th className="py-3.5 px-4">Số tiền (VND)</th>
                <th className="py-3.5 px-4">Số dư sau GD</th>
                <th className="py-3.5 px-4">Mã đơn liên quan</th>
                <th className="py-3.5 px-4 text-center">Trạng thái</th>
                <th className="py-3.5 px-4 text-center">Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RotateCw size={24} className="animate-spin text-teal-600" />
                      <span>Đang tải lịch sử giao dịch...</span>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Không tìm thấy bản ghi giao dịch nào.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const typeInfo = TYPE_CONFIG[tx.type] || {
                    label: tx.type,
                    color: 'text-slate-600 bg-slate-100 border-slate-200',
                  };
                  const statusInfo = STATUS_CONFIG[tx.status] || {
                    label: tx.status,
                    bg: 'bg-slate-100 text-slate-600 border-slate-200',
                  };
                  return (
                    <tr key={tx._id} className="hover:bg-slate-50/70 transition">
                      {/* Mã GD */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                        #{tx._id?.substring(0, 8).toUpperCase()}
                      </td>

                      {/* Người dùng */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{tx.user?.name || 'N/A'}</div>
                        <div className="text-[10px] text-slate-400">{tx.user?.email || ''}</div>
                      </td>

                      {/* Loại GD */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                      </td>

                      {/* Số tiền */}
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {formatPrice(tx.amount || 0)}
                      </td>

                      {/* Số dư sau GD */}
                      <td className="py-3.5 px-4 text-slate-600">
                        {formatPrice(tx.balanceAfter || 0)}
                      </td>

                      {/* Mã đơn */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-teal-700">
                        {tx.booking?.bookingCode ? `#${tx.booking.bookingCode}` : '—'}
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusInfo.bg}`}>
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* Thời gian */}
                      <td className="py-3.5 px-4 text-center text-[11px] text-slate-400 whitespace-nowrap">
                        {formatDate(tx.createdAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Trang {page} / {totalPages} (Tổng {totalCount} giao dịch)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Trước
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminWalletTab;
