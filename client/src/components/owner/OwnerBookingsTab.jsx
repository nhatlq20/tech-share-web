import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Check, 
  X, 
  QrCode, 
  ShieldCheck, 
  AlertTriangle, 
  Camera, 
  UserCheck
} from 'lucide-react';
import { STRINGS } from '../../constants/strings';
import { COLORS } from '../../constants/colors';

export const OwnerBookingsTab = ({ 
  bookings = [], 
  onApprove, 
  onReject, 
  onHandover, 
  onCompleteReturn 
}) => {
  const t = STRINGS.owner.bookings;
  const tc = STRINGS.common;

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

      {/* 3. Bookings Table */}
      <div className="owner-card p-0 overflow-hidden">
        <div className="owner-table-container border-0">
          <table className="owner-table">
            <thead>
              <tr>
                <th>{t.table.colCode}</th>
                <th>{t.table.colDevice}</th>
                <th>{t.table.colRenter}</th>
                <th>{t.table.colDates}</th>
                <th>{t.table.colTotal}</th>
                <th>{t.table.colStatus}</th>
                <th style={{ textAlign: 'right' }}>{t.table.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-500">
                    {t.table.emptyMessage}
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => (
                  <tr key={b._id}>
                    {/* Booking Code */}
                    <td>
                      <span className="font-bold text-slate-700">#{b.bookingCode}</span>
                    </td>

                    {/* Device info */}
                    <td>
                      <div className="flex items-center gap-3">
                        <img
                          src={b.deviceImage}
                          alt={b.deviceName}
                          className="w-11 h-11 rounded-xl object-cover border border-slate-200"
                        />
                        <div>
                          <div className="font-semibold text-slate-800 text-sm line-clamp-1">{b.deviceName}</div>
                          <div className="text-xs text-slate-500 capitalize">{b.deviceCategory}</div>
                        </div>
                      </div>
                    </td>

                    {/* Renter & Trust Score */}
                    <td>
                      <div className="flex items-center gap-2.5">
                        <img
                          src={b.renter?.avatar}
                          alt={b.renter?.name}
                          className="w-9 h-9 rounded-full object-cover border-2 border-slate-200"
                        />
                        <div>
                          <div className="flex items-center gap-1 font-semibold text-xs text-slate-800">
                            <span>{b.renter?.name}</span>
                            {b.renter?.isVerified && (
                              <UserCheck size={13} color={COLORS.primary.DEFAULT} title="Đã eKYC CCCD" />
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1">
                            <ShieldCheck size={12} color={COLORS.primary.dark} />
                            <span>Tín nhiệm: <b>{b.renter?.trustScore}</b>/100</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Rental Dates */}
                    <td>
                      <div className="text-xs font-medium text-slate-700">
                        {b.startDate} → {b.endDate}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {b.totalDays} {tc.day} • {b.deliveryMethod === 'pickup' ? 'Nhận tại chỗ' : 'Giao hàng'}
                      </div>
                    </td>

                    {/* Total Price & Deposit */}
                    <td>
                      <div className="text-sm font-bold text-emerald-600">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(b.totalRentalPrice)}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Cọc: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(b.depositAmount)}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td>
                      <span className={`owner-badge owner-badge-${b.status}`}>
                        {b.status === 'pending' ? t.status.pending :
                         b.status === 'approved' ? t.status.approved :
                         b.status === 'active' ? t.status.active :
                         b.status === 'completed' ? t.status.completed :
                         b.status === 'rejected' ? t.status.rejected : b.status}
                      </span>
                    </td>

                    {/* Action Buttons */}
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex items-center justify-end gap-2">
                        {/* Pending -> Approve / Reject */}
                        {b.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              className="owner-btn-primary py-1 px-3 text-xs"
                              onClick={() => onApprove(b._id)}
                              title={t.actions.approve}
                            >
                              <Check size={13} />
                              <span>{t.actions.approve}</span>
                            </button>
                            <button
                              type="button"
                              className="owner-btn-outline py-1 px-2.5 text-xs text-rose-600 hover:bg-rose-50"
                              onClick={() => setRejectingBooking(b)}
                              title={t.actions.reject}
                            >
                              <X size={13} />
                            </button>
                          </>
                        )}

                        {/* Approved -> QR Handover */}
                        {b.status === 'approved' && (
                          <button
                            type="button"
                            className="owner-btn-primary py-1 px-3 text-xs"
                            onClick={() => setQrScanningBooking(b)}
                          >
                            <QrCode size={13} />
                            <span>{t.actions.scanQr}</span>
                          </button>
                        )}

                        {/* Active -> Inspect return & complete */}
                        {b.status === 'active' && (
                          <button
                            type="button"
                            className="owner-btn-outline py-1 px-3 text-xs text-brand-700 bg-brand-50 border-brand-200"
                            style={{ color: COLORS.primary.dark, borderColor: COLORS.primary.border }}
                            onClick={() => setReturnBooking(b)}
                          >
                            <Camera size={13} />
                            <span>{t.actions.inspectReturn}</span>
                          </button>
                        )}

                        {/* Completed or Rejected -> Detail */}
                        {(b.status === 'completed' || b.status === 'rejected') && (
                          <button
                            type="button"
                            className="owner-btn-outline py-1 px-2.5 text-xs"
                            onClick={() => alert(`Xem chi tiết đơn #${b.bookingCode}`)}
                          >
                            <span>{tc.viewDetails}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Từ chối đơn thuê (N-01) */}
      {rejectingBooking && (
        <div className="owner-modal-overlay">
          <div className="owner-modal-card max-w-md">
            <div className="owner-modal-header">
              <h3 className="owner-modal-title flex items-center gap-2 text-rose-600">
                <AlertTriangle size={18} />
                <span>{t.modalReject.title}</span>
              </h3>
              <button 
                type="button" 
                className="owner-close-btn"
                onClick={() => setRejectingBooking(null)}
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-3">
              {t.modalReject.prompt}
            </p>

            <div className="flex flex-col gap-2 mb-4">
              {t.modalReject.reasons.map((r, idx) => (
                <label 
                  key={idx} 
                  className="flex items-center gap-2 text-xs text-slate-700 p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50"
                >
                  <input
                    type="radio"
                    name="rejectReason"
                    value={r}
                    checked={rejectReason === r}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>

            <textarea
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-brand-500 focus:outline-none mb-4"
              placeholder={t.modalReject.placeholder}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="owner-btn-outline"
                onClick={() => setRejectingBooking(null)}
              >
                {t.modalReject.cancelBtn}
              </button>
              <button
                type="button"
                className="owner-btn-danger"
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
              <h3 className="owner-modal-title flex items-center gap-2">
                <QrCode size={18} color={COLORS.primary.DEFAULT} />
                <span>{t.modalQr.title}</span>
              </h3>
              <button 
                type="button" 
                className="owner-close-btn"
                onClick={() => setQrScanningBooking(null)}
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4 text-left">
              {t.modalQr.instruction}
            </p>

            {/* Webcam QR Scanner Viewport Simulation */}
            <div className="w-full h-56 bg-slate-900 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden mb-4 border-2 border-dashed border-brand-500">
              {scanSuccess ? (
                <div className="text-emerald-400 flex flex-col items-center gap-2 animate-bounce">
                  <Check size={48} />
                  <span className="text-sm font-bold">{t.modalQr.successText}</span>
                </div>
              ) : isScanning ? (
                <div className="text-brand-300 flex flex-col items-center gap-2">
                  <div className="w-10 h-10 border-4 border-brand-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs">{t.modalQr.scanning}</span>
                </div>
              ) : (
                <div className="text-slate-400 flex flex-col items-center gap-2">
                  <QrCode size={48} className="opacity-40" />
                  <span className="text-xs">Webcam Scanner (html5-qrcode ready)</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center gap-2">
              <button
                type="button"
                className="owner-btn-outline"
                onClick={() => setQrScanningBooking(null)}
              >
                {t.modalQr.closeBtn}
              </button>
              <button
                type="button"
                className="owner-btn-primary"
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
              <h3 className="owner-modal-title flex items-center gap-2">
                <Camera size={18} color={COLORS.primary.DEFAULT} />
                <span>{t.modalReturn.title}</span>
              </h3>
              <button 
                type="button" 
                className="owner-close-btn"
                onClick={() => setReturnBooking(null)}
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4">
              {t.modalReturn.instruction}
            </p>

            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <span className="block text-xs font-semibold text-slate-700 mb-2">
                  {t.modalReturn.beforeLabel}
                </span>
                <img
                  src={returnBooking.deviceImage}
                  alt="Before rental"
                  className="w-full h-32 rounded-xl object-cover border border-slate-200"
                />
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-700 mb-2">
                  {t.modalReturn.afterLabel}
                </span>
                <div className="w-full h-32 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center bg-slate-50">
                  <Camera size={24} className="text-slate-400 mb-1" />
                  <span className="text-[11px] text-slate-500">Chụp webcam hoặc tải ảnh</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center gap-3">
              <button
                type="button"
                className="owner-btn-outline text-rose-600 hover:bg-rose-50 border-rose-200"
                onClick={() => {
                  alert('Chuyển hướng lập biên bản tranh chấp chuyển Admin TechShare xử lý.');
                  setReturnBooking(null);
                }}
              >
                {t.modalReturn.claimDispute}
              </button>
              <button
                type="button"
                className="owner-btn-primary"
                onClick={() => {
                  onCompleteReturn(returnBooking._id);
                  setReturnBooking(null);
                }}
              >
                <Check size={14} />
                <span>{t.modalReturn.confirmComplete}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerBookingsTab;

