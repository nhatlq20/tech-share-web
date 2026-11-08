import React, { useState, useEffect, useCallback } from 'react';
import {
  Tag,
  Search,
  Plus,
  Edit,
  Eye,
  Power,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCw,
  X,
} from 'lucide-react';
import {
  getAdminVouchers,
  getAdminVoucherDetails,
  createAdminVoucher,
  updateAdminVoucher,
  toggleAdminVoucherStatus,
} from '../../services/adminService.js';
import { formatPrice, formatDate } from '../../utils/formatters.js';

export const AdminVouchersTab = () => {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | 'detail' | null
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    type: 'percent',
    value: 10,
    minDays: 1,
    maxDiscount: 100000,
    expiryDate: '',
    usageLimit: 100,
    perUserLimit: 1,
    isActive: true,
  });

  const fetchVouchers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAdminVouchers({
        page,
        limit: 12,
        status: statusFilter,
        type: typeFilter,
        search,
      });
      if (res && res.data) {
        setVouchers(Array.isArray(res.data) ? res.data : []);
        setTotalPages(res.pagination?.totalPages || 1);
        setTotalCount(res.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Error loading vouchers list:', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, typeFilter, search]);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  const openCreateModal = () => {
    const defaultExpiry = new Date();
    defaultExpiry.setDate(defaultExpiry.getDate() + 30);
    setFormData({
      code: '',
      type: 'percent',
      value: 10,
      minDays: 1,
      maxDiscount: 100000,
      expiryDate: defaultExpiry.toISOString().split('T')[0],
      usageLimit: 100,
      perUserLimit: 1,
      isActive: true,
    });
    setFormError('');
    setModalMode('create');
  };

  const openEditModal = (v) => {
    setSelectedVoucher(v);
    const expDate = v.expiryDate ? new Date(v.expiryDate).toISOString().split('T')[0] : '';
    setFormData({
      code: v.code,
      type: v.type,
      value: v.value,
      minDays: v.minDays || 1,
      maxDiscount: v.maxDiscount || 0,
      expiryDate: expDate,
      usageLimit: v.usageLimit || 100,
      perUserLimit: v.perUserLimit || 1,
      isActive: v.isActive,
    });
    setFormError('');
    setModalMode('edit');
  };

  const openDetailModal = async (v) => {
    try {
      const res = await getAdminVoucherDetails(v._id);
      setSelectedVoucher(res?.data || v);
    } catch {
      setSelectedVoucher(v);
    }
    setModalMode('detail');
  };

  const handleToggleStatus = async (v) => {
    try {
      const targetActive = !v.isActive;
      await toggleAdminVoucherStatus(v._id, { isActive: targetActive });
      setVouchers((prev) =>
        prev.map((item) => (item._id === v._id ? { ...item, isActive: targetActive } : item))
      );
    } catch (err) {
      console.error('Error updating voucher status:', err);
    }
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSubmitting(true);

    try {
      if (modalMode === 'create') {
        const res = await createAdminVoucher(formData);
        if (res && res.data) {
          setModalMode(null);
          fetchVouchers();
        }
      } else if (modalMode === 'edit') {
        const res = await updateAdminVoucher(selectedVoucher._id, formData);
        if (res && res.data) {
          setModalMode(null);
          fetchVouchers();
        }
      }
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Error saving voucher data.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const isExpired = (expiryDate) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Voucher & Promotion Management</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure discount promotions, rates, and redemption limits
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchVouchers}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            title="Refresh"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition"
          >
            <Plus className="w-4 h-4" />Create New Voucher</button>
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
              placeholder="Search by voucher code..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-700 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="expired">Expired</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-700 font-medium"
          >
            <option value="all">All Discount Types</option>
            <option value="percent">Percentage (%)</option>
            <option value="fixed">Fixed Amount (VND)</option>
          </select>
        </div>

        <div className="text-xs text-slate-500">
          Total Vouchers: <span className="font-bold text-slate-800">{totalCount}</span>
        </div>
      </div>

      {/* 3. Vouchers Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Voucher Code</th>
                <th className="py-3.5 px-4">Type & Discount</th>
                <th className="py-3.5 px-4">Conditions</th>
                <th className="py-3.5 px-4 text-center">Redemptions</th>
                <th className="py-3.5 px-4">Expiration Date</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
                    Loading voucher list...
                  </td>
                </tr>
              ) : vouchers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No matching vouchers found.
                  </td>
                </tr>
              ) : (
                vouchers.map((v) => {
                  const expired = isExpired(v.expiryDate);
                  return (
                    <tr key={v._id} className="hover:bg-slate-50/50 transition">
                      {/* Mã Voucher */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200">
                          <Tag className="w-3.5 h-3.5 text-teal-600" />
                          <span>{v.code}</span>
                        </div>
                      </td>

                      {/* Loại & Mức giảm */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">
                          {v.type === 'percent' ? `${v.value}%` : formatPrice(v.value)}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {v.type === 'percent' ? 'Percentage Discount' : 'Fixed Cash Discount'}
                        </div>
                      </td>

                      {/* Điều kiện */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-700">
                          Min: <span className="font-semibold">{v.minDays || 1} days</span>
                        </div>
                        {v.type === 'percent' && v.maxDiscount > 0 && (
                          <div className="text-[11px] text-slate-500">
                            Max: <span className="font-semibold">{formatPrice(v.maxDiscount)}</span>
                          </div>
                        )}
                      </td>

                      {/* Lượt dùng */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-slate-800">{v.usedCount || 0}</span>
                        <span className="text-slate-400"> / {v.usageLimit || '∞'}</span>
                      </td>

                      {/* Hạn sử dụng */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span className={expired ? 'text-rose-600 font-semibold' : 'text-slate-600'}>
                            {formatDate(v.expiryDate)}
                          </span>
                        </div>
                        {expired && (
                          <span className="text-[10px] text-rose-500 font-medium">Expired</span>
                        )}
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3.5 px-4 text-center">
                        {expired ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-600 border border-slate-200">Expired</span>
                        ) : v.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            <XCircle className="w-3 h-3 text-amber-600" /> Inactive
                          </span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openDetailModal(v)}
                            className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 transition"
                            title="View details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEditModal(v)}
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition"
                            title="Edit voucher"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(v)}
                            className={`p-1.5 rounded-lg transition ${
                              v.isActive
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                            }`}
                            title={v.isActive ? 'Deactivate voucher' : 'Activate voucher'}
                          >
                            <Power className="w-3.5 h-3.5" />
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
        {!loading && vouchers.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Trang <span className="font-semibold text-slate-800">{page}</span> / {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition"
              >Prev</button>
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

      {/* 4. Create / Edit Voucher Modal */}
      {(modalMode === 'create' || modalMode === 'edit') && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {modalMode === 'create' ? 'Create Promotion Voucher' : 'Update Voucher Configuration'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {modalMode === 'create'
                      ? 'Set up discount parameters for rental orders'
                      : `Edit voucher: ${selectedVoucher?.code}`}
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

            {/* Modal Body Form */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Code */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Voucher Code:</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: TECHSHARE20"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-mono font-bold"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Discount Type:</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (VND)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Value */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Discount Value {formData.type === 'percent' ? '(%)' : '(VND)'}:
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={formData.type === 'percent' ? 100 : 100000000}
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>

                {/* Max Discount (if percent) */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Discount (VND):</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="0 for unlimited"
                    value={formData.maxDiscount}
                    onChange={(e) => setFormData({ ...formData, maxDiscount: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Min Days */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Minimum Rental (days):</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.minDays}
                    onChange={(e) => setFormData({ ...formData, minDays: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>

                {/* Expiry Date */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expiration Date:</label>
                  <input
                    type="date"
                    required
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Usage Limit */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Total Usage Limit:</label>
                  <input
                    type="number"
                    min={modalMode === 'edit' ? selectedVoucher?.usedCount || 1 : 1}
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({ ...formData, usageLimit: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                  {modalMode === 'edit' && (
                    <span className="text-[10px] text-slate-400">
                      Already redeemed: {selectedVoucher?.usedCount || 0} times
                    </span>
                  )}
                </div>

                {/* Per User Limit */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Redemptions per User:</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.perUserLimit}
                    onChange={(e) => setFormData({ ...formData, perUserLimit: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
              </div>

              {/* Status Switch */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                />
                <label htmlFor="isActiveToggle" className="font-semibold text-slate-700 cursor-pointer">
                  Activate voucher immediately
                </label>
              </div>

              {/* Modal Footer Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold transition"
                >Cancel</button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {formSubmitting ? 'Saving...' : modalMode === 'create' ? 'Create Voucher' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Detail Modal */}
      {modalMode === 'detail' && selectedVoucher && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Voucher Details</h3>
                  <p className="text-xs font-mono text-teal-700">{selectedVoucher.code}</p>
                </div>
              </div>
              <button
                onClick={() => setModalMode(null)}
                className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3.5 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Voucher Code:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedVoucher.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Discount Type:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedVoucher.type === 'percent' ? 'Percentage Discount' : 'Fixed Cash Discount'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Discount Amount:</span>
                  <span className="font-bold text-teal-700">
                    {selectedVoucher.type === 'percent'
                      ? `${selectedVoucher.value}%`
                      : formatPrice(selectedVoucher.value)}
                  </span>
                </div>
                {selectedVoucher.type === 'percent' && selectedVoucher.maxDiscount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Max Discount:</span>
                    <span className="font-semibold text-slate-800">{formatPrice(selectedVoucher.maxDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Min Rental:</span>
                  <span className="font-semibold text-slate-800">{selectedVoucher.minDays || 1} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Expiration Date:</span>
                  <span className="font-semibold text-slate-800">{formatDate(selectedVoucher.expiryDate)}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Redeemed:</span>
                  <span className="font-bold text-slate-900">{selectedVoucher.usedCount || 0} times</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Limit:</span>
                  <span className="font-semibold text-slate-800">{selectedVoucher.usageLimit || 'Unlimited'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Limit per User:</span>
                  <span className="font-semibold text-slate-800">{selectedVoucher.perUserLimit || 1} times</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Recorded Rental Bookings:</span>
                  <span className="font-bold text-teal-700">{selectedVoucher.bookingUsageCount || 0} rentals</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setModalMode(null)}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 transition"
              >Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVouchersTab;
