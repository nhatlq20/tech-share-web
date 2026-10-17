import React, { useMemo } from 'react';
import {
  Check,
  X,
  Ban,
  Loader2,
  Clock,
  CheckCircle2,
  CalendarPlus,
  BadgeCheck,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { STRINGS } from '../../constants/strings.js';
import {
  BOOKING_STATUS,
  BOOKING_TIMELINE_STEPS,
  BOOKING_TERMINAL_STATUSES,
} from '../../constants/config.js';
import { formatDateTime } from '../../utils/formatters.js';

const T = STRINGS.booking.timeline;

const STEP_STATE = {
  DONE: 'done',
  CURRENT: 'current',
  UPCOMING: 'upcoming',
  TERMINAL: 'terminal',
};

const getEntryTime = (entry) => entry?.timestamp || entry?.updatedAt || null;

/**
 * Build the list of visual steps from booking status + timeline history.
 * - Happy path: Created → Approved → Handed over → Completed.
 * - Cancelled/Rejected: keeps the reached milestones, then ends with a terminal step.
 */
const buildSteps = ({ status, timeline, createdAt }) => {
  const history = Array.isArray(timeline) ? timeline : [];
  const firstTimeOf = (stepStatus) => {
    const entry = history.find((item) => item.status === stepStatus);
    if (entry) return getEntryTime(entry);
    return stepStatus === BOOKING_STATUS.PENDING ? createdAt : null;
  };

  const isTerminal = BOOKING_TERMINAL_STATUSES.includes(status);

  if (isTerminal) {
    const reached = BOOKING_TIMELINE_STEPS.filter(
      (step) => step === BOOKING_STATUS.PENDING || history.some((item) => item.status === step)
    );
    return [
      ...reached.map((step) => ({ key: step, state: STEP_STATE.DONE, time: firstTimeOf(step) })),
      { key: status, state: STEP_STATE.TERMINAL, time: firstTimeOf(status) },
    ];
  }

  const currentIndex = Math.max(0, BOOKING_TIMELINE_STEPS.indexOf(status));
  return BOOKING_TIMELINE_STEPS.map((step, index) => {
    let state = STEP_STATE.UPCOMING;
    if (index <= currentIndex) state = STEP_STATE.DONE;
    else if (index === currentIndex + 1) state = STEP_STATE.CURRENT;
    return { key: step, state, time: index <= currentIndex ? firstTimeOf(step) : null };
  });
};

const STEP_CIRCLE_CLASSES = {
  [STEP_STATE.DONE]: 'bg-brand-500 text-white shadow-md',
  [STEP_STATE.CURRENT]: 'bg-white text-brand-600 ring-2 ring-brand-500',
  [STEP_STATE.UPCOMING]: 'bg-slate-100 text-slate-400',
};

const TERMINAL_CIRCLE_CLASSES = {
  [BOOKING_STATUS.CANCELLED]: 'bg-slate-500 text-white shadow-md',
  [BOOKING_STATUS.REJECTED]: 'bg-red-500 text-white shadow-md',
};

const StepIcon = ({ step, index }) => {
  if (step.state === STEP_STATE.TERMINAL) {
    return step.key === BOOKING_STATUS.REJECTED
      ? <Ban className="w-4 h-4" aria-hidden="true" />
      : <X className="w-4 h-4" aria-hidden="true" />;
  }
  if (step.state === STEP_STATE.DONE) return <Check className="w-4 h-4" aria-hidden="true" />;
  if (step.state === STEP_STATE.CURRENT) return <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />;
  return <span className="text-xs font-bold">{index + 1}</span>;
};

/**
 * Visual stepper of the booking lifecycle (vertical on mobile, horizontal on desktop).
 */
export const OrderTimelineStepper = ({ status, timeline, createdAt }) => {
  const steps = useMemo(
    () => buildSteps({ status, timeline, createdAt }),
    [status, timeline, createdAt]
  );

  return (
    <ol className="flex flex-col md:flex-row md:items-start gap-0" aria-label={STRINGS.booking.detail.sections.timeline}>
      {steps.map((step, index) => {
        const copy = T.steps[step.key] || { title: step.key, desc: '' };
        const isLast = index === steps.length - 1;
        const nextReached = !isLast && steps[index + 1].state !== STEP_STATE.UPCOMING
          && steps[index + 1].state !== STEP_STATE.CURRENT;
        const circleClasses = step.state === STEP_STATE.TERMINAL
          ? TERMINAL_CIRCLE_CLASSES[step.key] || TERMINAL_CIRCLE_CLASSES[BOOKING_STATUS.CANCELLED]
          : STEP_CIRCLE_CLASSES[step.state];
        const connectorClasses = nextReached ? 'bg-brand-500' : 'bg-slate-200';

        return (
          <li
            key={step.key}
            className="relative flex md:flex-col md:items-center md:text-center gap-4 md:gap-3 flex-1 pb-6 md:pb-0"
            aria-current={step.state === STEP_STATE.CURRENT ? 'step' : undefined}
          >
            {/* Connector line */}
            {!isLast && (
              <span
                className={`absolute left-4 top-9 bottom-0 w-0.5 md:left-1/2 md:top-4 md:bottom-auto md:w-full md:h-0.5 ${connectorClasses}`}
                aria-hidden="true"
              />
            )}

            <span
              className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${circleClasses}`}
            >
              <StepIcon step={step} index={index} />
            </span>

            <div className="min-w-0 md:px-2">
              <p
                className={`text-sm font-bold ${
                  step.state === STEP_STATE.UPCOMING ? 'text-slate-400' : 'text-slate-800'
                }`}
              >
                {copy.title}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{copy.desc}</p>
              <p
                className={`text-xs mt-1 font-medium ${
                  step.state === STEP_STATE.CURRENT ? 'text-brand-600' : 'text-slate-400'
                }`}
              >
                {step.time
                  ? formatDateTime(step.time)
                  : step.state === STEP_STATE.CURRENT
                  ? T.inProgress
                  : step.state === STEP_STATE.UPCOMING
                  ? T.waiting
                  : ''}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
};

const TIMELINE_ACTIVITY_CONFIG = {
  pending: {
    label: 'Booking Created',
    badge: 'bg-amber-50 text-amber-700 ring-amber-200 border-amber-200',
    iconBg: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: Clock,
  },
  approved: {
    label: 'Owner Approved',
    badge: 'bg-sky-50 text-sky-700 ring-sky-200 border-sky-200',
    iconBg: 'bg-sky-100 text-sky-700 border-sky-200',
    icon: CheckCircle2,
  },
  active: {
    label: 'Active (Handover Complete)',
    badge: 'bg-brand-50 text-brand-800 ring-brand-300 border-brand-200',
    iconBg: 'bg-brand-100 text-brand-700 border-brand-200',
    icon: CheckCircle2,
  },
  extension_requested: {
    label: 'Extension Requested',
    badge: 'bg-purple-50 text-purple-700 ring-purple-200 border-purple-200',
    iconBg: 'bg-purple-100 text-purple-700 border-purple-200',
    icon: CalendarPlus,
  },
  extension_approved: {
    label: 'Extension Approved',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200 border-emerald-200',
    iconBg: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
  },
  extension_rejected: {
    label: 'Extension Declined',
    badge: 'bg-rose-50 text-rose-700 ring-rose-200 border-rose-200',
    iconBg: 'bg-rose-100 text-rose-700 border-rose-200',
    icon: XCircle,
  },
  completed: {
    label: 'Completed & Returned',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200 border-emerald-200',
    iconBg: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: BadgeCheck,
  },
  cancelled: {
    label: 'Booking Cancelled',
    badge: 'bg-slate-100 text-slate-700 ring-slate-200 border-slate-200',
    iconBg: 'bg-slate-100 text-slate-600 border-slate-200',
    icon: XCircle,
  },
  rejected: {
    label: 'Booking Rejected',
    badge: 'bg-red-50 text-red-700 ring-red-200 border-red-200',
    iconBg: 'bg-red-100 text-red-700 border-red-200',
    icon: Ban,
  },
};

const DEFAULT_ACTIVITY_CONFIG = {
  label: 'Status Updated',
  badge: 'bg-slate-100 text-slate-700 ring-slate-200 border-slate-200',
  iconBg: 'bg-slate-100 text-slate-600 border-slate-200',
  icon: HelpCircle,
};

/**
 * Localize timeline entry notes into clear, user-friendly English
 */
const localizeTimelineNote = (note) => {
  if (!note || typeof note !== 'string') return '';
  const trimmed = note.trim();

  if (trimmed === 'Đã tạo yêu cầu thuê' || trimmed.toLowerCase() === 'booking created') {
    return 'Rental booking request submitted by renter';
  }
  if (trimmed.includes('lúc nhận bàn giao (beforeRental)') || trimmed.includes('beforeRental')) {
    const match = trimmed.match(/\d+/);
    const count = match ? match[0] : '';
    return count
      ? `Uploaded ${count} pre-handover device inspection photos (beforeRental)`
      : 'Uploaded pre-handover device inspection photos (beforeRental)';
  }
  if (trimmed.includes('lúc trả máy (afterRental)') || trimmed.includes('afterRental')) {
    const match = trimmed.match(/\d+/);
    const count = match ? match[0] : '';
    return count
      ? `Uploaded ${count} return device inspection photos (afterRental)`
      : 'Uploaded return device inspection photos (afterRental)';
  }
  if (trimmed.startsWith('Yêu cầu gia hạn thêm')) {
    return trimmed
      .replace('Yêu cầu gia hạn thêm', 'Extension requested for +')
      .replace(/ngày/g, 'days')
      .replace('(đến', '(until')
      .replace('phụ phí:', 'additional fee:')
      .replace('Ghi chú:', 'Note:')
      .replace('đ', 'VND');
  }
  if (trimmed.startsWith('Chủ máy đã chấp thuận gia hạn thuê thêm')) {
    return trimmed
      .replace('Chủ máy đã chấp thuận gia hạn thuê thêm', 'Owner approved rental extension for +')
      .replace(/ngày/g, 'days')
      .replace('(hạn mới:', '(new return date:');
  }
  if (trimmed.startsWith('Chủ máy đã từ chối yêu cầu gia hạn thuê')) {
    return trimmed.replace('Chủ máy đã từ chối yêu cầu gia hạn thuê', 'Owner declined rental extension request');
  }
  if (trimmed.startsWith('Hủy bởi người thuê')) {
    return trimmed.replace('Hủy bởi người thuê', 'Cancelled by renter');
  }
  if (trimmed.includes('Hoàn tất bàn giao thiết bị')) {
    return 'Device handover completed and rental activated';
  }
  if (trimmed.includes('Hoàn tất đơn thuê')) {
    return 'Rental completed and deposit refunded to renter';
  }

  return trimmed;
};

/**
 * Chronological activity log of every timeline entry recorded on the booking.
 * Redesigned with vertical connecting rail, English status badge pills,
 * English date/time formatting, and cleanly localized notes.
 */
export const OrderActivityHistory = ({ timeline }) => {
  const entries = useMemo(
    () => [...(Array.isArray(timeline) ? timeline : [])]
      .sort((a, b) => new Date(getEntryTime(b)) - new Date(getEntryTime(a))),
    [timeline]
  );

  if (entries.length === 0) {
    return <p className="text-sm text-slate-500">{T.historyEmpty}</p>;
  }

  return (
    <ul className="relative flex flex-col pl-2 pt-1" aria-label="Activity History Timeline">
      {entries.map((entry, index) => {
        const cfg = TIMELINE_ACTIVITY_CONFIG[entry.status] || DEFAULT_ACTIVITY_CONFIG;
        const Icon = cfg.icon;
        const isLast = index === entries.length - 1;
        const note = localizeTimelineNote(entry.note);
        const time = getEntryTime(entry);

        return (
          <li
            key={entry._id || `${entry.status}-${index}`}
            className="relative pl-8 pb-5 last:pb-1"
          >
            {/* Vertical connector line */}
            {!isLast && (
              <span
                className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-slate-200"
                aria-hidden="true"
              />
            )}

            {/* Circular rail icon badge */}
            <span
              className={`absolute left-0 top-0.5 w-6 h-6 rounded-full flex items-center justify-center border shadow-xs z-10 ${cfg.iconBg}`}
              aria-hidden="true"
            >
              <Icon className="w-3.5 h-3.5" />
            </span>

            {/* Content area */}
            <div className="flex flex-col gap-1.5 min-w-0">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border shadow-xs ${cfg.badge}`}
                >
                  <Icon className="w-3 h-3" aria-hidden="true" />
                  <span>{cfg.label}</span>
                </span>
                <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" aria-hidden="true" />
                  <span>{formatDateTime(time)}</span>
                </span>
              </div>

              {note && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
                  <p className="break-words leading-relaxed">{note}</p>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default OrderTimelineStepper;
