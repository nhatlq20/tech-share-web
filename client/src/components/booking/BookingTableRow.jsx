import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronRight, Package } from 'lucide-react';
import { STRINGS } from '../../constants/strings.ts';
import { ROUTES } from '../../routes/routes.js';
import { formatPrice, formatDate } from '../../utils/formatters.js';
import { BookingStatusBadge } from './BookingStatusBadge.jsx';

const T = STRINGS.booking.myBookings;

/**
 * Extract display-ready fields from a booking document (handles device/deviceId aliases).
 */
const toRowModel = (booking) => {
  const device = booking.device || booking.deviceId || {};
  const bookingKey = booking.bookingCode || booking._id;
  return {
    bookingKey,
    detailPath: ROUTES.BOOKING_DETAIL_PATH(bookingKey),
    title: device.title || device.name || T.untitledDevice,
    brand: device.brand || '',
    image: Array.isArray(device.images) && device.images.length > 0 ? device.images[0] : '',
    bookingCode: booking.bookingCode || '',
    startDate: formatDate(booking.startDate),
    endDate: formatDate(booking.endDate),
    totalDays: booking.totalDays || 1,
    createdAt: formatDate(booking.createdAt),
    totalAmount: formatPrice(booking.totalAmount),
    status: booking.status,
  };
};

const DeviceThumb = ({ image, title }) => (
  <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
    {image ? (
      <img src={image} alt={title} className="w-full h-full object-cover" loading="lazy" />
    ) : (
      <Package className="w-6 h-6 text-slate-400" aria-hidden="true" />
    )}
  </div>
);

/**
 * Desktop table row for the My Bookings hub.
 */
export const BookingTableRow = ({ booking }) => {
  const row = toRowModel(booking);

  return (
    <tr className="group hover:bg-brand-50 transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-4 min-w-0">
          <DeviceThumb image={row.image} title={row.title} />
          <div className="min-w-0">
            <Link
              to={row.detailPath}
              className="block text-sm font-bold text-slate-800 truncate hover:text-brand-600 transition-colors"
            >
              {row.title}
            </Link>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
              {row.brand && <span className="truncate">{row.brand}</span>}
              {row.brand && <span className="w-1 h-1 rounded-full bg-slate-300" aria-hidden="true" />}
              <span className="font-mono text-slate-600">
                {T.bookingCodePrefix}: {row.bookingCode}
              </span>
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2 text-sm text-slate-700 whitespace-nowrap">
          <CalendarDays className="w-4 h-4 text-slate-400" aria-hidden="true" />
          <span>{row.startDate}</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" aria-hidden="true" />
          <span>{row.endDate}</span>
        </div>
        <p className="text-xs text-slate-500 mt-1">{T.daysSuffix(row.totalDays)}</p>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm font-bold text-brand-800">{row.totalAmount}</span>
        <p className="text-xs text-slate-400 mt-1">
          {T.createdAtPrefix} {row.createdAt}
        </p>
      </td>
      <td className="px-6 py-4">
        <BookingStatusBadge status={row.status} />
      </td>
      <td className="px-6 py-4 text-right">
        <Link
          to={row.detailPath}
          id={`booking-detail-link-${row.bookingKey}`}
          className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-xs font-semibold text-brand-700 bg-brand-100 hover:bg-brand-500 hover:text-white transition-colors"
        >
          {T.viewDetailBtn}
          <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </td>
    </tr>
  );
};

/**
 * Mobile card variant (same data as the table row) for small screens.
 */
export const BookingMobileCard = ({ booking }) => {
  const row = toRowModel(booking);

  return (
    <Link
      to={row.detailPath}
      className="block bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-4">
        <DeviceThumb image={row.image} title={row.title} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-800 truncate">{row.title}</h3>
            <BookingStatusBadge status={row.status} size="sm" />
          </div>
          <p className="text-xs font-mono text-slate-500 mt-1">
            {T.bookingCodePrefix}: {row.bookingCode}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-600">
            <CalendarDays className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            <span>
              {row.startDate} → {row.endDate}
            </span>
            <span className="text-slate-400">· {T.daysSuffix(row.totalDays)}</span>
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-sm font-bold text-brand-800">{row.totalAmount}</span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600">
              {T.viewDetailBtn}
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default BookingTableRow;
