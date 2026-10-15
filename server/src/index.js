import './config/env.js';
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
import { errorHandler, notFound } from './middlewares/errorMiddleware.js';

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

// Error handlers
app.use(notFound);
app.use(errorHandler);

// Start server
const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 TechShare Server running on http://localhost:${PORT}`);
  });
};

startServer().catch(() => {
  console.error('Backend startup aborted; Device API is not ready.');
  process.exitCode = 1;
});
