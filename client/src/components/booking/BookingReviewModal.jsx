import React, { useState, useEffect } from 'react';
import { Star, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { reviewService } from '../../services/reviewService.js';
import { STRINGS } from '../../constants/strings.js';

/**
 * BookingReviewModal – Synchronized with App's ReviewModal.tsx
 * Supports both `isOpen` and `visible` props.
 */
export const BookingReviewModal = ({
  isOpen,
  visible,
  booking,
  mode = 'renter_to_owner',
  onClose,
  onSuccess,
  onReviewSaved,
}) => {
  const open = Boolean(isOpen ?? visible);
  const isOwnerReviewingRenter = mode === 'owner_to_renter';
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      setRating(5);
      setComment('');
      setSelectedTags([]);
      setErrorMsg('');
      setShowSuccess(false);
    }
  }, [open, booking?._id]);

  if (!open || !booking) return null;

  const device =
    (typeof booking.deviceId === 'object' && booking.deviceId) ||
    (typeof booking.device === 'object' && booking.device) ||
    {};

  const deviceId =
    device._id ||
    device.id ||
    (typeof booking.deviceId === 'string' ? booking.deviceId : '') ||
    (typeof booking.device === 'string' ? booking.device : '');

  const deviceName =
    booking.deviceName || device.name || device.title || STRINGS.REVIEW_MODAL.DEFAULT_DEVICE_NAME;
  const deviceImage =
    booking.deviceImage ||
    device.images?.[0] ||
    'https://placehold.co/100x100/e2e8f0/64748b?text=Device';

  const renter =
    (typeof booking.renter === 'object' && booking.renter) ||
    (typeof booking.renterId === 'object' && booking.renterId) ||
    {};
  const renterName =
    renter.name || booking.renterName || STRINGS.REVIEW_MODAL.DEFAULT_RENTER_NAME;
  const renterAvatar =
    renter.avatar ||
    renter.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(renterName)}&background=0F766E&color=ffffff`;

  const availableTags = isOwnerReviewingRenter
    ? STRINGS.REVIEW_MODAL.RENTER_TAGS
    : STRINGS.REVIEW_MODAL.TAGS;

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const getRatingLabel = (stars) => {
    if (stars === 5) return STRINGS.REVIEW_MODAL.STAR_5;
    if (stars === 4) return STRINGS.REVIEW_MODAL.STAR_4;
    if (stars === 3) return STRINGS.REVIEW_MODAL.STAR_3;
    if (stars === 2) return STRINGS.REVIEW_MODAL.STAR_2;
    return STRINGS.REVIEW_MODAL.STAR_1;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const finalComment = [...selectedTags, comment.trim()].filter(Boolean).join('. ');
    if (!finalComment) {
      setErrorMsg(STRINGS.REVIEW_MODAL.ERR_EMPTY_COMMENT);
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      const response = await reviewService.createReview(deviceId, {
        bookingId: booking._id || booking.id,
        rating,
        comment: finalComment,
        ...(isOwnerReviewingRenter ? { targetType: 'renter' } : {}),
      });
      const createdReview = response?.review || response?.data || {
        rating,
        comment: finalComment,
        targetType: isOwnerReviewingRenter ? 'renter' : 'device',
        createdAt: new Date().toISOString(),
      };
      setShowSuccess(true);
      setTimeout(() => {
        onSuccess?.(createdReview);
        if (isOwnerReviewingRenter) {
          onReviewSaved?.({
            ...booking,
            isRenterReviewed: true,
            renterReview: createdReview,
          });
        } else {
          onReviewSaved?.({
            ...booking,
            isReviewed: true,
            review: createdReview,
          });
        }
        onClose?.();
      }, 900);
    } catch (err) {
      setErrorMsg(err?.message || STRINGS.REVIEW_MODAL.ERR_SUBMIT_FAILED);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-extrabold text-slate-900">
            {isOwnerReviewingRenter
              ? STRINGS.REVIEW_MODAL.RENTER_HEADER_TITLE
              : STRINGS.REVIEW_MODAL.HEADER_TITLE}
          </h3>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Info Row (Renter or Device) */}
        <div className="flex items-center bg-slate-50 p-3 rounded-xl mb-5 border border-slate-100">
          <img
            src={isOwnerReviewingRenter ? renterAvatar : deviceImage}
            alt={isOwnerReviewingRenter ? renterName : deviceName}
            className={`w-12 h-12 object-cover bg-slate-200 shrink-0 ${
              isOwnerReviewingRenter ? 'rounded-full border border-slate-200' : 'rounded-lg'
            }`}
          />
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">
              {isOwnerReviewingRenter ? renterName : deviceName}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {isOwnerReviewingRenter ? `${deviceName} • ` : ''}#
              {booking.bookingCode || String(booking._id || booking.id).slice(-6).toUpperCase()}
            </p>
          </div>
        </div>

        {showSuccess ? (
          <div className="py-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-lg font-extrabold text-slate-900 mb-1">
              {STRINGS.REVIEW_MODAL.SUCCESS_TITLE}
            </h4>
            <p className="text-sm text-slate-500">
              {isOwnerReviewingRenter
                ? STRINGS.REVIEW_MODAL.RENTER_SUCCESS_MSG
                : STRINGS.REVIEW_MODAL.SUCCESS_MSG}
            </p>
          </div>
        ) : (
          <>
            {/* Star Selector */}
            <p className="text-sm font-semibold text-slate-900 text-center mb-3">
              {isOwnerReviewingRenter
                ? STRINGS.REVIEW_MODAL.RENTER_RATING_TITLE
                : STRINGS.REVIEW_MODAL.RATING_TITLE}
            </p>
            <div className="flex items-center justify-center gap-2.5 mb-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const isActive = star <= rating;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 transition-transform hover:scale-110 focus:outline-hidden"
                  >
                    <Star
                      className={`w-9 h-9 ${
                        isActive
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <p className="text-[13px] font-bold text-brand-500 text-center mb-4">
              {getRatingLabel(rating)}
            </p>

            {/* Quick Review Tags */}
            <p className="text-[13px] font-bold text-slate-900 mb-2">
              {STRINGS.REVIEW_MODAL.QUICK_TAGS_LABEL}
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {availableTags.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      active
                        ? 'bg-brand-50 border-brand-500 text-brand-500 font-semibold'
                        : 'bg-slate-100 border-slate-200 text-slate-600 hover:border-brand-300'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>

            {/* Detailed Review Textarea */}
            <label className="block text-[13px] font-bold text-slate-900 mb-2">
              {STRINGS.REVIEW_MODAL.COMMENT_LABEL}
            </label>
            <textarea
              rows={4}
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder={
                isOwnerReviewingRenter
                  ? STRINGS.REVIEW_MODAL.RENTER_COMMENT_PLACEHOLDER
                  : STRINGS.REVIEW_MODAL.COMMENT_PLACEHOLDER
              }
              className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-900 bg-slate-50 placeholder:text-slate-400 focus:bg-white focus:border-brand-500 focus:outline-hidden resize-none mb-4"
            />

            {errorMsg && (
              <div className="mb-3 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs font-medium text-red-600">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="w-full py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-bold text-[15px] flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                STRINGS.REVIEW_MODAL.SUBMIT_BTN
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export const BookingReviewSection = ({
  booking,
  mode = 'renter_to_owner',
  onOpenReviewModal,
}) => {
  if (!booking || booking.status !== 'completed') return null;

  const isOwnerReviewingRenter = mode === 'owner_to_renter';
  const isReviewed = isOwnerReviewingRenter
    ? Boolean(booking.isRenterReviewed || booking.renterReview)
    : Boolean(booking.isReviewed || booking.review);
  const reviewData = isOwnerReviewingRenter ? booking.renterReview : booking.review;

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isReviewed
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-amber-50 text-amber-500'
            }`}
          >
            {isReviewed ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <Star className="w-5 h-5 fill-amber-400" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {isReviewed
                ? isOwnerReviewingRenter
                  ? STRINGS.REVIEW_MODAL.RENTER_REVIEWED_BADGE
                  : STRINGS.BOOKING_ITEM_CARD.RATED_BTN
                : isOwnerReviewingRenter
                ? STRINGS.REVIEW_MODAL.RENTER_HEADER_TITLE
                : STRINGS.REVIEW_MODAL.HEADER_TITLE}
            </h3>
            <p className="text-xs text-slate-500">
              {isReviewed && reviewData?.comment
                ? reviewData.comment
                : isOwnerReviewingRenter
                ? STRINGS.REVIEW_MODAL.RENTER_RATING_TITLE
                : STRINGS.REVIEW_MODAL.RATING_TITLE}
            </p>
          </div>
        </div>

        {isReviewed ? (
          <div className="flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  star <= (reviewData?.rating || 5)
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-slate-300'
                }`}
              />
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenReviewModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors shadow-2xs"
          >
            <Star className="w-4 h-4 fill-white" />
            <span>
              {isOwnerReviewingRenter
                ? STRINGS.REVIEW_MODAL.REVIEW_RENTER_BTN
                : STRINGS.BOOKING_ITEM_CARD.RATE_BTN}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

export default BookingReviewModal;
