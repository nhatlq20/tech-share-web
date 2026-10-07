/**
 * TechShare Design System - System Config, API Endpoints & Business Thresholds
 * 
 * QUY CHUẨN CHỐNG HARDCODE (NO HARDCODING RULE):
 * Toàn bộ URL endpoint, timeouts, magic numbers, phân trang và ngưỡng logic.
 */

export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  TIMEOUT_MS: 15000,
  ENDPOINTS: {
    ADMIN_KPI: '/admin/kpi',
    ADMIN_DEVICES: '/admin/devices',
    ADMIN_USERS: '/admin/users',
    ADMIN_EKYC: '/admin/ekyc',
    ADMIN_TOGGLE_USER: (userId: string) => `/admin/users/${userId}/status`,
    ADMIN_DELETE_DEVICE: (deviceId: string) => `/admin/devices/${deviceId}`,
    ADMIN_APPROVE_EKYC: (requestId: string) => `/admin/ekyc/${requestId}/approve`,
    ADMIN_REJECT_EKYC: (requestId: string) => `/admin/ekyc/${requestId}/reject`,
    OWNER_KPI: '/owner/kpi',
    OWNER_DEVICES: '/devices/my-devices',
    OWNER_TOGGLE_DEVICE: (deviceId: string) => `/devices/${deviceId}/status`,
    OWNER_BLOCKED_DATES: (deviceId: string) => `/devices/${deviceId}/blocked-dates`,
    OWNER_BOOKINGS: '/bookings/owner',
    OWNER_APPROVE_BOOKING: (bookingId: string) => `/bookings/${bookingId}/approve`,
    OWNER_REJECT_BOOKING: (bookingId: string) => `/bookings/${bookingId}/reject`,
    OWNER_HANDOVER_QR: (bookingId: string) => `/bookings/${bookingId}/handover`,
    OWNER_COMPLETE_BOOKING: (bookingId: string) => `/bookings/${bookingId}/complete`,
    OWNER_ANALYTICS: '/devices/owner/analytics',
    OWNER_WALLET: '/wallet/me',
    AI_GENERATE_DESCRIPTION: '/ai/generate-description',
    DEVICES: '/devices',
    DEVICE_BY_ID: (id: string) => `/devices/${id}`,
  },
} as const;

export const MAGIC_NUMBERS = {
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
} as const;

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'techshare_token',
  USER_DATA: 'techshare_user',
  THEME_MODE: 'techshare_theme',
} as const;

const CONFIG = {
  API_CONFIG,
  MAGIC_NUMBERS,
  STORAGE_KEYS,
};

export default CONFIG;

