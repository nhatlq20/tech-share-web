import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Check, 
  X, 
  QrCode, 
  ShieldCheck, 
  AlertTriangle, 
  Camera, 
  UserCheck,
  MessageSquare,
  Eye,
} from 'lucide-react';
import { STRINGS } from '../../constants/strings';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../routes/routes.js';
import { CountdownBadge } from '../booking/CountdownBadge.jsx';
import { OwnerBookingDetailModal } from './OwnerBookingDetailModal.jsx';

const formatVND = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

export const OwnerBookingsTab = ({ 
  bookings = [], 
  onApprove, 
  onReject, 
  onHandover, 
  onCompleteReturn 
}) => {
  const t = STRINGS.owner.bookings;
  const navigate = useNavigate();

  // Tabs: 'all' | 'pending' | 'approved' | 'active' | 'completed' | 'rejected'
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [rejectingBooking, setRejectingBooking] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  
  const [qrScanningBooking, setQrScanningBooking] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);

  const [returnBooking, setReturnBooking] = useState(null);

  // Detail modal state
  const [selectedBooking, setSelectedBooking] = useState(null);

  // Filtered Bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const matchTab = activeTab === 'all' || b.status === activeTab;
      const matchSearch = b.bookingCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.deviceName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.renter?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchTab && matchSearch;
    });
  }, [bookings, activeTab, searchTerm]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts = { all: bookings.length, pending: 0, approved: 0, active: 0, completed: 0, rejected: 0 };
    bookings.forEach((b) => {
      if (counts[b.status] !== undefined) {
        counts[b.status]++;
      }
    });
    return counts;
  }, [bookings]);

  // Confirm Reject
  const handleConfirmReject = () => {
    if (!rejectingBooking) return;
    const finalReason = rejectReason || t.modalReject.reasons[0];
    onReject(rejectingBooking._id, finalReason);
    setRejectingBooking(null);
    setRejectReason('');
  };

  // QR Handover Simulation
  const handleSimulateQrScan = () => {
    if (!qrScanningBooking) return;
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setScanSuccess(true);
      setTimeout(() => {
        onHandover(qrScanningBooking._id);
        setQrScanningBooking(null);
        setScanSuccess(false);
      }, 900);
    }, 1200);
  };

  const getStatusLabel = (status) =>
    status === 'pending' ? t.status.pending :
    status === 'approved' ? t.status.approved :
    status === 'active' ? t.status.active :
    status === 'completed' ? t.status.completed :
    status === 'rejected' ? t.status.rejected : status;

  return (
    <div className="owner-bookings-container">
      {/* 1. Header */}
      <div className="owner-page-header">
        <div>
          <h1 className="owner-page-title">{t.title}</h1>
          <p className="owner-page-subtitle">{t.subtitle}</p>
        </div>
      </div>

      {/* 2. Top bar: Filter Tabs & Search */}
      <div className="owner-card flex flex-wrap items-center justify-between gap-4 p-4 mb-5">
        <div className="owner-tabs-nav m-0">
          {Object.entries(t.tabs).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`owner-tab-pill ${activeTab === key ? 'active' : ''}`}
              onClick={() => setActiveTab(key)}
            >
              <span>{label}</span>
              <span className="ml-1 text-xs opacity-75">({tabCounts[key] || 0})</span>
            </button>
          ))}
        </div>

        <div className="owner-search-pill" style={{ width: '300px' }}>
          <Search size={15} color={COLORS.primary.DEFAULT} />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* 3. Bookings Table — 4-column compact, table-fixed, zero horizontal scrollbar */}
      <div className="owner-card p-0 overflow-hidden shadow-xs border border-slate-200/80">
        <table className="w-full table-fixed text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="px-4 py-3 w-[32%]">Thiết bị &amp; Mã đơn</th>
              <th className="px-4 py-3 w-[24%]">Khách thuê</th>
              <th className="px-4 py-3 w-[22%]">Thời gian &amp; Doanh thu</th>
              <th className="px-4 py-3 w-[22%] text-right">Trạng thái &amp; Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredBookings.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-14 text-slate-400 font-medium text-sm">
                  {t.table.emptyMessage}
                </td>
              </tr>
            ) : (
              filteredBookings.map((b) => (
                <tr
                  key={b._id}
                  onClick={() => setSelectedBooking(b)}
                  className="hover:bg-teal-50/20 active:bg-teal-50/30 cursor-pointer transition-colors border-b border-slate-100 last:border-b-0 group"
                  title="Nhấn vào hàng để xem chi tiết đơn thuê"
                >
                  {/* Col 1: Device & Order Code */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={b.deviceImage || b.device?.images?.[0] || '/placeholder.png'}
                        alt={b.deviceName}
                        className="w-10 h-10 rounded-lg object-cover bg-slate-100 shrink-0 border border-slate-200/60 group-hover:border-teal-300 transition"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 text-sm truncate group-hover:text-teal-900 transition" title={b.deviceName}>
                          {b.deviceName}
                        </div>
                        <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          #{b.bookingCode}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Col 2: Renter */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <img
                        src={b.renter?.avatar || '/placeholder-avatar.png'}
                        alt={b.renter?.name || 'Renter'}
                        className="w-7 h-7 rounded-full shrink-0 border border-slate-200 object-cover"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-slate-800 text-sm truncate">{b.renter?.name}</span>
                          {b.renter?.isVerified && (
                            <UserCheck size={12} color={COLORS.primary.DEFAULT} className="shrink-0" />
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <ShieldCheck size={11} color={COLORS.primary.dark} className="shrink-0" />
                          <span>{b.renter?.trustScore ?? 100}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Col 3: Period & Revenue */}
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800 text-xs whitespace-nowrap">
                      {b.startDate} → {b.endDate}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-emerald-600 font-bold text-xs whitespace-nowrap">
                        {formatVND(b.totalRentalPrice)}
                      </span>
                      <span className="text-[11px] text-slate-400 whitespace-nowrap">• {b.totalDays} ngày</span>
                    </div>
                  </td>

                  {/* Col 4: Status & Actions */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-1.5 justify-end flex-wrap">
                        <span className={`owner-badge owner-badge-${b.status} text-[11px] px-2.5 py-0.5 rounded-full font-semibold whitespace-nowrap`}>
                          {getStatusLabel(b.status)}
                        </span>
                        {b.status === 'active' && (b.rawEndDate || b.endDate) && (
                          <CountdownBadge startDate={b.rawStartDate || b.startDate} targetDate={b.rawEndDate || b.endDate} size="sm" />
                        )}
                      </div>
                      
                      {/* Action buttons */}
                      <div
                        className="flex items-center justify-end gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Chi tiết button */}
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 py-1 px-2 rounded-lg text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200/70 hover:bg-teal-100 transition whitespace-nowrap"
                          onClick={() => setSelectedBooking(b)}
                          title="Xem chi tiết đơn thuê"
                        >
                          <Eye size={12} />
                          <span>Chi tiết</span>
                        </button>

                        {b.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 py-1 px-2.5 rounded-lg text-xs font-medium bg-teal-600 text-white hover:bg-teal-700 transition shadow-2xs whitespace-nowrap"
                              onClick={() => onApprove(b._id)}
                            >
                              <Check size={12} />
                              <span>{t.actions.approve}</span>
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center p-1 rounded-lg text-xs font-medium text-rose-600 border border-rose-200 hover:bg-rose-50 transition"
                              onClick={() => setRejectingBooking(b)}
                            >
                              <X size={12} />
                            </button>
                          </>
                        )}

                        {b.status === 'approved' && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 py-1 px-2.5 rounded-lg text-xs font-medium bg-teal-600 text-white hover:bg-teal-700 transition shadow-2xs whitespace-nowrap"
                            onClick={() => setQrScanningBooking(b)}
                          >
                            <QrCode size={12} />
                            <span>{t.actions.scanQr}</span>
                          </button>
                        )}

                        {b.status === 'active' && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 py-1 px-2 rounded-lg text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 transition whitespace-nowrap"
                            onClick={() => setReturnBooking(b)}
                          >
                            <Camera size={12} />
                            <span>{t.actions.inspectReturn}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          className="inline-flex items-center gap-1 py-1 px-2 rounded-lg text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition"
                          onClick={() => navigate(ROUTES.MESSAGES_PATH(b._id || b.id))}
                          title="Nhắn tin với khách"
                        >
                          <MessageSquare size={12} className="text-slate-500" />
                          <span>Chat</span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL 1: Từ chối đơn thuê (N-01) */}
      {rejectingBooking && (
        <div className="owner-modal-overlay">
          <div className="owner-modal-card max-w-md">
            <div className="owner-modal-header">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center shadow-xs">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="owner-modal-title text-slate-900">{t.modalReject.title}</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Order #{rejectingBooking.bookingCode || rejectingBooking._id?.slice(-8)}</p>
                </div>
              </div>
              <button 
                type="button" 
                className="owner-close-btn"
                onClick={() => setRejectingBooking(null)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              {t.modalReject.prompt}
            </p>

            <div className="flex flex-col gap-2 mb-4">
              {t.modalReject.reasons.map((r, idx) => {
                const isSelected = rejectReason === r;
                return (
                  <label 
                    key={idx} 
                    className={`flex items-center gap-2.5 text-xs p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-rose-50/80 border-rose-300 text-rose-900 font-semibold shadow-xs' 
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="rejectReason"
                      value={r}
                      checked={isSelected}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="accent-rose-600 w-3.5 h-3.5"
                    />
                    <span>{r}</span>
                  </label>
                );
              })}
            </div>

            <textarea
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 focus:outline-none mb-5"
              placeholder={t.modalReject.placeholder}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                className="px-5 py-2.5 rounded-full border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition shadow-xs"
                onClick={() => setRejectingBooking(null)}
              >
                {t.modalReject.cancelBtn}
              </button>
              <button
                type="button"
                className="px-5 py-2.5 rounded-full bg-rose-600 text-white font-semibold text-xs hover:bg-rose-700 transition shadow-sm hover:shadow-md"
                onClick={handleConfirmReject}
              >
                {t.modalReject.confirmBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Quét mã QR Bàn giao (N-02) */}
      {qrScanningBooking && (
        <div className="owner-modal-overlay">
          <div className="owner-modal-card max-w-md text-center">
            <div className="owner-modal-header text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200/80 text-teal-600 flex items-center justify-center shadow-xs">
                  <QrCode size={20} />
                </div>
                <div>
                  <h3 className="owner-modal-title text-slate-900">{t.modalQr.title}</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Order #{qrScanningBooking.bookingCode || qrScanningBooking._id?.slice(-8)}</p>
                </div>
              </div>
              <button 
                type="button" 
                className="owner-close-btn"
                onClick={() => setQrScanningBooking(null)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4 text-left leading-relaxed">
              {t.modalQr.instruction}
            </p>

            {/* Webcam QR Scanner Viewport Simulation */}
            <div className="w-full h-60 bg-slate-950 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden mb-5 border border-slate-800 shadow-inner">
              {/* Corner brackets */}
              <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-teal-400 rounded-tl-md" />
              <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-teal-400 rounded-tr-md" />
              <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-teal-400 rounded-bl-md" />
              <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-teal-400 rounded-br-md" />

              {/* Scanning laser line */}
              {isScanning && (
                <div className="absolute inset-x-8 top-1/2 h-[2px] bg-gradient-to-r from-transparent via-teal-400 to-transparent shadow-[0_0_12px_#2dd4bf] animate-pulse" />
              )}

              {scanSuccess ? (
                <div className="text-emerald-400 flex flex-col items-center gap-2 animate-in zoom-in-90 duration-200">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400">
                    <Check size={32} />
                  </div>
                  <span className="text-sm font-bold">{t.modalQr.successText}</span>
                </div>
              ) : isScanning ? (
                <div className="text-teal-300 flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-3 border-teal-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-medium">{t.modalQr.scanning}</span>
                </div>
              ) : (
                <div className="text-slate-400 flex flex-col items-center gap-2.5">
                  <QrCode size={52} className="opacity-40 text-teal-400" />
                  <span className="text-xs text-slate-400">Point viewfinder directly at customer's QR code</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center gap-2.5">
              <button
                type="button"
                className="px-5 py-2.5 rounded-full border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition shadow-xs"
                onClick={() => setQrScanningBooking(null)}
              >
                {t.modalQr.closeBtn}
              </button>
              <button
                type="button"
                className="px-6 py-2.5 rounded-full bg-teal-600 text-white font-semibold text-xs hover:bg-teal-700 transition shadow-sm hover:shadow-md disabled:opacity-50"
                onClick={handleSimulateQrScan}
                disabled={isScanning || scanSuccess}
              >
                <span>{t.modalQr.simulatedBtn}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Đối soát ảnh trả máy & Hoàn cọc (N-02, N-03) */}
      {returnBooking && (
        <div className="owner-modal-overlay">
          <div className="owner-modal-card max-w-lg">
            <div className="owner-modal-header">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200/80 text-teal-600 flex items-center justify-center shadow-xs">
                  <Camera size={20} />
                </div>
                <div>
                  <h3 className="owner-modal-title text-slate-900">{t.modalReturn.title}</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Order #{returnBooking.bookingCode || returnBooking._id?.slice(-8)}</p>
                </div>
              </div>
              <button 
                type="button" 
                className="owner-close-btn"
                onClick={() => setReturnBooking(null)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              {t.modalReturn.instruction}
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="block text-xs font-bold text-slate-700 mb-2">
                  {t.modalReturn.beforeLabel}
                </span>
                <img
                  src={returnBooking.deviceImage}
                  alt="Before rental"
                  className="w-full h-36 rounded-xl object-cover border border-slate-200 shadow-xs"
                />
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="block text-xs font-bold text-slate-700 mb-2">
                  {t.modalReturn.afterLabel}
                </span>
                <div className="w-full h-36 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center bg-white cursor-pointer hover:border-teal-400 hover:bg-teal-50/30 transition-all">
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-1.5">
                    <Camera size={18} />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600">Upload return photo</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center gap-3">
              <button
                type="button"
                className="px-4 py-2.5 rounded-full border border-rose-200 text-rose-600 font-semibold text-xs hover:bg-rose-50 transition"
                onClick={() => {
                  alert('Dispute report initiated and sent to TechShare Admin for resolution.');
                  setReturnBooking(null);
                }}
              >
                {t.modalReturn.claimDispute}
              </button>
              <button
                type="button"
                className="px-6 py-2.5 rounded-full bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition shadow-sm hover:shadow-md flex items-center gap-1.5"
                onClick={() => {
                  onCompleteReturn(returnBooking._id);
                  setReturnBooking(null);
                }}
              >
                <Check size={15} />
                <span>{t.modalReturn.confirmComplete}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Chi tiết đơn thuê Đẳng cấp & Layout Chuyên nghiệp */}
      {selectedBooking && (
        <OwnerBookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onApprove={(id) => {
            onApprove(id);
            setSelectedBooking(null);
          }}
          onReject={(b) => {
            setRejectingBooking(b);
            setSelectedBooking(null);
          }}
          onHandover={(b) => {
            setQrScanningBooking(b);
            setSelectedBooking(null);
          }}
          onReturn={(b) => {
            setReturnBooking(b);
            setSelectedBooking(null);
          }}
          onChat={(b) => {
            navigate(ROUTES.MESSAGES_PATH(b._id || b.id));
            setSelectedBooking(null);
          }}
        />
      )}
    </div>
  );
};

export default OwnerBookingsTab;
