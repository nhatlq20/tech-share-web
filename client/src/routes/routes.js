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
  DASHBOARD: '/dashboard',
  ADMIN: '/admin',
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
