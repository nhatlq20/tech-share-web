import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import adminRoutes from '../src/routes/adminRoutes.js';
import Review from '../src/models/Review.js';
import Device from '../src/models/Device.js';
import Booking from '../src/models/Booking.js';

const JWT_SECRET = process.env.JWT_SECRET || 'techshare_jwt_secret_key_2026';

describe('PHASE 2: Business Operations Integration Tests', () => {
  let app;
  let server;
  let baseUrl;
  let adminToken;
  let ownerToken;

  const adminId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a111111');
  const adminAccountId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a111112');
  const renterId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a222222');
  const ownerId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a333333');
  const deviceId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a444444');
  const bookingId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a555555');
  const reviewId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a666666');

  // In-memory data store for tests
  const store = {
    reviews: new Map(),
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
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return {
      status: res.status,
      headers: res.headers,
      body,
    };
  };

  before(async () => {
    // 1. Generate Auth Tokens
    adminToken = jwt.sign(
      { userId: String(adminId), accountId: String(adminAccountId), role: 'admin', email: 'admin@techshare.vn' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    ownerToken = jwt.sign(
      { userId: String(ownerId), role: 'owner', email: 'owner@techshare.vn' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 2. Seed initial data
    store.devices.set(String(deviceId), {
      _id: deviceId,
      name: 'Sony A7 IV',
      brand: 'Sony',
      category: 'camera',
      dailyRate: 400000,
      pricePerDay: 400000,
      depositValue: 10000000,
      stats: { ratingAvg: 5.0, ratingCount: 1 },
      ratingAvg: 5.0,
      rating: 5.0,
      isDeleted: false,
    });

    store.reviews.set(String(reviewId), {
      _id: reviewId,
      bookingId,
      deviceId,
      renterId,
      ownerId,
      reviewerId: renterId,
      targetType: 'device',
      rating: 5,
      comment: 'Máy chụp nét, bảo quản tốt!',
      images: ['https://example.com/photo.jpg'],
      isHidden: false,
      moderationStatus: 'approved',
      moderationReason: '',
      moderatedBy: null,
      moderatedAt: null,
      save: async function () {
        return this;
      },
    });

    // 3. Mock Mongoose Models
    Booking.countDocuments = async (q = {}) => 0;

    Review.aggregate = (stages = []) => {
      let count = 0;
      for (const rev of store.reviews.values()) {
        if (!rev.isHidden && rev.moderationStatus !== 'hidden') {
          count++;
        }
      }
      const data = count > 0 ? [{ _id: 5, count }] : [];
      const chain = {
        session: () => chain,
        then: (resolve, reject) => Promise.resolve(data).then(resolve, reject),
      };
      return chain;
    };

    Review.countDocuments = async (q = {}) => {
      return store.reviews.size;
    };
    Review.find = (q = {}) => {
      const arr = Array.from(store.reviews.values());
      return makeChain(arr);
    };
    Review.findById = (id) => {
      const r = store.reviews.get(String(id));
      if (!r) return makeChain(null);
      r.save = async function () {
        store.reviews.set(String(this._id), this);
        return this;
      };
      return makeChain(r);
    };

    Device.updateOne = async (q, update) => {
      const d = store.devices.get(String(q._id));
      if (d && update.$set) {
        Object.assign(d, update.$set);
      }
      return { modifiedCount: 1 };
    };

    // 4. Start Express Server
    app = express();
    app.use(express.json());
    app.use('/api/admin', adminRoutes);

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ══════════════════════════════════════════════════════════════════
  // SUITE 2: MODULE 5 — REVIEW MODERATION
  // ══════════════════════════════════════════════════════════════════
  describe('Module 5: Review Moderation', () => {
    test('GET /api/admin/reviews — lists reviews with filters', async () => {
      const res = await requestApi('GET', '/api/admin/reviews?rating=5&targetType=device', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length >= 1);
    });

    test('GET /api/admin/reviews/:id — gets review detail with context', async () => {
      const res = await requestApi('GET', `/api/admin/reviews/${reviewId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(String(res.body.data._id), String(reviewId));
      assert.equal(res.body.data.rating, 5);
    });

    test('PATCH /api/admin/reviews/:id/moderation — hides violating review and updates moderation status', async () => {
      const res = await requestApi('PATCH', `/api/admin/reviews/${reviewId}/moderation`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          moderationStatus: 'hidden',
          reason: 'Nội dung chứa thông tin không phù hợp',
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.moderationStatus, 'hidden');
      assert.equal(res.body.data.isHidden, true);
      assert.equal(res.body.data.moderationReason, 'Nội dung chứa thông tin không phù hợp');
    });

    test('PATCH /api/admin/reviews/:id/moderation — restores review to approved status', async () => {
      const res = await requestApi('PATCH', `/api/admin/reviews/${reviewId}/moderation`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          moderationStatus: 'approved',
          reason: 'Xem xét lại hợp lệ sau giải trình',
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.moderationStatus, 'approved');
      assert.equal(res.body.data.isHidden, false);
    });
  });

  test('Removed role management endpoints are no longer mounted', async () => {
    const removedRoutes = [
      ['GET', '/api/admin/roles'],
      ['GET', `/api/admin/roles/${adminAccountId}`],
      ['GET', `/api/admin/roles/${adminAccountId}/accounts`],
      ['PATCH', `/api/admin/accounts/${adminAccountId}/role`],
    ];

    for (const [method, path] of removedRoutes) {
      const res = await requestApi(method, path, {
        headers: { Authorization: `Bearer ${adminToken}` },
        body: method === 'PATCH' ? { roleId: String(adminAccountId) } : undefined,
      });
      assert.equal(res.status, 404, `${method} ${path}`);
      assert.equal(res.body, null, `${method} ${path} falls through to Express's 404`);
    }
  });

  // ══════════════════════════════════════════════════════════════════
  // SUITE 4: SECURITY & RBAC ENFORCEMENT
  // ══════════════════════════════════════════════════════════════════
  describe('Security & Access Control Tests', () => {
    test('Reject non-admin access to /api/admin/reviews with HTTP 403', async () => {
      const res = await requestApi('GET', '/api/admin/reviews', {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });
  });
});
