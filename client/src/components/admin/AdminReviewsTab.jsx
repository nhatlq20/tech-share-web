import React, { useState, useEffect, useCallback } from 'react';
import {
  Star,
  Search,
  Eye,
  ShieldAlert,
  AlertCircle,
  RotateCw,
  X,
  Clock,
} from 'lucide-react';
import {
  getAdminReviews,
  getAdminReviewDetails,
  moderateAdminReview,
} from '../../services/adminService.js';
import { formatDate } from '../../utils/formatters.js';

const STATUS_CONFIG = {
  approved: { label: 'Đã duyệt', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  hidden: { label: 'Đã ẩn (Vi phạm)', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
  flagged: { label: 'Cần xem xét', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
};

const TARGET_MAP = {
  device: { label: 'Thiết bị', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  owner: { label: 'Chủ máy', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
  renter: { label: 'Người thuê', bg: 'bg-teal-50 text-teal-700 border-teal-200' },
};

export const AdminReviewsTab = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [targetTypeFilter, setTargetTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selected Review for Modal
  const [selectedReview, setSelectedReview] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalMode, setModalMode] = useState(null); // 'view' | 'moderate' | null

  // Moderation form
  const [modStatus, setModStatus] = useState('approved');
  const [modReason, setModReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAdminReviews({
        page,
        limit: 12,
        rating: ratingFilter,
        targetType: targetTypeFilter,
        moderationStatus: statusFilter,
        search,
      });
      if (res && res.data) {
        setReviews(Array.isArray(res.data) ? res.data : []);
        setTotalPages(res.pagination?.totalPages || 1);
        setTotalCount(res.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách đánh giá:', err);
    } finally {
      setLoading(false);
    }
  }, [page, ratingFilter, targetTypeFilter, statusFilter, search]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleOpenModal = async (rev, mode = 'view') => {
    try {
      setDetailLoading(true);
      setModalMode(mode);
      setModStatus(rev.moderationStatus || 'approved');
      setModReason(rev.moderationReason || '');
      setErrorMsg('');

      const res = await getAdminReviewDetails(rev._id);
      setSelectedReview(res?.data || rev);
    } catch {
      setSelectedReview(rev);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleModerateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReview) return;
    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await moderateAdminReview(selectedReview._id, {
        moderationStatus: modStatus,
        reason: modReason,
      });

      if (res && res.data) {
        setReviews((prev) =>
          prev.map((r) =>
            r._id === selectedReview._id
              ? {
                  ...r,
                  moderationStatus: modStatus,
                  isHidden: modStatus === 'hidden',
                  moderationReason: modReason,
                }
              : r
          )
        );
        setModalMode(null);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Lỗi khi cập nhật trạng thái kiểm duyệt.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="flex items-center gap-0.5 text-amber-400">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`w-3.5 h-3.5 ${s <= rating ? 'fill-amber-400' : 'text-slate-200 fill-slate-100'}`}
          />
        ))}
        <span className="ml-1 text-slate-700 font-bold text-xs">{rating}.0</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
              <Star className="w-5 h-5 fill-teal-600 text-teal-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Kiểm duyệt đánh giá hệ thống</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Kiểm duyệt tính trung thực, xử lý nội dung vi phạm và đồng bộ điểm sao tín nhiệm
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchReviews}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            title="Làm mới"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      {/* 2. Filter Controls */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Box */}
          <div className="relative min-w-[240px] flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo nội dung đánh giá..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
            />
          </div>

          {/* Rating Filter */}
          <select
            value={ratingFilter}
            onChange={(e) => {
              setRatingFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-700 font-medium"
          >
            <option value="all">Tất cả số sao</option>
            <option value="5">5 sao (Tuyệt vời)</option>
            <option value="4">4 sao (Hài lòng)</option>
            <option value="3">3 sao (Bình thường)</option>
            <option value="2">2 sao (Kém)</option>
            <option value="1">1 sao (Rất tệ)</option>
          </select>

          {/* Target Type Filter */}
          <select
            value={targetTypeFilter}
            onChange={(e) => {
              setTargetTypeFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-700 font-medium"
          >
            <option value="all">Tất cả đối tượng</option>
            <option value="device">Thiết bị</option>
            <option value="owner">Chủ máy (Owner)</option>
            <option value="renter">Người thuê (Renter)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-700 font-medium"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="approved">Đã duyệt (Hiển thị)</option>
            <option value="hidden">Đã ẩn (Vi phạm)</option>
            <option value="flagged">Cần xem xét</option>
          </select>
        </div>

        <div className="text-xs text-slate-500">
          Tổng số đánh giá: <span className="font-bold text-slate-800">{totalCount}</span>
        </div>
      </div>

      {/* 3. Reviews Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Thời gian & Đơn thuê</th>
                <th className="py-3.5 px-4">Người đánh giá</th>
                <th className="py-3.5 px-4">Đối tượng</th>
                <th className="py-3.5 px-4">Điểm & Bình luận</th>
                <th className="py-3.5 px-4 text-center">Trạng thái</th>
                <th className="py-3.5 px-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
                    Đang tải danh sách đánh giá...
                  </td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    Không tìm thấy đánh giá nào phù hợp.
                  </td>
                </tr>
              ) : (
                reviews.map((r) => {
                  const statusConf = STATUS_CONFIG[r.moderationStatus] || STATUS_CONFIG.approved;
                  const targetConf = TARGET_MAP[r.targetType] || TARGET_MAP.device;

                  return (
                    <tr key={r._id} className="hover:bg-slate-50/50 transition">
                      {/* Thời gian & Đơn thuê */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-teal-700">
                          {r.booking?.bookingCode || `BK-${String(r.bookingId || r._id).slice(-6).toUpperCase()}`}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(r.createdAt)}</span>
                        </div>
                      </td>

                      {/* Người đánh giá */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{r.reviewer?.name || 'Người dùng'}</div>
                        <div className="text-[11px] text-slate-400">{r.reviewer?.email || 'N/A'}</div>
                      </td>

                      {/* Đối tượng */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-md border mb-1 ${targetConf.bg}`}>
                          {targetConf.label}
                        </span>
                        <div className="font-medium text-slate-800 truncate max-w-[160px]" title={r.device?.name || ''}>
                          {r.targetType === 'device' || !r.targetType
                            ? r.device?.name || 'Thiết bị công nghệ'
                            : r.targetType === 'owner'
                            ? r.owner?.name || 'Chủ máy'
                            : r.renter?.name || 'Người thuê'}
                        </div>
                      </td>

                      {/* Điểm & Bình luận */}
                      <td className="py-3.5 px-4 max-w-sm">
                        <div className="mb-1">{renderStars(r.rating)}</div>
                        <p className="text-slate-700 truncate font-normal" title={r.comment}>
                          "{r.comment}"
                        </p>
                        {Array.isArray(r.images) && r.images.length > 0 && (
                          <div className="flex gap-1 mt-1.5">
                            {r.images.slice(0, 3).map((img, i) => (
                              <img
                                key={i}
                                src={img}
                                alt="review"
                                className="w-7 h-7 rounded object-cover border border-slate-200"
                              />
                            ))}
                            {r.images.length > 3 && (
                              <span className="text-[10px] text-slate-400 self-center">
                                +{r.images.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2.5 py-1 text-[11px] font-bold rounded-lg border ${statusConf.bg}`}>
                          {statusConf.label}
                        </span>
                      </td>

                      {/* Thao tác */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenModal(r, 'view')}
                            className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 transition"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenModal(r, 'moderate')}
                            className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition"
                            title="Kiểm duyệt"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
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

        {/* Pagination */}
        {!loading && reviews.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Trang <span className="font-semibold text-slate-800">{page}</span> / {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition"
              >
                Trước
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Modal (View Details or Moderate Review) */}
      {modalMode && selectedReview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                  <Star className="w-4 h-4 fill-teal-600 text-teal-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {modalMode === 'moderate' ? 'Kiểm duyệt đánh giá' : 'Chi tiết đánh giá'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Mã đơn thuê: {selectedReview.booking?.bookingCode || 'N/A'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalMode(null)}
                className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Context Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-medium block mb-1">Người đánh giá:</span>
                  <div className="font-bold text-slate-800">{selectedReview.reviewer?.name || 'Người dùng'}</div>
                  <div className="text-slate-500">{selectedReview.reviewer?.email || 'N/A'}</div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-medium block mb-1">Mục tiêu đánh giá:</span>
                  <div className="font-bold text-teal-700">
                    {selectedReview.targetType === 'device' || !selectedReview.targetType
                      ? selectedReview.device?.name || 'Thiết bị'
                      : selectedReview.targetType === 'owner'
                      ? selectedReview.owner?.name || 'Chủ máy'
                      : selectedReview.renter?.name || 'Người thuê'}
                  </div>
                  <div className="text-slate-500">
                    Loại: <span className="font-semibold">{selectedReview.targetType || 'device'}</span>
                  </div>
                </div>
              </div>

              {/* Rating & Comment Box */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Điểm số:</span>
                  <div>{renderStars(selectedReview.rating)}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block mb-1">Nội dung bình luận:</span>
                  <p className="text-slate-800 bg-white p-3 rounded-lg border border-slate-200/60 leading-relaxed font-medium">
                    "{selectedReview.comment}"
                  </p>
                </div>

                {/* Review Images */}
                {Array.isArray(selectedReview.images) && selectedReview.images.length > 0 && (
                  <div>
                    <span className="text-slate-500 font-semibold block mb-1.5">Hình ảnh đính kèm:</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedReview.images.map((img, i) => (
                        <a key={i} href={img} target="_blank" rel="noreferrer">
                          <img
                            src={img}
                            alt={`Review ${i}`}
                            className="w-16 h-16 rounded-lg object-cover border border-slate-200 hover:opacity-90 transition shadow-sm"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Owner Reply if present */}
              {selectedReview.ownerReply && (
                <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100 text-blue-900">
                  <span className="font-bold block mb-1">Phản hồi từ Chủ thiết bị:</span>
                  <p className="italic font-medium">"{selectedReview.ownerReply.comment}"</p>
                </div>
              )}

              {/* Moderation Form (if mode === 'moderate') */}
              {modalMode === 'moderate' ? (
                <form onSubmit={handleModerateSubmit} className="pt-2 border-t border-slate-100 space-y-3">
                  <h4 className="font-bold text-slate-800 text-xs">Cập nhật trạng thái kiểm duyệt</h4>

                  {errorMsg && (
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Quyết định kiểm duyệt:</label>
                    <select
                      value={modStatus}
                      onChange={(e) => setModStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-semibold text-slate-800"
                    >
                      <option value="approved">Duyệt hợp lệ (Hiển thị công khai)</option>
                      <option value="hidden">Ẩn vi phạm (Không hiển thị & Không tính vào sao)</option>
                      <option value="flagged">Đánh dấu xem xét (Cần kiểm tra thêm)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Lý do kiểm duyệt / Ghi chú:</label>
                    <textarea
                      required={modStatus === 'hidden'}
                      rows={3}
                      placeholder="Nhập lý do ẩn vi phạm hoặc nội dung kiểm duyệt..."
                      value={modReason}
                      onChange={(e) => setModReason(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-medium"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setModalMode(null)}
                      className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-slate-600 transition"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-sm transition disabled:opacity-50"
                    >
                      {submitting ? 'Đang lưu...' : 'Lưu quyết định'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 font-medium block">Trạng thái hiện tại:</span>
                    <span className="font-bold text-slate-800 mt-0.5 inline-block">
                      {STATUS_CONFIG[selectedReview.moderationStatus]?.label || 'Đã duyệt'}
                    </span>
                    {selectedReview.moderationReason && (
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Lý do: {selectedReview.moderationReason}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setModalMode('moderate')}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold transition shadow-sm"
                  >
                    Thay đổi kiểm duyệt
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer (when viewing) */}
            {modalMode === 'view' && (
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setModalMode(null)}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 transition"
                >
                  Đóng
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReviewsTab;
