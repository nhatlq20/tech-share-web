import { io } from 'socket.io-client';
import { STORAGE_KEYS } from '../constants/config.js';

let socket = null;
let socketToken = null;
const chatRooms = new Set();

const getSocketServerUrl = () => {
  const apiUrl = process.env.REACT_APP_API_URL;
  if (apiUrl) {
    // If REACT_APP_API_URL is 'http://localhost:8000/api', extract 'http://localhost:8000'
    try {
      const url = new URL(apiUrl);
      return url.origin;
    } catch {
      return 'http://localhost:8000';
    }
  }
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:8000';
  }
  return '/';
};

/**
 * Khởi tạo hoặc lấy kết nối Socket.IO Client Singleton
 */
export const connectSocket = () => {
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

  if (socket && socketToken === token) {
    return socket;
  }

  socket?.disconnect();
  socketToken = token;
  const serverUrl = getSocketServerUrl();

  socket = io(serverUrl, {
    auth: {
      token: token || '',
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1500,
    timeout: 20000,
  });

  socket.on('connect', () => {
    chatRooms.forEach((id) => socket.emit('join_chat', id));
    console.log('🟢 [Socket.IO] Connected to chat server:', socket.id);
  });

  socket.on('connect_error', (error) => {
    console.warn('⚠️ [Socket.IO] Connection error:', error.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔴 [Socket.IO] Disconnected:', reason);
  });

  return socket;
};

/**
 * Ngắt kết nối socket khi đăng xuất
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    socketToken = null;
    chatRooms.clear();
  }
};

/**
 * Lấy instance socket hiện tại
 */
export const getSocket = () => {
  if (!socket) {
    return connectSocket();
  }
  return socket;
};

/**
 * Tham gia phòng chat của một booking
 */
export const joinChat = (bookingId) => {
  const s = getSocket();
  if (s && bookingId) {
    chatRooms.add(bookingId);
    if (s.connected) s.emit('join_chat', bookingId);
  }
};

/**
 * Rời phòng chat
 */
export const leaveChat = (bookingId) => {
  const s = getSocket();
  if (s && bookingId) {
    chatRooms.delete(bookingId);
    if (s.connected) s.emit('leave_chat', bookingId);
  }
};

/**
 * Bắn tín hiệu đang soạn tin
 */
export const sendTyping = (bookingId) => {
  const s = getSocket();
  if (s && bookingId) {
    s.emit('typing', { bookingId });
  }
};

/**
 * Bắn tín hiệu dừng soạn tin
 */
export const sendStopTyping = (bookingId) => {
  const s = getSocket();
  if (s && bookingId) {
    s.emit('stop_typing', { bookingId });
  }
};

const socketService = {
  connectSocket,
  disconnectSocket,
  getSocket,
  joinChat,
  leaveChat,
  sendTyping,
  sendStopTyping,
};

export default socketService;
