import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import adminRoutes from '../src/routes/adminRoutes.js';
import Voucher from '../src/models/Voucher.js';
import Review from '../src/models/Review.js';
import Role from '../src/models/Role.js';
import Account from '../src/models/Account.js';
import User from '../src/models/User.js';
import Device from '../src/models/Device.js';
import Booking from '../src/models/Booking.js';
import AdminAuditLog from '../src/models/AdminAuditLog.js';

const JWT_SECRET = process.env.JWT_SECRET || 'techshare_jwt_secret_key_2026';

describe('PHASE 2: Business Operations Integration Tests', () => {
  let app;
  let server;
  let baseUrl;
  let adminToken;
  let renterToken;
  let ownerToken;

  const adminId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a111111');
  const adminAccountId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a111112');
  const renterId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a222222');
  const renterAccountId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a222223');
  const ownerId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a333333');
  const deviceId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a444444');
  const bookingId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a555555');
  const reviewId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a666666');

  const adminRoleId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a777771');
  const renterRoleId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a777772');
  const ownerRoleId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a777773');

  // In-memory data store for tests
  const store = {
    vouchers: new Map(),
    reviews: new Map(),
    roles: new Map(),
    accounts: new Map(),
    users: new Map(),
    devices: new Map(),
    bookings: new Map(),
    auditLogs: new Map(),
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
    renterToken = jwt.sign(
      { userId: String(renterId), accountId: String(renterAccountId), role: 'renter', email: 'renter@gmail.com' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    ownerToken = jwt.sign(
      { userId: String(ownerId), role: 'owner', email: 'owner@techshare.vn' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 2. Seed initial data
    store.roles.set(String(adminRoleId), {
      _id: adminRoleId,
      code: 'admin',
      name: 'Quản trị viên',
      description: 'Toàn quyền quản trị hệ thống',
      permissions: ['*'],
      isActive: true,
    });
    store.roles.set(String(renterRoleId), {
      _id: renterRoleId,
      code: 'renter',
      name: 'Người thuê',
      description: 'Quyền thuê thiết bị',
      permissions: ['booking.create', 'review.create'],
      isActive: true,
    });
    store.roles.set(String(ownerRoleId), {
      _id: ownerRoleId,
      code: 'owner',
      name: 'Chủ thiết bị',
      description: 'Quyền cho thuê thiết bị',
      permissions: ['device.create', 'booking.approve'],
      isActive: true,
    });

    store.accounts.set(String(adminAccountId), {
      _id: adminAccountId,
      username: 'admin',
      email: 'admin@techshare.vn',
      roleId: adminRoleId,
      role: 'admin',
      userId: adminId,
      isActive: true,
      save: async function () {
        return this;
      },
    });

    store.accounts.set(String(renterAccountId), {
      _id: renterAccountId,
      username: 'renter1',
      email: 'renter@gmail.com',
      roleId: renterRoleId,
      role: 'renter',
      userId: renterId,
      isActive: true,
      save: async function () {
        return this;
      },
    });

    store.users.set(String(adminId), {
      _id: adminId,
      name: 'System Admin',
      email: 'admin@techshare.vn',
      role: 'admin',
      isActive: true,
    });

    store.users.set(String(renterId), {
      _id: renterId,
      name: 'Renter Test',
      email: 'renter@gmail.com',
      role: 'renter',
      isActive: true,
    });

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
    Voucher.countDocuments = async (q = {}) => {
      let count = 0;
      for (const v of store.vouchers.values()) {
        if (q.type && q.type !== 'all' && v.type !== q.type) continue;
        if (q.code && !q.code.test(v.code)) continue;
        count++;
      }
      return count;
    };
    Voucher.find = (q = {}) => {
      const arr = Array.from(store.vouchers.values());
      return makeChain(arr);
    };
    Voucher.findById = (id) => {
      const v = store.vouchers.get(String(id));
      if (!v) return makeChain(null);
      v.save = async function () {
        store.vouchers.set(String(this._id), this);
        return this;
      };
      return makeChain(v);
    };
    Voucher.findOne = async (q = {}) => {
      for (const v of store.vouchers.values()) {
        if (q.code && v.code === q.code) {
          if (q._id && q._id.$ne && String(v._id) === String(q._id.$ne)) continue;
          return v;
        }
      }
      return null;
    };
    Voucher.create = async (doc) => {
      const v = {
        _id: new mongoose.Types.ObjectId(),
        ...doc,
      };
      v.save = async function () {
        store.vouchers.set(String(this._id), this);
        return this;
      };
      store.vouchers.set(String(v._id), v);
      return v;
    };

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

    Role.find = () => {
      const arr = Array.from(store.roles.values());
      return makeChain(arr);
    };
    Role.findById = (id) => {
      const r = store.roles.get(String(id));
      return makeChain(r || null);
    };
    Role.findOne = async (q = {}) => {
      for (const r of store.roles.values()) {
        if (q.code && r.code === q.code) return r;
      }
      return null;
    };

    Account.countDocuments = async (q = {}) => {
      let count = 0;
      for (const a of store.accounts.values()) {
        if (q.isActive !== undefined && a.isActive !== q.isActive) continue;
        if (q.$or) {
          const match = q.$or.some((cond) => {
            if (cond.roleId && String(a.roleId) === String(cond.roleId)) return true;
            if (cond.role && a.role === cond.role) return true;
            return false;
          });
          if (match) count++;
        } else if (q.roleId && String(a.roleId) === String(q.roleId)) {
          count++;
        } else if (q.role && a.role === q.role) {
          count++;
        } else {
          count++;
        }
      }
      return count;
    };
    Account.find = (q = {}) => {
      let arr = Array.from(store.accounts.values());
      if (q.$or) {
        arr = arr.filter((a) => {
          return q.$or.some((cond) => {
            if (cond.roleId && String(a.roleId) === String(cond.roleId)) return true;
            if (cond.role && a.role === cond.role) return true;
            return false;
          });
        });
      }
      return makeChain(arr);
    };
    Account.findById = (id) => {
      const a = store.accounts.get(String(id));
      if (!a) return makeChain(null);
      a.save = async function () {
        store.accounts.set(String(this._id), this);
        return this;
      };
      return makeChain(a);
    };

    User.updateOne = async (q, update) => {
      const u = store.users.get(String(q._id));
      if (u && update.$set) {
        Object.assign(u, update.$set);
      }
      return { modifiedCount: 1 };
    };

    Device.updateOne = async (q, update) => {
      const d = store.devices.get(String(q._id));
      if (d && update.$set) {
        Object.assign(d, update.$set);
      }
      return { modifiedCount: 1 };
    };

    AdminAuditLog.create = async (doc) => {
      const entry = { _id: new mongoose.Types.ObjectId(), ...doc, createdAt: new Date() };
      store.auditLogs.set(String(entry._id), entry);
      return entry;
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
  // SUITE 1: MODULE 4 — VOUCHER MANAGEMENT
  // ══════════════════════════════════════════════════════════════════
  describe('Module 4: Voucher Management', () => {
    let createdVoucherId;

    test('POST /api/admin/vouchers — creates a new voucher successfully', async () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const res = await requestApi('POST', '/api/admin/vouchers', {
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          code: 'TECH50',
          type: 'percent',
          value: 15,
          minDays: 2,
          maxDiscount: 200000,
          expiryDate: futureDate,
          usageLimit: 50,
          perUserLimit: 1,
        },
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.code, 'TECH50');
      assert.equal(res.body.data.value, 15);
      assert.equal(res.body.data.type, 'percent');
      assert.equal(res.body.data.usedCount, 0);
      createdVoucherId = res.body.data._id;
    });

    test('POST /api/admin/vouchers — rejects duplicate voucher code (HTTP 400)', async () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const res = await requestApi('POST', '/api/admin/vouchers', {
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          code: 'TECH50',
          type: 'fixed',
          value: 50000,
          expiryDate: futureDate,
        },
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /đã tồn tại/i);
    });

    test('POST /api/admin/vouchers — rejects invalid percent value > 100 (HTTP 400)', async () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const res = await requestApi('POST', '/api/admin/vouchers', {
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          code: 'INVALID120',
          type: 'percent',
          value: 120,
          expiryDate: futureDate,
        },
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    test('POST /api/admin/vouchers — rejects past expiration date (HTTP 400)', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const res = await requestApi('POST', '/api/admin/vouchers', {
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          code: 'PASTEXP',
          type: 'fixed',
          value: 50000,
          expiryDate: pastDate,
        },
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /hiện tại/i);
    });

    test('GET /api/admin/vouchers — lists vouchers with pagination', async () => {
      const res = await requestApi('GET', '/api/admin/vouchers?page=1&limit=10', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length >= 1);
      assert.equal(res.body.pagination.page, 1);
    });

    test('GET /api/admin/vouchers/:id — gets voucher details with usage stats', async () => {
      const res = await requestApi('GET', `/api/admin/vouchers/${createdVoucherId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.code, 'TECH50');
      assert.equal(typeof res.body.data.bookingUsageCount, 'number');
    });

    test('PATCH /api/admin/vouchers/:id — edits voucher while preserving historical usedCount', async () => {
      // Simulate that this voucher was used 5 times
      const v = store.vouchers.get(String(createdVoucherId));
      v.usedCount = 5;

      const res = await requestApi('PATCH', `/api/admin/vouchers/${createdVoucherId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          value: 20,
          maxDiscount: 250000,
          usageLimit: 80,
          reason: 'Tăng mức giảm giá ưu đãi',
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.value, 20);
      assert.equal(res.body.data.usageLimit, 80);
      assert.equal(res.body.data.usedCount, 5, 'Lịch sử usedCount phải được bảo toàn');
    });

    test('PATCH /api/admin/vouchers/:id — rejects usageLimit lower than usedCount (HTTP 400)', async () => {
      const res = await requestApi('PATCH', `/api/admin/vouchers/${createdVoucherId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          usageLimit: 3, // usedCount is 5
        },
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /không thể nhỏ hơn số lượt đã dùng/i);
    });

    test('PATCH /api/admin/vouchers/:id/status — deactivates and reactivates voucher', async () => {
      // Deactivate
      const res1 = await requestApi('PATCH', `/api/admin/vouchers/${createdVoucherId}/status`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { isActive: false },
      });
      assert.equal(res1.status, 200);
      assert.equal(res1.body.data.isActive, false);

      // Reactivate
      const res2 = await requestApi('PATCH', `/api/admin/vouchers/${createdVoucherId}/status`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { isActive: true },
      });
      assert.equal(res2.status, 200);
      assert.equal(res2.body.data.isActive, true);
    });
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

  // ══════════════════════════════════════════════════════════════════
  // SUITE 3: MODULE 6 — ROLES & PERMISSION MANAGEMENT (RBAC)
  // ══════════════════════════════════════════════════════════════════
  describe('Module 6: Role & Permission Management', () => {
    test('GET /api/admin/roles — lists all roles with account counts', async () => {
      const res = await requestApi('GET', '/api/admin/roles', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.some((r) => r.code === 'admin'));
      assert.ok(res.body.data.some((r) => r.code === 'renter'));
      assert.ok(res.body.data.some((r) => r.code === 'owner'));
    });

    test('GET /api/admin/roles/:id — gets details of a role', async () => {
      const res = await requestApi('GET', `/api/admin/roles/${adminRoleId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.code, 'admin');
      assert.ok(res.body.data.permissions.includes('*'));
    });

    test('GET /api/admin/roles/:id/accounts — lists accounts assigned to role', async () => {
      const res = await requestApi('GET', `/api/admin/roles/${renterRoleId}/accounts`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length >= 1);
      assert.equal(res.body.data[0].username, 'renter1');
    });

    test('PATCH /api/admin/accounts/:id/role — reassigns role to an account and syncs user role', async () => {
      const res = await requestApi('PATCH', `/api/admin/accounts/${renterAccountId}/role`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          roleId: String(ownerRoleId),
          reason: 'Nâng cấp tài khoản thành chủ thiết bị',
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(String(res.body.data.roleId), String(ownerRoleId));
      assert.equal(res.body.data.role, 'owner');

      // Verify User document role was synced
      const user = store.users.get(String(renterId));
      assert.equal(user.role, 'owner');
    });

    test('PATCH /api/admin/accounts/:id/role — PREVENTS removing/demoting the last active Admin (HTTP 400)', async () => {
      // Currently only 1 admin account exists in store.accounts
      const res = await requestApi('PATCH', `/api/admin/accounts/${adminAccountId}/role`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          roleId: String(renterRoleId), // Demoting admin to renter
          reason: 'Hạ quyền quản trị viên',
        },
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /duy nhất/i);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // SUITE 4: SECURITY & RBAC ENFORCEMENT
  // ══════════════════════════════════════════════════════════════════
  describe('Security & Access Control Tests', () => {
    test('Reject unauthenticated access to /api/admin/vouchers with HTTP 401', async () => {
      const res = await requestApi('GET', '/api/admin/vouchers');
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    test('Reject non-admin (renter) access to /api/admin/vouchers with HTTP 403', async () => {
      const res = await requestApi('GET', '/api/admin/vouchers', {
        headers: { Authorization: `Bearer ${renterToken}` },
      });
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });

    test('Reject non-admin access to /api/admin/reviews with HTTP 403', async () => {
      const res = await requestApi('GET', '/api/admin/reviews', {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });

    test('Reject non-admin access to /api/admin/roles with HTTP 403', async () => {
      const res = await requestApi('GET', '/api/admin/roles', {
        headers: { Authorization: `Bearer ${renterToken}` },
      });
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });
  });
});
