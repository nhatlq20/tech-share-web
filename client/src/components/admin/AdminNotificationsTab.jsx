import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Search,
  Plus,
  Send,
  Clock,
  RotateCw,
  X,
  AlertCircle,
} from 'lucide-react';
import {
  getAdminNotifications,
  sendAdminNotification,
  getAdminNotificationHistory,
} from '../../services/adminService.js';
import { formatDate } from '../../utils/formatters.js';

const TYPE_CONFIG = {
  system: { label: 'Hệ thống', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  promo: { label: 'Khuyến mãi', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  booking: { label: 'Đơn thuê', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
  wallet: { label: 'Ví tiền', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  chat: { label: 'Tin nhắn', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
};

export const AdminNotificationsTab = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [readFilter, setReadFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Send Notification Modal
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    targetType: 'all', // 'all' | 'role' | 'specific_users'
    targetRole: 'renter',
    userIds: '',
    title: '',
    body: '',
    type: 'system',
    url: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAdminNotifications({
        page,
        limit: 12,
        type: typeFilter,
        isRead: readFilter,
        search,
      });
      if (res && res.data) {
        setNotifications(Array.isArray(res.data) ? res.data : []);
        setTotalPages(res.pagination?.totalPages || 1);
        setTotalCount(res.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách thông báo:', err);
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, readFilter, search]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleOpenSendModal = () => {
    setFormData({
      targetType: 'all',
      targetRole: 'renter',
      userIds: '',
      title: '',
      body: '',
      type: 'system',
      url: '',
    });
    setFormError('');
    setFormSuccess('');
    setSendModalOpen(true);
  };

  const handleOpenHistoryModal = async () => {
    setHistoryModalOpen(true);
    try {
      setHistoryLoading(true);
      const res = await getAdminNotificationHistory({ limit: 20 });
      if (res && res.data) {
        setHistoryList(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) {
      console.error('Lỗi tải lịch sử phát thông báo:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSendSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');
    setFormSuccess('');

    try {
      const payload = {
        targetType: formData.targetType,
        targetRole: formData.targetType === 'role' ? formData.targetRole : undefined,
        userIds:
          formData.targetType === 'specific_users'
            ? formData.userIds
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : undefined,
        title: formData.title,
        body: formData.body,
        type: formData.type,
        url: formData.url || undefined,
      };

      const res = await sendAdminNotification(payload);
      if (res && res.success) {
        setFormSuccess(res.message || 'Đã gửi thông báo thành công.');
        setTimeout(() => {
          setSendModalOpen(false);
          fetchNotifications();
        }, 1200);
      }
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Lỗi khi gửi thông báo.');
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Quản lý & Phát thông báo</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Phát tin tức toàn sàn, gửi cảnh báo bảo trì và điều hướng thông báo người dùng
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchNotifications}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            title="Làm mới"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
          <button
            onClick={handleOpenHistoryModal}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
          >
            <Clock className="w-4 h-4 text-slate-500" />
            Lịch sử phát sóng
          </button>
          <button
            onClick={handleOpenSendModal}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition"
          >
            <Send className="w-4 h-4" />
            Phát thông báo mới
          </button>
        </div>
      </div>

      {/* 2. Filter & Search Controls */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Box */}
          <div className="relative min-w-[240px] flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tiêu đề, nội dung..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-700 font-medium"
          >
            <option value="all">Tất cả loại tin</option>
            <option value="system">Hệ thống (System)</option>
            <option value="promo">Khuyến mãi (Promo)</option>
            <option value="booking">Đơn thuê (Booking)</option>
            <option value="wallet">Ví tiền (Wallet)</option>
          </select>

          {/* Read Status Filter */}
          <select
            value={readFilter}
            onChange={(e) => {
              setReadFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-700 font-medium"
          >
            <option value="all">Tất cả trạng thái đọc</option>
            <option value="true">Đã xem</option>
            <option value="false">Chưa xem</option>
          </select>
        </div>

        <div className="text-xs text-slate-500">
          Tổng số thông báo: <span className="font-bold text-slate-800">{totalCount}</span>
        </div>
      </div>

      {/* 3. Notifications Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Thời gian</th>
                <th className="py-3.5 px-4">Người nhận</th>
                <th className="py-3.5 px-4">Loại tin</th>
                <th className="py-3.5 px-4">Tiêu đề & Nội dung</th>
                <th className="py-3.5 px-4 text-center">Đã xem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-400">
                    <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
                    Đang tải danh sách thông báo...
                  </td>
                </tr>
              ) : notifications.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    Không tìm thấy thông báo nào phù hợp.
                  </td>
                </tr>
              ) : (
                notifications.map((n) => {
                  const typeConf = TYPE_CONFIG[n.type] || TYPE_CONFIG.system;

                  return (
                    <tr key={n._id} className="hover:bg-slate-50/50 transition">
                      {/* Thời gian */}
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDate(n.createdAt)}</span>
                        </div>
                      </td>

                      {/* Người nhận */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{n.userId?.name || 'Người dùng'}</div>
                        <div className="text-[11px] text-slate-400">{n.userId?.email || 'N/A'}</div>
                      </td>

                      {/* Loại tin */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2.5 py-1 text-[11px] font-bold rounded-lg border ${typeConf.bg}`}>
                          {typeConf.label}
                        </span>
                      </td>

                      {/* Tiêu đề & Nội dung */}
                      <td className="py-3.5 px-4 max-w-md">
                        <div className="font-bold text-slate-900 mb-0.5">{n.title}</div>
                        <p className="text-slate-600 truncate font-normal" title={n.body}>
                          {n.body}
                        </p>
                      </td>

                      {/* Trạng thái đã xem */}
                      <td className="py-3.5 px-4 text-center">
                        {n.isRead ? (
                          <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-100 text-slate-600">
                            Đã đọc
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                            Chưa đọc
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && notifications.length > 0 && (
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

      {/* 4. Send Notification Modal */}
      {sendModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Phát thông báo mới</h3>
                  <p className="text-xs text-slate-500">Gửi thông báo diện rộng hoặc trực tiếp qua Socket.io</p>
                </div>
              </div>
              <button
                onClick={() => setSendModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendSubmit} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Đối tượng nhận thông báo:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'all', label: 'Tất cả người dùng' },
                    { id: 'role', label: 'Theo vai trò' },
                    { id: 'specific_users', label: 'Chỉ định User' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, targetType: t.id })}
                      className={`py-2 px-3 rounded-xl border text-center font-semibold transition ${
                        formData.targetType === t.id
                          ? 'bg-teal-50 border-teal-500 text-teal-700'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {formData.targetType === 'role' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Chọn nhóm vai trò:</label>
                  <select
                    value={formData.targetRole}
                    onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  >
                    <option value="renter">Người thuê (Renter)</option>
                    <option value="owner">Chủ thiết bị (Owner)</option>
                    <option value="admin">Ban quản trị (Admin)</option>
                  </select>
                </div>
              )}

              {formData.targetType === 'specific_users' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Danh sách User ID (cách nhau bằng dấu phẩy):
                  </label>
                  <textarea
                    rows={2}
                    placeholder="VD: 64e0a12f9b1c2b001a222222, 64e0a12f9b1c2b001a333333"
                    value={formData.userIds}
                    onChange={(e) => setFormData({ ...formData, userIds: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-mono text-[11px]"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phân loại thông báo:</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  >
                    <option value="system">Hệ thống (System)</option>
                    <option value="promo">Khuyến mãi (Promo)</option>
                    <option value="booking">Đơn thuê (Booking)</option>
                    <option value="wallet">Ví tiền (Wallet)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Đường dẫn liên kết (tùy chọn):</label>
                  <input
                    type="text"
                    placeholder="VD: /vouchers hoặc /profile"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tiêu đề thông báo:</label>
                <input
                  type="text"
                  required
                  placeholder="Nhập tiêu đề thông báo..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nội dung chi tiết:</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Nhập nội dung đầy đủ của thông báo..."
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-medium"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSendModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-slate-600 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {formSubmitting ? 'Đang gửi...' : 'Gửi thông báo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Broadcast History Modal */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Lịch sử phát thông báo</h3>
                  <p className="text-xs text-slate-500">Các đợt thông báo diện rộng được ghi vết trong kiểm toán</p>
                </div>
              </div>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto text-xs">
              {historyLoading ? (
                <div className="py-8 text-center text-slate-400">
                  <RotateCw className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-600" />
                  Đang tải lịch sử phát sóng...
                </div>
              ) : historyList.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  Chưa ghi nhận đợt phát sóng nào.
                </div>
              ) : (
                historyList.map((h) => (
                  <div key={h._id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{h.metadata?.title || h.reason}</span>
                      <span className="text-slate-400 text-[11px]">{formatDate(h.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600 text-[11px]">
                      <span>
                        Người thực hiện: <span className="font-semibold">{h.adminName || 'Admin'}</span>
                      </span>
                      <span>
                        Số người nhận: <span className="font-bold text-teal-700">{h.metadata?.recipientCount || 0}</span>
                      </span>
                      <span>
                        Đối tượng: <span className="font-semibold">{h.metadata?.targetType || 'all'}</span>
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNotificationsTab;
