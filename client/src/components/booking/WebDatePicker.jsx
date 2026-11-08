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
 * WebDatePicker - Compact Interactive Date & Time Range Picker for TechShare
 * Side-by-side Calendar + Time Selector layout to maximize information density.
 */
export const WebDatePicker = ({
  startDate,
  endDate,
  pickupTime = '09:00',
  returnTime = '18:00',
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

  const disabledDatesSet = useMemo(() => {
    return new Set(disabledDates.map((d) => formatDateKey(d)));
  }, [disabledDates]);

  const startKey = startDate ? formatDateKey(startDate) : '';
  const endKey = endDate ? formatDateKey(endDate) : '';

  const { daysInMonth, startWeekdayOffset, monthTitle } = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const daysCount = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const offset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    const title = currentMonthDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });

    return {
      daysInMonth: daysCount,
      startWeekdayOffset: offset,
      monthTitle: title,
    };
  }, [currentMonthDate]);

  const handlePrevMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const isDateDisabled = (dateKey) => {
    if (!dateKey) return true;
    const [y, m, d] = dateKey.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setHours(0, 0, 0, 0);

    if (dateObj < today) {
      return true;
    }
    return disabledDatesSet.has(dateKey);
  };

  const rangeHasBlockedDates = (fromKey, toKey) => {
    if (!fromKey || !toKey) return false;
    const [y1, m1, d1] = fromKey.split('-').map(Number);
    const [y2, m2, d2] = toKey.split('-').map(Number);

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

  const handleDateClick = (dateKey) => {
    setErrorMessage(null);

    if (isDateDisabled(dateKey)) {
      setErrorMessage(STRINGS.booking.datePicker.conflictAlert);
      return;
    }

    if (!startKey || (startKey && endKey)) {
      onChange({
        startDate: dateKey,
        endDate: null,
        pickupTime,
        returnTime,
        totalDays: MAGIC_NUMBERS.BOOKING.MIN_RENTAL_DAYS,
      });
      return;
    }

    if (startKey && !endKey) {
      if (dateKey < startKey) {
        onChange({
          startDate: dateKey,
          endDate: null,
          pickupTime,
          returnTime,
          totalDays: MAGIC_NUMBERS.BOOKING.MIN_RENTAL_DAYS,
        });
        return;
      }

      if (rangeHasBlockedDates(startKey, dateKey)) {
        setErrorMessage(STRINGS.booking.datePicker.conflictAlert);
        return;
      }

      const [y1, m1, d1] = startKey.split('-').map(Number);
      const [y2, m2, d2] = dateKey.split('-').map(Number);
      const diffDays = Math.max(
        1,
        Math.round((new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1)) / (1000 * 60 * 60 * 24))
      );

      onChange({
        startDate: startKey,
        endDate: dateKey,
        pickupTime,
        returnTime,
        totalDays: diffDays,
      });
    }
  };

  const handleClear = () => {
    setErrorMessage(null);
    onChange({
      startDate: null,
      endDate: null,
      pickupTime: '09:00',
      returnTime: '18:00',
      totalDays: 0,
    });
  };

  const handleQuickSelect = (daysCount) => {
    setErrorMessage(null);
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
        pickupTime,
        returnTime,
        totalDays: daysCount,
      });
    } else {
      setErrorMessage(STRINGS.booking.datePicker.conflictAlert);
    }
  };

  const handlePickupTimeChange = (newTime) => {
    onChange({
      startDate: startKey || null,
      endDate: endKey || null,
      pickupTime: newTime,
      returnTime: returnTime || '18:00',
      totalDays: totalSelectedDays || 1,
    });
  };

  const handleReturnTimeChange = (newTime) => {
    onChange({
      startDate: startKey || null,
      endDate: endKey || null,
      pickupTime: pickupTime || '09:00',
      returnTime: newTime,
      totalDays: totalSelectedDays || 1,
    });
  };

  const getCellClasses = (dateKey) => {
    const isBlocked = isDateDisabled(dateKey);
    if (isBlocked) {
      return 'ts-calendar-cell ts-calendar-cell-blocked';
    }

    const isStart = dateKey === startKey;
    const isEnd = dateKey === endKey;
    const isSingle = isStart && isEnd;

    if (isSingle) {
      return 'ts-calendar-cell ts-calendar-cell-single font-semibold shadow-2xs';
    }

    if (isStart) {
      return 'ts-calendar-cell ts-calendar-cell-range-start font-semibold shadow-2xs';
    }

    if (isEnd) {
      return 'ts-calendar-cell ts-calendar-cell-range-end font-semibold shadow-2xs';
    }

    const effectiveEnd = endKey || hoverDate;
    if (startKey && effectiveEnd && dateKey > startKey && dateKey < effectiveEnd) {
      if (!rangeHasBlockedDates(startKey, effectiveEnd)) {
        return 'ts-calendar-cell ts-calendar-cell-range-between font-medium';
      }
    }

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
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
      {/* Top Bar: Title + Quick Select Pills + Clear */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-brand-500 flex-shrink-0" />
          <h2 className="text-sm font-bold text-slate-800">
            {STRINGS.booking.datePicker.title}
          </h2>
        </div>

        <div className="flex items-center flex-wrap gap-1.5">
          <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mr-0.5">
            <Sparkles className="w-3 h-3 text-brand-500" />
            Quick:
          </span>
          <button
            type="button"
            onClick={() => handleQuickSelect(1)}
            className="px-2.5 py-0.5 text-[11px] rounded-full bg-slate-100 text-slate-600 hover:bg-brand-100 hover:text-brand-600 font-semibold transition"
          >
            {STRINGS.booking.datePicker.quick1Day}
          </button>
          <button
            type="button"
            onClick={() => handleQuickSelect(3)}
            className="px-2.5 py-0.5 text-[11px] rounded-full bg-slate-100 text-slate-600 hover:bg-brand-100 hover:text-brand-600 font-semibold transition"
          >
            {STRINGS.booking.datePicker.quickWeekend}
          </button>
          <button
            type="button"
            onClick={() => handleQuickSelect(7)}
            className="px-2.5 py-0.5 text-[11px] rounded-full bg-slate-100 text-slate-600 hover:bg-brand-100 hover:text-brand-600 font-semibold transition"
          >
            {STRINGS.booking.datePicker.quick1Week}
          </button>

          {startKey && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition"
            >
              <RotateCcw className="w-3 h-3" />
              {STRINGS.booking.datePicker.clearDates}
            </button>
          )}
        </div>
      </div>

      {/* Main Side-by-Side Layout: Left = Calendar, Right = Time & Summary */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-3 items-start">
        {/* Left: Compact Calendar (7 cols) */}
        <div className="md:col-span-7">
          {/* Month Navigation */}
          <div className="flex items-center justify-between pb-1.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition"
              aria-label={STRINGS.booking.datePicker.monthPrev}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
              {monthTitle}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition"
              aria-label={STRINGS.booking.datePicker.monthNext}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day of week headers */}
          <div className="ts-calendar-grid mb-1">
            {STRINGS.booking.datePicker.daysOfWeek.map((dayName, idx) => (
              <div
                key={idx}
                className="text-center text-[10px] font-bold text-slate-400 py-0.5"
              >
                {dayName}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="ts-calendar-grid">
            {Array.from({ length: startWeekdayOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="ts-calendar-cell opacity-0 pointer-events-none" />
            ))}

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
                    <Lock className="w-2 h-2 text-slate-400 absolute top-0.5 right-0.5" />
                  )}
                  {isToday && !isBlocked && (
                    <span className="w-1 h-1 bg-brand-500 rounded-full absolute bottom-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Mini Legend */}
          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-white border border-slate-200" />
              <span>{STRINGS.booking.datePicker.legendAvailable}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-brand-500" />
              <span>{STRINGS.booking.datePicker.legendSelected}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-slate-100 border border-slate-200" />
              <span>{STRINGS.booking.datePicker.legendBlocked}</span>
            </div>
          </div>
        </div>

        {/* Right: Pickup / Return Time + Selected Summary (5 cols) */}
        <div className="md:col-span-5 flex flex-col gap-2.5 md:border-l md:border-slate-100 md:pl-4">
          {/* Selected Dates Summary Box */}
          <div className="p-2.5 rounded-xl bg-brand-50/60 border border-brand-100 text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700">
                Selected Period
              </span>
              {startKey && (
                <span className="px-2 py-0.5 rounded-full bg-brand-500 text-white text-[10px] font-bold">
                  {totalSelectedDays} {STRINGS.booking.datePicker.totalDaysSuffix}
                </span>
              )}
            </div>
            {startKey ? (
              <div className="text-slate-800 font-semibold text-xs leading-snug">
                <div>
                  Pickup: <strong className="text-brand-800">{formatDisplayDate(startKey)}</strong> ({pickupTime})
                </div>
                <div className="mt-0.5">
                  Return:{' '}
                  {endKey ? (
                    <>
                      <strong className="text-brand-800">{formatDisplayDate(endKey)}</strong> ({returnTime})
                    </>
                  ) : (
                    <span className="text-slate-400 italic font-normal">
                      {STRINGS.booking.datePicker.selectEndDate}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-slate-400 italic text-[11px]">
                {STRINGS.booking.datePicker.notSelected}
              </p>
            )}
          </div>

          {/* Pickup Time */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand-500" />
                <span>{STRINGS.booking.datePicker.pickupTimeLabel || 'Pickup Time'}</span>
              </label>
              <input
                type="time"
                value={pickupTime || '09:00'}
                onChange={(e) => handlePickupTimeChange(e.target.value)}
                className="px-2 py-1 text-xs font-bold text-slate-800 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-brand-500 cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {['08:00', '09:00', '10:00', '14:00'].map((t) => (
                <button
                  key={`p-${t}`}
                  type="button"
                  onClick={() => handlePickupTimeChange(t)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                    pickupTime === t
                      ? 'bg-brand-500 text-white font-bold'
                      : 'bg-white text-slate-600 hover:bg-slate-200/80 border border-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Return Time */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>{STRINGS.booking.datePicker.returnTimeLabel || 'Return Time'}</span>
              </label>
              <input
                type="time"
                value={returnTime || '18:00'}
                onChange={(e) => handleReturnTimeChange(e.target.value)}
                className="px-2 py-1 text-xs font-bold text-slate-800 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-brand-500 cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {['12:00', '17:00', '18:00', '20:00'].map((t) => (
                <button
                  key={`r-${t}`}
                  type="button"
                  onClick={() => handleReturnTimeChange(t)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                    returnTime === t
                      ? 'bg-brand-500 text-white font-bold'
                      : 'bg-white text-slate-600 hover:bg-slate-200/80 border border-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {errorMessage && (
            <div className="p-2 rounded-xl bg-red-50 text-red-600 text-[11px] flex items-center gap-1.5 border border-red-100">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebDatePicker;
