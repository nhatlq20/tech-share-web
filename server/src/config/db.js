import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

/**
 * MongoDB connection helper using Mongoose
 * Hỗ trợ cả MONGODB_URI và MONGO_URI từ biến môi trường
 */
export const connectDB = async () => {
  try {
    const mongoUri =
      process.env.MONGODB_URI ||
      process.env.MONGO_URI ||
      'mongodb://localhost:27017/techshare';

    const conn = await mongoose.connect(mongoUri);

    console.log(
      `✅ MongoDB Connected: ${conn.connection.host} (DB: ${conn.connection.name})`
    );

    // Lắng nghe sự kiện kết nối của Mongoose
    mongoose.connection.on('error', (err) => {
      console.error(`❌ MongoDB Runtime Error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected.');
    });

    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

/**
 * Ngắt kết nối MongoDB an toàn (Graceful shutdown hoặc testing)
 */
export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed gracefully.');
  } catch (error) {
    console.error(`Error closing MongoDB connection: ${error.message}`);
  }
};

export default connectDB;
