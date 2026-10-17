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
  MY_BOOKINGS_TAB_PATH: (status) => `/my-bookings?status=${encodeURIComponent(status)}`,
  BOOKING_DETAIL: '/my-bookings/:bookingId',
  BOOKING_DETAIL_PATH: (bookingId) => `/my-bookings/${encodeURIComponent(bookingId)}`,
  NEARBY: '/nearby',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  // Admin Hub Routes
  ADMIN: '/admin',
  ADMIN_DASHBOARD: '/admin/dashboard',
  DASHBOARD: '/admin/dashboard',
  ADMIN_USERS: '/admin/users',
  ADMIN_USER_MANAGER: '/admin/user-manager',
  ADMIN_DEVICES: '/admin/devices',
  ADMIN_DEVICE_MANAGER: '/admin/device-manager',
  ADMIN_EKYC: '/admin/ekyc',
  ADMIN_EKYC_VERIFICATION: '/admin/ekyc-verification',
  ADMIN_SETTINGS: '/admin/settings',
  ADMIN_LOGIN: '/admin/login',
  PROFILE: '/profile',
  MESSAGES: '/messages',
  MESSAGES_CHAT: '/messages/:bookingId',
  MESSAGES_PATH: (bookingId) => `/messages/${bookingId}`,

  // Owner Hub Routes
  OWNER: '/owner',
  OWNER_DASHBOARD: '/owner/dashboard',
  OWNER_DEVICES: '/owner/devices',
  OWNER_DEVICE_NEW: '/owner/devices/new',
  OWNER_DEVICE_EDIT: '/owner/devices/:deviceId/edit',
  OWNER_DEVICE_EDIT_PATH: (deviceId) => `/owner/devices/${deviceId}/edit`,
  OWNER_BOOKINGS: '/owner/bookings',
  OWNER_CALENDAR: '/owner/calendar',
  OWNER_ANALYTICS: '/owner/analytics',
  OWNER_WALLET: '/owner/wallet',
  OWNER_AI_ASSISTANT: '/owner/ai-assistant',
  OWNER_MESSAGES: '/owner/messages',
  OWNER_MESSAGES_CHAT: '/owner/messages/:bookingId',
  OWNER_MESSAGES_PATH: (bookingId) => `/owner/messages/${bookingId}`,
};

export default ROUTES;
