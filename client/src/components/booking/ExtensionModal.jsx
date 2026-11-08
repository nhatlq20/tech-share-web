import React, { useState, useMemo, useEffect } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { STRINGS } from '../../constants/strings.js';
import { requestBookingExtension } from '../../services/bookingService.js';

const DAY_OPTIONS = [1, 2, 3, 5, 7];

/**
 * ExtensionModal – Synchronized with App's ExtensionModal.tsx
 * Supports both `isOpen` and `visible` props, and supports both `onSubmit` (MyBookingsPage) and `onSuccess` (BookingDetailPage).
 */
export const ExtensionModal = ({
  isOpen,
  visible,
  booking,
  onClose,
  onSubmit,
  onSuccess,
  isSubmitting: externalSubmitting = false,
  error: externalError = '',
}) => {
  const open = Boolean(isOpen ?? visible);
  const [selectedDays, setSelectedDays] = useState(1);
  const [customDaysInput, setCustomDaysInput] = useState('');
  const [note, setNote] = useState('');
  const [internalSubmitting, setInternalSubmitting] = useState(false);
  const [internalError, setInternalError] = useState('');

  const isSubmitting = externalSubmitting || internalSubmitting;
  const error = externalError || internalError;

  useEffect(() => {
    if (open) {
      setSelectedDays(1);
      setCustomDaysInput('');
      setNote('');
      setInternalError('');
    }
  }, [open]);

  const effectiveDays = useMemo(() => {
    const parsed = parseInt(customDaysInput, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return Math.min(parsed, 30);
    }
    return selectedDays;
  }, [customDaysInput, selectedDays]);

  const dailyRate = useMemo(() => {
    if (!booking) return 0;
    const device = booking.device || booking.deviceId || {};
    return Number(
      booking.pricePerDayAtBooking ||
        booking.dailyRate ||
        device.dailyRate ||
        device.pricePerDay ||
        0
    );
  }, [booking]);

  const additionalFee = dailyRate * effectiveDays;

  const newEndDate = useMemo(() => {
    if (!booking?.endDate) return new Date();
    const d = new Date(booking.endDate);
    d.setDate(d.getDate() + effectiveDays);
    return d;
  }, [booking?.endDate, effectiveDays]);

  if (!open || !booking) return null;

  const handleSelectPreset = (d) => {
    setSelectedDays(d);
    setCustomDaysInput('');
  };

  const handleChangeCustomDays = (text) => {
    const numeric = text.replace(/[^0-9]/g, '');
    setCustomDaysInput(numeric);
    const parsed = parseInt(numeric, 10);
    if (!Number.isNaN(parsed) && DAY_OPTIONS.includes(parsed)) {
      setSelectedDays(parsed);
    }
  };

  const handleConfirm = async (e) => {
    if (e) e.preventDefault();
    if (isSubmitting || effectiveDays < 1) return;

    if (onSubmit) {
      await onSubmit({
        days: effectiveDays,
        additionalDays: effectiveDays,
        note: note.trim(),
      });
      return;
    }

    setInternalSubmitting(true);
    setInternalError('');
    try {
      const updated = await requestBookingExtension(booking._id || booking.bookingCode, {
        days: effectiveDays,
        additionalDays: effectiveDays,
        note: note.trim(),
      });
      onSuccess?.(updated);
      onClose?.();
    } catch (err) {
      setInternalError(err?.message || STRINGS.MY_BOOKINGS.ALERT_EXTEND_FAILED);
    } finally {
      setInternalSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-extrabold text-slate-900">
            {STRINGS.EXTENSION_MODAL.TITLE}
          </h2>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Return Date Box */}
        <div className="flex items-center justify-between bg-slate-100 p-3 rounded-xl mb-4">
          <span className="text-[13px] text-slate-500">
            {STRINGS.EXTENSION_MODAL.CURRENT_END_LABEL}
          </span>
          <span className="text-sm font-bold text-slate-900">
            {new Date(booking.endDate).toLocaleDateString('en-US')}
          </span>
        </div>

        {/* Select Additional Days */}
        <p className="text-sm font-bold text-slate-900 mb-2.5">
          {STRINGS.EXTENSION_MODAL.SELECT_DAYS_LABEL}
        </p>
        <div className="flex items-center justify-between gap-2 mb-3">
          {DAY_OPTIONS.map((d) => {
            const isActive = customDaysInput === '' && selectedDays === d;
            return (
              <button
                key={d}
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSelectPreset(d)}
                className={`flex-1 py-2.5 rounded-xl border text-xs transition-colors ${
                  isActive
                    ? 'bg-brand-500 border-brand-500 text-white font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-900 font-semibold hover:border-brand-300'
                }`}
              >
                +{d} {d > 1 ? STRINGS.COMMON.DAYS : STRINGS.COMMON.DAY}
              </button>
            );
          })}
        </div>

        {/* Custom Days Input */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <span className="text-[13px] font-semibold text-slate-500 flex-1">
            {STRINGS.EXTENSION_MODAL.CUSTOM_DAYS_LABEL}
          </span>
          <input
            type="text"
            inputMode="numeric"
            maxLength={2}
            disabled={isSubmitting}
            value={customDaysInput}
            onChange={(e) => handleChangeCustomDays(e.target.value)}
            placeholder={STRINGS.EXTENSION_MODAL.CUSTOM_DAYS_PLACEHOLDER}
            className="w-36 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 text-center placeholder:font-normal placeholder:text-slate-400 focus:bg-white focus:border-brand-500 focus:outline-hidden"
          />
        </div>

        {/* Summary Box */}
        <div className="bg-brand-50 rounded-xl p-3.5 border border-brand-200 mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-slate-600">
              {STRINGS.EXTENSION_MODAL.NEW_END_LABEL}
            </span>
            <span className="text-sm font-bold text-emerald-600">
              {newEndDate.toLocaleDateString('en-US')}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-slate-600">
              {STRINGS.EXTENSION_MODAL.EXTRA_FEE_LABEL}
            </span>
            <span className="text-base font-extrabold text-brand-500">
              {additionalFee.toLocaleString('en-US')} {STRINGS.COMMON.VND}
            </span>
          </div>
        </div>

        {/* Note Input */}
        <label className="block text-sm font-bold text-slate-900 mb-2">
          {STRINGS.EXTENSION_MODAL.NOTE_LABEL}
        </label>
        <textarea
          rows={2}
          disabled={isSubmitting}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={STRINGS.EXTENSION_MODAL.NOTE_PLACEHOLDER}
          className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-900 bg-slate-50 placeholder:text-slate-400 focus:bg-white focus:border-brand-500 focus:outline-hidden resize-none mb-4"
        />

        {error && (
          <div className="mb-3 flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-medium text-red-700">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleConfirm}
          className="w-full py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-bold text-[15px] flex items-center justify-center gap-2 transition-colors shadow-sm"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            STRINGS.EXTENSION_MODAL.SUBMIT_BTN
          )}
        </button>
      </div>
    </div>
  );
};

export default ExtensionModal;
