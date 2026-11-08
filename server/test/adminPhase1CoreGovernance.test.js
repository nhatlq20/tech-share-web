import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import adminRoutes from '../src/routes/adminRoutes.js';
import Booking from '../src/models/Booking.js';
import User from '../src/models/User.js';
import Device from '../src/models/Device.js';
import Notification from '../src/models/Notification.js';

const JWT_SECRET = process.env.JWT_SECRET || 'techshare_jwt_secret_key_2026';

describe('PHASE 1: Core Governance Integration Tests', () => {
  let app;
  let server;
  let baseUrl;
  let adminToken;
  let renterToken;
  let ownerToken;

  const adminId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a111111');
  const renterId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a222222');
  const ownerId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a333333');
  const deviceId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a444444');
  const bookingId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a555555');

  // In-memory data store for tests
  const store = {
    users: new Map(),
    accounts: new Map(),
    roles: new Map(),
    devices: new Map(),
    bookings: new Map(),
  };

  const makeChain = (data) => {
    if (data && typeof data === 'object' && !data.save) {
      data.save = async function () {
        return this;
      };
    }
    const chain = {
      populate: () => chain,
      sort: () => chain,
      select: () => chain,
      skip: () => chain,
      limit: () => chain,
      lean: async () => data,
      then: (resolve, reject) => Promise.resolve(data).then(resolve, reject),
      save: async function () {
        return this;
      },
    };
    if (data && typeof data === 'object') {
      Object.assign(chain, data);
    }
    return chain;
  };

  const requestApi = async (method, path, options = {}) => {
    const url = `${baseUrl}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    const fetchOptions = {
      method,
      headers,
    };
    if (options.body) {
      fetchOptions.body = JSON.stringify(options.body);
    }
    const res = await fetch(url, fetchOptions);
    let body = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = await res.json();
    } else {
      body = await res.text();
    }
    return {
      status: res.status,
      headers: Object.fromEntries(res.headers.entries()),
      body,
    };
  };

  before(async () => {
    // Generate tokens
    adminToken = jwt.sign(
      { id: adminId.toString(), userId: adminId.toString(), role: 'admin', email: 'admin@techshare.vn', name: 'Admin Test' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    renterToken = jwt.sign(
      { id: renterId.toString(), userId: renterId.toString(), role: 'renter', email: 'renter@techshare.vn' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    ownerToken = jwt.sign(
      { id: ownerId.toString(), userId: ownerId.toString(), role: 'owner', email: 'owner@techshare.vn' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Initial seed records
    const adminUser = {
      _id: adminId,
      name: 'Admin Test',
      email: 'admin@techshare.vn',
      role: 'admin',
      isActive: true,
    };
    const renterUser = {
      _id: renterId,
      name: 'Nguyễn Văn Renter',
      email: 'renter@techshare.vn',
      phone: '0901234567',
      role: 'renter',
      isActive: true,
    };
    const ownerUser = {
      _id: ownerId,
      name: 'Trần Văn Owner',
      email: 'owner@techshare.vn',
      phone: '0912345678',
      role: 'owner',
      isActive: true,
    };
    const testDevice = {
      _id: deviceId,
      name: 'Sony Alpha A7 IV',
      category: 'camera',
      brand: 'Sony',
      pricePerDay: 500000,
      depositAmount: 2000000,
      status: 'rented',
      images: ['https://example.com/sony.jpg'],
    };
    const testBooking = {
      _id: bookingId,
      bookingCode: 'TS-TEST-001',
      deviceId: testDevice,
      renterId: renterUser,
      ownerId: ownerUser,
      startDate: new Date('2026-11-01'),
      endDate: new Date('2026-11-05'),
      status: 'active',
      paymentStatus: 'deposit_held',
      pricing: {
        rentalFee: 2000000,
        deposit: 2000000,
        serviceFee: 200000,
        totalAmount: 4200000,
      },
      timeline: [
        { status: 'pending', title: 'Đặt đơn', timestamp: new Date('2026-10-30') },
        { status: 'active', title: 'Đã nhận máy', timestamp: new Date('2026-11-01') },
      ],
      createdAt: new Date('2026-10-30'),
    };
    store.users.set(adminId.toString(), adminUser);
    store.users.set(renterId.toString(), renterUser);
    store.users.set(ownerId.toString(), ownerUser);
    store.devices.set(deviceId.toString(), testDevice);
    store.bookings.set(bookingId.toString(), testBooking);
    // Mock DB for roleMiddleware
    mongoose.connection.db = {
      collection(name) {
        if (name === 'users') {
          return {
            findOne: async (q) => store.users.get(q._id?.toString() || q.accountId?.toString()) || null,
          };
        }
        if (name === 'accounts') {
          return {
            findOne: async (q) => ({
              _id: q._id || new mongoose.Types.ObjectId(),
              roleId: new mongoose.Types.ObjectId(),
              isActive: true,
            }),
          };
        }
        if (name === 'roles') {
          return {
            findOne: async () => ({ code: 'admin', isActive: true }),
          };
        }
        return { findOne: async () => null };
      },
    };

    // Mock Mongoose Methods for safe test execution
    Booking.find = (query) => {
      const arr = Array.from(store.bookings.values());
      const filtered = query?.status && query.status !== 'all'
        ? arr.filter((b) => b.status === query.status)
        : arr;
      return makeChain(filtered);
    };
    Booking.countDocuments = async (query) => {
      const arr = Array.from(store.bookings.values());
      if (query?.status && query.status !== 'all') {
        return arr.filter((b) => b.status === query.status).length;
      }
      return arr.length;
    };
    Booking.findById = (id) => {
      const bId = id?._id || id;
      const b = store.bookings.get(bId.toString());
      if (!b) return makeChain(null);
      return makeChain(b);
    };

    User.findById = (id) => {
      const uId = id?._id || id;
      const u = store.users.get(uId.toString());
      return makeChain(u ? { ...u } : null);
    };

    Notification.create = async (doc) => ({ _id: new mongoose.Types.ObjectId(), ...doc });

    // Express app setup
    app = express();
    app.use(express.json());
    app.use('/api/admin', adminRoutes);

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  after(() => {
    if (server) server.close();
  });

  // ── 1. SECURITY & ACCESS CONTROL TESTS ─────────────────────────────
  test('TC-P1-SEC-01: Unauthenticated request to /api/admin/bookings returns 401', async () => {
    const res = await requestApi('GET', '/api/admin/bookings');
    assert.equal(res.status, 401);
  });

  test('TC-P1-SEC-02: Non-admin (renter/owner) request to /api/admin/bookings returns 403', async () => {
    const res = await requestApi('GET', '/api/admin/bookings', {
      headers: { Authorization: `Bearer ${renterToken}` },
    });
    assert.equal(res.status, 403);
  });

  test('TC-P1-SEC-03: Valid admin request to /api/admin/bookings succeeds with 200', async () => {
    const res = await requestApi('GET', '/api/admin/bookings', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
  });

  // ── 2. MODULE 1: BOOKING MANAGEMENT TESTS ──────────────────────────
  test('TC-P1-BOOK-01: Admin can retrieve list of bookings with pagination metadata', async () => {
    const res = await requestApi('GET', '/api/admin/bookings?page=1&limit=10', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.pagination);
    assert.equal(res.body.pagination.page, 1);
  });

  test('TC-P1-BOOK-02: Admin can get detailed booking info including device and participants', async () => {
    const res = await requestApi('GET', `/api/admin/bookings/${bookingId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.bookingCode, 'TS-TEST-001');
    assert.ok(res.body.data.device);
    assert.ok(res.body.data.renter);
    assert.ok(res.body.data.owner);
  });

  test('TC-P1-BOOK-03: Admin can get booking timeline', async () => {
    const res = await requestApi('GET', `/api/admin/bookings/${bookingId}/timeline`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.bookingCode, 'TS-TEST-001');
    assert.ok(Array.isArray(res.body.data.timeline));
  });

  test('TC-P1-BOOK-04: Admin can export bookings to CSV', async () => {
    const res = await requestApi('GET', '/api/admin/bookings/export', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type']?.includes('text/csv'));
    assert.ok(typeof res.body === 'string' && res.body.includes('Mã đơn'));
  });

  test('Removed admin feature endpoints return 404 even for an admin', async () => {
    const removedRoutes = [
      ['GET', '/api/admin/disputes'],
      ['GET', `/api/admin/disputes/${bookingId}`],
      ['PATCH', `/api/admin/disputes/${bookingId}/review`],
      ['PATCH', `/api/admin/disputes/${bookingId}/resolve`],
      ['PATCH', `/api/admin/disputes/${bookingId}/dismiss`],
      ['GET', '/api/admin/wallet/overview'],
      ['GET', '/api/admin/wallet/export'],
      ['GET', `/api/admin/wallet/users/${renterId}`],
      ['GET', `/api/admin/wallet/transactions/${bookingId}`],
      ['GET', '/api/admin/wallet/transactions'],
      ['GET', '/api/admin/vouchers'],
      ['GET', `/api/admin/vouchers/${bookingId}`],
      ['PATCH', `/api/admin/vouchers/${bookingId}/status`],
      ['PATCH', `/api/admin/vouchers/${bookingId}`],
      ['POST', '/api/admin/vouchers'],
    ];

    for (const [method, path] of removedRoutes) {
      const res = await requestApi(method, path, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 404, `${method} ${path}`);
    }
  });
});
