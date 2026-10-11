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

  const categoryScrollRef = useRef(null);

  const filteredDevices = devices;

  const handleScroll = (direction) => {
    if (categoryScrollRef.current) {
      categoryScrollRef.current.scrollBy({
        left: direction === 'left' ? -220 : 220,
        behavior: 'smooth',
      });
    }
  };

  const location = useUserLocation();
  const [requestAttempt, setRequestAttempt] = useState(0);
  const loadDevices = () => {
    if (location.error) location.retry();
    else { setLoading(true); setError(null); setRequestAttempt((value) => value + 1); }
  };

  useEffect(() => {
    let active = true;
    setDevices([]);
    setError(null);
    setLoading(true);
    if (location.loading || location.error || location.latitude == null || location.longitude == null) {
      return () => { active = false; };
    }
    deviceService.getRecommendedDevices({
      lat: location.latitude, lng: location.longitude,
      page: MAGIC_NUMBERS.HOME_RECOMMENDATIONS.INITIAL_PAGE,
      limit: MAGIC_NUMBERS.HOME_RECOMMENDATIONS.PAGE_SIZE,
    }).then((res) => {
      if (!Array.isArray(res?.data) || res.data.length > MAGIC_NUMBERS.HOME_RECOMMENDATIONS.PAGE_SIZE) throw new Error('Invalid recommendation response');
      if (active) setDevices(res.data);
    }).catch(() => {
      if (active) setError(STRINGS.home.recommended.apiError);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [location.latitude, location.longitude, location.loading, location.error, requestAttempt]);

  const busy = location.loading || (!location.error && loading);
  const displayError = location.error || error;

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
            <div className="category-scroll-arrows">
              <button
                type="button"
                onClick={() => handleScroll('left')}
                className="category-scroll-btn"
                aria-label={STRINGS.home.categories.scrollLeftAria}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleScroll('right')}
                className="category-scroll-btn"
                aria-label={STRINGS.home.categories.scrollRightAria}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div
            ref={categoryScrollRef}
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
        </div>
      </section>
    </div>
  );
};

export default HomePage;
