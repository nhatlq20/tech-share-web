import React, { useState, useEffect, useRef } from 'react';
import {
  CalendarPlus,
  AlertCircle,
  Loader2,
  X,
  Plus,
  Minus,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { STRINGS } from '../../constants/strings.js';
import { requestBookingExtension } from '../../services/bookingService.js';
import { formatPrice, formatDateTime } from '../../utils/formatters.js';

const T = STRINGS.booking.extension;

const PRESET_DAYS = [1, 2, 3, 5, 7];
const MIN_DAYS = 1;
const MAX_DAYS = 30;

/**
 * Modal for requesting a rental extension on active/approved bookings.
 * Renders calculated daily rates, updated return timestamp preview,
 * preset chips, stepper controller, and note submission directly synchronized
 * with MongoDB Atlas.
 */
export const ExtensionModal = ({
  isOpen,
  booking,
  onClose,
  onSuccess,
}) => {
  const [days, setDays] = useState(1);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const noteRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    setDays(1);
    setNote('');
    setErrorMessage(null);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !booking) return null;

  const currentEnd = booking.endDate ? new Date(booking.endDate) : new Date();
  const requestedEnd = new Date(currentEnd.getTime() + days * 24 * 60 * 60 * 1000);

  const dailyRate =
    booking.pricePerDayAtBooking ||
    booking.dailyRate ||
    booking.device?.dailyRate ||
    booking.device?.pricePerDay ||
    0;

  const additionalFee = dailyRate * days;

  const handleStep = (delta) => {
    setDays((prev) => Math.min(MAX_DAYS, Math.max(MIN_DAYS, prev + delta)));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const targetId = booking._id || booking.bookingCode;
      const updatedBooking = await requestBookingExtension(targetId, {
        days,
        note,
      });

      if (updatedBooking) {
        if (onSuccess) {
          onSuccess(updatedBooking);
        }
        onClose();
      }
    } catch (err) {
      setErrorMessage(
        err?.response?.data?.message ||
        err?.message ||
        T.conflictError ||
        'Failed to submit extension request. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={() => !isSubmitting && onClose()}
      role="presentation"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="extension-modal-title"
        className="relative bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 overflow-hidden"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition disabled:opacity-50"
          aria-label={STRINGS.common.close}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100/80 shadow-sm flex-shrink-0">
            <CalendarPlus className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h2 id="extension-modal-title" className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              {T.modalTitle}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
              {T.modalSubtitle}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Timeline & Date Preview Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">{T.currentPeriod}</span>
              <span className="font-semibold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                {formatDateTime(booking.endDate)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/60">
              <span className="text-brand-800 font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                {T.newPeriod}
              </span>
              <span className="font-bold text-brand-800 bg-brand-50 px-3 py-1 rounded-lg border border-brand-200">
                {formatDateTime(requestedEnd)}
              </span>
            </div>
          </div>

          {/* Additional Days Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="extension-days-stepper" className="text-xs font-bold text-slate-700">
                {T.additionalDaysLabel}
              </label>
              <span className="text-xs font-semibold text-slate-500">
                {days} {days === 1 ? 'day' : 'days'}
              </span>
            </div>

            {/* Quick preset chips */}
            <div className="flex items-center gap-2 mb-3">
              {PRESET_DAYS.map((preset) => {
                const isSelected = days === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setDays(preset)}
                    className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold border transition ${
                      isSelected
                        ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    +{preset}d
                  </button>
                );
              })}
            </div>

            {/* Custom Stepper */}
            <div className="flex items-center justify-between p-2 rounded-2xl bg-slate-50 border border-slate-200">
              <button
                type="button"
                onClick={() => handleStep(-1)}
                disabled={days <= MIN_DAYS || isSubmitting}
                className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-brand-600 disabled:opacity-40 disabled:hover:bg-white flex items-center justify-center transition shadow-xs"
                aria-label="Decrease days"
              >
                <Minus className="w-4 h-4" />
              </button>

              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900 tracking-tight">{days}</span>
                <span className="text-xs font-bold text-slate-400">/ 30 days max</span>
              </div>

              <button
                type="button"
                onClick={() => handleStep(1)}
                disabled={days >= MAX_DAYS || isSubmitting}
                className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-brand-600 disabled:opacity-40 disabled:hover:bg-white flex items-center justify-center transition shadow-xs"
                aria-label="Increase days"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="p-4 rounded-2xl bg-brand-50/50 border border-brand-100 text-xs flex flex-col gap-2">
            <div className="flex justify-between items-center text-slate-600">
              <span>{T.dailyRateLabel}</span>
              <span className="font-semibold text-slate-800">{formatPrice(dailyRate)} / day</span>
            </div>

            <div className="flex justify-between items-center text-slate-600">
              <span>{T.subtotalLabel} ({days} {days === 1 ? 'day' : 'days'})</span>
              <span className="font-bold text-slate-900">{formatPrice(additionalFee)}</span>
            </div>

            <div className="pt-2 border-t border-brand-100 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-900">{T.totalPayable}</span>
              <span className="text-lg font-black text-brand-800">{formatPrice(additionalFee)}</span>
            </div>

            <div className="mt-1 pt-2 border-t border-brand-100/60 flex items-start gap-1.5 text-[11px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>{T.depositNote}</span>
            </div>
          </div>

          {/* Note for Owner */}
          <div>
            <label htmlFor="extension-note" className="block text-xs font-semibold text-slate-700 mb-1.5">
              {T.reasonLabel}
            </label>
            <textarea
              id="extension-note"
              ref={noteRef}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={T.reasonPlaceholder}
              disabled={isSubmitting}
              maxLength={300}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition resize-none disabled:opacity-60"
            />
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 text-red-600 text-xs flex items-start gap-2 border border-red-200" role="alert">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 rounded-full bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 transition disabled:opacity-50"
            >
              {T.cancelBtn}
            </button>
            <button
              type="submit"
              id="extension-submit-btn"
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 rounded-full bg-brand-500 text-white font-bold text-xs hover:bg-brand-600 shadow-md shadow-brand-500/20 transition disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              {isSubmitting ? T.submittingBtn : T.submitBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExtensionModal;
