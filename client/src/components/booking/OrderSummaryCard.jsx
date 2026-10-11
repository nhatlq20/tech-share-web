import React from 'react';
import {
  ShieldCheck,
  HelpCircle,
  Star,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { STRINGS } from '../../constants/strings.js';
import { formatPrice } from '../../utils/formatters.js';

export const OrderSummaryCard = ({
  device,
  totalDays = 0,
  dailyRate = 0,
  rentalFee = 0,
  longRentalDiscount = 0,
  longRentalDiscountPercent = 0,
  voucherDiscount = 0,
  appliedVoucher = '',
  depositValue = 0,
  totalAmount = 0,
  isSubmitting = false,
  canSubmit = false,
  onSubmit,
}) => {
  const title = (device?.title || device?.name || 'TechShare Device').trim();
  const brand = (device?.brand || '').trim();
  const imageUrl = Array.isArray(device?.images) && device.images.length > 0 ? device.images[0] : null;
  const rating = (device?.rating ?? device?.ratingAvg ?? 5.0).toFixed(1);

  return (
    <aside className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col gap-5 sticky top-24">
      {/* Card Header Title */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <h3 className="text-base font-bold text-slate-800">
          {STRINGS.booking.summary.title}
        </h3>
        <span className="text-xs px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 font-semibold">
          TechShare Escrow
        </span>
      </div>

      {/* Device Snippet */}
      <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100">
        <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-[10px] text-slate-400 font-medium">TechShare</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {brand && (
            <span className="text-[11px] font-semibold text-brand-600 uppercase tracking-wide">
              {brand}
            </span>
          )}
          <h4 className="text-sm font-bold text-slate-800 truncate" title={title}>
            {title}
          </h4>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="font-semibold text-slate-700">{rating}</span>
            <span>•</span>
            <span className="text-slate-500">{formatPrice(dailyRate)} / day</span>
          </div>
        </div>
      </div>

      {/* Pricing Breakdown */}
      <div className="flex flex-col gap-3 text-xs">
        {/* Daily Rate */}
        <div className="flex items-center justify-between text-slate-600">
          <span>{STRINGS.booking.summary.dailyRateLabel}</span>
          <span className="font-semibold text-slate-800">{formatPrice(dailyRate)}</span>
        </div>

        {/* Rental Duration */}
        <div className="flex items-center justify-between text-slate-600">
          <span>{STRINGS.booking.summary.durationLabel}</span>
          <span className="font-semibold text-slate-800">
            {totalDays > 0 ? `${totalDays} ${totalDays === 1 ? 'day' : 'days'}` : '—'}
          </span>
        </div>

        {/* Base Rental Fee */}
        <div className="flex items-center justify-between text-slate-600">
          <span>{STRINGS.booking.summary.baseRentalFee}</span>
          <span className="font-semibold text-slate-800">{formatPrice(rentalFee)}</span>
        </div>

        {/* Long Rental Discount Tier */}
        {longRentalDiscount > 0 && (
          <div className="flex items-center justify-between text-emerald-600 bg-emerald-50/60 p-2 rounded-lg">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              <span>
                {longRentalDiscountPercent >= 20
                  ? STRINGS.booking.summary.longDiscountBadge7
                  : STRINGS.booking.summary.longDiscountBadge3}
              </span>
            </div>
            <span className="font-bold">-{formatPrice(longRentalDiscount)}</span>
          </div>
        )}

        {/* Voucher Discount */}
        {voucherDiscount > 0 && (
          <div className="flex items-center justify-between text-emerald-600 bg-emerald-50/60 p-2 rounded-lg">
            <span>
              {STRINGS.booking.summary.voucherDiscount} (<code>{appliedVoucher}</code>)
            </span>
            <span className="font-bold">-{formatPrice(voucherDiscount)}</span>
          </div>
        )}

        {/* Deposit Value */}
        <div className="flex items-center justify-between text-slate-600 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1">
            <span>{STRINGS.booking.summary.depositLabel}</span>
            <span
              className="cursor-pointer text-slate-400 hover:text-slate-600"
              title={STRINGS.booking.summary.depositTooltip}
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </span>
          </div>
          <span className="font-semibold text-slate-800">{formatPrice(depositValue)}</span>
        </div>

        <p className="text-[11px] text-slate-400 italic">
          {STRINGS.booking.summary.depositTooltip}
        </p>
      </div>

      {/* Total Amount */}
      <div className="pt-4 border-t border-slate-100 flex items-baseline justify-between">
        <div>
          <span className="text-xs text-slate-500 font-medium block">
            {STRINGS.booking.summary.totalAmountLabel}
          </span>
          <span className="text-[10px] text-slate-400">
            (Includes rental fee + security deposit)
          </span>
        </div>
        <div className="text-xl font-extrabold text-slate-900 tracking-tight">
          {formatPrice(totalAmount)}
        </div>
      </div>

      {/* CTA Submit Button */}
      <button
        type="button"
        onClick={onSubmit}
        disabled={isSubmitting}
        className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-brand-500 hover:bg-brand-600 text-white shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{STRINGS.booking.summary.submittingBtn}</span>
          </>
        ) : (
          <>
            <span>{STRINGS.booking.summary.submitBtn}</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      {/* Escrow Guarantee Badges */}
      <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-brand-500 flex-shrink-0" />
          <span>{STRINGS.booking.summary.guarantees.item1}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span>{STRINGS.booking.summary.guarantees.item2}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span>{STRINGS.booking.summary.guarantees.item3}</span>
        </div>
      </div>
    </aside>
  );
};

export default OrderSummaryCard;
