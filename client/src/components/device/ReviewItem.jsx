import React, { useState } from 'react';
import { Star, BadgeCheck, MessageCircle, UserRound } from 'lucide-react';
import { ReviewForm } from './ReviewForm';

export function ReviewItem({ review, userId, isOwner, busy, onEdit, onDelete, onReply }) {
  const [mode, setMode] = useState(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const isAuthor = userId && String(review.reviewerId) === String(userId);
  const name = review.author?.username || review.author?.name || 'Former member';
  const save = action => async input => { await action(input); setMode(null); };

  return <article className="review-item">
    <header>
      {review.author?.avatar && !avatarFailed ? <img className="review-avatar" src={review.author.avatar} alt="" onError={() => setAvatarFailed(true)} />
        : <span className="review-avatar review-avatar-placeholder"><UserRound size={22} /></span>}
      <div className="review-author"><strong>{name}</strong>
        {review.verifiedRenter && <span className="review-verified"><BadgeCheck size={14} /> Verified renter</span>}
      </div>
      <time className="review-date" dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</time>
    </header>
    <div className="review-stars" aria-label={`${review.rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(value => <Star key={value} size={15} fill={value <= review.rating ? 'currentColor' : 'none'} />)}
    </div>
    <p className="review-comment">{review.comment}</p>
    {review.ownerReply && <div className="review-owner-reply"><strong>Owner response</strong><p>{review.ownerReply.comment}</p></div>}
    {(isAuthor || isOwner) && <div className="review-actions review-item-actions">
      {isAuthor && <><button type="button" disabled={busy} onClick={() => setMode('edit')}>Edit review</button>
        <button type="button" disabled={busy} onClick={() => setMode('delete')}>Delete review</button></>}
      {isOwner && <button className="review-reply-button" type="button" disabled={busy} onClick={() => setMode('reply')}><MessageCircle size={15} />{review.ownerReply ? 'Edit reply' : 'Reply'}</button>}
    </div>}
    {mode === 'edit' && <ReviewForm review={review} busy={busy} onSubmit={save(onEdit)} onCancel={() => setMode(null)} />}
    {mode === 'reply' && <ReviewForm replyOnly review={review.ownerReply} busy={busy} onSubmit={save(onReply)} onCancel={() => setMode(null)} />}
    {mode === 'delete' && <div className="review-delete-confirm" role="group" aria-label="Confirm review deletion">
      <p>Delete this review? This also removes its owner reply.</p>
      <div className="review-actions"><button type="button" disabled={busy} onClick={onDelete}>Confirm delete</button>
        <button type="button" disabled={busy} onClick={() => setMode(null)}>Cancel</button></div>
    </div>}
  </article>;
}
