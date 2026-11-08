import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load server .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://qnhat202005_db_user:qnhat202005@tech-share.0srn8rv.mongodb.net/techshare?retryWrites=true&w=majority&appName=tech-share';

export async function runMigration({ execute = false } = {}) {
  console.log('========================================================');
  console.log(`🚀 TECHSHARE DEVICE LOCATION MIGRATION [${execute ? 'EXECUTE' : 'DRY RUN'}]`);
  console.log('========================================================\n');

  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  const devicesCol = db.collection('devices');
  const usersCol = db.collection('users');

  // Pre-migration checks
  const totalDevices = await devicesCol.countDocuments();
  const devicesWithLocation = await devicesCol.countDocuments({ location: { $exists: true } });
  const totalUsers = await usersCol.countDocuments();
  const usersWithLocation = await usersCol.countDocuments({
    'location.type': 'Point',
    'location.coordinates': { $size: 2 },
  });

  const deviceIndexes = await devicesCol.indexes();
  const hasDeviceGeoIndex = deviceIndexes.some((idx) => idx.name === 'location_2dsphere' || idx.key?.location === '2dsphere');

  const userIndexes = await usersCol.indexes();
  const hasUserGeoIndex = userIndexes.some((idx) => idx.name === 'location_2dsphere' || idx.key?.location === '2dsphere');

  console.log('📊 PRE-MIGRATION STATE:');
  console.log(`  - Total devices: ${totalDevices}`);
  console.log(`  - Devices with persisted location: ${devicesWithLocation}`);
  console.log(`  - Total users: ${totalUsers}`);
  console.log(`  - Users with valid GeoJSON location: ${usersWithLocation}`);
  console.log(`  - Devices collection has location_2dsphere index: ${hasDeviceGeoIndex}`);
  console.log(`  - Users collection has location_2dsphere index: ${hasUserGeoIndex}\n`);

  if (!hasUserGeoIndex) {
    console.warn('⚠️ WARNING: users collection is missing location_2dsphere index! Creating it now...');
    if (execute) {
      await usersCol.createIndex({ location: '2dsphere' });
      console.log('  ✅ Created location_2dsphere index on users collection.');
    }
  }

  if (!execute) {
    console.log('🔍 DRY RUN SUMMARY:');
    console.log(`  - Action 1: Would run db.devices.updateMany({}, { $unset: { location: "" } }) on ${devicesWithLocation} documents.`);
    console.log(`  - Action 2: Would drop 'location_2dsphere' index from devices collection (${hasDeviceGeoIndex ? 'present' : 'already absent'}).`);
    console.log('  - Preserved: All device data (specs, price, images, ownerId, etc.) remains intact.');
    console.log('  - Preserved: All users.location and 2dsphere index on users remains intact.');
    console.log('\n💡 To execute this migration for real, run with --execute:');
    console.log('   node server/src/scripts/migrateDeviceLocation.js --execute\n');
    await mongoose.disconnect();
    return {
      mode: 'dry-run',
      totalDevices,
      devicesWithLocation,
      hasDeviceGeoIndex,
      success: true,
    };
  }

  console.log('⚙️ EXECUTING MIGRATION...');

  // 0. Backup existing device locations before modifying
  const backupData = await devicesCol.find({ location: { $exists: true } }, { projection: { _id: 1, ownerId: 1, location: 1 } }).toArray();
  const backupPath = path.resolve(__dirname, 'backup_device_locations.json');
  const fs = (await import('fs')).default;
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');
  console.log(`  💾 Backup saved to ${backupPath} (${backupData.length} documents backed up).`);

  // 1. Unset location on all devices
  const updateResult = await devicesCol.updateMany({}, { $unset: { location: '' } });
  console.log(`  ✅ Unset 'location' from ${updateResult.modifiedCount} device documents.`);

  // 2. Drop 2dsphere index on devices if exists
  if (hasDeviceGeoIndex) {
    try {
      await devicesCol.dropIndex('location_2dsphere');
      console.log('  ✅ Dropped index "location_2dsphere" from devices collection.');
    } catch (err) {
      console.warn(`  ⚠️ Could not drop location_2dsphere index: ${err.message}`);
    }
  } else {
    console.log('  ℹ️ "location_2dsphere" index was not present on devices collection.');
  }

  // 3. Post-migration verification
  const postDevicesWithLocation = await devicesCol.countDocuments({ location: { $exists: true } });
  const postTotalDevices = await devicesCol.countDocuments();
  const postDeviceIndexes = await devicesCol.indexes();
  const postHasDeviceGeoIndex = postDeviceIndexes.some((idx) => idx.name === 'location_2dsphere' || idx.key?.location === '2dsphere');

  console.log('\n📊 POST-MIGRATION VERIFICATION:');
  console.log(`  - Total devices: ${postTotalDevices} (Expected: ${totalDevices})`);
  console.log(`  - Devices with persisted location: ${postDevicesWithLocation} (Expected: 0)`);
  console.log(`  - Devices collection has location_2dsphere index: ${postHasDeviceGeoIndex} (Expected: false)`);

  const passed = postDevicesWithLocation === 0 && postTotalDevices === totalDevices && !postHasDeviceGeoIndex;

  if (passed) {
    console.log('\n🎉 MIGRATION COMPLETED SUCCESSFULLY!');
  } else {
    console.error('\n❌ MIGRATION VERIFICATION FAILED!');
  }
  console.log('========================================================\n');

  await mongoose.disconnect();
  return {
    mode: 'execute',
    totalDevices: postTotalDevices,
    devicesWithLocation: postDevicesWithLocation,
    hasDeviceGeoIndex: postHasDeviceGeoIndex,
    modifiedCount: updateResult.modifiedCount,
    success: passed,
  };
}

const isDirect = process.argv[1] && process.argv[1].endsWith('migrateDeviceLocation.js');
if (isDirect) {
  const shouldExecute = process.argv.includes('--execute');
  runMigration({ execute: shouldExecute })
    .then((res) => {
      process.exit(res.success ? 0 : 1);
    })
    .catch((err) => {
      console.error('Migration error:', err);
      process.exit(1);
    });
}
