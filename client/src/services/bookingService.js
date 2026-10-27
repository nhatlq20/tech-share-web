/**
 * Booking Service – renter-side booking APIs (My Bookings hub, detail, cancel).
 * All requests go through the shared `api` client (JWT header + base URL handled there).
 */
import { api } from './api.js';
import { API_CONFIG, MAGIC_NUMBERS, STORAGE_KEYS } from '../constants/config.js';

const getStoredUserId = () => {
  if (typeof window === 'undefined') return undefined;
  try {
    const rawUser = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      const id = parsed?._id || parsed?.id || parsed?.userId;
      if (id) return String(id);
    }
    const rawAcc = localStorage.getItem('techshare_account');
    if (rawAcc) {
      const parsedAcc = JSON.parse(rawAcc);
      const id = parsedAcc?.userId || parsedAcc?._id || parsedAcc?.id;
      if (id) return String(id);
    }
  } catch {
    // ignore parse errors
  }
  return undefined;
};

/**
 * GET /api/bookings/my-bookings
 * @returns {Promise<{ data: object[], counts: Record<string, number>, pagination: object }>}
 */
export const fetchMyBookings = async ({
  status,
  page = MAGIC_NUMBERS.PAGINATION.DEFAULT_PAGE,
  limit = MAGIC_NUMBERS.BOOKING.MY_BOOKINGS_PAGE_SIZE,
  renterId,
  signal,
} = {}) => {
  const effectiveRenterId = renterId || getStoredUserId();
  const res = await api.get(API_CONFIG.ENDPOINTS.BOOKINGS_MY, {
    params: { status, page, limit, renterId: effectiveRenterId },
    signal,
  });

  return {
    data: Array.isArray(res?.data) ? res.data : [],
    counts: res?.counts || {},
    pagination: res?.pagination || { page, limit, total: 0, totalPages: 1 },
  };
};

/**
 * GET /api/bookings/:id
 */
export const fetchBookingById = async (bookingId, { signal } = {}) => {
  const effectiveRenterId = getStoredUserId();
  const res = await api.get(API_CONFIG.ENDPOINTS.BOOKING_BY_ID(bookingId), {
    params: { renterId: effectiveRenterId },
    signal,
  });
  return res?.data || null;
};

/**
 * PATCH /api/bookings/:id/cancel
 */
export const cancelBooking = async (bookingId, reason = '') => {
  const res = await api.patch(API_CONFIG.ENDPOINTS.BOOKING_CANCEL(bookingId), {
    reason: reason.trim(),
  });
  return res?.data || null;
};

/**
 * POST /api/bookings/:id/extend
 */
export const requestBookingExtension = async (bookingId, { days, note = '' }) => {
  const res = await api.post(API_CONFIG.ENDPOINTS.BOOKING_EXTEND(bookingId), {
    days: Number(days),
    note: (note || '').trim(),
  });
  return res?.data || null;
};

const bookingService = {
  fetchMyBookings,
  fetchBookingById,
  cancelBooking,
  requestBookingExtension,
};

export default bookingService;
