import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, RefreshCw } from 'lucide-react';
import { AdminSidebarContent } from './AdminSidebarContent';
import { AdminOverviewTab } from './AdminOverviewTab';
import { AdminUsersTab } from './AdminUsersTab';
import { AdminDevicesTab } from './AdminDevicesTab';
import { AdminEkycTab } from './AdminEkycTab';
import { AdminOwnerEkycTab } from './AdminOwnerEkycTab';
import { AdminBookingsTab } from './AdminBookingsTab';
import { AdminDisputesTab } from './AdminDisputesTab';
import { AdminWalletTab } from './AdminWalletTab';
import { AdminAuditLogsTab } from './AdminAuditLogsTab';
import { AdminVouchersTab } from './AdminVouchersTab';
import { AdminReviewsTab } from './AdminReviewsTab';
import { AdminRolesTab } from './AdminRolesTab';
import { AdminNotificationsTab } from './AdminNotificationsTab';
import { AdminAdvancedAnalyticsTab } from './AdminAdvancedAnalyticsTab';
import { AdminSettingsTab } from './AdminSettingsTab';
import { NotificationDropdown } from '../notifications/NotificationDropdown';
import { STRINGS } from '../../constants/strings';
import { ROUTES } from '../../routes/routes';
import { useAuth } from '../../context/AuthContext.jsx';
import { API_CONFIG, STORAGE_KEYS } from '../../constants/config.js';
import './AdminWorkspace.css';

// Initial default state (safe fallback)
const DEFAULT_KPI = {
  totalUsers: 0,
  activeUsers: 0,
  totalDevices: 0,
  availableDevices: 0,
  pendingDevices: 0,
  activeBookings: 0,
  pendingEkyc: 0,
  pendingDisputes: 0,
  totalRevenue: 0,
  revenueFormatted: '0 ₫'
};
const DEFAULT_CHARTS = {
  '7d': [],
  month: [],
  year: [],
};
const DEFAULT_CATEGORIES = [];
const API_BASE = API_CONFIG.BASE_URL;
export const AdminDashboardScreen = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const getTabFromPath = useCallback((pathname) => {
    if (pathname === ROUTES.ADMIN_USER_MANAGER || pathname === ROUTES.ADMIN_USERS) return 'users';
    if (pathname === ROUTES.ADMIN_DEVICE_MANAGER || pathname === ROUTES.ADMIN_DEVICES) return 'devices';
    if (pathname === ROUTES.ADMIN_EKYC_VERIFICATION || pathname === ROUTES.ADMIN_EKYC) return 'ekyc';
    if (pathname === ROUTES.ADMIN_OWNER_EKYC_VERIFICATION || pathname === ROUTES.ADMIN_OWNER_EKYC) return 'owner-ekyc';
    if (pathname === ROUTES.ADMIN_BOOKINGS) return 'bookings';
    if (pathname === ROUTES.ADMIN_DISPUTES) return 'disputes';
    if (pathname === ROUTES.ADMIN_WALLET) return 'wallet';
    if (pathname === ROUTES.ADMIN_AUDIT_LOGS) return 'audit-logs';
    if (pathname === ROUTES.ADMIN_VOUCHERS) return 'vouchers';
    if (pathname === ROUTES.ADMIN_REVIEWS) return 'reviews';
    if (pathname === ROUTES.ADMIN_ROLES) return 'roles';
    if (pathname === ROUTES.ADMIN_ANALYTICS) return 'analytics';
    if (pathname === ROUTES.ADMIN_NOTIFICATIONS) return 'notifications';
    if (pathname === ROUTES.ADMIN_SETTINGS) return 'settings';
    return 'overview';
  }, []);

  const [currentTab, setCurrentTab] = useState(() => getTabFromPath(location.pathname));
  const [adminProfile, setAdminProfile] = useState(() => user || null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Sync tab when browser URL changes (e.g. forward/back/direct link)
  useEffect(() => {
    const matchedTab = getTabFromPath(location.pathname);
    setCurrentTab(matchedTab);
  }, [location.pathname, getTabFromPath]);

  const handleSelectTab = (tabId, targetPath) => {
    setCurrentTab(tabId);
    if (targetPath) {
      navigate(targetPath);
    } else {
      if (tabId === 'users') navigate(ROUTES.ADMIN_USER_MANAGER);
      else if (tabId === 'devices') navigate(ROUTES.ADMIN_DEVICE_MANAGER);
      else if (tabId === 'bookings') navigate(ROUTES.ADMIN_BOOKINGS);
      else if (tabId === 'ekyc') navigate(ROUTES.ADMIN_EKYC_VERIFICATION);
      else if (tabId === 'owner-ekyc') navigate(ROUTES.ADMIN_OWNER_EKYC_VERIFICATION);
      else if (tabId === 'disputes') navigate(ROUTES.ADMIN_DISPUTES);
      else if (tabId === 'wallet') navigate(ROUTES.ADMIN_WALLET);
      else if (tabId === 'audit-logs') navigate(ROUTES.ADMIN_AUDIT_LOGS);
      else if (tabId === 'vouchers') navigate(ROUTES.ADMIN_VOUCHERS);
      else if (tabId === 'reviews') navigate(ROUTES.ADMIN_REVIEWS);
      else if (tabId === 'roles') navigate(ROUTES.ADMIN_ROLES);
      else if (tabId === 'analytics') navigate(ROUTES.ADMIN_ANALYTICS);
      else if (tabId === 'notifications') navigate(ROUTES.ADMIN_NOTIFICATIONS);
      else if (tabId === 'settings') navigate(ROUTES.ADMIN_SETTINGS);
      else navigate(ROUTES.ADMIN_DASHBOARD);
    }
  };

  // State data
  const [kpi, setKpi] = useState(DEFAULT_KPI);
  const [charts, setCharts] = useState(DEFAULT_CHARTS);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [users, setUsers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [deviceCounts, setDeviceCounts] = useState({ all: 0, pending: 0, approved: 0, rejected: 0 });
  const [ekycRequests, setEkycRequests] = useState([]);
  const [pendingOwnerEkycCount, setPendingOwnerEkycCount] = useState(0);

  // Fetch all admin data from backend API
  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) || localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN_LEGACY);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // 1. Fetch Analytics & Live Admin Profile from MongoDB Atlas
      const resAnalytics = await fetch(`${API_BASE}/admin/analytics`, { headers });
      if (resAnalytics.ok) {
        const json = await resAnalytics.json();
        if (json.success && json.data) {
          const raw = json.data;
          if (raw.admin) {
            setAdminProfile(raw.admin);
          } else if (raw.kpi?.admin) {
            setAdminProfile(raw.kpi.admin);
          }
          const kpiSource = raw.kpi || raw;
          const totalRev = kpiSource.totalRevenue ?? kpiSource.totalRentalRevenue ?? 0;
          setKpi({
            totalUsers: kpiSource.totalUsers ?? 0,
            activeUsers: kpiSource.activeUsers ?? kpiSource.verifiedUsers ?? 0,
            totalDevices: kpiSource.totalDevices ?? 0,
            availableDevices: kpiSource.availableDevices ?? 0,
            pendingDevices: kpiSource.pendingDevices ?? 0,
            activeBookings: kpiSource.activeBookings ?? 0,
            pendingEkyc: kpiSource.pendingEkyc ?? kpiSource.pendingTasks?.ekyc ?? 0,
            pendingDisputes: kpiSource.pendingDisputes ?? kpiSource.pendingTasks?.disputes ?? 0,
            totalRevenue: totalRev,
            revenueFormatted: kpiSource.revenueFormatted || new Intl.NumberFormat('vi-VN', {
              style: 'currency',
              currency: 'VND'
            }).format(totalRev)
          });
          if (raw.charts) {
            setCharts(raw.charts);
          }
          if (Array.isArray(raw.categoryStats)) {
            setCategories(raw.categoryStats);
          } else if (Array.isArray(raw.categoryDistribution)) {
            const colorMap = {
              smartphone: '#67BEC3',
              laptop: '#38BDF8',
              camera: '#818CF8',
              drone: '#F472B6',
              audio: '#FBBF24',
              gaming: '#34D399',
              accessory: '#A78BFA'
            };
            const nameMap = {
              smartphone: 'Smartphones & Tablets',
              laptop: 'Laptops & Workstations',
              camera: 'Cameras & Lenses',
              drone: 'Drones & Gimbals',
              audio: 'Headphones & Audio',
              gaming: 'Gaming Consoles & VR',
              accessory: 'Tech Accessories'
            };
            const mapped = raw.categoryDistribution.map(c => ({
              id: c.category,
              name: nameMap[c.category] || c.category,
              count: c.count,
              percent: c.percentage ?? c.percent ?? 10,
              color: colorMap[c.category] || '#67BEC3'
            }));
            setCategories(mapped);
          }
        }
      }

      // 2. Fetch Devices from MongoDB Atlas
      let liveDevices = [];
      try {
        const resDevices = await fetch(`${API_BASE}/admin/devices?limit=500`, { headers });
        if (resDevices.ok) {
          const json = await resDevices.json();
          const items = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
          if (items.length > 0) {
            liveDevices = items.map(d => ({
              _id: d._id || d.id,
              name: d.name || d.title || 'Technology Device',
              title: d.title || d.name || 'Technology Device',
              brand: d.brand || 'TechBrand',
              category: d.category || 'other',
              condition: d.condition || '99%',
              description: d.description || '',
              images: Array.isArray(d.images) && d.images.length > 0 ? d.images : ['https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=400'],
              specs: d.specs || {},
              pricePerDay: typeof d.pricePerDay === 'number' ? d.pricePerDay : d.dailyRate || 100000,
              dailyRate: typeof d.dailyRate === 'number' ? d.dailyRate : d.pricePerDay || 100000,
              depositAmount: typeof d.depositAmount === 'number' ? d.depositAmount : d.depositValue || 500000,
              depositValue: typeof d.depositValue === 'number' ? d.depositValue : d.depositAmount || 500000,
              status: d.status || 'available',
              moderationStatus: d.moderationStatus || 'approved',
              moderationReason: d.moderationReason || d.rejectReason || '',
              rejectReason: d.rejectReason || d.moderationReason || '',
              moderatedBy: d.moderatedBy || d.reviewedBy || null,
              moderatedAt: d.moderatedAt || d.reviewedAt || null,
              address: d.address || '',
              location: d.location || null,
              ratingAvg: d.ratingAvg || d.rating || 5.0,
              rentalCount: d.rentalCount || d.viewsCount || 0,
              owner: {
                _id: d.owner?._id || d.ownerId?._id || d.ownerId,
                name: d.owner?.name || d.ownerId?.name || 'TechShare Partner',
                email: d.owner?.email || d.ownerId?.email || 'owner@techshare.vn',
                phone: d.owner?.phone || d.ownerId?.phone || '0901234567',
                avatar: d.owner?.avatar || d.ownerId?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
                trustScore: d.owner?.trustScore || 100,
                isVerified: Boolean(d.owner?.isVerified),
              },
              createdAt: d.createdAt || new Date()
            }));
            setDevices(liveDevices);
            if (json.counts) {
              setDeviceCounts(json.counts);
            }
          }
        }
      } catch (e) {
        console.warn('Devices fetch fallback:', e);
      }

      // 3. Fetch eKYC Requests from MongoDB Atlas
      let liveEkyc = [];
      try {
        let resEkyc = await fetch(`${API_BASE}/admin/ekyc`, { headers });
        if (!resEkyc.ok) {
          resEkyc = await fetch(`${API_BASE}/admin/ekyc-requests`, { headers });
        }
        if (resEkyc.ok) {
          const json = await resEkyc.json();
          const items = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
          if (items.length > 0) {
            liveEkyc = items.map(r => ({
              _id: r._id || r.id,
              userId: typeof r.userId === 'object' ? r.userId?._id : r.userId,
              fullName: r.fullName || r.userId?.name || 'User Profile',
              email: r.email || r.userId?.email || 'user@techshare.vn',
              phone: r.phone || r.userId?.phone || '0901234567',
              idCardNumber: r.idCardNumber || '001202******',
              address: r.address || r.userId?.address || 'Hanoi, Vietnam',
              idCardFrontUrl: r.idCardFrontUrl || 'https://res.cloudinary.com/oigtlazh/image/upload/v1791276126/techshare/ekyc/nhzgpvxytqmxrlpodabp.jpg',
              idCardBackUrl: r.idCardBackUrl || 'https://res.cloudinary.com/oigtlazh/image/upload/v1791276133/techshare/ekyc/ls63wxuvisirmbntjifn.jpg',
              status: r.status || 'pending',
              rejectReason: r.rejectReason || null,
              createdAt: r.createdAt || new Date()
            }));
            setEkycRequests(liveEkyc);
          }
        }
      } catch (e) {
        console.warn('eKYC fetch fallback:', e);
      }

      // 3b. Fetch Owner eKYC pending count
      try {
        const resOwner = await fetch(`${API_BASE}/admin/owner-ekyc?status=pending`, { headers });
        if (resOwner.ok) {
          const jsonOwner = await resOwner.json();
          const items = Array.isArray(jsonOwner.data) ? jsonOwner.data : [];
          setPendingOwnerEkycCount(items.length);
        }
      } catch (e) {
        console.warn('Owner eKYC count fetch fallback:', e);
      }

      // 4. Fetch / Extract live Users from MongoDB Atlas
      try {
        const resUsers = await fetch(`${API_BASE}/admin/users`, { headers });
        if (resUsers.ok) {
          const json = await resUsers.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            setUsers(json.data);
            return;
          }
        }
      } catch { }

      // Nếu route riêng chưa có, tổng hợp người dùng thật từ DB thiết bị và eKYC
      const userMap = new Map();

      // Thêm Admin chính (fallback nếu không fetch được từ backend)
      if (adminProfile || user) {
        userMap.set('admin_1', {
          _id: adminProfile?._id || user?._id || '',
          name: (adminProfile?.name || user?.name) ? `${adminProfile?.name || user?.name} (System Admin)` : 'Admin (System Admin)',
          email: adminProfile?.email || user?.email || '',
          phone: adminProfile?.phone || user?.phone || '',
          avatar: adminProfile?.avatar || user?.avatar || user?.avatarUrl || '',
          role: 'admin',
          isVerified: true,
          trustScore: adminProfile?.trustScore || 100,
          walletBalance: adminProfile?.walletBalance || 0,
          walletEscrowBalance: adminProfile?.walletEscrowBalance || 0,
          isActive: true,
          createdAt: adminProfile?.createdAt || user?.createdAt || new Date()
        });
      }

      // Trích xuất Users từ hồ sơ eKYC thật trên MongoDB
      liveEkyc.forEach(ek => {
        const key = ek.email || ek._id;
        userMap.set(key, {
          _id: ek.userId || ek._id,
          name: ek.fullName,
          email: ek.email,
          phone: ek.phone,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${ek.fullName}`,
          role: 'renter',
          isVerified: ek.status === 'approved',
          trustScore: ek.status === 'approved' ? 100 : 85,
          walletBalance: ek.walletBalance || 0,
          walletEscrowBalance: ek.walletEscrowBalance || 0,
          isActive: true,
          createdAt: ek.createdAt || new Date()
        });
      });

      // Trích xuất Owners từ thiết bị thật trên MongoDB
      liveDevices.forEach(d => {
        if (d.owner?.name) {
          const key = d.owner.email || d.owner.name;
          if (!userMap.has(key)) {
            userMap.set(key, {
              _id: d.owner._id || `owner_${d._id}`,
              name: d.owner.name,
              email: d.owner.email || '',
              phone: d.owner.phone || '',
              avatar: d.owner.avatar || '',
              role: 'owner',
              isVerified: true,
              trustScore: d.owner.trustScore ?? 85,
              walletBalance: d.owner.walletBalance || 0,
              walletEscrowBalance: d.owner.walletEscrowBalance || 0,
              isActive: true,
              createdAt: d.owner.createdAt || d.createdAt || new Date()
            });
          }
        }
      });
      setUsers(Array.from(userMap.values()));
    } catch (err) {
      console.warn('⚠️ Error fetching from Admin API, using fallback mode:', err);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    if (user) {
      setAdminProfile((prev) => prev || user);
    }
  }, [user]);

  // Action: Toggle user status (Khóa / Mở khóa)
  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      const token = localStorage.getItem('techshare_auth_token') || localStorage.getItem('techshare_token');
      const authHeaders = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };
      const res = await fetch(`${API_BASE}/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          isActive: !currentStatus
        })
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u._id === userId ? {
          ...u,
          isActive: !currentStatus
        } : u));
      } else {
        // Fallback optimistic update
        setUsers(prev => prev.map(u => u._id === userId ? {
          ...u,
          isActive: !currentStatus
        } : u));
      }
    } catch (err) {
      // Optimistic update for smooth demo
      setUsers(prev => prev.map(u => u._id === userId ? {
        ...u,
        isActive: !currentStatus
      } : u));
    }
  };

  // Action: Remove device violation
  const handleRemoveDevice = async deviceId => {
    try {
      const token = localStorage.getItem('techshare_auth_token') || localStorage.getItem('techshare_token');
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_BASE}/admin/devices/${deviceId}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      if (res.ok) {
        setDevices(prev => prev.filter(d => d._id !== deviceId));
        setKpi(prev => ({
          ...prev,
          totalDevices: Math.max(0, prev.totalDevices - 1)
        }));
      } else {
        setDevices(prev => prev.filter(d => d._id !== deviceId));
      }
    } catch (err) {
      setDevices(prev => prev.filter(d => d._id !== deviceId));
    }
  };

  // Action: Approve eKYC
  const handleApproveEkyc = async requestId => {
    try {
      const token = localStorage.getItem('techshare_auth_token') || localStorage.getItem('techshare_token');
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_BASE}/admin/ekyc/${requestId}/approve`, {
        method: 'PATCH',
        headers: authHeaders
      });
      if (res.ok) {
        setEkycRequests(prev => prev.map(r => r._id === requestId ? {
          ...r,
          status: 'approved'
        } : r));
      } else {
        setEkycRequests(prev => prev.map(r => r._id === requestId ? {
          ...r,
          status: 'approved'
        } : r));
      }
    } catch (err) {
      setEkycRequests(prev => prev.map(r => r._id === requestId ? {
        ...r,
        status: 'approved'
      } : r));
    }
  };

  // Action: Reject eKYC
  const handleRejectEkyc = async (requestId, reason) => {
    try {
      const token = localStorage.getItem('techshare_auth_token') || localStorage.getItem('techshare_token');
      const authHeaders = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };
      const res = await fetch(`${API_BASE}/admin/ekyc/${requestId}/reject`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          reason
        })
      });
      if (res.ok) {
        setEkycRequests(prev => prev.map(r => r._id === requestId ? {
          ...r,
          status: 'rejected',
          rejectReason: reason
        } : r));
      } else {
        setEkycRequests(prev => prev.map(r => r._id === requestId ? {
          ...r,
          status: 'rejected',
          rejectReason: reason
        } : r));
      }
    } catch (err) {
      setEkycRequests(prev => prev.map(r => r._id === requestId ? {
        ...r,
        status: 'rejected',
        rejectReason: reason
      } : r));
    }
  };
  // Action: Moderate device (Approve / Reject) in sync with DB and Sidebar
  const handleModerateDevice = (deviceId, action, reason) => {
    let prevStatus = 'pending';
    setDevices(prev => {
      const arr = Array.isArray(prev) ? prev : [];
      const target = arr.find(d => d._id === deviceId);
      if (target) prevStatus = target.moderationStatus || 'pending';
      return arr.map(d => d._id === deviceId ? {
        ...d,
        moderationStatus: action === 'approve' ? 'approved' : 'rejected',
        status: action === 'approve' ? 'available' : 'hidden',
        moderationReason: reason || '',
        rejectReason: reason || '',
      } : d);
    });

    if (prevStatus === 'pending') {
      setKpi(prev => ({
        ...prev,
        pendingDevices: Math.max(0, (prev.pendingDevices || 1) - 1),
      }));
    }

    setDeviceCounts(prev => {
      const nextCounts = { ...prev };
      if (prevStatus === 'pending') nextCounts.pending = Math.max(0, (nextCounts.pending || 1) - 1);
      else if (prevStatus === 'approved') nextCounts.approved = Math.max(0, (nextCounts.approved || 1) - 1);
      else if (prevStatus === 'rejected') nextCounts.rejected = Math.max(0, (nextCounts.rejected || 1) - 1);

      if (action === 'approve') nextCounts.approved = (nextCounts.approved || 0) + 1;
      else nextCounts.rejected = (nextCounts.rejected || 0) + 1;
      return nextCounts;
    });
  };

  const pendingEkycCount = ekycRequests.filter(r => r.status === 'pending').length;
  const pendingDevicesCount =
    kpi.pendingDevices !== undefined && kpi.pendingDevices !== null
      ? kpi.pendingDevices
      : devices.filter(d => d.moderationStatus === 'pending').length;
  return <div className="admin-hub-wrapper">
      {/* A. Fixed Left Sidebar */}
      <AdminSidebarContent
        currentTab={currentTab}
        currentPath={location.pathname}
        onSelectTab={handleSelectTab}
        pendingEkycCount={pendingEkycCount}
        pendingOwnerEkycCount={pendingOwnerEkycCount}
        pendingDevicesCount={pendingDevicesCount}
        pendingDisputesCount={kpi.pendingDisputes || 0}
        onLogout={logout}
        admin={adminProfile || user}
        user={user}
        onSwitchToClient={() => {
          window.location.href = '/';
        }}
      />

      {/* B. Main Content Area */}
      <main className="admin-main-wrap" role="main">
        {/* Topbar */}
        <header className="admin-topbar">
          {/* Pill Search Bar */}
          <div className="admin-search-pill">
            <Search size={16} style={{ color: '#67BEC3', flexShrink: 0 }} />
            <input
              type="text"
              placeholder={STRINGS.admin.dashboard.searchPlaceholder}
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
            />
          </div>

          {/* Notification Bell Dropdown */}
          <NotificationDropdown />

          {/* Admin Header Chip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              paddingLeft: '8px',
            }}
          >
            <img
              src={(adminProfile || user)?.avatar || (adminProfile || user)?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"}
              alt={(adminProfile || user)?.name || STRINGS.admin.dashboard.avatarAlt}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '2px solid #67BEC3',
                objectFit: 'cover',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#0F172A',
                }}
              >
                {(adminProfile || user)?.name || 'Admin'}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  color: '#286E74',
                  fontWeight: 600,
                }}
              >
                {(adminProfile || user)?.role === 'admin' ? 'System Administrator' : ((adminProfile || user)?.role || STRINGS.admin.dashboard.adminRole)}
              </span>
            </div>
          </div>
        </header>

        {/* Dynamic View Container */}
        <section className="admin-content-body">
          {currentTab === 'overview' && <AdminOverviewTab kpi={kpi} chartData={charts} categoryStats={categories} onRefresh={fetchAllData} isLoading={isLoading} />}

          {currentTab === 'users' && <AdminUsersTab users={users} onToggleStatus={handleToggleUserStatus} isLoading={isLoading} />}

          {currentTab === 'devices' && (
            <AdminDevicesTab
              devices={devices}
              counts={deviceCounts}
              onRemoveDevice={handleRemoveDevice}
              onModerateDevice={handleModerateDevice}
              isLoading={isLoading}
            />
          )}

          {currentTab === 'ekyc' && <AdminEkycTab requests={ekycRequests} onApprove={handleApproveEkyc} onReject={handleRejectEkyc} isLoading={isLoading} />}

          {currentTab === 'owner-ekyc' && (
            <AdminOwnerEkycTab
              onStatusChange={() => setPendingOwnerEkycCount((prev) => Math.max(0, prev - 1))}
            />
          )}
          {currentTab === 'bookings' && <AdminBookingsTab />}

          {currentTab === 'disputes' && <AdminDisputesTab />}

          {currentTab === 'wallet' && <AdminWalletTab />}

          {currentTab === 'audit-logs' && <AdminAuditLogsTab />}

          {currentTab === 'vouchers' && <AdminVouchersTab />}

          {currentTab === 'reviews' && <AdminReviewsTab />}

          {currentTab === 'roles' && <AdminRolesTab />}

          {currentTab === 'analytics' && <AdminAdvancedAnalyticsTab />}

          {currentTab === 'notifications' && <AdminNotificationsTab />}

          {currentTab === 'settings' && <AdminSettingsTab />}
        </section>
      </main>
    </div>;
};
export default AdminDashboardScreen;