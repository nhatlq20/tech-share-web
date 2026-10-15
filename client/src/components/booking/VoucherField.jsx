import React, { useState } from 'react';
import { Tag, Check, X, Sparkles, AlertCircle } from 'lucide-react';
import { STRINGS } from '../../constants/strings.js';

export const VoucherField = ({
  appliedVoucher = '',
  onApply,
  onRemove,
  feedbackError = '',
  feedbackSuccess = '',
  disabled = false,
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleApply = (codeToApply) => {
    const code = (codeToApply || inputValue).trim().toUpperCase();
    if (!code) return;
    onApply(code);
    setInputValue('');
  };

  const handleQuickClick = (code) => {
    handleApply(code);
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <div className="flex items-center gap-2 mb-3">
        <Tag className="w-4 h-4 text-brand-500" />
        <h3 className="text-sm font-bold text-slate-800">
          {STRINGS.booking.voucher.title}
        </h3>
      </div>

      {/* Input or Applied Pill */}
      {appliedVoucher ? (
        <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-100">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-800">
              {STRINGS.booking.voucher.appliedText}: <code>{appliedVoucher}</code>
            </span>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="p-1 rounded-full text-emerald-700 hover:text-red-600 hover:bg-emerald-100 transition"
            title={STRINGS.booking.voucher.removeBtn}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.toUpperCase())}
            placeholder={STRINGS.booking.voucher.placeholder}
            disabled={disabled}
            className="flex-1 px-3.5 py-2 text-xs uppercase font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
          />
          <button
            type="button"
            onClick={() => handleApply()}
            disabled={!inputValue.trim() || disabled}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
          >
            {STRINGS.booking.voucher.applyBtn}
          </button>
        </div>
      )}

      {/* Success / Error Message */}
      {feedbackSuccess && (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
          <Check className="w-3.5 h-3.5" />
          <span>{feedbackSuccess}</span>
        </div>
      )}
      {feedbackError && (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-red-500 font-medium">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{feedbackError}</span>
        </div>
      )}

      {/* Quick Suggestions */}
      {!appliedVoucher && (
        <div className="mt-3.5 pt-3 border-t border-slate-100">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1 mb-2">
            <Sparkles className="w-3 h-3 text-brand-500" />
            {STRINGS.booking.voucher.suggestionTitle}
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleQuickClick(STRINGS.booking.voucher.codes.welcome50)}
              className="group text-left px-3 py-1.5 rounded-lg border border-slate-200 hover:border-brand-300 hover:bg-brand-50 transition"
            >
              <div className="text-xs font-bold text-slate-700 group-hover:text-brand-700">
                {STRINGS.booking.voucher.codes.welcome50}
              </div>
              <div className="text-[10px] text-slate-400">
                {STRINGS.booking.voucher.codes.welcome50Desc}
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickClick(STRINGS.booking.voucher.codes.weekend10)}
              className="group text-left px-3 py-1.5 rounded-lg border border-slate-200 hover:border-brand-300 hover:bg-brand-50 transition"
            >
              <div className="text-xs font-bold text-slate-700 group-hover:text-brand-700">
                {STRINGS.booking.voucher.codes.weekend10}
              </div>
              <div className="text-[10px] text-slate-400">
                {STRINGS.booking.voucher.codes.weekend10Desc}
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoucherField;
