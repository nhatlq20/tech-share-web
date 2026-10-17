import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, Flame } from 'lucide-react';
import { STRINGS } from '../../constants/strings.js';

const T = STRINGS.booking.countdown || {
  daysLabel: 'd',
  hoursLabel: 'h',
  minutesLabel: 'm',
  secondsLabel: 's',
  remaining: 'left',
  overdue: 'Overdue by',
  dueSoon: 'Due soon:',
  urgent: 'Expires in:',
  completed: 'Completed',
};

/**
 * Real-time Countdown & Rental Duration Badge for Active Bookings
 * 
 * LOGIC:
 * 1. Nếu chưa đến thời điểm bắt đầu (now < startDate):
 *    Hiển thị đúng thời gian thuê giữa startDate và endDate (VD: "2 days"),
 *    tuyệt đối KHÔNG lấy endDate trừ cho thời gian hiện tại!
 * 2. Khi đang trong thời gian thuê (now >= startDate && now <= endDate):
 *    Đếm ngược thời gian còn lại đến endDate (đảm bảo <= tổng thời gian thuê).
 * 3. Khi quá thời gian endDate:
 *    Hiển thị cảnh báo quá hạn Overdue.
 */
export const CountdownBadge = ({
  startDate,
  targetDate,
  status = 'active',
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(targetDate, startDate));

  useEffect(() => {
    if (!targetDate) return;

    // Immediately calculate
    setTimeLeft(calculateTimeLeft(targetDate, startDate));

    // Tick every 1 second
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate, startDate));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate, startDate]);

  if (!targetDate) return null;

  // Sizing styles
  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-3 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-4 py-1.5 gap-2 font-bold',
  }[size] || 'text-xs px-3 py-1 gap-1.5';

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }[size] || 'w-3.5 h-3.5';

  const { isUpcoming, isOverdue, isUrgent, isWarning, days, hours, minutes, seconds, totalDurationLabel } = timeLeft;

  // 0. Upcoming State (now < startDate): Chưa đến giờ thuê
  // Hiển thị chính xác thời gian thuê giữa startDate và endDate, không lấy endDate - hiện tại!
  if (isUpcoming) {
    return (
      <span
        className={`inline-flex items-center rounded-full font-semibold bg-sky-50 text-sky-700 border border-sky-200/90 shadow-xs ${sizeClasses} ${className}`}
        title={startDate ? `Rental starts on ${new Date(startDate).toLocaleString()}` : 'Upcoming rental'}
      >
        {showIcon && <Clock className={`${iconSizes} text-sky-500 flex-shrink-0`} />}
        <span>{totalDurationLabel}</span>
      </span>
    );
  }

  // 1. Overdue State
  if (isOverdue) {
    return (
      <span
        className={`inline-flex items-center rounded-full font-bold bg-red-100 text-red-700 border border-red-300 shadow-sm animate-pulse ${sizeClasses} ${className}`}
        title={`Rental expired at ${new Date(targetDate).toLocaleString()}`}
      >
        {showIcon && <AlertTriangle className={`${iconSizes} text-red-600 flex-shrink-0`} />}
        <span>
          {T.overdue} {days > 0 ? `${days}${T.daysLabel} ` : ''}
          {hours}{T.hoursLabel} {minutes}{T.minutesLabel}
        </span>
      </span>
    );
  }

  // 2. Urgent State (< 2 hours)
  if (isUrgent) {
    return (
      <span
        className={`inline-flex items-center rounded-full font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-sm animate-pulse ${sizeClasses} ${className}`}
        title={`Rental expires at ${new Date(targetDate).toLocaleString()}`}
      >
        {showIcon && <Flame className={`${iconSizes} text-rose-600 flex-shrink-0`} />}
        <span>
          {T.urgent} {hours > 0 ? `${hours}${T.hoursLabel} ` : ''}
          {String(minutes).padStart(2, '0')}{T.minutesLabel} {String(seconds).padStart(2, '0')}{T.secondsLabel}
        </span>
      </span>
    );
  }

  // 3. Warning State (< 24 hours)
  if (isWarning) {
    return (
      <span
        className={`inline-flex items-center rounded-full font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm ${sizeClasses} ${className}`}
        title={`Rental expires at ${new Date(targetDate).toLocaleString()}`}
      >
        {showIcon && <Clock className={`${iconSizes} text-amber-500 flex-shrink-0`} />}
        <span>
          {T.dueSoon} {hours}{T.hoursLabel} {String(minutes).padStart(2, '0')}{T.minutesLabel} {String(seconds).padStart(2, '0')}{T.secondsLabel}
        </span>
      </span>
    );
  }

  // 4. Safe State (>= 24 hours left)
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm ${sizeClasses} ${className}`}
      title={`Rental expires at ${new Date(targetDate).toLocaleString()}`}
    >
      {showIcon && <Clock className={`${iconSizes} text-emerald-600 flex-shrink-0`} />}
      <span>
        {days > 0 ? `${days}d ` : ''}
        {hours > 0 ? `${hours}h ` : (days > 0 ? '0h ' : '')}
        {minutes}m {T.remaining}
      </span>
    </span>
  );
};

/**
 * Pure calculation helper taking both targetDate (endDate) and startDate into account
 */
function calculateTimeLeft(target, startDate) {
  if (!target) {
    return {
      isUpcoming: false,
      isOverdue: false,
      isUrgent: false,
      isWarning: false,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalDurationLabel: '1 day',
    };
  }

  const endMs = new Date(target).getTime();
  const nowMs = Date.now();
  const startMs = startDate ? new Date(startDate).getTime() : null;

  // Tính tổng thời lượng thuê thực tế giữa startDate và endDate
  let totalDurationLabel = '1 day';
  if (startMs && endMs > startMs) {
    const totalDiffMs = endMs - startMs;
    const totalDays = Math.round(totalDiffMs / (1000 * 60 * 60 * 24));
    if (totalDays >= 1) {
      totalDurationLabel = `${totalDays} ${totalDays === 1 ? 'day' : 'days'}`;
    } else {
      const totalHours = Math.max(1, Math.round(totalDiffMs / (1000 * 60 * 60)));
      totalDurationLabel = `${totalHours}h`;
    }
  }

  // 1. Chưa đến ngày bắt đầu thuê (nowMs < startMs)
  // Không lấy endDate trừ hiện tại! Hiển thị đúng thời gian thuê giữa startDate và endDate.
  if (startMs && nowMs < startMs) {
    return {
      isUpcoming: true,
      isOverdue: false,
      isUrgent: false,
      isWarning: false,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalDurationLabel,
    };
  }

  // 2. Đã quá hạn trả máy
  const diffMs = endMs - nowMs;
  if (diffMs <= 0) {
    const absDiff = Math.abs(diffMs);
    const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((absDiff % (1000 * 60)) / 1000);
    return {
      isUpcoming: false,
      isOverdue: true,
      isUrgent: false,
      isWarning: false,
      days,
      hours,
      minutes,
      seconds,
      totalDurationLabel,
    };
  }

  // 3. Đang trong thời gian thuê (nowMs >= startMs và nowMs <= endMs)
  // Đếm ngược thời gian còn lại
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  const isUrgent = diffMs < 2 * 60 * 60 * 1000; // < 2 hours
  const isWarning = diffMs < 24 * 60 * 60 * 1000; // < 24 hours

  return {
    isUpcoming: false,
    isOverdue: false,
    isUrgent,
    isWarning,
    days,
    hours,
    minutes,
    seconds,
    totalDurationLabel,
  };
}

export default CountdownBadge;
