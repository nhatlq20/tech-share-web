import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Lock,
  RotateCcw,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { STRINGS } from '../../constants/strings.js';
import { MAGIC_NUMBERS } from '../../constants/config.js';
import './WebDatePicker.css';

/**
 * Helper to format date to 'YYYY-MM-DD'
 */
const formatDateKey = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Format date to display string DD/MM/YYYY
 */
const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

/**
 * WebDatePicker - Interactive Date Range Picker for TechShare
 * Automatically grays out and locks dates already booked or blocked by the owner.
 */
export const WebDatePicker = ({
  startDate,
  endDate,
  onChange,
  disabledDates = [],
  bookedRanges = [],
  isLoading = false,
}) => {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const [currentMonthDate, setCurrentMonthDate] = useState(() => {
    const init = startDate ? new Date(startDate) : new Date();
    return new Date(init.getFullYear(), init.getMonth(), 1);
  });

  const [hoverDate, setHoverDate] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Convert disabled dates array into a fast-lookup Set
  const disabledDatesSet = useMemo(() => {
    return new Set(disabledDates.map((d) => formatDateKey(d)));
  }, [disabledDates]);

  const startKey = startDate ? formatDateKey(startDate) : '';
  const endKey = endDate ? formatDateKey(endDate) : '';

  // Calculate days in the current month view
  const { daysInMonth, startWeekdayOffset, monthTitle } = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const daysCount = new Date(year, month + 1, 0).getDate();
    
    // In Vietnam, week starts on Monday (T2).
    // getDay() returns 0 for Sunday, 1 for Monday...
    let firstDayIndex = new Date(year, month, 1).getDay();
    // Shift: Monday(1)->0, Tuesday(2)->1 ... Sunday(0)->6
    const offset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const title = currentMonthDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    return {
      daysInMonth: daysCount,
      startWeekdayOffset: offset,
      monthTitle: title,
    };
  }, [currentMonthDate]);

  // Navigate to previous month
  const handlePrevMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  // Navigate to next month
  const handleNextMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  /**
   * Check if a specific dateKey is blocked or in the past
   */
  const isDateDisabled = (dateKey) => {
    if (!dateKey) return true;
    const [y, m, d] = dateKey.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setHours(0, 0, 0, 0);

    if (dateObj < today) {
      return true; // Past date
    }
    return disabledDatesSet.has(dateKey);
  };

  /**
   * Check if the range between start and candidate date contains any disabled date
   */
  const rangeHasBlockedDates = (fromKey, toKey) => {
    if (!fromKey || !toKey) return false;
    let [y1, m1, d1] = fromKey.split('-').map(Number);
    let [y2, m2, d2] = toKey.split('-').map(Number);

    const fromDate = new Date(y1, m1 - 1, d1);
    const toDate = new Date(y2, m2 - 1, d2);

    const start = fromDate <= toDate ? fromDate : toDate;
    const end = fromDate <= toDate ? toDate : fromDate;

    const cur = new Date(start);
    while (cur <= end) {
      const key = formatDateKey(cur);
      if (disabledDatesSet.has(key)) {
        return true;
      }
      cur.setDate(cur.getDate() + 1);
    }
    return false;
  };

  /**
   * Handle user clicking a date cell
   */
  const handleDateClick = (dateKey) => {
    setErrorMessage(null);

    if (isDateDisabled(dateKey)) {
      setErrorMessage(STRINGS.booking.datePicker.conflictAlert);
      return;
    }

    // Case 1: No start date or both already selected -> set start date
    if (!startKey || (startKey && endKey)) {
      onChange({
        startDate: dateKey,
        endDate: null,
        totalDays: MAGIC_NUMBERS.BOOKING.MIN_RENTAL_DAYS,
      });
      return;
    }

    // Case 2: Start date selected, selecting end date
    if (startKey && !endKey) {
      // If clicked date is before start date, treat clicked date as new start date
      if (dateKey < startKey) {
        onChange({
          startDate: dateKey,
          endDate: null,
          totalDays: MAGIC_NUMBERS.BOOKING.MIN_RENTAL_DAYS,
        });
        return;
      }

      // Check if range encompasses any locked date
      if (rangeHasBlockedDates(startKey, dateKey)) {
        setErrorMessage(STRINGS.booking.datePicker.conflictAlert);
        return;
      }

      // Valid range! Calculate days
      const [y1, m1, d1] = startKey.split('-').map(Number);
      const [y2, m2, d2] = dateKey.split('-').map(Number);
      const diffDays = Math.max(
        1,
        Math.round((new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1)) / (1000 * 60 * 60 * 24))
      );

      onChange({
        startDate: startKey,
        endDate: dateKey,
        totalDays: diffDays,
      });
    }
  };

  /**
   * Reset selected dates
   */
  const handleClear = () => {
    setErrorMessage(null);
    onChange({
      startDate: null,
      endDate: null,
      totalDays: 0,
    });
  };

  /**
   * Quick select helper
   */
  const handleQuickSelect = (daysCount) => {
    setErrorMessage(null);
    // Find next available date starting from today
    let foundStartKey = null;
    let foundEndKey = null;

    for (let offset = 0; offset < 30; offset++) {
      const testStart = new Date(today);
      testStart.setDate(testStart.getDate() + offset);
      const testStartKey = formatDateKey(testStart);

      if (!isDateDisabled(testStartKey)) {
        const testEnd = new Date(testStart);
        testEnd.setDate(testEnd.getDate() + (daysCount - 1));
        const testEndKey = formatDateKey(testEnd);

        if (!rangeHasBlockedDates(testStartKey, testEndKey)) {
          foundStartKey = testStartKey;
          foundEndKey = testEndKey;
          break;
        }
      }
    }

    if (foundStartKey && foundEndKey) {
      setCurrentMonthDate(new Date(foundStartKey));
      onChange({
        startDate: foundStartKey,
        endDate: foundEndKey,
        totalDays: daysCount,
      });
    } else {
      setErrorMessage(STRINGS.booking.datePicker.conflictAlert);
    }
  };

  // Compute cell classes for rendering
  const getCellClasses = (dateKey) => {
    const isBlocked = isDateDisabled(dateKey);
    if (isBlocked) {
      return 'ts-calendar-cell ts-calendar-cell-blocked';
    }

    const isStart = dateKey === startKey;
    const isEnd = dateKey === endKey;
    const isSingle = isStart && isEnd;

    if (isSingle) {
      return 'ts-calendar-cell ts-calendar-cell-single font-semibold shadow-sm';
    }

    if (isStart) {
      return 'ts-calendar-cell ts-calendar-cell-range-start font-semibold shadow-sm';
    }

    if (isEnd) {
      return 'ts-calendar-cell ts-calendar-cell-range-end font-semibold shadow-sm';
    }

    // Range between check
    const effectiveEnd = endKey || hoverDate;
    if (startKey && effectiveEnd && dateKey > startKey && dateKey < effectiveEnd) {
      if (!rangeHasBlockedDates(startKey, effectiveEnd)) {
        return 'ts-calendar-cell ts-calendar-cell-range-between font-medium';
      }
    }

    // Normal available date
    return 'ts-calendar-cell hover:bg-brand-50 hover:text-brand-600 rounded-lg text-slate-700 cursor-pointer';
  };

  const totalSelectedDays = useMemo(() => {
    if (!startKey) return 0;
    if (!endKey) return 1;
    const [y1, m1, d1] = startKey.split('-').map(Number);
    const [y2, m2, d2] = endKey.split('-').map(Number);
    return Math.max(
      1,
      Math.round((new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1)) / (1000 * 60 * 60 * 24))
    );
  }, [startKey, endKey]);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-brand-500" />
            {STRINGS.booking.datePicker.title}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {STRINGS.booking.datePicker.subtitle}
          </p>
        </div>

        {/* Quick Clear */}
        {startKey && (
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-slate-500 hover:text-red-500 hover:bg-red-50 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {STRINGS.booking.datePicker.clearDates}
          </button>
        )}
      </div>

      {/* Quick Select Buttons */}
      <div className="flex items-center flex-wrap gap-2 pt-4 pb-2">
        <span className="text-xs text-slate-400 font-medium mr-1 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-brand-500" />
          {STRINGS.booking.datePicker.quickSelectLabel}
        </span>
        <button
          type="button"
          onClick={() => handleQuickSelect(1)}
          className="px-3 py-1 text-xs rounded-full bg-slate-100 text-slate-600 hover:bg-brand-100 hover:text-brand-600 font-medium transition"
        >
          {STRINGS.booking.datePicker.quick1Day}
        </button>
        <button
          type="button"
          onClick={() => handleQuickSelect(3)}
          className="px-3 py-1 text-xs rounded-full bg-slate-100 text-slate-600 hover:bg-brand-100 hover:text-brand-600 font-medium transition"
        >
          {STRINGS.booking.datePicker.quickWeekend}
        </button>
        <button
          type="button"
          onClick={() => handleQuickSelect(7)}
          className="px-3 py-1 text-xs rounded-full bg-slate-100 text-slate-600 hover:bg-brand-100 hover:text-brand-600 font-medium transition"
        >
          {STRINGS.booking.datePicker.quick1Week}
        </button>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between py-3">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition"
          aria-label={STRINGS.booking.datePicker.monthPrev}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <span className="text-base font-bold text-slate-800">
          {monthTitle}
        </span>

        <button
          type="button"
          onClick={handleNextMonth}
          className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition"
          aria-label={STRINGS.booking.datePicker.monthNext}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Day of week headers */}
      <div className="ts-calendar-grid mb-2">
        {STRINGS.booking.datePicker.daysOfWeek.map((dayName, idx) => (
          <div
            key={idx}
            className="text-center text-xs font-semibold text-slate-400 py-1"
          >
            {dayName}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="ts-calendar-grid">
        {/* Leading blanks for start day offset */}
        {Array.from({ length: startWeekdayOffset }).map((_, i) => (
          <div key={`empty-${i}`} className="ts-calendar-cell opacity-0 pointer-events-none" />
        ))}

        {/* Days of current month */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNumber = i + 1;
          const year = currentMonthDate.getFullYear();
          const month = currentMonthDate.getMonth();
          const dateObj = new Date(year, month, dayNumber);
          const dateKey = formatDateKey(dateObj);
          const isBlocked = isDateDisabled(dateKey);
          const isToday = formatDateKey(today) === dateKey;

          return (
            <button
              key={dateKey}
              type="button"
              disabled={isBlocked}
              onClick={() => handleDateClick(dateKey)}
              onMouseEnter={() => {
                if (startKey && !endKey && !isBlocked) {
                  setHoverDate(dateKey);
                }
              }}
              onMouseLeave={() => setHoverDate(null)}
              className={getCellClasses(dateKey)}
              title={isBlocked ? STRINGS.booking.datePicker.legendBlocked : dateKey}
            >
              <span>{dayNumber}</span>
              {isBlocked && (
                <Lock className="w-2.5 h-2.5 text-slate-400 absolute top-1 right-1" />
              )}
              {isToday && !isBlocked && (
                <span className="w-1.5 h-1.5 bg-brand-500 rounded-full absolute bottom-1" />
              )}
            </button>
          );
        })}
      </div>

      {/* Conflict Error Message */}
      {errorMessage && (
        <div className="mt-4 p-3 rounded-xl bg-red-50 text-red-600 text-xs flex items-center gap-2 border border-red-100">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Legend & Selected Duration Summary Bar */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Legend */}
        <div className="flex items-center flex-wrap gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-white border border-slate-200" />
            <span>{STRINGS.booking.datePicker.legendAvailable}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-brand-500" />
            <span>{STRINGS.booking.datePicker.legendSelected}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-slate-100 border border-slate-200 line-through text-slate-400" />
            <span>{STRINGS.booking.datePicker.legendBlocked}</span>
          </div>
        </div>

        {/* Selected Date Summary Pill */}
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 text-xs text-slate-700">
          <Clock className="w-4 h-4 text-brand-500 flex-shrink-0" />
          {startKey ? (
            <span>
              {STRINGS.booking.datePicker.startDateLabel}:{' '}
              <strong>{formatDisplayDate(startKey)}</strong>
              {endKey ? (
                <>
                  {' '}➔ {STRINGS.booking.datePicker.endDateLabel}:{' '}
                  <strong>{formatDisplayDate(endKey)}</strong> (
                  <strong className="text-brand-600">
                    {totalSelectedDays} {STRINGS.booking.datePicker.totalDaysSuffix}
                  </strong>
                  )
                </>
              ) : (
                <span className="text-slate-400 italic">
                  {' '}({STRINGS.booking.datePicker.selectEndDate})
                </span>
              )}
            </span>
          ) : (
            <span className="text-slate-400 italic">
              {STRINGS.booking.datePicker.notSelected}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebDatePicker;
