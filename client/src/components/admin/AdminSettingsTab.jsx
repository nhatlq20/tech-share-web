import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Save,
  Power,
  Calendar,
  DollarSign,
  Bell,
} from 'lucide-react';
import {
  getAdminSettings,
  updateAdminSetting,
} from '../../services/adminService.js';

export const AdminSettingsTab = () => {
  const [activeCategory, setActiveCategory] = useState('general');
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [notice, setNotice] = useState(null); // { type: 'success' | 'error', text: '' }

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAdminSettings();
      if (res && res.data) {
        const map = {};
        const list = Array.isArray(res.data) ? res.data : [];
        list.forEach((s) => {
          map[s.key] = {
            ...s,
            formValue: JSON.parse(JSON.stringify(s.value || {})),
          };
        });
        setSettings(map);
      }
    } catch (err) {
      console.error('Error loading system settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleFieldChange = (key, field, val) => {
    setSettings((prev) => {
      const current = prev[key] || {};
      const newFormValue = { ...(current.formValue || {}), [field]: val };
      return {
        ...prev,
        [key]: {
          ...current,
          formValue: newFormValue,
        },
      };
    });
  };

  const handleSaveSetting = async (key) => {
    try {
      setSavingKey(key);
      setNotice(null);
      const item = settings[key];
      if (!item) return;

      const res = await updateAdminSetting(key, {
        value: item.formValue,
        description: item.description,
      });

      if (res && res.data) {
        setNotice({ type: 'success', text: res.message || `Setting '${key}' saved successfully.` });
        setSettings((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            value: res.data.value,
          },
        }));
      }
    } catch (err) {
      setNotice({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Error saving setting.',
      });
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Platform Configuration & Policies</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage platform operational parameters, financial policies, and maintenance mode
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchSettings}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            title="Refresh"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
        </div>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs animate-in fade-in duration-200 ${
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span className="font-semibold">{notice.text}</span>
          </div>
          <button onClick={() => setNotice(null)} className="p-1 hover:opacity-75">
            <CheckCircle2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Category Selector Tabs */}
      <div className="flex bg-white p-2 rounded-2xl border border-slate-100 shadow-sm gap-2">
        {[
          { id: 'general', label: 'General & Maintenance', icon: Power },
          { id: 'booking', label: 'Rental Rules', icon: Calendar },
          { id: 'finance', label: 'Financial Policies', icon: DollarSign },
          { id: 'notification', label: 'Notification Channels', icon: Bell },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveCategory(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition flex-1 justify-center ${
                isActive
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Settings Cards */}
      <div className="space-y-6">
        {/* Category: General (Platform Maintenance) */}
        {activeCategory === 'general' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">System Maintenance Mode</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Suspend new rental bookings and display maintenance banner to users
                </p>
              </div>
              <button
                type="button"
                disabled={savingKey === 'platform_maintenance'}
                onClick={() => handleSaveSetting('platform_maintenance')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {savingKey === 'platform_maintenance' ? 'Saving...' : 'Save Settings'}
              </button>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <span className="font-semibold text-slate-800 text-xs block">
                    Enable platform maintenance mode
                  </span>
                  <span className="text-[11px] text-slate-400">
                    When enabled, new rental bookings will be temporarily disabled
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(settings['platform_maintenance']?.formValue?.enabled)}
                  onChange={(e) =>
                    handleFieldChange('platform_maintenance', 'enabled', e.target.checked)
                  }
                  className="w-5 h-5 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 text-xs mb-1">
                  Maintenance banner message:
                </label>
                <textarea
                  rows={3}
                  value={settings['platform_maintenance']?.formValue?.message || ''}
                  onChange={(e) =>
                    handleFieldChange('platform_maintenance', 'message', e.target.value)
                  }
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-medium"
                />
              </div>
            </div>
          </div>
        )}

        {/* Category: Booking Rules */}
        {activeCategory === 'booking' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Rental Duration & Booking Rules</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set minimum and maximum rental days and auto-cancellation grace period
                </p>
              </div>
              <button
                type="button"
                disabled={savingKey === 'booking_rules'}
                onClick={() => handleSaveSetting('booking_rules')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {savingKey === 'booking_rules' ? 'Saving...' : 'Save Settings'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Auto-cancel unpaid booking window (hours):
                </label>
                <input
                  type="number"
                  min={1}
                  value={settings['booking_rules']?.formValue?.autoCancelUnpaidHours ?? 24}
                  onChange={(e) =>
                    handleFieldChange('booking_rules', 'autoCancelUnpaidHours', Number(e.target.value))
                  }
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Maximum rental duration per order (days):
                </label>
                <input
                  type="number"
                  min={1}
                  value={settings['booking_rules']?.formValue?.maxRentalDays ?? 30}
                  onChange={(e) =>
                    handleFieldChange('booking_rules', 'maxRentalDays', Number(e.target.value))
                  }
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Minimum rental duration (days):
                </label>
                <input
                  type="number"
                  min={1}
                  value={settings['booking_rules']?.formValue?.minRentalDays ?? 1}
                  onChange={(e) =>
                    handleFieldChange('booking_rules', 'minRentalDays', Number(e.target.value))
                  }
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Maximum extension window (days):
                </label>
                <input
                  type="number"
                  min={1}
                  value={settings['booking_rules']?.formValue?.maxExtendDays ?? 14}
                  onChange={(e) =>
                    handleFieldChange('booking_rules', 'maxExtendDays', Number(e.target.value))
                  }
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
            </div>
          </div>
        )}

        {/* Category: Finance Policy */}
        {activeCategory === 'finance' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Financial Policies & Escrow Security</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Platform service fee commission rate and post-return escrow holding duration
                </p>
              </div>
              <button
                type="button"
                disabled={savingKey === 'financial_policy'}
                onClick={() => handleSaveSetting('financial_policy')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {savingKey === 'financial_policy' ? 'Saving...' : 'Save Settings'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Platform service fee rate (%):
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={settings['financial_policy']?.formValue?.platformServiceFeePercent ?? 10}
                  onChange={(e) =>
                    handleFieldChange('financial_policy', 'platformServiceFeePercent', Number(e.target.value))
                  }
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-bold text-teal-700"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Escrow hold duration after return (days):
                </label>
                <input
                  type="number"
                  min={1}
                  value={settings['financial_policy']?.formValue?.escrowHoldDaysAfterReturn ?? 3}
                  onChange={(e) =>
                    handleFieldChange('financial_policy', 'escrowHoldDaysAfterReturn', Number(e.target.value))
                  }
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Minimum deposit rate (% of device value):
                </label>
                <input
                  type="number"
                  min={10}
                  max={100}
                  value={settings['financial_policy']?.formValue?.minDepositPercent ?? 30}
                  onChange={(e) =>
                    handleFieldChange('financial_policy', 'minDepositPercent', Number(e.target.value))
                  }
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
            </div>
          </div>
        )}

        {/* Category: Notification Channels */}
        {activeCategory === 'notification' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Notification Channels & Alerts</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enable or disable real-time and automated notification delivery channels
                </p>
              </div>
              <button
                type="button"
                disabled={savingKey === 'notification_channels'}
                onClick={() => handleSaveSetting('notification_channels')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {savingKey === 'notification_channels' ? 'Saving...' : 'Save Settings'}
              </button>
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <span className="font-semibold text-slate-800 block">Real-time Socket.IO Channel</span>
                  <span className="text-[11px] text-slate-400">
                    Deliver instant alerts to web portal and notification bell
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(settings['notification_channels']?.formValue?.socketEnabled)}
                  onChange={(e) =>
                    handleFieldChange('notification_channels', 'socketEnabled', e.target.checked)
                  }
                  className="w-5 h-5 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <span className="font-semibold text-slate-800 block">Mobile Push Notifications (FCM / Expo)</span>
                  <span className="text-[11px] text-slate-400">
                    Send push notifications to mobile devices
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(settings['notification_channels']?.formValue?.pushEnabled)}
                  onChange={(e) =>
                    handleFieldChange('notification_channels', 'pushEnabled', e.target.checked)
                  }
                  className="w-5 h-5 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSettingsTab;
