/**
 * Booking Service – renter-side booking APIs (My Bookings hub, detail, cancel).
 * All requests go through the shared `api` client (JWT header + base URL handled there).
 */
import { api } from './api.js';
import { API_CONFIG, MAGIC_NUMBERS } from '../constants/config.ts';

/**
 * GET /api/bookings/my-bookings
 * @returns {Promise<{ data: object[], counts: Record<string, number>, pagination: object }>}
 */
export const fetchMyBookings = async ({
  status,
  page = MAGIC_NUMBERS.PAGINATION.DEFAULT_PAGE,
  limit = MAGIC_NUMBERS.BOOKING.MY_BOOKINGS_PAGE_SIZE,
  signal,
} = {}) => {
  const res = await api.get(API_CONFIG.ENDPOINTS.BOOKINGS_MY, {
    params: { status, page, limit },
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
  const res = await api.get(API_CONFIG.ENDPOINTS.BOOKING_BY_ID(bookingId), { signal });
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

const bookingService = {
  fetchMyBookings,
  fetchBookingById,
  cancelBooking,
};

export default bookingService;
