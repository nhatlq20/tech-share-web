import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb+srv://qnhat202005_db_user:qnhat202005@tech-share.0srn8rv.mongodb.net/techshare?retryWrites=true&w=majority&appName=tech-share';

async function inspect() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const deviceCount = await db.collection('devices').countDocuments();
  const withLocation = await db.collection('devices').countDocuments({ location: { $exists: true } });
  const userCount = await db.collection('users').countDocuments();
  const usersWithLocation = await db.collection('users').countDocuments({ location: { $exists: true } });
  const deviceIndexes = await db.collection('devices').indexes();
  const userIndexes = await db.collection('users').indexes();

  // Check orphaned devices (devices where ownerId does not match any user)
  const devices = await db.collection('devices').find({}, { projection: { _id: 1, ownerId: 1, location: 1 } }).toArray();
  const userIds = new Set((await db.collection('users').find({}, { projection: { _id: 1 } }).toArray()).map(u => String(u._id)));
  const orphaned = devices.filter(d => !userIds.has(String(d.ownerId)));

  console.log(JSON.stringify({
    deviceCount,
    withLocation,
    userCount,
    usersWithLocation,
    orphanedDevicesCount: orphaned.length,
    orphanedSample: orphaned.slice(0, 3),
    deviceIndexes: deviceIndexes.map(i => ({ name: i.name, key: i.key })),
    userIndexes: userIndexes.map(i => ({ name: i.name, key: i.key }))
  }, null, 2));

  await mongoose.disconnect();
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});

