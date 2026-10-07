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

  // Owner Hub Routes
  OWNER: '/owner',
  OWNER_DASHBOARD: '/owner/dashboard',
  OWNER_DEVICES: '/owner/devices',
  OWNER_BOOKINGS: '/owner/bookings',
  OWNER_CALENDAR: '/owner/calendar',
  OWNER_ANALYTICS: '/owner/analytics',
  OWNER_WALLET: '/owner/wallet',
};

export default ROUTES;
