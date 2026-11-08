import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Flame, AlertCircle, AlertTriangle } from 'lucide-react';
import { STRINGS } from '../../constants/strings.js';

const pad2 = (n) => String(Math.max(0, n)).padStart(2, '0');

const computeDiffParts = (diffMs) => {
  const absSeconds = Math.floor(Math.abs(diffMs) / 1000);
  return {
    isOverdue: diffMs < 0,
    days: Math.floor(absSeconds / 86400),
    hours: Math.floor((absSeconds % 86400) / 3600),
    minutes: Math.floor((absSeconds % 3600) / 60),
    seconds: absSeconds % 60,
  };
};

/**
 * RentalCountdownTimer – Synchronized with App's RentalCountdownTimer.tsx
 * Displays the 4-box countdown card (Days : Hours : Mins : Secs) for active bookings.
 */
export const RentalCountdownTimer = ({ startDate, endDate, status }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isOverdue: false,
    isWarning6h: false,
    isUrgent2h: false,
    isNotStartedYet: false,
  });

  useEffect(() => {
    if (status !== 'active') return undefined;

    const calculateTime = () => {
      const now = new Date().getTime();
      const start = startDate ? new Date(startDate).getTime() : now;
      const end = new Date(endDate).getTime();

      const isNotStartedYet = now < start;
      const diff = isNotStartedYet ? end - start : end - now;

      if (diff <= 0) {
        const overdueDiff = Math.abs(diff);
        setTimeLeft({
          days: Math.floor(overdueDiff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((overdueDiff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((overdueDiff / 1000 / 60) % 60),
          seconds: Math.floor((overdueDiff / 1000) % 60),
          isOverdue: true,
          isWarning6h: false,
          isUrgent2h: false,
          isNotStartedYet: false,
        });
        return;
      }

      const hoursTotal = diff / (1000 * 60 * 60);
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / 1000 / 60) % 60),
        seconds: Math.floor((diff / 1000) % 60),
        isOverdue: false,
        isWarning6h: !isNotStartedYet && hoursTotal <= 6 && hoursTotal > 2,
        isUrgent2h: !isNotStartedYet && hoursTotal <= 2,
        isNotStartedYet,
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [startDate, endDate, status]);

  if (status !== 'active') return null;

  const getThemeClasses = () => {
    if (timeLeft.isOverdue) {
      return {
        container: 'bg-red-50 border-red-200',
        text: 'text-red-500',
        badge: 'bg-red-500 text-white',
        Icon: AlertCircle,
      };
    }
    if (timeLeft.isNotStartedYet) {
      return {
        container: 'bg-brand-50 border-brand-200',
        text: 'text-brand-600',
        badge: 'bg-brand-500 text-white',
        Icon: Calendar,
      };
    }
    if (timeLeft.isUrgent2h) {
      return {
        container: 'bg-amber-50 border-amber-200',
        text: 'text-amber-600',
        badge: 'bg-amber-500 text-white',
        Icon: Flame,
      };
    }
    if (timeLeft.isWarning6h) {
      return {
        container: 'bg-amber-50/70 border-amber-200',
        text: 'text-amber-600',
        badge: 'bg-amber-500 text-white',
        Icon: Clock,
      };
    }
    return {
      container: 'bg-emerald-50 border-emerald-200',
      text: 'text-emerald-600',
      badge: 'bg-emerald-500 text-white',
      Icon: Clock,
    };
  };

  const theme = getThemeClasses();
  const ThemeIcon = theme.Icon;

  const headerTitle = timeLeft.isOverdue
    ? STRINGS.RENTAL_COUNTDOWN.OVERDUE_HEADER
    : timeLeft.isNotStartedYet
    ? STRINGS.RENTAL_COUNTDOWN.NOT_STARTED_HEADER
    : timeLeft.isUrgent2h
    ? STRINGS.RENTAL_COUNTDOWN.URGENT_2H_HEADER
    : timeLeft.isWarning6h
    ? STRINGS.RENTAL_COUNTDOWN.WARNING_6H_HEADER
    : STRINGS.RENTAL_COUNTDOWN.NORMAL_HEADER;

  return (
    <div className={`rounded-xl p-3 my-2.5 border ${theme.container}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <ThemeIcon className={`w-4 h-4 ${theme.text}`} />
          <span className={`text-[11px] font-extrabold tracking-wide ${theme.text}`}>
            {headerTitle}
          </span>
        </div>

        {timeLeft.isOverdue && (
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${theme.badge}`}>
            {STRINGS.RENTAL_COUNTDOWN.OVERDUE_BADGE}
          </span>
        )}
        {timeLeft.isNotStartedYet && (
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${theme.badge}`}>
            {STRINGS.RENTAL_COUNTDOWN.NOT_STARTED_BADGE}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex-1 bg-white rounded-lg py-1.5 flex flex-col items-center shadow-2xs">
          <span className={`text-lg font-extrabold leading-6 ${theme.text}`}>
            {pad2(timeLeft.days)}
          </span>
          <span className="text-[10px] font-semibold text-slate-500 mt-0.5">
            {STRINGS.RENTAL_COUNTDOWN.DAYS}
          </span>
        </div>

        <span className={`text-base font-extrabold mx-1.5 ${theme.text}`}>:</span>

        <div className="flex-1 bg-white rounded-lg py-1.5 flex flex-col items-center shadow-2xs">
          <span className={`text-lg font-extrabold leading-6 ${theme.text}`}>
            {pad2(timeLeft.hours)}
          </span>
          <span className="text-[10px] font-semibold text-slate-500 mt-0.5">
            {STRINGS.RENTAL_COUNTDOWN.HOURS}
          </span>
        </div>

        <span className={`text-base font-extrabold mx-1.5 ${theme.text}`}>:</span>

        <div className="flex-1 bg-white rounded-lg py-1.5 flex flex-col items-center shadow-2xs">
          <span className={`text-lg font-extrabold leading-6 ${theme.text}`}>
            {pad2(timeLeft.minutes)}
          </span>
          <span className="text-[10px] font-semibold text-slate-500 mt-0.5">
            {STRINGS.RENTAL_COUNTDOWN.MINS}
          </span>
        </div>

        <span className={`text-base font-extrabold mx-1.5 ${theme.text}`}>:</span>

        <div className="flex-1 bg-white rounded-lg py-1.5 flex flex-col items-center shadow-2xs">
          <span className={`text-lg font-extrabold leading-6 ${theme.text}`}>
            {pad2(timeLeft.seconds)}
          </span>
          <span className="text-[10px] font-semibold text-slate-500 mt-0.5">
            {STRINGS.RENTAL_COUNTDOWN.SECS}
          </span>
        </div>
      </div>

      {timeLeft.isNotStartedYet && (
        <p className="text-[11px] text-slate-500 text-center italic mt-2">
          {STRINGS.RENTAL_COUNTDOWN.NOT_STARTED_HELPER}
        </p>
      )}
    </div>
  );
};

/**
 * CountdownBadge – Compact badge used on BookingDetailPage
 */
export const CountdownBadge = ({ endDate, targetDate, compact = false }) => {
  const cStrings = STRINGS.booking.countdown;
  const effectiveEnd = endDate || targetDate;
  const targetMs = effectiveEnd ? new Date(effectiveEnd).getTime() : NaN;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (Number.isNaN(targetMs)) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [targetMs]);

  if (Number.isNaN(targetMs)) return null;

  const diffMs = targetMs - now;
  const { isOverdue, days, hours, minutes, seconds } = computeDiffParts(diffMs);
  const hoursRemaining = diffMs / 3600000;

  let toneClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  let IconComponent = Clock;
  let prefix = '';

  if (isOverdue) {
    toneClasses = 'bg-red-50 text-red-700 border-red-200 animate-pulse';
    IconComponent = AlertTriangle;
    prefix = `${cStrings.overdue} `;
  } else if (hoursRemaining <= 2) {
    toneClasses = 'bg-red-50 text-red-700 border-red-200';
    IconComponent = Flame;
    prefix = compact ? '' : `${cStrings.urgent} `;
  } else if (hoursRemaining <= 6) {
    toneClasses = 'bg-amber-50 text-amber-700 border-amber-200';
    IconComponent = Clock;
    prefix = compact ? '' : `${cStrings.dueSoon} `;
  }

  const timeString =
    days > 0
      ? `${days}${cStrings.daysLabel} ${pad2(hours)}${cStrings.hoursLabel} ${pad2(minutes)}${cStrings.minutesLabel}`
      : `${pad2(hours)}${cStrings.hoursLabel} ${pad2(minutes)}${cStrings.minutesLabel} ${pad2(seconds)}${cStrings.secondsLabel}`;

  const suffix = !isOverdue && compact ? ` ${cStrings.remaining}` : '';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold tabular-nums ${
        compact ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-xs'
      } ${toneClasses}`}
    >
      <IconComponent className="w-3.5 h-3.5 shrink-0" />
      <span>
        {prefix}
        {timeString}
        {suffix}
      </span>
    </span>
  );
};

export default CountdownBadge;
