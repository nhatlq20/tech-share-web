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
  LogIn,
  LogOut,
  Zap,
} from 'lucide-react';
import { STRINGS } from '../../constants/strings.js';
import './WebDatePicker.css';

const QUICK_DURATION_PRESETS = [1, 2, 3, 5, 7];
const QUICK_TIMES = ['08:00', '10:00', '13:30', '17:30', '20:00'];

const formatDateKey = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

const getDayOfWeek = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[dateObj.getDay()];
};

/**
 * WebDatePicker - Desktop Web side-by-side Calendar & Schedule Selector
 * Synchronized with App's Rental Period data (Step 1 Pickup, Step 2 Return, Quick Presets [1,2,3,5,7], Time Suggestions)
 */
export const WebDatePicker = ({
  startDate,
  endDate,
  pickupTime = '08:00',
  returnTime = '08:00',
  rentalDurationInfo = { days: 0, hours: 0, totalHours: 0, billingDays: 0 },
  onChange,
  disabledDates = [],
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
    const title = currentMonthDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

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
      setErrorMessage(STRINGS.BOOKING_CREATE.CONFLICT_MSG);
      return;
    }

    if (!startKey || (startKey && endKey)) {
      onChange({
        startDate: dateKey,
        endDate: null,
        pickupTime,
        returnTime,
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
        });
        return;
      }

      if (rangeHasBlockedDates(startKey, dateKey)) {
        setErrorMessage(STRINGS.BOOKING_CREATE.CONFLICT_MSG);
        return;
      }

      onChange({
        startDate: startKey,
        endDate: dateKey,
        pickupTime,
        returnTime,
      });
    }
  };

  const handleClear = () => {
    setErrorMessage(null);
    onChange({
      startDate: null,
      endDate: null,
      pickupTime: '08:00',
      returnTime: '08:00',
    });
  };

  const handleQuickSelect = (daysToAdd) => {
    setErrorMessage(null);

    let baseStartKey = startKey;
    if (!baseStartKey) {
      for (let offset = 0; offset < 30; offset += 1) {
        const candidate = new Date(today);
        candidate.setDate(candidate.getDate() + offset);
        const key = formatDateKey(candidate);
        if (!isDateDisabled(key)) {
          baseStartKey = key;
          break;
        }
      }
    }

    if (!baseStartKey) {
      setErrorMessage(STRINGS.BOOKING_CREATE.CONFLICT_MSG);
      return;
    }

    const [y, m, d] = baseStartKey.split('-').map(Number);
    const targetEnd = new Date(y, m - 1, d);
    targetEnd.setDate(targetEnd.getDate() + daysToAdd);
    const targetEndKey = formatDateKey(targetEnd);

    if (rangeHasBlockedDates(baseStartKey, targetEndKey)) {
      setErrorMessage(STRINGS.BOOKING_CREATE.CONFLICT_MSG);
      return;
    }

    setCurrentMonthDate(new Date(y, m - 1, 1));
    onChange({
      startDate: baseStartKey,
      endDate: targetEndKey,
      pickupTime,
      returnTime: pickupTime,
    });
  };

  const handlePickupTimeChange = (newTime) => {
    onChange({
      startDate: startKey || null,
      endDate: endKey || null,
      pickupTime: newTime,
      returnTime: returnTime || '08:00',
    });
  };

  const handleReturnTimeChange = (newTime) => {
    onChange({
      startDate: startKey || null,
      endDate: endKey || null,
      pickupTime: pickupTime || '08:00',
      returnTime: newTime,
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

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100">
      {/* Header Row: Title + Subtitle + Duration Badge + Quick Presets */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center text-brand-500 shrink-0">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">
              {STRINGS.BOOKING_CREATE.RENTAL_TIME_TITLE}
            </h2>
            <p className="text-[11px] text-slate-500">
              {STRINGS.BOOKING_CREATE.RENTAL_TIME_SUBTITLE}
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-1.5">
          <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1 mr-1">
            <Sparkles className="w-3 h-3 text-brand-500" />
            {STRINGS.BOOKING_CREATE.QUICK_SELECT_LABEL}
          </span>
          {QUICK_DURATION_PRESETS.map((d) => {
            const isActive =
              rentalDurationInfo.days === d &&
              rentalDurationInfo.hours === 0 &&
              Boolean(startKey && endKey);
            return (
              <button
                key={d}
                type="button"
                onClick={() => handleQuickSelect(d)}
                className={`px-2.5 py-1 text-[11px] rounded-full border transition ${
                  isActive
                    ? 'bg-brand-50 border-brand-500 text-brand-600 font-bold'
                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-brand-50 hover:border-brand-300 hover:text-brand-600 font-semibold'
                }`}
              >
                {d === 7
                  ? STRINGS.BOOKING_CREATE.QUICK_SELECT_WEEK
                  : STRINGS.BOOKING_CREATE.QUICK_SELECT_DAYS(d)}
              </button>
            );
          })}

          {startKey && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition"
            >
              <RotateCcw className="w-3 h-3" />
              {STRINGS.booking.datePicker.clearDates}
            </button>
          )}
        </div>
      </div>

      {/* Main Web Side-by-Side Grid: Left = Calendar (7 cols), Right = Step 1 Pickup & Step 2 Return + Time (5 cols) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-4 items-start">
        {/* Left: Interactive Calendar (7 cols) */}
        <div className="md:col-span-7">
          {/* Month Navigation */}
          <div className="flex items-center justify-between pb-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition"
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
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition"
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
                  title={isBlocked ? STRINGS.BOOKING_CREATE.LEGEND_BUSY : dateKey}
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

          {/* Legend matching App */}
          <div className="flex items-center gap-4 mt-2.5 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-500" />
              <span>{STRINGS.BOOKING_CREATE.LEGEND_SELECTED}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>{STRINGS.BOOKING_CREATE.LEGEND_BUSY}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-white border border-slate-300" />
              <span>{STRINGS.booking.datePicker.legendAvailable}</span>
            </div>
          </div>
        </div>

        {/* Right: App-synchronized Step 1 Pickup & Step 2 Return + Time Suggestions (5 cols) */}
        <div className="md:col-span-5 flex flex-col gap-2.5 md:border-l md:border-slate-100 md:pl-4">
          {/* Step 1: Pickup Card */}
          <div
            className={`rounded-xl border p-3 transition-all ${
              startKey
                ? 'border-brand-500 bg-brand-50/40'
                : 'border-slate-200 bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-extrabold text-emerald-600 tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {STRINGS.BOOKING_CREATE.STEP_1_BADGE}
              </span>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-brand-500" />
                <input
                  type="time"
                  value={pickupTime}
                  onChange={(e) => handlePickupTimeChange(e.target.value)}
                  className="px-1.5 py-0.5 text-xs font-bold text-slate-800 rounded-md border border-slate-200 bg-white focus:outline-hidden focus:border-brand-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5 mb-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  startKey ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-500'
                }`}
              >
                <LogIn className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                {startKey ? (
                  <>
                    <p className="text-xs font-extrabold text-slate-900">
                      {formatDisplayDate(startKey)} ({getDayOfWeek(startKey)})
                    </p>
                    <p className="text-[11px] font-semibold text-brand-600">
                      {STRINGS.BOOKING_CREATE.AT_TIME(pickupTime)}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-bold text-slate-600">
                      {STRINGS.BOOKING_CREATE.NO_START_DATE}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {STRINGS.BOOKING_CREATE.NO_START_HINT}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 flex-wrap">
              {QUICK_TIMES.map((t) => (
                <button
                  key={`p-${t}`}
                  type="button"
                  onClick={() => handlePickupTimeChange(t)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition ${
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

          {/* Duration Connector Pill */}
          {startKey && endKey && rentalDurationInfo.billingDays > 0 && (
            <div className="flex items-center justify-center">
              <div className="inline-flex items-center gap-1 bg-brand-500 text-white px-3 py-0.5 rounded-full text-[11px] font-bold shadow-2xs">
                <Zap className="w-3 h-3" />
                <span>
                  {STRINGS.BOOKING_CREATE.TOTAL_DURATION_CONNECTOR(
                    rentalDurationInfo.billingDays,
                    rentalDurationInfo.totalHours
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Step 2: Return Card */}
          <div
            className={`rounded-xl border p-3 transition-all ${
              endKey
                ? 'border-brand-500 bg-brand-50/40'
                : 'border-slate-200 bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center gap-1.5 bg-amber-50 px-2 py-0.5 rounded-full text-[10px] font-extrabold text-amber-600 tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {STRINGS.BOOKING_CREATE.STEP_2_BADGE}
              </span>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-brand-500" />
                <input
                  type="time"
                  value={returnTime}
                  onChange={(e) => handleReturnTimeChange(e.target.value)}
                  className="px-1.5 py-0.5 text-xs font-bold text-slate-800 rounded-md border border-slate-200 bg-white focus:outline-hidden focus:border-brand-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5 mb-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  endKey ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-500'
                }`}
              >
                <LogOut className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                {endKey ? (
                  <>
                    <p className="text-xs font-extrabold text-slate-900">
                      {formatDisplayDate(endKey)} ({getDayOfWeek(endKey)})
                    </p>
                    <p className="text-[11px] font-semibold text-brand-600">
                      {STRINGS.BOOKING_CREATE.RETURN_AT_TIME(returnTime)}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-bold text-slate-600">
                      {STRINGS.BOOKING_CREATE.NO_END_DATE}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {startKey
                        ? STRINGS.BOOKING_CREATE.NO_END_HINT_READY
                        : STRINGS.BOOKING_CREATE.NO_END_HINT_WAIT}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 flex-wrap">
              {QUICK_TIMES.map((t) => (
                <button
                  key={`r-${t}`}
                  type="button"
                  onClick={() => handleReturnTimeChange(t)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition ${
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
            <div className="p-2.5 rounded-xl bg-red-50 text-red-600 text-[11px] flex items-center gap-1.5 border border-red-100">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebDatePicker;
