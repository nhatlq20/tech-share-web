import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  Download,
  Eye,
  Calendar,
  Clock,
  User,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCw,
  X,
  ExternalLink,
} from 'lucide-react';
import {
  getAdminBookings,
  getAdminBookingDetails,
  getAdminBookingsExportUrl,
} from '../../services/adminService.js';
import { formatPrice, formatDate } from '../../utils/formatters.js';

const STATUS_CONFIG = {
  pending: { label: 'Pending', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'Approved', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  active: { label: 'Active', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  completed: { label: 'Completed', bg: 'bg-slate-100 text-slate-700 border-slate-200' },
  cancelled: { label: 'Cancelled', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
  rejected: { label: 'Rejected', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
  disputed: { label: 'Disputed', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
};

export const AdminBookingsTab = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selected Booking Details Modal
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAdminBookings({
        page,
        limit: 10,
        status: statusFilter,
        paymentStatus: paymentFilter,
        search,
      });
      if (res && res.data) {
        setBookings(Array.isArray(res.data) ? res.data : []);
        setTotalPages(res.pagination?.totalPages || 1);
        setTotalCount(res.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Error loading rental bookings:', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, paymentFilter, search]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleViewDetails = async (bId) => {
    try {
      setDetailLoading(true);
      const res = await getAdminBookingDetails(bId);
      if (res && res.data) {
        setSelectedBooking(res.data);
      }
    } catch (err) {
      console.error('Error viewing rental details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleExportCsv = () => {
    const url = getAdminBookingsExportUrl({
      status: statusFilter,
      paymentStatus: paymentFilter,
    });
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span>Platform Rental Management</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 font-semibold border border-teal-200">
              {totalCount} rentals
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Track, inspect handover statuses and oversee technology equipment rental workflows.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition shadow-2xs cursor-pointer"
          >
            <Download size={14} className="text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={fetchBookings}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-xl hover:bg-teal-100 transition shadow-2xs cursor-pointer"
          >
            <RotateCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Search & Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search order code, device, renter..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
          >
            <option value="all">All Order Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="disputed">Disputed</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => {
              setPaymentFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
          >
            <option value="all">All Payment Statuses</option>
            <option value="unpaid">Unpaid</option>
            <option value="deposit_held">Deposit Held (Escrow)</option>
            <option value="paid">Paid in Full</option>
            <option value="refunded">Refunded</option>
            <option value="disputed">Disputed</option>
          </select>
        </div>
      </div>

      {/* 3. Bookings Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Order Code</th>
                <th className="py-3.5 px-4">Device</th>
                <th className="py-3.5 px-4">Renter</th>
                <th className="py-3.5 px-4">Device Owner</th>
                <th className="py-3.5 px-4">Rental Period</th>
                <th className="py-3.5 px-4">Total Amount (VND)</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RotateCw size={24} className="animate-spin text-teal-600" />
                      <span>Loading rental list...</span>
                    </div>
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No rental bookings found matching filters.
                  </td>
                </tr>
              ) : (
                bookings.map((b) => {
                  const statusInfo = STATUS_CONFIG[b.status] || {
                    label: b.status,
                    bg: 'bg-slate-100 text-slate-600 border-slate-200',
                  };
                  return (
                    <tr key={b._id} className="hover:bg-slate-50/70 transition">
                      {/* Mã đơn */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        #{b.bookingCode || b._id?.substring(0, 8).toUpperCase()}
                      </td>

                      {/* Thiết bị */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                            {b.device?.images?.[0] ? (
                              <img
                                src={b.device.images[0]}
                                alt={b.device.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Smartphone size={16} className="text-slate-400" />
                            )}
                          </div>
                          <span className="font-bold text-slate-800 max-w-[140px] truncate" title={b.device?.name}>
                            {b.device?.name || 'Device'}
                          </span>
                        </div>
                      </td>

                      {/* Người thuê */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{b.renter?.name || 'Renter'}</div>
                        <div className="text-[10px] text-slate-400">{b.renter?.phone || b.renter?.email || ''}</div>
                      </td>

                      {/* Chủ thiết bị */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{b.owner?.name || 'Owner'}</div>
                        <div className="text-[10px] text-slate-400">{b.owner?.phone || b.owner?.email || ''}</div>
                      </td>

                      {/* Thời gian thuê */}
                      <td className="py-3.5 px-4 text-[11px] text-slate-500 whitespace-nowrap">
                        {formatDate(b.startDate)} ➔ {formatDate(b.endDate)}
                      </td>

                      {/* Tổng tiền */}
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {formatPrice(b.pricing?.totalAmount || 0)}
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
                          onClick={() => handleViewDetails(b._id)}
                          className="p-1.5 rounded-lg hover:bg-teal-50 text-slate-500 hover:text-teal-700 transition cursor-pointer"
                          title="View rental details"
                        >
                          <Eye size={16} />
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
              Page {page} / {totalPages} (Total {totalCount} rentals)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >Prev</button>
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

      {/* 4. Booking Details Modal */}
      {selectedBooking && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedBooking(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span>Rental Details #{selectedBooking.bookingCode}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      STATUS_CONFIG[selectedBooking.status]?.bg || 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {STATUS_CONFIG[selectedBooking.status]?.label || selectedBooking.status}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Created Date: {formatDate(selectedBooking.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Device & Date Banner */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                {selectedBooking.device?.images?.[0] ? (
                  <img
                    src={selectedBooking.device.images[0]}
                    alt={selectedBooking.device.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Smartphone size={24} className="text-slate-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-sm text-slate-800 truncate">
                  {selectedBooking.device?.name}
                </h4>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                  <span>Rental Period:</span>
                  <span className="font-semibold text-slate-700">
                    {formatDate(selectedBooking.startDate)} ➔ {formatDate(selectedBooking.endDate)}
                  </span>
                </div>
              </div>
            </div>

            {/* Participants Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Renter Card */}
              <div className="p-4 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Renter
                </span>
                <p className="text-sm font-bold text-slate-800">{selectedBooking.renter?.name}</p>
                <p className="text-xs text-slate-500">{selectedBooking.renter?.email}</p>
                <p className="text-xs text-slate-500">{selectedBooking.renter?.phone || 'Phone not updated'}</p>
              </div>

              {/* Owner Card */}
              <div className="p-4 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Device Owner
                </span>
                <p className="text-sm font-bold text-slate-800">{selectedBooking.owner?.name}</p>
                <p className="text-xs text-slate-500">{selectedBooking.owner?.email}</p>
                <p className="text-xs text-slate-500">{selectedBooking.owner?.phone || 'Phone not updated'}</p>
              </div>
            </div>

            {/* Pricing Breakdown */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Financial Details
              </span>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Device Rental Fee:</span>
                <span className="font-semibold">{formatPrice(selectedBooking.pricing?.rentalFee || 0)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Escrow Security Deposit:</span>
                <span className="font-semibold">{formatPrice(selectedBooking.pricing?.deposit || 0)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Platform Service Fee:</span>
                <span className="font-semibold">{formatPrice(selectedBooking.pricing?.serviceFee || 0)}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold text-slate-800">
                <span>Total Order Value:</span>
                <span className="text-teal-700">{formatPrice(selectedBooking.pricing?.totalAmount || 0)}</span>
              </div>
            </div>

            {/* Timeline */}
            {Array.isArray(selectedBooking.timeline) && selectedBooking.timeline.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Order Timeline
                </span>
                <div className="space-y-2 pl-2 border-l-2 border-teal-200">
                  {selectedBooking.timeline.map((step, idx) => (
                    <div key={idx} className="relative pl-3 text-xs">
                      <div className="font-bold text-slate-700">{step.title || step.status}</div>
                      {step.description && <div className="text-slate-500 text-[11px]">{step.description}</div>}
                      <div className="text-[10px] text-slate-400">{formatDate(step.timestamp)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBookingsTab;
