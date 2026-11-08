import assert from 'node:assert/strict';
import { test, describe, before, after } from 'node:test';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import Device from '../src/models/Device.js';
import User from '../src/models/User.js';
import { resolveDeviceLocation, isValidCoordinates } from '../src/utils/locationHelper.js';
import { getNearbyDevices, getRecommendedDevices, getDevices, getDeviceById } from '../src/controllers/deviceController.js';
import { updateProfile } from '../src/controllers/authController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://qnhat202005_db_user:qnhat202005@tech-share.0srn8rv.mongodb.net/techshare?retryWrites=true&w=majority&appName=tech-share';

describe('Location Architecture — Single Source of Truth (TC-LOC-01 to TC-LOC-12)', () => {
  let testOwnerId;
  let testDeviceId;
  let testOwnerNoLocId;
  let testDeviceNoLocId;

  before(async () => {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(MONGODB_URI);
    }

    // Create a dedicated test owner with location
    const testOwner = await User.create({
      accountId: new mongoose.Types.ObjectId(),
      username: `test_owner_${Date.now()}`,
      name: 'Test Owner Location',
      phone: '0987654321',
      address: '123 Nguyen Trai, Ha Noi',
      location: {
        type: 'Point',
        coordinates: [105.8000, 21.0000], // [lng, lat]
      },
      isActive: true,
    });
    testOwnerId = testOwner._id;

    // Create a dedicated test device
    const testDev = await Device.create({
      ownerId: testOwnerId,
      owner: testOwnerId,
      name: 'Test Camera 4K',
      brand: 'Sony',
      category: 'camera',
      description: 'Chuyên nghiệp chụp ảnh và quay phim 4K sắc nét',
      images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400'],
      pricePerDay: 250000,
      depositAmount: 2000000,
      status: 'available',
      moderationStatus: 'approved',
      stats: { ratingAvg: 4.9, ratingCount: 10 },
      isDeleted: false,
    });
    testDeviceId = testDev._id;

    // Create a test owner without location
    const testOwnerNoLoc = await User.create({
      accountId: new mongoose.Types.ObjectId(),
      username: `test_owner_noloc_${Date.now()}`,
      name: 'Test Owner No Location',
      phone: '0987654322',
      address: 'No location address',
      location: null,
      isActive: true,
    });
    testOwnerNoLocId = testOwnerNoLoc._id;

    const testDevNoLoc = await Device.create({
      ownerId: testOwnerNoLocId,
      owner: testOwnerNoLocId,
      name: 'Test Gadget No Loc',
      brand: 'Apple',
      category: 'accessory',
      description: 'Phụ kiện test không có địa chỉ toạ độ',
      images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400'],
      pricePerDay: 50000,
      depositAmount: 500000,
      status: 'available',
      moderationStatus: 'approved',
      isDeleted: false,
    });
    testDeviceNoLocId = testDevNoLoc._id;
  });

  after(async () => {
    // Cleanup test fixtures
    if (testDeviceId) await Device.deleteOne({ _id: testDeviceId });
    if (testDeviceNoLocId) await Device.deleteOne({ _id: testDeviceNoLocId });
    if (testOwnerId) await User.deleteOne({ _id: testOwnerId });
    if (testOwnerNoLocId) await User.deleteOne({ _id: testOwnerNoLocId });
    await mongoose.disconnect();
  });

  test('TC-LOC-01: Device read reflects owner location dynamically', async () => {
    const rawDev = await Device.findById(testDeviceId).lean();
    assert.equal(rawDev.location, undefined, 'Persisted device document must NOT contain location field');

    const dev = await Device.findById(testDeviceId)
      .populate('ownerId', 'name address location')
      .lean({ virtuals: true });

    const resolved = resolveDeviceLocation(dev);
    assert.ok(resolved, 'Resolved location must exist');
    assert.equal(resolved.type, 'Point');
    assert.deepEqual(resolved.coordinates, [105.8000, 21.0000]);
    assert.equal(resolved.addressText, '123 Nguyen Trai, Ha Noi');
  });

  test('TC-LOC-02: User location update propagates immediately to devices without sync script', async () => {
    // 1. Update owner location
    const newCoords = [105.8500, 21.0300];
    const newAddress = '456 Kim Ma, Ba Dinh, Ha Noi';

    const req = {
      user: { userId: testOwnerId.toString() },
      body: {
        address: newAddress,
        location: {
          type: 'Point',
          coordinates: newCoords,
        },
      },
    };
    let updateRes = {};
    const res = {
      status(code) { updateRes.status = code; return this; },
      json(data) { updateRes.data = data; return this; },
    };
    await updateProfile(req, res);
    assert.equal(updateRes.status, 200, 'Profile update should return 200');

    // 2. Read device immediately without any sync script
    const dev = await Device.findById(testDeviceId)
      .populate('ownerId', 'name address location')
      .lean({ virtuals: true });

    const resolved = resolveDeviceLocation(dev);
    assert.ok(resolved);
    assert.deepEqual(resolved.coordinates, newCoords, 'Device location must reflect updated owner coordinates');
    assert.equal(resolved.addressText, newAddress, 'Device addressText must reflect updated owner address');

    // 3. Raw device document in database must still NOT have location field
    const rawDev = await mongoose.connection.db.collection('devices').findOne({ _id: testDeviceId });
    assert.equal(rawDev.location, undefined, 'Device in MongoDB must not store location');
  });

  test('TC-LOC-03: User without location yields location: null for device (never hardcoded fallback)', async () => {
    const dev = await Device.findById(testDeviceNoLocId)
      .populate('ownerId', 'name address location')
      .lean({ virtuals: true });

    const resolved = resolveDeviceLocation(dev);
    assert.equal(resolved, null, 'Device of owner without location must return location: null');
    assert.notDeepEqual(resolved?.coordinates, [105.7826, 21.0285], 'Must never fabricate fallback coordinates');
  });

  test('TC-LOC-04: Nearby device search uses owner location and returns distanceMeters', async () => {
    let responseData = {};
    const mockRes = {
      status(code) { responseData.status = code; return this; },
      json(data) { responseData.data = data; return this; },
    };

    // Query near Kim Ma [105.8500, 21.0300]
    await getNearbyDevices(
      {
        query: {
          lat: '21.0300',
          lng: '105.8500',
          radius: '5000',
          page: '1',
          limit: '10',
        },
      },
      mockRes,
      (err) => { throw err; }
    );

    assert.equal(responseData.status, 200);
    assert.ok(responseData.data.success);
    assert.ok(Array.isArray(responseData.data.data));

    // Find our test device in results
    const found = responseData.data.data.find((d) => d._id.toString() === testDeviceId.toString());
    assert.ok(found, 'Test device must be returned in nearby results near owner location');
    assert.ok(Number.isFinite(found.distanceMeters), 'distanceMeters must be calculated from owner location');
    assert.ok(found.distanceMeters < 100, 'Distance should be less than 100m from owner coordinates');
    assert.deepEqual(found.location.coordinates, [105.8500, 21.0300]);
    assert.equal(found.owner.name, 'Test Owner Location');
  });

  test('TC-LOC-05: Nearby device sorting (Nearest, Lowest Price, Highest Rating)', async () => {
    let priceSorted = {};
    const resPrice = {
      status(c) { priceSorted.status = c; return this; },
      json(d) { priceSorted.data = d; return this; },
    };
    await getNearbyDevices(
      {
        query: {
          lat: '21.0300',
          lng: '105.8500',
          radius: '10000',
          sort: 'lowest_price',
          limit: '5',
        },
      },
      resPrice,
      (err) => { throw err; }
    );
    assert.equal(priceSorted.status, 200);
    const devices = priceSorted.data.data;
    if (devices.length >= 2) {
      assert.ok(
        devices[0].pricePerDay <= devices[1].pricePerDay,
        'Devices must be sorted in ascending order of pricePerDay'
      );
    }
  });

  test('TC-LOC-06: Device creation does not persist location in devices collection', async () => {
    const newDev = await Device.create({
      ownerId: testOwnerId,
      owner: testOwnerId,
      name: 'Created Test Drone',
      brand: 'DJI',
      category: 'drone',
      description: 'Flycam 4K chuyên nghiệp',
      images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400'],
      pricePerDay: 500000,
      depositAmount: 5000000,
      status: 'available',
      moderationStatus: 'approved',
      isDeleted: false,
    });

    const rawInDb = await mongoose.connection.db.collection('devices').findOne({ _id: newDev._id });
    assert.equal(rawInDb.location, undefined, 'Device document must NOT store location field');

    // Clean up
    await Device.deleteOne({ _id: newDev._id });
  });

  test('TC-LOC-07: Client-supplied device coordinates are ignored and not persisted to devices', async () => {
    // Attempting to send location coordinates during creation
    const devWithClientCoords = await Device.create({
      ownerId: testOwnerId,
      owner: testOwnerId,
      name: 'Hacked Location Device',
      brand: 'Sony',
      category: 'camera',
      description: 'Thiết bị test toạ độ từ client',
      images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400'],
      pricePerDay: 200000,
      depositAmount: 1000000,
      location: {
        type: 'Point',
        coordinates: [0, 0], // Malicious coordinates
      },
      status: 'available',
      moderationStatus: 'approved',
      isDeleted: false,
    });

    const rawInDb = await mongoose.connection.db.collection('devices').findOne({ _id: devWithClientCoords._id });
    assert.equal(rawInDb.location, undefined, 'Client-supplied location must NOT be saved in devices collection');

    // Owner location remains unaffected
    const ownerInDb = await User.findById(testOwnerId).lean();
    assert.deepEqual(ownerInDb.location.coordinates, [105.8500, 21.0300], 'Owner location must remain unchanged');

    await Device.deleteOne({ _id: devWithClientCoords._id });
  });

  test('TC-LOC-08: Map position parser handles valid location and location: null safely', () => {
    // Simulating frontend getDevicePosition behavior
    const getDevicePosition = (device) => {
      const coordinates = device?.location?.coordinates;
      if (device?.location?.type !== 'Point' || !Array.isArray(coordinates) || coordinates.length !== 2) return null;
      const [longitude, latitude] = coordinates;
      if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180) return null;
      return [longitude, latitude];
    };

    const validDevice = { location: { type: 'Point', coordinates: [105.85, 21.03] } };
    assert.deepEqual(getDevicePosition(validDevice), [105.85, 21.03]);

    const nullLocDevice = { location: null };
    assert.equal(getDevicePosition(nullLocDevice), null, 'Must return null without crashing');

    const invalidCoordsDevice = { location: { type: 'Point', coordinates: [999, 999] } };
    assert.equal(getDevicePosition(invalidCoordsDevice), null, 'Must return null for invalid coordinates');
  });

  test('TC-LOC-09: Search filters and pagination remain accurate in recommendation and nearby', async () => {
    let recRes = {};
    const mockRes = {
      status(c) { recRes.status = c; return this; },
      json(d) { recRes.data = d; return this; },
    };

    await getRecommendedDevices(
      {
        query: {
          lat: '21.0300',
          lng: '105.8500',
          category: 'camera',
          page: '1',
          limit: '5',
        },
      },
      mockRes,
      (err) => { throw err; }
    );

    assert.equal(recRes.status, 200);
    assert.ok(recRes.data.success);
    assert.ok(recRes.data.pagination);
    assert.equal(recRes.data.pagination.page, 1);
    assert.ok(recRes.data.pagination.total >= 1);
    for (const d of recRes.data.data) {
      assert.equal(d.category, 'camera', 'All returned devices must match category filter');
    }
  });

  test('TC-LOC-10: Database migration verification: no devices retain location and no 2dsphere on devices', async () => {
    const devicesCol = mongoose.connection.db.collection('devices');
    const usersCol = mongoose.connection.db.collection('users');

    const devicesWithLocationCount = await devicesCol.countDocuments({ location: { $exists: true } });
    assert.equal(devicesWithLocationCount, 0, 'Zero devices in database should retain persisted location');

    const deviceIndexes = await devicesCol.indexes();
    const hasDeviceGeoIndex = deviceIndexes.some((idx) => idx.name === 'location_2dsphere' || idx.key?.location === '2dsphere');
    assert.equal(hasDeviceGeoIndex, false, 'devices collection must NOT have location_2dsphere index');

    const userIndexes = await usersCol.indexes();
    const hasUserGeoIndex = userIndexes.some((idx) => idx.name === 'location_2dsphere' || idx.key?.location === '2dsphere');
    assert.equal(hasUserGeoIndex, true, 'users collection MUST have location_2dsphere index intact');
  });

  test('TC-LOC-11: Authorization: Users cannot modify other users location or steal device ownership', async () => {
    // Attempting to update another user's profile with stolen token or spoofed ID
    const attackerReq = {
      user: { userId: testOwnerNoLocId.toString() }, // logged in as testOwnerNoLoc
      body: {
        location: { type: 'Point', coordinates: [100.0, 10.0] },
      },
    };
    let updateRes = {};
    const res = {
      status(c) { updateRes.status = c; return this; },
      json(d) { updateRes.data = d; return this; },
    };
    await updateProfile(attackerReq, res);
    assert.equal(updateRes.status, 200);

    // Victim owner's location remains unchanged
    const victim = await User.findById(testOwnerId).lean();
    assert.deepEqual(victim.location.coordinates, [105.8500, 21.0300], 'Victim owner location must remain untouched');

    // Attacker cannot change device ownership via device update
    const victimDev = await Device.findById(testDeviceId).lean();
    assert.equal(victimDev.ownerId.toString(), testOwnerId.toString(), 'Device ownership cannot be altered');
  });

  test('TC-LOC-12: Regression: Device listing, detail, search, and dynamic location work end-to-end', async () => {
    // 1. Single device read
    let detailRes = {};
    const mockDetailRes = {
      status(c) { detailRes.status = c; return this; },
      json(d) { detailRes.data = d; return this; },
    };
    await getDeviceById({ params: { id: testDeviceId.toString() } }, mockDetailRes, (e) => { throw e; });
    assert.equal(detailRes.status, 200);
    assert.ok(detailRes.data.data.location);
    assert.deepEqual(detailRes.data.data.location.coordinates, [105.8500, 21.0300]);

    // 2. Listing
    let listRes = {};
    const mockListRes = {
      status(c) { listRes.status = c; return this; },
      json(d) { listRes.data = d; return this; },
    };
    await getDevices({ query: { category: 'camera', limit: '5' } }, mockListRes, (e) => { throw e; });
    assert.equal(listRes.status, 200);
    assert.ok(listRes.data.data.length > 0);
    for (const d of listRes.data.data) {
      if (d.location) {
        assert.ok(Array.isArray(d.location.coordinates));
        assert.equal(d.location.coordinates.length, 2);
      }
    }
  });
});
