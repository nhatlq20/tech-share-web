import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import deviceRoutes from './routes/deviceRoutes.js';
import { errorHandler, notFound } from './middlewares/errorMiddleware.js';

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// Middlewares
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    project: 'TechShare Express + MongoDB Backend',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);

// Error handlers
app.use(notFound);
app.use(errorHandler);

// Start server
const startServer = async () => {
  // Kết nối MongoDB nếu có biến môi trường MONGO_URI
  if (process.env.MONGO_URI) {
    await connectDB();
  } else {
    console.log('⚠️ MONGO_URI chưa được cấu hình trong .env, server chạy ở chế độ standalone.');
  }

  app.listen(PORT, () => {
    console.log(`🚀 TechShare Server running on http://localhost:${PORT}`);
  });
};

startServer();
