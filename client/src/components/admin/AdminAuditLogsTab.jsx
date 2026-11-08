import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCw,
  X,
  FileText,
  Activity,
  Terminal,
} from 'lucide-react';
import { getAdminAuditLogs } from '../../services/adminService.js';

const ACTION_CONFIG = {
  dispute_resolve: { label: 'Giải quyết khiếu nại', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  dispute_dismiss: { label: 'Bác bỏ khiếu nại', bg: 'bg-slate-100 text-slate-700 border-slate-200' },
  dispute_review: { label: 'Xem xét khiếu nại', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  user_status_toggle: { label: 'Khóa / Mở khóa người dùng', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  device_moderate: { label: 'Duyệt / Từ chối thiết bị', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
  ekyc_approve: { label: 'Duyệt eKYC', bg: 'bg-teal-50 text-teal-700 border-teal-200' },
  ekyc_reject: { label: 'Từ chối eKYC', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
  review_moderate: { label: 'Kiểm duyệt đánh giá', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  setting_update: { label: 'Cập nhật cấu hình', bg: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
};

export const AdminAuditLogsTab = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [targetTypeFilter, setTargetTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selected Log Detail Modal
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAdminAuditLogs({
        page,
        limit: 15,
        action: actionFilter,
        targetType: targetTypeFilter,
        status: statusFilter,
        search,
      });
      if (res && res.data) {
        setLogs(Array.isArray(res.data) ? res.data : []);
        setTotalPages(res.pagination?.totalPages || 1);
        setTotalCount(res.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Lỗi khi tải nhật ký kiểm toán:', err);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, targetTypeFilter, statusFilter, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Nhật ký kiểm toán hệ thống</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ghi vết bảo mật và minh bạch toàn bộ thao tác can thiệp của Quản trị viên
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchLogs}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            title="Làm mới"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      {/* 2. Filter & Search Controls */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Bar */}
          <div className="relative min-w-[240px] flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm hành động, email, đối tượng..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
            />
          </div>

          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-700 font-medium"
          >
            <option value="all">Tất cả hành động</option>
            <option value="dispute_resolve">Giải quyết khiếu nại</option>
            <option value="dispute_dismiss">Bác bỏ khiếu nại</option>
            <option value="dispute_review">Xem xét khiếu nại</option>
            <option value="user_status_toggle">Khóa/Mở người dùng</option>
            <option value="device_moderate">Kiểm duyệt thiết bị</option>
            <option value="ekyc_approve">Duyệt eKYC</option>
            <option value="ekyc_reject">Từ chối eKYC</option>
            <option value="review_moderate">Kiểm duyệt đánh giá</option>
            <option value="setting_update">Cập nhật cấu hình</option>
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
            <option value="Dispute">Khiếu nại (Dispute)</option>
            <option value="Booking">Đơn thuê (Booking)</option>
            <option value="User">Người dùng (User)</option>
            <option value="Device">Thiết bị (Device)</option>
            <option value="Wallet">Ví tiền (Wallet)</option>
            <option value="Review">Đánh giá (Review)</option>
            <option value="eKYC">Hồ sơ eKYC</option>
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
            <option value="success">Thành công</option>
            <option value="failure">Thất bại</option>
          </select>
        </div>

        <div className="text-xs text-slate-500">
          Tổng số bản ghi: <span className="font-bold text-slate-800">{totalCount}</span>
        </div>
      </div>

      {/* 3. Audit Logs Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Thời gian</th>
                <th className="py-3.5 px-4">Quản trị viên</th>
                <th className="py-3.5 px-4">Hành động</th>
                <th className="py-3.5 px-4">Đối tượng</th>
                <th className="py-3.5 px-4">Lý do / Mô tả</th>
                <th className="py-3.5 px-4 text-center">Trạng thái</th>
                <th className="py-3.5 px-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
                    Đang tải nhật ký kiểm toán...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    Không tìm thấy bản ghi kiểm toán nào phù hợp.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const actionConf = ACTION_CONFIG[log.action] || {
                    label: log.action,
                    bg: 'bg-slate-100 text-slate-700 border-slate-200',
                  };

                  return (
                    <tr key={log._id} className="hover:bg-slate-50/50 transition">
                      {/* Thời gian */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatTimestamp(log.createdAt)}</span>
                        </div>
                      </td>

                      {/* Quản trị viên */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{log.adminName || 'Admin'}</div>
                        <div className="text-[11px] text-slate-400">{log.adminEmail || 'N/A'}</div>
                      </td>

                      {/* Hành động */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 text-[11px] font-bold rounded-lg border ${actionConf.bg}`}
                        >
                          {actionConf.label}
                        </span>
                      </td>

                      {/* Đối tượng */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{log.targetType || 'N/A'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ID: {log.targetId ? String(log.targetId).slice(-8) : 'N/A'}
                        </div>
                      </td>

                      {/* Lý do / Mô tả */}
                      <td className="py-3.5 px-4 max-w-xs truncate" title={log.reason || 'Không có mô tả'}>
                        <span className="text-slate-600">{log.reason || '—'}</span>
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3.5 px-4 text-center">
                        {log.status === 'success' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Thành công
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" /> Thất bại
                          </span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 transition"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && logs.length > 0 && (
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

      {/* 4. Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Chi tiết bản ghi kiểm toán</h3>
                  <p className="text-xs text-slate-500">ID: {selectedLog._id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-medium block mb-1">Quản trị viên thực hiện:</span>
                  <div className="font-bold text-slate-800">{selectedLog.adminName || 'Admin'}</div>
                  <div className="text-slate-500">{selectedLog.adminEmail || 'N/A'}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-1">ID: {selectedLog.adminId}</div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-medium block mb-1">Thời gian ghi nhận:</span>
                  <div className="font-bold text-slate-800">{formatTimestamp(selectedLog.createdAt)}</div>
                  <div className="text-slate-500 mt-1">
                    IP:{' '}
                    <span className="font-mono text-slate-700">{selectedLog.ipAddress || '127.0.0.1'}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-medium block mb-1">Hành động & Đối tượng:</span>
                  <div className="font-bold text-teal-700">{selectedLog.action}</div>
                  <div className="text-slate-600 mt-0.5">
                    Mục tiêu: <span className="font-semibold">{selectedLog.targetType}</span> (ID:{' '}
                    <span className="font-mono">{selectedLog.targetId || 'N/A'}</span>)
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-medium block mb-1">Trạng thái thực thi:</span>
                  <div>
                    {selectedLog.status === 'success' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Thành công
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                        <XCircle className="w-3.5 h-3.5" /> Thất bại
                      </span>
                    )}
                  </div>
                  {selectedLog.errorMessage && (
                    <div className="text-rose-600 text-[11px] mt-1">{selectedLog.errorMessage}</div>
                  )}
                </div>
              </div>

              {/* Lý do / Ghi chú */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-medium block mb-1">Lý do can thiệp / Ghi chú:</span>
                <p className="text-slate-800 font-medium leading-relaxed">
                  {selectedLog.reason || 'Không có ghi chú thêm.'}
                </p>
              </div>

              {/* User Agent */}
              {selectedLog.userAgent && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-medium block mb-0.5">User Agent:</span>
                  <p className="text-[11px] text-slate-500 font-mono break-all">{selectedLog.userAgent}</p>
                </div>
              )}

              {/* Raw Metadata JSON */}
              <div className="bg-slate-900 text-slate-200 p-4 rounded-2xl font-mono text-[11px] overflow-x-auto shadow-inner">
                <div className="flex items-center justify-between text-slate-400 pb-2 mb-2 border-b border-slate-800">
                  <span>Dữ liệu Metadata (Sanitized JSON)</span>
                  <Activity className="w-3.5 h-3.5 text-teal-400" />
                </div>
                <pre>{JSON.stringify(selectedLog.metadata || {}, null, 2)}</pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
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

export default AdminAuditLogsTab;
