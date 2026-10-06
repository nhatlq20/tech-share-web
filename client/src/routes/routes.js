/**
 * Route path constants for TechShare
 */
export const ROUTES = {
  HOME: '/',
  EXPLORE: '/explore',
  DEVICE_DETAIL: '/device/:deviceId',
  DEVICE_DETAIL_LEGACY: '/devices/:id',
  DEVICE_DETAIL_PATH: (deviceId) => `/device/${deviceId}`,
  NEARBY: '/nearby',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  ADMIN: '/admin',
};
