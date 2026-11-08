import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, ImageOff, MapPin, Heart } from 'lucide-react';
import { ROUTES } from '../../routes/routes.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatPrice } from '../../utils/formatters.js';
import {
  isDeviceInWishlist,
  toggleWishlist,
  WISHLIST_UPDATED_EVENT,
} from '../../services/wishlistService.js';
import { resolveCityName } from '../../constants/cities.js';
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
 * Calculates distance in meters between two lat/lng points using Haversine formula
 */
export const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  if (!Number.isFinite(lat1) || !Number.isFinite(lon1) || !Number.isFinite(lat2) || !Number.isFinite(lon2)) {
    return null;
  }
  const R = 6371e3; // Earth radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Reusable Device Card component for TechShare Web
 *
 * @param {Object} props
 * @param {import('../../types/device.js').Device} props.device
 * @param {Function} [props.onFavoriteChange] Optional callback when favorite state is toggled
 * @param {{ lat: number, lng: number }} [props.userCoordinates] Optional user coordinates
 */
export const DeviceCard = ({ device, onFavoriteChange, userCoordinates = null }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const deviceId = String(device?._id || device?.id || '');
  const [imgError, setImgError] = useState(false);
  const [isFavorite, setIsFavorite] = useState(() => isAuthenticated && isDeviceInWishlist(deviceId));

  useEffect(() => {
    if (!isAuthenticated) {
      setIsFavorite(false);
      return;
    }
    setIsFavorite(isDeviceInWishlist(deviceId));

    const handleWishlistEvent = (e) => {
      const ids = e?.detail?.wishlistIds;
      if (Array.isArray(ids)) {
        setIsFavorite(ids.includes(deviceId));
      } else {
        setIsFavorite(isDeviceInWishlist(deviceId));
      }
    };

    window.addEventListener(WISHLIST_UPDATED_EVENT, handleWishlistEvent);
    window.addEventListener('storage', handleWishlistEvent);
    return () => {
      window.removeEventListener(WISHLIST_UPDATED_EVENT, handleWishlistEvent);
      window.removeEventListener('storage', handleWishlistEvent);
    };
  }, [deviceId, isAuthenticated]);

  if (!device || typeof device !== 'object') {
    return null;
  }

  const title = (device.title || device.name || 'Untitled Device').trim();
  const brand = (device.brand || '').trim();
  const categoryLabel = formatCategoryLabel(device.category);
  const conditionLabel = formatConditionLabel(device.condition);

  // Status calculation
  const rawStatus = (device.status || 'available').toString().trim();
  const statusLabel =
    rawStatus.toLowerCase() === 'available'
      ? 'Available'
      : rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();

  // Owner information
  const rawOwner = device.owner || (typeof device.ownerId === 'object' ? device.ownerId : null);
  const ownerName = (rawOwner?.name || device.ownerName || '').trim();
  const ownerAvatar = rawOwner?.avatar || rawOwner?.avatarUrl || device.ownerAvatar || null;

  // Owner location / city
  const rawOwnerAddress =
    rawOwner?.address ||
    device.location?.addressText ||
    device.address ||
    '';
  const ownerCity = resolveCityName(rawOwnerAddress);

  // Owner coordinates (Single Source of Truth: user's location)
  const ownerCoords =
    rawOwner?.location?.coordinates ||
    device.location?.coordinates ||
    device.ownerLocation?.coordinates;
  const hasValidOwnerCoords =
    Array.isArray(ownerCoords) &&
    ownerCoords.length === 2 &&
    Number.isFinite(ownerCoords[0]) &&
    Number.isFinite(ownerCoords[1]);

  // Distance calculation
  let distanceMeters = null;
  if (Number.isFinite(device.distanceMeters)) {
    distanceMeters = device.distanceMeters;
  } else if (
    userCoordinates &&
    Number.isFinite(userCoordinates.lat) &&
    Number.isFinite(userCoordinates.lng) &&
    hasValidOwnerCoords
  ) {
    distanceMeters = calculateDistanceMeters(
      userCoordinates.lat,
      userCoordinates.lng,
      ownerCoords[1], // latitude
      ownerCoords[0]  // longitude
    );
  }

  const formattedDistance = Number.isFinite(distanceMeters)
    ? `${(distanceMeters / 1000).toFixed(1)} km away`
    : null;

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

  const handleToggleFavorite = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!deviceId) return;
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN);
      return;
    }
    const nextState = !isFavorite;
    setIsFavorite(nextState);
    const res = await toggleWishlist(deviceId);
    if (typeof onFavoriteChange === 'function') {
      onFavoriteChange(deviceId, res.isFavorite, res);
    }
  };

  const handleBookNow = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (deviceId) {
      navigate(ROUTES.BOOKING_CHECKOUT_PATH(deviceId));
    }
  };

  return (
    <article className="device-card-item">
      {deviceId && (
        <button
          type="button"
          className="device-card-favorite"
          aria-pressed={isFavorite}
          aria-label={`${isFavorite ? 'Remove from' : 'Add to'} favorites: ${title}`}
          title={isFavorite ? 'Remove from Wishlist' : 'Add to Wishlist'}
          onClick={handleToggleFavorite}
        >
          <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} strokeWidth={2} />
        </button>
      )}
      <Link
        to={detailUrl}
        state={{ from: ROUTES.HOME, fromLabel: 'Back to Home' }}
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
            <span className={`device-card-status status-${rawStatus.toLowerCase()}`}>
              {statusLabel}
            </span>
          </div>

          <h3 className="device-card-title" title={title}>
            {title}
          </h3>

          {ownerName && (
            <div className="device-card-owner-row" title={`Owner: ${ownerName}`}>
              {ownerAvatar ? (
                <img
                  src={ownerAvatar}
                  alt={ownerName}
                  className="device-card-owner-avatar"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.parentElement?.querySelector(
                      '.device-card-owner-avatar-fallback'
                    );
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className="device-card-owner-avatar-fallback"
                style={{ display: ownerAvatar ? 'none' : 'flex' }}
              >
                {ownerName.charAt(0).toUpperCase()}
              </div>
              <span className="device-card-owner-name">Owner: {ownerName}</span>
            </div>
          )}

          {ownerCity ? (
            <div className="device-card-location-row" title={`Location: ${rawOwnerAddress || ownerCity}`}>
              <span className="device-card-location-label">Location:</span>{' '}
              <span className="device-card-location-city">{ownerCity}</span>
            </div>
          ) : null}

          {formattedDistance && (
            <div className="device-card-distance">
              <MapPin size={12} aria-hidden="true" />
              <span>{formattedDistance}</span>
            </div>
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
          <button
            type="button"
            className="device-card-rent-cta"
            onClick={handleBookNow}
            aria-label={`Book now: ${title}`}
          >
            Book now <span aria-hidden="true">↗</span>
          </button>
        </div>
      </Link>
    </article>
  );
};

export default DeviceCard;
