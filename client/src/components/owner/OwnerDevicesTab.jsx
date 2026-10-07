import React, { useState, useMemo } from 'react';
import { 
  Search, 
  PlusCircle, 
  Star, 
  Sparkles, 
  Upload, 
  X, 
  Calendar, 
  Check
} from 'lucide-react';
import { STRINGS } from '../../constants/strings';
import { COLORS, PRIMARY } from '../../constants/colors';

export const OwnerDevicesTab = ({ 
  devices = [], 
  onToggleStatus, 
  onAddDevice, 
  onNavigateToCalendar,
  isPostModalOpen,
  setIsPostModalOpen
}) => {
  const t = STRINGS.owner.devices;
  const tc = STRINGS.common;

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Form State for Adding Device
  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formCategory, setFormCategory] = useState('camera');
  const [formDailyRate, setFormDailyRate] = useState('');
  const [formDeposit, setFormDeposit] = useState('');
  const [formCondition, setFormCondition] = useState('Mới 98%, hoạt động hoàn hảo');
  const [formDescription, setFormDescription] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Filtered devices
  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      const matchSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.brand && d.brand.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchCat = selectedCategory === 'all' || d.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [devices, searchTerm, selectedCategory]);

  // AI Description Generator (K-08 Gemini AI Simulation)
  const handleGenerateAiDescription = () => {
    if (!formName && !formBrand) {
      alert('Vui lòng nhập Tên máy hoặc Thương hiệu trước khi tạo mô tả AI!');
      return;
    }
    setIsGeneratingAi(true);
    setTimeout(() => {
      const generated = `🔥 [SIÊU PHẨM CÔNG NGHỆ] ${formBrand} ${formName} - Lựa chọn hoàn hảo cho nhà sáng tạo nội dung & quay chụp chuyên nghiệp!
✨ Tình trạng: ${formCondition}, cảm biến sắc nét, ống kính trong veo không trầy xước.
⚡ Đi kèm đầy đủ phụ kiện cao cấp: 2 pin zin dung lượng cao, dock sạc nhanh, thẻ nhớ tốc độ cao 128GB, túi chống sốc.
🛡️ Đã được kiểm tra kỹ thuật (Check specs) và vệ sinh khử khuẩn trước mỗi lượt giao nhận. Hỗ trợ hướng dẫn sử dụng chi tiết khi nhận máy!`;
      setFormDescription(generated);
      setIsGeneratingAi(false);
    }, 1200);
  };

  // Submit Add Device
  const handleSubmitDevice = (e) => {
    e.preventDefault();
    if (!formName || !formDailyRate) {
      alert('Vui lòng điền đầy đủ Tên thiết bị và Giá thuê!');
      return;
    }
    const newDevice = {
      _id: `dev_${Date.now()}`,
      name: formName,
      brand: formBrand || 'TechShare Partner',
      category: formCategory,
      dailyRate: Number(formDailyRate),
      depositAmount: Number(formDeposit) || Number(formDailyRate) * 5,
      status: 'available',
      images: [
        'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80'
      ],
      ratingAvg: 5.0,
      rentalCount: 0,
      condition: formCondition,
      specs: {},
      createdAt: new Date().toISOString()
    };

    onAddDevice(newDevice);
    setIsPostModalOpen(false);
    // Reset form
    setFormName('');
    setFormBrand('');
    setFormDailyRate('');
    setFormDeposit('');
    setFormDescription('');
  };

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
          onClick={() => setIsPostModalOpen(true)}
        >
          <PlusCircle size={16} />
          <span>{t.postBtn}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="owner-card flex flex-wrap items-center justify-between gap-4 p-4 mb-5">
        <div className="owner-search-pill" style={{ width: '320px' }}>
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
                  ? 'bg-brand-500 text-white shadow-sm' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              style={{
                backgroundColor: selectedCategory === key ? PRIMARY : undefined
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
                <th style={{ textAlign: 'right' }}>{t.table.colActions}</th>
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
                  const isAvailable = device.status === 'available';
                  return (
                    <tr key={device._id}>
                      {/* Device name & image */}
                      <td>
                        <div className="flex items-center gap-3">
                          <img 
                            src={device.images?.[0] || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=150&q=80'} 
                            alt={device.name}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                          />
                          <div>
                            <div className="font-semibold text-slate-800 text-sm line-clamp-1">{device.name}</div>
                            <div className="text-xs text-slate-500">{device.brand} • {device.condition || 'Tốt'}</div>
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
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(device.dailyRate)}
                          <span className="text-xs font-normal text-slate-500"> / {tc.day}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Cọc: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(device.depositAmount || 0)}
                        </div>
                      </td>

                      {/* Rentals & Rating */}
                      <td>
                        <div className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                          <Star size={13} fill="#F59E0B" color="#F59E0B" />
                          <span>{device.ratingAvg || 5.0}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {device.rentalCount || 0} lượt thuê
                        </div>
                      </td>

                      {/* Status & Quick Toggle */}
                      <td>
                        <div className="flex items-center gap-2">
                          <span className={`owner-badge owner-badge-${device.status}`}>
                            {device.status === 'available' ? t.status.available :
                             device.status === 'rented' ? t.status.rented :
                             device.status === 'maintenance' ? t.status.maintenance : t.status.hidden}
                          </span>
                          <button
                            type="button"
                            title={t.actions.statusToggle}
                            className={`w-7 h-4 rounded-full transition-colors relative cursor-pointer ${
                              isAvailable ? 'bg-emerald-500' : 'bg-slate-300'
                            }`}
                            onClick={() => onToggleStatus(device._id, isAvailable ? 'hidden' : 'available')}
                          >
                            <span 
                              className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                                isAvailable ? 'left-3.5' : 'left-0.5'
                              }`} 
                            />
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            className="owner-btn-outline py-1 px-2.5 text-xs"
                            onClick={() => onNavigateToCalendar(device._id)}
                            title={t.actions.calendar}
                          >
                            <Calendar size={13} color={COLORS.primary.DEFAULT} />
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

      {/* MODAL: Đăng thiết bị cho thuê mới (K-01, K-02, K-08) */}
      {isPostModalOpen && (
        <div className="owner-modal-overlay">
          <div className="owner-modal-card">
            <div className="owner-modal-header">
              <h3 className="owner-modal-title flex items-center gap-2">
                <PlusCircle size={20} color={COLORS.primary.DEFAULT} />
                <span>{t.modalPost.title}</span>
              </h3>
              <button 
                type="button" 
                className="owner-close-btn"
                onClick={() => setIsPostModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitDevice} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Tên máy */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.modalPost.nameLabel} *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:border-brand-500 focus:outline-none"
                    placeholder={t.modalPost.namePlaceholder}
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>

                {/* Hãng */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.modalPost.brandLabel} *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:border-brand-500 focus:outline-none"
                    placeholder={t.modalPost.brandPlaceholder}
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                  />
                </div>

                {/* Danh mục */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.modalPost.categoryLabel} *
                  </label>
                  <select
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:border-brand-500 focus:outline-none bg-white"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                  >
                    <option value="camera">Máy ảnh & Ống kính</option>
                    <option value="laptop">Laptop & Máy trạm</option>
                    <option value="smartphone">Smartphone & Tablet</option>
                    <option value="drone">Flycam & Gimbal</option>
                    <option value="audio">Tai nghe & Âm thanh</option>
                    <option value="gaming">Gaming & VR</option>
                    <option value="accessory">Phụ kiện</option>
                  </select>
                </div>

                {/* Giá thuê */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.modalPost.dailyRateLabel} *
                  </label>
                  <input
                    type="number"
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:border-brand-500 focus:outline-none"
                    placeholder="250000"
                    value={formDailyRate}
                    onChange={(e) => setFormDailyRate(e.target.value)}
                  />
                </div>

                {/* Tiền cọc */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.modalPost.depositLabel}
                  </label>
                  <input
                    type="number"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:border-brand-500 focus:outline-none"
                    placeholder="1500000"
                    value={formDeposit}
                    onChange={(e) => setFormDeposit(e.target.value)}
                  />
                </div>

                {/* Tình trạng */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.modalPost.conditionLabel}
                  </label>
                  <input
                    type="text"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:border-brand-500 focus:outline-none"
                    placeholder={t.modalPost.conditionPlaceholder}
                    value={formCondition}
                    onChange={(e) => setFormCondition(e.target.value)}
                  />
                </div>
              </div>

              {/* Mô tả & Trợ lý Gemini AI */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {t.modalPost.descriptionLabel}
                  </label>
                  <button
                    type="button"
                    disabled={isGeneratingAi}
                    className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full text-brand-700 bg-brand-50 border border-brand-200 hover:bg-brand-100 transition-all cursor-pointer"
                    style={{ color: COLORS.primary.dark, background: COLORS.primary.surface }}
                    onClick={handleGenerateAiDescription}
                  >
                    <Sparkles size={13} color={COLORS.primary.DEFAULT} />
                    <span>{isGeneratingAi ? t.modalPost.aiGenerating : t.modalPost.aiPromptBtn}</span>
                  </button>
                </div>
                <textarea
                  rows={4}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:border-brand-500 focus:outline-none"
                  placeholder={t.modalPost.descriptionPlaceholder}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              {/* Dropzone Kéo thả ảnh (K-02 Simulation) */}
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center bg-slate-50 hover:bg-brand-50/50 transition-all">
                <Upload size={24} className="mx-auto mb-2 text-slate-400" />
                <p className="text-xs font-medium text-slate-600">
                  {t.modalPost.dropzoneText}
                </p>
                <span className="text-[11px] text-slate-400">JPG, PNG, WEBP (Khuyến nghị tỷ lệ 4:3)</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  className="owner-btn-outline"
                  onClick={() => setIsPostModalOpen(false)}
                >
                  {t.modalPost.cancelBtn}
                </button>
                <button
                  type="submit"
                  className="owner-btn-primary"
                >
                  <Check size={15} />
                  <span>{t.modalPost.submitBtn}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerDevicesTab;

