import React, { useState, useMemo } from "react";
import { Search, PlusCircle, Star, Calendar } from "lucide-react";
import { STRINGS } from "../../constants/strings";
import { COLORS, PRIMARY } from "../../constants/colors";

export const OwnerDevicesTab = ({
  devices = [],
  onToggleStatus,
  onPostDevice,
  onNavigateToCalendar,
}) => {
  const t = STRINGS.owner.devices;
  const tc = STRINGS.common;

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Filtered devices
  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      const matchSearch =
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.brand && d.brand.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchCat =
        selectedCategory === "all" || d.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [devices, searchTerm, selectedCategory]);

  return (
    <div className="owner-devices-container">
      {/* Header */}
      <div className="owner-page-header">
        <div>
          <h1 className="owner-page-title">{t.title}</h1>
          <p className="owner-page-subtitle">{t.subtitle}</p>
        </div>
        <button
          type="button"
          className="owner-btn-primary"
          onClick={onPostDevice}
        >
          <PlusCircle size={16} />
          <span>{t.postBtn}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="owner-card flex flex-wrap items-center justify-between gap-4 p-4 mb-5">
        <div className="owner-search-pill" style={{ width: "320px" }}>
          <Search size={15} color={COLORS.primary.DEFAULT} />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {Object.entries(t.categories).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedCategory === key
                  ? "bg-brand-500 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              style={{
                backgroundColor: selectedCategory === key ? PRIMARY : undefined,
              }}
              onClick={() => setSelectedCategory(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Devices Table */}
      <div className="owner-card p-0 overflow-hidden">
        <div className="owner-table-container border-0">
          <table className="owner-table">
            <thead>
              <tr>
                <th>{t.table.colDevice}</th>
                <th>{t.table.colCategory}</th>
                <th>{t.table.colPrice}</th>
                <th>{t.table.colRentals}</th>
                <th>{t.table.colStatus}</th>
                <th style={{ textAlign: "right" }}>{t.table.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-500">
                    {t.table.emptyMessage}
                  </td>
                </tr>
              ) : (
                filteredDevices.map((device) => {
                  const isAvailable = device.status === "available";
                  return (
                    <tr key={device._id}>
                      {/* Device name & image */}
                      <td>
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              device.images?.[0] ||
                              "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=150&q=80"
                            }
                            alt={device.name}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                          />
                          <div>
                            <div className="font-semibold text-slate-800 text-sm line-clamp-1">
                              {device.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              {device.brand} • {device.condition || "Good"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td>
                        <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 capitalize">
                          {device.category}
                        </span>
                      </td>

                      {/* Pricing */}
                      <td>
                        <div className="text-sm font-bold text-slate-800">
                          {new Intl.NumberFormat("vi-VN", {
                            style: "currency",
                            currency: "VND",
                          }).format(device.dailyRate)}
                          <span className="text-xs font-normal text-slate-500">
                            {" "}
                            / {tc.day || "day"}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Deposit:{" "}
                          {new Intl.NumberFormat("vi-VN", {
                            style: "currency",
                            currency: "VND",
                          }).format(device.depositAmount || 0)}
                        </div>
                      </td>

                      {/* Rentals & Rating */}
                      <td>
                        <div className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                          <Star size={13} fill="#F59E0B" color="#F59E0B" />
                          <span>{device.ratingAvg || 5.0}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {device.rentalCount || 0}{" "}
                          {STRINGS.owner.overview.recentBookings.unitDays ||
                            "rentals"}
                        </div>
                      </td>

                      {/* Status & Quick Toggle */}
                      <td>
                        <div className="flex items-center gap-2">
                          <span
                            className={`owner-badge owner-badge-${device.status}`}
                          >
                            {device.status === "available"
                              ? t.status.available
                              : device.status === "rented"
                                ? t.status.rented
                                : device.status === "maintenance"
                                  ? t.status.maintenance
                                  : t.status.hidden}
                          </span>
                          <button
                            type="button"
                            title={t.actions.statusToggle}
                            className={`w-7 h-4 rounded-full transition-colors relative cursor-pointer ${
                              isAvailable ? "bg-emerald-500" : "bg-slate-300"
                            }`}
                            onClick={() =>
                              onToggleStatus(
                                device._id,
                                isAvailable ? "hidden" : "available",
                              )
                            }
                          >
                            <span
                              className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                                isAvailable ? "left-3.5" : "left-0.5"
                              }`}
                            />
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: "right" }}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            className="owner-btn-outline py-1 px-2.5 text-xs"
                            onClick={() => onNavigateToCalendar(device._id)}
                            title={t.actions.calendar}
                          >
                            <Calendar
                              size={13}
                              color={COLORS.primary.DEFAULT}
                            />
                            <span>{t.actions.calendar}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OwnerDevicesTab;
