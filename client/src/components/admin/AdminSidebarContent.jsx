import React from 'react';
import { LayoutDashboard, Users, Cpu, ShieldCheck, ExternalLink, LogOut, Sparkles, Database } from 'lucide-react';
import './AdminWorkspace.css';
const NAV_ITEMS = [{
  id: 'overview',
  label: 'Bảng điều khiển & KPI',
  icon: LayoutDashboard
}, {
  id: 'users',
  label: 'Quản lý Người dùng',
  icon: Users
}, {
  id: 'devices',
  label: 'Kiểm duyệt Thiết bị',
  icon: Cpu
}, {
  id: 'ekyc',
  label: 'Xét duyệt eKYC',
  icon: ShieldCheck,
  showBadge: true
}];
export const AdminSidebarContent = ({
  currentTab,
  onSelectTab,
  pendingEkycCount = 0,
  onLogout,
  onSwitchToClient
}) => {
  return <aside className="admin-sidebar" aria-label="Admin Navigation Sidebar">
      {/* 1. Header Sidebar */}
      <div className="admin-sidebar-header">
        <a href="/admin" className="admin-logo-box" onClick={e => {
        e.preventDefault();
        onSelectTab('overview');
      }}>
          <div className="admin-logo-icon">
            <Sparkles size={20} />
          </div>
          <div className="admin-logo-text">
            Tech<span>Share</span> <span style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#64748B'
          }}>ADMIN</span>
          </div>
        </a>

        {/* Profile Card */}
        <div className="admin-profile-badge-wrap">
          <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop" alt="Trần Nhật - Lead Admin" className="admin-profile-avatar" />
          <div className="admin-profile-info">
            <div className="admin-profile-name">Trần Nhật</div>
            <div className="admin-profile-role">System Administrator</div>
          </div>
        </div>

        {/* Real-time Atlas Status */}
        <div className="admin-atlas-status" title="Kết nối trực tiếp MongoDB Atlas Cluster">
          <span className="admin-pulse-dot" />
          <Database size={13} style={{
          color: '#16A34A',
          marginLeft: '2px'
        }} />
          <span>MongoDB Atlas: Trực tuyến</span>
        </div>
      </div>

      {/* 2. Navigation Items */}
      <nav className="admin-nav-list" role="navigation">
        <div style={{
        fontSize: '11px',
        fontWeight: 700,
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        padding: '0 8px 6px'
      }}>
          Menu Quản trị
        </div>

        {NAV_ITEMS.map(item => {
        const Icon = item.icon;
        const isActive = currentTab === item.id;
        return <button key={item.id} type="button" onClick={() => onSelectTab(item.id)} className={`admin-nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={19} strokeWidth={isActive ? 2.5 : 2} />
              <span style={{
            fontSize: '13.5px',
            fontWeight: isActive ? 700 : 600
          }}>{item.label}</span>
              {item.showBadge && pendingEkycCount > 0 && <span className="admin-nav-badge" title={`${pendingEkycCount} hồ sơ chờ duyệt`}>
                  {pendingEkycCount}
                </span>}
            </button>;
      })}
      </nav>

      {/* 3. Footer Sidebar */}
      <div className="admin-sidebar-footer">
        <button type="button" onClick={onSwitchToClient || (() => {
        window.location.href = '/';
      })} className="admin-footer-btn client-switch">
          <ExternalLink size={15} />
          <span>Về Sàn giao dịch</span>
        </button>

        <button type="button" onClick={onLogout || (() => {
        window.location.href = '/login';
      })} className="admin-footer-btn logout">
          <LogOut size={15} />
          <span>Đăng xuất Quản trị</span>
        </button>

        <div style={{
        textAlign: 'center',
        fontSize: '11px',
        color: '#94A3B8',
        paddingTop: '4px'
      }}>
          TechShare Hub • MMA301 v2.4
        </div>
      </div>
    </aside>;
};
export default AdminSidebarContent;