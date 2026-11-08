import { findChat, resolveChatUser } from './services/chatIdentity.js';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import { verifyOrDecodeToken } from './middlewares/authMiddleware.js';

let ioInstance = null;

/**
 * Khởi tạo Socket.IO Server với xác thực JWT và quản lý Room
 */
export const initSocket = (httpServer) => {
  if (ioInstance) {
    return ioInstance;
  }

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3001';
  const customOrigins = clientUrl.split(',').map((u) => u.trim());
  const allowedOrigins = Array.from(new Set([
    ...customOrigins,
    ...(process.env.NODE_ENV !== 'production'
      ? ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001']
      : []),
  ]));

  ioInstance = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Middleware xác thực JWT cho từng socket connection
  ioInstance.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers?.authorization &&
          socket.handshake.headers.authorization.split(' ')[1]);

      if (!token) {
        socket.userId = null;
        return next();
      }

      const decoded = verifyOrDecodeToken(token);

      if (decoded) {
        const profile = await resolveChatUser(decoded);
        socket.userId = profile && profile.isActive !== false ? String(profile._id) : null;
        socket.user = decoded;
      } else {
        socket.userId = null;
      }

      return next();
    } catch (err) {
      console.warn('⚠️ Socket authentication failed:', err.message);
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
    if (socket.userId && socket.user?.accountId && socket.user.accountId.toString() !== socket.userId) {
      const accountRoom = `user_${socket.user.accountId.toString()}`;
      socket.join(accountRoom);
      console.log(`🔌 [Socket.IO] User connected and joined account room: ${accountRoom}`);
    }

    // 2. Tham gia phòng chat cụ thể theo bookingId với kiểm tra phân quyền (Room Authorization)
    const handleJoinBookingChat = async (bookingId, callback) => {
      try {
        if (!bookingId || !mongoose.isValidObjectId(bookingId)) {
          if (typeof callback === 'function') callback({ success: false, message: 'Invalid booking ID' });
          socket.emit('error', { message: 'Invalid booking ID' });
          return;
        }

        if (!socket.userId) {
          if (typeof callback === 'function') callback({ success: false, message: 'Authentication required' });
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        // Tìm thông tin booking để kiểm tra quyền tham gia
        let booking = null;
        try {
          booking = await findChat(bookingId);
        } catch (dbErr) {
          console.warn('⚠️ Lỗi truy vấn Booking trong Socket handler:', dbErr.message);
        }

        if (!booking && mongoose.connection.db) {
          try {
            booking = await mongoose.connection.db.collection('bookings').findOne({
              _id: new mongoose.Types.ObjectId(String(bookingId)),
            });
          } catch {}
        }

        if (!booking) {
          if (typeof callback === 'function') callback({ success: false, message: 'Booking not found' });
          socket.emit('error', { message: 'Booking not found' });
          return;
        }

        const renterIdStr = (booking.renterId?._id || booking.renterId || booking.renter?._id || booking.renter)?.toString();
        const ownerIdStr = (booking.ownerId?._id || booking.ownerId || booking.owner?._id || booking.owner)?.toString();
        const currentUserId = socket.userId?.toString();
        const isParticipant = [renterIdStr, ownerIdStr].includes(socket.userId);

        if (!isParticipant) {
          if (typeof callback === 'function') callback({ success: false, message: 'Access denied to this booking chat' });
          socket.emit('error', { message: 'Access denied to this booking chat' });
          return;
        }

        const chatRoom = `chat_${bookingId}`;
        socket.join(chatRoom);
        console.log(`💬 [Socket.IO] Socket ${socket.id} (User: ${socket.userId}) joined: ${chatRoom}`);
        if (typeof callback === 'function') callback({ success: true, room: chatRoom });
      } catch (err) {
        console.error('Error in handleJoinBookingChat:', err);
        if (typeof callback === 'function') callback({ success: false, message: err.message });
      }
    };

    socket.on('join_chat', (bookingId, callback) => handleJoinBookingChat(bookingId, callback));
    socket.on('join_booking_chat', (bookingId, callback) => handleJoinBookingChat(bookingId, callback));

    // 3. Rời phòng chat
    const handleLeaveChat = (bookingId) => {
      if (!bookingId) return;
      const chatRoom = `chat_${bookingId}`;
      socket.leave(chatRoom);
      console.log(`👋 [Socket.IO] Socket ${socket.id} left: ${chatRoom}`);
    };

    socket.on('leave_chat', handleLeaveChat);
    socket.on('leave_booking_chat', handleLeaveChat);

    // 4. Bắn trạng thái đang soạn tin (Typing indicator)
    socket.on('typing', ({ bookingId }) => {
      if (!bookingId || !socket.rooms.has(`chat_${bookingId}`)) return;
      socket.to(`chat_${bookingId}`).emit('user_typing', {
        bookingId,
        userId: socket.userId,
      });
    });

    // 5. Bắn trạng thái dừng soạn tin (Stop typing)
    socket.on('stop_typing', ({ bookingId }) => {
      if (!bookingId || !socket.rooms.has(`chat_${bookingId}`)) return;
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
