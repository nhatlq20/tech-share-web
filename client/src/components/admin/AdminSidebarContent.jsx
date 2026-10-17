import React from 'react';
import {
  LayoutDashboard,
  Users,
  Cpu,
  ShieldCheck,
  ExternalLink,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { STRINGS } from '../../constants/strings';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../routes/routes';
import './AdminWorkspace.css';

const getNavItems = (t) => [
  {
    id: 'overview',
    label: t.overviewTab,
    icon: LayoutDashboard,
    path: ROUTES.ADMIN_DASHBOARD,
    aliases: [ROUTES.ADMIN],
  },
  {
    id: 'users',
    label: t.usersTab,
    icon: Users,
    path: ROUTES.ADMIN_USER_MANAGER,
    aliases: [ROUTES.ADMIN_USERS],
  },
  {
    id: 'devices',
    label: t.devicesTab,
    icon: Cpu,
    showBadge: true,
    path: ROUTES.ADMIN_DEVICE_MANAGER,
    aliases: [ROUTES.ADMIN_DEVICES],
  },
  {
    id: 'ekyc',
    label: t.ekycTab,
    icon: ShieldCheck,
    showBadge: true,
    path: ROUTES.ADMIN_EKYC_VERIFICATION,
    aliases: [ROUTES.ADMIN_EKYC],
  },
];

export const AdminSidebarContent = ({
  currentTab,
  currentPath = '',
  onSelectTab,
  pendingEkycCount = 0,
  pendingDevicesCount = 0,
  onLogout,
  onSwitchToClient,
  admin,
  user,
}) => {
  const t = STRINGS.admin.dashboard;
  const navItems = getNavItems(t);
  const currentAdmin = admin || user;

  return (
    <aside className="admin-sidebar bg-white border-r border-slate-200" aria-label={t.brandSubtitle}>
      {/* 1. Header Sidebar */}
      <div className="admin-sidebar-header">
        <a
          href={ROUTES.ADMIN_DASHBOARD}
          className="admin-logo-box"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab('overview', ROUTES.ADMIN_DASHBOARD);
          }}
        >
          <div className="admin-logo-icon">
            <Sparkles size={20} />
          </div>
          <div className="admin-logo-text">
            Tech<span>Share</span>{' '}
            <span style={{ fontSize: '11px', fontWeight: 600, color: COLORS.neutral[500] }}>
              ADMIN
            </span>
          </div>
        </a>

        {/* Profile Card synced from Database */}
        <div className="admin-profile-badge-wrap">
          <img
            src={currentAdmin?.avatar || currentAdmin?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"}
            alt={currentAdmin?.name || t.avatarAlt}
            className="admin-profile-avatar"
            style={{ objectFit: 'cover' }}
          />
          <div className="admin-profile-info">
            <div className="admin-profile-name" title={currentAdmin?.name || ''}>
              {currentAdmin?.name || 'Đang đồng bộ...'}
            </div>
            <div className="admin-profile-role">
              {currentAdmin?.role === 'admin' ? 'Quản trị viên hệ thống' : (currentAdmin?.role || t.adminRole)}
            </div>
            <div className="admin-profile-email" title={currentAdmin?.email || ''}>
              {currentAdmin?.email || ''}
            </div>
          </div>
        </div>
      </div>

      {/* A. Divider */}
      <div className="admin-sidebar-divider" role="separator" />

      {/* 2. Navigation Items */}
      <nav className="admin-nav-list" role="navigation">
        <div className="admin-nav-section-title">
          {t.sectionTitle}
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            currentTab === item.id ||
            (currentPath && (currentPath === item.path || item.aliases?.includes(currentPath)));

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id, item.path)}
              className={`admin-nav-item ${isActive ? 'active' : ''}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0, flex: 1 }}>
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
              {item.id === 'ekyc' && item.showBadge && pendingEkycCount > 0 && (
                <span className="admin-nav-badge" title={t.pendingBadgeTitle(pendingEkycCount)}>
                  {pendingEkycCount}
                </span>
              )}
              {item.id === 'devices' && item.showBadge && pendingDevicesCount > 0 && (
                <span
                  className="admin-nav-badge"
                  style={{ backgroundColor: '#F59E0B', color: '#FFFFFF' }}
                  title={`${pendingDevicesCount} thiết bị chờ duyệt`}
                >
                  {pendingDevicesCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* 3. Footer Sidebar */}
      <div className="admin-sidebar-footer">
        <button
          type="button"
          onClick={onSwitchToClient || (() => { window.location.href = '/'; })}
          className="admin-footer-btn client-switch"
        >
          <ExternalLink size={15} />
          <span>{t.switchToClient}</span>
        </button>

        <button
          type="button"
          onClick={onLogout || (() => { window.location.href = '/'; })}
          className="admin-footer-btn logout"
        >
          <LogOut size={15} />
          <span>{t.logout}</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebarContent;