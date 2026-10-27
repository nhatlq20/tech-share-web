import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  RefreshCw,
  Inbox,
  Compass,
} from 'lucide-react';
import { STRINGS } from '../../constants/strings.js';
import { MAGIC_NUMBERS, MY_BOOKING_TABS, BOOKING_STATUS } from '../../constants/config.js';
import { ROUTES } from '../../routes/routes.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { fetchMyBookings } from '../../services/bookingService.js';
import { BookingTableRow, BookingMobileCard } from '../../components/booking/BookingTableRow.jsx';
import { getBookingStatusStyle } from '../../components/booking/BookingStatusBadge.jsx';
import { RenterHandoverModal } from '../../components/booking/RenterHandoverSection.jsx';

const T = STRINGS.booking.myBookings;
const DEFAULT_TAB = BOOKING_STATUS.PENDING;
const FIRST_PAGE = MAGIC_NUMBERS.PAGINATION.DEFAULT_PAGE;
const SKELETON_ROWS = Array.from({ length: MAGIC_NUMBERS.BOOKING.TABLE_SKELETON_ROWS }, (_, index) => index);

const parseTab = (value) => (MY_BOOKING_TABS.includes(value) ? value : DEFAULT_TAB);
const parsePage = (value) => {
  const page = parseInt(value, 10);
  return Number.isInteger(page) && page >= FIRST_PAGE ? page : FIRST_PAGE;
};

const TableSkeleton = () => (
  <div className="divide-y divide-slate-100" aria-busy="true" aria-label={STRINGS.common.loading}>
    {SKELETON_ROWS.map((row) => (
      <div key={row} className="flex items-center gap-4 px-6 py-4 animate-pulse">
        <div className="w-14 h-14 rounded-xl bg-slate-100" />
        <div className="flex-1 flex flex-col gap-2">
          <div className="h-3 w-1/3 rounded-full bg-slate-100" />
          <div className="h-3 w-1/5 rounded-full bg-slate-100" />
        </div>
        <div className="hidden md:block h-3 w-24 rounded-full bg-slate-100" />
        <div className="hidden md:block h-6 w-20 rounded-full bg-slate-100" />
      </div>
    ))}
  </div>
);

export const MyBookingsPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawStatusParam = searchParams.get('status');
  const activeTab = parseTab(rawStatusParam);
  const page = parsePage(searchParams.get('page'));
  const currentUserId = user?._id || user?.id || user?.userId;

  const [bookings, setBookings] = useState([]);
  const [counts, setCounts] = useState({});
  const [pagination, setPagination] = useState({ page: FIRST_PAGE, totalPages: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [handoverModalBooking, setHandoverModalBooking] = useState(null);

  // Per-tab/page cache so switching back to a visited tab renders instantly while revalidating
  const cacheRef = useRef(new Map());
  const autoSwitchedRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    const cacheKey = `${currentUserId || 'anon'}:${activeTab}:${page}`;
    const cached = cacheRef.current.get(cacheKey);

    if (cached) {
      setBookings(cached.data);
      setPagination(cached.pagination);
      setIsLoading(false);
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    fetchMyBookings({
      status: activeTab,
      page,
      renterId: currentUserId,
      signal: controller.signal,
    })
      .then((result) => {
        if (controller.signal.aborted) return;
        cacheRef.current.set(cacheKey, { data: result.data, pagination: result.pagination });
        setBookings(result.data);
        setPagination(result.pagination);
        setCounts(result.counts);

        // Nếu vào trang lần đầu không chỉ định ?status= và tab mặc định (pending) trống
        // nhưng các tab khác có đơn, tự động chuyển sang tab đầu tiên có dữ liệu
        if (
          !rawStatusParam &&
          !autoSwitchedRef.current &&
          result.data.length === 0 &&
          result.counts
        ) {
          const firstNonEmptyTab = MY_BOOKING_TABS.find((tab) => (result.counts[tab] || 0) > 0);
          if (firstNonEmptyTab && firstNonEmptyTab !== activeTab) {
            autoSwitchedRef.current = true;
            setSearchParams({ status: firstNonEmptyTab }, { replace: true });
          }
        }
      })
      .catch((err) => {
        if (err?.name === 'AbortError' || controller.signal.aborted) return;
        if (!cached) setBookings([]);
        setError(err?.message || T.errorTitle);
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setIsLoading(false);
        setIsRefreshing(false);
      });

    return () => controller.abort();
  }, [activeTab, page, reloadKey, currentUserId, rawStatusParam, setSearchParams]);

  const handleTabChange = useCallback(
    (tab) => {
      autoSwitchedRef.current = true;
      if (tab === activeTab) return;
      setSearchParams({ status: tab });
    },
    [activeTab, setSearchParams]
  );

  const handlePageChange = useCallback(
    (nextPage) => {
      setSearchParams({ status: activeTab, page: String(nextPage) });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [activeTab, setSearchParams]
  );

  const handleRetry = useCallback(() => {
    cacheRef.current.clear();
    setReloadKey((key) => key + 1);
  }, []);

  const handleBookingUpdated = useCallback((updatedBooking) => {
    if (!updatedBooking) return;
    cacheRef.current.clear();
    setBookings((prev) =>
      prev.map((item) =>
        String(item._id) === String(updatedBooking._id) ? { ...item, ...updatedBooking } : item
      )
    );
    setHandoverModalBooking((prev) =>
      prev && String(prev._id) === String(updatedBooking._id) ? { ...prev, ...updatedBooking } : prev
    );
  }, []);

  const totalPages = pagination.totalPages || 1;
  const showEmpty = !isLoading && !error && bookings.length === 0;
  const showList = !isLoading && bookings.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6" aria-label="Breadcrumb">
          <Link to={ROUTES.HOME} className="hover:text-brand-600 transition-colors">
            {STRINGS.booking.checkout.breadcrumbHome}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          <span className="text-brand-600 font-semibold">{T.breadcrumb}</span>
        </nav>

        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{T.headerTitle}</h1>
            <p className="text-sm text-slate-500 mt-1">{T.headerSubtitle}</p>
          </div>
          <button
            type="button"
            id="my-bookings-refresh-btn"
            onClick={handleRetry}
            disabled={isLoading || isRefreshing}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-slate-600 text-xs font-semibold shadow-sm hover:text-brand-600 transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            {isRefreshing ? STRINGS.common.refreshing : STRINGS.common.refresh}
          </button>
        </header>

        {/* Status Tabs */}
        <div
          role="tablist"
          aria-label={T.tabsAriaLabel}
          className="flex gap-2 p-1.5 bg-white rounded-full shadow-sm overflow-x-auto scrollbar-hide mb-6"
        >
          {MY_BOOKING_TABS.map((tab) => {
            const isActive = tab === activeTab;
            const count = counts[tab] ?? 0;
            const style = getBookingStatusStyle(tab);
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                id={`my-bookings-tab-${tab}`}
                aria-selected={isActive}
                aria-controls="my-bookings-panel"
                onClick={() => handleTabChange(tab)}
                className={`flex-1 min-w-max inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-100 text-brand-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${style.dot}`} aria-hidden="true" />
                {T.tabs[tab]}
                <span
                  className={`min-w-6 px-2 py-0.5 rounded-full text-xs font-bold transition-colors ${
                    isActive ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Panel */}
        <section
          id="my-bookings-panel"
          role="tabpanel"
          aria-labelledby={`my-bookings-tab-${activeTab}`}
          className={`transition-opacity duration-200 ${isRefreshing ? 'opacity-70' : 'opacity-100'}`}
        >
          {isLoading && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <TableSkeleton />
            </div>
          )}

          {!isLoading && error && (
            <div className="bg-white rounded-2xl shadow-sm p-10 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-4">
                <AlertCircle className="w-7 h-7" aria-hidden="true" />
              </div>
              <h2 className="text-base font-bold text-slate-800">{T.errorTitle}</h2>
              <p className="text-sm text-slate-500 mt-1 max-w-md">{error}</p>
              <button
                type="button"
                id="my-bookings-retry-btn"
                onClick={handleRetry}
                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 shadow-sm transition-colors"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                {T.retryBtn}
              </button>
            </div>
          )}

          {showEmpty && (
            <div className="bg-white rounded-2xl shadow-sm p-12 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-brand-50 text-brand-500 flex items-center justify-center mb-4">
                <Inbox className="w-8 h-8" aria-hidden="true" />
              </div>
              <h2 className="text-base font-bold text-slate-800">{T.emptyTitle}</h2>
              <p className="text-sm text-slate-500 mt-1 max-w-md">{T.empty[activeTab]}</p>
              <Link
                to={ROUTES.EXPLORE}
                id="my-bookings-explore-btn"
                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 shadow-sm transition-colors"
              >
                <Compass className="w-4 h-4" aria-hidden="true" />
                {T.exploreBtn}
              </Link>
            </div>
          )}

          {showList && (
            <>
              {/* Desktop table */}
              <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
                <table className="w-full text-left min-w-[780px]">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                    <tr>
                      <th scope="col" className="px-5 py-3.5">{T.columns.device}</th>
                      <th scope="col" className="px-4 py-3.5 whitespace-nowrap">{T.columns.period}</th>
                      <th scope="col" className="px-4 py-3.5 whitespace-nowrap">{T.columns.total}</th>
                      <th scope="col" className="px-4 py-3.5 whitespace-nowrap">{T.columns.status}</th>
                      <th scope="col" className="px-5 py-3.5 text-right whitespace-nowrap">{T.columns.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bookings.map((booking) => (
                      <BookingTableRow
                        key={booking._id}
                        booking={booking}
                        onOpenHandover={(b) => setHandoverModalBooking(b)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden flex flex-col gap-3">
                {bookings.map((booking) => (
                  <BookingMobileCard
                    key={booking._id}
                    booking={booking}
                    onOpenHandover={(b) => setHandoverModalBooking(b)}
                  />
                ))}
              </div>
            </>
          )}

          {/* Pagination */}
          {showList && totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <button
                type="button"
                id="my-bookings-prev-page"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= FIRST_PAGE}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-white text-sm font-semibold text-slate-600 shadow-sm hover:text-brand-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                {T.pagination.prev}
              </button>
              <span className="text-xs font-medium text-slate-500">{T.pagination.pageOf(page, totalPages)}</span>
              <button
                type="button"
                id="my-bookings-next-page"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-white text-sm font-semibold text-slate-600 shadow-sm hover:text-brand-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {T.pagination.next}
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Quick Modal for Handover QR & Before-Rental Photo Upload on Approved Bookings */}
      <RenterHandoverModal
        isOpen={Boolean(handoverModalBooking)}
        booking={handoverModalBooking}
        onClose={() => setHandoverModalBooking(null)}
        onBookingUpdated={handleBookingUpdated}
      />
    </div>
  );
};

export default MyBookingsPage;
