import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronRight,
  ChevronLeft,
  Package,
  RefreshCw,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  X,
} from 'lucide-react';
import { STRINGS } from '../../constants/strings.js';
import { MAGIC_NUMBERS, MY_BOOKING_TABS } from '../../constants/config.js';
import { ROUTES } from '../../routes/routes.js';
import {
  fetchMyBookings,
  cancelBooking,
  requestBookingExtension,
} from '../../services/bookingService.js';
import {
  BookingTableRow,
  BookingMobileCard,
} from '../../components/booking/BookingTableRow.jsx';
import { CancelBookingModal } from '../../components/booking/CancelBookingModal.jsx';
import { ExtensionModal } from '../../components/booking/ExtensionModal.jsx';
import { BookingReviewModal } from '../../components/booking/BookingReviewModal.jsx';
import { RenterHandoverModal } from '../../components/booking/RenterHandoverSection.jsx';

const T = STRINGS.booking.myBookings;

const resolveTab = (raw) =>
  MY_BOOKING_TABS.includes(raw) ? raw : MY_BOOKING_TABS[0];

/**
 * MyBookingsPage – Compact, unified Web Desktop Table & Tabs layout
 */
export const MyBookingsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = resolveTab(searchParams.get('status'));
  const currentPage = Math.max(
    1,
    parseInt(searchParams.get('page') || '1', 10) || 1
  );

  const [bookings, setBookings] = useState([]);
  const [counts, setCounts] = useState({});
  const [pagination, setPagination] = useState({
    page: 1,
    limit: MAGIC_NUMBERS.BOOKING.MY_BOOKINGS_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Action Modals
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const [extendingBooking, setExtendingBooking] = useState(null);
  const [isExtending, setIsExtending] = useState(false);
  const [extendError, setExtendError] = useState('');

  const [reviewingBooking, setReviewingBooking] = useState(null);
  const [handoverModalBooking, setHandoverModalBooking] = useState(null);

  const showToast = (type, title, message) => {
    setToast({ type, title, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3500);
  };

  const loadBookings = useCallback(
    async (signal) => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await fetchMyBookings({
          status: activeTab,
          page: currentPage,
          limit: MAGIC_NUMBERS.BOOKING.MY_BOOKINGS_PAGE_SIZE,
          signal,
        });
        setBookings(result.data);
        setCounts(result.counts);
        setPagination(result.pagination);
      } catch (err) {
        if (err?.name === 'CanceledError' || err?.name === 'AbortError') return;
        setError(err?.message || T.errorTitle);
      } finally {
        setIsLoading(false);
      }
    },
    [activeTab, currentPage]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadBookings(controller.signal);
    return () => controller.abort();
  }, [loadBookings]);

  const handleSelectTab = (tab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === 'all') {
      next.delete('status');
    } else {
      next.set('status', tab);
    }
    next.delete('page');
    setSearchParams(next, { replace: true });
  };

  const handlePageChange = (nextPage) => {
    const next = new URLSearchParams(searchParams);
    next.set('status', activeTab);
    next.set('page', String(nextPage));
    setSearchParams(next, { replace: true });
  };

  const handleConfirmCancel = async (reason) => {
    if (!cancellingBooking) return;
    setIsCancelling(true);
    setCancelError('');
    try {
      await cancelBooking(cancellingBooking._id, reason);
      setCancellingBooking(null);
      showToast(
        'success',
        STRINGS.MY_BOOKINGS.ALERT_SUCCESS,
        STRINGS.MY_BOOKINGS.ALERT_CANCELLED_MSG
      );
      loadBookings();
    } catch (err) {
      setCancelError(err?.message || STRINGS.MY_BOOKINGS.ALERT_CANCEL_FAILED);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRequestExtend = async ({ days, additionalDays, note }) => {
    if (!extendingBooking) return;
    setIsExtending(true);
    setExtendError('');
    try {
      await requestBookingExtension(extendingBooking._id, {
        days: additionalDays ?? days,
        additionalDays: additionalDays ?? days,
        note,
      });
      setExtendingBooking(null);
      showToast(
        'success',
        STRINGS.MY_BOOKINGS.ALERT_EXTEND_SUCCESS_TITLE,
        STRINGS.MY_BOOKINGS.ALERT_EXTEND_SUCCESS_MSG
      );
      loadBookings();
    } catch (err) {
      setExtendError(err?.message || STRINGS.MY_BOOKINGS.ALERT_EXTEND_FAILED);
    } finally {
      setIsExtending(false);
    }
  };

  const handleBookingUpdatedInModal = (updatedBooking) => {
    if (!updatedBooking?._id) return;
    setBookings((prev) =>
      prev.map((item) => (item._id === updatedBooking._id ? updatedBooking : item))
    );
    setHandoverModalBooking(updatedBooking);
  };

  const skeletonRows = Array.from({
    length: MAGIC_NUMBERS.BOOKING.TABLE_SKELETON_ROWS,
  });

  return (
    <div className="min-h-screen bg-slate-50 py-5 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Top Bar: Breadcrumb + Title + Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <nav
              className="flex items-center gap-1.5 text-xs text-slate-500 mb-1"
              aria-label="Breadcrumb"
            >
              <Link to={ROUTES.HOME} className="hover:text-brand-600 transition">
                {STRINGS.booking.checkout.breadcrumbHome}
              </Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-brand-600 font-semibold">{T.breadcrumb}</span>
            </nav>

            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center shrink-0">
                <Package className="w-4 h-4" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  {T.headerTitle}
                </h1>
                <p className="text-slate-500 text-xs">{T.headerSubtitle}</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => loadBookings()}
            disabled={isLoading}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:border-brand-500 hover:text-brand-600 transition disabled:opacity-50 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{STRINGS.common.refresh}</span>
          </button>
        </div>

        {/* Toast Feedback */}
        {toast && (
          <div className="mb-4">
            <div
              className={`flex items-center justify-between gap-3 rounded-xl px-4 py-2.5 border shadow-2xs ${
                toast.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}
            >
              <div className="flex items-center gap-2">
                {toast.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                )}
                <div>
                  <span className="text-xs font-bold mr-1.5">{toast.title}:</span>
                  <span className="text-xs">{toast.message}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="p-1 rounded-lg hover:bg-black/5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Status Tabs Bar */}
        <div
          role="tablist"
          aria-label={T.tabsAriaLabel}
          className="bg-white rounded-xl p-1 shadow-2xs border border-slate-200/80 mb-4 flex overflow-x-auto gap-1"
        >
          {MY_BOOKING_TABS.map((tab) => {
            const isActive = tab === activeTab;
            const badgeCount = counts?.[tab] ?? 0;

            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleSelectTab(tab)}
                className={`flex-1 min-w-[105px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span>{T.tabs[tab] || tab}</span>
                <span
                  className={`inline-flex items-center justify-center min-w-[1.25rem] h-4 px-1.5 rounded-full text-[10px] font-extrabold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : badgeCount > 0
                      ? 'bg-brand-50 text-brand-700'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {badgeCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Content Area: Loading / Error / Empty / Web Table + Mobile Cards */}
        {isLoading ? (
          <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/80 overflow-hidden">
            <div className="divide-y divide-slate-100">
              {skeletonRows.map((_, idx) => (
                <div
                  key={idx}
                  className="p-4 flex items-center justify-between gap-4 animate-pulse"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-slate-200" />
                    <div className="space-y-1.5 flex-1 max-w-xs">
                      <div className="h-3 w-20 bg-slate-200 rounded" />
                      <div className="h-4 w-48 bg-slate-200 rounded" />
                    </div>
                  </div>
                  <div className="hidden md:block h-4 w-36 bg-slate-200 rounded" />
                  <div className="hidden md:block h-4 w-24 bg-slate-200 rounded" />
                  <div className="h-6 w-20 bg-slate-200 rounded-full" />
                  <div className="h-8 w-28 bg-slate-200 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl p-8 shadow-2xs border border-red-100 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-slate-800">{T.errorTitle}</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">{error}</p>
            <button
              type="button"
              onClick={() => loadBookings()}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{T.retryBtn}</span>
            </button>
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 shadow-2xs border border-slate-200/80 text-center">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-500 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-slate-800">{T.emptyTitle}</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {T.empty[activeTab] || STRINGS.MY_BOOKINGS.EMPTY_TITLE}
            </p>
            <Link
              to={ROUTES.EXPLORE}
              className="mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition shadow-2xs"
            >
              <span>{T.exploreBtn}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop Table (md and up) */}
            <div className="hidden md:block bg-white rounded-2xl shadow-2xs border border-slate-200/80 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-2.5 pl-4 pr-2.5">{T.columns.device}</th>
                      <th className="py-2.5 px-2.5">{T.columns.period}</th>
                      <th className="py-2.5 px-2.5">{T.columns.total}</th>
                      <th className="py-2.5 px-2.5">{T.columns.status}</th>
                      <th className="py-2.5 pl-2.5 pr-4 text-right">{T.columns.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings
                      .slice(0, MAGIC_NUMBERS.BOOKING.MY_BOOKINGS_PAGE_SIZE)
                      .map((b) => {
                      const deviceObj =
                        (typeof b.deviceId === 'object' && b.deviceId) ||
                        (typeof b.device === 'object' && b.device) ||
                        {};
                      const targetDeviceId =
                        deviceObj._id ||
                        deviceObj.id ||
                        (typeof b.deviceId === 'string' ? b.deviceId : '') ||
                        (typeof b.device === 'string' ? b.device : '');

                      return (
                        <BookingTableRow
                          key={b._id || b.bookingCode}
                          booking={b}
                          onOpenHandover={(targetBooking) =>
                            setHandoverModalBooking(targetBooking)
                          }
                          onCancel={() => {
                            setCancelError('');
                            setCancellingBooking(b);
                          }}
                          onExtend={() => {
                            setExtendError('');
                            setExtendingBooking(b);
                          }}
                          onRate={() => setReviewingBooking(b)}
                          onRebook={() => {
                            if (targetDeviceId) {
                              navigate(ROUTES.BOOKING_CHECKOUT_PATH(targetDeviceId), {
                                state: { device: deviceObj?._id ? deviceObj : undefined },
                              });
                            }
                          }}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card List (below md) */}
            <div className="md:hidden space-y-2.5">
              {bookings
                .slice(0, MAGIC_NUMBERS.BOOKING.MY_BOOKINGS_PAGE_SIZE)
                .map((b) => {
                const deviceObj =
                  (typeof b.deviceId === 'object' && b.deviceId) ||
                  (typeof b.device === 'object' && b.device) ||
                  {};
                const targetDeviceId =
                  deviceObj._id ||
                  deviceObj.id ||
                  (typeof b.deviceId === 'string' ? b.deviceId : '') ||
                  (typeof b.device === 'string' ? b.device : '');

                return (
                  <BookingMobileCard
                    key={b._id || b.bookingCode}
                    booking={b}
                    onOpenHandover={(targetBooking) =>
                      setHandoverModalBooking(targetBooking)
                    }
                    onCancel={() => {
                      setCancelError('');
                      setCancellingBooking(b);
                    }}
                    onExtend={() => {
                      setExtendError('');
                      setExtendingBooking(b);
                    }}
                    onRate={() => setReviewingBooking(b)}
                    onRebook={() => {
                      if (targetDeviceId) {
                        navigate(ROUTES.BOOKING_CHECKOUT_PATH(targetDeviceId), {
                          state: { device: deviceObj?._id ? deviceObj : undefined },
                        });
                      }
                    }}
                  />
                );
              })}
            </div>

            {/* Pagination Footer */}
            {pagination.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between bg-white rounded-xl px-4 py-2.5 border border-slate-200/80 shadow-2xs text-xs text-slate-600">
                <span className="font-semibold">
                  {T.pagination.pageOf(pagination.page, pagination.totalPages)}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-700 hover:border-brand-500 hover:text-brand-600 disabled:opacity-40 disabled:pointer-events-none transition"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>{T.pagination.prev}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-700 hover:border-brand-500 hover:text-brand-600 disabled:opacity-40 disabled:pointer-events-none transition"
                  >
                    <span>{T.pagination.next}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Cancel Booking Modal */}
      <CancelBookingModal
        visible={Boolean(cancellingBooking)}
        bookingCode={cancellingBooking?.bookingCode}
        isSubmitting={isCancelling}
        errorMessage={cancelError}
        onClose={() => {
          if (!isCancelling) setCancellingBooking(null);
        }}
        onConfirm={handleConfirmCancel}
      />

      {/* Extension Request Modal */}
      <ExtensionModal
        visible={Boolean(extendingBooking)}
        booking={extendingBooking}
        isSubmitting={isExtending}
        error={extendError}
        onClose={() => {
          if (!isExtending) setExtendingBooking(null);
        }}
        onSubmit={handleRequestExtend}
      />

      {/* Review Modal */}
      <BookingReviewModal
        visible={Boolean(reviewingBooking)}
        booking={reviewingBooking}
        onClose={() => setReviewingBooking(null)}
        onSuccess={(createdReview) => {
          if (reviewingBooking?._id) {
            setBookings((prev) =>
              prev.map((b) =>
                b._id === reviewingBooking._id
                  ? { ...b, isReviewed: true, review: createdReview }
                  : b
              )
            );
          }
          setReviewingBooking(null);
          loadBookings();
        }}
      />

      {/* QR & Before-Rental Handover Modal */}
      <RenterHandoverModal
        isOpen={Boolean(handoverModalBooking)}
        booking={handoverModalBooking}
        onClose={() => setHandoverModalBooking(null)}
        onBookingUpdated={handleBookingUpdatedInModal}
      />
    </div>
  );
};

export default MyBookingsPage;
