import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CalendarPlus,
  Clock,
  MapPin,
  Store,
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
  RotateCcw,
  ArrowRight,
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
import { formatDateTime, formatDate } from '../../utils/formatters.js';

const T = STRINGS.booking.detail;

const formatPriceVnd = (amount) =>
  `${Math.round(Number(amount) || 0).toLocaleString('en-US')} ${STRINGS.COMMON.VND}`;

const formatScheduleDateTime = (dateInput) => {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) {
    return { dateStr: '--/--/----', weekdayStr: '', timeStr: '--:--' };
  }
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');

  return {
    dateStr: `${day}/${month}/${year}`,
    weekdayStr: weekdays[d.getDay()],
    timeStr: `${hours}:${mins}`,
  };
};

const calculateDurationBetweenDates = (startInput, endInput, fallbackDays = 1) => {
  const start = new Date(startInput).getTime();
  const end = new Date(endInput).getTime();
  const diffMs = end - start;

  if (diffMs > 0) {
    const totalHours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));
    const days = Math.floor(totalHours / 24);
    const remHours = totalHours % 24;

    let formattedLabel = '';
    if (days > 0 && remHours > 0) {
      formattedLabel = STRINGS.BOOKING_ITEM_CARD.DAYS_HOURS(days, remHours);
    } else if (days > 0) {
      formattedLabel = STRINGS.BOOKING_ITEM_CARD.DAYS_ONLY(days);
    } else {
      formattedLabel = STRINGS.BOOKING_ITEM_CARD.HOURS_ONLY(remHours);
    }

    return {
      totalHours,
      formattedLabel,
      hoursBadge: `${totalHours}h`,
    };
  }

  return {
    totalHours: fallbackDays * 24,
    formattedLabel: STRINGS.BOOKING_ITEM_CARD.DAYS_ONLY(fallbackDays || 1),
    hoursBadge: `${(fallbackDays || 1) * 24}h`,
  };
};

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
  const targetDeviceId =
    device._id ||
    device.id ||
    (typeof booking.deviceId === 'string' ? booking.deviceId : '') ||
    (typeof booking.device === 'string' ? booking.device : '');

  const deliveryMethod = booking.deliveryMethod || booking.delivery?.method || 'pickup';
  const deliveryAddress =
    (typeof booking.deliveryAddress === 'string'
      ? booking.deliveryAddress
      : booking.deliveryAddress?.address) ||
    booking.delivery?.address ||
    device.addressText ||
    device.location?.addressText ||
    device.address ||
    STRINGS.BOOKING_CREATE.PICKUP_DEFAULT_NOTE;

  const canCancel = booking.canCancel ?? (booking.status === 'pending');
  const currentUserId = String(user?._id || user?.id || '');
  const bookingOwnerId = String(
    owner?._id ||
      owner?.id ||
      (typeof booking.ownerId === 'string' ? booking.ownerId : '') ||
      ''
  );
  const isOwnerView = Boolean(currentUserId && bookingOwnerId && currentUserId === bookingOwnerId);
  const isReviewed = isOwnerView
    ? Boolean(booking.isRenterReviewed || booking.renterReview)
    : Boolean(booking.isReviewed || booking.review);

  const pickupInfo = formatScheduleDateTime(booking.startDate);
  const returnInfo = formatScheduleDateTime(booking.endDate);
  const durationBetweenDates = calculateDurationBetweenDates(
    booking.startDate,
    booking.endDate,
    booking.totalDays
  );
  const dailyRate = Number(
    booking.pricePerDayAtBooking ||
      booking.dailyRate ||
      device.dailyRate ||
      device.pricePerDay ||
      0
  );

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
                className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-brand-600 hover:border-brand-200 transition shrink-0"
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
                    <CountdownBadge startDate={booking.startDate} targetDate={booking.endDate} compact />
                  )}
                  <span className="text-[11px] text-slate-400">
                    • {T.createdAtLabel}: {formatDateTime(booking.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons in Header (Synchronized with App actions) */}
            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              {booking.status === 'active' && booking.extensionRequest?.status !== 'pending' && (
                <button
                  type="button"
                  id="header-extend-booking-btn"
                  onClick={() => setIsExtensionModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs transition shadow-2xs flex items-center gap-1.5"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  <span>{STRINGS.BOOKING_ITEM_CARD.EXTEND_BTN}</span>
                </button>
              )}

              {booking.status === 'completed' && (
                <>
                  {isReviewed ? (
                    <>
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          {isOwnerView
                            ? STRINGS.REVIEW_MODAL.RENTER_REVIEWED_BADGE
                            : STRINGS.BOOKING_ITEM_CARD.RATED_BTN}
                        </span>
                      </span>
                      {!isOwnerView && targetDeviceId && (
                        <button
                          type="button"
                          onClick={() =>
                            navigate(ROUTES.BOOKING_CHECKOUT_PATH(targetDeviceId), {
                              state: { device: device?._id ? device : undefined },
                            })
                          }
                          className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition shadow-2xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{STRINGS.BOOKING_ITEM_CARD.REBOOK_BTN}</span>
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      type="button"
                      id="header-review-booking-btn"
                      onClick={() => setIsReviewModalOpen(true)}
                      className="px-3.5 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition shadow-2xs flex items-center gap-1.5"
                    >
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>
                        {isOwnerView
                          ? STRINGS.REVIEW_MODAL.REVIEW_RENTER_BTN
                          : STRINGS.BOOKING_ITEM_CARD.RATE_BTN}
                      </span>
                    </button>
                  )}
                </>
              )}

              {canCancel && (
                <button
                  type="button"
                  id="cancel-booking-open-btn"
                  onClick={handleOpenCancelModal}
                  className="px-3.5 py-1.5 rounded-full bg-red-50 text-red-600 font-bold text-xs hover:bg-red-100 border border-red-200 transition"
                >
                  {STRINGS.BOOKING_ITEM_CARD.CANCEL_BTN}
                </button>
              )}
            </div>
          </div>

          {/* Alerts / Status Banners */}
          {extensionSuccessMsg && (
            <div className="mt-3 px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 text-xs border border-emerald-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
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
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
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
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>{STRINGS.booking.extension.pendingBannerTitle}:</strong>{' '}
                  {STRINGS.booking.extension.pendingBannerDesc(
                    booking.extensionRequest.requestedDays,
                    formatDate(booking.extensionRequest.requestedEndDate),
                    formatPriceVnd(booking.extensionRequest.additionalFee)
                  )}
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-200/80 text-amber-800 text-[10px] font-bold uppercase">
                {STRINGS.booking.extension.statusPendingBadge}
              </span>
            </div>
          )}

          {booking.extensionRequest?.status === 'approved' && (
            <div className="mt-3 px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">
                {STRINGS.BOOKING_ITEM_CARD.EXT_APPROVED(booking.extensionRequest.requestedDays)}
              </span>
            </div>
          )}

          {booking.status === 'cancelled' && booking.cancelReason && (
            <div className="mt-3 px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs border border-slate-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-slate-500 shrink-0" />
              <div>
                <span className="font-bold text-slate-800">{T.fields.cancelReason}: </span>
                <span>{booking.cancelReason}</span>
              </div>
            </div>
          )}

          {booking.status === 'rejected' && booking.rejectReason && (
            <div className="mt-3 px-3.5 py-2 rounded-xl bg-red-50 text-red-800 text-xs border border-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
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
          mode={isOwnerView ? 'owner_to_renter' : 'renter_to_owner'}
          onOpenReviewModal={() => setIsReviewModalOpen(true)}
        />

        {/* Main 2-Column Web Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start mt-3.5">
          {/* Left Column (7 cols): Unified Device & Owner Card + Handover Method & Location Card */}
          <div className="lg:col-span-7 flex flex-col gap-3.5">
            {/* 1. Unified Device & Owner Card (Synchronized with App's Unified Card) */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                {/* Device Info (7 cols) */}
                <div className="md:col-span-7 flex items-start gap-3.5 min-w-0">
                  <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center border border-slate-200/70">
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
                        {device.brand || T.sections.device}
                        {device.category ? ` • ${device.category}` : ''}
                      </span>
                      {targetDeviceId && (
                        <Link
                          to={ROUTES.DEVICE_DETAIL_PATH(targetDeviceId)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700 shrink-0"
                        >
                          <span>{T.viewDeviceBtn}</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                    <h2 className="text-sm font-bold text-slate-900 truncate mt-0.5">
                      {device.name || device.title || STRINGS.booking.myBookings.untitledDevice}
                    </h2>
                    <p className="text-sm font-extrabold text-brand-500 mt-1">
                      {formatPriceVnd(dailyRate)}{' '}
                      <span className="text-xs font-medium text-slate-500">
                        {STRINGS.BOOKING_CREATE.PER_DAY}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Owner Info & Direct Chat (5 cols) */}
                <div className="md:col-span-5 md:border-l md:border-slate-100 md:pl-4 pt-3 md:pt-0 border-t border-slate-100 md:border-t-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    {T.sections.owner}
                  </span>
                  {owner && (owner.name || owner.email) ? (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">
                          {owner.avatar ? (
                            <img src={owner.avatar} alt={owner.name} className="w-full h-full object-cover" />
                          ) : (
                            (owner.name || 'O').charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {owner.name || 'Device Owner'}
                            </span>
                            {owner.isVerified && (
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" title={T.ownerVerified} />
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-50 text-amber-600 text-[10px] font-bold">
                              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                              {owner.rating ? Number(owner.rating).toFixed(1) : '5.0'}
                            </span>
                            <span className="text-[11px] text-slate-400 truncate">
                              • Device Owner
                            </span>
                          </div>
                        </div>
                      </div>

                      <Link
                        to={ROUTES.MESSAGES_PATH(booking._id || booking.bookingCode)}
                        id="chat-owner-btn"
                        className="px-3.5 py-1.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs transition flex items-center gap-1.5 shrink-0 shadow-2xs"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </Link>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">{T.ownerUnavailable}</p>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Handover Method & Location Card (Synchronized with App's Delivery Section) */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  {deliveryMethod === 'delivery' ? (
                    <Truck className="w-4 h-4 text-brand-500" />
                  ) : (
                    <Store className="w-4 h-4 text-brand-500" />
                  )}
                  {STRINGS.BOOKING_CREATE.DELIVERY_METHOD_TITLE}
                </h2>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-600 border border-brand-200">
                  {deliveryMethod === 'delivery' ? (
                    <Truck className="w-3 h-3" />
                  ) : (
                    <Store className="w-3 h-3" />
                  )}
                  <span>
                    {deliveryMethod === 'delivery'
                      ? STRINGS.BOOKING_CREATE.DELIVERY_TITLE
                      : STRINGS.BOOKING_CREATE.PICKUP_TITLE}
                  </span>
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5 text-xs">
                <MapPin className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    {deliveryMethod === 'pickup' ? T.fields.pickupAddress : T.fields.address}
                  </span>
                  <p className="font-semibold text-slate-800 leading-relaxed">
                    {deliveryAddress}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): Rental Schedule + Payment Breakdown (Synchronized with App) */}
          <div className="lg:col-span-5 flex flex-col gap-3.5">
            <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100">
              {/* Top Section: Rental Period Route (Pickup -> Hours -> Return) */}
              <div className="pb-3.5 border-b border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-brand-500" />
                    {STRINGS.BOOKING_CREATE.RENTAL_TIME_TITLE}
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-600 text-xs font-extrabold border border-brand-200">
                    <Clock className="w-3 h-3" />
                    <span>{durationBetweenDates.formattedLabel}</span>
                  </span>
                </div>

                {/* Balanced Pickup & Return Schedule Route Card (Matching App) */}
                <div className="flex items-stretch justify-between gap-2">
                  {/* Pickup Box */}
                  <div className="flex-1 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">
                        PICKUP
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-extrabold text-slate-900">
                      {pickupInfo.dateStr}
                    </p>
                    <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-bold">
                      <Clock className="w-3 h-3" />
                      <span>
                        {pickupInfo.weekdayStr} • {pickupInfo.timeStr}
                      </span>
                    </div>
                  </div>

                  {/* Center Track: Arrow & Hours Badge */}
                  <div className="flex flex-col items-center justify-center px-1">
                    <div className="w-6 h-6 rounded-full bg-brand-50 text-brand-500 flex items-center justify-center">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                    <span className="mt-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-extrabold">
                      {durationBetweenDates.hoursBadge}
                    </span>
                  </div>

                  {/* Return Box */}
                  <div className="flex-1 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600">
                        RETURN
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-extrabold text-slate-900">
                      {returnInfo.dateStr}
                    </p>
                    <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[11px] font-bold">
                      <Clock className="w-3 h-3" />
                      <span>
                        {returnInfo.weekdayStr} • {returnInfo.timeStr}
                      </span>
                    </div>
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
                      <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>
                        {STRINGS.BOOKING_ITEM_CARD.EXT_PENDING(
                          booking.extensionRequest.requestedDays,
                          (booking.extensionRequest.additionalFee || 0).toLocaleString('en-US')
                        )}
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      id="period-card-extend-btn"
                      onClick={() => setIsExtensionModalOpen(true)}
                      className="mt-2.5 w-full py-2 px-4 rounded-xl bg-brand-50 hover:bg-brand-500 text-brand-600 hover:text-white border border-brand-200 hover:border-brand-500 font-bold text-xs transition flex items-center justify-center gap-1.5"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                      <span>{STRINGS.BOOKING_ITEM_CARD.EXTEND_BTN}</span>
                    </button>
                  )
                )}
              </div>

              {/* Bottom Section: Payment Details (Synchronized with App's Pricing & Payment Card) */}
              <div className="pt-3.5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-brand-500" />
                    {STRINGS.PRICE_BREAKDOWN.TITLE}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold capitalize">
                    {T.paymentStatuses[booking.paymentStatus] || booking.paymentStatus}
                  </span>
                </div>

                <div className="flex flex-col gap-2 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>
                      {STRINGS.PRICE_BREAKDOWN.RENTAL_FEE(booking.totalDays || 1)} (×{' '}
                      {formatPriceVnd(dailyRate)}):
                    </span>
                    <span className="font-semibold text-slate-900">
                      {formatPriceVnd(booking.rentalFee)}
                    </span>
                  </div>

                  {booking.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>
                        {STRINGS.PRICE_BREAKDOWN.LONG_TERM_DISCOUNT(
                          booking.discountPercent || 10
                        )}
                      </span>
                      <span className="font-bold">
                        -{formatPriceVnd(booking.discountAmount)}
                      </span>
                    </div>
                  )}

                  {booking.voucherDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>
                        {T.fields.voucher} ({booking.voucherCode || 'Promo'}):
                      </span>
                      <span className="font-bold">
                        -{formatPriceVnd(booking.voucherDiscount)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between pt-1.5 border-t border-slate-100">
                    <span>{STRINGS.PRICE_BREAKDOWN.DEPOSIT_FEE}</span>
                    <span className="font-semibold text-slate-900">
                      {formatPriceVnd(booking.depositFee || booking.depositValue || 0)}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline pt-2.5 border-t border-slate-200">
                    <span className="text-xs font-bold text-slate-900">
                      {STRINGS.PRICE_BREAKDOWN.TOTAL_PAYMENT}
                    </span>
                    <span className="text-lg font-extrabold text-brand-500">
                      {formatPriceVnd(booking.totalAmount)}
                    </span>
                  </div>
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
        mode={isOwnerView ? 'owner_to_renter' : 'renter_to_owner'}
        onClose={() => setIsReviewModalOpen(false)}
        onReviewSaved={(updatedBooking) => {
          if (updatedBooking) setBooking(updatedBooking);
        }}
      />
    </div>
  );
};

export default BookingDetailPage;
