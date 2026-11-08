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
  QrCode,
  Camera,
  XCircle,
  Calendar,
} from 'lucide-react';
import { STRINGS } from '../../constants/strings.js';
import { ROUTES } from '../../routes/routes.js';
import { BookingStatusBadge } from './BookingStatusBadge.jsx';
import { CountdownBadge, RentalCountdownTimer } from './CountdownBadge.jsx';

const formatPriceVnd = (amount) =>
  `${Math.round(Number(amount) || 0).toLocaleString('en-US')} ${STRINGS.COMMON.VND}`;

const formatShortDate = (value) => {
  if (!value) return '--';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

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
 * Shared Action Buttons – unified height, single-line non-wrapping layout
 */
const BookingRowActions = ({
  booking,
  onViewDetail,
  onCancel,
  onExtend,
  onRate,
  onRebook,
  onOpenHandover,
}) => {
  const isReviewed = Boolean(booking?.isReviewed || booking?.review);

  return (
    <div
      className="inline-flex items-center justify-end gap-1.5 flex-nowrap whitespace-nowrap"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Pending: Cancel button */}
      {booking.status === 'pending' && onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="h-7 px-2.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 text-[11px] font-semibold inline-flex items-center gap-1 transition shrink-0"
        >
          <XCircle className="w-3 h-3 shrink-0" />
          <span>Cancel</span>
        </button>
      )}

      {/* Approved: QR & Handover button */}
      {booking.status === 'approved' && onOpenHandover && (
        <button
          type="button"
          onClick={() => onOpenHandover(booking)}
          className="h-7 px-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-semibold inline-flex items-center gap-1 shadow-2xs transition shrink-0"
        >
          <QrCode className="w-3 h-3 shrink-0" />
          <span>QR & Handover</span>
        </button>
      )}

      {/* Active: Extend button */}
      {booking.status === 'active' && onExtend && (
        <button
          type="button"
          disabled={booking.extensionRequest?.status === 'pending'}
          onClick={onExtend}
          className={`h-7 px-2.5 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1 transition shrink-0 ${
            booking.extensionRequest?.status === 'pending'
              ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100'
          }`}
        >
          <CalendarPlus className="w-3 h-3 shrink-0" />
          <span>
            {booking.extensionRequest?.status === 'pending'
              ? 'Ext. Pending'
              : 'Extend'}
          </span>
        </button>
      )}

      {/* Completed: Write Review (if not reviewed yet) + Rent Again */}
      {booking.status === 'completed' && (
        <>
          {!isReviewed && onRate && (
            <button
              type="button"
              onClick={onRate}
              className="h-7 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-semibold inline-flex items-center gap-1 shadow-2xs transition shrink-0"
            >
              <Star className="w-3 h-3 fill-white shrink-0" />
              <span>Review</span>
            </button>
          )}

          {onRebook && (
            <button
              type="button"
              onClick={onRebook}
              className="h-7 px-2.5 rounded-lg border border-brand-200 bg-brand-50 hover:bg-brand-100 text-brand-700 text-[11px] font-semibold inline-flex items-center gap-1 transition shrink-0"
            >
              <RotateCcw className="w-3 h-3 shrink-0" />
              <span>Rent Again</span>
            </button>
          )}
        </>
      )}

      {/* View Details button */}
      <button
        type="button"
        onClick={onViewDetail}
        className="h-7 px-2.5 rounded-lg bg-slate-100 hover:bg-brand-600 text-slate-700 hover:text-white text-[11px] font-semibold inline-flex items-center gap-1 transition shrink-0"
      >
        <span>Details</span>
        <ArrowRight className="w-3 h-3 shrink-0" />
      </button>
    </div>
  );
};

/**
 * BookingTableRow – Compact, clean Desktop Table Row
 */
export const BookingTableRow = ({
  booking,
  onCancel,
  onExtend,
  onRate,
  onRebook,
  onOpenHandover,
}) => {
  const navigate = useNavigate();

  const device =
    (typeof booking?.deviceId === 'object' && booking.deviceId) ||
    (typeof booking?.device === 'object' && booking.device) ||
    {};

  const title =
    device.name || device.title || STRINGS.BOOKING_ITEM_CARD.UNKNOWN_DEVICE;
  const thumbnail =
    device.thumbnail ||
    (Array.isArray(device.images) && device.images.length > 0
      ? device.images[0]
      : null);

  const detailId = booking.bookingCode || booking._id;
  const codeText =
    booking.bookingCode || String(booking._id || '').slice(-6).toUpperCase();
  const durationText = getDurationLabel(
    booking.startDate,
    booking.endDate,
    booking.totalDays
  );

  const isReviewed = Boolean(booking?.isReviewed || booking?.review);
  const beforePhotosCount =
    booking?.handover?.beforePhotos?.length ||
    booking?.handoverPhotos?.beforeRental?.length ||
    0;

  const handleGoDetail = () => {
    navigate(ROUTES.BOOKING_DETAIL_PATH(detailId));
  };

  return (
    <tr
      onClick={handleGoDetail}
      className="group border-b border-slate-100 last:border-b-0 hover:bg-slate-50/80 transition cursor-pointer"
    >
      {/* 1. Device + Booking Code */}
      <td className="py-2.5 pl-4 pr-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-11 h-11 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center border border-slate-200/70">
            {thumbnail ? (
              <img
                src={thumbnail}
                alt={title}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
              />
            ) : (
              <Package className="w-5 h-5 text-slate-400" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px] font-bold">
                #{codeText}
              </span>
              {device.brand && (
                <span className="text-[11px] font-medium text-slate-400 truncate max-w-[110px]">
                  {device.brand}
                  {device.category ? ` • ${device.category}` : ''}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-brand-600 transition truncate max-w-[165px] lg:max-w-[210px]">
              {title}
            </p>
          </div>
        </div>
      </td>

      {/* 2. Rental Period + Active Countdown + Extension Tag */}
      <td className="py-2.5 px-2.5 text-xs text-slate-700 whitespace-nowrap">
        <div className="flex flex-col gap-1">
          <div className="inline-flex items-center gap-1 text-slate-800 font-semibold text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{formatShortDate(booking.startDate)}</span>
            <span className="text-slate-400">→</span>
            <span>{formatShortDate(booking.endDate)}</span>
            <span className="ml-0.5 px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 text-[10px] font-bold">
              {durationText}
            </span>
          </div>

          {booking.status === 'active' && booking.endDate && (
            <div>
              <CountdownBadge endDate={booking.endDate} compact />
            </div>
          )}

          {booking.extensionRequest?.status === 'pending' && (
            <div className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md text-[10px] font-semibold text-amber-700 w-fit">
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
            <div className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px] font-semibold text-emerald-700 w-fit">
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
      <td className="py-2.5 px-2.5 whitespace-nowrap">
        <p className="font-extrabold text-slate-900 text-xs sm:text-sm">
          {formatPriceVnd(booking.totalAmount)}
        </p>
        {booking.depositAmount > 0 && (
          <p className="text-[10px] text-slate-400">
            Dep: {formatPriceVnd(booking.depositAmount)}
          </p>
        )}
      </td>

      {/* 4. Status Badge + Secondary Indicator (Reviewed / Photos uploaded) */}
      <td className="py-2.5 px-2.5 whitespace-nowrap">
        <div className="flex items-center gap-1">
          <BookingStatusBadge status={booking.status} size="sm" />

          {booking.status === 'completed' && isReviewed && (
            <span
              title="You have reviewed this rental"
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold"
            >
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
              <span>Reviewed</span>
            </span>
          )}

          {booking.status === 'approved' && beforePhotosCount > 0 && (
            <span
              title={`${beforePhotosCount} handover photo(s) uploaded`}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-semibold"
            >
              <Camera className="w-2.5 h-2.5" />
              <span>{beforePhotosCount}</span>
            </span>
          )}
        </div>
      </td>

      {/* 5. Actions (Single-line right-aligned buttons) */}
      <td className="py-2.5 pl-2.5 pr-4 text-right whitespace-nowrap">
        <BookingRowActions
          booking={booking}
          onViewDetail={handleGoDetail}
          onCancel={onCancel}
          onExtend={onExtend}
          onRate={onRate}
          onRebook={onRebook}
          onOpenHandover={onOpenHandover}
        />
      </td>
    </tr>
  );
};

/**
 * BookingMobileCard – Compact Responsive Card for mobile/tablet viewports
 */
export const BookingMobileCard = ({
  booking,
  onCancel,
  onExtend,
  onRate,
  onRebook,
  onOpenHandover,
}) => {
  const navigate = useNavigate();

  const device =
    (typeof booking?.deviceId === 'object' && booking.deviceId) ||
    (typeof booking?.device === 'object' && booking.device) ||
    {};

  const title =
    device.name || device.title || STRINGS.BOOKING_ITEM_CARD.UNKNOWN_DEVICE;
  const thumbnail =
    device.thumbnail ||
    (Array.isArray(device.images) && device.images.length > 0
      ? device.images[0]
      : null);

  const detailId = booking.bookingCode || booking._id;
  const codeText =
    booking.bookingCode || String(booking._id || '').slice(-6).toUpperCase();
  const durationText = getDurationLabel(
    booking.startDate,
    booking.endDate,
    booking.totalDays
  );
  const isReviewed = Boolean(booking?.isReviewed || booking?.review);

  const handleGoDetail = () => {
    navigate(ROUTES.BOOKING_DETAIL_PATH(detailId));
  };

  return (
    <div
      onClick={handleGoDetail}
      className="bg-white rounded-2xl p-3.5 shadow-xs border border-slate-200/80 hover:border-brand-300 transition cursor-pointer"
    >
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-xs font-bold">
          #{codeText}
        </span>
        <div className="flex items-center gap-1.5">
          <BookingStatusBadge status={booking.status} size="sm" />
          {booking.status === 'completed' && isReviewed && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Reviewed</span>
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center border border-slate-200/70">
          {thumbnail ? (
            <img src={thumbnail} alt={title} className="w-full h-full object-cover" />
          ) : (
            <Package className="w-5 h-5 text-slate-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate mb-1">{title}</p>
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{formatShortDate(booking.startDate)}</span>
            <span className="text-slate-400">→</span>
            <span>{formatShortDate(booking.endDate)}</span>
            <span className="px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 text-[10px] font-bold">
              {durationText}
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

      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
        <div>
          <span className="text-[11px] text-slate-400 mr-1">Total:</span>
          <span className="font-extrabold text-slate-900 text-sm">
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
          onOpenHandover={onOpenHandover}
        />
      </div>
    </div>
  );
};

export const BookingItemCard = BookingTableRow;
export default BookingTableRow;
