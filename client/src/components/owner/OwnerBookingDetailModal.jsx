import React, { useState } from 'react';
import { 
  X, 
  Check, 
  QrCode, 
  Camera, 
  ShieldCheck, 
  UserCheck, 
  MessageSquare, 
  Calendar, 
  MapPin, 
  Phone, 
  Mail, 
  Copy, 
  CheckCheck, 
  Clock, 
  AlertTriangle, 
  Truck, 
  Store,
  PackageCheck
} from 'lucide-react';
import { CountdownBadge } from '../booking/CountdownBadge.jsx';

const formatVND = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

export const OwnerBookingDetailModal = ({
  booking,
  onClose,
  onApprove,
  onReject,
  onHandover,
  onReturn,
  onChat,
}) => {
  const [copied, setCopied] = useState(false);

  if (!booking) return null;

  const handleCopyCode = (e) => {
    e.stopPropagation();
    if (booking.bookingCode) {
      navigator.clipboard.writeText(booking.bookingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Status configuration
  const getStatusConfig = (status) => {
    switch (status) {
      case 'pending':
        return {
          label: 'Chờ duyệt',
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
          dotClass: 'bg-amber-500',
          stepIndex: 1,
        };
      case 'approved':
        return {
          label: 'Đã duyệt',
          badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
          dotClass: 'bg-teal-500',
          stepIndex: 2,
        };
      case 'active':
        return {
          label: 'Đang thuê',
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dotClass: 'bg-emerald-500',
          stepIndex: 3,
        };
      case 'completed':
        return {
          label: 'Hoàn tất',
          badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
          dotClass: 'bg-slate-500',
          stepIndex: 4,
        };
      case 'rejected':
        return {
          label: 'Đã từ chối',
          badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
          dotClass: 'bg-rose-500',
          stepIndex: -1,
        };
      case 'cancelled':
        return {
          label: 'Đã hủy',
          badgeClass: 'bg-slate-100 text-slate-500 border-slate-200',
          dotClass: 'bg-slate-400',
          stepIndex: -1,
        };
      default:
        return {
          label: status,
          badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
          dotClass: 'bg-slate-500',
          stepIndex: 1,
        };
    }
  };

  const statusConfig = getStatusConfig(booking.status);

  // Steps for lifecycle pipeline
  const steps = [
    { title: 'Yêu cầu thuê', desc: 'Khách gửi đơn' },
    { title: 'Phê duyệt', desc: 'Chủ máy xác nhận' },
    { title: 'Bàn giao máy', desc: 'Quét mã QR' },
    { title: 'Đang sử dụng', desc: 'Trong kỳ thuê' },
    { title: 'Hoàn tất', desc: 'Nhận máy & Hoàn cọc' },
  ];

  const dailyRate = booking.dailyRate || (booking.totalRentalPrice && booking.totalDays ? Math.round(booking.totalRentalPrice / booking.totalDays) : 0);
  const totalDays = Number(booking.totalDays) || 1;
  const subtotal = dailyRate * totalDays;
  const discountAmount = booking.discountAmount || (subtotal > booking.totalRentalPrice ? subtotal - booking.totalRentalPrice : 0);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP BAR / HEADER */}
        <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 shrink-0">
              <PackageCheck size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Chi tiết đơn thuê
                </h2>
                <div 
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200/80 font-mono text-xs font-semibold text-slate-700 cursor-pointer transition select-all"
                  title="Nhấn để sao chép mã đơn"
                >
                  <span>#{booking.bookingCode}</span>
                  {copied ? (
                    <CheckCheck size={12} className="text-emerald-600" />
                  ) : (
                    <Copy size={12} className="text-slate-400" />
                  )}
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusConfig.badgeClass}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`} />
                  {statusConfig.label}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {booking.createdAt ? `Tạo lúc ${new Date(booking.createdAt).toLocaleString('vi-VN')}` : 'Mã hệ thống tự động đồng bộ'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-400 hover:text-slate-700 flex items-center justify-center transition"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* PROGRESS STEPPER (LIFECYCLE PIPELINE) */}
        {booking.status === 'rejected' ? (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-start gap-3">
            <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={18} />
            <div className="text-xs">
              <span className="font-bold text-rose-900">Đơn thuê đã bị từ chối</span>
              {booking.rejectReason && (
                <p className="text-rose-700 mt-0.5">
                  <span className="font-semibold">Lý do:</span> {booking.rejectReason}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="px-6 py-3.5 bg-slate-50/70 border-b border-slate-100 shrink-0">
            <div className="grid grid-cols-5 gap-2 text-center relative">
              {steps.map((st, idx) => {
                const isPassed = statusConfig.stepIndex > idx;
                const isCurrent = statusConfig.stepIndex === idx;
                return (
                  <div key={idx} className="flex flex-col items-center relative">
                    <div 
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all mb-1 ${
                        isPassed 
                          ? 'bg-teal-600 text-white shadow-2xs' 
                          : isCurrent 
                          ? 'bg-teal-50 text-teal-700 border-2 border-teal-600 ring-4 ring-teal-100 font-extrabold' 
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {isPassed ? <Check size={14} strokeWidth={3} /> : idx + 1}
                    </div>
                    <span className={`text-[11px] font-semibold leading-tight line-clamp-1 ${
                      isCurrent ? 'text-teal-900 font-bold' : isPassed ? 'text-slate-700' : 'text-slate-400'
                    }`}>
                      {st.title}
                    </span>
                    <span className="text-[10px] text-slate-400 hidden sm:block mt-0.5">
                      {st.desc}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* LEFT COLUMN: Equipment, Rental Period, Delivery */}
            <div className="lg:col-span-7 space-y-4">
              {/* 1. Equipment Details Card */}
              <div className="bg-slate-50/70 border border-slate-200/70 rounded-2xl p-4">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Thiết bị cho thuê
                </div>
                <div className="flex items-start gap-3.5">
                  <img
                    src={booking.deviceImage || booking.device?.images?.[0] || booking.device?.imageUrl || '/placeholder.png'}
                    alt={booking.deviceName}
                    className="w-20 h-20 rounded-xl object-cover border border-slate-200 bg-white shadow-xs shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight" title={booking.deviceName}>
                        {booking.deviceName}
                      </h3>
                    </div>
                    <span className="inline-block mt-1 text-[11px] font-medium text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded capitalize">
                      {booking.deviceCategory}
                    </span>

                    <div className="mt-3 flex items-center gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Đơn giá thuê</span>
                        <span className="font-bold text-teal-700">{formatVND(dailyRate)}/ngày</span>
                      </div>
                      <div className="border-l border-slate-200 pl-4">
                        <span className="text-slate-400 block text-[11px]">Tiền cọc thiết bị</span>
                        <span className="font-semibold text-slate-700">{formatVND(booking.depositAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Timeline & Handover Card */}
              <div className="bg-slate-50/70 border border-slate-200/70 rounded-2xl p-4">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span>Lịch trình &amp; Giao nhận</span>
                  <span className="text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full font-bold text-[11px]">
                    {totalDays} ngày thuê
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="p-3 bg-white rounded-xl border border-slate-100">
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mb-1">
                      <Calendar size={13} className="text-teal-600" />
                      <span>Ngày bắt đầu nhận</span>
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-slate-800">
                      {booking.startDate}
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-100">
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mb-1">
                      <Calendar size={13} className="text-teal-600" />
                      <span>Ngày hoàn trả</span>
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-slate-800">
                      {booking.endDate}
                    </div>
                  </div>
                </div>

                {booking.status === 'active' && (booking.rawEndDate || booking.endDate) && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between mb-3 text-xs">
                    <span className="font-medium text-emerald-800 flex items-center gap-1.5">
                      <Clock size={13} className="text-emerald-600" />
                      Hạn trả máy đang đếm ngược:
                    </span>
                    <CountdownBadge
                      startDate={booking.rawStartDate || booking.startDate}
                      targetDate={booking.rawEndDate || booking.endDate}
                      size="sm"
                    />
                  </div>
                )}

                {/* Delivery Method & Address */}
                <div className="p-3 bg-white rounded-xl border border-slate-100 text-xs space-y-2">
                  <div className="flex items-center gap-2">
                    {booking.deliveryMethod === 'pickup' ? (
                      <div className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                        <Store size={14} className="text-teal-600" />
                        <span>Nhận tại cửa hàng / Studio của bạn</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                        <Truck size={14} className="text-teal-600" />
                        <span>Giao hàng tận nơi</span>
                      </div>
                    )}
                  </div>

                  {booking.deliveryAddress && (
                    <div className="flex items-start gap-1.5 text-slate-600 text-xs pl-0.5">
                      <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{booking.deliveryAddress}</span>
                    </div>
                  )}

                  {booking.note && (
                    <div className="pt-2 mt-2 border-t border-slate-100 text-slate-600 text-xs">
                      <span className="font-semibold text-slate-700">Ghi chú từ khách:</span> "{booking.note}"
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Escrow Security Guarantee */}
              <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-100 flex items-start gap-3">
                <ShieldCheck className="text-teal-700 shrink-0 mt-0.5" size={18} />
                <div className="text-xs text-teal-900 leading-relaxed">
                  <span className="font-bold">Đảm bảo an toàn qua TechShare Escrow:</span> Toàn bộ tiền cọc và tiền thuê được hệ thống tạm giữ an toàn, bảo vệ thiết bị của Chủ máy cho tới khi đối soát hoàn tất.
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Renter Profile & Financial Breakdown */}
            <div className="lg:col-span-5 space-y-4">
              {/* 4. Renter Profile Card */}
              <div className="bg-slate-50/70 border border-slate-200/70 rounded-2xl p-4">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Khách thuê
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={booking.renter?.avatar || booking.renter?.avatarUrl || '/placeholder-avatar.png'}
                    alt={booking.renter?.name || 'Khách thuê'}
                    className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-xs shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-slate-900 truncate">
                        {booking.renter?.name || 'Khách thuê'}
                      </span>
                      {booking.renter?.isVerified && (
                        <UserCheck size={14} className="text-teal-600 shrink-0" title="eKYC Verified" />
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                      <ShieldCheck size={12} className="text-teal-700" />
                      <span>Điểm uy tín: <strong className="text-teal-700">{booking.renter?.trustScore ?? 100}/100</strong></span>
                    </div>
                  </div>
                </div>

                {/* Contact items */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200/70 text-xs text-slate-600">
                  {booking.renter?.phone && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100">
                      <div className="flex items-center gap-2">
                        <Phone size={13} className="text-slate-400" />
                        <span className="font-mono text-slate-800">{booking.renter.phone}</span>
                      </div>
                      <a
                        href={`tel:${booking.renter.phone}`}
                        className="text-[11px] font-semibold text-teal-700 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Gọi điện
                      </a>
                    </div>
                  )}

                  {booking.renter?.email && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-100 truncate">
                      <Mail size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{booking.renter.email}</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onChat(booking)}
                  className="w-full mt-3 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold transition shadow-2xs"
                >
                  <MessageSquare size={13} className="text-teal-600" />
                  <span>Nhắn tin với khách thuê</span>
                </button>
              </div>

              {/* 5. Financial Breakdown Card */}
              <div className="bg-slate-50/70 border border-slate-200/70 rounded-2xl p-4">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Bảng kê tài chính
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Tiền thuê ({totalDays} ngày x {formatVND(dailyRate)})</span>
                    <span className="font-semibold text-slate-800">{formatVND(subtotal)}</span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between items-center text-emerald-600">
                      <span>Chiết khấu thuê dài ngày</span>
                      <span className="font-semibold">-{formatVND(discountAmount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-slate-500">
                    <span>Phí sàn dịch vụ</span>
                    <span className="font-medium text-emerald-600">0 ₫ (Miễn phí)</span>
                  </div>

                  <div className="pt-2 mt-2 border-t border-slate-200/80 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-900 block text-xs">Doanh thu thực nhận</span>
                      <span className="text-[10px] text-slate-400">Chuyển vào ví khi hoàn tất</span>
                    </div>
                    <span className="text-base font-extrabold text-emerald-600">
                      {formatVND(booking.totalRentalPrice || subtotal)}
                    </span>
                  </div>

                  <div className="pt-2 mt-2 border-t border-dashed border-slate-200 flex justify-between items-center text-slate-600">
                    <div>
                      <span className="text-xs">Tiền đặt cọc thiết bị</span>
                      <span className="text-[10px] text-slate-400 block">Ký quỹ TechShare Escrow</span>
                    </div>
                    <span className="font-bold text-slate-800">
                      {formatVND(booking.depositAmount)}
                    </span>
                  </div>

                  <div className="mt-3 p-2.5 rounded-xl bg-white border border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Trạng thái thanh toán</span>
                    <span className="font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                      {booking.paymentStatus === 'escrow_hold' || booking.status !== 'pending'
                        ? 'Đã ký quỹ Escrow an toàn'
                        : 'Chờ thanh toán'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="px-6 py-4 border-t border-slate-200/80 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onChat(booking)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition shadow-xs"
          >
            <MessageSquare size={14} className="text-slate-500" />
            <span className="hidden sm:inline">Nhắn tin trao đổi</span>
            <span className="sm:hidden">Chat</span>
          </button>

          <div className="flex items-center gap-2">
            {booking.status === 'pending' && (
              <>
                <button
                  type="button"
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-600 border border-rose-200 hover:bg-rose-50 transition"
                  onClick={() => onReject(booking)}
                >
                  Từ chối đơn
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-teal-600 text-white hover:bg-teal-700 transition shadow-sm hover:shadow-md"
                  onClick={() => onApprove(booking._id)}
                >
                  <Check size={14} strokeWidth={2.5} />
                  <span>Phê duyệt đơn</span>
                </button>
              </>
            )}

            {booking.status === 'approved' && (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-teal-600 text-white hover:bg-teal-700 transition shadow-sm hover:shadow-md"
                onClick={() => onHandover(booking)}
              >
                <QrCode size={14} />
                <span>Quét mã QR Bàn giao</span>
              </button>
            )}

            {booking.status === 'active' && (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 transition shadow-xs"
                onClick={() => onReturn(booking)}
              >
                <Camera size={14} />
                <span>Kiểm tra &amp; Nhận lại máy</span>
              </button>
            )}

            <button
              type="button"
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-100 transition"
              onClick={onClose}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerBookingDetailModal;
