import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, ImageOff, MapPin, Heart } from 'lucide-react';
import { ROUTES } from '../../routes/routes.js';
import { formatPrice } from '../../utils/formatters.js';
import './DeviceCard.css';

const FAVORITES_KEY = 'techshare:favorite-devices';
const readFavorites = () => {
  try {
    const value = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    return Array.isArray(value) ? value.filter(id => typeof id === 'string') : [];
  } catch { return []; }
};

const CATEGORY_LABEL_MAP = {
  smartphone: 'Smartphone',
  laptop: 'Laptop',
  camera: 'Camera',
  drone: 'Drone',
  audio: 'Audio',
  accessory: 'Accessory',
  tablet: 'Tablet',
  other: 'Other',
};

const CONDITION_LABEL_MAP = {
  new99: 'Like New (99%)',
  used95: 'Used (95%)',
  scratched: 'Scratched',
  new: 'New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
};

/**
 * Formats backend category into user-friendly English label
 */
export const formatCategoryLabel = (category) => {
  if (!category || typeof category !== 'string') return '';
  const key = category.trim().toLowerCase();
  return CATEGORY_LABEL_MAP[key] || (category.charAt(0).toUpperCase() + category.slice(1));
};

/**
 * Formats backend condition value into user-friendly label
 */
export const formatConditionLabel = (condition) => {
  if (!condition || typeof condition !== 'string') return '';
  const key = condition.trim().toLowerCase();
  return CONDITION_LABEL_MAP[key] || condition.trim();
};

/**
 * Reusable Device Card component for TechShare Web
 *
 * @param {Object} props
 * @param {import('../../types/device.js').Device} props.device
 */
export const DeviceCard = ({ device }) => {
  const [imgError, setImgError] = useState(false);
  const [isFavorite, setIsFavorite] = useState(() => readFavorites().includes(String(device?._id || device?.id || '')));

  if (!device || typeof device !== 'object') {
    return null;
  }

  const deviceId = device._id || device.id || '';
  const title = (device.title || device.name || 'Untitled Device').trim();
  const brand = (device.brand || '').trim();
  const categoryLabel = formatCategoryLabel(device.category);
  const conditionLabel = formatConditionLabel(device.condition);

  // Price calculation
  const rawPrice = device.dailyRate ?? device.pricePerDay;
  const hasValidPrice = typeof rawPrice === 'number' && !Number.isNaN(rawPrice) && rawPrice >= 0;
  const formattedPrice = hasValidPrice ? `${formatPrice(rawPrice)} / day` : 'Contact for price';

  // Rating calculation
  const rawRating = device.stats?.ratingAvg ?? device.rating ?? device.ratingAvg;
  const hasValidRating = typeof rawRating === 'number' && !Number.isNaN(rawRating) && rawRating > 0;
  const ratingDisplay = hasValidRating ? rawRating.toFixed(1) : null;
  const rawReviewCount = device.stats?.ratingCount ?? device.reviewCount ?? device.ratingCount;
  const reviewCount = typeof rawReviewCount === 'number' ? rawReviewCount : 0;

  // Image URL
  const imageUrl = Array.isArray(device.images) && device.images.length > 0 ? device.images[0] : null;

  // Route URL
  const detailUrl = deviceId ? ROUTES.DEVICE_DETAIL_PATH(deviceId) : ROUTES.EXPLORE;

  return (
    <article className="device-card-item">
      {deviceId && (
        <button type="button" className="device-card-favorite" aria-pressed={isFavorite}
          aria-label={`${isFavorite ? 'Remove from' : 'Add to'} favorites: ${title}`}
          onClick={() => {
            const ids = new Set(readFavorites());
            if (isFavorite) ids.delete(String(deviceId)); else ids.add(String(deviceId));
            try { localStorage.setItem(FAVORITES_KEY, JSON.stringify([...ids])); } catch { /* Keep this session usable. */ }
            setIsFavorite(!isFavorite);
          }}>
          <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} strokeWidth={2} />
        </button>
      )}
      <Link
        to={detailUrl}
        className="device-card-link"
        aria-label={`View details for ${title}`}
      >
        <div className="device-card-image-wrap">
          {imageUrl && !imgError ? (
            <img
              src={imageUrl}
              alt={title}
              className="device-card-image"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="device-card-image-fallback" aria-label="No image available">
              <ImageOff size={28} className="fallback-icon" />
              <span className="fallback-text">No image</span>
            </div>
          )}

          {conditionLabel && (
            <span className="device-card-condition-badge">
              <Star size={12} fill="currentColor" aria-hidden="true" />
              {conditionLabel}
            </span>
          )}
        </div>

        <div className="device-card-content">
          <div className="device-card-meta-row">
            {brand && <span className="device-card-brand">{brand}</span>}
            {categoryLabel && <span className="device-card-category">{categoryLabel}</span>}
          </div>

          <h3 className="device-card-title" title={title}>
            {title}
          </h3>
          {Number.isFinite(device.distanceMeters) && (
            <div className="device-card-distance"><MapPin size={12} /> {(device.distanceMeters / 1000).toFixed(1)} km away</div>
          )}

          <div className="device-card-footer">
            <div className="device-card-price-wrap">
              <span className="device-card-price">{formattedPrice}</span>
            </div>

            {ratingDisplay ? (
              <div className="device-card-rating-wrap" aria-label={`Rating: ${ratingDisplay}`}>
                <Star size={13} className="rating-star-icon" fill="currentColor" />
                <span className="device-card-rating-val">{ratingDisplay}</span>
                {reviewCount > 0 && (
                  <span className="device-card-reviews-count">({reviewCount})</span>
                )}
              </div>
            ) : null}
          </div>
          <span className="device-card-rent-cta">View device <span aria-hidden="true">↗</span></span>
        </div>
      </Link>
    </article>
  );
};

export default DeviceCard;
