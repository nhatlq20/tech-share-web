import api from "./api.js";
import { API_CONFIG, MAGIC_NUMBERS } from "../constants/config";

/**
 * Normalizes category query parameter.
 * Treats 'All', 'all', or empty strings as undefined so backend returns all categories.
 */
const normalizeCategory = (category) => {
  if (!category) return undefined;
  const trimmed = String(category).trim();
  if (trimmed.toLowerCase() === "all") return undefined;
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

  if (typeof params.page === "number" && params.page > 0) {
    cleanParams.page = params.page;
  }

  if (typeof params.limit === "number" && params.limit > 0) {
    cleanParams.limit = params.limit;
  }

  if (params.sort && typeof params.sort === "string" && params.sort.trim()) {
    cleanParams.sort = params.sort.trim();
  }

  const response = await api.get("/devices", { params: cleanParams });

  // Handle direct array returns if backend doesn't use the standard wrapper
  if (Array.isArray(response)) {
    return {
      success: true,
      data: response,
    };
  }

  // Handle standard wrapper with data array
  if (
    response &&
    typeof response === "object" &&
    Array.isArray(response.data)
  ) {
    return response;
  }

  // Reject invalid response shapes (such as placeholder objects { message: '...' })
  const errorMessage =
    response && typeof response === "object" && "message" in response
      ? String(response.message)
      : "Invalid response format from server";
  throw new Error(errorMessage);
};

/**
 * Fetches a single device detail by its ID.
 *
 * @param {string} deviceId Unique identifier of the device
 * @returns {Promise<Object>}
 */
export const getDeviceById = async (deviceId) => {
  if (!deviceId || typeof deviceId !== "string" || !deviceId.trim()) {
    throw new Error("Device ID is required");
  }

  const response = await api.get(
    `/devices/${encodeURIComponent(deviceId.trim())}`,
  );

  // Handle direct device object returns if backend doesn't use the standard wrapper
  if (
    response &&
    typeof response === "object" &&
    !("data" in response) &&
    "_id" in response
  ) {
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

  if (!Number.isFinite(lat) || Math.abs(lat) > 90) {
    throw new Error("Valid latitude is required for nearby devices query");
  }

  if (!Number.isFinite(lng) || Math.abs(lng) > 180) {
    throw new Error("Valid longitude is required for nearby devices query");
  }

  const cleanParams = {
    lat,
    lng,
  };

  const radius = params.radius ?? params.distance;
  if (typeof radius === "number" && !Number.isNaN(radius) && radius > 0) {
    cleanParams.radius = radius;
  }

  if (params.page != null) cleanParams.page = params.page;
  if (params.limit != null) cleanParams.limit = params.limit;

  const response = await api.get("/devices/nearby", { params: cleanParams });

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
  if (
    !Number.isFinite(params.lat) ||
    Math.abs(params.lat) > 90 ||
    !Number.isFinite(params.lng) ||
    Math.abs(params.lng) > 180
  ) {
    throw new Error("Valid coordinates are required for recommendations");
  }
  const category = normalizeCategory(params.category);
  const response = await api.get(API_CONFIG.ENDPOINTS.DEVICES_RECOMMENDED, {
    params: {
      lat: params.lat,
      lng: params.lng,
      page: params.page ?? MAGIC_NUMBERS.HOME_RECOMMENDATIONS.INITIAL_PAGE,
      limit: params.limit ?? MAGIC_NUMBERS.HOME_RECOMMENDATIONS.PAGE_SIZE,
      ...(category ? { category } : {}),
    },
  });
  if (
    !response ||
    response.success === false ||
    !Array.isArray(response.data)
  ) {
    throw new Error("Invalid recommended device list response");
  }
  return response;
};
export const getMyDevices = async () => {
  const response = await api.get(API_CONFIG.ENDPOINTS.OWNER_DEVICES);
  const devices = Array.isArray(response?.data)
    ? response.data
    : Array.isArray(response?.devices)
      ? response.devices
      : null;

  if (!response?.success || !devices) {
    throw new Error(
      response?.message || "API không trả về danh sách thiết bị hợp lệ.",
    );
  }

  return { ...response, devices };
};

export const getOwnerDevice = async (deviceId) => {
  const response = await api.get(
    API_CONFIG.ENDPOINTS.OWNER_DEVICE_BY_ID(encodeURIComponent(deviceId)),
  );
  if (!response?.success || !response.data) {
    throw new Error(response?.message || "Không thể tải thông tin thiết bị.");
  }
  return response.data;
};

export const updateOwnerDevice = async (deviceId, values) => {
  const response = await api.patch(
    API_CONFIG.ENDPOINTS.OWNER_UPDATE_DEVICE(encodeURIComponent(deviceId)),
    values,
  );
  if (!response?.success || !response.data) {
    throw new Error(response?.message || "Không thể cập nhật thiết bị.");
  }
  return response.data;
};

export const deleteMyDevice = async (deviceId) => {
  const response = await api.delete(
    API_CONFIG.ENDPOINTS.DELETE_DEVICE.replace(":deviceId", deviceId),
  );

  return response;
};

export const updateMyDeviceStatus = async (deviceId, status) => {
  const response = await api.patch(
    API_CONFIG.ENDPOINTS.OWNER_TOGGLE_DEVICE(deviceId),
    { status },
  );

  if (!response?.success) {
    throw new Error(response?.message || "Không thể cập nhật trạng thái thiết bị.");
  }

  return response;
};

export const deviceService = {
  getDevices,
  getDeviceById,
  getNearbyDevices,
  getRecommendedDevices,
  getMyDevices,
  deleteMyDevice,
  updateMyDeviceStatus,
};

export default deviceService;
