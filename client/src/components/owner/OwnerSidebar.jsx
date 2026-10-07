import React from 'react';
import { 
  LayoutDashboard, 
  Layers, 
  ClipboardCheck, 
  Calendar, 
  BarChart3, 
  Wallet, 
  Home, 
  LogOut, 
  BadgeCheck 
} from 'lucide-react';
import { STRINGS } from '../../constants/strings';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../routes/routes';

export const OwnerSidebar = ({ 
  currentPath = ROUTES.OWNER_DASHBOARD, 
  onNavigate, 
  pendingCount = 0,
  onLogout 
}) => {
  const t = STRINGS.owner.sidebar;

  const NAV_ITEMS = [
    {
      id: 'dashboard',
      label: t.overviewTab,
      path: ROUTES.OWNER_DASHBOARD,
      icon: LayoutDashboard,
    },
    {
      id: 'devices',
      label: t.devicesTab,
      path: ROUTES.OWNER_DEVICES,
      icon: Layers,
    },
    {
      id: 'bookings',
      label: t.bookingsTab,
      path: ROUTES.OWNER_BOOKINGS,
      icon: ClipboardCheck,
      badge: pendingCount > 0 ? pendingCount : null,
    },
    {
      id: 'calendar',
      label: t.calendarTab,
      path: ROUTES.OWNER_CALENDAR,
      icon: Calendar,
    },
    {
      id: 'analytics',
      label: t.analyticsTab,
      path: ROUTES.OWNER_ANALYTICS,
      icon: BarChart3,
    },
    {
      id: 'wallet',
      label: t.walletTab,
      path: ROUTES.OWNER_WALLET,
      icon: Wallet,
    },
  ];

  return (
    <aside className="owner-sidebar" aria-label="Owner Navigation">
      {/* 1. Header & Brand */}
      <div className="owner-sidebar-header">
        <div className="owner-logo-icon">
          TS
        </div>
        <div className="owner-brand-text">
          <h2>{t.brandTitle}</h2>
          <span>{t.brandSubtitle}</span>
        </div>
      </div>

      {/* 2. Navigation items */}
      <nav className="owner-nav-list">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path || 
            (item.path === ROUTES.OWNER_DASHBOARD && currentPath === ROUTES.OWNER);

          return (
            <button
              key={item.id}
              type="button"
              className={`owner-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onNavigate(item.path)}
            >
              <div className="owner-nav-item-left">
                <Icon size={18} color={isActive ? COLORS.primary.DEFAULT : COLORS.neutral[400]} />
                <span>{item.label}</span>
              </div>
              {item.badge !== null && item.badge !== undefined && (
                <span className="owner-badge-count">{item.badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* 3. Footer: Partner profile & portal actions */}
      <div className="owner-sidebar-footer">
        <div className="owner-user-card">
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
            alt="Owner Avatar"
            className="owner-user-avatar"
          />
          <div className="owner-user-meta">
            <div className="owner-user-name flex items-center gap-1">
              <span>{t.ownerName}</span>
              <BadgeCheck size={14} color={COLORS.primary.DEFAULT} />
            </div>
            <div className="owner-user-role">{t.ownerRole}</div>
          </div>
        </div>

        <div className="owner-footer-btns">
          <button
            type="button"
            className="owner-sub-btn"
            onClick={() => onNavigate(ROUTES.HOME)}
            title={t.switchClientBtn}
          >
            <Home size={14} />
            <span>{t.switchClientBtn}</span>
          </button>
          <button
            type="button"
            className="owner-sub-btn"
            onClick={onLogout}
            title={t.logoutBtn}
          >
            <LogOut size={14} />
            <span>{t.logoutBtn}</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default OwnerSidebar;

