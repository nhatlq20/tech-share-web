import React, { useState, useEffect, useCallback } from 'react';
import {
  Scale,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCw,
  X,
  FileText,
  DollarSign,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import {
  getAdminDisputes,
  getAdminDisputeDetails,
  reviewAdminDispute,
  resolveAdminDispute,
  dismissAdminDispute,
} from '../../services/adminService.js';
import { formatPrice, formatDate } from '../../utils/formatters.js';

const DISPUTE_STATUS = {
  pending: { label: 'Chờ xử lý', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  in_review: { label: 'Đang xem xét', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  resolved: { label: 'Đã giải quyết', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  dismissed: { label: 'Đã bác bỏ', bg: 'bg-slate-100 text-slate-700 border-slate-200' },
};

export const AdminDisputesTab = () => {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selected Dispute Modal
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Resolution Form State
  const [decision, setDecision] = useState('partial_deduct');
  const [deductAmount, setDeductAmount] = useState(0);
  const [adminNote, setAdminNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const fetchDisputes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAdminDisputes({
        page,
        limit: 10,
        status: statusFilter,
        search,
      });
      if (res && res.data) {
        setDisputes(Array.isArray(res.data) ? res.data : []);
        setTotalPages(res.pagination?.totalPages || 1);
        setTotalCount(res.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách tranh chấp:', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  const handleOpenDetail = async (id) => {
    try {
      setDetailLoading(true);
      setActionError('');
      setActionSuccess('');
      const res = await getAdminDisputeDetails(id);
      if (res && res.data) {
        const d = res.data;
        setSelectedDispute(d);
        const reqDeduct = d.requestedDeductAmount || 0;
        const deposit = d.booking?.pricing?.deposit || 0;
        setDeductAmount(Math.min(reqDeduct, deposit));
        setDecision(reqDeduct >= deposit ? 'full_deduct' : 'partial_deduct');
        setAdminNote('');
      }
    } catch (err) {
      console.error('Lỗi tải chi tiết tranh chấp:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleReview = async () => {
    if (!selectedDispute) return;
    try {
      setActionLoading(true);
      setActionError('');
      const res = await reviewAdminDispute(selectedDispute._id, { adminNote });
      if (res && res.success) {
        setActionSuccess('Đã chuyển tranh chấp sang trạng thái đang xem xét.');
        setSelectedDispute((prev) => ({ ...prev, status: 'in_review' }));
        fetchDisputes();
      }
    } catch (err) {
      setActionError(err.message || 'Lỗi khi cập nhật trạng thái xem xét.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedDispute) return;
    const deposit = selectedDispute.booking?.pricing?.deposit || 0;
    if (decision === 'partial_deduct') {
      const num = Number(deductAmount);
      if (isNaN(num) || num < 0) {
        setActionError('Số tiền khấu trừ không được âm.');
        return;
      }
      if (num > deposit) {
        setActionError(`Số tiền khấu trừ (${num.toLocaleString()}₫) vượt quá tiền cọc thực tế (${deposit.toLocaleString()}₫).`);
        return;
      }
    }

    try {
      setActionLoading(true);
      setActionError('');
      const res = await resolveAdminDispute(selectedDispute._id, {
        decision,
        deductAmount: decision === 'full_refund' ? 0 : decision === 'full_deduct' ? deposit : deductAmount,
        adminNote,
      });
      if (res && res.success) {
        setActionSuccess('Phân xử tranh chấp thành công. Tiền cọc đã được giải ngân chính xác.');
        setSelectedDispute((prev) => ({ ...prev, status: 'resolved', adminDecision: decision }));
        fetchDisputes();
      }
    } catch (err) {
      setActionError(err.message || 'Lỗi khi phân xử tranh chấp.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDismiss = async () => {
    if (!selectedDispute) return;
    try {
      setActionLoading(true);
      setActionError('');
      const res = await dismissAdminDispute(selectedDispute._id, { adminNote });
      if (res && res.success) {
        setActionSuccess('Đã bác bỏ yêu cầu bồi thường và hoàn trả cọc đầy đủ.');
        setSelectedDispute((prev) => ({ ...prev, status: 'dismissed' }));
        fetchDisputes();
      }
    } catch (err) {
      setActionError(err.message || 'Lỗi khi bác bỏ khiếu nại.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span>Xử lý Tranh chấp & Khiếu nại Cọc</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-semibold border border-purple-200">
              {totalCount} vụ việc
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Thẩm định hiện trạng hư hỏng, đối soát ảnh bàn giao và đưa ra phán quyết giải ngân tiền cọc Escrow an toàn.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchDisputes}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-xl hover:bg-teal-100 transition shadow-2xs cursor-pointer"
        >
          <RotateCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* 2. Filters & Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo mã đơn, lý do, người khiếu nại..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {['all', 'pending', 'in_review', 'resolved', 'dismissed'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {st === 'all'
                ? 'Tất cả'
                : DISPUTE_STATUS[st]?.label || st}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Disputes Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Đơn thuê</th>
                <th className="py-3.5 px-4">Người khiếu nại</th>
                <th className="py-3.5 px-4">Lý do tranh chấp</th>
                <th className="py-3.5 px-4">Yêu cầu bồi thường</th>
                <th className="py-3.5 px-4">Ngày tạo</th>
                <th className="py-3.5 px-4 text-center">Trạng thái</th>
                <th className="py-3.5 px-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RotateCw size={24} className="animate-spin text-teal-600" />
                      <span>Đang tải danh sách tranh chấp...</span>
                    </div>
                  </td>
                </tr>
              ) : disputes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Không có khiếu nại tranh chấp nào trong mục này.
                  </td>
                </tr>
              ) : (
                disputes.map((d) => {
                  const statusInfo = DISPUTE_STATUS[d.status] || {
                    label: d.status,
                    bg: 'bg-slate-100 text-slate-600 border-slate-200',
                  };
                  return (
                    <tr key={d._id} className="hover:bg-slate-50/70 transition">
                      {/* Đơn thuê */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-800">
                          #{d.booking?.bookingCode || 'TS-BOOKING'}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[120px]">
                          {d.booking?.deviceId?.name || 'Thiết bị'}
                        </div>
                      </td>

                      {/* Người khiếu nại */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{d.claimant?.name || 'Người dùng'}</div>
                        <span className="text-[10px] text-slate-400">
                          {d.claimant?.role === 'owner' ? 'Chủ thiết bị' : 'Người thuê'}
                        </span>
                      </td>

                      {/* Lý do */}
                      <td className="py-3.5 px-4">
                        <p className="max-w-xs truncate text-slate-700" title={d.reason}>
                          {d.reason}
                        </p>
                      </td>

                      {/* Yêu cầu bồi thường */}
                      <td className="py-3.5 px-4 font-bold text-rose-600">
                        {formatPrice(d.requestedDeductAmount || 0)}
                      </td>

                      {/* Ngày tạo */}
                      <td className="py-3.5 px-4 text-[11px] text-slate-400 whitespace-nowrap">
                        {formatDate(d.createdAt)}
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusInfo.bg}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* Thao tác */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(d._id)}
                          className="px-3 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                        >
                          Xử lý
                        </button>
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
              Trang {page} / {totalPages} (Tổng {totalCount} vụ việc)
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

      {/* 4. Dispute Detail & Resolution Modal */}
      {selectedDispute && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedDispute(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span>Giải quyết Tranh chấp đơn #{selectedDispute.booking?.bookingCode}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      DISPUTE_STATUS[selectedDispute.status]?.bg || 'bg-slate-100'
                    }`}
                  >
                    {DISPUTE_STATUS[selectedDispute.status]?.label || selectedDispute.status}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Người khiếu nại: {selectedDispute.claimant?.name} ({selectedDispute.claimant?.email})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDispute(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Error / Success Feedback */}
            {actionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0" />
                <span>{actionError}</span>
              </div>
            )}
            {actionSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle size={15} className="shrink-0" />
                <span>{actionSuccess}</span>
              </div>
            )}

            {/* Reason & Evidence Box */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Lý do khiếu nại từ đối tác
                </span>
                <p className="text-xs text-slate-800 font-medium leading-relaxed">
                  {selectedDispute.reason}
                </p>
              </div>

              {/* Evidence Images */}
              {Array.isArray(selectedDispute.evidenceImages) && selectedDispute.evidenceImages.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Ảnh chụp bằng chứng hiện trường
                  </span>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {selectedDispute.evidenceImages.map((imgUrl, i) => (
                      <a
                        key={i}
                        href={imgUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-16 h-16 rounded-lg bg-slate-200 border border-slate-300 overflow-hidden shrink-0 hover:opacity-80 transition"
                      >
                        <img src={imgUrl} alt={`Bằng chứng ${i + 1}`} className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Financial Overview of Dispute */}
            <div className="grid grid-cols-2 gap-3 p-4 bg-teal-50/50 border border-teal-200 rounded-xl text-xs">
              <div>
                <span className="text-slate-500 block">Tiền cọc giữ chỗ (Escrow):</span>
                <span className="text-base font-bold text-slate-800">
                  {formatPrice(selectedDispute.booking?.pricing?.deposit || 0)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Yêu cầu bồi thường:</span>
                <span className="text-base font-bold text-rose-600">
                  {formatPrice(selectedDispute.requestedDeductAmount || 0)}
                </span>
              </div>
            </div>

            {/* Resolution Form (Chỉ cho phép khi chưa resolved / dismissed) */}
            {selectedDispute.status !== 'resolved' && selectedDispute.status !== 'dismissed' ? (
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-800 block">
                  Phương án Phân xử của Quản trị viên
                </span>

                {/* Decision Radios */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label
                    className={`p-3 rounded-xl border text-xs font-semibold cursor-pointer transition flex flex-col justify-between gap-1 ${
                      decision === 'full_refund'
                        ? 'border-teal-500 bg-teal-50 text-teal-800'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value="full_refund"
                      checked={decision === 'full_refund'}
                      onChange={() => setDecision('full_refund')}
                      className="sr-only"
                    />
                    <span>Hoàn cọc 100%</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Người thuê nhận lại đủ tiền cọc
                    </span>
                  </label>

                  <label
                    className={`p-3 rounded-xl border text-xs font-semibold cursor-pointer transition flex flex-col justify-between gap-1 ${
                      decision === 'partial_deduct'
                        ? 'border-teal-500 bg-teal-50 text-teal-800'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value="partial_deduct"
                      checked={decision === 'partial_deduct'}
                      onChange={() => setDecision('partial_deduct')}
                      className="sr-only"
                    />
                    <span>Bồi thường 1 phần</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Khấu trừ 1 phần theo thiệt hại
                    </span>
                  </label>

                  <label
                    className={`p-3 rounded-xl border text-xs font-semibold cursor-pointer transition flex flex-col justify-between gap-1 ${
                      decision === 'full_deduct'
                        ? 'border-teal-500 bg-teal-50 text-teal-800'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value="full_deduct"
                      checked={decision === 'full_deduct'}
                      onChange={() => setDecision('full_deduct')}
                      className="sr-only"
                    />
                    <span>Khấu trừ 100%</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Chuyển toàn bộ cọc cho chủ máy
                    </span>
                  </label>
                </div>

                {/* Amount input for partial deduct */}
                {decision === 'partial_deduct' && (
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Số tiền khấu trừ bồi thường cho Chủ máy (VND):
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={selectedDispute.booking?.pricing?.deposit || 0}
                      value={deductAmount}
                      onChange={(e) => setDeductAmount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Tiền cọc còn lại sẽ tự động hoàn trả về ví người thuê: {formatPrice((selectedDispute.booking?.pricing?.deposit || 0) - deductAmount)}.
                    </p>
                  </div>
                )}

                {/* Admin Note Input */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Ghi chú phán quyết / Căn cứ thẩm định:
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ghi rõ lý do đưa ra mức bồi thường hoặc kết quả thương lượng..."
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    {selectedDispute.status === 'pending' && (
                      <button
                        type="button"
                        onClick={handleReview}
                        disabled={actionLoading}
                        className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold transition cursor-pointer"
                      >
                        Đưa vào xem xét
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleDismiss}
                      disabled={actionLoading}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition cursor-pointer"
                    >
                      Bác bỏ khiếu nại
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleResolve}
                    disabled={actionLoading}
                    className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    {actionLoading && <RotateCw size={13} className="animate-spin" />}
                    <span>Xác nhận Phân xử & Giải ngân</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-100 rounded-xl text-xs text-slate-600 space-y-1">
                <span className="font-bold text-slate-800">Tranh chấp này đã hoàn tất:</span>
                <p>Quyết định: {selectedDispute.adminDecision}</p>
                <p>Số tiền khấu trừ: {formatPrice(selectedDispute.finalDeductAmount || 0)}</p>
                {selectedDispute.adminNote && <p className="italic text-slate-500">"{selectedDispute.adminNote}"</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDisputesTab;
