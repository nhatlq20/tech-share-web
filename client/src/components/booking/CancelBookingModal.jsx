import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { STRINGS } from '../../constants/strings.js';
import { MAGIC_NUMBERS } from '../../constants/config.js';

/**
 * CancelBookingModal – Synchronized with App's BookingCancelModal.tsx
 * Supports both `isOpen` and `visible` props for compatibility across MyBookingsPage and BookingDetailPage.
 */
export const CancelBookingModal = ({
  isOpen,
  visible,
  bookingCode,
  isSubmitting = false,
  errorMessage = '',
  onClose,
  onConfirm,
}) => {
  const open = Boolean(isOpen ?? visible);
  const [cancelReason, setCancelReason] = useState('');
  const maxLen = MAGIC_NUMBERS.BOOKING.CANCEL_REASON_MAX_LENGTH;
  const presetReasons = STRINGS.BOOKING_DETAIL.CANCEL_REASONS;

  useEffect(() => {
    if (open) {
      setCancelReason('');
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;
    onConfirm(cancelReason.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-5"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-1.5">
          <h2 className="text-lg font-extrabold text-slate-900">
            {STRINGS.BOOKING_DETAIL.CANCEL_MODAL_TITLE}
          </h2>
          {bookingCode && (
            <span className="text-xs font-bold text-brand-500 bg-brand-50 px-2.5 py-0.5 rounded-md">
              #{bookingCode}
            </span>
          )}
        </div>

        <p className="text-[13px] text-slate-500 mb-3.5">
          {STRINGS.BOOKING_DETAIL.CANCEL_MODAL_SUB}
        </p>

        {/* Preset Reasons (App style radio cards) */}
        <div className="space-y-2 mb-3">
          {presetReasons.map((reason) => {
            const isSelected = cancelReason === reason;
            return (
              <button
                key={reason}
                type="button"
                disabled={isSubmitting}
                onClick={() => setCancelReason(reason)}
                className={`w-full text-left flex items-center p-3 rounded-xl border transition-all ${
                  isSelected
                    ? 'border-brand-500 bg-brand-50/50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-2.5 shrink-0 ${
                    isSelected ? 'border-brand-500' : 'border-slate-300'
                  }`}
                >
                  {isSelected && (
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-500" />
                  )}
                </div>
                <span className="text-[13px] text-slate-900 font-medium flex-1">
                  {reason}
                </span>
              </button>
            );
          })}
        </div>

        {/* Custom Reason Input */}
        <textarea
          rows={2}
          maxLength={maxLen}
          disabled={isSubmitting}
          placeholder={STRINGS.BOOKING_DETAIL.CANCEL_PLACEHOLDER}
          value={presetReasons.includes(cancelReason) ? '' : cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-[13px] text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-brand-500 focus:outline-hidden resize-none mb-4"
        />

        {errorMessage && (
          <div className="mb-3 rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs font-medium text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {STRINGS.BOOKING_DETAIL.CANCEL_BACK_BTN}
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              STRINGS.BOOKING_DETAIL.CANCEL_CONFIRM_BTN
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelBookingModal;
