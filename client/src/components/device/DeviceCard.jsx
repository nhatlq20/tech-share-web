import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, ImageOff } from 'lucide-react';
import { ROUTES } from '../../routes/routes.js';
import { formatPrice } from '../../utils/formatters.js';
import './DeviceCard.css';

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
  const rawRating = device.rating ?? device.ratingAvg;
  const hasValidRating = typeof rawRating === 'number' && !Number.isNaN(rawRating) && rawRating > 0;
  const ratingDisplay = hasValidRating ? rawRating.toFixed(1) : null;
  const reviewCount = typeof device.reviewCount === 'number' ? device.reviewCount : 0;

  // Image URL
  const imageUrl = Array.isArray(device.images) && device.images.length > 0 ? device.images[0] : null;

  // Route URL
  const detailUrl = deviceId ? ROUTES.DEVICE_DETAIL_PATH(deviceId) : ROUTES.EXPLORE;

  return (
    <article className="device-card-item">
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
        </div>
      </Link>
    </article>
  );
};

export default DeviceCard;
