import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let ioInstance = null;

/**
 * Khởi tạo Socket.IO Server với xác thực JWT và quản lý Room
 */
export const initSocket = (httpServer) => {
  if (ioInstance) {
    return ioInstance;
  }

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3001';

  ioInstance = new Server(httpServer, {
    cors: {
      origin: [clientUrl, 'http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'],
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Middleware xác thực JWT cho từng socket connection
  ioInstance.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers?.authorization &&
          socket.handshake.headers.authorization.split(' ')[1]);

      if (!token) {
        // Cho phép kết nối nhưng gắn anonymous nếu chưa đăng nhập
        socket.userId = null;
        return next();
      }

      const secret = process.env.JWT_SECRET || 'techshare_mma301_super_secret_jwt_key_2026';
      const decoded = jwt.verify(token, secret);
      socket.userId = (decoded.id || decoded._id || decoded.userId)?.toString();
      socket.user = decoded;
      return next();
    } catch (err) {
      console.warn('⚠️ Socket authentication failed:', err.message);
      // Vẫn cho phép kết nối để không crash client, nhưng userId = null
      socket.userId = null;
      return next();
    }
  });

  ioInstance.on('connection', (socket) => {
    // 1. Tự động tham gia room cá nhân nếu đã xác thực
    if (socket.userId) {
      const userRoom = `user_${socket.userId}`;
      socket.join(userRoom);
      console.log(`🔌 [Socket.IO] User ${socket.userId} connected and joined room: ${userRoom}`);
    }

    // 2. Tham gia phòng chat cụ thể theo bookingId
    socket.on('join_chat', (bookingId) => {
      if (!bookingId) return;
      const chatRoom = `chat_${bookingId}`;
      socket.join(chatRoom);
      console.log(`💬 [Socket.IO] Socket ${socket.id} (User: ${socket.userId}) joined: ${chatRoom}`);
    });

    // 3. Rời phòng chat
    socket.on('leave_chat', (bookingId) => {
      if (!bookingId) return;
      const chatRoom = `chat_${bookingId}`;
      socket.leave(chatRoom);
      console.log(`👋 [Socket.IO] Socket ${socket.id} left: ${chatRoom}`);
    });

    // 4. Bắn trạng thái đang soạn tin (Typing indicator)
    socket.on('typing', ({ bookingId }) => {
      if (!bookingId) return;
      socket.to(`chat_${bookingId}`).emit('user_typing', {
        bookingId,
        userId: socket.userId,
      });
    });

    // 5. Bắn trạng thái dừng soạn tin (Stop typing)
    socket.on('stop_typing', ({ bookingId }) => {
      if (!bookingId) return;
      socket.to(`chat_${bookingId}`).emit('user_stop_typing', {
        bookingId,
        userId: socket.userId,
      });
    });

    socket.on('disconnect', () => {
      // Clean up handled automatically by Socket.IO
    });
  });

  return ioInstance;
};

/**
 * Lấy instance Socket.IO hiện tại để emit từ Controller
 */
export const getIO = () => {
  if (!ioInstance) {
    console.warn('⚠️ Socket.IO has not been initialized yet.');
  }
  return ioInstance;
};

export default {
  initSocket,
  getIO,
};

