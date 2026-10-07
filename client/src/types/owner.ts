/**
 * Owner TypeScript Definitions for TechShare Web
 * Based on MEMBER_ASSIGNMENTS.md (Kiên & Nhật modules)
 */

import { DeviceCategory, DeviceStatus } from './device';

export type OwnerTab =
  | 'overview'
  | 'devices'
  | 'bookings'
  | 'calendar'
  | 'analytics'
  | 'wallet';

export interface OwnerKPIData {
  totalDevices: number;
  activeRentals: number;
  pendingApprovals: number;
  monthlyRevenue: number;
  monthlyRevenueFormatted: string;
  utilizationRate: number; // Percentage 0 - 100
  trustScore: number; // 0 - 100
  ratingAvg: number; // 0 - 5
}

export interface OwnerDeviceItem {
  _id: string;
  name: string;
  brand: string;
  category: DeviceCategory;
  dailyRate: number;
  depositAmount: number;
  status: DeviceStatus;
  images: string[];
  ratingAvg: number;
  rentalCount: number;
  condition: string;
  specs: Record<string, any>;
  blockedDates?: string[]; // YYYY-MM-DD
  createdAt: string | Date;
}

export type BookingStatus =
  | 'pending'
  | 'approved'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'rejected';

export interface RenterSummary {
  _id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  trustScore: number;
  isVerified: boolean;
  rentalCount?: number;
}

export interface OwnerBookingItem {
  _id: string;
  bookingCode: string;
  deviceId: string;
  deviceName: string;
  deviceImage: string;
  deviceCategory: DeviceCategory;
  dailyRate: number;
  renter: RenterSummary;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  totalDays: number;
  totalRentalPrice: number;
  depositAmount: number;
  status: BookingStatus;
  deliveryMethod: 'pickup' | 'shipping';
  handoverPhotos?: {
    beforeRental?: string[];
    afterRental?: string[];
  };
  rejectReason?: string;
  dispute?: {
    isDisputed: boolean;
    reason?: string;
    amount?: number;
    status?: 'pending' | 'resolved';
  };
  createdAt: string | Date;
}

export interface OwnerAnalyticsPoint {
  date: string;
  revenue: number;
  rentals: number;
}

export interface BlockedDateEntry {
  deviceId: string;
  deviceName: string;
  dates: string[]; // YYYY-MM-DD
  reason?: string;
}

export interface OwnerWalletTransaction {
  _id: string;
  type: 'rental_income' | 'deposit_hold' | 'deposit_refund' | 'withdraw';
  amount: number;
  bookingCode?: string;
  createdAt: string | Date;
  status: 'success' | 'pending';
}

export interface RentalRequestItem {
  id: string; // Mã đơn
  device: {
    name: string;
    imageUrl: string;
  };
  renter: {
    name: string;
    avatarUrl: string;
    trustScore: number;
  };
  rentalPeriod: {
    startDate: string;
    endDate: string;
    totalDays: number;
  };
  totalPrice: number;
  status: 'pending' | 'renting' | 'completed';
}
