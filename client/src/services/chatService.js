import { api } from './api.js';
import { API_CONFIG, STORAGE_KEYS } from '../constants/config.js';

/**
 * Lấy Bearer Authorization headers từ localStorage
 */
const getAuthHeaders = () => {
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * 1. Lấy danh sách hội thoại theo các đơn thuê của người dùng
 */
export const getConversations = async () => {
  return api.get(API_CONFIG.ENDPOINTS.CHATS_CONVERSATIONS, {
    headers: getAuthHeaders(),
  });
};

/**
 * Lấy tổng số tin nhắn chưa đọc của người dùng
 */
export const getUnreadChatCount = async () => {
  return api.get(API_CONFIG.ENDPOINTS.CHATS_UNREAD_COUNT, {
    headers: getAuthHeaders(),
  });
};

/**
 * 2. Tải lịch sử tin nhắn của một đơn thuê
 */
export const getMessages = async (bookingId) => {
  if (!bookingId) throw new Error('Booking ID is required');
  return api.get(API_CONFIG.ENDPOINTS.CHATS_MESSAGES(bookingId), {
    headers: getAuthHeaders(),
  });
};

/**
 * 3. Gửi tin nhắn mới (text, image, location, quick_template)
 */
export const sendMessage = async (bookingId, payload) => {
  if (!bookingId) throw new Error('Booking ID is required');
  return api.post(API_CONFIG.ENDPOINTS.CHATS_SEND(bookingId), payload, {
    headers: getAuthHeaders(),
  });
};

/**
 * 4. Đánh dấu đã đọc toàn bộ tin nhắn trong đơn thuê
 */
export const markAsRead = async (bookingId) => {
  if (!bookingId) throw new Error('Booking ID is required');
  return api.patch(API_CONFIG.ENDPOINTS.CHATS_READ(bookingId), {}, {
    headers: getAuthHeaders(),
  });
};

/**
 * 5. Upload ảnh cho tin nhắn
 */
export const uploadChatImage = async (fileOrBase64) => {
  return api.post(
    API_CONFIG.ENDPOINTS.CHATS_UPLOAD,
    { image: fileOrBase64 },
    { headers: getAuthHeaders() }
  );
};

export const chatService = {
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
  uploadChatImage,
};

export default chatService;

