import api from './api.js';
import { API_CONFIG, MAGIC_NUMBERS } from '../constants/config';

/**
 * Normalizes category query parameter.
 * Treats 'All', 'all', or empty strings as undefined so backend returns all categories.
 */
const normalizeCategory = (category) => {
  if (!category) return undefined;
  const trimmed = String(category).trim();
  if (trimmed.toLowerCase() === 'all') return undefined;
  return trimmed;
};

/**
 * Fetches paginated devices list with optional search query, category, sort, and pagination.
 *
 * @param {Object} params Query filters (q, category, page, limit, sort)
 * @returns {Promise<Object>}
 */
export const getDevices = async (params = {}) => {
  const cleanParams = {};

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

  if (params.sort && typeof params.sort === 'string' && params.sort.trim()) {
    cleanParams.sort = params.sort.trim();
  }

  const response = await api.get('/devices', { params: cleanParams });

  // Handle direct array returns if backend doesn't use the standard wrapper
  if (Array.isArray(response)) {
    return {
      success: true,
      data: response,
    };
  }

  // Handle standard wrapper with data array
  if (response && typeof response === 'object' && Array.isArray(response.data)) {
    return response;
  }

  // Reject invalid response shapes (such as placeholder objects { message: '...' })
  const errorMessage =
    response && typeof response === 'object' && 'message' in response
      ? String(response.message)
      : 'Invalid response format from server';
  throw new Error(errorMessage);
};

/**
 * Fetches a single device detail by its ID.
 *
 * @param {string} deviceId Unique identifier of the device
 * @returns {Promise<Object>}
 */
export const getDeviceById = async (deviceId) => {
  if (!deviceId || typeof deviceId !== 'string' || !deviceId.trim()) {
    throw new Error('Device ID is required');
  }

  const response = await api.get(`/devices/${encodeURIComponent(deviceId.trim())}`);

  // Handle direct device object returns if backend doesn't use the standard wrapper
  if (response && typeof response === 'object' && !('data' in response) && '_id' in response) {
    return {
      success: true,
      data: response,
    };
  }

  return response;
};

/**
 * Fetches devices near a geographical location (latitude, longitude).
 *
 * @param {Object} params Geographical query parameters (lat, lng, optional radius in meters)
 * @returns {Promise<Object>}
 */
export const getNearbyDevices = async (params = {}) => {
  const lat = params.lat ?? params.latitude;
  const lng = params.lng ?? params.longitude;

  if (typeof lat !== 'number' || Number.isNaN(lat)) {
    throw new Error('Valid latitude is required for nearby devices query');
  }

  if (typeof lng !== 'number' || Number.isNaN(lng)) {
    throw new Error('Valid longitude is required for nearby devices query');
  }

  const cleanParams = {
    lat,
    lng,
  };

  const radius = params.radius ?? params.distance;
  if (typeof radius === 'number' && !Number.isNaN(radius) && radius > 0) {
    cleanParams.radius = radius;
  }

  if (params.page != null) cleanParams.page = params.page;
  if (params.limit != null) cleanParams.limit = params.limit;

  const response = await api.get('/devices/nearby', { params: cleanParams });

  // Handle direct array returns if backend doesn't use the standard wrapper
  if (Array.isArray(response)) {
    return {
      success: true,
      data: response,
    };
  }

  return response;
};

export const getRecommendedDevices = async (params = {}) => {
  if (!Number.isFinite(params.lat) || Math.abs(params.lat) > 90 ||
      !Number.isFinite(params.lng) || Math.abs(params.lng) > 180) {
    throw new Error('Valid coordinates are required for recommendations');
  }
  const response = await api.get(API_CONFIG.ENDPOINTS.DEVICES_RECOMMENDED, {
    params: {
      lat: params.lat, lng: params.lng,
      page: params.page ?? MAGIC_NUMBERS.HOME_RECOMMENDATIONS.INITIAL_PAGE,
      limit: params.limit ?? MAGIC_NUMBERS.HOME_RECOMMENDATIONS.PAGE_SIZE,
    },
  });
  if (!response || response.success === false || !Array.isArray(response.data)) {
    throw new Error('Invalid recommended device list response');
  }
  return response;
};
export const getMyDevices = async () => {
  const response = await api.get(API_CONFIG.ENDPOINTS.OWNER_DEVICES);
console.log(response)
  return response;
};

export const deviceService = {
  getDevices,
  getDeviceById,
  getNearbyDevices,
  getRecommendedDevices,
  getMyDevices,
};

export default deviceService;
