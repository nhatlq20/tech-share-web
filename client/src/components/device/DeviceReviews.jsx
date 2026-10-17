import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Filter, MessageSquare, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../routes/routes';
import { reviewService } from '../../services/reviewService';
import { ReviewForm } from './ReviewForm';
import { ReviewItem } from './ReviewItem';
import './DeviceReviews.css';

export function DeviceReviews({ deviceId, ownerId, onSummaryChange }) {
  const { user, isAuthenticated } = useAuth();
  const userId = isAuthenticated ? user?._id || user?.id : null;
  const isOwner = userId && String(userId) === String(ownerId);
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [eligibilityError, setEligibilityError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [writing, setWriting] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const mutationPending = useRef(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    reviewService.getDeviceReviews(deviceId, { page, sort, limit: 5 }).then(response => {
      if (!active) return;
      if (page > response.pagination.totalPages) { setPage(response.pagination.totalPages); return; }
      setResult(response);
      onSummaryChange(response.summary);
    }).catch(requestError => {
      if (active) setError(requestError.message || 'Unable to load reviews.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [deviceId, page, sort, refresh, onSummaryChange]);

  useEffect(() => {
    let active = true;
    setEligibility(null);
    setEligibilityError('');
    setWriting(false);
    if (userId) {
      reviewService.getEligibility(deviceId).then(response => {
        if (active) setEligibility(response.data);
      }).catch(requestError => { if (active) setEligibilityError(requestError.message || 'Unable to check review eligibility.'); });
    }
    return () => { active = false; };
  }, [deviceId, userId, refresh]);

  async function mutate(action, message, resetPage = false) {
    if (mutationPending.current) return;
    mutationPending.current = true;
    setBusy(true);
    setNotice('');
    try {
      const response = await action();
      onSummaryChange(response.summary);
      setResult(previous => previous ? { ...previous, summary: response.summary } : previous);
      setNotice(message);
      if (resetPage) { setPage(1); setSort('newest'); }
      setRefresh(value => value + 1);
    } finally {
      setBusy(false);
      mutationPending.current = false;
    }
  }

  async function removeReview(reviewId) {
    try {
      await mutate(() => reviewService.deleteReview(deviceId, reviewId), 'Review deleted.');
    } catch (requestError) { setError(requestError.message || 'Unable to delete review.'); }
  }

  const summary = result?.summary;
  return <section className="device-reviews" aria-labelledby="device-reviews-heading" aria-busy={loading}>
    <div className="review-section-heading">
      <h2 id="device-reviews-heading">Reviews &amp; Ratings</h2>
      {summary && <span className="review-count-badge">{summary.ratingCount} reviews</span>}
    </div>
    {summary && <div className="review-overview">
      <div className="review-average">
        <strong>{summary.ratingCount ? summary.ratingAvg.toFixed(1) : '—'}</strong>
        <div className="review-summary-stars" aria-label={summary.ratingCount ? `${summary.ratingAvg.toFixed(1)} out of 5 stars` : 'No rating yet'}>
          {[1, 2, 3, 4, 5].map(value => <Star key={value} size={16}
            fill={value <= Math.round(summary.ratingAvg) && summary.ratingCount ? 'currentColor' : 'none'} />)}
        </div>
        <span>{summary.ratingCount ? `${summary.ratingCount} review${summary.ratingCount === 1 ? '' : 's'}` : 'No reviews yet'}</span>
      </div>
      <div className="review-distribution">{[5, 4, 3, 2, 1].map(rating => <div key={rating}>
        <span>{rating} <Star size={12} fill="currentColor" /></span>
        <progress aria-label={`${rating} star reviews`} max={summary.ratingCount || 1} value={summary.distribution[rating] || 0} />
        <span>{summary.distribution[rating] || 0}</span>
      </div>)}</div>
    </div>}
    <div className="review-eligibility">
      {!isAuthenticated ? <p><Link to={ROUTES.LOGIN}>Sign in</Link> to review a completed rental.</p>
        : eligibilityError ? <p role="alert">{eligibilityError} <button type="button" onClick={() => setRefresh(value => value + 1)}>Retry</button></p>
        : !eligibility ? <p>Checking review eligibility…</p>
        : eligibility.canReview ? !writing && <button type="button" className="review-primary" disabled={busy} onClick={() => setWriting(true)}>Write review</button>
        : <p>{eligibility.reason}</p>}
    </div>
    {writing && eligibility?.canReview && <ReviewForm bookings={eligibility.bookings} busy={busy}
      onCancel={() => setWriting(false)} onSubmit={async input => {
        await mutate(() => reviewService.createReview(deviceId, input), 'Review published. Thank you!', true);
        setWriting(false);
      }} />}
    {notice && <p className="review-notice" role="status">{notice}</p>}
    <div className="review-list-toolbar"><h3>Customer Reviews</h3><label><Filter size={16} aria-hidden="true" />
      <select aria-label="Sort reviews" value={sort} disabled={busy} onChange={event => { setSort(event.target.value); setPage(1); }}>
        <option value="newest">Most Recent</option><option value="highest">Highest rating</option><option value="lowest">Lowest rating</option>
      </select></label></div>
    {error && <p role="alert" className="review-error">{error} <button type="button" onClick={() => setRefresh(value => value + 1)}>Try again</button></p>}
    {loading ? <p role="status">Loading reviews…</p> : !error && result && <>
      {result.data.length ? result.data.map(review => <ReviewItem key={review._id} review={review} userId={userId}
        isOwner={isOwner} busy={busy}
        onEdit={input => mutate(() => reviewService.updateReview(deviceId, review._id, input), 'Review updated.')}
        onDelete={() => removeReview(review._id)}
        onReply={input => mutate(() => reviewService.replyToReview(deviceId, review._id, input.comment), 'Reply saved.')} />)
        : <div className="review-empty"><MessageSquare size={32} /><h3>No reviews yet</h3><p>Be the first to share your experience after a completed rental.</p></div>}
      {result.pagination.totalPages > 1 && <nav className="review-pagination" aria-label="Review pages">
        <button type="button" disabled={busy || page === 1} onClick={() => setPage(value => value - 1)}>Previous</button>
        <span>Page {page} of {result.pagination.totalPages}</span>
        <button type="button" disabled={busy || page >= result.pagination.totalPages} onClick={() => setPage(value => value + 1)}>Next</button>
      </nav>}
    </>}
  </section>;
}
