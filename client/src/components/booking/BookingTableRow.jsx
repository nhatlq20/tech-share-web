import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Package,
  Clock,
  CheckCircle2,
  CalendarPlus,
  Star,
  RotateCcw,
  Receipt,
} from 'lucide-react';
import { STRINGS } from '../../constants/strings.js';
import { ROUTES } from '../../routes/routes.js';
import { BookingStatusBadge } from './BookingStatusBadge.jsx';
import { CountdownBadge, RentalCountdownTimer } from './CountdownBadge.jsx';

const formatPriceVnd = (amount) =>
  `${Math.round(Number(amount) || 0).toLocaleString('en-US')} ${STRINGS.COMMON.VND}`;

const getDurationLabel = (startDate, endDate, totalDays) => {
  const diffMs = new Date(endDate).getTime() - new Date(startDate).getTime();
  if (diffMs > 0) {
    const totalHours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));
    const d = Math.floor(totalHours / 24);
    const h = totalHours % 24;
    if (d > 0 && h > 0) return STRINGS.BOOKING_ITEM_CARD.DAYS_HOURS(d, h);
    if (d > 0) return STRINGS.BOOKING_ITEM_CARD.DAYS_ONLY(d);
    return STRINGS.BOOKING_ITEM_CARD.HOURS_ONLY(h);
  }
  return STRINGS.BOOKING_ITEM_CARD.DAYS_ONLY(totalDays || 1);
};

/**
 * Shared Action Buttons matching App's BookingItemCard actions + Web Details button
 */
const BookingRowActions = ({
  booking,
  onViewDetail,
  onCancel,
  onExtend,
  onRate,
  onRebook,
}) => {
  const isReviewed = Boolean(booking?.isReviewed || booking?.review);

  return (
    <div
      className="flex items-center justify-end gap-2 flex-wrap"
      onClick={(e) => e.stopPropagation()}
    >
      {booking.status === 'pending' && onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-xl border border-red-500 text-red-500 hover:bg-red-50 text-xs font-bold transition-colors"
        >
          {STRINGS.BOOKING_ITEM_CARD.CANCEL_BTN}
        </button>
      )}

      {booking.status === 'active' && onExtend && (
        <button
          type="button"
          disabled={booking.extensionRequest?.status === 'pending'}
          onClick={onExtend}
          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors ${
            booking.extensionRequest?.status === 'pending'
              ? 'border-slate-300 bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'border-brand-500 bg-brand-50 text-brand-600 hover:bg-brand-100'
          }`}
        >
          <CalendarPlus className="w-3.5 h-3.5" />
          <span>
            {booking.extensionRequest?.status === 'pending'
              ? STRINGS.BOOKING_ITEM_CARD.EXTEND_PENDING_BTN
              : STRINGS.BOOKING_ITEM_CARD.EXTEND_BTN}
          </span>
        </button>
      )}

      {booking.status === 'completed' && (
        <>
          {isReviewed ? (
            <>
              <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{STRINGS.BOOKING_ITEM_CARD.RATED_BTN}</span>
              </span>

              {onRebook && (
                <button
                  type="button"
                  onClick={onRebook}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand-50 border border-brand-500 text-brand-600 hover:bg-brand-100 text-xs font-bold transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{STRINGS.BOOKING_ITEM_CARD.REBOOK_BTN}</span>
                </button>
              )}
            </>
          ) : (
            onRate && (
              <button
                type="button"
                onClick={onRate}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors shadow-2xs"
              >
                <Star className="w-3.5 h-3.5 fill-white" />
                <span>{STRINGS.BOOKING_ITEM_CARD.RATE_BTN}</span>
              </button>
            )
          )}
        </>
      )}

      <button
        type="button"
        onClick={onViewDetail}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-brand-500 text-slate-700 hover:text-white text-xs font-bold transition-colors"
      >
        <span>{STRINGS.booking.myBookings.viewDetailBtn}</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

/**
 * BookingTableRow – Desktop Web Table Row with App-synchronized information & actions
 */
export const BookingTableRow = ({
  booking,
  onCancel,
  onExtend,
  onRate,
  onRebook,
}) => {
  const navigate = useNavigate();

  const device =
    (typeof booking?.deviceId === 'object' && booking.deviceId) ||
    (typeof booking?.device === 'object' && booking.device) ||
    {};

  const title =
    device.name || device.title || STRINGS.BOOKING_ITEM_CARD.UNKNOWN_DEVICE;
  const thumbnail =
    Array.isArray(device.images) && device.images.length > 0
      ? device.images[0]
      : null;

  const detailId = booking.bookingCode || booking._id;
  const durationText = getDurationLabel(
    booking.startDate,
    booking.endDate,
    booking.totalDays
  );

  const handleGoDetail = () => {
    navigate(ROUTES.BOOKING_DETAIL_PATH(detailId));
  };

  return (
    <tr
      onClick={handleGoDetail}
      className="group border-b border-slate-100 last:border-b-0 hover:bg-brand-50/30 transition cursor-pointer"
    >
      {/* 1. Device + Booking Code */}
      <td className="py-4 pl-6 pr-4">
        <div className="flex items-center gap-3.5">
          <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center border border-slate-200/70">
            {thumbnail ? (
              <img src={thumbnail} alt={title} className="w-full h-full object-cover" />
            ) : (
              <Package className="w-6 h-6 text-slate-400" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-brand-600 mb-0.5">
              <Receipt className="w-3.5 h-3.5 text-brand-500" />
              <span>
                #{booking.bookingCode || String(booking._id).slice(-6).toUpperCase()}
              </span>
            </div>
            <p className="font-bold text-slate-900 group-hover:text-brand-600 transition truncate max-w-xs">
              {title}
            </p>
            {device.brand && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                {device.brand}
                {device.category ? ` • ${device.category}` : ''}
              </p>
            )}
          </div>
        </div>
      </td>

      {/* 2. Rental Period + Active Countdown + Extension Tag (App info) */}
      <td className="py-4 px-4 text-sm text-slate-700">
        <div className="space-y-1">
          <p className="text-xs text-slate-500">
            {STRINGS.BOOKING_ITEM_CARD.FROM_PREFIX}
            <span className="font-semibold text-slate-900">
              {new Date(booking.startDate).toLocaleDateString('en-US')}
            </span>
          </p>
          <p className="text-xs text-slate-500">
            {STRINGS.BOOKING_ITEM_CARD.TO_PREFIX}
            <span className="font-semibold text-slate-900">
              {new Date(booking.endDate).toLocaleDateString('en-US')}
            </span>{' '}
            <span className="text-brand-600 font-semibold">({durationText})</span>
          </p>

          {booking.status === 'active' && booking.endDate && (
            <div className="pt-1">
              <CountdownBadge endDate={booking.endDate} compact />
            </div>
          )}

          {booking.extensionRequest?.status === 'pending' && (
            <div className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md text-[11px] font-semibold text-amber-700 mt-1">
              <Clock className="w-3 h-3 text-amber-500 shrink-0" />
              <span>
                {STRINGS.BOOKING_ITEM_CARD.EXT_PENDING(
                  booking.extensionRequest.requestedDays,
                  (booking.extensionRequest.additionalFee || 0).toLocaleString('en-US')
                )}
              </span>
            </div>
          )}

          {booking.extensionRequest?.status === 'approved' && (
            <div className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px] font-semibold text-emerald-700 mt-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
              <span>
                {STRINGS.BOOKING_ITEM_CARD.EXT_APPROVED(
                  booking.extensionRequest.requestedDays
                )}
              </span>
            </div>
          )}
        </div>
      </td>

      {/* 3. Total Payment */}
      <td className="py-4 px-4">
        <span className="font-extrabold text-brand-500 text-sm">
          {formatPriceVnd(booking.totalAmount)}
        </span>
      </td>

      {/* 4. Status Badge */}
      <td className="py-4 px-4">
        <BookingStatusBadge status={booking.status} size="sm" />
      </td>

      {/* 5. Actions (Cancel / Extend / Review / Rent Again + Details) */}
      <td className="py-4 pl-4 pr-6 text-right">
        <BookingRowActions
          booking={booking}
          onViewDetail={handleGoDetail}
          onCancel={onCancel}
          onExtend={onExtend}
          onRate={onRate}
          onRebook={onRebook}
        />
      </td>
    </tr>
  );
};

/**
 * BookingMobileCard – Responsive Card for mobile/tablet viewports
 */
export const BookingMobileCard = ({
  booking,
  onCancel,
  onExtend,
  onRate,
  onRebook,
}) => {
  const navigate = useNavigate();

  const device =
    (typeof booking?.deviceId === 'object' && booking.deviceId) ||
    (typeof booking?.device === 'object' && booking.device) ||
    {};

  const title =
    device.name || device.title || STRINGS.BOOKING_ITEM_CARD.UNKNOWN_DEVICE;
  const thumbnail =
    Array.isArray(device.images) && device.images.length > 0
      ? device.images[0]
      : null;

  const detailId = booking.bookingCode || booking._id;
  const durationText = getDurationLabel(
    booking.startDate,
    booking.endDate,
    booking.totalDays
  );

  const handleGoDetail = () => {
    navigate(ROUTES.BOOKING_DETAIL_PATH(detailId));
  };

  return (
    <div
      onClick={handleGoDetail}
      className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 hover:border-brand-200 transition cursor-pointer"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Receipt className="w-4 h-4 text-brand-500" />
          <span className="text-xs font-bold text-slate-900">
            #{booking.bookingCode || String(booking._id).slice(-6).toUpperCase()}
          </span>
        </div>
        <BookingStatusBadge status={booking.status} size="sm" />
      </div>

      <div className="flex items-center gap-3.5">
        <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center border border-slate-200/70">
          {thumbnail ? (
            <img src={thumbnail} alt={title} className="w-full h-full object-cover" />
          ) : (
            <Package className="w-6 h-6 text-slate-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 truncate mb-1">{title}</p>
          <p className="text-xs text-slate-500">
            {STRINGS.BOOKING_ITEM_CARD.FROM_PREFIX}
            <span className="font-semibold text-slate-900">
              {new Date(booking.startDate).toLocaleDateString('en-US')}
            </span>
          </p>
          <p className="text-xs text-slate-500">
            {STRINGS.BOOKING_ITEM_CARD.TO_PREFIX}
            <span className="font-semibold text-slate-900">
              {new Date(booking.endDate).toLocaleDateString('en-US')}
            </span>{' '}
            ({durationText})
          </p>
        </div>
      </div>

      {booking.status === 'active' && (
        <RentalCountdownTimer
          startDate={booking.startDate}
          endDate={booking.endDate}
          status={booking.status}
        />
      )}

      {booking.extensionRequest?.status === 'pending' && (
        <div className="flex items-center gap-1.5 bg-amber-50 px-2.5 py-1.5 rounded-lg mt-2.5">
          <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="text-xs font-semibold text-amber-600">
            {STRINGS.BOOKING_ITEM_CARD.EXT_PENDING(
              booking.extensionRequest.requestedDays,
              (booking.extensionRequest.additionalFee || 0).toLocaleString('en-US')
            )}
          </span>
        </div>
      )}

      {booking.extensionRequest?.status === 'approved' && (
        <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1.5 rounded-lg mt-2.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="text-xs font-semibold text-emerald-600">
            {STRINGS.BOOKING_ITEM_CARD.EXT_APPROVED(
              booking.extensionRequest.requestedDays
            )}
          </span>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
        <div>
          <span className="text-xs text-slate-500 mr-1.5">
            {STRINGS.BOOKING_ITEM_CARD.TOTAL_LABEL}
          </span>
          <span className="font-extrabold text-brand-500 text-sm">
            {formatPriceVnd(booking.totalAmount)}
          </span>
        </div>

        <BookingRowActions
          booking={booking}
          onViewDetail={handleGoDetail}
          onCancel={onCancel}
          onExtend={onExtend}
          onRate={onRate}
          onRebook={onRebook}
        />
      </div>
    </div>
  );
};

export const BookingItemCard = BookingTableRow;
export default BookingTableRow;
