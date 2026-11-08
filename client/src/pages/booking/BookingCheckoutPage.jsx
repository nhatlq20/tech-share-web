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
  Truck,
  Store,
  ShieldCheck,
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
  const [pickupTime, setPickupTime] = useState('09:00');
  const [returnTime, setReturnTime] = useState('18:00');

  const [deliveryMethod, setDeliveryMethod] = useState('delivery');
  const [recipientName, setRecipientName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('escrow');

  useEffect(() => {
    if (user) {
      setRecipientName((prev) => prev || user.name || '');
      setPhone((prev) => prev || user.phone || '');
      setAddress((prev) => prev || user.address || '');
    }
  }, [user]);

  const [agreedTerms, setAgreedTerms] = useState(true);
  const [pledgedCondition, setPledgedCondition] = useState(true);

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

        const deviceRes = await api.get(API_CONFIG.ENDPOINTS.DEVICE_BY_ID(currentDeviceId));
        const deviceData = deviceRes.data || deviceRes;

        if (isMounted) {
          setDevice(deviceData);
        }

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

  const handleDateChange = useCallback(({ startDate: start, endDate: end, totalDays: days, pickupTime: pTime, returnTime: rTime }) => {
    setStartDate(start);
    setEndDate(end);
    setTotalDays(days || 1);
    if (pTime) setPickupTime(pTime);
    if (rTime) setReturnTime(rTime);
    setFormError(null);
  }, []);

  const ownerPickupAddress =
    device?.address ||
    device?.location?.addressText ||
    device?.ownerId?.address ||
    device?.owner?.address ||
    STRINGS.booking.delivery.methods?.pickup?.noAddress ||
    'Owner address pending confirmation';

  const canSubmit = useMemo(() => {
    const isAddressValid = deliveryMethod === 'pickup' ? true : address.trim().length > 0;
    return (
      Boolean(startDate) &&
      Boolean(endDate) &&
      recipientName.trim().length > 0 &&
      phone.trim().length >= 10 &&
      isAddressValid &&
      agreedTerms &&
      pledgedCondition
    );
  }, [startDate, endDate, recipientName, phone, address, deliveryMethod, agreedTerms, pledgedCondition]);

  const handleSubmitBooking = async () => {
    setFormError(null);

    if (user && !user.isVerified && !user.trust?.isVerified) {
      setFormError('Please complete identity verification (eKYC) in your Profile before booking a device.');
      window.scrollTo({ top: 100, behavior: 'smooth' });
      return;
    }

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

    if (deliveryMethod === 'delivery' && !address.trim()) {
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

      const effectiveAddress = deliveryMethod === 'pickup' ? ownerPickupAddress : address.trim();

      const buildIsoDateTime = (dateStr, timeStr, fallbackTime) => {
        if (!dateStr) return null;
        const time = timeStr || fallbackTime || '09:00';
        const [year, month, day] = dateStr.split('-').map(Number);
        const [hours, minutes] = time.split(':').map(Number);
        const d = new Date(year, month - 1, day, hours || 0, minutes || 0, 0, 0);
        return d.toISOString();
      };

      const startDateTime = buildIsoDateTime(startDate, pickupTime, '09:00');
      const endDateTime = buildIsoDateTime(endDate || startDate, returnTime, '18:00');

      const payload = {
        deviceId: currentDeviceId,
        renterId: user?._id || user?.id || null,
        startDate: startDateTime,
        endDate: endDateTime,
        pickupTime,
        returnTime,
        deliveryMethod,
        deliveryAddress: {
          recipientName: recipientName.trim(),
          phone: phone.trim(),
          address: effectiveAddress,
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
          to={ROUTES.HOME}
          className="px-5 py-2.5 rounded-xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 transition shadow-sm"
        >
          &larr; Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Compact Top Bar: Breadcrumb + Title + Stepper in one row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4 bg-white rounded-2xl px-4 py-3 shadow-2xs border border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-brand-600 hover:border-brand-200 transition flex-shrink-0"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <nav className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Link to={ROUTES.HOME} className="hover:text-brand-600 transition">
                  {STRINGS.booking.checkout.breadcrumbHome}
                </Link>
                <ChevronRight className="w-3 h-3" />
                <Link
                  to={ROUTES.DEVICE_DETAIL_PATH(currentDeviceId)}
                  className="hover:text-brand-600 truncate max-w-[160px] transition"
                >
                  {device.title || device.name}
                </Link>
                <ChevronRight className="w-3 h-3" />
                <span className="text-brand-600 font-semibold">
                  {STRINGS.booking.checkout.breadcrumbCheckout}
                </span>
              </nav>
              <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight truncate">
                {STRINGS.booking.checkout.headerTitle}
              </h1>
            </div>
          </div>

          {/* Inline 3-Step Pills */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-800 text-xs font-bold whitespace-nowrap">
              <span className="w-4 h-4 rounded-full bg-brand-500 text-white flex items-center justify-center text-[10px]">
                1
              </span>
              <span>{STRINGS.booking.checkout.steps.step1}</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600 text-xs font-semibold whitespace-nowrap">
              <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px]">
                2
              </span>
              <span>{STRINGS.booking.checkout.steps.step2}</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-400 text-xs font-medium whitespace-nowrap">
              <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[10px]">
                3
              </span>
              <span>{STRINGS.booking.checkout.steps.step3}</span>
            </div>
          </div>
        </div>

        {/* Main 2-Column Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Column: Compact Form Sections (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-3.5">
            {/* Compact eKYC Warning Banner if unverified */}
            {user && !user.isVerified && !user.trust?.isVerified && (
              <div className="px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Identity verification (eKYC) required:</strong> Complete your ID verification before booking.
                  </span>
                </div>
                <Link
                  to={ROUTES.PROFILE}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] transition"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verify eKYC</span>
                </Link>
              </div>
            )}

            {/* Section 1: Compact Side-by-Side Calendar & Time Picker */}
            <WebDatePicker
              startDate={startDate}
              endDate={endDate}
              pickupTime={pickupTime}
              returnTime={returnTime}
              onChange={handleDateChange}
              disabledDates={disabledDates}
              bookedRanges={bookedRanges}
            />

            {/* Section 2: Compact Handover, Delivery & Contact Info */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-brand-500" />
                  <h2 className="text-sm font-bold text-slate-800">
                    {STRINGS.booking.delivery.title}
                  </h2>
                </div>

                {/* Inline Delivery Method Toggle Pills */}
                <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200/70">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('pickup')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                      deliveryMethod === 'pickup'
                        ? 'bg-white text-brand-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>{STRINGS.booking.delivery.methods?.pickup?.title || 'Self Pickup'}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700">
                      Free
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('delivery')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                      deliveryMethod === 'delivery'
                        ? 'bg-white text-brand-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>{STRINGS.booking.delivery.methods?.delivery?.title || 'Doorstep Delivery'}</span>
                  </button>
                </div>
              </div>

              {/* Compact Contact & Address Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                {/* Recipient Name (4 cols) */}
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {STRINGS.booking.delivery.recipientNameLabel}
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder={STRINGS.booking.delivery.recipientNamePlaceholder}
                      className="w-full pl-8 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-brand-500 transition"
                      required
                    />
                  </div>
                </div>

                {/* Phone Number (4 cols) */}
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {STRINGS.booking.delivery.phoneLabel}
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={STRINGS.booking.delivery.phonePlaceholder}
                      className="w-full pl-8 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-brand-500 transition"
                      required
                    />
                  </div>
                </div>

                {/* Note (4 cols) */}
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {STRINGS.booking.delivery.noteLabel}
                  </label>
                  <div className="relative">
                    <FileText className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder={STRINGS.booking.delivery.notePlaceholder}
                      className="w-full pl-8 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-brand-500 transition"
                    />
                  </div>
                </div>

                {/* Address / Pickup Location (Full 12 cols) */}
                <div className="sm:col-span-12">
                  {deliveryMethod === 'pickup' ? (
                    <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <MapPin className="w-4 h-4 text-brand-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-2">
                            {STRINGS.booking.delivery.methods?.pickup?.locationLabel || 'Pickup Address'}:
                          </span>
                          <span className="text-xs font-bold text-slate-800">{ownerPickupAddress}</span>
                        </div>
                      </div>
                      <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold whitespace-nowrap">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        Inspect on pickup
                      </span>
                    </div>
                  ) : (
                    <div>
                      <div className="relative">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder={
                            STRINGS.booking.delivery.methods?.delivery?.addressPlaceholder ||
                            STRINGS.booking.delivery.addressPlaceholder
                          }
                          className="w-full pl-8 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-brand-500 transition"
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3: Compact 3-Column Payment Method + Inline Terms */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 mb-3">
                <CreditCard className="w-4 h-4 text-brand-500" />
                <h2 className="text-sm font-bold text-slate-800">
                  {STRINGS.booking.payment.title} &amp; {STRINGS.booking.agreement.title}
                </h2>
              </div>

              {/* 3-Column Payment Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3">
                {/* Escrow */}
                <label
                  className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
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
                    className="mt-0.5 accent-brand-500"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-800 truncate">
                        {STRINGS.booking.payment.methods.escrow.title}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-700 font-bold shrink-0">
                        {STRINGS.booking.payment.methods.escrow.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-tight">
                      {STRINGS.booking.payment.methods.escrow.desc}
                    </p>
                  </div>
                </label>

                {/* Bank Transfer */}
                <label
                  className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
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
                    className="mt-0.5 accent-brand-500"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-800 truncate">
                        {STRINGS.booking.payment.methods.bankTransfer.title}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold shrink-0">
                        {STRINGS.booking.payment.methods.bankTransfer.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-tight">
                      {STRINGS.booking.payment.methods.bankTransfer.desc}
                    </p>
                  </div>
                </label>

                {/* COD */}
                <label
                  className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
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
                    className="mt-0.5 accent-brand-500"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-800 truncate">
                        {STRINGS.booking.payment.methods.cod.title}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold shrink-0">
                        {STRINGS.booking.payment.methods.cod.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-tight">
                      {STRINGS.booking.payment.methods.cod.desc}
                    </p>
                  </div>
                </label>
              </div>

              {/* Compact Inline Terms Checkboxes */}
              <div className="pt-2.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="flex items-start gap-2 text-[11px] text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    className="mt-0.5 rounded accent-brand-500"
                  />
                  <span className="leading-snug">{STRINGS.booking.agreement.termsText}</span>
                </label>

                <label className="flex items-start gap-2 text-[11px] text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pledgedCondition}
                    onChange={(e) => setPledgedCondition(e.target.checked)}
                    className="mt-0.5 rounded accent-brand-500"
                  />
                  <span className="leading-snug">{STRINGS.booking.agreement.pledgeText}</span>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Compact Sticky Order Summary (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mb-4 shadow-xs">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {STRINGS.booking.successModal.title}
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              {STRINGS.booking.successModal.subtitle}
            </p>

            {/* Booking Code Snippet */}
            <div className="my-5 p-4 rounded-2xl bg-brand-50/70 border border-brand-200/80 w-full flex items-center justify-between">
              <div className="text-left">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                  {STRINGS.booking.successModal.codePrefix}
                </span>
                <span className="text-lg font-black text-brand-800 tracking-wider">
                  #{successBooking.bookingCode}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-brand-200 text-brand-700 text-xs font-bold hover:bg-brand-50 transition shadow-xs"
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
            <div className="w-full bg-slate-50 rounded-2xl p-4 text-xs text-slate-600 flex flex-col gap-2.5 mb-5 text-left border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-400">{STRINGS.booking.successModal.deviceInfo}</span>
                <strong className="text-slate-800">{device.title || device.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{STRINGS.booking.successModal.durationInfo}</span>
                <span className="text-slate-800 font-medium">
                  {formatDate(startDate)} ➔ {formatDate(endDate)} ({totalDays} {totalDays === 1 ? 'day' : 'days'})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{STRINGS.booking.successModal.totalInfo}</span>
                <strong className="text-brand-800 font-extrabold text-sm">{formatPrice(totalAmount)}</strong>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
                <span className="text-slate-500">Status:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[11px]">
                  {STRINGS.booking.successModal.statusPendingBadge}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mb-6 italic leading-relaxed">
              {STRINGS.booking.successModal.noticeText}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 w-full">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    ROUTES.MESSAGES_PATH(
                      successBooking._id || successBooking.id || successBooking.bookingId
                    )
                  )
                }
                className="flex-1 py-3 px-4 rounded-full bg-teal-50 hover:bg-teal-500 text-teal-700 hover:text-white border border-teal-200 hover:border-teal-500 font-bold text-xs transition shadow-xs flex items-center justify-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat with Owner</span>
              </button>
              <button
                type="button"
                onClick={() => navigate(ROUTES.EXPLORE)}
                className="flex-1 py-3 px-4 rounded-full border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition"
              >
                {STRINGS.booking.successModal.continueExploreBtn}
              </button>
              <button
                type="button"
                onClick={() => navigate(successBooking?.bookingCode ? ROUTES.BOOKING_DETAIL_PATH(successBooking.bookingCode) : ROUTES.MY_BOOKINGS)}
                className="flex-1 py-3 px-4 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-md shadow-brand-500/20 transition"
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
