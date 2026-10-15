import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Star,
  ShieldCheck,
  MapPin,
  Clock,
  ArrowRight,
  ChevronLeft,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Cpu,
  MessageSquare,
} from 'lucide-react';
import { ROUTES } from '../routes/routes.js';
import { API_CONFIG } from '../constants/config.js';
import { STRINGS } from '../constants/strings.js';
import { api } from '../services/api.js';
import { formatPrice } from '../utils/formatters.js';
import { formatCategoryLabel, formatConditionLabel } from '../components/device/DeviceCard.jsx';

export const DeviceDetailPage = () => {
  const { deviceId, id } = useParams();
  const currentDeviceId = deviceId || id;

  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchDevice = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(API_CONFIG.ENDPOINTS.DEVICE_BY_ID(currentDeviceId));
        const data = res.data || res;
        if (isMounted) {
          setDevice(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Unable to load device information.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDevice();
    return () => {
      isMounted = false;
    };
  }, [currentDeviceId]);

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

  if (error || !device) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Device Not Found</h2>
        <p className="text-sm text-slate-500 max-w-md mt-1 mb-6">
          {error || 'The device you are looking for does not exist or has been hidden.'}
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

  const title = (device.title || device.name || 'Device').trim();
  const brand = (device.brand || '').trim();
  const images = Array.isArray(device.images) && device.images.length > 0 ? device.images : [];
  const dailyRate = device.dailyRate ?? device.pricePerDay ?? 0;
  const depositValue = device.depositValue || 0;
  const rating = (device.rating ?? device.ratingAvg ?? 5.0).toFixed(1);
  const reviewCount = device.reviewCount || 0;
  const categoryLabel = formatCategoryLabel(device.category);
  const conditionLabel = formatConditionLabel(device.condition);
  const specs = device.specs && typeof device.specs === 'object' ? Object.entries(device.specs) : [];

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            to={ROUTES.OWNER_DEVICES}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-brand-600 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Catalog
          </Link>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Images & Info (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Gallery Card */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <div className="aspect-[4/3] rounded-xl bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center relative">
                {images.length > 0 ? (
                  <img
                    src={images[activeImage] || images[0]}
                    alt={title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-slate-400">No image available</span>
                )}

                {conditionLabel && (
                  <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm text-brand-800 text-xs font-bold shadow-sm">
                    {conditionLabel}
                  </span>
                )}
              </div>

              {images.length > 1 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImage(idx)}
                      className={`w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 transition ${
                        activeImage === idx ? 'border-brand-500' : 'border-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <img src={img} alt={`${title} ${idx}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Description Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-base font-bold text-slate-800 mb-3">Device Description</h2>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                {device.description || 'No detailed description available for this device.'}
              </p>
            </div>

            {/* Specs Table */}
            {specs.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-brand-500" />
                  Technical Specifications
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {specs.map(([k, v]) => (
                    <div key={k} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex justify-between text-xs">
                      <span className="text-slate-500 capitalize">{k}:</span>
                      <strong className="text-slate-700">{String(v)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Booking Summary & Direct CTA (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6 sticky top-24">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col gap-5">
              <div>
                {brand && (
                  <span className="text-xs font-bold text-brand-600 uppercase tracking-wide">
                    {brand}
                  </span>
                )}
                <h1 className="text-xl font-extrabold text-slate-900 mt-1 leading-snug">
                  {title}
                </h1>

                <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span className="font-bold text-slate-700">{rating}</span>
                  </div>
                  <span>•</span>
                  <span>{reviewCount} reviews</span>
                  <span>•</span>
                  <span className="capitalize">{categoryLabel}</span>
                </div>
              </div>

              {/* Pricing Box */}
              <div className="p-4 rounded-xl bg-brand-50/70 border border-brand-100 flex items-baseline justify-between">
                <div>
                  <span className="text-xs text-slate-500 block">Daily Rate:</span>
                  <span className="text-2xl font-black text-brand-800">
                    {formatPrice(dailyRate)}
                  </span>
                  <span className="text-xs text-slate-500"> / day</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Security Deposit:</span>
                  <span className="text-sm font-bold text-slate-700">
                    {formatPrice(depositValue)}
                  </span>
                </div>
              </div>

              {/* Location */}
              {device.address && (
                <div className="flex items-start gap-2 text-xs text-slate-500">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <span>Handover Location: {device.address}</span>
                </div>
              )}

              {/* Primary Booking CTA */}
              <Link
                to={ROUTES.BOOKING_CHECKOUT_PATH(currentDeviceId)}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-brand-500 hover:bg-brand-600 text-white shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                <span>Rent This Device Now</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              {/* Message Owner CTA */}
              <Link
                to={ROUTES.MESSAGES}
                className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs border border-slate-200 text-slate-700 hover:bg-slate-50 transition flex items-center justify-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                <span>Nhắn tin trao đổi với Chủ thiết bị</span>
              </Link>

              {/* Escrow Guarantee */}
              <div className="pt-3 border-t border-slate-100 flex flex-col gap-2 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-brand-500" />
                  <span>100% Protected with TechShare Escrow</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Free cancellation before owner approval</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  <span>Owner typically responds within 2 hours</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceDetailPage;
