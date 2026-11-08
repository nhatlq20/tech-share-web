import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Trash2,
  RefreshCw,
  Compass,
  ChevronRight,
  Sparkles,
  ArrowLeftRight,
  SlidersHorizontal,
  Inbox,
} from 'lucide-react';
import { ROUTES } from '../routes/routes.js';
import { useAuth } from '../context/AuthContext.jsx';
import { DeviceCard } from '../components/device/DeviceCard.jsx';
import {
  fetchWishlist,
  clearAllWishlist,
  WISHLIST_UPDATED_EVENT,
} from '../services/wishlistService.js';
import { getDevices } from '../services/deviceService.js';

const CATEGORY_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'smartphone', label: 'Smartphone' },
  { key: 'laptop', label: 'Laptop' },
  { key: 'camera', label: 'Camera' },
  { key: 'drone', label: 'Drone' },
  { key: 'audio', label: 'Audio' },
  { key: 'tablet', label: 'Tablet' },
  { key: 'accessory', label: 'Accessories' },
];

export const WishlistPage = () => {
  const { user, isAuthenticated } = useAuth();

  const [devices, setDevices] = useState([]);
  const [suggestedDevices, setSuggestedDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  const loadWishlistData = useCallback(async ({ silent = false, signal } = {}) => {
    try {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      const result = await fetchWishlist({ mergeLocal: true, signal });
      if (signal?.aborted) return;
      setDevices(Array.isArray(result.devices) ? result.devices : []);
    } catch (err) {
      if (signal?.aborted) return;
      console.warn('[WishlistPage] Error loading wishlist:', err?.message);
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadWishlistData({ signal: controller.signal });
    return () => controller.abort();
  }, [loadWishlistData, user?._id, isAuthenticated]);

  // Load featured devices for quick discovery when the wishlist is empty
  useEffect(() => {
    let mounted = true;
    getDevices({ limit: 4 })
      .then((res) => {
        if (mounted && Array.isArray(res?.data)) {
          setSuggestedDevices(res.data.slice(0, 4));
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Listen for favorite updates across cards
  useEffect(() => {
    const handleWishlistUpdated = (e) => {
      const updatedIds = e?.detail?.wishlistIds;
      if (Array.isArray(updatedIds)) {
        setDevices((prev) => {
          const filtered = prev.filter((d) => updatedIds.includes(String(d._id || d.id)));
          if (updatedIds.length > filtered.length) {
            loadWishlistData({ silent: true });
          }
          return filtered;
        });
      }
    };

    window.addEventListener(WISHLIST_UPDATED_EVENT, handleWishlistUpdated);
    return () => window.removeEventListener(WISHLIST_UPDATED_EVENT, handleWishlistUpdated);
  }, [loadWishlistData]);

  const handleFavoriteChange = useCallback(
    (deviceId, isFav, responseData) => {
      if (Array.isArray(responseData?.devices)) {
        setDevices(responseData.devices);
      } else if (!isFav) {
        setDevices((prev) => prev.filter((d) => String(d._id || d.id) !== String(deviceId)));
      } else {
        loadWishlistData({ silent: true });
      }
    },
    [loadWishlistData]
  );

  const handleClearAll = async () => {
    if (devices.length === 0) return;
    if (!window.confirm('Are you sure you want to remove all devices from your Wishlist?')) {
      return;
    }
    await clearAllWishlist();
    setDevices([]);
  };

  const filteredDevices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = devices.filter((d) => {
      const matchCat =
        selectedCategory === 'all' ||
        String(d.category || '').toLowerCase() === selectedCategory;
      const title = String(d.title || d.name || '').toLowerCase();
      const brand = String(d.brand || '').toLowerCase();
      const matchSearch = !q || title.includes(q) || brand.includes(q);
      return matchCat && matchSearch;
    });

    if (sortBy === 'price_asc') {
      list = [...list].sort(
        (a, b) => (a.dailyRate ?? a.pricePerDay ?? 0) - (b.dailyRate ?? b.pricePerDay ?? 0)
      );
    } else if (sortBy === 'price_desc') {
      list = [...list].sort(
        (a, b) => (b.dailyRate ?? b.pricePerDay ?? 0) - (a.dailyRate ?? a.pricePerDay ?? 0)
      );
    } else if (sortBy === 'rating') {
      list = [...list].sort(
        (a, b) =>
          (b.stats?.ratingAvg ?? b.rating ?? 0) - (a.stats?.ratingAvg ?? a.rating ?? 0)
      );
    }

    return list;
  }, [devices, searchQuery, selectedCategory, sortBy]);

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 mb-4" aria-label="Breadcrumb">
          <Link to={ROUTES.HOME} className="hover:text-brand-600 transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          <span className="text-brand-600 font-semibold">Wishlist</span>
        </nav>

        {/* Compact Page Header (synced with MyBookingsPage style) */}
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Wishlist
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-100 text-brand-700">
                {devices.length} {devices.length === 1 ? 'device' : 'devices'}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Saved devices for quick comparison and rental booking.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => loadWishlistData({ silent: true })}
              disabled={isLoading || isRefreshing}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-slate-600 text-xs font-semibold shadow-sm hover:text-brand-600 transition-colors disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            <Link
              to={ROUTES.COMPARE_DEVICES}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-slate-600 text-xs font-semibold shadow-sm hover:text-brand-600 transition-colors"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Compare Devices</span>
            </Link>

            {devices.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-red-600 text-xs font-semibold shadow-sm hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </header>

        {/* Compact Category Tabs & Search Toolbar */}
        {devices.length > 0 && (
          <div className="bg-white rounded-2xl p-2.5 shadow-sm border border-slate-100 mb-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5">
            {/* Category Pills (matching MyBookingsPage tab style) */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
              {CATEGORY_FILTERS.map((cat) => {
                const active = selectedCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                      active
                        ? 'bg-brand-100 text-brand-700 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Search & Sort */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search saved devices..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-full border border-slate-200 bg-slate-50/70 text-xs focus:bg-white focus:border-brand-500 focus:outline-none transition"
                />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50/70 text-xs text-slate-600">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent font-semibold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="recent">Recently Saved</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="bg-white rounded-2xl border border-slate-100 p-4 h-64 animate-pulse flex flex-col justify-between"
              >
                <div className="w-full h-36 rounded-xl bg-slate-100" />
                <div className="space-y-2">
                  <div className="w-2/3 h-3.5 rounded bg-slate-100" />
                  <div className="w-1/2 h-3 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Saved Devices Grid */}
        {!isLoading && devices.length > 0 && (
          <>
            {filteredDevices.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-100">
                <p className="text-sm font-bold text-slate-700">
                  No saved devices match your current filter.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                  className="mt-3 px-4 py-2 rounded-full bg-brand-50 text-brand-700 text-xs font-bold hover:bg-brand-100 transition"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredDevices.map((device) => (
                  <DeviceCard
                    key={String(device._id || device.id)}
                    device={device}
                    onFavoriteChange={handleFavoriteChange}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Empty State (synced with MyBookingsPage empty panel) */}
        {!isLoading && devices.length === 0 && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm p-10 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-brand-50 text-brand-500 flex items-center justify-center mb-3">
                <Inbox className="w-7 h-7" aria-hidden="true" />
              </div>
              <h2 className="text-base font-bold text-slate-800">
                Your Wishlist is Empty
              </h2>
              <p className="text-sm text-slate-500 mt-1 max-w-md">
                Save your favorite devices while browsing to compare specs and book them anytime.
              </p>
              <Link
                to={ROUTES.HOME}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 shadow-sm transition-colors"
              >
                <Compass className="w-4 h-4" aria-hidden="true" />
                <span>Explore Devices</span>
              </Link>
            </div>

            {/* Suggested Devices Section */}
            {suggestedDevices.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-brand-500" />
                    <span>Recommended Devices</span>
                  </h3>
                  <Link
                    to={ROUTES.HOME}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                  >
                    <span>View all</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {suggestedDevices.map((dev) => (
                    <DeviceCard
                      key={dev._id || dev.id}
                      device={dev}
                      onFavoriteChange={handleFavoriteChange}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WishlistPage;
