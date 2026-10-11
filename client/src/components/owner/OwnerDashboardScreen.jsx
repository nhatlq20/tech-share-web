import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, PlusCircle, Bell, RefreshCw } from 'lucide-react';
import { OwnerSidebar } from './OwnerSidebar';
import { OwnerOverviewTab } from './OwnerOverviewTab';
import { OwnerDevicesTab } from './OwnerDevicesTab';
import { OwnerBookingsTab } from './OwnerBookingsTab';
import { OwnerCalendarTab } from './OwnerCalendarTab';
import { OwnerAnalyticsTab } from './OwnerAnalyticsTab';
import { OwnerWalletTab } from './OwnerWalletTab';
import PostDevicePage from '../../pages/PostDevicePage';
import { ROUTES } from '../../routes/routes';
import { STRINGS } from '../../constants/strings';
import { API_CONFIG } from '../../constants/config';
import './OwnerWorkspace.css';

export const OwnerDashboardScreen = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // State initialized with clean DB empty states (No seed data)
  const [kpi, setKpi] = useState({
    totalDevices: 0,
    activeRentals: 0,
    pendingApprovals: 0,
    monthlyRevenue: 0,
    monthlyRevenueFormatted: '0 ₫',
    escrowHolding: 0,
    escrowHoldingFormatted: '0 ₫',
    utilizationRate: 0,
    trustScore: 100,
    ratingAvg: 5.0,
    owner: null,
  });
  const [devices, setDevices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [charts, setCharts] = useState({ '7d': [], month: [], year: [] });
  const [utilization, setUtilization] = useState([]);
  const [blockedDatesMap, setBlockedDatesMap] = useState({});
  const [globalSearch, setGlobalSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Determine current active path
  const currentPath = location.pathname;

  // Sync route navigation
  const handleNavigate = (path) => {
    navigate(path);
  };

  // Fetch Owner live data directly from MongoDB Atlas backend
  const fetchOwnerData = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('techshare_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // 1. Fetch overview, KPI & charts
      const resOverview = await fetch(`${API_CONFIG.BASE_URL}/owner/overview`, { headers });
      if (resOverview.ok) {
        const jsonOverview = await resOverview.json();
        if (jsonOverview.success && jsonOverview.data) {
          if (jsonOverview.data.kpi) setKpi(jsonOverview.data.kpi);
          if (jsonOverview.data.charts) setCharts(jsonOverview.data.charts);
          if (jsonOverview.data.utilization) setUtilization(jsonOverview.data.utilization);
        }
      }

      // 2. Fetch owner equipment/devices
      const resDev = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.OWNER_DEVICES}`, { headers });
      if (resDev.ok) {
        const jsonDev = await resDev.json();
        if (jsonDev.success && Array.isArray(jsonDev.data)) {
          setDevices(jsonDev.data);
          // Sync blocked dates map from devices
          const bMap = {};
          jsonDev.data.forEach((d) => {
            if (d._id && Array.isArray(d.blockedDates)) {
              bMap[d._id] = d.blockedDates;
            }
          });
          setBlockedDatesMap(bMap);
        }
      }

      // 3. Fetch owner bookings
      const resBook = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.OWNER_BOOKINGS}`, { headers });
      if (resBook.ok) {
        const jsonBook = await resBook.json();
        if (jsonBook.success && Array.isArray(jsonBook.data)) {
          setBookings(jsonBook.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch live owner data from DB:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOwnerData();
  }, [fetchOwnerData]);

  // Actions: Toggle device status (Active MongoDB mutation)
  const handleToggleDeviceStatus = async (deviceId, newStatus) => {
    setDevices((prev) =>
      prev.map((d) => (d._id === deviceId ? { ...d, status: newStatus } : d))
    );
    try {
      const token = localStorage.getItem('techshare_token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.OWNER_TOGGLE_DEVICE(deviceId)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: newStatus }),
      });
      fetchOwnerData();
    } catch (err) {
      console.error('Failed to toggle device status in DB:', err);
    }
  };

  // Actions: Toggle blocked dates on calendar (Active MongoDB mutation)
  const handleToggleBlockedDate = async (deviceId, dateStr) => {
    const currentList = blockedDatesMap[deviceId] || [];
    const exists = currentList.includes(dateStr);
    const updated = exists
      ? currentList.filter((d) => d !== dateStr)
      : [...currentList, dateStr];

    setBlockedDatesMap((prev) => ({ ...prev, [deviceId]: updated }));

    try {
      const token = localStorage.getItem('techshare_token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.OWNER_BLOCKED_DATES(deviceId)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ date: dateStr, blockedDates: updated }),
      });
    } catch (err) {
      console.error('Failed to update blocked dates in DB:', err);
    }
  };

  // Actions: Approve booking (Active MongoDB mutation)
  const handleApproveBooking = async (bookingId) => {
    setBookings((prev) =>
      prev.map((b) => (b._id === bookingId ? { ...b, status: 'approved' } : b))
    );
    try {
      const token = localStorage.getItem('techshare_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.OWNER_APPROVE_BOOKING(bookingId)}`, {
        method: 'PATCH',
        headers,
      });
      fetchOwnerData();
    } catch (err) {
      console.error('Failed to approve booking in DB:', err);
    }
  };

  // Actions: Reject booking (Active MongoDB mutation)
  const handleRejectBooking = async (bookingId, reason) => {
    setBookings((prev) =>
      prev.map((b) =>
        b._id === bookingId ? { ...b, status: 'rejected', rejectReason: reason } : b
      )
    );
    try {
      const token = localStorage.getItem('techshare_token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.OWNER_REJECT_BOOKING(bookingId)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ reason }),
      });
      fetchOwnerData();
    } catch (err) {
      console.error('Failed to reject booking in DB:', err);
    }
  };

  // Actions: QR Handover -> active (Active MongoDB mutation)
  const handleHandover = async (bookingId) => {
    setBookings((prev) =>
      prev.map((b) => (b._id === bookingId ? { ...b, status: 'active' } : b))
    );
    try {
      const token = localStorage.getItem('techshare_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.OWNER_HANDOVER_QR(bookingId)}`, {
        method: 'PATCH',
        headers,
      });
      fetchOwnerData();
    } catch (err) {
      console.error('Failed to handover booking in DB:', err);
    }
  };

  // Actions: Complete return -> completed (Active MongoDB mutation)
  const handleCompleteReturn = async (bookingId) => {
    setBookings((prev) =>
      prev.map((b) => (b._id === bookingId ? { ...b, status: 'completed' } : b))
    );
    try {
      const token = localStorage.getItem('techshare_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.OWNER_COMPLETE_BOOKING(bookingId)}`, {
        method: 'PATCH',
        headers,
      });
      fetchOwnerData();
    } catch (err) {
      console.error('Failed to complete booking in DB:', err);
    }
  };

  // Pending count for sidebar badge
  const pendingApprovalsCount = bookings.filter((b) => b.status === 'pending').length;

  return (
    <div className="owner-hub-wrapper">
      {/* 1. Fixed Left Sidebar */}
      <OwnerSidebar
        currentPath={currentPath}
        onNavigate={handleNavigate}
        pendingCount={pendingApprovalsCount}
        owner={kpi?.owner}
        onLogout={() => {
          localStorage.removeItem('techshare_token');
          window.location.href = ROUTES.HOME;
        }}
      />

      {/* 2. Main Workspace */}
      <main className="owner-main-wrap" role="main">
        {/* Topbar */}
        <header className="owner-topbar">
          <div className="owner-search-pill">
            <Search size={16} style={{ color: '#67BEC3', flexShrink: 0 }} />
            <input
              type="text"
              placeholder={STRINGS.admin.dashboard.searchPlaceholder}
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
            />
          </div>

          <div className="owner-topbar-actions">
            {/* Primary Action Button: + Add Equipment */}
            <button
              type="button"
              className="owner-top-action-btn"
              onClick={() => handleNavigate(ROUTES.OWNER_DEVICE_NEW)}
            >
              <PlusCircle size={15} />
              <span>{STRINGS.owner.overview.postDeviceBtn}</span>
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={fetchOwnerData}
              disabled={isLoading}
              className="owner-action-btn"
              title={STRINGS.owner.overview.refresh}
            >
              <RefreshCw
                size={16}
                style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }}
              />
            </button>

            {/* Notification Bell */}
            <button
              type="button"
              className="owner-action-btn"
              title="Rental Requests"
              onClick={() => handleNavigate(ROUTES.OWNER_BOOKINGS)}
            >
              <Bell size={16} />
              {pendingApprovalsCount > 0 && <span className="owner-notif-dot" />}
            </button>

            {/* Partner Header Chip */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                paddingLeft: '8px',
              }}
            >
              <img
                src={kpi?.owner?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"}
                alt={STRINGS.owner.sidebar.avatarAlt}
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
                  {kpi?.owner?.name || STRINGS.owner.sidebar.ownerName}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    color: '#286E74',
                    fontWeight: 600,
                  }}
                >
                  {STRINGS.owner.sidebar.ownerRole}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body Based on URL Route */}
        <section className="owner-content-body">
          {/* A. /owner/dashboard or /owner */}
          {(currentPath === ROUTES.OWNER_DASHBOARD || currentPath === ROUTES.OWNER) && (
            <OwnerOverviewTab
              kpi={kpi}
              charts={charts}
              utilization={utilization}
              recentBookings={bookings}
              onNavigate={handleNavigate}
              onOpenPostModal={() => handleNavigate(ROUTES.OWNER_DEVICE_NEW)}
              onRefresh={fetchOwnerData}
              isLoading={isLoading}
            />
          )}

          {currentPath === ROUTES.OWNER_DEVICE_NEW && (
            <PostDevicePage onBack={() => handleNavigate(ROUTES.OWNER_DEVICES)} />
          )}

          {/* B. /owner/devices */}
          {currentPath === ROUTES.OWNER_DEVICES && (
            <OwnerDevicesTab
              devices={devices}
              onToggleStatus={handleToggleDeviceStatus}
              onPostDevice={() => handleNavigate(ROUTES.OWNER_DEVICE_NEW)}
              onNavigateToCalendar={(devId) => handleNavigate(ROUTES.OWNER_CALENDAR)}
            />
          )}

          {/* C. /owner/bookings */}
          {currentPath === ROUTES.OWNER_BOOKINGS && (
            <OwnerBookingsTab
              bookings={bookings}
              onApprove={handleApproveBooking}
              onReject={handleRejectBooking}
              onHandover={handleHandover}
              onCompleteReturn={handleCompleteReturn}
            />
          )}

          {/* D. /owner/calendar */}
          {currentPath === ROUTES.OWNER_CALENDAR && (
            <OwnerCalendarTab
              devices={devices}
              bookings={bookings}
              blockedDatesMap={blockedDatesMap}
              onToggleBlockedDate={handleToggleBlockedDate}
            />
          )}

          {/* E. /owner/analytics */}
          {currentPath === ROUTES.OWNER_ANALYTICS && (
            <OwnerAnalyticsTab
              recentBookings={bookings}
              kpi={kpi}
              charts={charts}
              utilization={utilization}
              onNavigate={handleNavigate}
            />
          )}

          {/* F. /owner/wallet */}
          {currentPath === ROUTES.OWNER_WALLET && (
            <OwnerWalletTab
              kpi={kpi}
              bookings={bookings}
            />
          )}
        </section>
      </main>
    </div>
  );
};

export default OwnerDashboardScreen;
