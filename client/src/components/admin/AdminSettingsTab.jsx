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
      console.error('Lỗi khi tải cấu hình hệ thống:', err);
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
        setNotice({ type: 'success', text: res.message || `Đã lưu cấu hình '${key}' thành công.` });
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
        text: err.response?.data?.message || err.message || 'Lỗi khi lưu cấu hình.',
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
              <h2 className="text-xl font-bold text-slate-900">Cấu hình hệ thống & Chính sách</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Quản lý các thông số vận hành sàn, chính sách tài chính và chế độ bảo trì
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchSettings}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            title="Làm mới"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
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
          { id: 'general', label: 'Chung & Bảo trì', icon: Power },
          { id: 'booking', label: 'Quy tắc đơn thuê', icon: Calendar },
          { id: 'finance', label: 'Chính sách tài chính', icon: DollarSign },
          { id: 'notification', label: 'Kênh thông báo', icon: Bell },
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
                <h3 className="text-sm font-bold text-slate-900">Chế độ bảo trì hệ thống</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tạm ngưng nhận đơn thuê mới và hiển thị biểu ngữ bảo trì cho người dùng
                </p>
              </div>
              <button
                type="button"
                disabled={savingKey === 'platform_maintenance'}
                onClick={() => handleSaveSetting('platform_maintenance')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {savingKey === 'platform_maintenance' ? 'Đang lưu...' : 'Lưu cấu hình'}
              </button>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <span className="font-semibold text-slate-800 text-xs block">
                    Kích hoạt bảo trì nền tảng
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Khi bật, toàn bộ tính năng đặt đơn thuê sẽ bị tạm khóa
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
                  Thông báo bảo trì hiển thị:
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
                <h3 className="text-sm font-bold text-slate-900">Quy tắc thời hạn và đặt thuê</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thiết lập hạn mức ngày thuê tối thiểu, tối đa và thời gian hủy đơn chưa thanh toán
                </p>
              </div>
              <button
                type="button"
                disabled={savingKey === 'booking_rules'}
                onClick={() => handleSaveSetting('booking_rules')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {savingKey === 'booking_rules' ? 'Đang lưu...' : 'Lưu cấu hình'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Thời hạn tự hủy đơn chưa cọc (giờ):
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
                  Thời gian thuê tối đa mỗi đơn (ngày):
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
                  Thời gian thuê tối thiểu (ngày):
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
                  Gia hạn tối đa (ngày):
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
                <h3 className="text-sm font-bold text-slate-900">Chính sách tài chính & Ký quỹ sàn</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tỷ lệ phí hoa hồng nền tảng và thời hạn giữ ký quỹ bảo đảm hoàn tất
                </p>
              </div>
              <button
                type="button"
                disabled={savingKey === 'financial_policy'}
                onClick={() => handleSaveSetting('financial_policy')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {savingKey === 'financial_policy' ? 'Đang lưu...' : 'Lưu cấu hình'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tỷ lệ phí dịch vụ nền tảng (%):
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
                  Thời gian giữ ký quỹ sau trả máy (ngày):
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
                  Tỷ lệ cọc tối thiểu (% giá trị thiết bị):
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
                <h3 className="text-sm font-bold text-slate-900">Kênh thông báo & Cảnh báo</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bật/tắt các kênh giao tiếp thời gian thực và tự động
                </p>
              </div>
              <button
                type="button"
                disabled={savingKey === 'notification_channels'}
                onClick={() => handleSaveSetting('notification_channels')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {savingKey === 'notification_channels' ? 'Đang lưu...' : 'Lưu cấu hình'}
              </button>
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <span className="font-semibold text-slate-800 block">Kênh Socket.io Real-time</span>
                  <span className="text-[11px] text-slate-400">
                    Gửi thông báo tức thì lên giao diện web và chuông thông báo
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
                  <span className="font-semibold text-slate-800 block">Kênh Push Notification (Mobile)</span>
                  <span className="text-[11px] text-slate-400">
                    Gửi đẩy thông báo đến thiết bị di động (FCM / Expo)
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
