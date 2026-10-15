import React, { useMemo } from 'react';
import { Check, X, Ban, Loader2 } from 'lucide-react';
import { STRINGS } from '../../constants/strings.ts';
import {
  BOOKING_STATUS,
  BOOKING_TIMELINE_STEPS,
  BOOKING_TERMINAL_STATUSES,
} from '../../constants/config.ts';
import { formatDateTime } from '../../utils/formatters.js';
import { getBookingStatusStyle } from './BookingStatusBadge.jsx';

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

/**
 * Chronological activity log of every timeline entry recorded on the booking.
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
    <ul className="flex flex-col gap-4">
      {entries.map((entry, index) => {
        const style = getBookingStatusStyle(entry.status);
        return (
          <li key={entry._id || `${entry.status}-${index}`} className="flex gap-3">
            <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">
                {STRINGS.booking.status[entry.status] || entry.status}
              </p>
              {entry.note && <p className="text-xs text-slate-500 mt-0.5 break-words">{entry.note}</p>}
              <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(getEntryTime(entry))}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default OrderTimelineStepper;
