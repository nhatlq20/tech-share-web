import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Receipt, 
  MessageSquare, 
  Package, 
  PlusCircle, 
  Wallet, 
  Sparkles,
  ExternalLink, 
  LogOut, 
} from 'lucide-react';
import { STRINGS } from '../../constants/strings';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../routes/routes';
import './OwnerWorkspace.css';

export const OwnerSidebar = ({ 
  currentPath = ROUTES.OWNER_DASHBOARD, 
  onNavigate, 
  pendingCount = 0,
  unreadMessagesCount = 0,
  owner,
  onLogout 
}) => {
  const t = STRINGS.owner.sidebar;

  const NAV_ITEMS = [
    {
      id: 'dashboard',
      label: 'Dashboard & KPIs',
      path: ROUTES.OWNER_DASHBOARD,
      icon: BarChart3,
    },
    {
      id: 'analytics',
      label: 'Revenue & Analytics',
      path: ROUTES.OWNER_ANALYTICS,
      icon: TrendingUp,
    },
    {
      id: 'bookings',
      label: 'Pending Bookings',
      path: ROUTES.OWNER_BOOKINGS,
      icon: Receipt,
      badge: pendingCount > 0 ? (pendingCount > 99 ? '99+' : pendingCount) : null,
    },
    {
      id: 'messages',
      label: 'Customer Messages',
      path: ROUTES.OWNER_MESSAGES,
      icon: MessageSquare,
      badge: unreadMessagesCount > 0 ? (unreadMessagesCount > 99 ? '99+' : unreadMessagesCount) : null,
    },
    {
      id: 'devices',
      label: 'My Device Inventory',
      path: ROUTES.OWNER_DEVICES,
      icon: Package,
    },
    {
      id: 'new_device',
      label: 'List New Devices',
      path: ROUTES.OWNER_DEVICE_NEW,
      icon: PlusCircle,
    },
    {
      id: 'wallet',
      label: 'Revenue & Deposit Wallet',
      path: ROUTES.OWNER_WALLET,
      icon: Wallet,
    },
    {
      id: 'ai_assistant',
      label: 'AI Assistant',
      path: ROUTES.OWNER_AI_ASSISTANT,
      icon: Sparkles,
    },
  ];

  return (
    <aside className="owner-sidebar bg-white border-r border-slate-200" aria-label={t.brandSubtitle}>
      {/* 1. Header Sidebar */}
      <div className="owner-sidebar-header">
        <a
          href={ROUTES.OWNER_DASHBOARD}
          className="owner-logo-box"
          onClick={(e) => {
            e.preventDefault();
            onNavigate(ROUTES.OWNER_DASHBOARD);
          }}
        >
          <div className="owner-logo-icon">
            <Sparkles size={20} />
          </div>
          <div className="owner-logo-text">
            Tech<span>Share</span>{' '}
            <span style={{ fontSize: '11px', fontWeight: 600, color: COLORS.neutral[500] }}>
              OWNER
            </span>
          </div>
        </a>

        {/* Profile Card */}
        <div className="owner-profile-badge-wrap">
          <img
            src={owner?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"}
            alt={t.avatarAlt}
            className="owner-profile-avatar"
            style={{ objectFit: 'cover' }}
          />
          <div className="owner-profile-info">
            <div className="owner-profile-name" title={owner?.name || t.ownerName}>{owner?.name || t.ownerName}</div>
            <div className="owner-profile-role">{t.ownerRole}</div>
            <div className="owner-profile-email" title={owner?.email || t.ownerEmail}>{owner?.email || t.ownerEmail}</div>
          </div>
        </div>
      </div>

      {/* A. Divider */}
      <div className="owner-sidebar-divider" role="separator" />

      {/* 2. Navigation Items */}
      <nav className="owner-nav-list" role="navigation">
        <div className="owner-nav-section-title">
          OWNER MENU
        </div>

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            currentPath === item.path ||
            (item.path === ROUTES.OWNER_DASHBOARD && currentPath === ROUTES.OWNER) ||
            (item.path === ROUTES.OWNER_MESSAGES && currentPath.startsWith(ROUTES.OWNER_MESSAGES));

          return (
            <button
              key={item.id}
              type="button"
              className={`owner-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onNavigate(item.path)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0 }}>
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} style={{ flexShrink: 0 }} />
                <span
                  style={{
                    fontSize: '12.5px',
                    fontWeight: isActive ? 700 : 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.label}
                </span>
              </div>
              {item.badge !== null && item.badge !== undefined && (
                <span
                  className="owner-badge-count"
                  title={`${item.badge} mục cần xử lý`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* 3. Footer Sidebar */}
      <div className="owner-sidebar-footer">
        <button
          type="button"
          onClick={() => onNavigate(ROUTES.HOME)}
          className="owner-footer-btn client-switch"
        >
          <ExternalLink size={15} />
          <span>{t.switchClientBtn}</span>
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="owner-footer-btn logout"
        >
          <LogOut size={15} />
          <span>{t.logoutBtn}</span>
        </button>
      </div>
    </aside>
  );
};

export default OwnerSidebar;

