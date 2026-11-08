import React from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Tag,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { STRINGS } from '../../constants/strings.js';

const formatPriceVnd = (amount) =>
  `${Math.round(Number(amount) || 0).toLocaleString('en-US')} ${STRINGS.COMMON.VND}`;

/**
 * OrderSummaryCard - Sticky right-column Web summary card
 * Displays exact App Payment Breakdown & Device Summary information
 */
export const OrderSummaryCard = ({
  device,
  rentalDays = 0,
  rentalDurationInfo = { days: 0, hours: 0, totalHours: 0 },
  dailyRate = 0,
  rentalFee = 0,
  discountPercent = 0,
  discountAmount = 0,
  depositFee = 0,
  totalAmount = 0,
  isSubmitting = false,
  errorMessage = null,
  onSubmit,
}) => {
  const title = (device?.name || device?.title || 'TechShare Device').trim();
  const brand = (device?.brand || 'TECHSHARE').trim();
  const category = device?.category || '';
  const imageUrl =
    Array.isArray(device?.images) && device.images.length > 0 ? device.images[0] : null;

  return (
    <aside className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100 flex flex-col gap-3.5 sticky top-20">
      {/* Card Header Title */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
        <h3 className="text-sm font-extrabold text-slate-900">
          {STRINGS.PRICE_BREAKDOWN.TITLE}
        </h3>
        {rentalDays > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-600 font-bold border border-brand-200">
            <Clock className="w-3 h-3" />
            {STRINGS.BOOKING_CREATE.DAYS_HOURS_BADGE(
              rentalDurationInfo.days,
              rentalDurationInfo.hours,
              rentalDurationInfo.totalHours
            )}
          </span>
        )}
      </div>

      {/* Device Summary (Synchronized with App's Device Summary Card) */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
        <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
          {imageUrl ? (
            <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[10px] text-slate-400 font-medium">TechShare</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold text-brand-500 uppercase tracking-wider truncate">
              {brand}
            </span>
            {category && (
              <span className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded-md capitalize shrink-0">
                {category}
              </span>
            )}
          </div>
          <h4 className="text-sm font-bold text-slate-900 truncate my-0.5" title={title}>
            {title}
          </h4>
          <p className="text-sm font-extrabold text-brand-500">
            {formatPriceVnd(dailyRate)}{' '}
            <span className="text-xs font-medium text-slate-500">
              {STRINGS.BOOKING_CREATE.PER_DAY}
            </span>
          </p>
        </div>
      </div>

      {/* App Payment Breakdown Rows */}
      <div className="flex flex-col gap-2.5 text-xs">
        <div className="flex items-center justify-between text-slate-600">
          <span>
            {rentalDays > 0
              ? STRINGS.PRICE_BREAKDOWN.RENTAL_FEE(rentalDays)
              : STRINGS.booking.summary.baseRentalFee}
          </span>
          <span className="font-semibold text-slate-900">
            {rentalDays > 0 ? formatPriceVnd(rentalFee) : '---'}
          </span>
        </div>

        {discountPercent > 0 && discountAmount > 0 && (
          <div className="flex items-center justify-between text-emerald-600 bg-emerald-50/70 px-2.5 py-1.5 rounded-lg">
            <div className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-emerald-500" />
              <span className="font-semibold">
                {STRINGS.PRICE_BREAKDOWN.LONG_TERM_DISCOUNT(discountPercent)}
              </span>
            </div>
            <span className="font-bold">-{formatPriceVnd(discountAmount)}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-slate-600 pt-2 border-t border-slate-100">
          <span>{STRINGS.PRICE_BREAKDOWN.DEPOSIT_FEE}</span>
          <span className="font-semibold text-slate-900">
            {rentalDays > 0 ? formatPriceVnd(depositFee) : formatPriceVnd(depositFee)}
          </span>
        </div>
      </div>

      {/* Total Payment */}
      <div className="pt-2.5 border-t border-slate-200 flex items-baseline justify-between">
        <span className="text-sm text-slate-900 font-bold">
          {STRINGS.PRICE_BREAKDOWN.TOTAL_PAYMENT}
        </span>
        <div className="text-lg sm:text-xl font-extrabold text-brand-500 tracking-tight">
          {rentalDays > 0 ? formatPriceVnd(totalAmount) : '---'}
        </div>
      </div>

      {/* CTA Confirm Booking Button */}
      <button
        type="button"
        onClick={onSubmit}
        disabled={isSubmitting}
        className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-brand-500 hover:bg-brand-600 text-white shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{STRINGS.booking.summary.submittingBtn}</span>
          </>
        ) : (
          <>
            <span>{STRINGS.BOOKING_CREATE.SUBMIT_BTN}</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      {/* Direct Error Alert */}
      {errorMessage && (
        <div className="p-2.5 rounded-xl bg-red-50 text-red-600 text-xs flex items-center gap-2 border border-red-100">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      {/* Web Escrow Guarantee Badges */}
      <div className="pt-2.5 border-t border-slate-100 flex flex-col gap-1.5 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-500 shrink-0" />
          <span className="truncate">{STRINGS.booking.summary.guarantees.item1}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="truncate">{STRINGS.booking.summary.guarantees.item2}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="truncate">{STRINGS.booking.summary.guarantees.item3}</span>
        </div>
      </div>
    </aside>
  );
};

export default OrderSummaryCard;
