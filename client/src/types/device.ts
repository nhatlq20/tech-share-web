/**
 * Device TypeScript Definitions for TechShare Web
 * Corresponds to backend MongoDB Device schema (docs/DATABASE_DESIGN.md)
 * and Web Discovery & Maps requirements.
 */

/**
 * Standard categories supported by the platform.
 * Aligned with backend enum: ['smartphone', 'laptop', 'camera', 'drone', 'audio', 'accessory']
 * with forward-compatible extensions for tablets and other items.
 */
export type DeviceCategory =
  | 'smartphone'
  | 'laptop'
  | 'camera'
  | 'drone'
  | 'audio'
  | 'accessory'
  | 'tablet'
  | 'other';

/**
 * Device availability status.
 * Matches backend enum: ['available', 'rented', 'maintenance', 'hidden']
 */
export type DeviceStatus = 'available' | 'rented' | 'maintenance' | 'hidden';

/**
 * Device physical condition rating/description.
 */
export type DeviceCondition = 'new' | 'like_new' | 'good' | 'fair' | string;

/**
 * GeoJSON Point representation for MongoDB 2dsphere indexing.
 * IMPORTANT: Coordinates MUST follow standard GeoJSON order: [longitude, latitude].
 */
export interface DeviceLocation {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
  addressText?: string;
}

/**
 * Dynamic specifications key-value map.
 * Example: { "Chip": "Apple M3 Max", "RAM": "36GB", "Camera": "48MP" }
 */
export type DeviceSpecs = Record<string, string>;

/**
 * Owner summary populated on device details or nearby markers.
 */
export interface DeviceOwner {
  _id: string;
  name: string;
  avatar?: string;
  phone?: string;
  rating?: number;
  isVerified?: boolean;
}

/**
 * Core Device entity.
 */
export interface Device {
  _id: string;
  title: string;
  name?: string; // Compatibility alias for title
  brand: string;
  category: DeviceCategory;
  dailyRate: number; // Rental rate per day in VNĐ
  pricePerDay?: number; // Alias for dailyRate
  depositValue?: number; // Deposit amount in VNĐ
  images: string[]; // List of image URLs
  specs?: DeviceSpecs;
  description: string;
  location: DeviceLocation;
  address: string;
  status: DeviceStatus;
  condition?: DeviceCondition;
  rating?: number; // Average rating (1.0 - 5.0)
  ratingAvg?: number; // Alias for rating
  reviewCount?: number;
  viewsCount?: number;
  owner?: string | DeviceOwner;
  ownerId?: string; // Reference ID alias
  blockedDates?: string[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Device returned by the Nearby query (GET /api/devices/nearby).
 * Inherits all Device fields, with optional distance populated by $geoNear or calculated client-side.
 */
export interface NearbyDevice extends Device {
  distance?: number; // Distance in meters or km
  distanceMeters?: number; // Explicit distance in meters if populated by MongoDB $geoNear
}

/**
 * Pagination metadata returned by paginated list endpoints.
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * API Response for GET /api/devices
 */
export interface DeviceListResponse {
  success?: boolean;
  data: Device[];
  pagination?: PaginationMeta;
  message?: string;
}

/**
 * API Response for GET /api/devices/:id
 */
export interface DeviceDetailResponse {
  success?: boolean;
  data: Device;
  message?: string;
}

/**
 * API Response for GET /api/devices/nearby
 */
export interface NearbyDeviceListResponse {
  success?: boolean;
  data: NearbyDevice[];
  message?: string;
}

/**
 * Supported query parameters for GET /api/devices
 */
export interface DeviceQueryParams {
  q?: string;
  keyword?: string; // Optional backend alias for text search
  category?: DeviceCategory;
  page?: number;
  limit?: number;
  sort?: string;
}

/**
 * Supported query parameters for GET /api/devices/nearby
 */
export interface NearbyQueryParams {
  lat: number;
  lng: number;
  latitude?: number; // Optional alias
  longitude?: number; // Optional alias
  radius?: number; // Search radius in meters
  distance?: number; // Optional alias for radius
}

