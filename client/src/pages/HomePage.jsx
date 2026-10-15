import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Smartphone,
  Laptop,
  Camera,
  Aperture,
  Headphones,
  Tablet,
  Watch,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  PackageOpen,
} from 'lucide-react';
import { deviceService } from '../services/deviceService.js';
import { DeviceGrid } from '../components/device/DeviceGrid.jsx';
import { HeroSection } from '../components/home/HeroSection';
import { STRINGS } from '../constants/strings';
import { MAGIC_NUMBERS } from '../constants/config';
import './HomePage.css';
import { useUserLocation } from '../hooks/useUserLocation';

const getCategories = () => [
  { id: 'all', label: STRINGS.home.categories.all, icon: Sparkles },
  { id: 'smartphone', label: STRINGS.home.categories.smartphone, icon: Smartphone },
  { id: 'laptop', label: STRINGS.home.categories.laptop, icon: Laptop },
  { id: 'camera', label: STRINGS.home.categories.camera, icon: Camera },
  { id: 'drone', label: STRINGS.home.categories.drone, icon: Aperture },
  { id: 'audio', label: STRINGS.home.categories.audio, icon: Headphones },
  { id: 'tablet', label: STRINGS.home.categories.tablet, icon: Tablet },
  { id: 'accessory', label: STRINGS.home.categories.accessory, icon: Watch },
];

export const HomePage = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredDevices = devices;

  const location = useUserLocation();
  const locationKey = JSON.stringify([location.latitude, location.longitude, location.revision]);
  const [pageSelection, setPageSelection] = useState(null);
  const page = pageSelection?.locationKey === locationKey ? pageSelection.page : MAGIC_NUMBERS.HOME_RECOMMENDATIONS.INITIAL_PAGE;
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const changePage = (nextPage) => {
    if (busy || nextPage === page || nextPage < 1 || nextPage > pagination.totalPages) return;
    setLoading(true);
    setPageSelection({ locationKey, page: nextPage });
  };
  const [requestAttempt, setRequestAttempt] = useState(0);
  const pendingRequest = useRef(null);
  const loadDevices = () => {
    if (location.error) location.retry();
    else { setLoading(true); setError(null); setRequestAttempt((value) => value + 1); }
  };

  useEffect(() => {
    let active = true;
    if (location.latitude == null || location.longitude == null) {
      return () => { active = false; };
    }
    setError(null);
    setLoading(true);
    const key = JSON.stringify([location.latitude, location.longitude, location.revision, page, requestAttempt]);
    // Reuse the in-flight request during StrictMode's setup/cleanup/setup cycle.
    if (pendingRequest.current?.key !== key) {
      pendingRequest.current = {
        key,
        promise: deviceService.getRecommendedDevices({
          lat: location.latitude, lng: location.longitude,
          page,
          limit: MAGIC_NUMBERS.HOME_RECOMMENDATIONS.PAGE_SIZE,
        }),
      };
    }
    pendingRequest.current.promise.then((res) => {
      if (!Array.isArray(res?.data) || res.data.length > MAGIC_NUMBERS.HOME_RECOMMENDATIONS.PAGE_SIZE) throw new Error('Invalid recommendation response');
      if (active) {
        const total = res.pagination?.total ?? res.data.length;
        const totalPages = Math.max(1, Math.ceil(total / MAGIC_NUMBERS.HOME_RECOMMENDATIONS.PAGE_SIZE));
        setPagination({ total, totalPages });
        // The final page can disappear if devices become unavailable between requests.
        if (page > totalPages) {
          setPageSelection({ locationKey: JSON.stringify([location.latitude, location.longitude, location.revision]), page: totalPages });
          return;
        }
        setDevices(res.data);
      }
    }).catch(() => {
      if (active) setError(STRINGS.home.recommended.apiError);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [location.latitude, location.longitude, location.revision, page, requestAttempt]);

  const busy = location.loading || (!location.error && loading);
  const displayError = location.error || error;
  const pageNumbers = Array.from(new Set([1, page - 1, page, page + 1, pagination.totalPages]))
    .filter(value => value >= 1 && value <= pagination.totalPages).sort((a, b) => a - b);

  return (
    <div className="home-page-root">
      {/* 1. Modern Hero Section with Subtle Grid, Glow Blobs & Trending Searches */}
      <HeroSection 
        onSearch={(term) => setSearchTerm(term)} 
        initialQuery={searchTerm}
      />

      {/* 2. Category Area */}
      <section className="home-category-section" aria-labelledby="categories-heading">
        <div className="home-category-inner">
          <div className="home-category-header">
            <h2 id="categories-heading" className="home-section-title">
              {STRINGS.home.categories.heading}
            </h2>
          </div>

          <div
            className="home-category-list"
            role="toolbar"
            aria-label={STRINGS.home.categories.heading}
          >
            {getCategories().map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`home-category-chip ${isActive ? 'active' : ''}`}
                >
                  <div className="category-chip-icon">
                    <Icon size={18} />
                  </div>
                  <span className="category-chip-label">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Devices Section with Real API Integration */}
      <section className="home-devices-section" aria-labelledby="devices-heading">
        <div className="home-devices-inner">
          <div className="home-devices-header">
            <div>
              <h2 id="devices-heading" className="home-devices-title">
                {STRINGS.home.recommended.heading}
              </h2>
              <p className="home-devices-subtitle">
                {STRINGS.home.recommended.subtitle}
              </p>
            </div>
          </div>

          {(location.source === 'CACHE' || location.warning || location.isStale) && (
            <p role="status">
              {location.isStale ? STRINGS.home.recommended.staleLocation : STRINGS.home.recommended.lastKnownLocation}
            </p>
          )}
          {location.latitude != null && (
            <button type="button" className="state-retry-btn" onClick={location.refreshLocation} disabled={location.refreshing}>
              <RefreshCw size={14} /> {location.refreshing ? STRINGS.home.recommended.updatingLocation : STRINGS.home.recommended.updateLocation}
            </button>
          )}
          {busy && <p role="status">{location.loading ? STRINGS.home.recommended.locationLoading : STRINGS.home.recommended.apiLoading}</p>}
          {/* Loading State */}
          {busy && (
            <div className="devices-loading-grid" aria-label={location.loading ? STRINGS.home.recommended.locationLoading : STRINGS.home.recommended.apiLoading}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="skeleton-card" aria-hidden="true">
                  <div className="skeleton-thumb" />
                  <div className="skeleton-body">
                    <div className="skeleton-line line-title" />
                    <div className="skeleton-line line-price" />
                    <div className="skeleton-line line-footer" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {!busy && displayError && (
            <div className="home-devices-state home-devices-error">
              <div className="state-icon-circle state-error-icon">
                <AlertCircle size={28} />
              </div>
              <h3 className="state-title">{location.error ? STRINGS.home.nearby.locationError : STRINGS.home.recommended.apiError}</h3>
              <p className="state-desc">{displayError}</p>
              <button
                type="button"
                onClick={loadDevices}
                className="state-retry-btn"
              >
                <RefreshCw size={14} /> {STRINGS.home.devices.tryAgainBtn}
              </button>
            </div>
          )}

          {/* Empty State */}
          {!busy && !displayError && filteredDevices.length === 0 && (
            <div className="home-devices-state home-devices-empty">
              <div className="state-icon-circle state-empty-icon">
                <PackageOpen size={28} />
              </div>
              <h3 className="state-title">{STRINGS.home.recommended.empty}</h3>
            </div>
          )}

          {/* Success State */}
          {!busy && !displayError && filteredDevices.length > 0 && (
            <DeviceGrid devices={filteredDevices} />
          )}
          {!displayError && pagination.totalPages > 1 && (
            <nav className="home-pagination" aria-label={STRINGS.home.recommended.paginationLabel}>
              <p className="home-pagination-summary" role="status">
                {STRINGS.home.recommended.pageLabel} {page} / {pagination.totalPages}
                {' · '}{pagination.total} {STRINGS.home.recommended.devicesLabel}
              </p>
              <div className="home-pagination-controls">
                <button type="button" onClick={() => changePage(page - 1)} disabled={busy || page === 1}>
                  <ChevronLeft size={16} /> {STRINGS.home.recommended.previousPage}
                </button>
                {pageNumbers.map((value, index) => (
                  <React.Fragment key={value}>
                    {index > 0 && value - pageNumbers[index - 1] > 1 && <span aria-hidden="true">…</span>}
                    <button type="button" aria-label={`${STRINGS.home.recommended.pageLabel} ${value}`}
                      aria-current={page === value ? 'page' : undefined} disabled={busy}
                      onClick={() => changePage(value)}>{value}</button>
                  </React.Fragment>
                ))}
                <button type="button" onClick={() => changePage(page + 1)} disabled={busy || page === pagination.totalPages}>
                  {STRINGS.home.recommended.nextPage} <ChevronRight size={16} />
                </button>
              </div>
            </nav>
          )}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
