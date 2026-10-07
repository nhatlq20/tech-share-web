import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, PlusCircle } from 'lucide-react';
import { OwnerSidebar } from './OwnerSidebar';
import { OwnerOverviewTab } from './OwnerOverviewTab';
import { OwnerDevicesTab } from './OwnerDevicesTab';
import { OwnerBookingsTab } from './OwnerBookingsTab';
import { OwnerCalendarTab } from './OwnerCalendarTab';
import { OwnerAnalyticsTab } from './OwnerAnalyticsTab';
import { OwnerWalletTab } from './OwnerWalletTab';
import { ROUTES } from '../../routes/routes';
import { STRINGS } from '../../constants/strings';
import { COLORS } from '../../constants/colors';
import { API_CONFIG } from '../../constants/config';
import './OwnerWorkspace.css';

// Default Owner Data
const DEFAULT_OWNER_KPI = {
  totalDevices: 8,
  activeRentals: 3,
  pendingApprovals: 2,
  monthlyRevenue: 14850000,
  monthlyRevenueFormatted: '14.850.000 ₫',
  utilizationRate: 75,
  trustScore: 98,
  ratingAvg: 4.9,
};

const DEFAULT_DEVICES = [
  {
    _id: 'dev_1',
    name: 'Sony Alpha A7 IV Kit 28-70mm OSS',
    brand: 'Sony',
    category: 'camera',
    dailyRate: 350000,
    depositAmount: 2500000,
    status: 'available',
    images: [
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=400&q=80'
    ],
    ratingAvg: 4.9,
    rentalCount: 14,
    condition: 'Mới 99%, lens sạch bụi',
    specs: { sensor: '33MP Full-Frame', video: '4K 60p' },
    createdAt: '2026-09-15'
  },
  {
    _id: 'dev_2',
    name: 'MacBook Pro 16 inch M3 Pro (36GB / 512GB)',
    brand: 'Apple',
    category: 'laptop',
    dailyRate: 450000,
    depositAmount: 5000000,
    status: 'rented',
    images: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=400&q=80'
    ],
    ratingAvg: 5.0,
    rentalCount: 9,
    condition: 'Pin 100%, bảo hành chính hãng',
    specs: { chip: 'M3 Pro', ram: '36GB' },
    createdAt: '2026-09-20'
  },
  {
    _id: 'dev_3',
    name: 'DJI Mini 4 Pro Fly More Combo Plus',
    brand: 'DJI',
    category: 'drone',
    dailyRate: 300000,
    depositAmount: 2000000,
    status: 'available',
    images: [
      'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=400&q=80'
    ],
    ratingAvg: 4.8,
    rentalCount: 22,
    condition: 'Kèm 3 pin, sạc nhanh và balo',
    specs: { flightTime: '45 mins', range: '20km' },
    createdAt: '2026-09-01'
  },
  {
    _id: 'dev_4',
    name: 'Sony WH-1000XM5 Chống ồn chủ động',
    brand: 'Sony',
    category: 'audio',
    dailyRate: 90000,
    depositAmount: 800000,
    status: 'maintenance',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80'
    ],
    ratingAvg: 4.7,
    rentalCount: 18,
    condition: 'Đang thay đệm tai mới',
    specs: { battery: '30h', anc: 'V1 processor' },
    createdAt: '2026-08-10'
  }
];

const DEFAULT_BOOKINGS = [
  {
    _id: 'book_1',
    id: 'TS-2026-881',
    bookingCode: 'TS-2026-881',
    deviceId: 'dev_1',
    deviceName: 'Sony Alpha A7 IV Kit 28-70mm OSS',
    deviceImage: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=150&q=80',
    device: {
      name: 'Sony Alpha A7 IV Kit 28-70mm OSS',
      imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=150&q=80'
    },
    deviceCategory: 'camera',
    dailyRate: 350000,
    renter: {
      _id: 'user_r1',
      name: 'Nguyễn Văn Minh',
      email: 'minh.nguyen@gmail.com',
      phone: '0912345678',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      trustScore: 92,
      isVerified: true
    },
    rentalPeriod: {
      startDate: '2026-10-08',
      endDate: '2026-10-10',
      totalDays: 2
    },
    startDate: '2026-10-08',
    endDate: '2026-10-10',
    totalDays: 2,
    totalPrice: 700000,
    totalRentalPrice: 700000,
    depositAmount: 2500000,
    status: 'pending',
    deliveryMethod: 'pickup',
    createdAt: '2026-10-07 08:15'
  },
  {
    _id: 'book_2',
    id: 'TS-2026-882',
    bookingCode: 'TS-2026-882',
    deviceId: 'dev_2',
    deviceName: 'MacBook Pro 16 inch M3 Pro (36GB / 512GB)',
    deviceImage: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=150&q=80',
    device: {
      name: 'MacBook Pro 16 inch M3 Pro (36GB / 512GB)',
      imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=150&q=80'
    },
    deviceCategory: 'laptop',
    dailyRate: 450000,
    renter: {
      _id: 'user_r2',
      name: 'Lê Hoàng Yến',
      email: 'hoangyen.le@fpt.edu.vn',
      phone: '0987654321',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
      trustScore: 88,
      isVerified: true
    },
    rentalPeriod: {
      startDate: '2026-10-09',
      endDate: '2026-10-14',
      totalDays: 5
    },
    startDate: '2026-10-09',
    endDate: '2026-10-14',
    totalDays: 5,
    totalPrice: 2025000,
    totalRentalPrice: 2025000, // Long rental discount
    depositAmount: 5000000,
    status: 'pending',
    deliveryMethod: 'pickup',
    createdAt: '2026-10-07 07:30'
  },
  {
    _id: 'book_3',
    id: 'TS-2026-879',
    bookingCode: 'TS-2026-879',
    deviceId: 'dev_3',
    deviceName: 'DJI Mini 4 Pro Fly More Combo Plus',
    deviceImage: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=150&q=80',
    device: {
      name: 'DJI Mini 4 Pro Fly More Combo Plus',
      imageUrl: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=150&q=80'
    },
    deviceCategory: 'drone',
    dailyRate: 300000,
    renter: {
      _id: 'user_r3',
      name: 'Trần Quang Hùng',
      email: 'quanghung@media.vn',
      phone: '0903112233',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
      avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
      trustScore: 95,
      isVerified: true
    },
    rentalPeriod: {
      startDate: '2026-10-07',
      endDate: '2026-10-08',
      totalDays: 1
    },
    startDate: '2026-10-07',
    endDate: '2026-10-08',
    totalDays: 1,
    totalPrice: 300000,
    totalRentalPrice: 300000,
    depositAmount: 2000000,
    status: 'approved',
    deliveryMethod: 'pickup',
    createdAt: '2026-10-06 18:00'
  },
  {
    _id: 'book_4',
    id: 'TS-2026-870',
    bookingCode: 'TS-2026-870',
    deviceId: 'dev_2',
    deviceName: 'MacBook Pro 16 inch M3 Pro (36GB / 512GB)',
    deviceImage: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=150&q=80',
    device: {
      name: 'MacBook Pro 16 inch M3 Pro (36GB / 512GB)',
      imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=150&q=80'
    },
    deviceCategory: 'laptop',
    dailyRate: 450000,
    renter: {
      _id: 'user_r4',
      name: 'Vũ Thái Dương',
      email: 'thaiduong.dev@gmail.com',
      phone: '0945678901',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      trustScore: 85,
      isVerified: false
    },
    rentalPeriod: {
      startDate: '2026-10-04',
      endDate: '2026-10-08',
      totalDays: 4
    },
    startDate: '2026-10-04',
    endDate: '2026-10-08',
    totalDays: 4,
    totalPrice: 1800000,
    totalRentalPrice: 1800000,
    depositAmount: 5000000,
    status: 'active',
    deliveryMethod: 'shipping',
    createdAt: '2026-10-03 14:20'
  }
];

export const OwnerDashboardScreen = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // State
  const [kpi, setKpi] = useState(DEFAULT_OWNER_KPI);
  const [devices, setDevices] = useState(DEFAULT_DEVICES);
  const [bookings, setBookings] = useState(DEFAULT_BOOKINGS);
  const [blockedDatesMap, setBlockedDatesMap] = useState({
    dev_1: ['2026-10-12', '2026-10-13'],
    dev_2: ['2026-10-20']
  });
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  // Determine current active path
  const currentPath = location.pathname;

  // Sync route navigation
  const handleNavigate = (path) => {
    navigate(path);
  };

  // Fetch Owner live data (fallback safely)
  const fetchOwnerData = useCallback(async () => {
    try {
      const token = localStorage.getItem('techshare_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // 1. Fetch devices
      const resDev = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.OWNER_DEVICES}`, { headers });
      if (resDev.ok) {
        const jsonDev = await resDev.json();
        if (jsonDev.success && Array.isArray(jsonDev.data) && jsonDev.data.length > 0) {
          setDevices(jsonDev.data);
        }
      }

      // 2. Fetch bookings
      const resBook = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.OWNER_BOOKINGS}`, { headers });
      if (resBook.ok) {
        const jsonBook = await resBook.json();
        if (jsonBook.success && Array.isArray(jsonBook.data) && jsonBook.data.length > 0) {
          setBookings(jsonBook.data);
        }
      }
    } catch (err) {
      // Keep rich demo data
    }
  }, []);

  useEffect(() => {
    fetchOwnerData();
  }, [fetchOwnerData]);

  // Actions: Toggle device status
  const handleToggleDeviceStatus = (deviceId, newStatus) => {
    setDevices((prev) =>
      prev.map((d) => (d._id === deviceId ? { ...d, status: newStatus } : d))
    );
  };

  // Actions: Add new device
  const handleAddDevice = (newDevice) => {
    setDevices((prev) => [newDevice, ...prev]);
    setKpi((prev) => ({ ...prev, totalDevices: prev.totalDevices + 1 }));
  };

  // Actions: Toggle blocked dates on calendar
  const handleToggleBlockedDate = (deviceId, dateStr) => {
    setBlockedDatesMap((prev) => {
      const currentList = prev[deviceId] || [];
      const exists = currentList.includes(dateStr);
      const updated = exists
        ? currentList.filter((d) => d !== dateStr)
        : [...currentList, dateStr];
      return { ...prev, [deviceId]: updated };
    });
  };

  // Actions: Approve booking
  const handleApproveBooking = (bookingId) => {
    setBookings((prev) =>
      prev.map((b) => (b._id === bookingId ? { ...b, status: 'approved' } : b))
    );
    setKpi((prev) => ({
      ...prev,
      pendingApprovals: Math.max(0, prev.pendingApprovals - 1)
    }));
  };

  // Actions: Reject booking
  const handleRejectBooking = (bookingId, reason) => {
    setBookings((prev) =>
      prev.map((b) =>
        b._id === bookingId ? { ...b, status: 'rejected', rejectReason: reason } : b
      )
    );
    setKpi((prev) => ({
      ...prev,
      pendingApprovals: Math.max(0, prev.pendingApprovals - 1)
    }));
  };

  // Actions: QR Handover (N-02) -> active
  const handleHandover = (bookingId) => {
    setBookings((prev) =>
      prev.map((b) => (b._id === bookingId ? { ...b, status: 'active' } : b))
    );
    setKpi((prev) => ({
      ...prev,
      activeRentals: prev.activeRentals + 1
    }));
  };

  // Actions: Complete return (N-02) -> completed
  const handleCompleteReturn = (bookingId) => {
    setBookings((prev) =>
      prev.map((b) => (b._id === bookingId ? { ...b, status: 'completed' } : b))
    );
    setKpi((prev) => ({
      ...prev,
      activeRentals: Math.max(0, prev.activeRentals - 1)
    }));
  };

  // Pending count for sidebar badge
  const pendingApprovalsCount = bookings.filter((b) => b.status === 'pending').length;

  return (
    <div className="owner-hub-wrapper h-screen overflow-hidden flex">
      {/* 1. Fixed Left Sidebar */}
      <OwnerSidebar
        currentPath={currentPath}
        onNavigate={handleNavigate}
        pendingCount={pendingApprovalsCount}
        onLogout={() => {
          localStorage.removeItem('techshare_token');
          window.location.href = ROUTES.LOGIN;
        }}
      />

      {/* 2. Main Workspace (Fit-to-Screen Container) */}
      <main className="owner-main-wrap h-screen overflow-hidden flex flex-col flex-1" role="main">
        {/* Topbar */}
        <header className="owner-topbar shrink-0">
          <div className="owner-search-pill">
            <Search size={15} color={COLORS.primary.DEFAULT} />
            <input
              type="text"
              placeholder={STRINGS.admin.dashboard.searchPlaceholder}
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
            />
          </div>

          <div className="owner-topbar-right">
            <button
              type="button"
              className="owner-top-action-btn"
              onClick={() => setIsPostModalOpen(true)}
            >
              <PlusCircle size={15} />
              <span>{STRINGS.owner.devices.postBtn}</span>
            </button>
          </div>
        </header>

        {/* Content Body Based on URL Route (Fit-to-Screen flex-1 min-h-0) */}
        <div className="owner-content-body flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* A. /owner/dashboard or /owner */}
          {(currentPath === ROUTES.OWNER_DASHBOARD || currentPath === ROUTES.OWNER) && (
            <OwnerOverviewTab
              kpi={kpi}
              recentBookings={bookings}
              onNavigate={handleNavigate}
              onOpenPostModal={() => setIsPostModalOpen(true)}
            />
          )}

          {/* B. /owner/devices */}
          {currentPath === ROUTES.OWNER_DEVICES && (
            <OwnerDevicesTab
              devices={devices}
              onToggleStatus={handleToggleDeviceStatus}
              onAddDevice={handleAddDevice}
              onNavigateToCalendar={(devId) => handleNavigate(ROUTES.OWNER_CALENDAR)}
              isPostModalOpen={isPostModalOpen}
              setIsPostModalOpen={setIsPostModalOpen}
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
              blockedDatesMap={blockedDatesMap}
              onToggleBlockedDate={handleToggleBlockedDate}
            />
          )}

          {/* E. /owner/analytics */}
          {currentPath === ROUTES.OWNER_ANALYTICS && (
            <OwnerAnalyticsTab
              recentBookings={bookings}
              kpi={kpi}
              onNavigate={handleNavigate}
            />
          )}

          {/* F. /owner/wallet */}
          {currentPath === ROUTES.OWNER_WALLET && (
            <OwnerWalletTab />
          )}
        </div>
      </main>
    </div>
  );
};

export default OwnerDashboardScreen;

