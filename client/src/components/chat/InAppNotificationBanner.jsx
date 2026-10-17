import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, X } from 'lucide-react';
import { getSocket } from '../../services/socketService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROUTES } from '../../routes/routes.js';

/**
 * Âm thanh thông báo nhẹ (Web Audio API Synthesizer)
 * Không cần file audio mp3 ngoài, tạo âm ping êm tai tức thì
 */
const playNotificationChime = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Bỏ qua nếu browser chặn autoplay audio
  }
};

export const InAppNotificationBanner = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeBanner, setActiveBanner] = useState(null);
  const dismissTimerRef = useRef(null);

  // Xin quyền Desktop Web Notification nếu chưa có
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => { });
      }
    }
  }, []);

  // Đóng banner
  const handleDismiss = useCallback(() => {
    setActiveBanner(null);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
  }, []);

  // Xử lý khi click vào banner
  const handleClickBanner = useCallback(() => {
    if (activeBanner?.bookingId) {
      const isOwnerContext = location.pathname.startsWith('/owner');
      const targetPath = isOwnerContext
        ? ROUTES.OWNER_MESSAGES_PATH(activeBanner.bookingId)
        : ROUTES.MESSAGES_PATH(activeBanner.bookingId);
      navigate(targetPath);
      handleDismiss();
    }
  }, [activeBanner, navigate, handleDismiss, location.pathname]);

  // Lắng nghe sự kiện socket new_notification
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const socket = getSocket();
    if (!socket) return;

    const handleNewNotification = (data) => {
      if (!data || data.type !== 'chat') return;

      const currentPath = location.pathname;
      const isViewingThisChat = currentPath.includes(`/messages/${data.bookingId}`);

      // Nếu đang xem chính phòng chat này thì không cần hiện thông báo nổi
      if (isViewingThisChat) return;

      // 1. Nếu tab bị ẩn (document.hidden) -> Kích hoạt HTML5 Web Notification API
      if (document.hidden && typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          try {
            const notif = new Notification(
              `New message from ${data.sender?.name || 'TechShare'}`,
              {
                body: data.content || 'You have received a new message.',
                icon: data.sender?.avatar || '/assets/logo.svg',
                tag: `chat-${data.bookingId}`,
              }
            );

            notif.onclick = () => {
              window.focus();
              const isOwner = window.location.pathname.startsWith('/owner');
              const target = isOwner
                ? ROUTES.OWNER_MESSAGES_PATH(data.bookingId)
                : ROUTES.MESSAGES_PATH(data.bookingId);
              navigate(target);
              notif.close();
            };
          } catch (e) {
            console.warn('HTML5 Notification trigger error:', e);
          }
        }
      }

      // 2. Phát âm thanh nhẹ
      playNotificationChime();

      // 3. Hiển thị In-App Toast Banner nổi
      setActiveBanner({
        bookingId: data.bookingId,
        sender: data.sender,
        content: data.content,
        createdAt: data.createdAt || new Date().toISOString(),
      });

      // Tự động đóng sau 6 giây
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(() => {
        setActiveBanner(null);
      }, 6000);
    };

    socket.on('new_notification', handleNewNotification);

    return () => {
      socket.off('new_notification', handleNewNotification);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [isAuthenticated, user, location.pathname, navigate]);

  if (!activeBanner) return null;

  return (
    <div
      role="alert"
      className="fixed top-20 right-4 sm:right-6 z-50 max-w-sm w-full bg-white/95 backdrop-blur-xl border border-teal-200/90 rounded-2xl shadow-2xl p-4 flex items-start gap-3.5 transition-all duration-300 animate-in slide-in-from-top-4 fade-in cursor-pointer select-none hover:shadow-2xl hover:border-teal-400 group ring-1 ring-black/5"
      onClick={handleClickBanner}
    >
      {/* Sender Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 p-[2px] shadow-sm">
          <div className="w-full h-full rounded-full bg-slate-100 overflow-hidden flex items-center justify-center font-bold text-slate-700 text-xs">
            {activeBanner.sender?.avatar ? (
              <img
                src={activeBanner.sender.avatar}
                alt={activeBanner.sender.name || 'User'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <span>{(activeBanner.sender?.name || 'U').charAt(0).toUpperCase()}</span>
            )}
          </div>
        </div>
        <span className="absolute -bottom-0.5 -right-0.5 bg-teal-600 rounded-full p-1 text-white shadow-xs ring-2 ring-white">
          <MessageSquare size={10} />
        </span>
      </div>

      {/* Notification Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1.5 mb-1">
          <span className="text-xs font-bold text-slate-900 truncate">
            {activeBanner.sender?.name || 'TechShare Partner'}
          </span>
          <span className="text-[10px] text-teal-700 font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-teal-50 border border-teal-100">
            Chat
          </span>
        </div>
        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-normal">
          {activeBanner.content}
        </p>
        <p className="text-[11px] text-teal-600 font-semibold mt-1.5 group-hover:text-teal-700 group-hover:underline flex items-center gap-1">
          Click to open conversation &rarr;
        </p>
      </div>

      {/* Dismiss Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleDismiss();
        }}
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
        title="Dismiss"
        aria-label="Dismiss notification"
      >
        <X size={15} />
      </button>
    </div>
  );
};

export default InAppNotificationBanner;

