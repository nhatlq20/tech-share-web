import dns from 'node:dns';
import mongoose from 'mongoose';
import { getDatabaseConfig } from './env.js';

// Use reliable public DNS to prevent SRV / TXT resolution timeouts on local networks
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore if custom DNS cannot be applied
}

// Optional fallback direct ReplicaSet URI if SRV resolution fails (from environment)
const FALLBACK_DIRECT_URI = process.env.MONGODB_FALLBACK_URI || process.env.MONGODB_DIRECT_URI || null;

export const connectDB = async (
  retries = Number(process.env.DB_MAX_RETRIES) || 1,
  delay = Number(process.env.DB_RETRY_DELAY_MS) || 2000
) => {
  const { uri, source } = getDatabaseConfig();
  let activeUri = uri;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`[DATABASE] Đang thử kết nối lại MongoDB (Lần ${attempt}/${retries})...`);
      }

      const conn = await mongoose.connect(activeUri, {
        serverSelectionTimeoutMS: 12000,
        connectTimeoutMS: 12000,
        socketTimeoutMS: 45000,
      });

      const devices = conn.connection.db.collection('devices');
      const [total, notDeleted] = await Promise.all([
        devices.countDocuments({}),
        devices.countDocuments({ isDeleted: { $ne: true } }),
      ]);

      console.log('[DATABASE] Connected: ' + conn.connection.host + ':' + conn.connection.port + '; database: ' + conn.connection.name);
      console.log('[DATABASE] source: ' + source + '; devices: ' + total + '; not deleted: ' + notDeleted);

      mongoose.connection.on('error', (error) => {
        console.error('[DATABASE] Runtime error (' + error.name + ').');
      });
      mongoose.connection.on('disconnected', () => {
        console.warn('[DATABASE] Disconnected.');
      });

      return conn;
    } catch (error) {
      console.warn(`[DATABASE] Lỗi kết nối lần ${attempt}/${retries} (${error.name}): ${error.message}`);
      await mongoose.disconnect().catch(() => {});

      // Nếu gặp lỗi mạng SRV/DNS trên mongodb+srv://, chuyển sang kết nối trực tiếp ReplicaSet nodes
      if (
        activeUri.startsWith('mongodb+srv://') &&
        (error.name === 'MongoNetworkError' || error.name === 'MongooseServerSelectionError')
      ) {
        console.warn('[DATABASE] Phát hiện lỗi SRV/DNS. Đang chuyển sang kết nối trực tiếp ReplicaSet nodes...');
        activeUri = FALLBACK_DIRECT_URI;
      }

      if (attempt === retries) {
        console.error('[DATABASE] Startup validation failed (' + error.name + '). Check MongoDB configuration and connectivity.');
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

export const disconnectDB = async () => {
  await mongoose.connection.close();
  console.log('[DATABASE] Connection closed.');
};

export default connectDB;
