import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  Smartphone,
  Laptop,
  Camera,
  Aperture,
  Headphones,
  Tablet,
  Gamepad2,
  Watch,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  PackageOpen,
  MapPin,
} from 'lucide-react';
import { deviceService } from '../services/deviceService.js';
import { DeviceGrid } from '../components/device/DeviceGrid.jsx';
import { HeroSection } from '../components/home/HeroSection';
import { STRINGS } from '../constants/strings';
import { MAGIC_NUMBERS } from '../constants/config';
import { useAuth } from '../context/AuthContext.jsx';
import {
  SUPPORTED_CITIES,
  getCityByKey,
  matchCityFromAddress,
  findClosestCity,
} from '../constants/cities.js';
import './HomePage.css';
import { useUserLocation } from '../hooks/useUserLocation';

const MAX_RECOMMENDATION_RETRIES = 10;
const MAX_RETRY_DELAY_MS = 15000;

const getCategories = () => [
  { id: 'all', label: STRINGS.home.categories.all, icon: Sparkles },
  { id: 'smartphone', label: STRINGS.home.categories.smartphone, icon: Smartphone },
  { id: 'laptop', label: STRINGS.home.categories.laptop, icon: Laptop },
  { id: 'camera', label: STRINGS.home.categories.camera, icon: Camera },
  { id: 'drone', label: STRINGS.home.categories.drone, icon: Aperture },
  { id: 'audio', label: STRINGS.home.categories.audio, icon: Headphones },
  { id: 'tablet', label: STRINGS.home.categories.tablet, icon: Tablet },
  { id: 'gaming', label: STRINGS.home.categories.gaming, icon: Gamepad2 },
  { id: 'accessory', label: STRINGS.home.categories.accessory, icon: Watch },
];

export const HomePage = () => {
  useEffect(() => {
    // Opening Home should reveal its hero, rather than restore a previous page's scroll position.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const { user } = useAuth();
  const browserLocation = useUserLocation();

  // Priority 1: User's explicitly selected city
  const [selectedCityKey, setSelectedCityKey] = useState(() => {
    try {
      return localStorage.getItem('techshare:selected-city') || null;
    } catch {
      return null;
    }
  });

  // Priority 2: User's saved profile location/city
  const userProfileCity = useMemo(() => {
    if (!user) return null;
    if (user.address) {
      const matched = matchCityFromAddress(user.address);
      if (matched) return matched;
    }
    if (Array.isArray(user.location?.coordinates) && user.location.coordinates.length === 2) {
      const [lng, lat] = user.location.coordinates;
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { key: 'profile', name: user.address || 'Saved Location', lat, lng };
      }
    }
    return null;
  }, [user]);

  // Determine active search location
  const location = useMemo(() => {
    // Priority 1: Explicitly selected city
    if (selectedCityKey) {
      const city = getCityByKey(selectedCityKey);
      if (city) {
        return {
          source: 'SELECTED',
          cityKey: city.key,
          cityName: city.name,
          latitude: city.lat,
          longitude: city.lng,
          revision: 0,
          loading: false,
          error: null,
          isExplicit: true,
          refreshLocation: browserLocation.refreshLocation,
          refreshing: browserLocation.refreshing,
          retry: browserLocation.retry,
        };
      }
    }

    // Priority 2: Saved profile location (when GPS is not active or as fallback)
    if (userProfileCity) {
      return {
        source: 'PROFILE',
        cityKey: userProfileCity.key,
        cityName: userProfileCity.name,
        latitude: userProfileCity.lat,
        longitude: userProfileCity.lng,
        revision: 0,
        loading: false,
        error: null,
        isProfile: true,
        refreshLocation: browserLocation.refreshLocation,
        refreshing: browserLocation.refreshing,
        retry: browserLocation.retry,
      };
    }

    // Priority 3: Current GPS location
    if (browserLocation.latitude != null && browserLocation.longitude != null) {
      const closestCity = findClosestCity(browserLocation.latitude, browserLocation.longitude);
      return {
        source: browserLocation.source || 'GPS',
        cityKey: closestCity?.key || 'gps',
        cityName: closestCity?.name || 'Current Location',
        latitude: browserLocation.latitude,
        longitude: browserLocation.longitude,
        warning: browserLocation.warning,
        isStale: browserLocation.isStale,
        revision: browserLocation.revision,
        loading: browserLocation.loading,
        error: browserLocation.error,
        refreshLocation: browserLocation.refreshLocation,
        refreshing: browserLocation.refreshing,
        retry: browserLocation.retry,
      };
    }

    return {
      source: 'NONE',
      cityKey: null,
      cityName: null,
      latitude: null,
      longitude: null,
      revision: browserLocation.revision,
      loading: browserLocation.loading,
      error: browserLocation.error,
      refreshLocation: browserLocation.refreshLocation,
      refreshing: browserLocation.refreshing,
      retry: browserLocation.retry,
    };
  }, [
    selectedCityKey,
    userProfileCity,
    browserLocation.latitude,
    browserLocation.longitude,
    browserLocation.source,
    browserLocation.warning,
    browserLocation.isStale,
    browserLocation.revision,
    browserLocation.loading,
    browserLocation.error,
    browserLocation.refreshLocation,
    browserLocation.refreshing,
    browserLocation.retry,
  ]);

  const locationKey = JSON.stringify([location.latitude, location.longitude, location.revision]);

  const handleCityChange = (e) => {
    const value = e.target.value;
    if (value === 'gps') {
      try {
        localStorage.removeItem('techshare:selected-city');
      } catch {}
      setSelectedCityKey(null);
    } else {
      try {
        localStorage.setItem('techshare:selected-city', value);
      } catch {}
      setSelectedCityKey(value);
    }
    setPageSelection(null);
    setLoading(true);
    setError(null);
  };

  const handleSelectQuickCity = (cityKey) => {
    try {
      localStorage.setItem('techshare:selected-city', cityKey);
    } catch {}
    setSelectedCityKey(cityKey);
    setPageSelection(null);
    setLoading(true);
    setError(null);
  };
  const [pageSelection, setPageSelection] = useState(null);
  const page = pageSelection?.locationKey === locationKey ? pageSelection.page : MAGIC_NUMBERS.HOME_RECOMMENDATIONS.INITIAL_PAGE;
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const handleCategoryChange = (category) => {
    if (category === selectedCategory) return;
    setSelectedCategory(category);
    setPageSelection(null);
    setLoading(true);
    setError(null);
  };

  // 400ms debounce when typing in search input
  useEffect(() => {
    const trimmedInput = searchInput.trim();
    if (trimmedInput === searchQuery) return;

    const timer = setTimeout(() => {
      setSearchQuery(trimmedInput);
      setPageSelection(null);
      setLoading(true);
      setError(null);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput, searchQuery]);

  const handleSearchChange = (value) => {
    setSearchInput(value);
  };

  const handleSearchSubmit = (keyword) => {
    const raw = typeof keyword === 'string' ? keyword : searchInput;
    const trimmed = raw.trim();
    setSearchInput(trimmed);
    if (trimmed !== searchQuery) {
      setSearchQuery(trimmed);
      setPageSelection(null);
      setLoading(true);
      setError(null);
    }
  };

  const handleClearSearch = () => {
    setSearchInput('');
    if (searchQuery !== '') {
      setSearchQuery('');
      setPageSelection(null);
      setLoading(true);
      setError(null);
    }
  };

  const changePage = (nextPage) => {
    if (busy || nextPage === page || nextPage < 1 || nextPage > pagination.totalPages) return;
    setLoading(true);
    setPageSelection({ locationKey, page: nextPage });
  };
  const [requestAttempt, setRequestAttempt] = useState(0);
  const pendingRequest = useRef(null);
  const recovery = useRef({ key: null, failures: 0 });
  const [retrying, setRetrying] = useState(false);
  const loadDevices = () => {
    recovery.current.failures = 0;
    if (location.error) location.retry();
    else { setLoading(true); setError(null); setRequestAttempt((value) => value + 1); }
  };

  useEffect(() => {
    let active = true;
    let retryTimer;
    if (location.latitude == null || location.longitude == null) {
      return () => { active = false; };
    }
    setError(null);
    setRetrying(false);
    setLoading(true);
    const recoveryKey = JSON.stringify([location.latitude, location.longitude, location.revision, selectedCategory, searchQuery, page]);
    if (recovery.current.key !== recoveryKey) recovery.current = { key: recoveryKey, failures: 0 };
    const key = JSON.stringify([location.latitude, location.longitude, location.revision, selectedCategory, searchQuery, page, requestAttempt]);
    // Reuse the in-flight request during StrictMode's setup/cleanup/setup cycle.
    if (pendingRequest.current?.key !== key) {
      pendingRequest.current = {
        key,
        promise: deviceService.getRecommendedDevices({
          lat: location.latitude, lng: location.longitude,
          page,
          limit: MAGIC_NUMBERS.HOME_RECOMMENDATIONS.PAGE_SIZE,
          ...(selectedCategory !== 'all' ? { category: selectedCategory } : {}),
          ...(searchQuery ? { q: searchQuery } : {}),
        }),
      };
    }
    async function loadRecommendedDevices() {
      try {
        const response = await pendingRequest.current.promise;
        if (!Array.isArray(response?.data) || response.data.length > MAGIC_NUMBERS.HOME_RECOMMENDATIONS.PAGE_SIZE) {
          throw new Error('Invalid recommendation response');
        }
        // Ignore older responses when the user changes category, location or page.
        if (!active) return;
        recovery.current.failures = 0;
        const total = response.pagination?.total ?? response.data.length;
        const totalPages = Math.max(1, Math.ceil(total / MAGIC_NUMBERS.HOME_RECOMMENDATIONS.PAGE_SIZE));
        setPagination({ total, totalPages });
        // Devices may become unavailable while the user is on the final page.
        if (page > totalPages) {
          setPageSelection({ locationKey, page: totalPages });
          return;
        }
        setDevices(response.data);
      } catch (requestError) {
        if (!active) return;
        const isConnectionError = requestError instanceof TypeError || requestError?.name === 'AbortError' ||
          [502, 503, 504].includes(requestError?.status);
        const defaultErrorMessage = searchQuery ? 'Unable to search devices.' : STRINGS.home.recommended.apiError;
        setError(isConnectionError ? STRINGS.home.recommended.connectionError : defaultErrorMessage);
        if (isConnectionError && recovery.current.failures < MAX_RECOMMENDATION_RETRIES) {
          // Atlas may need longer to reconnect than the first few startup requests.
          const delay = Math.min(1000 * (2 ** recovery.current.failures), MAX_RETRY_DELAY_MS);
          recovery.current.failures += 1;
          setRetrying(true);
          retryTimer = setTimeout(() => {
            if (active) setRequestAttempt(value => value + 1);
          }, delay);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadRecommendedDevices();
    return () => { active = false; clearTimeout(retryTimer); };
  }, [location.latitude, location.longitude, location.revision, locationKey, selectedCategory, searchQuery, page, requestAttempt]);

  useEffect(() => {
    // Recover when the network returns or the user revisits the tab after starting the backend.
    const recover = () => {
      if (!error || location.latitude == null || location.longitude == null || document.visibilityState === 'hidden') return;
      recovery.current.failures = 0;
      setRequestAttempt(value => value + 1);
    };
    window.addEventListener('online', recover);
    window.addEventListener('focus', recover);
    return () => {
      window.removeEventListener('online', recover);
      window.removeEventListener('focus', recover);
    };
  }, [error, location.latitude, location.longitude]);

  const busy = location.loading || (!location.error && loading);
  const displayError = location.error || error;
  const pageNumbers = Array.from(new Set([1, page - 1, page, page + 1, pagination.totalPages]))
    .filter(value => value >= 1 && value <= pagination.totalPages).sort((a, b) => a - b);

  return (
    <div className="home-page-root">
      {/* 1. Modern Hero Section with Subtle Grid, Glow Blobs & Trending Searches */}
      <HeroSection 
        searchInput={searchInput}
        onSearchChange={handleSearchChange}
        onSearchSubmit={handleSearchSubmit}
        onClearSearch={handleClearSearch}
        onSearch={handleSearchSubmit}
        initialQuery={searchInput}
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
                  onClick={() => handleCategoryChange(cat.id)}
                  aria-pressed={isActive}
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
            <div className="home-location-tools">
              <div className="home-city-selector-wrap" title="Search radius: 100km from selected city">
                <MapPin size={15} className="city-selector-icon" aria-hidden="true" />
                <select
                  id="home-city-select"
                  className="home-city-select"
                  aria-label="Select search city"
                  value={selectedCityKey || (location.cityKey !== 'profile' && location.cityKey ? location.cityKey : '') || ''}
                  onChange={handleCityChange}
                >
                  <option value="" disabled>Select city...</option>
                  {SUPPORTED_CITIES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.name} (100km)
                    </option>
                  ))}
                </select>
              </div>

              {(location.source === 'CACHE' || location.warning || location.isStale) && (
                <p role="status" className="home-location-notice"><MapPin size={21} />
                  {location.isStale ? STRINGS.home.recommended.staleLocation : STRINGS.home.recommended.lastKnownLocation}
                </p>
              )}
              {browserLocation.latitude != null && (
                <button type="button" className="state-retry-btn home-location-update" onClick={browserLocation.refreshLocation} disabled={browserLocation.refreshing}>
                  <RefreshCw size={14} /> {browserLocation.refreshing ? STRINGS.home.recommended.updatingLocation : STRINGS.home.recommended.updateLocation}
                </button>
              )}
            </div>
          </div>
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
              <div className="home-quick-city-select">
                <p className="quick-city-title">Select your city to explore devices within 100km:</p>
                <div className="quick-city-chips">
                  {SUPPORTED_CITIES.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      className="quick-city-btn"
                      onClick={() => handleSelectQuickCity(c.key)}
                    >
                      <MapPin size={12} /> {c.name}
                    </button>
                  ))}
                </div>
              </div>
              {retrying && <p role="status">{STRINGS.home.recommended.retrying}</p>}
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
          {!busy && !displayError && devices.length === 0 && (
            <div className="home-devices-state home-devices-empty">
              <div className="state-icon-circle state-empty-icon">
                <PackageOpen size={28} />
              </div>
              <h3 className="state-title">
                {searchQuery ? 'No devices found for your search.' : STRINGS.home.recommended.empty}
              </h3>
              <p className="state-desc">
                {searchQuery
                  ? `No matching devices found for "${searchQuery}". Try another keyword or clear search.`
                  : location.cityName
                    ? `No devices available within 100km of ${location.cityName}. Try selecting another city.`
                    : 'Try selecting another city to find available devices.'}
              </p>
              <div className="home-quick-city-select">
                <div className="quick-city-chips">
                  {SUPPORTED_CITIES.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      className={`quick-city-btn ${selectedCityKey === c.key ? 'active' : ''}`}
                      onClick={() => handleSelectQuickCity(c.key)}
                    >
                      <MapPin size={12} /> {c.name}
                    </button>
                  ))}
                </div>
              </div>
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="state-retry-btn"
                >
                  {STRINGS.home.devices.clearSearchBtn}
                </button>
              )}
            </div>
          )}

          {/* Success State */}
          {!busy && !displayError && devices.length > 0 && (
            <DeviceGrid
              devices={devices}
              userCoordinates={
                Number.isFinite(location.latitude) && Number.isFinite(location.longitude)
                  ? { lat: location.latitude, lng: location.longitude }
                  : null
              }
            />
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
