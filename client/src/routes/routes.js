/**
 * Route path constants for TechShare
 */
export const ROUTES = {
  HOME: '/',
  EXPLORE: '/explore',
  DEVICE_DETAIL: '/device/:deviceId',
  DEVICE_DETAIL_LEGACY: '/devices/:id',
  DEVICE_DETAIL_PATH: (deviceId) => `/device/${deviceId}`,
  BOOKING_CHECKOUT: '/booking/:deviceId',
  BOOKING_CHECKOUT_PATH: (deviceId) => `/booking/${deviceId}`,
  MY_BOOKINGS: '/my-bookings',
  NEARBY: '/nearby',
  LOGIN: '/login',
  REGISTER: '/register',
  // Admin Hub Routes
  ADMIN: '/admin',
  ADMIN_DASHBOARD: '/admin/dashboard',
  DASHBOARD: '/admin/dashboard',
  ADMIN_LOGIN: '/admin/login',
  PROFILE: '/profile',

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
