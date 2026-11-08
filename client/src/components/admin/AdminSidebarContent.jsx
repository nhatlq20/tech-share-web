import React from 'react';
import {
  LayoutDashboard,
  Users,
  Cpu,
  ShieldCheck,
  Crown,
  ShoppingBag,
  Scale,
  Wallet,
  FileText,
  ExternalLink,
  LogOut,
  Sparkles,
  Star,
  KeyRound,
  Tag,
  BarChart3,
  Bell,
  Settings,
} from 'lucide-react';
import { STRINGS } from '../../constants/strings';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../routes/routes';
import './AdminWorkspace.css';

const getNavGroups = (t) => [
  {
    groupTitle: 'OVERVIEW',
    items: [
      {
        id: 'overview',
        label: 'Overview & KPIs',
        icon: LayoutDashboard,
        path: ROUTES.ADMIN_DASHBOARD,
        aliases: [ROUTES.ADMIN],
      },
      {
        id: 'analytics',
        label: 'Reports & Analytics',
        icon: BarChart3,
        path: ROUTES.ADMIN_ANALYTICS,
        aliases: ['/admin/analytics'],
      },
    ],
  },
  {
    groupTitle: 'PLATFORM MANAGEMENT',
    items: [
      {
        id: 'users',
        label: 'User Management',
        icon: Users,
        path: ROUTES.ADMIN_USER_MANAGER,
        aliases: [ROUTES.ADMIN_USERS],
      },
      {
        id: 'devices',
        label: 'Device Moderation',
        icon: Cpu,
        showBadge: 'devices',
        path: ROUTES.ADMIN_DEVICE_MANAGER,
        aliases: [ROUTES.ADMIN_DEVICES],
      },
      {
        id: 'bookings',
        label: 'Rental Management',
        icon: ShoppingBag,
        path: ROUTES.ADMIN_BOOKINGS,
        aliases: ['/admin/bookings'],
      },
      {
        id: 'reviews',
        label: 'Review Moderation',
        icon: Star,
        path: ROUTES.ADMIN_REVIEWS,
        aliases: ['/admin/reviews'],
      },
    ],
  },
  {
    groupTitle: 'TRUST & SECURITY',
    items: [
      {
        id: 'ekyc',
        label: 'eKYC Verification',
        icon: ShieldCheck,
        showBadge: 'ekyc',
        path: ROUTES.ADMIN_EKYC_VERIFICATION,
        aliases: [ROUTES.ADMIN_EKYC],
      },
      {
        id: 'owner-ekyc',
        label: t.ownerEkycTab || 'Owner Verification',
        icon: Crown,
        showBadge: 'owner-ekyc',
        path: ROUTES.ADMIN_OWNER_EKYC_VERIFICATION,
        aliases: [ROUTES.ADMIN_OWNER_EKYC],
      },
      {
        id: 'disputes',
        label: 'Dispute Resolution',
        icon: Scale,
        showBadge: 'disputes',
        path: ROUTES.ADMIN_DISPUTES,
        aliases: ['/admin/disputes'],
      },
      {
        id: 'roles',
        label: 'Role Management',
        icon: KeyRound,
        path: ROUTES.ADMIN_ROLES,
        aliases: ['/admin/roles'],
      },
    ],
  },
  {
    groupTitle: 'FINANCE',
    items: [
      {
        id: 'wallet',
        label: 'Wallet & Transactions',
        icon: Wallet,
        path: ROUTES.ADMIN_WALLET,
        aliases: ['/admin/wallet'],
      },
      {
        id: 'vouchers',
        label: 'Voucher Management',
        icon: Tag,
        path: ROUTES.ADMIN_VOUCHERS,
        aliases: ['/admin/vouchers'],
      },
    ],
  },
  {
    groupTitle: 'SYSTEM',
    items: [
      {
        id: 'notifications',
        label: 'Broadcast Notifications',
        icon: Bell,
        path: ROUTES.ADMIN_NOTIFICATIONS,
        aliases: ['/admin/notifications'],
      },
      {
        id: 'settings',
        label: 'System Settings',
        icon: Settings,
        path: ROUTES.ADMIN_SETTINGS,
        aliases: ['/admin/settings'],
      },
      {
        id: 'audit-logs',
        label: 'Audit Logs',
        icon: FileText,
        path: ROUTES.ADMIN_AUDIT_LOGS,
        aliases: ['/admin/audit-logs'],
      },
    ],
  },
];

export const AdminSidebarContent = ({
  currentTab,
  currentPath = '',
  onSelectTab,
  pendingEkycCount = 0,
  pendingOwnerEkycCount = 0,
  pendingDevicesCount = 0,
  pendingDisputesCount = 0,
  onLogout,
  onSwitchToClient,
  admin,
  user,
}) => {
  const t = STRINGS.admin.dashboard;
  const navGroups = getNavGroups(t);
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
              {currentAdmin?.name || 'Administrator'}
            </div>
            <div className="admin-profile-role">
              {currentAdmin?.role === 'admin' ? 'System Administrator' : (currentAdmin?.role || t.adminRole)}
            </div>
            <div className="admin-profile-email" title={currentAdmin?.email || ''}>
              {currentAdmin?.email || ''}
            </div>
          </div>
        </div>
      </div>

      {/* A. Divider */}
      <div className="admin-sidebar-divider" role="separator" />

      {/* 2. Navigation Items grouped according to System Architecture */}
      <nav className="admin-nav-list" role="navigation">
        {navGroups.map((group) => (
          <div key={group.groupTitle} style={{ marginBottom: '14px' }}>
            <div className="admin-nav-section-title" style={{ padding: '4px 16px', fontSize: '10px', color: '#94A3B8', fontWeight: 700, letterSpacing: '0.05em' }}>
              {group.groupTitle}
            </div>
            {group.items.map((item) => {
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
                    <Icon size={17} strokeWidth={isActive ? 2.5 : 2} style={{ flexShrink: 0 }} />
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
                  {item.showBadge === 'ekyc' && pendingEkycCount > 0 && (
                    <span className="admin-nav-badge" title={`${pendingEkycCount} pending verification requests`}>
                      {pendingEkycCount}
                    </span>
                  )}
                  {item.showBadge === 'owner-ekyc' && pendingOwnerEkycCount > 0 && (
                    <span className="admin-nav-badge" title={t.pendingBadgeTitle(pendingOwnerEkycCount)}>
                      {pendingOwnerEkycCount}
                    </span>
                  )}
                  {item.showBadge === 'devices' && pendingDevicesCount > 0 && (
                    <span
                      className="admin-nav-badge"
                      style={{ backgroundColor: '#F59E0B', color: '#FFFFFF' }}
                      title={`${pendingDevicesCount} devices pending moderation`}
                    >
                      {pendingDevicesCount}
                    </span>
                  )}
                  {item.showBadge === 'disputes' && pendingDisputesCount > 0 && (
                    <span
                      className="admin-nav-badge"
                      style={{ backgroundColor: '#EF4444', color: '#FFFFFF' }}
                      title={`${pendingDisputesCount} disputes requiring attention`}
                    >
                      {pendingDisputesCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
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
