import React, { useEffect, useState } from 'react';
import {
  Star,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MessageSquare,
  Sparkles,
  Trash2,
  Edit3,
  Package,
} from 'lucide-react';
import { reviewService } from '../../services/reviewService.js';
import { formatDateTime } from '../../utils/formatters.js';

const REVIEW_MAX_LENGTH = 2000;

const RATING_LABELS = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent',
};

const QUICK_REVIEW_TAGS = [
  'Great device condition',
  'Fast & smooth handover',
  'Helpful & responsive owner',
  'Works exactly as described',
  'Great value for money',
];

/**
 * Interactive Modal for creating, editing, or deleting a review on a completed booking.
 */
export const BookingReviewModal = ({
  isOpen,
  booking,
  onClose,
  onReviewSaved,
}) => {
  const existingReview = booking?.review || null;
  const isEditing = Boolean(existingReview?._id);

  const [rating, setRating] = useState(existingReview?.rating || 5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen && booking) {
      const rev = booking.review || null;
      setRating(rev?.rating || 5);
      setHoverRating(0);
      setComment(rev?.comment || '');
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, booking]);

  if (!isOpen || !booking) return null;

  const device = booking.device || booking.deviceId || {};
  const deviceId = device._id || booking.deviceId || booking.device;
  const deviceTitle = device.title || device.name || 'Rented Device';
  const deviceImage = Array.isArray(device.images) && device.images.length > 0 ? device.images[0] : '';
  const activeRating = hoverRating || rating;

  const handleQuickTagClick = (tag) => {
    setErrorMsg('');
    setComment((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return `${tag}. `;
      if (trimmed.toLowerCase().includes(tag.toLowerCase())) return prev;
      const separator = trimmed.endsWith('.') || trimmed.endsWith('!') ? ' ' : '. ';
      const next = `${trimmed}${separator}${tag}.`;
      return next.slice(0, REVIEW_MAX_LENGTH);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!deviceId) {
      setErrorMsg('Unable to identify the device for this booking.');
      return;
    }
    if (!rating || rating < 1 || rating > 5) {
      setErrorMsg('Please select a star rating from 1 to 5.');
      return;
    }
    if (!comment.trim()) {
      setErrorMsg('Please write a short review about your rental experience.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');
      setSuccessMsg('');

      let savedReview = null;
      if (isEditing) {
        const res = await reviewService.updateReview(deviceId, existingReview._id, {
          rating,
          comment: comment.trim(),
        });
        savedReview = res.review;
      } else {
        const res = await reviewService.createReview(deviceId, {
          bookingId: booking._id,
          rating,
          comment: comment.trim(),
        });
        savedReview = res.review;
      }

      const updatedBooking = {
        ...booking,
        review: savedReview,
        isReviewed: true,
        canReview: false,
      };

      setSuccessMsg(isEditing ? 'Your review has been updated!' : 'Thank you! Your review has been submitted.');
      if (typeof onReviewSaved === 'function') {
        onReviewSaved(updatedBooking);
      }
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setErrorMsg(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to submit review. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditing || !deviceId || !existingReview?._id) return;
    try {
      setDeleting(true);
      setErrorMsg('');
      await reviewService.deleteReview(deviceId, existingReview._id);
      const updatedBooking = {
        ...booking,
        review: null,
        isReviewed: false,
        canReview: booking.status === 'completed',
      };
      if (typeof onReviewSaved === 'function') {
        onReviewSaved(updatedBooking);
      }
      onClose();
    } catch (err) {
      setErrorMsg(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to delete review. Please try again.'
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-review-modal-title"
    >
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-50/90 via-white to-brand-50/50 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Star className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 id="booking-review-modal-title" className="text-base font-extrabold text-slate-900">
                {isEditing ? 'Edit Your Rental Review' : 'Rate & Review Your Rental'}
              </h2>
              <p className="text-xs text-slate-500">
                Booking <span className="font-mono font-bold text-slate-700">{booking.bookingCode}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting || deleting}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Device Summary */}
          <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="w-14 h-14 rounded-xl bg-white border border-slate-200/80 overflow-hidden flex-shrink-0 flex items-center justify-center">
              {deviceImage ? (
                <img src={deviceImage} alt={deviceTitle} className="w-full h-full object-cover" />
              ) : (
                <Package className="w-6 h-6 text-slate-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-slate-900 truncate">{deviceTitle}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Completed rental · Share your honest experience with the community
              </p>
            </div>
          </div>

          {/* Star Rating Picker */}
          <div className="flex flex-col items-center p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-2">
              Overall Rating
            </span>
            <div className="flex items-center gap-2" onMouseLeave={() => setHoverRating(0)}>
              {[1, 2, 3, 4, 5].map((value) => {
                const isFilled = value <= activeRating;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    onMouseEnter={() => setHoverRating(value)}
                    className="p-1.5 rounded-xl transition-transform hover:scale-110 focus:outline-none"
                    aria-label={`Rate ${value} out of 5 stars`}
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        isFilled
                          ? 'fill-amber-400 text-amber-400 drop-shadow-2xs'
                          : 'fill-white text-slate-300'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <span className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white text-amber-800 text-xs font-bold border border-amber-200 shadow-2xs">
              {activeRating}.0 — {RATING_LABELS[activeRating]}
            </span>
          </div>

          {/* Quick Review Tag Chips */}
          <div>
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Quick feedback tags (click to add):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_REVIEW_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleQuickTagClick(tag)}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 border border-transparent transition"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Review Comment Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="booking-review-comment" className="text-xs font-bold text-slate-700">
                Your Review
              </label>
              <span className="text-[11px] text-slate-400">
                {comment.length}/{REVIEW_MAX_LENGTH}
              </span>
            </div>
            <textarea
              id="booking-review-comment"
              rows={4}
              maxLength={REVIEW_MAX_LENGTH}
              value={comment}
              onChange={(e) => {
                setErrorMsg('');
                setComment(e.target.value);
              }}
              placeholder="How was the device performance, battery life, and handover process with the owner?"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-brand-500 focus:outline-none transition resize-none"
            />
          </div>

          {/* Error / Success Messages */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
            {isEditing ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting || deleting}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition disabled:opacity-50"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Delete</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting || deleting}
                className="px-4 py-2.5 rounded-full text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="booking-review-submit-btn"
                disabled={submitting || deleting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-sm transition disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Star className="w-4 h-4 fill-current" />
                    <span>{isEditing ? 'Update Review' : 'Submit Review'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

/**
 * Dedicated Review Banner / Card shown on BookingDetailPage when booking.status === 'completed'.
 */
export const BookingReviewSection = ({ booking, onOpenReviewModal }) => {
  if (!booking || booking.status !== 'completed') return null;

  const review = booking.review || null;

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-amber-200/80 mb-6 relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-500 flex items-center justify-center flex-shrink-0">
            <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                {review ? 'Your Rental Review' : 'How was your rental experience?'}
              </h2>
              {review ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Reviewed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  Completed Order
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {review
                ? `Submitted on ${formatDateTime(review.updatedAt || review.createdAt)}`
                : 'Your order is completed! Rate this device to help other renters and the owner.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          id="booking-detail-review-btn"
          onClick={() => onOpenReviewModal(booking)}
          className={`self-start sm:self-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition shadow-xs ${
            review
              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              : 'bg-amber-500 text-white hover:bg-amber-600'
          }`}
        >
          {review ? (
            <>
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Review</span>
            </>
          ) : (
            <>
              <Star className="w-4 h-4 fill-current" />
              <span>Write a Review</span>
            </>
          )}
        </button>
      </div>

      {review && (
        <div className="mt-5 pt-5 border-t border-slate-100">
          <div className="flex items-center gap-1.5 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  star <= review.rating
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-slate-100 text-slate-300'
                }`}
              />
            ))}
            <span className="ml-1 text-xs font-bold text-slate-800">
              {review.rating}.0 / 5.0 ({RATING_LABELS[review.rating] || 'Rated'})
            </span>
          </div>
          <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
            {review.comment}
          </p>

          {review.ownerReply?.comment && (
            <div className="mt-3 ml-4 p-3.5 rounded-2xl bg-brand-50/60 border border-brand-100 text-xs">
              <div className="font-bold text-brand-800 flex items-center gap-1.5 mb-1">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Owner Response</span>
              </div>
              <p className="text-slate-700">{review.ownerReply.comment}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BookingReviewModal;

