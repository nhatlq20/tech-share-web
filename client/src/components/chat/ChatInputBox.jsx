import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Image as ImageIcon, MapPin, X, Loader2 } from 'lucide-react';
import { sendTyping, sendStopTyping } from '../../services/socketService.js';

export const ChatInputBox = ({
  bookingId,
  onSendMessage,
  disabled = false,
  placeholder = 'Nhập tin nhắn... (Nhấn Enter để gửi, Shift+Enter xuống dòng)',
}) => {
  const [content, setContent] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [content]);

  // Xử lý gửi tin nhắn
  const handleSend = useCallback(() => {
    if (disabled) return;
    const trimmed = content.trim();

    if (!trimmed && !imagePreview) return;

    if (imagePreview) {
      onSendMessage({
        type: 'image',
        content: trimmed,
        mediaUrl: imagePreview,
      });
      setImagePreview(null);
    } else {
      onSendMessage({
        type: 'text',
        content: trimmed,
      });
    }

    setContent('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Dừng typing
    if (bookingId) {
      sendStopTyping(bookingId);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
  }, [content, imagePreview, disabled, bookingId, onSendMessage]);

  // Bắt phím Enter / Shift+Enter
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Phát tín hiệu typing
  const handleChange = (e) => {
    setContent(e.target.value);

    if (bookingId) {
      sendTyping(bookingId);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        sendStopTyping(bookingId);
      }, 2000);
    }
  };

  // Xử lý chọn file ảnh
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file hình ảnh hợp lệ (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setImagePreview(uploadEvent.target?.result);
    };
    reader.readAsDataURL(file);

    e.target.value = ''; // Reset input file
  };

  // Xử lý dán ảnh từ Clipboard (Ctrl + V)
  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (uploadEvent) => {
            setImagePreview(uploadEvent.target?.result);
          };
          reader.readAsDataURL(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  // Kéo thả ảnh (Drag & Drop)
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer?.files;
    if (files && files[0] && files[0].type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setImagePreview(uploadEvent.target?.result);
      };
      reader.readAsDataURL(files[0]);
    }
  };

  // Chia sẻ vị trí hiện tại
  const handleShareLocation = () => {
    if (!('geolocation' in navigator)) {
      alert('Trình duyệt của bạn không hỗ trợ định vị vị trí.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude } = position.coords;
        onSendMessage({
          type: 'location',
          content: '📍 Tôi đang ở đây',
          location: {
            latitude,
            longitude,
            address: `Vĩ độ: ${latitude.toFixed(5)}, Kinh độ: ${longitude.toFixed(5)}`,
          },
        });
      },
      (error) => {
        setIsLocating(false);
        console.warn('⚠️ Lỗi định vị:', error);
        alert('Không thể lấy vị trí hiện tại. Vui lòng cấp quyền truy cập vị trí trên trình duyệt.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div
      className={`relative w-full bg-white border-t border-slate-200 p-3 flex flex-col gap-2 transition-all ${
        isDragging ? 'bg-teal-50/60 ring-2 ring-teal-400' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Xem trước ảnh đính kèm */}
      {imagePreview && (
        <div className="relative inline-flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-xl w-max max-w-xs animate-in fade-in zoom-in-95 duration-150">
          <img
            src={imagePreview}
            alt="Preview upload"
            className="w-16 h-16 object-cover rounded-lg border border-slate-200"
          />
          <div className="flex flex-col pr-6">
            <span className="text-xs font-semibold text-slate-800">Ảnh đính kèm</span>
            <span className="text-[11px] text-slate-500">Sẵn sàng để gửi</span>
          </div>
          <button
            type="button"
            onClick={() => setImagePreview(null)}
            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-200 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center text-slate-600 transition-colors"
            title="Gỡ ảnh"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        {/* Nút hành động bổ trợ (Ảnh + Vị trí) */}
        <div className="flex items-center gap-1 pb-1">
          {/* Chọn ảnh */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-600 hover:text-teal-600 transition cursor-pointer"
            title="Gửi ảnh thiết bị"
          >
            <ImageIcon size={19} />
          </button>

          {/* Chia sẻ vị trí */}
          <button
            type="button"
            disabled={disabled || isLocating}
            onClick={handleShareLocation}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-600 hover:text-teal-600 transition cursor-pointer"
            title="Chia sẻ vị trí hẹn gặp"
          >
            {isLocating ? (
              <Loader2 size={19} className="animate-spin text-teal-600" />
            ) : (
              <MapPin size={19} />
            )}
          </button>
        </div>

        {/* Textarea nhập nội dung */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={disabled}
            placeholder={placeholder}
            rows={1}
            className="w-full resize-none overflow-y-auto rounded-xl bg-slate-50 focus:bg-white border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 py-2.5 px-3.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none transition-all leading-relaxed max-h-32"
          />
        </div>

        {/* Nút Gửi */}
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || (!content.trim() && !imagePreview)}
          className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-1.5 font-medium transition-all disabled:opacity-40 shadow-sm cursor-pointer shrink-0 active:scale-95 mb-0.5"
          title="Gửi tin nhắn (Enter)"
        >
          <span className="hidden sm:inline text-xs font-semibold">Gửi</span>
          <Send size={15} />
        </button>
      </div>
    </div>
  );
};

export default ChatInputBox;

