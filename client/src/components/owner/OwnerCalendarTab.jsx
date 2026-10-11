import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Lock, AlertCircle } from 'lucide-react';
import { STRINGS } from '../../constants/strings';
import { COLORS } from '../../constants/colors';

export const OwnerCalendarTab = ({ 
  devices = [], 
  bookings = [],
  blockedDatesMap = {}, 
  onToggleBlockedDate 
}) => {
  const t = STRINGS.owner.calendar;
  const [selectedDeviceId, setSelectedDeviceId] = useState(devices[0]?._id || '');
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());

  const blockedDates = blockedDatesMap[selectedDeviceId] || [];

  // Generate days in month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sun

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const formatDateKey = (day) => {
    const mm = String(currentMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${currentYear}-${mm}-${dd}`;
  };

  const todayDay = now.getDate();
  const todayMonth = now.getMonth();
  const todayYear = now.getFullYear();
  const isCurrentMonthYear = currentMonth === todayMonth && currentYear === todayYear;

  // Filter blocked dates in current month
  const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const blockedDatesInMonth = blockedDates.filter((d) => d.startsWith(monthPrefix));

  return (
    <div className="owner-calendar-container flex-1 min-h-0 flex flex-col overflow-y-auto thin-scrollbar pr-1 pb-6 gap-3">
      {/* 1. Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-800 leading-tight">
            {t.title}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t.subtitle}
          </p>
        </div>

        {/* Quick blocked count badge */}
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs">
            <Lock size={12} />
            <span>{t.blockedCountPrefix}: <strong>{blockedDatesInMonth.length}</strong> {t.daysSuffix}</span>
          </div>
        </div>
      </div>

      {/* 2. Device Selector & Legend Bar */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-xs p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 flex-1 min-w-[260px]">
          <label className="text-xs font-semibold text-slate-700 whitespace-nowrap flex items-center gap-1.5">
            <CalendarIcon size={14} color={COLORS.primary.DEFAULT} />
            <span>{t.deviceSelector}</span>
          </label>
          <select
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium focus:border-brand-500 focus:outline-none bg-slate-50 hover:bg-white text-slate-800 transition-colors flex-1 max-w-[420px] truncate cursor-pointer"
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
          >
            {devices.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name} {d.brand ? `(${d.brand})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 sm:gap-4 text-xs shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-white border border-slate-300 shadow-2xs" />
            <span className="text-slate-600 text-xs font-medium">{t.legend.available}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-2xs" />
            <span className="text-slate-600 text-xs font-medium">{t.legend.blocked}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-2xs" />
            <span className="text-slate-600 text-xs font-medium">{t.legend.rented}</span>
          </div>
        </div>
      </div>

      {/* 3. Main Calendar Card */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-xs p-3.5 sm:p-4 shrink-0 flex flex-col">
        {/* Month Navigation & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2 leading-none">
              <CalendarIcon size={16} color={COLORS.primary.DEFAULT} />
              <span>{monthNames[currentMonth]} {currentYear}</span>
            </h2>
            {isCurrentMonthYear && (
              <span className="text-[10px] font-semibold text-[#286E74] bg-[#EEF8F8] px-2 py-0.5 rounded-full border border-[#67BEC3]/30">
                Current
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
              onClick={() => {
                const cur = new Date();
                setCurrentMonth(cur.getMonth());
                setCurrentYear(cur.getFullYear());
              }}
              title="Return to current month"
            >
              {t.todayBtn}
            </button>

            <button
              type="button"
              className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              onClick={handlePrevMonth}
              title="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              onClick={handleNextMonth}
              title="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Compact Hint Banner & Action */}
        <div className="text-[11px] text-slate-500 mb-2.5 flex items-center justify-between gap-2 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
          <div className="flex items-center gap-1.5">
            <AlertCircle size={13} color={COLORS.primary.DEFAULT} />
            <span>{t.hint}</span>
          </div>

          {blockedDatesInMonth.length > 0 && (
            <button
              type="button"
              onClick={() => {
                blockedDatesInMonth.forEach((dateKey) => {
                  onToggleBlockedDate(selectedDeviceId, dateKey);
                });
              }}
              className="text-[10px] text-rose-600 hover:text-rose-700 font-semibold cursor-pointer underline shrink-0 transition-colors"
              title="Unblock all dates in this month"
            >
              {t.clearAllBtn} ({blockedDatesInMonth.length})
            </button>
          )}
        </div>

        {/* Weekday headers: 7 columns (English) */}
        <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
          <div className="text-rose-500/80">Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div className="text-rose-500/80">Sat</div>
        </div>

        {/* Calendar days grid */}
        <div className="owner-calendar-grid">
          {/* Empty cells before month start */}
          {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
            <div key={`empty-${idx}`} className="opacity-0 pointer-events-none min-h-[52px] h-[54px]" />
          ))}

          {/* Days */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const dateKey = formatDateKey(dayNum);
            const isBlocked = blockedDates.includes(dateKey);

            // Compute actual rented state from live MongoDB bookings
            const isRented = bookings.some((b) => {
              if (b.status !== 'active' && b.status !== 'approved') return false;
              const devId = b.deviceId || b.device?._id || b.device?.id;
              if (devId && devId.toString() !== selectedDeviceId.toString()) return false;
              const start = (b.startDate || b.rentalPeriod?.startDate || '').split('T')[0];
              const end = (b.endDate || b.rentalPeriod?.endDate || '').split('T')[0];
              if (!start || !end) return false;
              return dateKey >= start && dateKey <= end;
            });

            const isToday = dayNum === todayDay && currentMonth === todayMonth && currentYear === todayYear;

            let dayClass = 'available';
            if (isRented) dayClass = 'rented';
            else if (isBlocked) dayClass = 'blocked';
            if (isToday) dayClass += ' is-today';

            return (
              <div
                key={dayNum}
                className={`owner-calendar-day ${dayClass}`}
                onClick={() => {
                  if (isRented) return;
                  onToggleBlockedDate(selectedDeviceId, dateKey);
                }}
                title={
                  isRented 
                    ? 'Device is currently rented by customer' 
                    : isBlocked 
                      ? 'Click to unblock this date' 
                      : 'Click to block this date'
                }
              >
                {/* Top row: Day number + Today badge */}
                <div className="flex items-center justify-between w-full">
                  <span className={`text-xs font-bold leading-none ${
                    isToday 
                      ? 'text-[#286E74]' 
                      : isBlocked 
                        ? 'text-rose-700' 
                        : isRented 
                          ? 'text-sky-700' 
                          : 'text-slate-700'
                  }`}>
                    {dayNum}
                  </span>
                  {isToday && (
                    <span className="text-[9px] font-bold text-[#286E74] bg-[#EEF8F8] px-1 py-0.2 rounded border border-[#67BEC3]/30 leading-none">
                      Today
                    </span>
                  )}
                </div>

                {/* Bottom row: Status tag */}
                <div className="w-full flex items-center justify-start mt-auto">
                  {isBlocked && (
                    <span className="text-[10px] font-semibold text-rose-700 bg-rose-100/90 px-1.5 py-0.5 rounded flex items-center gap-0.5 leading-none">
                      <Lock size={9} /> {t.statusLocked}
                    </span>
                  )}
                  {isRented && (
                    <span className="text-[10px] font-semibold text-sky-700 bg-sky-100/90 px-1.5 py-0.5 rounded flex items-center gap-0.5 leading-none">
                      {t.statusRented}
                    </span>
                  )}
                  {!isBlocked && !isRented && (
                    <span className="text-[9px] text-slate-400 group-hover:text-[#286E74] transition-colors font-medium">
                      {t.statusAvailable}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OwnerCalendarTab;
