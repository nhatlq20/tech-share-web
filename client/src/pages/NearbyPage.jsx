import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Star,
  Heart,
  ImageOff,
  Compass,
  ArrowUpDown,
  CheckCircle2,
  SlidersHorizontal,
  Package,
} from 'lucide-react';
import { useUserLocation } from '../hooks/useUserLocation';
import { deviceService } from '../services/deviceService';
import { MapView, getDevicePosition, groupDevicesByOwnerLocation } from '../components/map/MapView';
import { ROUTES } from '../routes/routes';
import { formatPrice } from '../utils/formatters';
import { formatCategoryLabel, formatConditionLabel } from '../components/device/DeviceCard';
import {
  readLocalWishlistIds,
  toggleWishlist,
  WISHLIST_UPDATED_EVENT,
} from '../services/wishlistService';
import './NearbyPage.css';

const DEFAULT_RADIUS_METERS = 10000;

const RADIUS_OPTIONS = [
  { label: '1 km', value: 1000 },
  { label: '5 km', value: 5000 },
  { label: '10 km', value: 10000 },
  { label: '20 km', value: 20000 },
];

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'camera', label: 'Cameras' },
  { id: 'smartphone', label: 'Phones' },
  { id: 'laptop', label: 'Laptops' },
  { id: 'drone', label: 'Drones' },
  { id: 'audio', label: 'Audio' },
  { id: 'tablet', label: 'Tablets' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'accessory', label: 'Accessories' },
];

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400';

export const NearbyPage = () => {
  const userLocation = useUserLocation();
  const { latitude, longitude, revision } = userLocation;

  // Search & Filter States
  const [radiusMeters, setRadiusMeters] = useState(DEFAULT_RADIUS_METERS);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('nearest');

  // Selection states: selected owner group and selected device
  const [selectedOwnerKey, setSelectedOwnerKey] = useState(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);

  // Data fetching state
  const locationKey = JSON.stringify([latitude, longitude, revision, radiusMeters]);
  const [result, setResult] = useState({ locationKey: null, devices: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const pendingRequest = useRef(null);
  const devicesSectionRef = useRef(null);

  // Wishlist state
  const [wishlistIds, setWishlistIds] = useState(() => readLocalWishlistIds());

  useEffect(() => {
    const syncWishlist = () => setWishlistIds(readLocalWishlistIds());
    window.addEventListener(WISHLIST_UPDATED_EVENT, syncWishlist);
    window.addEventListener('storage', syncWishlist);
    return () => {
      window.removeEventListener(WISHLIST_UPDATED_EVENT, syncWishlist);
      window.removeEventListener('storage', syncWishlist);
    };
  }, []);

  const handleToggleWishlist = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleWishlist(id);
    setWishlistIds(readLocalWishlistIds());
  };

  // Scroll to corresponding card when selectedDeviceId changes
  useEffect(() => {
    if (selectedDeviceId) {
      const cardEl = document.getElementById(`nearby-card-${selectedDeviceId}`);
      if (cardEl && typeof cardEl.scrollIntoView === 'function') {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedDeviceId]);

  // Load nearby devices from backend API
  useEffect(() => {
    let active = true;
    if (latitude == null || longitude == null) return () => { active = false; };

    setIsLoading(true);
    setErrorMessage(null);
    setSelectedDeviceId(null);

    const requestKey = JSON.stringify([latitude, longitude, revision, retryAttempt, radiusMeters]);

    async function loadNearbyDevices() {
      try {
        if (pendingRequest.current?.key !== requestKey) {
          pendingRequest.current = { key: requestKey, promise: fetchNearbyPages() };
        }
        const devices = await pendingRequest.current.promise;
        if (active) setResult({ locationKey, devices });
      } catch (error) {
        if (active) setErrorMessage('Unable to load nearby devices. Please try again.');
      } finally {
        if (active) setIsLoading(false);
      }
    }

    async function fetchNearbyPages() {
      const devices = new Map();
      let totalPages = 1;
      for (let page = 1; page <= totalPages; page += 1) {
        const response = await deviceService.getNearbyDevices({
          lat: latitude,
          lng: longitude,
          radius: radiusMeters,
          page,
          limit: 100,
        });

        if (!Array.isArray(response?.data) || response.success === false) {
          throw new Error('Invalid nearby response');
        }

        if (response.pagination) {
          if (!Number.isSafeInteger(response.pagination.totalPages) || response.pagination.totalPages < 1) {
            throw new Error('Invalid pagination');
          }
          totalPages = response.pagination.totalPages;
        }

        response.data.forEach((device) => {
          if (!device || typeof device !== 'object') return;
          const id = device._id || device.id;
          if (
            id &&
            getDevicePosition(device) &&
            device.status === 'available' &&
            device.isDeleted !== true &&
            Number.isFinite(device.distanceMeters) &&
            device.distanceMeters >= 0 &&
            device.distanceMeters <= radiusMeters
          ) {
            devices.set(String(id), device);
          }
        });
      }
      return [...devices.values()];
    }

    loadNearbyDevices();
    return () => { active = false; };
  }, [latitude, longitude, revision, retryAttempt, radiusMeters, locationKey]);

  const rawDevices = useMemo(() => {
    return result.locationKey === locationKey ? result.devices : [];
  }, [result.locationKey, locationKey, result.devices]);

  // 1. Filter underlying devices by category, availability, and sort
  const filteredDevices = useMemo(() => {
    let list = [...rawDevices];

    // Category filter
    if (selectedCategory !== 'all') {
      list = list.filter((device) => {
        const cat = (device.category || '').toLowerCase();
        return cat === selectedCategory.toLowerCase();
      });
    }

    // Availability filter
    if (availabilityFilter === 'available') {
      list = list.filter((device) => device.status === 'available');
    }

    // Sorting devices
    if (sortBy === 'nearest') {
      list.sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));
    } else if (sortBy === 'price_asc') {
      list.sort((a, b) => (a.dailyRate ?? a.pricePerDay ?? 0) - (b.dailyRate ?? b.pricePerDay ?? 0));
    } else if (sortBy === 'rating_desc') {
      list.sort((a, b) => {
        const rA = a.stats?.ratingAvg ?? a.rating ?? a.ratingAvg ?? 0;
        const rB = b.stats?.ratingAvg ?? b.rating ?? b.ratingAvg ?? 0;
        return rB - rA;
      });
    }

    return list;
  }, [rawDevices, selectedCategory, availabilityFilter, sortBy]);

  // 2. Group filtered devices by owner and rental location
  const ownerGroups = useMemo(() => {
    const groups = groupDevicesByOwnerLocation(filteredDevices);

    // Sort owner groups according to active sort option
    if (sortBy === 'nearest') {
      groups.sort((a, b) => a.distanceMeters - b.distanceMeters);
    } else if (sortBy === 'price_asc') {
      groups.sort((a, b) => {
        const minA = Math.min(...a.devices.map((d) => d.dailyRate ?? d.pricePerDay ?? Infinity));
        const minB = Math.min(...b.devices.map((d) => d.dailyRate ?? d.pricePerDay ?? Infinity));
        return minA - minB;
      });
    } else if (sortBy === 'rating_desc') {
      groups.sort((a, b) => (b.owner.rating ?? 0) - (a.owner.rating ?? 0));
    }

    return groups;
  }, [filteredDevices, sortBy]);

  // Currently active owner key (falls back to the first available owner group)
  const activeOwnerKey = useMemo(() => {
    if (selectedOwnerKey && ownerGroups.some((g) => g.key === selectedOwnerKey)) {
      return selectedOwnerKey;
    }
    return ownerGroups[0]?.key || null;
  }, [selectedOwnerKey, ownerGroups]);

  // Currently selected owner group
  const selectedGroup = useMemo(() => {
    if (!ownerGroups.length) return null;
    return ownerGroups.find((g) => g.key === activeOwnerKey) || ownerGroups[0];
  }, [ownerGroups, activeOwnerKey]);

  // Marker click from MapView (accepts groupKey and optional primaryDeviceId, or deviceId)
  const handleMarkerClick = useCallback((groupKeyOrDeviceId, maybeDeviceId) => {
    const targetGroup = ownerGroups.find(
      (g) => g.key === groupKeyOrDeviceId || g.devices.some((d) => String(d._id || d.id) === String(groupKeyOrDeviceId))
    );

    if (targetGroup) {
      setSelectedOwnerKey(targetGroup.key);
      const targetDevId = maybeDeviceId ||
        (targetGroup.devices.some((d) => String(d._id || d.id) === String(groupKeyOrDeviceId))
          ? groupKeyOrDeviceId
          : targetGroup.devices[0]?._id || targetGroup.devices[0]?.id);
      if (targetDevId) {
        setSelectedDeviceId(String(targetDevId));
      }
    } else if (groupKeyOrDeviceId) {
      setSelectedDeviceId(String(groupKeyOrDeviceId));
    }
  }, [ownerGroups]);

  // Owner card select
  const handleOwnerSelect = (group) => {
    setSelectedOwnerKey(group.key);
    const firstDevId = group.devices[0]?._id || group.devices[0]?.id;
    if (firstDevId) {
      setSelectedDeviceId(String(firstDevId));
    }
  };

  // Device card select
  const handleCardClick = (id) => {
    setSelectedDeviceId(id);
  };

  const handleScrollToDevices = () => {
    if (devicesSectionRef.current && typeof devicesSectionRef.current.scrollIntoView === 'function') {
      devicesSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const hasLocation = latitude != null && longitude != null;
  const nearbyLoading = hasLocation && (isLoading || result.locationKey !== locationKey) && !errorMessage;
  const radiusKm = radiusMeters / 1000;
  const totalOwners = ownerGroups.length;

  return (
    <div className="nearby-page">
      {/* Top Header */}
      <header className="nearby-header">
        <div>
          <h1>Devices near you</h1>
          <p>Available rentals within {radiusKm} km of your location.</p>
        </div>
        <button
          type="button"
          onClick={userLocation.refreshLocation}
          disabled={userLocation.loading || userLocation.refreshing}
          className="nearby-update-loc-btn"
        >
          {userLocation.refreshing ? 'Updating location...' : 'Update location'}
        </button>
      </header>

      {(userLocation.source === 'CACHE' || userLocation.warning) && (
        <p role="status" className="nearby-cache-notice">
          Using your last known location.{userLocation.isStale ? ' It may be out of date.' : ''}
        </p>
      )}

      {userLocation.loading && <p role="status" className="nearby-status-text">Finding your location...</p>}

      {!hasLocation && userLocation.error && (
        <div role="alert" className="nearby-error-box">
          <h2>Unable to determine your location.</h2>
          <p>{userLocation.error}</p>
          <button type="button" onClick={userLocation.refreshLocation}>Try Again</button>
        </div>
      )}

      {hasLocation && (
        <div className="nearby-layout">
          {/* Left Side: Map View */}
          <MapView
            latitude={latitude}
            longitude={longitude}
            devices={rawDevices}
            ownerGroups={ownerGroups}
            selectedOwnerKey={activeOwnerKey}
            selectedDeviceId={selectedDeviceId}
            onMarkerClick={handleMarkerClick}
          />

          {/* Right Side: Owner-Based Sidebar */}
          <aside className="nearby-sidebar" aria-label="Nearby device details">
            {/* Sticky Header & Filters Container */}
            <div className="nearby-sidebar-header-box">
              {/* 1. Header Title & Count of Nearby Owners */}
              <div className="nearby-sidebar-title-row">
                <div>
                  <h2 className="nearby-sidebar-title">Nearby Devices</h2>
                  <p className="nearby-sidebar-desc">Find devices available around your location.</p>
                </div>
                <span className="nearby-count-pill" aria-label={`${totalOwners} owners found`}>
                  {totalOwners} {totalOwners === 1 ? 'owner' : 'owners'}
                </span>
              </div>

              {/* 2. Search Radius Selector (1 km, 5 km, 10 km, 20 km) */}
              <div className="nearby-radius-control">
                <span className="nearby-control-label">
                  <Compass size={12} className="inline mr-1 text-slate-400" />
                  Radius:
                </span>
                <div className="nearby-radius-pills" role="radiogroup" aria-label="Search radius">
                  {RADIUS_OPTIONS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={`nearby-radius-pill ${radiusMeters === item.value ? 'is-active' : ''}`}
                      onClick={() => setRadiusMeters(item.value)}
                      aria-checked={radiusMeters === item.value}
                      role="radio"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Category Filter (Horizontal Scroll Pills) */}
              <div className="nearby-category-scroll-wrap" role="toolbar" aria-label="Category filters">
                {CATEGORIES.map((cat) => {
                  const isActive = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      className={`nearby-cat-pill ${isActive ? 'is-active' : ''}`}
                      onClick={() => setSelectedCategory(cat.id)}
                      aria-pressed={isActive}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* 4. Sort & Availability Filters Row */}
              <div className="nearby-subfilters-row">
                <div className="nearby-select-field">
                  <ArrowUpDown size={12} className="nearby-select-icon" />
                  <select
                    className="nearby-filter-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    aria-label="Sort options"
                  >
                    <option value="nearest">Nearest</option>
                    <option value="price_asc">Lowest Price</option>
                    <option value="rating_desc">Highest Rating</option>
                  </select>
                </div>

                <div className="nearby-select-field">
                  <SlidersHorizontal size={12} className="nearby-select-icon" />
                  <select
                    className="nearby-filter-select"
                    value={availabilityFilter}
                    onChange={(e) => setAvailabilityFilter(e.target.value)}
                    aria-label="Availability filter"
                  >
                    <option value="all">All Status</option>
                    <option value="available">Available Only</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Sidebar Body */}
            <div className="nearby-sidebar-body">
              {nearbyLoading && <p role="status" className="nearby-status-text">Loading nearby devices...</p>}

              {errorMessage && (
                <div role="alert" className="nearby-error-state">
                  <p>{errorMessage}</p>
                  <button type="button" onClick={() => setRetryAttempt((v) => v + 1)}>
                    Try Again
                  </button>
                </div>
              )}

              {!nearbyLoading && !errorMessage && rawDevices.length === 0 && (
                <div className="nearby-empty-state">
                  <p>No available devices within {radiusKm} km.</p>
                </div>
              )}

              {!nearbyLoading && !errorMessage && rawDevices.length > 0 && ownerGroups.length === 0 && (
                <div className="nearby-empty-state">
                  <p>No devices match the selected filters.</p>
                  <button
                    type="button"
                    className="nearby-reset-filter-btn"
                    onClick={() => {
                      setSelectedCategory('all');
                      setAvailabilityFilter('all');
                    }}
                  >
                    Reset filters
                  </button>
                </div>
              )}

              {/* Selected Owner Profile Card */}
              {selectedGroup && (
                <div className="nearby-owner-profile-card">
                  <div className="nearby-owner-card-header">
                    <span className="nearby-owner-badge">Selected Owner</span>
                    {selectedGroup.owner?.isVerified && (
                      <span className="nearby-owner-verified-pill">
                        <CheckCircle2 size={12} className="inline mr-1" />
                        Verified Owner
                      </span>
                    )}
                  </div>

                  <div className="nearby-owner-card-main">
                    <div className="nearby-owner-avatar-wrap">
                      <img
                        src={selectedGroup.owner?.avatar || DEFAULT_AVATAR}
                        alt={selectedGroup.owner?.name || 'Owner'}
                        className="nearby-owner-avatar"
                        onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
                      />
                    </div>

                    <div className="nearby-owner-details">
                      <h3 className="nearby-owner-name">
                        {selectedGroup.owner?.name || 'Rental Owner'}
                      </h3>

                      <div className="nearby-owner-rating-row">
                        <Star size={13} fill="#eab308" stroke="#eab308" className="nearby-star-icon" />
                        <strong className="nearby-owner-rating-val">
                          {Number(selectedGroup.owner?.rating || 5.0).toFixed(1)}
                        </strong>
                        <span className="nearby-owner-reviews-count">
                          ({selectedGroup.owner?.totalReviews || 0} reviews)
                        </span>
                      </div>

                      <div className="nearby-owner-meta-row">
                        <span className="nearby-owner-address">
                          <MapPin size={12} className="inline mr-1 text-slate-400" />
                          {selectedGroup.addressText}
                        </span>
                      </div>

                      <div className="nearby-owner-stats-bar">
                        <span className="nearby-owner-dist-tag">
                          📍 {Number.isFinite(selectedGroup.distanceMeters)
                            ? `${(selectedGroup.distanceMeters / 1000).toFixed(1)} km away`
                            : 'Nearby'}
                        </span>
                        <span className="nearby-owner-device-count-tag">
                          <Package size={12} className="inline mr-1 text-teal-600" />
                          {selectedGroup.availableCount} {selectedGroup.availableCount === 1 ? 'device' : 'devices'} available
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="nearby-owner-card-actions">
                    <button
                      type="button"
                      className="nearby-owner-view-btn"
                      onClick={handleScrollToDevices}
                    >
                      View Devices ({selectedGroup.devices.length})
                    </button>
                  </div>
                </div>
              )}

              {/* Owner's Device List */}
              {selectedGroup && (
                <div className="nearby-owner-devices-section" ref={devicesSectionRef}>
                  <div className="nearby-owner-devices-header">
                    <h3 className="nearby-owner-devices-title">
                      Devices by {selectedGroup.owner?.name || 'Owner'}
                      <span className="nearby-owner-devices-count">({selectedGroup.devices.length})</span>
                    </h3>
                    <span className="nearby-owner-devices-sub">Available at this location</span>
                  </div>

                  <ul className="nearby-device-list">
                    {selectedGroup.devices.map((dev) => {
                      const id = String(dev._id || dev.id);
                      const isSelected = id === selectedDeviceId;
                      const title = (dev.title || dev.name || 'Untitled Device').trim();
                      const rawPrice = dev.dailyRate ?? dev.pricePerDay;
                      const formattedPrice = typeof rawPrice === 'number'
                        ? `${formatPrice(rawPrice)} / day`
                        : 'Contact for price';
                      const distanceKm = Number.isFinite(dev.distanceMeters)
                        ? (dev.distanceMeters / 1000).toFixed(1)
                        : null;
                      const rating = dev.stats?.ratingAvg ?? dev.rating ?? dev.ratingAvg;
                      const reviewCount = dev.stats?.ratingCount ?? dev.reviewCount ?? dev.ratingCount ?? 0;
                      const categoryText = formatCategoryLabel(dev.category);
                      const conditionText = formatConditionLabel(dev.condition);
                      const imageUrl = Array.isArray(dev.images) && dev.images[0] ? dev.images[0] : null;
                      const isFav = wishlistIds.includes(id);

                      return (
                        <li
                          key={id}
                          id={`nearby-card-${id}`}
                          className={`nearby-card-item ${isSelected ? 'is-selected' : ''}`}
                          aria-label={isSelected ? 'Selected device' : undefined}
                          onClick={() => handleCardClick(id)}
                        >
                          {/* Left: Thumbnail Image (88px square) */}
                          <div className="nearby-card-thumb-wrap">
                            {imageUrl ? (
                              <img src={imageUrl} alt={title} className="nearby-card-thumb" loading="lazy" />
                            ) : (
                              <div className="nearby-card-fallback-thumb" aria-label="No image">
                                <ImageOff size={22} className="text-slate-400" />
                              </div>
                            )}
                            {conditionText && (
                              <span className="nearby-card-condition-pill">{conditionText}</span>
                            )}
                          </div>

                          {/* Right: Body & Information */}
                          <div className="nearby-card-body">
                            {/* Row 1: Category & Heart Wishlist Button */}
                            <div className="nearby-card-top-row">
                              <span className="nearby-card-category">{categoryText || 'Tech'}</span>
                              <button
                                type="button"
                                className={`nearby-card-heart-btn ${isFav ? 'is-fav' : ''}`}
                                onClick={(e) => handleToggleWishlist(e, id)}
                                aria-label={isFav ? 'Remove from wishlist' : 'Add to wishlist'}
                                title={isFav ? 'Remove from wishlist' : 'Add to wishlist'}
                              >
                                <Heart size={14} fill={isFav ? '#ef4444' : 'none'} stroke={isFav ? '#ef4444' : '#94a3b8'} />
                              </button>
                            </div>

                            {/* Row 2: Title */}
                            <h4 className="nearby-card-title" title={title}>{title}</h4>

                            {/* Row 3: Distance, Status & Rating */}
                            <div className="nearby-card-meta-line">
                              {distanceKm && (
                                <span className="nearby-card-distance">
                                  <MapPin size={11} className="nearby-card-icon" />
                                  {distanceKm} km away
                                </span>
                              )}
                              <span className="nearby-card-avail-badge">
                                <CheckCircle2 size={10} className="inline mr-0.5" />
                                Available
                              </span>
                              {rating && Number(rating) > 0 ? (
                                <span className="nearby-card-rating">
                                  <Star size={11} className="nearby-star-icon" fill="currentColor" />
                                  <strong>{Number(rating).toFixed(1)}</strong>
                                  {reviewCount > 0 && <span className="nearby-review-count">({reviewCount})</span>}
                                </span>
                              ) : null}
                            </div>

                            {/* Row 4: Price & Actions */}
                            <div className="nearby-card-bottom-row">
                              <span className="nearby-card-price">{formattedPrice}</span>
                              <div className="nearby-card-actions">
                                <Link
                                  to={ROUTES.DEVICE_DETAIL_PATH(id)}
                                  state={{ from: ROUTES.NEARBY }}
                                  className="nearby-card-details-link"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Details
                                </Link>
                                <Link
                                  to={ROUTES.BOOKING_CHECKOUT_PATH(id)}
                                  className="nearby-card-book-btn"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Book Now
                                </Link>
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Other Rental Owners Section (if multiple owners) */}
              {ownerGroups.length > 1 && (
                <div className="nearby-other-owners-section">
                  <h4 className="nearby-other-owners-heading">
                    Other Rental Owners Nearby ({ownerGroups.length - 1})
                  </h4>
                  <div className="nearby-other-owners-list">
                    {ownerGroups
                      .filter((g) => g.key !== activeOwnerKey)
                      .map((otherGroup) => (
                        <div
                          key={otherGroup.key}
                          className="nearby-other-owner-card"
                          onClick={() => handleOwnerSelect(otherGroup)}
                        >
                          <img
                            src={otherGroup.owner?.avatar || DEFAULT_AVATAR}
                            alt={otherGroup.owner?.name || 'Owner'}
                            className="nearby-other-owner-avatar"
                            onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
                          />
                          <div className="nearby-other-owner-info">
                            <div className="nearby-other-owner-name">
                              {otherGroup.owner?.name || 'Rental Owner'}
                              {otherGroup.owner?.isVerified && (
                                <CheckCircle2 size={12} className="inline ml-1 text-teal-600" />
                              )}
                            </div>
                            <div className="nearby-other-owner-meta">
                              <span>📍 {(otherGroup.distanceMeters / 1000).toFixed(1)} km</span>
                              <span>•</span>
                              <span>{otherGroup.devices.length} {otherGroup.devices.length === 1 ? 'device' : 'devices'}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="nearby-other-owner-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOwnerSelect(otherGroup);
                            }}
                          >
                            View
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default NearbyPage;
