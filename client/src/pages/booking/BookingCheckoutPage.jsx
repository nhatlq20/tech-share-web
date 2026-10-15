import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronRight,
  User,
  Phone,
  MapPin,
  FileText,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Copy,
  ArrowLeft,
  MessageSquare,
} from 'lucide-react';
import { STRINGS } from '../../constants/strings.js';
import { API_CONFIG, MAGIC_NUMBERS } from '../../constants/config.js';
import { ROUTES } from '../../routes/routes.js';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { WebDatePicker } from '../../components/booking/WebDatePicker.jsx';
import { OrderSummaryCard } from '../../components/booking/OrderSummaryCard.jsx';
import { formatPrice, formatDate } from '../../utils/formatters.js';

export const BookingCheckoutPage = () => {
  const { deviceId, id } = useParams();
  const currentDeviceId = deviceId || id;
  const navigate = useNavigate();
  const { user } = useAuth();

  // Device & Availability state
  const [device, setDevice] = useState(null);
  const [disabledDates, setDisabledDates] = useState([]);
  const [bookedRanges, setBookedRanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Booking Form State
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [totalDays, setTotalDays] = useState(1);

  const [recipientName, setRecipientName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('escrow');

  const [agreedTerms, setAgreedTerms] = useState(true);
  const [pledgedCondition, setPledgedCondition] = useState(true);

  // Submit & Modal state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [successBooking, setSuccessBooking] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Load device details and availability
  useEffect(() => {
    let isMounted = true;
    const fetchDeviceData = async () => {
      if (!currentDeviceId) {
        setFetchError('Device ID not found');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setFetchError(null);

        // 1. Fetch Device details
        const deviceRes = await api.get(API_CONFIG.ENDPOINTS.DEVICE_BY_ID(currentDeviceId));
        const deviceData = deviceRes.data || deviceRes;

        if (isMounted) {
          setDevice(deviceData);
        }

        // 2. Fetch Availability & Blocked dates
        try {
          const availRes = await api.get(API_CONFIG.ENDPOINTS.DEVICE_AVAILABILITY(currentDeviceId));
          if (isMounted && availRes.success && availRes.data) {
            setDisabledDates(availRes.data.disabledDates || []);
            setBookedRanges(availRes.data.bookedRanges || []);
          }
        } catch (availErr) {
          console.warn('Could not load dynamic availability, using empty array', availErr);
        }
      } catch (err) {
        if (isMounted) {
          setFetchError(err.message || 'Unable to load device information');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDeviceData();

    return () => {
      isMounted = false;
    };
  }, [currentDeviceId]);

  // Pricing Calculation
  const dailyRate = device?.dailyRate ?? device?.pricePerDay ?? 0;
  const rentalFee = dailyRate * Math.max(1, totalDays);

  const { longRentalDiscount, longRentalDiscountPercent } = useMemo(() => {
    if (totalDays >= MAGIC_NUMBERS.BOOKING.LONG_RENTAL_TIER_2_DAYS) {
      return {
        longRentalDiscount: Math.round(rentalFee * (MAGIC_NUMBERS.BOOKING.LONG_RENTAL_TIER_2_DISCOUNT_PERCENT / 100)),
        longRentalDiscountPercent: MAGIC_NUMBERS.BOOKING.LONG_RENTAL_TIER_2_DISCOUNT_PERCENT,
      };
    }
    if (totalDays >= MAGIC_NUMBERS.BOOKING.LONG_RENTAL_TIER_1_DAYS) {
      return {
        longRentalDiscount: Math.round(rentalFee * (MAGIC_NUMBERS.BOOKING.LONG_RENTAL_TIER_1_DISCOUNT_PERCENT / 100)),
        longRentalDiscountPercent: MAGIC_NUMBERS.BOOKING.LONG_RENTAL_TIER_1_DISCOUNT_PERCENT,
      };
    }
    return { longRentalDiscount: 0, longRentalDiscountPercent: 0 };
  }, [totalDays, rentalFee]);

  const depositValue = device?.depositValue ?? device?.depositAmount ?? 0;
  const finalRentalFee = Math.max(0, rentalFee - longRentalDiscount);
  const totalAmount = finalRentalFee + depositValue;

  // Handle Date Selection Change
  const handleDateChange = useCallback(({ startDate: start, endDate: end, totalDays: days }) => {
    setStartDate(start);
    setEndDate(end);
    setTotalDays(days || 1);
    setFormError(null);
  }, []);

  // Form Validation
  const canSubmit = useMemo(() => {
    return (
      Boolean(startDate) &&
      Boolean(endDate) &&
      recipientName.trim().length > 0 &&
      phone.trim().length >= 10 &&
      address.trim().length > 0 &&
      agreedTerms &&
      pledgedCondition
    );
  }, [startDate, endDate, recipientName, phone, address, agreedTerms, pledgedCondition]);

  // Handle Order Submit
  const handleSubmitBooking = async () => {
    setFormError(null);

    if (!startDate || !endDate) {
      setFormError(STRINGS.booking.validation.noDatesSelected);
      window.scrollTo({ top: 100, behavior: 'smooth' });
      return;
    }

    if (!recipientName.trim()) {
      setFormError(STRINGS.booking.validation.missingRecipientName);
      window.scrollTo({ top: 350, behavior: 'smooth' });
      return;
    }

    if (!phone.trim() || phone.trim().length < 10) {
      setFormError(STRINGS.booking.validation.invalidPhone);
      window.scrollTo({ top: 350, behavior: 'smooth' });
      return;
    }

    if (!address.trim()) {
      setFormError(STRINGS.booking.validation.missingAddress);
      window.scrollTo({ top: 400, behavior: 'smooth' });
      return;
    }

    if (!agreedTerms || !pledgedCondition) {
      setFormError(STRINGS.booking.validation.mustAgreeTerms);
      window.scrollTo({ top: 600, behavior: 'smooth' });
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        deviceId: currentDeviceId,
        renterId: user?._id || user?.id || null,
        startDate,
        endDate,
        deliveryMethod: 'delivery',
        deliveryAddress: {
          recipientName: recipientName.trim(),
          phone: phone.trim(),
          address: address.trim(),
        },
        renterInfo: {
          name: recipientName.trim(),
          phone: phone.trim(),
          email: user?.email || '',
        },
        voucherCode: '',
        note: note.trim(),
        paymentMethod,
      };

      const res = await api.post(API_CONFIG.ENDPOINTS.BOOKINGS, payload);

      if (res.success && res.data) {
        setSuccessBooking(res.data);
      } else {
        throw new Error(res.message || 'Booking creation failed');
      }
    } catch (err) {
      setFormError(err.message || 'An error occurred while creating booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    if (successBooking?.bookingCode) {
      navigator.clipboard.writeText(successBooking.bookingCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-semibold text-slate-600">
          {STRINGS.common.loading}
        </span>
      </div>
    );
  }

  // Error Screen
  if (fetchError || !device) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
        <h2 className="text-lg font-bold text-slate-800">
          Device Not Found
        </h2>
        <p className="text-sm text-slate-500 max-w-md mt-1 mb-6">
          {fetchError || 'The device you requested does not exist or has been removed.'}
        </p>
        <Link
          to={ROUTES.EXPLORE}
          className="px-5 py-2.5 rounded-xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 transition shadow-sm"
        >
          &larr; Back to Device Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <Link to={ROUTES.HOME} className="hover:text-brand-600 transition">
            {STRINGS.booking.checkout.breadcrumbHome}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <Link to={ROUTES.EXPLORE} className="hover:text-brand-600 transition">
            {STRINGS.booking.checkout.breadcrumbExplore}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <Link
            to={ROUTES.DEVICE_DETAIL_PATH(currentDeviceId)}
            className="hover:text-brand-600 truncate max-w-[180px] transition"
          >
            {device.title || device.name}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-brand-600 font-semibold">
            {STRINGS.booking.checkout.breadcrumbCheckout}
          </span>
        </nav>

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-brand-600 hover:border-brand-200 transition"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {STRINGS.booking.checkout.headerTitle}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {STRINGS.booking.checkout.headerSubtitle}
              </p>
            </div>
          </div>

          {/* Stepper progress indicator */}
          <div className="grid grid-cols-3 gap-2 mt-6">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-brand-50 border border-brand-200 text-brand-800 text-xs font-bold">
              <span className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[10px]">
                1
              </span>
              <span className="truncate">{STRINGS.booking.checkout.steps.step1}</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-semibold">
              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px]">
                2
              </span>
              <span className="truncate">{STRINGS.booking.checkout.steps.step2}</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 text-xs font-medium">
              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[10px]">
                3
              </span>
              <span className="truncate">{STRINGS.booking.checkout.steps.step3}</span>
            </div>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form Sections (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Section 1: Date Range Picker */}
            <WebDatePicker
              startDate={startDate}
              endDate={endDate}
              onChange={handleDateChange}
              disabledDates={disabledDates}
              bookedRanges={bookedRanges}
            />

            {/* Section 2: Delivery & Renter Information */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-5">
                <User className="w-5 h-5 text-brand-500" />
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    {STRINGS.booking.delivery.title}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {STRINGS.booking.delivery.subtitle}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Recipient Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {STRINGS.booking.delivery.recipientNameLabel}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder={STRINGS.booking.delivery.recipientNamePlaceholder}
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
                      required
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {STRINGS.booking.delivery.phoneLabel}
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={STRINGS.booking.delivery.phonePlaceholder}
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
                      required
                    />
                  </div>
                </div>

                {/* Delivery Address */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {STRINGS.booking.delivery.addressLabel}
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder={STRINGS.booking.delivery.addressPlaceholder}
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
                      required
                    />
                  </div>
                </div>

                {/* Note */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {STRINGS.booking.delivery.noteLabel}
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <textarea
                      rows={2}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder={STRINGS.booking.delivery.notePlaceholder}
                      className="w-full pl-10 pr-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Payment Method */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-5">
                <CreditCard className="w-5 h-5 text-brand-500" />
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    {STRINGS.booking.payment.title}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {STRINGS.booking.payment.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {/* Option 1: Escrow */}
                <label
                  className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition ${
                    paymentMethod === 'escrow'
                      ? 'border-brand-500 bg-brand-50/40 ring-1 ring-brand-500/30'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="escrow"
                    checked={paymentMethod === 'escrow'}
                    onChange={() => setPaymentMethod('escrow')}
                    className="mt-1 accent-brand-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">
                        {STRINGS.booking.payment.methods.escrow.title}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 font-semibold">
                        {STRINGS.booking.payment.methods.escrow.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {STRINGS.booking.payment.methods.escrow.desc}
                    </p>
                  </div>
                </label>

                {/* Option 2: Bank Transfer (VietQR) */}
                <label
                  className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition ${
                    paymentMethod === 'bank_transfer'
                      ? 'border-brand-500 bg-brand-50/40 ring-1 ring-brand-500/30'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="bank_transfer"
                    checked={paymentMethod === 'bank_transfer'}
                    onChange={() => setPaymentMethod('bank_transfer')}
                    className="mt-1 accent-brand-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">
                        {STRINGS.booking.payment.methods.bankTransfer.title}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                        {STRINGS.booking.payment.methods.bankTransfer.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {STRINGS.booking.payment.methods.bankTransfer.desc}
                    </p>
                  </div>
                </label>

                {/* Option 3: COD */}
                <label
                  className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition ${
                    paymentMethod === 'cash_on_delivery'
                      ? 'border-brand-500 bg-brand-50/40 ring-1 ring-brand-500/30'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cash_on_delivery"
                    checked={paymentMethod === 'cash_on_delivery'}
                    onChange={() => setPaymentMethod('cash_on_delivery')}
                    className="mt-1 accent-brand-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">
                        {STRINGS.booking.payment.methods.cod.title}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                        {STRINGS.booking.payment.methods.cod.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {STRINGS.booking.payment.methods.cod.desc}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Section 4: Terms & Agreement */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col gap-3">
              <h2 className="text-sm font-bold text-slate-800 mb-1">
                {STRINGS.booking.agreement.title}
              </h2>

              <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="mt-0.5 rounded accent-brand-500"
                />
                <span>{STRINGS.booking.agreement.termsText}</span>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pledgedCondition}
                  onChange={(e) => setPledgedCondition(e.target.checked)}
                  className="mt-0.5 rounded accent-brand-500"
                />
                <span>{STRINGS.booking.agreement.pledgeText}</span>
              </label>
            </div>

            {/* Error Banner */}
            {formError && (
              <div className="p-4 rounded-xl bg-red-50 text-red-600 text-xs flex items-center gap-2.5 border border-red-100">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{formError}</span>
              </div>
            )}
          </div>

          {/* Right Column: Order Summary (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <OrderSummaryCard
              device={device}
              totalDays={totalDays}
              dailyRate={dailyRate}
              rentalFee={rentalFee}
              longRentalDiscount={longRentalDiscount}
              longRentalDiscountPercent={longRentalDiscountPercent}
              depositValue={depositValue}
              totalAmount={totalAmount}
              isSubmitting={isSubmitting}
              canSubmit={canSubmit}
              errorMessage={formError}
              onSubmit={handleSubmitBooking}
            />
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {successBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-slate-100 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <h2 className="text-xl font-bold text-slate-800">
              {STRINGS.booking.successModal.title}
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              {STRINGS.booking.successModal.subtitle}
            </p>

            {/* Booking Code Snippet */}
            <div className="my-5 p-4 rounded-2xl bg-brand-50/70 border border-brand-200 w-full flex items-center justify-between">
              <div className="text-left">
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">
                  {STRINGS.booking.successModal.codePrefix}
                </span>
                <span className="text-lg font-black text-brand-800 tracking-wider">
                  {successBooking.bookingCode}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-brand-300 text-brand-700 text-xs font-semibold hover:bg-brand-100 transition shadow-xs"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>
                  {copiedCode
                    ? STRINGS.booking.successModal.copiedText
                    : STRINGS.booking.successModal.copyCodeBtn}
                </span>
              </button>
            </div>

            {/* Summary Details */}
            <div className="w-full bg-slate-50 rounded-2xl p-4 text-xs text-slate-600 flex flex-col gap-2.5 mb-6 text-left">
              <div className="flex justify-between">
                <span>{STRINGS.booking.successModal.deviceInfo}</span>
                <strong className="text-slate-800">{device.title || device.name}</strong>
              </div>
              <div className="flex justify-between">
                <span>{STRINGS.booking.successModal.durationInfo}</span>
                <span className="text-slate-800">
                  {formatDate(startDate)} ➔ {formatDate(endDate)} ({totalDays} {totalDays === 1 ? 'day' : 'days'})
                </span>
              </div>
              <div className="flex justify-between">
                <span>{STRINGS.booking.successModal.totalInfo}</span>
                <strong className="text-brand-700 font-bold">{formatPrice(totalAmount)}</strong>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="text-slate-500">Status:</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold text-[11px]">
                  {STRINGS.booking.successModal.statusPendingBadge}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mb-6 italic">
              {STRINGS.booking.successModal.noticeText}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    ROUTES.MESSAGES_PATH(
                      successBooking._id || successBooking.id || successBooking.bookingId
                    )
                  )
                }
                className="flex-1 py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Nhắn tin với Chủ máy</span>
              </button>
              <button
                type="button"
                onClick={() => navigate(ROUTES.EXPLORE)}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition"
              >
                {STRINGS.booking.successModal.continueExploreBtn}
              </button>
              <button
                type="button"
                onClick={() => navigate(successBooking?.bookingCode ? ROUTES.BOOKING_DETAIL_PATH(successBooking.bookingCode) : ROUTES.MY_BOOKINGS)}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-md transition"
              >
                {STRINGS.booking.successModal.viewMyBookingsBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingCheckoutPage;
