/**
 * TechShare Design System - System Config, API Endpoints & Business Thresholds (Pure JavaScript)
 *
 * QUY CHUẨN CHỐNG HARDCODE (NO HARDCODING RULE):
 * Toàn bộ URL endpoint, timeouts, magic numbers, phân trang và ngưỡng logic.
 */

export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
  TIMEOUT_MS: 15000,
  ENDPOINTS: {
    ADMIN_KPI: "/admin/kpi",
    ADMIN_DEVICES: "/admin/devices",
    ADMIN_USERS: "/admin/users",
    ADMIN_EKYC: "/admin/ekyc",
    ADMIN_TOGGLE_USER: (userId) => `/admin/users/${userId}/status`,
    ADMIN_DELETE_DEVICE: (deviceId) => `/admin/devices/${deviceId}`,
    ADMIN_APPROVE_EKYC: (requestId) => `/admin/ekyc/${requestId}/approve`,
    ADMIN_REJECT_EKYC: (requestId) => `/admin/ekyc/${requestId}/reject`,
    OWNER_KPI: "/owner/kpi",
    OWNER_DEVICES: "/owner/devices",
    DELETE_DEVICE: "/devices/:deviceId",
    OWNER_TOGGLE_DEVICE: (deviceId) => `/owner/devices/${deviceId}/status`,
    OWNER_BLOCKED_DATES: (deviceId) => `/owner/devices/${deviceId}/blocked-dates`,
    OWNER_BOOKINGS: "/owner/bookings",
    OWNER_APPROVE_BOOKING: (bookingId) => `/owner/bookings/${bookingId}/approve`,
    OWNER_REJECT_BOOKING: (bookingId) => `/owner/bookings/${bookingId}/reject`,
    OWNER_HANDOVER_QR: (bookingId) => `/owner/bookings/${bookingId}/handover`,
    OWNER_COMPLETE_BOOKING: (bookingId) => `/owner/bookings/${bookingId}/complete`,
    OWNER_ANALYTICS: "/owner/analytics",
    OWNER_WALLET: "/wallet/me",
    AI_GENERATE_DESCRIPTION: "/ai/generate-description",
    DEVICES: "/devices",
    DEVICES_RECOMMENDED: "/devices/recommended",
    DEVICE_BY_ID: (id) => `/devices/${id}`,
    DEVICE_AVAILABILITY: (id) => `/devices/${id}/availability`,
    BOOKINGS: "/bookings",
    BOOKINGS_MY: "/bookings/my-bookings",
    BOOKING_BY_ID: (id) => `/bookings/${id}`,
    BOOKING_CANCEL: (id) => `/bookings/${id}/cancel`,
    BOOKING_VALIDATE_PRICING: '/bookings/validate-pricing',
    NOTIFICATIONS: '/notifications',
    NOTIFICATIONS_READ_ALL: '/notifications/read-all',
    NOTIFICATIONS_READ: (id) => `/notifications/${id}/read`,
    NOTIFICATIONS_FCM_TOKEN: '/notifications/fcm-token',
    NOTIFICATIONS_TEST: '/notifications/test',
    CHATS_CONVERSATIONS: '/chats/conversations',
    CHATS_UNREAD_COUNT: '/chats/unread-count',
    CHATS_MESSAGES: (bookingId) => `/chats/${bookingId}`,
    CHATS_SEND: (bookingId) => `/chats/${bookingId}/messages`,
    CHATS_READ: (bookingId) => `/chats/${bookingId}/read`,
    CHATS_UPLOAD: '/chats/upload-image',
  },
};

export const MAGIC_NUMBERS = {
  HOME_RECOMMENDATIONS: { INITIAL_PAGE: 1, PAGE_SIZE: 12 },
  // Điểm tín nhiệm Escrow (Trust Score)
  TRUST_SCORE: {
    MAX: 100,
    EXCELLENT_THRESHOLD: 85,
    GOOD_THRESHOLD: 70,
  },

  // Phân trang & Giới hạn
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_PAGE_SIZE: 10,
    MAX_PAGE_SIZE: 50,
  },

  // Giao diện & Tương tác
  UI: {
    TOAST_AUTO_DISMISS_MS: 3500,
    DEBOUNCE_SEARCH_MS: 300,
    AVATAR_MD_PX: 36,
    AVATAR_LG_PX: 56,
    TABLE_MIN_WIDTH_PX: 780,
  },

  // Đặt thuê & Chiết khấu
  BOOKING: {
    MIN_RENTAL_DAYS: 1,
    LONG_RENTAL_TIER_1_DAYS: 3,
    LONG_RENTAL_TIER_1_DISCOUNT_PERCENT: 10,
    LONG_RENTAL_TIER_2_DAYS: 7,
    LONG_RENTAL_TIER_2_DISCOUNT_PERCENT: 20,
    VOUCHER_WELCOME50_DISCOUNT: 50000,
    VOUCHER_WEEKEND10_PERCENT: 10,
    MY_BOOKINGS_PAGE_SIZE: 10,
    CANCEL_REASON_MAX_LENGTH: 300,
    TABLE_SKELETON_ROWS: 4,
  },

  // Biểu đồ SVG
  CHART: {
    DEFAULT_WIDTH: 620,
    DEFAULT_HEIGHT: 220,
    PADDING_X: 40,
    PADDING_Y: 30,
    CURVE_STROKE_WIDTH: 3.5,
  },

  // Tỷ lệ tiền cọc mặc định
  DEPOSIT_RATIO_DEFAULT: 0.7,
};

export const STORAGE_KEYS = {
  AUTH_TOKEN: "techshare_token",
  USER_DATA: "techshare_user",
  THEME_MODE: "techshare_theme",
};

/**
 * Booking lifecycle configuration (mirrors server enum in models/Booking.js)
 */
export const BOOKING_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected',
};

/** Tabs of the My Bookings hub, in display order (key = `status` query param). */
export const MY_BOOKING_TABS = [
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.APPROVED,
  BOOKING_STATUS.ACTIVE,
  BOOKING_STATUS.COMPLETED,
  BOOKING_STATUS.CANCELLED,
];

/** Happy-path progression rendered by the order timeline stepper. */
export const BOOKING_TIMELINE_STEPS = [
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.APPROVED,
  BOOKING_STATUS.ACTIVE,
  BOOKING_STATUS.COMPLETED,
];

/** Terminal statuses that interrupt the happy path. */
export const BOOKING_TERMINAL_STATUSES = [
  BOOKING_STATUS.CANCELLED,
  BOOKING_STATUS.REJECTED,
];

const CONFIG = {
  API_CONFIG,
  MAGIC_NUMBERS,
  STORAGE_KEYS,
  BOOKING_STATUS,
};

export default CONFIG;
