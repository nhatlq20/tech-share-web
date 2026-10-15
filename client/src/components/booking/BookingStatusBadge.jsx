import React from 'react';
import { Clock, CheckCircle2, PackageCheck, BadgeCheck, XCircle, Ban, HelpCircle } from 'lucide-react';
import { STRINGS } from '../../constants/strings.ts';
import { BOOKING_STATUS } from '../../constants/config.ts';

/**
 * Status → visual tokens (Tailwind design tokens only, no hex values).
 * Exported so other booking components (tabs, timeline) stay visually consistent.
 */
export const BOOKING_STATUS_STYLES = {
  [BOOKING_STATUS.PENDING]: {
    icon: Clock,
    badge: 'bg-amber-50 text-amber-700 ring-amber-200',
    dot: 'bg-amber-500',
  },
  [BOOKING_STATUS.APPROVED]: {
    icon: CheckCircle2,
    badge: 'bg-sky-50 text-sky-700 ring-sky-200',
    dot: 'bg-sky-500',
  },
  [BOOKING_STATUS.ACTIVE]: {
    icon: PackageCheck,
    badge: 'bg-brand-50 text-brand-800 ring-brand-300',
    dot: 'bg-brand-500',
  },
  [BOOKING_STATUS.COMPLETED]: {
    icon: BadgeCheck,
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    dot: 'bg-emerald-500',
  },
  [BOOKING_STATUS.CANCELLED]: {
    icon: XCircle,
    badge: 'bg-slate-100 text-slate-600 ring-slate-200',
    dot: 'bg-slate-400',
  },
  [BOOKING_STATUS.REJECTED]: {
    icon: Ban,
    badge: 'bg-red-50 text-red-600 ring-red-200',
    dot: 'bg-red-500',
  },
};

const FALLBACK_STYLE = {
  icon: HelpCircle,
  badge: 'bg-slate-100 text-slate-500 ring-slate-200',
  dot: 'bg-slate-400',
};

export const getBookingStatusStyle = (status) => BOOKING_STATUS_STYLES[status] || FALLBACK_STYLE;

/**
 * Pill-shaped booking status badge.
 */
export const BookingStatusBadge = ({ status, size = 'md', className = '' }) => {
  const style = getBookingStatusStyle(status);
  const Icon = style.icon;
  const label = STRINGS.booking.status[status] || STRINGS.booking.status.unknown;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs gap-1' : 'px-3 py-1 text-xs gap-1.5';

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ring-1 ring-inset whitespace-nowrap ${sizeClasses} ${style.badge} ${className}`}
    >
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      {label}
    </span>
  );
};

export default BookingStatusBadge;
