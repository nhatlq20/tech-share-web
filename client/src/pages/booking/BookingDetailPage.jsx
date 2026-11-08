import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CalendarPlus,
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
  Truck,
  MessageSquare,
  Star,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { STRINGS } from '../../constants/strings.js';
import { ROUTES } from '../../routes/routes.js';
import { fetchBookingById, cancelBooking } from '../../services/bookingService.js';
import { BookingStatusBadge } from '../../components/booking/BookingStatusBadge.jsx';
import { OrderTimelineStepper } from '../../components/booking/OrderTimelineStepper.jsx';
import { CancelBookingModal } from '../../components/booking/CancelBookingModal.jsx';
import { CountdownBadge, RentalCountdownTimer } from '../../components/booking/CountdownBadge.jsx';
import { ExtensionModal } from '../../components/booking/ExtensionModal.jsx';
import { RenterHandoverSection } from '../../components/booking/RenterHandoverSection.jsx';
import { BookingReviewModal, BookingReviewSection } from '../../components/booking/BookingReviewModal.jsx';
import { formatPrice, formatDateTime, formatDate } from '../../utils/formatters.js';

const T = STRINGS.booking.detail;

export const BookingDetailPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [booking, setBooking] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cancel modal state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(null);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState(null);

  // Extension modal state
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
  const [extensionSuccessMsg, setExtensionSuccessMsg] = useState(null);

  // Review modal state for completed bookings
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

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

  const handleExtensionSuccess = (updatedBooking) => {
    if (updatedBooking) {
      setBooking(updatedBooking);
    }
    setExtensionSuccessMsg(STRINGS.booking.extension.successMsg);
    setTimeout(() => setExtensionSuccessMsg(null), 5000);
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
        <div className="flex flex-wrap items-center justify-center gap-3">
          {user?.role === 'owner' ? (
            <Link
              to={ROUTES.OWNER_BOOKINGS}
              className="px-5 py-2.5 rounded-full bg-teal-600 text-white font-semibold text-sm hover:bg-teal-700 transition shadow-sm"
            >
              &larr; Owner Bookings
            </Link>
          ) : (
            <Link
              to={ROUTES.MY_BOOKINGS}
              className="px-5 py-2.5 rounded-full bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 transition shadow-sm"
            >
              &larr; {T.backBtn}
            </Link>
          )}
        </div>
      </div>
    );
  }

  const device = booking.device || booking.deviceId || {};
  const owner = booking.owner || booking.ownerId || device.owner || device.ownerId || {};
  const renter = booking.renter || booking.renterId || {};

  const deliveryMethod = booking.deliveryMethod || booking.delivery?.method || 'delivery';

  const deliveryAddress =
    (typeof booking.deliveryAddress === 'string'
      ? booking.deliveryAddress
      : booking.deliveryAddress?.address) ||
    booking.delivery?.address ||
    (deliveryMethod === 'pickup' ? (device.address || '') : (renter.address || '')) ||
    '';

  const recipientName =
    booking.renterInfo?.name ||
    (typeof booking.deliveryAddress === 'object' ? booking.deliveryAddress?.recipientName : '') ||
    renter.name ||
    '';

  const recipientPhone =
    booking.renterInfo?.phone ||
    (typeof booking.deliveryAddress === 'object' ? booking.deliveryAddress?.phone : '') ||
    renter.phone ||
    '';

  const canCancel = booking.canCancel ?? (booking.status === 'pending');

  return (
    <div className="min-h-screen bg-slate-50 py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Compact Top Header + Stepper Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100 mb-3.5">
          {/* Header Row: Back + Breadcrumb + Code + Status + Quick Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3.5 border-b border-slate-100">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => navigate(ROUTES.MY_BOOKINGS)}
                className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-brand-600 hover:border-brand-200 transition flex-shrink-0"
                aria-label={T.backBtn}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="min-w-0">
                <nav className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-0.5" aria-label="Breadcrumb">
                  <Link to={ROUTES.HOME} className="hover:text-brand-600 transition">
                    {STRINGS.booking.checkout.breadcrumbHome}
                  </Link>
                  <ChevronRight className="w-3 h-3" />
                  <Link to={ROUTES.MY_BOOKINGS} className="hover:text-brand-600 transition">
                    {STRINGS.booking.myBookings.breadcrumb}
                  </Link>
                  <ChevronRight className="w-3 h-3" />
                  <span className="text-brand-600 font-semibold">{booking.bookingCode}</span>
                </nav>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    #{booking.bookingCode}
                  </h1>
                  <BookingStatusBadge status={booking.status} size="sm" />
                  {booking.status === 'active' && booking.endDate && (
                    <CountdownBadge startDate={booking.startDate} targetDate={booking.endDate} size="sm" />
                  )}
                  <span className="text-[11px] text-slate-400">
                    • {T.createdAtLabel}: {formatDateTime(booking.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons in Header */}
            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              {booking.status === 'active' && booking.extensionRequest?.status !== 'pending' && (
                <button
                  type="button"
                  id="header-extend-booking-btn"
                  onClick={() => setIsExtensionModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs transition shadow-2xs flex items-center gap-1.5"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  <span>{STRINGS.booking.extension.openModalBtn}</span>
                </button>
              )}

              {booking.status === 'completed' && (
                <button
                  type="button"
                  id="header-review-booking-btn"
                  onClick={() => setIsReviewModalOpen(true)}
                  className={`px-3.5 py-1.5 rounded-full font-bold text-xs transition shadow-2xs flex items-center gap-1.5 ${
                    booking.review
                      ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                      : 'bg-amber-500 hover:bg-amber-600 text-white'
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${booking.review ? 'fill-amber-400 text-amber-400' : 'fill-current'}`} />
                  <span>
                    {booking.review
                      ? `Reviewed (${booking.review.rating}.0) · Edit`
                      : 'Write a Review'}
                  </span>
                </button>
              )}

              {canCancel && (
                <button
                  type="button"
                  id="cancel-booking-open-btn"
                  onClick={handleOpenCancelModal}
                  className="px-3.5 py-1.5 rounded-full bg-red-50 text-red-600 font-bold text-xs hover:bg-red-100 border border-red-200 transition"
                >
                  {STRINGS.booking.cancel.openBtn}
                </button>
              )}
            </div>
          </div>

          {/* Alerts / Status Banners */}
          {extensionSuccessMsg && (
            <div className="mt-3 px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 text-xs border border-emerald-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="font-semibold">{extensionSuccessMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setExtensionSuccessMsg(null)}
                className="text-emerald-500 hover:text-emerald-700"
                aria-label="Dismiss"
              >
                &times;
              </button>
            </div>
          )}

          {cancelSuccessMsg && (
            <div className="mt-3 px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 text-xs border border-emerald-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="font-semibold">{cancelSuccessMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setCancelSuccessMsg(null)}
                className="text-emerald-500 hover:text-emerald-700"
                aria-label="Dismiss"
              >
                &times;
              </button>
            </div>
          )}

          {booking.extensionRequest?.status === 'pending' && (
            <div className="mt-3 px-3.5 py-2 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>
                  <strong>{STRINGS.booking.extension.pendingBannerTitle}:</strong>{' '}
                  {STRINGS.booking.extension.pendingBannerDesc(
                    booking.extensionRequest.requestedDays,
                    formatDate(booking.extensionRequest.requestedEndDate),
                    formatPrice(booking.extensionRequest.additionalFee)
                  )}
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-200/80 text-amber-800 text-[10px] font-bold uppercase">
                {STRINGS.booking.extension.statusPendingBadge}
              </span>
            </div>
          )}

          {booking.status === 'cancelled' && booking.cancelReason && (
            <div className="mt-3 px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs border border-slate-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <div>
                <span className="font-bold text-slate-800">{T.fields.cancelReason}: </span>
                <span>{booking.cancelReason}</span>
              </div>
            </div>
          )}

          {booking.status === 'rejected' && booking.rejectReason && (
            <div className="mt-3 px-3.5 py-2 rounded-xl bg-red-50 text-red-800 text-xs border border-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <div>
                <span className="font-bold text-red-900">{T.fields.rejectReason}: </span>
                <span>{booking.rejectReason}</span>
              </div>
            </div>
          )}

          {/* Compact Horizontal Stepper */}
          <div className="pt-3.5">
            <OrderTimelineStepper
              status={booking.status}
              timeline={booking.timeline}
              createdAt={booking.createdAt}
            />
          </div>
        </div>

        {/* Handover QR Code (qrcode.react) & Before-Rental Photo Upload (Cloudinary) when Approved / Active */}
        <RenterHandoverSection
          booking={booking}
          onBookingUpdated={(updatedBooking) => {
            if (updatedBooking) setBooking(updatedBooking);
          }}
        />

        {/* Rental Review & Rating Section when Completed */}
        <BookingReviewSection
          booking={booking}
          onOpenReviewModal={() => setIsReviewModalOpen(true)}
        />

        {/* Main 2-Column Compact Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
          {/* Left Column (7 cols): Combined Device + Owner + Delivery Info */}
          <div className="lg:col-span-7 flex flex-col gap-3.5">
            {/* Combined Device & Owner Card */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                {/* Device Info (7 cols) */}
                <div className="md:col-span-7 flex items-start gap-3.5 min-w-0">
                  <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-200/70">
                    {device.images && device.images.length > 0 ? (
                      <img
                        src={device.images[0]}
                        alt={device.title || device.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-6 h-6 text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600">
                        {device.brand || T.sections.device} {device.category ? `· ${device.category}` : ''}
                      </span>
                      {device._id && (
                        <Link
                          to={ROUTES.DEVICE_DETAIL_PATH(device._id)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700 shrink-0"
                        >
                          <span>{T.viewDeviceBtn}</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                    <h2 className="text-sm font-bold text-slate-900 truncate mt-0.5">
                      {device.title || device.name || STRINGS.booking.myBookings.untitledDevice}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{device.address || T.notProvided}</span>
                    </p>
                  </div>
                </div>

                {/* Owner Info (5 cols) */}
                <div className="md:col-span-5 md:border-l md:border-slate-100 md:pl-4 pt-3 md:pt-0 border-t border-slate-100 md:border-t-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    {T.sections.owner}
                  </span>
                  {owner && (owner.name || owner.email) ? (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs overflow-hidden flex-shrink-0">
                          {owner.avatar ? (
                            <img src={owner.avatar} alt={owner.name} className="w-full h-full object-cover" />
                          ) : (
                            (owner.name || 'O').charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-slate-900 truncate">{owner.name || 'Owner'}</span>
                            {owner.isVerified && (
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" title={T.ownerVerified} />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">{owner.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Link
                          to={ROUTES.MESSAGES_PATH(booking._id || booking.bookingCode)}
                          id="chat-owner-btn"
                          className="px-3 py-1.5 rounded-full bg-brand-50 hover:bg-brand-500 text-brand-700 hover:text-white border border-brand-200 hover:border-brand-500 font-semibold text-xs transition flex items-center gap-1"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Chat</span>
                        </Link>
                        {owner.email && (
                          <a
                            href={`mailto:${owner.email}`}
                            className="p-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                            title={T.emailOwnerBtn}
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">{T.ownerUnavailable}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Compact Handover & Delivery Card */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-brand-500" />
                  {T.sections.delivery}
                </h2>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-100">
                  {deliveryMethod === 'pickup' ? (
                    <MapPin className="w-3 h-3 text-brand-600" />
                  ) : (
                    <Truck className="w-3 h-3 text-brand-600" />
                  )}
                  <span>{T.deliveryMethods[deliveryMethod] || deliveryMethod}</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                {recipientName ? (
                  <div className="sm:col-span-4 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                      {T.fields.recipient}
                    </span>
                    <p className="font-bold text-slate-800 flex items-center gap-1.5 truncate">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{recipientName}</span>
                    </p>
                  </div>
                ) : null}

                {recipientPhone ? (
                  <div className="sm:col-span-4 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                      {T.fields.phone}
                    </span>
                    <p className="font-bold text-slate-800 flex items-center gap-1.5 truncate">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{recipientPhone}</span>
                    </p>
                  </div>
                ) : null}

                {deliveryAddress ? (
                  <div className={`${recipientName && recipientPhone ? 'sm:col-span-4' : 'sm:col-span-8'} p-2.5 rounded-xl bg-slate-50 border border-slate-100`}>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                      {deliveryMethod === 'pickup' ? (T.fields.pickupAddress || 'Pickup Location') : T.fields.address}
                    </span>
                    <p className="font-bold text-slate-800 flex items-start gap-1.5" title={deliveryAddress}>
                      <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{deliveryAddress}</span>
                    </p>
                  </div>
                ) : null}

                {booking.note ? (
                  <div className="sm:col-span-12 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-400 shrink-0">{T.fields.note}:</span>
                    <p className="text-slate-700 italic truncate">"{booking.note}"</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): Combined Rental Period & Payment Summary */}
          <div className="lg:col-span-5 flex flex-col gap-3.5">
            <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100">
              {/* Top Section: Rental Schedule */}
              <div className="pb-3.5 border-b border-slate-100">
                <div className="flex items-center justify-between mb-2.5">
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-brand-500" />
                    {T.sections.period}
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-800 text-xs font-extrabold border border-brand-100">
                    <span>{booking.totalDays} {booking.totalDays === 1 ? 'day' : 'days'}</span>
                    {booking.extensionRequest?.status === 'approved' && (
                      <span className="text-[10px] font-bold text-emerald-700">
                        (+{booking.extensionRequest.requestedDays}d)
                      </span>
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                      {T.fields.pickupDate}
                    </span>
                    <span className="font-bold text-slate-800 mt-0.5 block">
                      {formatDateTime(booking.startDate)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                      {T.fields.returnDate}
                    </span>
                    <span className="font-bold text-slate-800 mt-0.5 block">
                      {formatDateTime(booking.endDate)}
                    </span>
                  </div>
                </div>

                {booking.status === 'active' && (
                  <RentalCountdownTimer
                    startDate={booking.startDate}
                    endDate={booking.endDate}
                    status={booking.status}
                  />
                )}

                {booking.status === 'active' && (
                  booking.extensionRequest?.status === 'pending' ? (
                    <div className="mt-2.5 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                      <span>
                        {STRINGS.booking.extension.statusPendingBadge} (+{booking.extensionRequest.requestedDays}{' '}
                        {booking.extensionRequest.requestedDays === 1 ? 'day' : 'days'})
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      id="period-card-extend-btn"
                      onClick={() => setIsExtensionModalOpen(true)}
                      className="mt-2.5 w-full py-2 px-4 rounded-xl bg-brand-50 hover:bg-brand-500 text-brand-700 hover:text-white border border-brand-200 hover:border-brand-500 font-bold text-xs transition flex items-center justify-center gap-1.5"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                      <span>{STRINGS.booking.extension.openModalBtn}</span>
                    </button>
                  )
                )}
              </div>

              {/* Bottom Section: Pricing Breakdown */}
              <div className="pt-3.5">
                <h2 className="text-sm font-bold text-slate-800 mb-2.5 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-brand-500" />
                  {T.sections.pricing}
                </h2>

                <div className="flex flex-col gap-2 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>{T.fields.dailyRate}</span>
                    <span className="font-medium text-slate-800">
                      {formatPrice(booking.pricePerDayAtBooking || booking.dailyRate || 0)} / day
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>
                      {T.fields.rentalFee} ({booking.totalDays} {booking.totalDays === 1 ? 'day' : 'days'})
                    </span>
                    <span className="font-medium text-slate-800">
                      {formatPrice(booking.rentalFee)}
                    </span>
                  </div>

                  {booking.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>
                        {T.fields.discount}
                        {booking.discountPercent ? ` (${booking.discountPercent}%)` : ''}
                      </span>
                      <span className="font-bold">
                        -{formatPrice(booking.discountAmount)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between pt-1.5 border-t border-slate-100">
                    <span>{T.fields.deposit}</span>
                    <span className="font-medium text-slate-800">
                      {formatPrice(booking.depositFee || booking.depositValue || 0)}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline pt-2 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-900">{T.fields.total}</span>
                    <span className="text-lg font-black text-brand-800">
                      {formatPrice(booking.totalAmount)}
                    </span>
                  </div>

                  {/* Payment method and status inline */}
                  <div className="mt-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">{T.fields.paymentMethod}:</span>
                      <span className="font-semibold text-slate-700">
                        {T.paymentMethods[booking.paymentMethod] || booking.paymentMethod}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 text-[10px] font-bold capitalize">
                      {T.paymentStatuses[booking.paymentStatus] || booking.paymentStatus}
                    </span>
                  </div>

                  {!canCancel && (
                    <p className="text-[10px] text-slate-400 italic text-center mt-1">
                      {T.cancelLockedHint}
                    </p>
                  )}
                </div>
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

      {/* Rental Extension Modal */}
      <ExtensionModal
        isOpen={isExtensionModalOpen}
        booking={booking}
        onClose={() => setIsExtensionModalOpen(false)}
        onSuccess={handleExtensionSuccess}
      />

      {/* Rental Review Modal for Completed Bookings */}
      <BookingReviewModal
        isOpen={isReviewModalOpen}
        booking={booking}
        onClose={() => setIsReviewModalOpen(false)}
        onReviewSaved={(updatedBooking) => {
          if (updatedBooking) setBooking(updatedBooking);
        }}
      />
    </div>
  );
};

export default BookingDetailPage;
