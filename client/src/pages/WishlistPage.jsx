import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Heart,
  HeartOff,
  Compass,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  LayoutGrid,
  List,
  Star,
  MapPin,
  Images,
  RefreshCw,
} from 'lucide-react';
import { ROUTES } from '../routes/routes.js';
import { useAuth } from '../context/AuthContext.jsx';
import { STRINGS } from '../constants/strings.js';
import {
  fetchWishlist,
  toggleWishlist,
  WISHLIST_UPDATED_EVENT,
} from '../services/wishlistService.js';

const DEFAULT_DEVICE_IMAGE =
  'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400';

const resolveDeviceImageUrl = (raw) => {
  if (!raw || typeof raw !== 'string') return DEFAULT_DEVICE_IMAGE;
  return raw;
};

const getDeviceSpecsList = (specs) => {
  if (!specs) return [];
  if (Array.isArray(specs)) {
    return specs
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          return item.value || item.label || '';
        }
        return '';
      })
      .filter(Boolean)
      .slice(0, 3);
  }
  if (typeof specs === 'object') {
    return Object.entries(specs)
      .filter(([key, val]) => val && key !== '_id' && typeof val !== 'object')
      .map(([, val]) => String(val))
      .slice(0, 3);
  }
  return [];
};

export const WishlistPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [togglingIds, setTogglingIds] = useState({});

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

  // Listen for favorite updates across other pages/components
  useEffect(() => {
    const handleWishlistUpdated = (e) => {
      const updatedIds = e?.detail?.wishlistIds;
      if (Array.isArray(updatedIds)) {
        setDevices((prev) => {
          const filtered = prev.filter((d) =>
            updatedIds.includes(String(d._id || d.id))
          );
          if (updatedIds.length > filtered.length) {
            loadWishlistData({ silent: true });
          }
          return filtered;
        });
      }
    };

    window.addEventListener(WISHLIST_UPDATED_EVENT, handleWishlistUpdated);
    return () =>
      window.removeEventListener(WISHLIST_UPDATED_EVENT, handleWishlistUpdated);
  }, [loadWishlistData]);

  const handleRemoveFromWishlist = async (e, deviceId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!deviceId || togglingIds[deviceId]) return;

    const idStr = String(deviceId);
    setTogglingIds((prev) => ({ ...prev, [idStr]: true }));

    // Optimistic remove matching App behavior
    setDevices((prev) =>
      prev.filter((item) => String(item._id || item.id) !== idStr)
    );

    try {
      const res = await toggleWishlist(idStr, 'remove');
      if (Array.isArray(res?.devices)) {
        setDevices(res.devices);
      }
    } catch {
      loadWishlistData({ silent: true });
    } finally {
      setTogglingIds((prev) => {
        const next = { ...prev };
        delete next[idStr];
        return next;
      });
    }
  };

  const renderGridCard = (item) => {
    const id = String(item._id || item.id || '');
    const detailPath = id ? ROUTES.DEVICE_DETAIL_PATH(id) : ROUTES.HOME;
    const name = item.name || item.title || '';
    const brand = item.brand || STRINGS.WISHLIST.DEFAULT_BRAND;
    const category = item.category || '';
    const rawImages = Array.isArray(item.images) ? item.images : [];
    const imageUrl = resolveDeviceImageUrl(
      rawImages[0] || item.image || item.thumbnail || ''
    );
    const price = Number(item.pricePerDay ?? item.dailyRate ?? 0);
    const statusKey = String(item.status || 'available').toLowerCase();
    const isAvailable = statusKey === 'available';
    const statusLabel =
      STRINGS.DEVICE_CARD.STATUS_LABELS[statusKey] ||
      (isAvailable ? STRINGS.WISHLIST.AVAILABLE : STRINGS.WISHLIST.RENTED);

    const ratingVal = Number(item.rating ?? item.stats?.ratingAvg ?? 5.0).toFixed(1);
    const reviewCount = Number(item.reviewCount ?? item.stats?.reviewCount ?? 0);
    const addressText = item.address || item.location?.addressText || '';
    const specList = getDeviceSpecsList(item.specs);

    return (
      <Link
        key={id}
        to={detailPath}
        className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-brand-200 transition-all duration-200 overflow-hidden flex flex-col justify-between"
      >
        <div>
          {/* Image Section */}
          <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
            <img
              src={imageUrl}
              alt={name}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />

            {/* Top Overlay: Brand Badge + Heart Remove Button */}
            <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2">
              <span className="px-2.5 py-1 rounded-md bg-white/95 backdrop-blur-xs text-[10px] font-extrabold text-brand-600 uppercase tracking-wider shadow-2xs">
                {brand}
              </span>

              <button
                type="button"
                onClick={(e) => handleRemoveFromWishlist(e, id)}
                disabled={Boolean(togglingIds[id])}
                aria-label={STRINGS.WISHLIST.TITLE}
                className="w-8 h-8 rounded-full bg-white/95 backdrop-blur-xs flex items-center justify-center text-red-500 hover:bg-red-50 shadow-sm transition-transform active:scale-90 cursor-pointer"
              >
                <Heart className="w-4 h-4 fill-red-500 text-red-500" />
              </button>
            </div>

            {/* Bottom Overlay: Status Badge + Image Count Badge */}
            <div className="absolute bottom-2.5 inset-x-3 flex items-center justify-between gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold backdrop-blur-xs shadow-2xs ${
                  isAvailable
                    ? 'bg-emerald-50/95 text-emerald-700'
                    : 'bg-amber-50/95 text-amber-700'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isAvailable ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                <span>{statusLabel}</span>
              </span>

              {rawImages.length > 1 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900/65 text-white text-[10px] font-bold">
                  <Images className="w-3 h-3" />
                  <span>{rawImages.length}</span>
                </span>
              )}
            </div>
          </div>

          {/* Card Content */}
          <div className="p-4 pb-3">
            <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug min-h-[2.5rem] group-hover:text-brand-600 transition-colors">
              {name}
            </h3>

            {/* Category & Rating Row */}
            <div className="flex items-center justify-between gap-2 mt-2">
              <span className="text-xs font-medium text-slate-500 capitalize truncate">
                {category}
              </span>

              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-xs font-bold shrink-0">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>{ratingVal}</span>
                {reviewCount > 0 && (
                  <span className="text-[11px] font-medium text-slate-400">
                    ({reviewCount})
                  </span>
                )}
              </div>
            </div>

            {/* Location Row (if present) */}
            {addressText && (
              <div className="flex items-center gap-1 text-xs text-slate-400 mt-1.5">
                <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                <span className="truncate">{addressText}</span>
              </div>
            )}

            {/* Specs Pills (matching App DeviceCard) */}
            {specList.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {specList.map((spec, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium truncate max-w-[9rem]"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Price Footer (matching App Wishlist & DeviceCard) */}
        <div className="px-4 py-3 border-t border-slate-100 flex items-end justify-between gap-2 bg-slate-50/40">
          <div>
            <span className="block text-[10px] font-medium text-slate-400">
              {STRINGS.WISHLIST.DAILY_RATE}
            </span>
            <div className="flex items-baseline gap-0.5 mt-0.5">
              <span className="text-sm font-extrabold text-brand-600">
                {price.toLocaleString('en-US')}
                {STRINGS.WISHLIST.CURRENCY_VND}
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                {STRINGS.WISHLIST.PER_DAY}
              </span>
            </div>
          </div>

          <span className="w-8 h-8 rounded-full bg-brand-500 group-hover:bg-brand-600 text-white flex items-center justify-center shadow-xs transition-colors shrink-0">
            <ArrowRight className="w-4 h-4" />
          </span>
        </div>
      </Link>
    );
  };

  const renderListCard = (item) => {
    const id = String(item._id || item.id || '');
    const detailPath = id ? ROUTES.DEVICE_DETAIL_PATH(id) : ROUTES.HOME;
    const name = item.name || item.title || '';
    const brand = item.brand || STRINGS.WISHLIST.DEFAULT_BRAND;
    const category = item.category || '';
    const rawImages = Array.isArray(item.images) ? item.images : [];
    const imageUrl = resolveDeviceImageUrl(
      rawImages[0] || item.image || item.thumbnail || ''
    );
    const price = Number(item.pricePerDay ?? item.dailyRate ?? 0);
    const isAvailable =
      String(item.status || 'available').toLowerCase() === 'available';
    const ratingVal = Number(item.rating ?? item.stats?.ratingAvg ?? 5.0).toFixed(1);

    return (
      <Link
        key={id}
        to={detailPath}
        className="group bg-white rounded-2xl p-3 border border-slate-100 shadow-sm hover:shadow-md hover:border-brand-200 transition-all duration-200 flex items-stretch gap-3.5"
      >
        {/* Left Image Wrapper (matching App listThumbWrapper 125x125) */}
        <div className="relative w-32 sm:w-36 min-h-[8rem] rounded-xl overflow-hidden bg-slate-100 shrink-0">
          <img
            src={imageUrl}
            alt={name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <span
            className={`absolute bottom-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
              isAvailable
                ? 'bg-emerald-50/95 text-emerald-700'
                : 'bg-amber-50/95 text-amber-700'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isAvailable ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <span>
              {isAvailable ? STRINGS.WISHLIST.AVAILABLE : STRINGS.WISHLIST.RENTED}
            </span>
          </span>
        </div>

        {/* Right Info Content (matching App listContent) */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            {/* Top Row: Brand Badge + Heart Remove Button */}
            <div className="flex items-center justify-between gap-2">
              <span className="px-2 py-0.5 rounded-md bg-brand-50 text-brand-600 text-[10px] font-extrabold uppercase tracking-wider">
                {brand}
              </span>

              <button
                type="button"
                onClick={(e) => handleRemoveFromWishlist(e, id)}
                disabled={Boolean(togglingIds[id])}
                aria-label={STRINGS.WISHLIST.TITLE}
                className="w-7 h-7 rounded-full bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
              >
                <Heart className="w-4 h-4 fill-red-500 text-red-500" />
              </button>
            </div>

            {/* Device Name */}
            <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug mt-1.5 group-hover:text-brand-600 transition-colors">
              {name}
            </h3>

            {/* Category + Star Rating Badge */}
            <div className="flex items-center justify-between gap-2 mt-1.5">
              <span className="text-xs font-medium text-slate-500 capitalize truncate">
                {category}
              </span>

              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-xs font-bold shrink-0">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>{ratingVal}</span>
              </div>
            </div>
          </div>

          {/* Footer: Daily Rate + Price + Orange Arrow Button */}
          <div className="flex items-end justify-between gap-2 pt-2.5 mt-2 border-t border-slate-100">
            <div>
              <span className="block text-[10px] font-medium text-slate-400">
                {STRINGS.WISHLIST.DAILY_RATE}
              </span>
              <div className="flex items-baseline gap-0.5 mt-0.5">
                <span className="text-sm font-extrabold text-brand-600">
                  {price.toLocaleString('en-US')}
                  {STRINGS.WISHLIST.CURRENCY_VND}
                </span>
                <span className="text-[11px] font-semibold text-slate-400">
                  {STRINGS.WISHLIST.PER_DAY}
                </span>
              </div>
            </div>

            <span className="w-8 h-8 rounded-full bg-brand-500 group-hover:bg-brand-600 text-white flex items-center justify-center shadow-xs transition-colors shrink-0">
              <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <nav
          className="flex items-center gap-2 text-xs text-slate-500 mb-4"
          aria-label="Breadcrumb"
        >
          <Link
            to={ROUTES.HOME}
            className="hover:text-brand-600 transition-colors"
          >
            {STRINGS.WISHLIST.BREADCRUMB_HOME}
          </Link>
          <ChevronRight
            className="w-3.5 h-3.5 text-slate-400"
            aria-hidden="true"
          />
          <span className="text-brand-600 font-semibold">
            {STRINGS.WISHLIST.TITLE}
          </span>
        </nav>

        {/* Main Header Bar (Web layout + App header info & View Switcher) */}
        <header className="bg-white rounded-2xl px-4 py-3.5 shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              aria-label={STRINGS.COMMON.BACK}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                {STRINGS.WISHLIST.TITLE}
              </h1>
              {devices.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-500 text-xs font-extrabold">
                  {devices.length}
                </span>
              )}
            </div>
          </div>

          {/* Right Controls: Refresh + View Mode Switcher (Grid / List) */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => loadWishlistData({ silent: true })}
              disabled={isLoading || isRefreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition-colors disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              <span className="hidden sm:inline">
                {isRefreshing ? STRINGS.common.refreshing : STRINGS.common.refresh}
              </span>
            </button>

            <div className="inline-flex items-center bg-slate-100 rounded-xl p-1 gap-1">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title={STRINGS.WISHLIST.GRID_VIEW}
                aria-label={STRINGS.WISHLIST.GRID_VIEW}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-brand-500 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setViewMode('list')}
                title={STRINGS.WISHLIST.LIST_VIEW}
                aria-label={STRINGS.WISHLIST.LIST_VIEW}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-brand-500 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Subheader Status Bar (Synced with App WishlistScreen subHeaderBar) */}
        {!isLoading && devices.length > 0 && (
          <div className="bg-white rounded-xl px-4 py-2.5 mt-3 mb-5 border border-slate-100 shadow-2xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" />
              </span>
              <span className="text-xs font-semibold text-slate-600">
                {STRINGS.WISHLIST.SAVED_COUNT_PREFIX}
                <strong className="font-extrabold text-slate-900">
                  {devices.length}
                </strong>
                {STRINGS.WISHLIST.SAVED_COUNT_SUFFIX}
              </span>
            </div>

            <span className="text-xs font-medium text-slate-400">
              {viewMode === 'grid'
                ? STRINGS.WISHLIST.GRID_VIEW
                : STRINGS.WISHLIST.LIST_VIEW}
            </span>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="mt-5">
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
          </div>
        )}

        {/* Wishlist Items: Grid View or List View */}
        {!isLoading && devices.length > 0 && (
          <div>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {devices.map((item) => renderGridCard(item))}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {devices.map((item) => renderListCard(item))}
              </div>
            )}
          </div>
        )}

        {/* Empty State (Synced with App WishlistScreen Empty Container) */}
        {!isLoading && devices.length === 0 && (
          <div className="mt-5 bg-white rounded-2xl border border-slate-100 shadow-sm py-16 px-6 flex flex-col items-center text-center">
            <div className="relative w-24 h-24 rounded-full bg-red-50 flex items-center justify-center mb-5">
              <HeartOff className="w-11 h-11 text-red-300" aria-hidden="true" />
              <span className="absolute bottom-0.5 right-0.5 w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center border-2 border-white shadow-xs">
                <Compass className="w-4 h-4" />
              </span>
            </div>

            <h2 className="text-lg font-extrabold text-slate-900">
              {STRINGS.WISHLIST.EMPTY_TITLE}
            </h2>
            <p className="text-sm text-slate-500 mt-2 max-w-md leading-relaxed">
              {STRINGS.WISHLIST.EMPTY_SUBTITLE}
            </p>

            <Link
              to={ROUTES.HOME}
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold shadow-sm transition-colors"
            >
              <Compass className="w-4 h-4" aria-hidden="true" />
              <span>{STRINGS.WISHLIST.EXPLORE_DEVICES}</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default WishlistPage;
