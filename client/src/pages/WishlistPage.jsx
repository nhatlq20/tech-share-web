import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  Search,
  Trash2,
  RefreshCw,
  Compass,
  ChevronRight,
  Calendar,
  Sparkles,
  ArrowLeftRight,
  SlidersHorizontal,
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
  { key: 'camera', label: 'Camera' },
  { key: 'laptop', label: 'Laptop' },
  { key: 'smartphone', label: 'Smartphone' },
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
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6" aria-label="Breadcrumb">
          <Link to={ROUTES.HOME} className="hover:text-brand-600 transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          <span className="text-rose-600 font-semibold">Wishlist</span>
        </nav>

        {/* Hero Header Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-rose-100 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center shadow-md shrink-0">
              <Heart className="w-7 h-7 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  My Wishlist
                </h1>
                <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-extrabold bg-rose-50 text-rose-600 border border-rose-200">
                  {devices.length} {devices.length === 1 ? 'device' : 'devices'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Keep track of your favorite tech devices, compare specs with AI, and book whenever you are ready.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            <button
              type="button"
              onClick={() => loadWishlistData({ silent: true })}
              disabled={isLoading || isRefreshing}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <Link
              to={ROUTES.COMPARE_DEVICES}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Compare Devices</span>
            </Link>

            {devices.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter & Search Bar */}
        {devices.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1 lg:pb-0">
              {CATEGORY_FILTERS.map((cat) => {
                const active = selectedCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
                      active
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Search & Sort */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search saved devices..."
                  className="w-full pl-9 pr-3.5 py-2 rounded-full border border-slate-200 text-xs focus:border-rose-400 focus:outline-none"
                />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-xs text-slate-600">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="bg-white rounded-2xl border border-slate-100 p-4 h-72 animate-pulse flex flex-col justify-between"
              >
                <div className="w-full h-40 rounded-xl bg-slate-100" />
                <div className="space-y-2">
                  <div className="w-2/3 h-4 rounded bg-slate-100" />
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
              <div className="bg-white rounded-3xl p-10 text-center border border-slate-100 shadow-xs">
                <p className="text-sm font-bold text-slate-700">
                  No saved devices match your current filter.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                  className="mt-3 px-4 py-2 rounded-full bg-rose-50 text-rose-600 text-xs font-bold hover:bg-rose-100 transition"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {filteredDevices.map((device) => {
                  const devId = String(device._id || device.id);
                  return (
                    <div key={devId} className="flex flex-col gap-2">
                      <div className="flex-1">
                        <DeviceCard
                          device={device}
                          onFavoriteChange={handleFavoriteChange}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={ROUTES.BOOKING_CHECKOUT_PATH(devId)}
                          className="flex-1 py-2 px-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Rent Now</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleFavoriteChange(devId, false)}
                          aria-label="Remove from wishlist"
                          title="Remove from Wishlist"
                          className="py-2 px-3 rounded-xl bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 text-xs font-semibold flex items-center justify-center gap-1 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!isLoading && devices.length === 0 && (
          <div className="space-y-8">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-10 sm:p-14 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-4 border border-rose-100">
                <Heart className="w-10 h-10" />
              </div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Your Wishlist is Empty
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-md leading-relaxed">
                Click the heart icon <Heart className="w-3.5 h-3.5 inline text-rose-500 fill-current mx-0.5" /> on the top-right corner of any device card to save it here for quick access.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to={ROUTES.EXPLORE}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-brand-500 hover:bg-brand-600 text-white text-xs sm:text-sm font-bold shadow-sm transition"
                >
                  <Compass className="w-4 h-4" />
                  <span>Explore Devices</span>
                </Link>
                <Link
                  to={ROUTES.NEARBY}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold transition"
                >
                  <span>Find Nearby Devices</span>
                </Link>
              </div>
            </div>

            {/* Suggested Devices Section */}
            {suggestedDevices.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    <span>Recommended for You — Click the heart icon to save</span>
                  </h3>
                  <Link
                    to={ROUTES.EXPLORE}
                    className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                  >
                    <span>View all</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
