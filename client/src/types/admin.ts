export type AdminTab = 'overview' | 'users' | 'devices' | 'ekyc';

export interface AdminKPIData {
  totalUsers: number;
  activeUsers: number;
  totalDevices: number;
  availableDevices: number;
  activeBookings: number;
  pendingEkyc: number;
  totalRevenue: number;
  revenueFormatted: string;
}

export interface ChartDataPoint {
  name: string;
  revenue: number;
  orders: number;
}

export interface CategoryStat {
  id: string;
  name: string;
  count: number;
  percent: number;
  color: string;
}

export interface UserItem {
  _id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  role: 'admin' | 'renter' | 'owner' | 'both' | string;
  trustScore: number;
  isVerified: boolean;
  walletBalance: number;
  isActive: boolean;
  walletEscrowBalance?: number;
  createdAt?: string | Date;
}

export type AdminUser = UserItem;

export interface AdminDevice {
  _id: string;
  name: string;
  brand: string;
  category: string;
  condition: string;
  description?: string;
  images?: string[];
  specs?: Record<string, any> | string;
  pricePerDay: number;
  depositAmount: number;
  status: 'available' | 'rented' | 'hidden' | string;
  ratingAvg?: number;
  rentalCount?: number;
  ownerId?: {
    _id?: string;
    name: string;
    phone?: string;
    email?: string;
    avatar?: string;
  } | any;
  owner?: {
    _id?: string;
    name: string;
    email?: string;
    phone?: string;
    avatar?: string;
  };
  createdAt?: string | Date;
}

export interface DeviceSummary {
  _id: string;
  name: string;
  brand: string;
  category: string;
  pricePerDay: number;
  ownerName: string;
  status: 'available' | 'rented' | string;
  imageUrl: string;
}

export type DeviceItem = AdminDevice;

export interface AdminEkycRequest {
  _id: string;
  userId: string | null;
  fullName: string;
  email: string;
  phone: string;
  idCardNumber: string;
  address: string;
  idCardFrontUrl: string;
  idCardBackUrl: string;
  selfieUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectReason?: string | null;
  createdAt: string | Date;
}

