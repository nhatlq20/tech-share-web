import mongoose from 'mongoose';
import { getDatabaseConfig } from './env.js';

export const connectDB = async () => {
  try {
    const { uri, source } = getDatabaseConfig();
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
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
    // Driver errors may contain connection strings. Never log credentials.
    console.error('[DATABASE] Startup validation failed (' + error.name + '). Check MongoDB configuration and connectivity.');
    await mongoose.disconnect();
    throw error;
  }
};

export const disconnectDB = async () => {
  await mongoose.connection.close();
  console.log('[DATABASE] Connection closed.');
};

export default connectDB;
