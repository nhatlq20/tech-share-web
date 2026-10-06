import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
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
import { deviceService } from '../services/deviceService.ts';
import { DeviceGrid } from '../components/device/DeviceGrid.jsx';
import './HomePage.css';

const CATEGORIES = [
  { id: 'all', label: 'All', icon: Sparkles },
  { id: 'smartphone', label: 'Smartphones', icon: Smartphone },
  { id: 'laptop', label: 'Laptops', icon: Laptop },
  { id: 'camera', label: 'Cameras', icon: Camera },
  { id: 'drone', label: 'Drones', icon: Aperture },
  { id: 'audio', label: 'Audio', icon: Headphones },
  { id: 'tablet', label: 'Tablets', icon: Tablet },
  { id: 'accessory', label: 'Accessories', icon: Watch },
];

export const HomePage = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const categoryScrollRef = useRef(null);

  const handleScroll = (direction) => {
    if (categoryScrollRef.current) {
      categoryScrollRef.current.scrollBy({
        left: direction === 'left' ? -220 : 220,
        behavior: 'smooth',
      });
    }
  };

  /**
   * Fetches the default list of devices from the backend.
   */
  const loadDevices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await deviceService.getDevices();
      if (!Array.isArray(res?.data)) {
        throw new Error('Invalid device list response from server');
      }
      setDevices(res.data);
    } catch (err) {
      setError(err?.message || 'Unable to load devices.');
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const executeInitialLoad = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await deviceService.getDevices();
        if (isMounted) {
          if (!Array.isArray(res?.data)) {
            throw new Error('Invalid device list response from server');
          }
          setDevices(res.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.message || 'Unable to load devices.');
          setDevices([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    executeInitialLoad();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="home-page-root">
      {/* 1. Hero / Page Heading */}
      <section className="home-hero-section">
        <div className="home-hero-content">
          <span className="home-hero-badge">
            <Sparkles size={13} /> #1 Tech Sharing Platform
          </span>
          <h1 className="home-hero-title">Discover Devices</h1>
          <p className="home-hero-subtitle">
            Find the right tech device for your needs. High-quality gadgets, flexible rentals, and nearby availability.
          </p>

          {/* Floating Badges */}
          <div className="floating-badge badge-left">
            <span>📷</span> Sony A7 IV Camera
          </div>
          <div className="floating-badge badge-right">
            <span>💻</span> MacBook Pro M3 Max
          </div>
        </div>

        {/* 2. Search Area (UI Shell Only) */}
        <div className="home-search-wrapper">
          <form className="home-search-bar" onSubmit={(e) => e.preventDefault()} role="search">
            <div className="home-search-field">
              <Search size={18} className="search-icon" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search devices..."
                aria-label="Search devices"
                readOnly
              />
            </div>
            <button
              type="button"
              className="home-search-submit-btn"
              aria-label="Search"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      {/* 3. Category Area (UI Only) */}
      <section className="home-category-section" aria-labelledby="categories-heading">
        <div className="home-category-inner">
          <div className="home-category-header">
            <h2 id="categories-heading" className="home-section-title">
              Categories
            </h2>
            <div className="category-scroll-arrows">
              <button
                type="button"
                onClick={() => handleScroll('left')}
                className="category-scroll-btn"
                aria-label="Scroll categories left"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleScroll('right')}
                className="category-scroll-btn"
                aria-label="Scroll categories right"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div
            ref={categoryScrollRef}
            className="home-category-list"
            role="toolbar"
            aria-label="Device categories"
          >
            {CATEGORIES.map((cat, index) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`home-category-chip ${index === 0 ? 'active' : ''}`}
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

      {/* 4. Devices Section with Real API Integration */}
      <section className="home-devices-section" aria-labelledby="devices-heading">
        <div className="home-devices-inner">
          <div className="home-devices-header">
            <div>
              <h2 id="devices-heading" className="home-devices-title">
                Devices
              </h2>
              <p className="home-devices-subtitle">
                Explore available tech devices ready for rent
              </p>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="devices-loading-grid" aria-label="Loading devices">
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
          {!loading && error && (
            <div className="home-devices-state home-devices-error">
              <div className="state-icon-circle state-error-icon">
                <AlertCircle size={28} />
              </div>
              <h3 className="state-title">Unable to load devices.</h3>
              <p className="state-desc">{error}</p>
              <button
                type="button"
                onClick={loadDevices}
                className="state-retry-btn"
              >
                <RefreshCw size={14} /> Try Again
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && devices.length === 0 && (
            <div className="home-devices-state home-devices-empty">
              <div className="state-icon-circle state-empty-icon">
                <PackageOpen size={28} />
              </div>
              <h3 className="state-title">No devices found.</h3>
              <p className="state-desc">
                Try again later or explore another category.
              </p>
            </div>
          )}

          {/* Success State */}
          {!loading && !error && devices.length > 0 && (
            <DeviceGrid devices={devices} />
          )}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
