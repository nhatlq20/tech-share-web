import api from './api.js';
import type {
  Device,
  NearbyDevice,
  DeviceListResponse,
  DeviceDetailResponse,
  NearbyDeviceListResponse,
  DeviceQueryParams,
  NearbyQueryParams,
} from '../types/index.js';

/**
 * Normalizes category query parameter.
 * Treats 'All', 'all', or empty strings as undefined so backend returns all categories.
 */
const normalizeCategory = (category?: string): string | undefined => {
  if (!category) return undefined;
  const trimmed = category.trim();
  if (trimmed.toLowerCase() === 'all') return undefined;
  return trimmed;
};

/**
 * Fetches paginated devices list with optional search query, category, sort, and pagination.
 *
 * @param params Query filters (q, category, page, limit, sort)
 * @returns Promise<DeviceListResponse>
 */
export const getDevices = async (
  params: DeviceQueryParams = {}
): Promise<DeviceListResponse> => {
  const cleanParams: Record<string, string | number> = {};

  const q = params.q?.trim() || params.keyword?.trim();
  if (q) {
    cleanParams.q = q;
  }

  const category = normalizeCategory(params.category);
  if (category) {
    cleanParams.category = category;
  }

  if (typeof params.page === 'number' && params.page > 0) {
    cleanParams.page = params.page;
  }

  if (typeof params.limit === 'number' && params.limit > 0) {
    cleanParams.limit = params.limit;
  }

  if (params.sort && params.sort.trim()) {
    cleanParams.sort = params.sort.trim();
  }

  const response = await api.get<DeviceListResponse | Device[]>('/devices', { params: cleanParams });

  // Handle direct array returns if backend doesn't use the standard wrapper
  if (Array.isArray(response)) {
    return {
      success: true,
      data: response,
    };
  }

  return response as DeviceListResponse;
};

/**
 * Fetches a single device detail by its ID.
 *
 * @param deviceId Unique identifier of the device
 * @returns Promise<DeviceDetailResponse>
 */
export const getDeviceById = async (
  deviceId: string
): Promise<DeviceDetailResponse> => {
  if (!deviceId || typeof deviceId !== 'string' || !deviceId.trim()) {
    throw new Error('Device ID is required');
  }

  const response = await api.get<DeviceDetailResponse | Device>(
    `/devices/${encodeURIComponent(deviceId.trim())}`
  );

  // Handle direct device object returns if backend doesn't use the standard wrapper
  if (response && typeof response === 'object' && !('data' in response) && '_id' in response) {
    return {
      success: true,
      data: response as Device,
    };
  }

  return response as DeviceDetailResponse;
};

/**
 * Fetches devices near a geographical location (latitude, longitude).
 *
 * @param params Geographical query parameters (lat, lng, optional radius in meters)
 * @returns Promise<NearbyDeviceListResponse>
 */
export const getNearbyDevices = async (
  params: NearbyQueryParams
): Promise<NearbyDeviceListResponse> => {
  const lat = params.lat ?? params.latitude;
  const lng = params.lng ?? params.longitude;

  if (typeof lat !== 'number' || Number.isNaN(lat)) {
    throw new Error('Valid latitude is required for nearby devices query');
  }

  if (typeof lng !== 'number' || Number.isNaN(lng)) {
    throw new Error('Valid longitude is required for nearby devices query');
  }

  const cleanParams: Record<string, number> = {
    lat,
    lng,
  };

  const radius = params.radius ?? params.distance;
  if (typeof radius === 'number' && !Number.isNaN(radius) && radius > 0) {
    cleanParams.radius = radius;
  }

  const response = await api.get<NearbyDeviceListResponse | NearbyDevice[]>('/devices/nearby', { params: cleanParams });

  // Handle direct array returns if backend doesn't use the standard wrapper
  if (Array.isArray(response)) {
    return {
      success: true,
      data: response,
    };
  }

  return response as NearbyDeviceListResponse;
};

export const deviceService = {
  getDevices,
  getDeviceById,
  getNearbyDevices,
};

export default deviceService;
