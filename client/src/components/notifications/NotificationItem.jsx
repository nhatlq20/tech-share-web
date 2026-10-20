import React, { useMemo } from 'react';
import { CheckCircle2, XCircle, Bell, Clock, Package } from 'lucide-react';

/**
 * Format relative time in Vietnamese
 */
const formatTimeAgo = (dateString) => {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.max(1, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffInSeconds < 60) return 'Vừa xong';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} giờ trước`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays} ngày trước`;
  return date.toLocaleDateString('vi-VN', { month: 'numeric', day: 'numeric' });
};

/**
 * Parse & highlight device name and booking code inside notification body
 */
const renderBodyWithHighlights = (rawText) => {
  if (!rawText) return null;

  // Match "device name" OR (Mã đơn: XXX) / (Mã: XXX)
  const regex = /("([^"]+)")|(\((?:Mã đơn|Mã):\s*([^)]+)\))/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(rawText)) !== null) {
    if (match.index > lastIndex) {
      parts.push(rawText.substring(lastIndex, match.index));
    }
    if (match[1]) {
      // Device name
      parts.push(
        <span key={`dev-${match.index}`} className="font-medium text-slate-800">
          "{match[2]}"
        </span>
      );
    } else if (match[3]) {
      // Booking code badge
      const code = match[4];
      parts.push(
        <span
          key={`code-${match.index}`}
          className="inline-block text-[11px] font-mono font-medium text-slate-500 bg-slate-100 border border-slate-200/80 px-1.5 py-0.5 rounded mx-1 align-baseline"
        >
          {code}
        </span>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < rawText.length) {
    parts.push(rawText.substring(lastIndex));
  }

  return parts;
};

export const NotificationItem = ({ notification, onClick }) => {
  const { type, title, body, createdAt, isRead, data } = notification || {};

  // Xác định cấu hình hiển thị icon & màu sắc theo trạng thái
  const config = useMemo(() => {
    const lowerTitle = (title || '').toLowerCase();
    const lowerType = (type || '').toLowerCase();

    // 1. Đơn bị từ chối / Đã hủy
    if (
      lowerTitle.includes('từ chối') ||
      lowerTitle.includes('hủy') ||
      lowerType === 'booking_rejected' ||
      lowerType === 'booking_cancelled'
    ) {
      return {
        icon: <XCircle className="w-5 h-5 text-rose-600" />,
        bgIcon: 'bg-rose-50 border-rose-100 text-rose-600',
        badgeColor: 'text-rose-700 bg-rose-50 border-rose-200',
      };
    }

    // 2. Đơn được duyệt / Thành công
    if (
      lowerTitle.includes('duyệt') ||
      lowerTitle.includes('thành công') ||
      lowerType === 'booking_approved'
    ) {
      return {
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
        bgIcon: 'bg-emerald-50 border-emerald-100 text-emerald-600',
        badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      };
    }

    // 3. Đơn thuê mới / Đơn đặt hàng
    if (
      lowerTitle.includes('yêu cầu thuê') ||
      lowerTitle.includes('đơn thuê') ||
      lowerType === 'order' ||
      lowerType === 'booking'
    ) {
      return {
        icon: <Package className="w-5 h-5 text-teal-600" />,
        bgIcon: 'bg-teal-50 border-teal-100 text-teal-600',
        badgeColor: 'text-teal-700 bg-teal-50 border-teal-200',
      };
    }

    // 4. Nhắc nhở / Hạn trả
    if (
      lowerTitle.includes('nhắc nhở') ||
      lowerTitle.includes('hạn trả') ||
      lowerType === 'reminder'
    ) {
      return {
        icon: <Clock className="w-5 h-5 text-amber-600" />,
        bgIcon: 'bg-amber-50 border-amber-100 text-amber-600',
        badgeColor: 'text-amber-700 bg-amber-50 border-amber-200',
      };
    }

    // 5. Mặc định / Hệ thống
    return {
      icon: <Bell className="w-5 h-5 text-teal-600" />,
      bgIcon: 'bg-teal-50 border-teal-100 text-teal-600',
      badgeColor: 'text-teal-700 bg-teal-50 border-teal-200',
    };
  }, [title, type]);

  // Làm sạch tiêu đề: loại bỏ toàn bộ emoji thô
  const cleanTitle = useMemo(() => {
    return (title || '')
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}❌🎉📦🔔!]/gu, '')
      .trim();
  }, [title]);

  // Tách lý do từ chối (nếu có) và làm sạch phần body chính
  const { mainBodyText, reasonText } = useMemo(() => {
    let rawBody = body || '';
    let extractedReason =
      notification?.rejectReason ||
      data?.rejectReason ||
      notification?.statusReason ||
      '';

    // Tìm trong chuỗi body nếu có pattern "Lý do: ..." hoặc "Reason: ..."
    const reasonMatch = rawBody.match(/(?:Lý do|Reason):\s*(.+)$/i);
    if (reasonMatch) {
      if (!extractedReason) {
        extractedReason = reasonMatch[1].trim();
      }
      // Cắt bỏ phần "Lý do: ..." ra khỏi dòng 2 để tránh lặp nội dung
      rawBody = rawBody.substring(0, reasonMatch.index).trim();
      // Bỏ dấu chấm thừa nếu có ở cuối
      rawBody = rawBody.replace(/[.,;]\s*$/, '.');
    }

    return {
      mainBodyText: rawBody,
      reasonText: extractedReason,
    };
  }, [body, notification, data]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick && onClick();
        }
      }}
      className={`group relative flex items-start gap-3.5 p-3.5 sm:p-4 border-b border-slate-100 transition-colors cursor-pointer outline-none select-none ${
        !isRead ? 'bg-teal-50/25 hover:bg-teal-50/40' : 'bg-white hover:bg-slate-50/80'
      }`}
    >
      {/* Khung Icon trạng thái */}
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${config.bgIcon}`}
      >
        {config.icon}
      </div>

      {/* Nội dung thông báo */}
      <div className="flex-1 min-w-0 pr-3">
        {/* Dòng 1: Tiêu đề & Thời gian */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <h4
            className={`text-sm tracking-tight truncate ${
              !isRead ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'
            }`}
          >
            {cleanTitle}
          </h4>
          <span className="text-[11px] text-slate-400 shrink-0 font-normal">
            {formatTimeAgo(createdAt)}
          </span>
        </div>

        {/* Dòng 2: Tóm tắt hành động (Thiết bị, Mã đơn) */}
        <div className="text-xs text-slate-600 leading-relaxed line-clamp-2">
          {renderBodyWithHighlights(mainBodyText)}
        </div>

        {/* Dòng 3 (Nếu là đơn bị từ chối): Render mini callout hiển thị lý do */}
        {reasonText && (
          <div className="mt-1.5 text-xs text-rose-700 bg-rose-50/80 border-l-2 border-rose-400 px-2 py-1 rounded-r-md">
            <span className="font-medium">Lý do:</span> {reasonText}
          </div>
        )}
      </div>

      {/* Chấm tròn báo chưa đọc ở góc phải */}
      {!isRead && (
        <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0 mt-2 ring-4 ring-teal-500/10" />
      )}
    </div>
  );
};

export default NotificationItem;

