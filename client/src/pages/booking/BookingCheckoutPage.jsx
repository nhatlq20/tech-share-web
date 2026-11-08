import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  ChevronRight,
  MapPin,
  Truck,
  Store,
  CheckCircle2,
  XCircle,
  CalendarDays,
  ArrowLeft,
  ShieldAlert,
  UserCheck,
  Loader2,
} from 'lucide-react';
import { STRINGS } from '../../constants/strings.js';
import { API_CONFIG, MAGIC_NUMBERS } from '../../constants/config.js';
import { ROUTES } from '../../routes/routes.js';
import { WebDatePicker } from '../../components/booking/WebDatePicker.jsx';
import { OrderSummaryCard } from '../../components/booking/OrderSummaryCard.jsx';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

const formatPriceVnd = (amount) =>
  `${Math.round(Number(amount) || 0).toLocaleString('en-US')} ${STRINGS.COMMON.VND}`;

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '--/--/----';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

/**
 * BookingCheckoutPage - Web 2-column Checkout layout with App-synchronized information
 * - Left column (7 cols): WebDatePicker (Step 1 Pickup, Step 2 Return, Quick Presets, Time Suggestions) + Handover Method (Self Pickup vs Doorstep Delivery)
 * - Right column (5 cols): Sticky OrderSummaryCard (Device summary + App Payment Breakdown)
 */
export const BookingCheckoutPage = () => {
  const { deviceId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  const passedDevice = location.state?.device || null;

  const [device, setDevice] = useState(passedDevice);
  const [disabledDates, setDisabledDates] = useState([]);
  const [busyRanges, setBusyRanges] = useState([]);
  const [isLoadingDevice, setIsLoadingDevice] = useState(!passedDevice);

  // Rental Schedule State (matching App's information)
  const [dateSelection, setDateSelection] = useState({
    startDate: null,
    endDate: null,
    pickupTime: '08:00',
    returnTime: '08:00',
  });

  // Handover Method State (default 'pickup' matching App)
  const [deliveryMethod, setDeliveryMethod] = useState('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState(() => {
    if (!user?.address) return '';
    return typeof user.address === 'string'
      ? user.address
      : user.address?.fullAddress || user.address?.street || '';
  });

  // Submission & Modals
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [resultModal, setResultModal] = useState({
    visible: false,
    type: 'error',
    title: '',
    message: '',
  });
  const [authAlertModal, setAuthAlertModal] = useState(null); // 'login' | 'verify' | null

  // Sync user address if loaded later
  useEffect(() => {
    if (user?.address && !deliveryAddress) {
      const addr =
        typeof user.address === 'string'
          ? user.address
          : user.address?.fullAddress || user.address?.street || '';
      if (addr) setDeliveryAddress(addr);
    }
  }, [user, deliveryAddress]);

  // Load device details & availability from MongoDB
  useEffect(() => {
    let isMounted = true;

    const loadDeviceAndAvailability = async () => {
      try {
        if (!passedDevice) {
          setIsLoadingDevice(true);
        }

        const [deviceRes, availabilityRes] = await Promise.allSettled([
          api.get(API_CONFIG.ENDPOINTS.DEVICE_BY_ID(deviceId)),
          api.get(API_CONFIG.ENDPOINTS.DEVICE_BUSY_DATES(deviceId)),
        ]);

        if (!isMounted) return;

        if (deviceRes.status === 'fulfilled' && deviceRes.value?.data) {
          setDevice(deviceRes.value.data);
        }

        if (availabilityRes.status === 'fulfilled') {
          const val = availabilityRes.value;
          const availData = val?.data || val || {};
          if (Array.isArray(availData.disabledDates)) {
            setDisabledDates(availData.disabledDates);
          }
          const ranges =
            val?.busyRanges || availData?.busyRanges || availData?.bookedRanges || [];
          setBusyRanges(Array.isArray(ranges) ? ranges : []);
        }
      } catch (err) {
        console.error('Error loading checkout data:', err);
      } finally {
        if (isMounted) {
          setIsLoadingDevice(false);
        }
      }
    };

    if (deviceId) {
      loadDeviceAndAvailability();
    }

    return () => {
      isMounted = false;
    };
  }, [deviceId, passedDevice]);

  // Construct start & end Date objects with time
  const startDateObj = useMemo(() => {
    if (!dateSelection.startDate) return null;
    const [y, m, d] = dateSelection.startDate.split('-').map(Number);
    const [hh, mm] = (dateSelection.pickupTime || '08:00').split(':').map(Number);
    return new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0);
  }, [dateSelection.startDate, dateSelection.pickupTime]);

  const endDateObj = useMemo(() => {
    const targetDateStr = dateSelection.endDate || dateSelection.startDate;
    if (!targetDateStr) return null;
    const [y, m, d] = targetDateStr.split('-').map(Number);
    const [hh, mm] = (dateSelection.returnTime || '08:00').split(':').map(Number);
    const dt = new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0);
    if (!dateSelection.endDate && startDateObj && dt <= startDateObj) {
      dt.setDate(dt.getDate() + 1);
    }
    return dt;
  }, [dateSelection.endDate, dateSelection.startDate, dateSelection.returnTime, startDateObj]);

  // Rental duration calculation synchronized with App
  const rentalDurationInfo = useMemo(() => {
    if (!startDateObj || !endDateObj) {
      return { days: 0, hours: 0, totalHours: 0, billingDays: 0 };
    }
    const diffMs = endDateObj.getTime() - startDateObj.getTime();
    if (diffMs <= 0) {
      return { days: 0, hours: 0, totalHours: 0, billingDays: 0 };
    }
    const totalHours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    const billingDays = Math.max(1, Math.ceil(totalHours / 24));
    return { days, hours, totalHours, billingDays };
  }, [startDateObj, endDateObj]);

  const rentalDays = rentalDurationInfo.billingDays;
  const deviceDailyRate = Number(device?.dailyRate ?? device?.pricePerDay ?? 0);
  const deviceDeposit = Number(device?.depositValue ?? device?.depositAmount ?? 0);

  // Price breakdown synchronized with App
  const priceDetails = useMemo(() => {
    if (rentalDays <= 0 || !device) {
      return {
        rentalFee: 0,
        discountPercent: 0,
        discountAmount: 0,
        depositFee: deviceDeposit,
        totalAmount: 0,
      };
    }

    const rentalFee = deviceDailyRate * rentalDays;
    let discountPercent = 0;
    if (rentalDays >= MAGIC_NUMBERS.BOOKING.LONG_RENTAL_TIER_2_DAYS) {
      discountPercent = MAGIC_NUMBERS.BOOKING.LONG_RENTAL_TIER_2_DISCOUNT_PERCENT;
    } else if (rentalDays >= MAGIC_NUMBERS.BOOKING.LONG_RENTAL_TIER_1_DAYS) {
      discountPercent = MAGIC_NUMBERS.BOOKING.LONG_RENTAL_TIER_1_DISCOUNT_PERCENT;
    }

    const discountAmount = Math.round((rentalFee * discountPercent) / 100);
    const depositFee = deviceDeposit;
    const totalAmount = rentalFee - discountAmount + depositFee;

    return {
      rentalFee,
      discountPercent,
      discountAmount,
      depositFee,
      totalAmount,
    };
  }, [rentalDays, device, deviceDailyRate, deviceDeposit]);

  const devicePickupLocation =
    device?.addressText ||
    device?.location?.addressText ||
    (typeof device?.address === 'string' ? device.address : '') ||
    STRINGS.BOOKING_CREATE.PICKUP_DEFAULT_NOTE;

  const checkRangeOverlapWithBusy = (start, end) => {
    return busyRanges.some((range) => {
      const bStart = new Date(range.startDate);
      const bEnd = new Date(range.endDate);
      return start < bEnd && end > bStart;
    });
  };

  const handleSubmitBooking = async () => {
    setValidationError(null);

    if (!isAuthenticated || !user) {
      setAuthAlertModal('login');
      return;
    }

    const isVerified = Boolean(
      user?.isVerified === true ||
        user?.account?.isVerified === true ||
        user?.trust?.isVerified === true
    );
    if (user.role === 'renter' && !isVerified) {
      setAuthAlertModal('verify');
      return;
    }

    if (!startDateObj || !endDateObj || !dateSelection.startDate) {
      setValidationError(STRINGS.BOOKING_CREATE.ERR_MISSING_DATES_MSG);
      setResultModal({
        visible: true,
        type: 'error',
        title: STRINGS.BOOKING_CREATE.ERR_MISSING_DATES,
        message: STRINGS.BOOKING_CREATE.ERR_MISSING_DATES_MSG,
      });
      return;
    }

    if (endDateObj <= startDateObj) {
      setValidationError(STRINGS.BOOKING_CREATE.ERR_END_BEFORE_START_MSG);
      setResultModal({
        visible: true,
        type: 'error',
        title: STRINGS.BOOKING_CREATE.ERR_END_BEFORE_START,
        message: STRINGS.BOOKING_CREATE.ERR_END_BEFORE_START_MSG,
      });
      return;
    }

    if (checkRangeOverlapWithBusy(startDateObj, endDateObj)) {
      setValidationError(STRINGS.BOOKING_CREATE.CONFLICT_MSG);
      setResultModal({
        visible: true,
        type: 'error',
        title: STRINGS.BOOKING_CREATE.CONFLICT_TITLE,
        message: STRINGS.BOOKING_CREATE.CONFLICT_MSG,
      });
      return;
    }

    if (deliveryMethod === 'delivery' && !deliveryAddress.trim()) {
      setValidationError(STRINGS.BOOKING_CREATE.ERR_MISSING_ADDRESS_MSG);
      setResultModal({
        visible: true,
        type: 'error',
        title: STRINGS.BOOKING_CREATE.ERR_MISSING_ADDRESS,
        message: STRINGS.BOOKING_CREATE.ERR_MISSING_ADDRESS_MSG,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(API_CONFIG.ENDPOINTS.BOOKINGS, {
        deviceId: device?._id || device?.id || deviceId,
        startDate: startDateObj.toISOString(),
        endDate: endDateObj.toISOString(),
        deliveryMethod,
        deliveryAddress:
          deliveryMethod === 'delivery'
            ? deliveryAddress.trim()
            : devicePickupLocation,
      });

      setShowSuccessModal(true);
    } catch (error) {
      if (error?.requireEkyc || error?.code === 'RENTER_EKYC_REQUIRED') {
        setAuthAlertModal('verify');
      } else {
        const msg = error?.message || STRINGS.BOOKING_CREATE.ERR_BOOKING_DEFAULT;
        setValidationError(msg);
        setResultModal({
          visible: true,
          type: 'error',
          title: STRINGS.BOOKING_CREATE.ERR_BOOKING_FAILED,
          message: msg,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingDevice) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 bg-slate-50">
        <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
        <span className="text-sm font-semibold text-slate-600">{STRINGS.COMMON.LOADING}</span>
      </div>
    );
  }

  const deviceTitle =
    device?.name || device?.title || STRINGS.booking.myBookings.untitledDevice;

  return (
    <div className="min-h-screen bg-slate-50 py-5 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Web Top Header: Back + Breadcrumb + Title + 3-Step Indicator */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5 pb-3.5 border-b border-slate-200/80">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-brand-600 hover:border-brand-200 transition shadow-2xs"
              aria-label={STRINGS.COMMON.BACK}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
                <Link to={ROUTES.HOME} className="hover:text-brand-600 transition">
                  {STRINGS.booking.checkout.breadcrumbHome}
                </Link>
                <ChevronRight className="w-3 h-3" />
                <Link to={ROUTES.EXPLORE} className="hover:text-brand-600 transition">
                  {STRINGS.booking.checkout.breadcrumbExplore}
                </Link>
                <ChevronRight className="w-3 h-3" />
                <span className="text-slate-600 truncate max-w-[180px]">{deviceTitle}</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-brand-600 font-semibold">
                  {STRINGS.booking.checkout.breadcrumbCheckout}
                </span>
              </nav>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                {STRINGS.BOOKING_CREATE.HEADER_TITLE}
              </h1>
            </div>
          </div>

          {/* 3-Step Pills */}
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="px-3 py-1 rounded-full bg-brand-500 text-white shadow-2xs">
              {STRINGS.booking.checkout.steps.step1}
            </span>
            <span className="text-slate-300">→</span>
            <span className="px-3 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
              {STRINGS.booking.checkout.steps.step2}
            </span>
            <span className="text-slate-300 hidden sm:inline">→</span>
            <span className="px-3 py-1 rounded-full bg-white text-slate-500 border border-slate-200 hidden sm:inline-block">
              {STRINGS.booking.checkout.steps.step3}
            </span>
          </div>
        </div>

        {/* Main 2-Column Web Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column (7 cols): Rental Period Calendar + Handover Method */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* 1. Interactive Web Calendar & Schedule Selector */}
            <WebDatePicker
              startDate={dateSelection.startDate}
              endDate={dateSelection.endDate}
              pickupTime={dateSelection.pickupTime}
              returnTime={dateSelection.returnTime}
              rentalDurationInfo={rentalDurationInfo}
              onChange={(newSelection) => {
                setDateSelection(newSelection);
                setValidationError(null);
              }}
              disabledDates={disabledDates}
            />

            {/* 2. Handover Method Section (Synchronized with App: Self Pickup vs Doorstep Delivery) */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2.5 pb-3.5 mb-3.5 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center text-brand-500 shrink-0">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">
                    {STRINGS.BOOKING_CREATE.DELIVERY_METHOD_TITLE}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    {STRINGS.booking.delivery.subtitle}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3.5">
                {/* Option 1: Self Pickup */}
                <button
                  type="button"
                  onClick={() => {
                    setDeliveryMethod('pickup');
                    setValidationError(null);
                  }}
                  className={`p-3.5 rounded-xl border-2 text-left transition flex items-start gap-3 cursor-pointer ${
                    deliveryMethod === 'pickup'
                      ? 'border-brand-500 bg-brand-50/40 shadow-2xs'
                      : 'border-slate-200 bg-slate-50/60 hover:border-brand-300'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      deliveryMethod === 'pickup'
                        ? 'bg-brand-500 text-white'
                        : 'bg-brand-50 text-brand-500'
                    }`}
                  >
                    <Store className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">
                        {STRINGS.BOOKING_CREATE.PICKUP_TITLE}
                      </span>
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          deliveryMethod === 'pickup'
                            ? 'border-brand-500'
                            : 'border-slate-300'
                        }`}
                      >
                        {deliveryMethod === 'pickup' && (
                          <span className="w-2 h-2 rounded-full bg-brand-500" />
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      {STRINGS.BOOKING_CREATE.PICKUP_SUB}
                    </p>
                  </div>
                </button>

                {/* Option 2: Doorstep Delivery */}
                <button
                  type="button"
                  onClick={() => {
                    setDeliveryMethod('delivery');
                    setValidationError(null);
                  }}
                  className={`p-3.5 rounded-xl border-2 text-left transition flex items-start gap-3 cursor-pointer ${
                    deliveryMethod === 'delivery'
                      ? 'border-brand-500 bg-brand-50/40 shadow-2xs'
                      : 'border-slate-200 bg-slate-50/60 hover:border-brand-300'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      deliveryMethod === 'delivery'
                        ? 'bg-brand-500 text-white'
                        : 'bg-brand-50 text-brand-500'
                    }`}
                  >
                    <Truck className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">
                        {STRINGS.BOOKING_CREATE.DELIVERY_TITLE}
                      </span>
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          deliveryMethod === 'delivery'
                            ? 'border-brand-500'
                            : 'border-slate-300'
                        }`}
                      >
                        {deliveryMethod === 'delivery' && (
                          <span className="w-2 h-2 rounded-full bg-brand-500" />
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      {STRINGS.BOOKING_CREATE.DELIVERY_SUB}
                    </p>
                  </div>
                </button>
              </div>

              {/* Conditional Handover Location / Delivery Address Box */}
              {deliveryMethod === 'pickup' ? (
                <div className="p-3.5 rounded-xl bg-brand-50/60 border border-brand-200 flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {STRINGS.BOOKING_CREATE.PICKUP_LOCATION_PREFIX}
                    <span className="font-bold text-slate-900">{devicePickupLocation}</span>
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="block text-xs font-bold text-slate-900 mb-1.5">
                    {STRINGS.BOOKING_CREATE.DELIVERY_ADDRESS_LABEL}
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-brand-500 absolute left-3 top-3" />
                    <textarea
                      rows={2}
                      value={deliveryAddress}
                      onChange={(e) => {
                        setDeliveryAddress(e.target.value);
                        setValidationError(null);
                      }}
                      placeholder={STRINGS.BOOKING_CREATE.DELIVERY_ADDRESS_PLACEHOLDER}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:border-brand-500 focus:outline-hidden text-xs sm:text-sm text-slate-800 bg-white resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column (5 cols): Sticky OrderSummaryCard */}
          <div className="lg:col-span-5">
            <OrderSummaryCard
              device={device}
              rentalDays={rentalDays}
              rentalDurationInfo={rentalDurationInfo}
              dailyRate={deviceDailyRate}
              rentalFee={priceDetails.rentalFee}
              discountPercent={priceDetails.discountPercent}
              discountAmount={priceDetails.discountAmount}
              depositFee={priceDetails.depositFee}
              totalAmount={priceDetails.totalAmount}
              isSubmitting={isSubmitting}
              errorMessage={validationError}
              onSubmit={handleSubmitBooking}
            />
          </div>
        </div>
      </div>

      {/* Booking Success Modal (Synchronized with App's BookingSuccessModal) */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-full bg-brand-50 flex items-center justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9 text-brand-500" />
              </div>
            </div>

            <h3 className="text-xl font-extrabold text-slate-900 mb-1.5">
              {STRINGS.BOOKING_CREATE.SUCCESS_MODAL_TITLE}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-5">
              {STRINGS.BOOKING_CREATE.SUCCESS_MODAL_DESC}
            </p>

            <div className="w-full bg-slate-50 rounded-2xl p-4 border border-slate-200 mb-5 text-left space-y-2.5">
              <div>
                <p className="text-[10px] font-bold text-slate-400 tracking-wider">
                  {STRINGS.BOOKING_CREATE.SUCCESS_SUMMARY_DEVICE}
                </p>
                <p className="text-sm font-bold text-slate-900 truncate">{deviceTitle}</p>
              </div>

              <div className="h-px bg-slate-200" />

              <div>
                <p className="text-[10px] font-bold text-slate-400 tracking-wider">
                  {STRINGS.BOOKING_CREATE.SUCCESS_SUMMARY_PERIOD}
                </p>
                <p className="text-xs font-semibold text-slate-900">
                  {dateSelection.pickupTime} - {formatDisplayDate(dateSelection.startDate)} →{' '}
                  {dateSelection.returnTime} -{' '}
                  {formatDisplayDate(dateSelection.endDate || dateSelection.startDate)}
                </p>
              </div>

              <div className="h-px bg-slate-200" />

              <div>
                <p className="text-[10px] font-bold text-slate-400 tracking-wider">
                  {STRINGS.BOOKING_CREATE.SUCCESS_SUMMARY_TOTAL}
                </p>
                <p className="text-base font-extrabold text-brand-500">
                  {formatPriceVnd(priceDetails.totalAmount)}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 w-full">
              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate(-1);
                }}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 font-semibold text-xs sm:text-sm text-slate-600 hover:bg-slate-50 transition"
              >
                {STRINGS.BOOKING_CREATE.SUCCESS_DONE_BTN}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate(ROUTES.MY_BOOKINGS);
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <CalendarDays className="w-4 h-4" />
                <span>{STRINGS.BOOKING_CREATE.SUCCESS_VIEW_BOOKINGS_BTN}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Result Modal */}
      {resultModal.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-6">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 flex flex-col items-center text-center shadow-2xl">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                resultModal.type === 'success'
                  ? 'bg-emerald-50 text-emerald-500'
                  : 'bg-red-50 text-red-500'
              }`}
            >
              {resultModal.type === 'success' ? (
                <CheckCircle2 className="w-10 h-10" />
              ) : (
                <XCircle className="w-10 h-10" />
              )}
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 mb-1.5">
              {resultModal.title}
            </h3>
            <p className="text-sm text-slate-500 leading-5 mb-5">{resultModal.message}</p>
            <button
              type="button"
              onClick={() => setResultModal((prev) => ({ ...prev, visible: false }))}
              className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm transition-colors"
            >
              {STRINGS.BOOKING_CREATE.RESULT_OK_BTN}
            </button>
          </div>
        </div>
      )}

      {/* Login / eKYC Verification Prompt Modal */}
      {authAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-6">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 flex flex-col items-center text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-brand-50 text-brand-500 flex items-center justify-center mb-4">
              {authAlertModal === 'login' ? (
                <UserCheck className="w-8 h-8" />
              ) : (
                <ShieldAlert className="w-8 h-8" />
              )}
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 mb-2">
              {authAlertModal === 'login'
                ? STRINGS.AUTH_LOGIN_ALERT.TITLE
                : STRINGS.AUTH_VERIFY_ALERT.TITLE}
            </h3>
            <p className="text-sm text-slate-500 leading-5 mb-5">
              {authAlertModal === 'login'
                ? STRINGS.AUTH_LOGIN_ALERT.MESSAGE
                : STRINGS.AUTH_VERIFY_ALERT.MESSAGE}
            </p>
            <div className="flex items-center gap-3 w-full">
              <button
                type="button"
                onClick={() => setAuthAlertModal(null)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
              >
                {authAlertModal === 'login'
                  ? STRINGS.AUTH_LOGIN_ALERT.LATER
                  : STRINGS.AUTH_VERIFY_ALERT.LATER}
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = authAlertModal;
                  setAuthAlertModal(null);
                  navigate(target === 'login' ? ROUTES.LOGIN : ROUTES.PROFILE);
                }}
                className="flex-1 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm transition-colors"
              >
                {authAlertModal === 'login'
                  ? STRINGS.AUTH_LOGIN_ALERT.LOGIN_NOW
                  : STRINGS.AUTH_VERIFY_ALERT.VERIFY_NOW}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingCheckoutPage;
