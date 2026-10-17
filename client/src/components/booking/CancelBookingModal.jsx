import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, AlertCircle, Loader2, X } from 'lucide-react';
import { STRINGS } from '../../constants/strings.js';
import { MAGIC_NUMBERS } from '../../constants/config.js';

const T = STRINGS.booking.cancel;
const MAX_REASON = MAGIC_NUMBERS.BOOKING.CANCEL_REASON_MAX_LENGTH;

/**
 * Confirmation dialog for cancelling a pending booking.
 * Keeps itself open on failure so the renter can see the error and retry.
 */
export const CancelBookingModal = ({ isOpen, bookingCode, isSubmitting, errorMessage, onConfirm, onClose }) => {
  const [reason, setReason] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    setReason('');
    textareaRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!isSubmitting) onConfirm(reason);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={() => !isSubmitting && onClose()}
      role="presentation"
    >
      <form
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-booking-title"
        className="relative bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition disabled:opacity-50"
          aria-label={STRINGS.common.close}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 border border-red-100 flex items-center justify-center mb-4 shadow-xs">
          <AlertTriangle className="w-6 h-6" aria-hidden="true" />
        </div>

        <h2 id="cancel-booking-title" className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
          {T.modalTitle}
        </h2>
        {bookingCode && (
          <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 mt-2">
            #{bookingCode}
          </span>
        )}
        <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">{T.modalDesc}</p>

        <label htmlFor="cancel-booking-reason" className="block text-xs font-bold text-slate-700 mt-5 mb-2">
          {T.reasonLabel}
        </label>
        <textarea
          id="cancel-booking-reason"
          ref={textareaRef}
          rows={3}
          value={reason}
          maxLength={MAX_REASON}
          onChange={(event) => setReason(event.target.value)}
          placeholder={T.reasonPlaceholder}
          disabled={isSubmitting}
          className="w-full px-3.5 py-2.5 text-xs rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition resize-none disabled:opacity-60 placeholder:text-slate-400"
        />
        <p className="text-right text-xs text-slate-400 mt-1">{T.reasonCounter(reason.length, MAX_REASON)}</p>

        {errorMessage && (
          <div className="mt-3 p-3 rounded-2xl bg-red-50 text-red-600 text-xs flex items-start gap-2 border border-red-200" role="alert">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6">
          <button
            type="button"
            id="cancel-booking-keep-btn"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-3 px-4 rounded-full bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition disabled:opacity-50"
          >
            {T.keepBtn}
          </button>
          <button
            type="submit"
            id="cancel-booking-confirm-btn"
            disabled={isSubmitting}
            className="flex-1 py-3 px-4 rounded-full bg-red-500 text-white font-bold text-xs hover:bg-red-600 shadow-md shadow-red-500/20 transition disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            {isSubmitting ? T.submitting : T.confirmBtn}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CancelBookingModal;
