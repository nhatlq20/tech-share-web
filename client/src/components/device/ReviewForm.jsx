import React, { useState } from 'react';
import { Star } from 'lucide-react';

export const REVIEW_MAX_LENGTH = 2000;

export function ReviewForm({ review, bookings = [], replyOnly = false, onSubmit, onCancel, busy }) {
  const [rating, setRating] = useState(review?.rating ?? 0);
  const [comment, setComment] = useState(review?.comment ?? '');
  const [bookingId, setBookingId] = useState(bookings[0]?._id ?? '');
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    if ((!replyOnly && !rating) || !comment.trim()) {
      setError(replyOnly ? 'Please enter your reply.' : 'Please choose a rating and enter your review.');
      return;
    }
    setError('');
    try {
      await onSubmit({ rating, comment: comment.trim(), bookingId });
    } catch (requestError) {
      setError(requestError.message || 'Unable to save. Please try again.');
    }
  }

  return (
    <form className="review-form" onSubmit={submit}>
      <h3>{replyOnly ? 'Owner reply' : review ? 'Edit your review' : 'Write a review'}</h3>
      <fieldset disabled={busy}>
        {!replyOnly && <div className="review-star-picker" role="group" aria-label="Select rating">
          {[1, 2, 3, 4, 5].map(value => <button key={value} type="button" aria-label={`${value} star${value > 1 ? 's' : ''}`}
            aria-pressed={rating === value} onClick={() => setRating(value)}>
            <Star size={27} fill={value <= rating ? 'currentColor' : 'none'} />
          </button>)}
          <span>{rating ? `${rating}/5` : 'Select a rating'}</span>
        </div>}
        {!replyOnly && !review && bookings.length > 1 && <label>Completed rental
          <select value={bookingId} onChange={event => setBookingId(event.target.value)}>
            {bookings.map(booking => <option key={booking._id} value={booking._id}>
              {booking.bookingCode || `Rental ending ${new Date(booking.endDate).toLocaleDateString()}`}
            </option>)}
          </select>
        </label>}
        <label>{replyOnly ? 'Your reply' : 'Your experience'}
          <textarea required maxLength={REVIEW_MAX_LENGTH} rows={4} value={comment}
            placeholder={replyOnly ? 'Thank the renter or address their feedback…' : 'What was it like to rent this device?'}
            onChange={event => setComment(event.target.value)} />
        </label>
        <small>{comment.length}/{REVIEW_MAX_LENGTH}</small>
        {error && <p role="alert" className="review-error">{error}</p>}
        <div className="review-actions">
          <button className="review-primary" type="submit">{busy ? 'Saving…' : replyOnly ? 'Save reply' : 'Save review'}</button>
          <button type="button" onClick={onCancel}>Cancel</button>
        </div>
      </fieldset>
    </form>
  );
}
