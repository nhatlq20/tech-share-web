import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  ShieldCheck,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Package,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  QrCode,
  FileText,
} from 'lucide-react';
import { STRINGS } from '../../constants/strings.js';
import { ROUTES } from '../../routes/routes.js';
import { fetchBookingById, cancelBooking } from '../../services/bookingService.js';
import { BookingStatusBadge } from '../../components/booking/BookingStatusBadge.jsx';
import { OrderTimelineStepper, OrderActivityHistory } from '../../components/booking/OrderTimelineStepper.jsx';
import { CancelBookingModal } from '../../components/booking/CancelBookingModal.jsx';
import { formatPrice, formatDate, formatDateTime } from '../../utils/formatters.js';

const T = STRINGS.booking.detail;

export const BookingDetailPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cancel modal state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(null);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState(null);

  const loadBooking = useCallback(async (signal) => {
    if (!bookingId) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchBookingById(bookingId, { signal });
      if (!data) {
        throw new Error(T.notFoundDesc);
      }
      setBooking(data);
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setError(err?.message || T.notFoundDesc);
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    const controller = new AbortController();
    loadBooking(controller.signal);
    return () => controller.abort();
  }, [loadBooking]);

  const handleOpenCancelModal = () => {
    setCancelError(null);
    setIsCancelModalOpen(true);
  };

  const handleCloseCancelModal = () => {
    if (isCancelling) return;
    setIsCancelModalOpen(false);
    setCancelError(null);
  };

  const handleConfirmCancel = async (reason) => {
    try {
      setIsCancelling(true);
      setCancelError(null);
      const updated = await cancelBooking(bookingId, reason);
      if (updated) {
        setBooking(updated);
        setIsCancelModalOpen(false);
        setCancelSuccessMsg(STRINGS.booking.cancel.success);
        setTimeout(() => setCancelSuccessMsg(null), 4000);
      }
    } catch (err) {
      setCancelError(err?.message || STRINGS.booking.cancel.errorFallback);
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 bg-slate-50">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-semibold text-slate-600">{STRINGS.common.loading}</span>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center bg-slate-50">
        <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">{T.notFoundTitle}</h2>
        <p className="text-sm text-slate-500 max-w-md mt-1 mb-6">{error || T.notFoundDesc}</p>
        <Link
          to={ROUTES.MY_BOOKINGS}
          className="px-5 py-2.5 rounded-full bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 transition shadow-sm"
        >
          &larr; {T.backBtn}
        </Link>
      </div>
    );
  }

  const device = booking.device || booking.deviceId || {};
  const owner = booking.owner || booking.ownerId || {};
  const deliveryAddress = typeof booking.deliveryAddress === 'object' && booking.deliveryAddress !== null
    ? booking.deliveryAddress.address || ''
    : (booking.deliveryAddress || '');

  const recipientName = booking.renterInfo?.name || (typeof booking.deliveryAddress === 'object' ? booking.deliveryAddress.recipientName : '') || '';
  const recipientPhone = booking.renterInfo?.phone || (typeof booking.deliveryAddress === 'object' ? booking.deliveryAddress.phone : '') || '';

  const canCancel = booking.canCancel ?? (booking.status === 'pending');

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6" aria-label="Breadcrumb">
          <Link to={ROUTES.HOME} className="hover:text-brand-600 transition">
            {STRINGS.booking.checkout.breadcrumbHome}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <Link to={ROUTES.MY_BOOKINGS} className="hover:text-brand-600 transition">
            {STRINGS.booking.myBookings.breadcrumb}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-brand-600 font-semibold">{booking.bookingCode}</span>
        </nav>

        {/* Top Header Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(ROUTES.MY_BOOKINGS)}
                className="p-2.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600 hover:text-brand-600 hover:border-brand-200 transition"
                aria-label={T.backBtn}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {booking.bookingCode}
                  </h1>
                  <BookingStatusBadge status={booking.status} />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {T.createdAtLabel}: {formatDateTime(booking.createdAt)}
                </p>
              </div>
            </div>

            {/* Cancel action if booking is pending */}
            {canCancel && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  id="cancel-booking-open-btn"
                  onClick={handleOpenCancelModal}
                  className="px-5 py-2.5 rounded-full bg-red-50 text-red-600 font-bold text-xs hover:bg-red-100 border border-red-200 shadow-sm transition"
                >
                  {STRINGS.booking.cancel.openBtn}
                </button>
              </div>
            )}
          </div>

          {/* Cancellation notification banner if just cancelled */}
          {cancelSuccessMsg && (
            <div className="mt-4 p-4 rounded-2xl bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-2 border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{cancelSuccessMsg}</span>
            </div>
          )}

          {/* Cancellation reason if already cancelled */}
          {booking.status === 'cancelled' && booking.cancelReason && (
            <div className="mt-4 p-4 rounded-2xl bg-slate-100 text-slate-700 text-xs border border-slate-200">
              <span className="font-bold">{T.fields.cancelReason}: </span>
              <span>{booking.cancelReason}</span>
            </div>
          )}

          {/* Rejection reason if rejected by owner */}
          {booking.status === 'rejected' && booking.rejectReason && (
            <div className="mt-4 p-4 rounded-2xl bg-red-50 text-red-700 text-xs border border-red-200">
              <span className="font-bold">{T.fields.rejectReason}: </span>
              <span>{booking.rejectReason}</span>
            </div>
          )}

          {/* Stepper Timeline Section */}
          <div className="pt-6">
            <h2 className="text-sm font-bold text-slate-800 mb-6">
              {T.sections.timeline}
            </h2>
            <OrderTimelineStepper
              status={booking.status}
              timeline={booking.timeline}
              createdAt={booking.createdAt}
            />
          </div>
        </div>

        {/* 2-Column Details Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (7 cols): Device info, Handover & Owner */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Device Summary Card */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Package className="w-5 h-5 text-brand-500" />
                  {T.sections.device}
                </h2>
                {device._id && (
                  <Link
                    to={ROUTES.DEVICE_DETAIL_PATH(device._id)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                  >
                    {T.viewDeviceBtn}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>

              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-2xl bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {device.images && device.images.length > 0 ? (
                    <img
                      src={device.images[0]}
                      alt={device.title || device.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="w-8 h-8 text-slate-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-slate-900 truncate">
                    {device.title || device.name || STRINGS.booking.myBookings.untitledDevice}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {device.brand} · <span className="capitalize">{device.category}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{device.address || T.notProvided}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Handover & Delivery Details */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-base font-bold text-slate-800 pb-4 border-b border-slate-100 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-brand-500" />
                {T.sections.delivery}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block mb-1">{T.fields.recipient}</span>
                  <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    {recipientName || T.notProvided}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">{T.fields.phone}</span>
                  <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {recipientPhone || T.notProvided}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400 block mb-1">{T.fields.address}</span>
                  <p className="font-semibold text-slate-800">
                    {deliveryAddress || T.notProvided}
                  </p>
                </div>
                {booking.note && (
                  <div className="sm:col-span-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block mb-1">{T.fields.note}</span>
                    <p className="text-slate-700 italic">"{booking.note}"</p>
                  </div>
                )}
              </div>
            </div>

            {/* Device Owner Info */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-base font-bold text-slate-800 pb-4 border-b border-slate-100 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-brand-500" />
                {T.sections.owner}
              </h2>

              {owner && (owner.name || owner.email) ? (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-base overflow-hidden">
                      {owner.avatar ? (
                        <img src={owner.avatar} alt={owner.name} className="w-full h-full object-cover" />
                      ) : (
                        (owner.name || 'O').charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-900">{owner.name || 'Owner'}</span>
                        {owner.isVerified && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <ShieldCheck className="w-3 h-3" />
                            {T.ownerVerified}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{owner.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {owner.phone && (
                      <a
                        href={`tel:${owner.phone}`}
                        className="px-3 py-1.5 rounded-full bg-brand-50 text-brand-700 hover:bg-brand-100 font-semibold text-xs transition flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        {T.callOwnerBtn}
                      </a>
                    )}
                    {owner.email && (
                      <a
                        href={`mailto:${owner.email}`}
                        className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold text-xs transition flex items-center gap-1"
                      >
                        <Mail className="w-3 h-3" />
                        {T.emailOwnerBtn}
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">{T.ownerUnavailable}</p>
              )}
            </div>

            {/* Activity History Log */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-base font-bold text-slate-800 pb-4 border-b border-slate-100 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-500" />
                {T.sections.history}
              </h2>
              <OrderActivityHistory timeline={booking.timeline} />
            </div>
          </div>

          {/* Right Column (5 cols): Rental Period & Pricing Breakdown */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Rental Period Card */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-base font-bold text-slate-800 pb-4 border-b border-slate-100 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-brand-500" />
                {T.sections.period}
              </h2>

              <div className="flex flex-col gap-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50">
                  <span className="text-slate-500">{T.fields.pickupDate}</span>
                  <span className="font-bold text-slate-800">{formatDate(booking.startDate)}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50">
                  <span className="text-slate-500">{T.fields.returnDate}</span>
                  <span className="font-bold text-slate-800">{formatDate(booking.endDate)}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-brand-50/70 border border-brand-100">
                  <span className="text-brand-800 font-semibold">{T.fields.duration}</span>
                  <span className="font-extrabold text-brand-800">
                    {booking.totalDays} {booking.totalDays === 1 ? 'ngày' : 'ngày'}
                  </span>
                </div>
              </div>
            </div>

            {/* Pricing Breakdown Card */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-base font-bold text-slate-800 pb-4 border-b border-slate-100 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-brand-500" />
                {T.sections.pricing}
              </h2>

              <div className="flex flex-col gap-3 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>{T.fields.dailyRate}</span>
                  <span className="font-medium text-slate-800">
                    {formatPrice(booking.pricePerDayAtBooking || booking.dailyRate || 0)} / ngày
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>
                    {T.fields.rentalFee} ({booking.totalDays} ngày)
                  </span>
                  <span className="font-medium text-slate-800">
                    {formatPrice(booking.rentalFee)}
                  </span>
                </div>

                {booking.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>{T.fields.discount}</span>
                    <span className="font-bold">-{formatPrice(booking.discountAmount)}</span>
                  </div>
                )}

                {booking.voucherCode && (
                  <div className="flex justify-between text-brand-700">
                    <span>{T.fields.voucher} ({booking.voucherCode})</span>
                    <span className="font-bold">-{formatPrice(booking.voucherDiscount || 0)}</span>
                  </div>
                )}

                <div className="flex justify-between pt-2 border-t border-slate-100">
                  <span>{T.fields.deposit}</span>
                  <span className="font-medium text-slate-800">
                    {formatPrice(booking.depositFee || booking.depositValue || 0)}
                  </span>
                </div>

                <div className="flex justify-between items-baseline pt-3 border-t border-slate-100">
                  <span className="text-sm font-bold text-slate-900">{T.fields.total}</span>
                  <span className="text-xl font-black text-brand-800">
                    {formatPrice(booking.totalAmount)}
                  </span>
                </div>

                {/* Payment method and status badges */}
                <div className="mt-4 p-4 rounded-2xl bg-slate-50 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">{T.fields.paymentMethod}</span>
                    <span className="font-semibold text-slate-700">
                      {T.paymentMethods[booking.paymentMethod] || booking.paymentMethod}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">{T.fields.paymentStatus}</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[11px] font-semibold capitalize">
                      {T.paymentStatuses[booking.paymentStatus] || booking.paymentStatus}
                    </span>
                  </div>
                </div>

                {/* Cancel hint alert */}
                {canCancel ? (
                  <p className="text-[11px] text-slate-400 italic text-center mt-2">
                    {T.cancelHint}
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 italic text-center mt-2">
                    {T.cancelLockedHint}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      <CancelBookingModal
        isOpen={isCancelModalOpen}
        bookingCode={booking.bookingCode}
        isSubmitting={isCancelling}
        errorMessage={cancelError}
        onConfirm={handleConfirmCancel}
        onClose={handleCloseCancelModal}
      />
    </div>
  );
};

export default BookingDetailPage;
