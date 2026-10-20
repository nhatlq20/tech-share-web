import './config/env.js';
import http from 'node:http';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import deviceRoutes from './routes/deviceRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import ownerRoutes from './routes/ownerRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import { initSocket } from './socket.js';
import { errorHandler, notFound } from './middlewares/errorMiddleware.js';
import aiCompareRoutes from "../src/routes/aiRoutes.js";
const app = express();
const PORT = Number(process.env.PORT) || 5000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    project: 'TechShare Express + MongoDB Backend',
    dbState: mongoose.connection.readyState,
    dbName: mongoose.connection.name,
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chats', chatRoutes);
app.use("/api/ai", aiCompareRoutes);
// Error handlers
app.use(notFound);
app.use(errorHandler);

// Process Safety Handlers
process.on('unhandledRejection', (reason) => {
  console.warn('⚠️ [SERVER] Unhandled Rejection:', reason?.message || reason);
});

process.on('uncaughtException', (err) => {
  console.error('❌ [SERVER] Uncaught Exception:', err?.message || err);
});

// Start server
const startServer = async () => {
  await connectDB();

  const httpServer = http.createServer(app);
  initSocket(httpServer);

  httpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ [SERVER] Cổng ${PORT} đang bị chiếm dụng bởi tiến trình khác (EADDRINUSE).`);
      console.error(`👉 Hãy kiểm tra và đóng tiến trình đang chiếm cổng ${PORT}, hoặc đổi PORT trong .env.`);
    } else {
      console.error('❌ [SERVER] Lỗi khởi động HTTP Server:', err);
    }
    process.exit(1);
  });

  httpServer.listen(PORT, () => {
    console.log(`🚀 TechShare Server running on http://localhost:${PORT} (Socket.IO enabled)`);
  });
};

startServer().catch(() => {
  console.error('Backend startup aborted; Device API is not ready.');
  process.exitCode = 1;
});
