import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import adminRoutes from '../src/routes/adminRoutes.js';
import Notification from '../src/models/Notification.js';
import User from '../src/models/User.js';
import Device from '../src/models/Device.js';
import Booking from '../src/models/Booking.js';
import Dispute from '../src/models/Dispute.js';
import EkycRequest from '../src/models/EkycRequest.js';
import Voucher from '../src/models/Voucher.js';
import SystemSetting from '../src/models/SystemSetting.js';
import AdminAuditLog from '../src/models/AdminAuditLog.js';
import Role from '../src/models/Role.js';
import Account from '../src/models/Account.js';

const JWT_SECRET = process.env.JWT_SECRET || 'techshare_jwt_secret_key_2026';

describe('PHASE 3: Platform Operations Integration Tests', () => {
  let app;
  let server;
  let baseUrl;
  let adminToken;
  let renterToken;

  const adminId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a111111');
  const adminAccountId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a111112');
  const renterId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a222222');
  const renterAccountId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a222223');
  const ownerId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a333333');
  const deviceId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a444444');
  const bookingId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a555555');

  const adminRoleId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a777771');
  const renterRoleId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a777772');

  // In-memory data store for tests
  const store = {
    notifications: new Map(),
    settings: new Map(),
    auditLogs: new Map(),
    users: new Map(),
    devices: new Map(),
    bookings: new Map(),
    disputes: new Map(),
    ekycRequests: new Map(),
    vouchers: new Map(),
    roles: new Map(),
    accounts: new Map(),
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
      select: () => {
        if (Array.isArray(data)) {
          return makeChain(data.map((d) => ({ _id: d._id })));
        }
        return chain;
      },
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
      try {
        body = await res.json();
      } catch {
        body = null;
      }
    } else {
      body = await res.text();
    }
    return {
      status: res.status,
      headers: res.headers,
      body,
    };
  };

  before(async () => {
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

    // Seed roles and accounts
    store.roles.set(String(adminRoleId), { _id: adminRoleId, code: 'admin', name: 'Admin', isActive: true });
    store.roles.set(String(renterRoleId), { _id: renterRoleId, code: 'renter', name: 'Renter', isActive: true });

    store.accounts.set(String(adminAccountId), {
      _id: adminAccountId,
      username: 'admin',
      email: 'admin@techshare.vn',
      roleId: adminRoleId,
      role: 'admin',
      userId: adminId,
      isActive: true,
    });
    store.accounts.set(String(renterAccountId), {
      _id: renterAccountId,
      username: 'renter1',
      email: 'renter@gmail.com',
      roleId: renterRoleId,
      role: 'renter',
      userId: renterId,
      isActive: true,
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
      name: 'Renter User',
      email: 'renter@gmail.com',
      role: 'renter',
      isActive: true,
    });
    store.users.set(String(ownerId), {
      _id: ownerId,
      name: 'Owner User',
      email: 'owner@techshare.vn',
      role: 'owner',
      isActive: true,
    });

    // Seed Devices & Bookings
    store.devices.set(String(deviceId), {
      _id: deviceId,
      name: 'MacBook Pro 16 M3',
      brand: 'Apple',
      category: 'laptop',
      moderationStatus: 'approved',
      isDeleted: false,
    });

    store.bookings.set(String(bookingId), {
      _id: bookingId,
      status: 'completed',
      totalAmount: 1500000,
      rentalFee: 1000000,
      depositFee: 500000,
    });

    // Mock Mongoose Models
    User.countDocuments = async (q = {}) => store.users.size;
    User.find = (q = {}) => {
      let arr = Array.from(store.users.values());
      if (q.role) arr = arr.filter((u) => u.role === q.role);
      if (q._id && q._id.$in) {
        const ids = q._id.$in.map(String);
        arr = arr.filter((u) => ids.includes(String(u._id)));
      }
      return makeChain(arr);
    };

    Device.countDocuments = async (q = {}) => store.devices.size;
    Device.aggregate = async () => [{ _id: 'laptop', count: 1 }];

    Booking.countDocuments = async (q = {}) => store.bookings.size;
    Booking.aggregate = async (stages = []) => {
      return [
        {
          _id: null,
          grossBookingValue: 1500000,
          totalRentalFee: 1000000,
          totalDeposits: 500000,
          escrowHeld: 1500000,
          depositsHeld: 500000,
        },
      ];
    };

    Dispute.countDocuments = async () => 0;
    EkycRequest.countDocuments = async () => 0;

    Voucher.find = () => makeChain([{ code: 'TECHSHARE10', usedCount: 5, type: 'percent', value: 10 }]);

    Notification.countDocuments = async () => store.notifications.size;
    Notification.find = () => makeChain(Array.from(store.notifications.values()));
    Notification.insertMany = async (docs = []) => {
      docs.forEach((d) => {
        const id = new mongoose.Types.ObjectId();
        store.notifications.set(String(id), { _id: id, ...d, createdAt: new Date() });
      });
      return docs;
    };

    SystemSetting.find = () => makeChain(Array.from(store.settings.values()));
    SystemSetting.findOne = (q = {}) => {
      let found = null;
      for (const s of store.settings.values()) {
        if (s.key === q.key) {
          found = s;
          break;
        }
      }
      if (!found) return makeChain(null);
      found.save = async function () {
        store.settings.set(this.key, this);
        return this;
      };
      return makeChain(found);
    };
    SystemSetting.findOneAndUpdate = async (q, update, opts) => {
      let s = store.settings.get(q.key);
      if (!s && opts?.upsert) {
        s = { _id: new mongoose.Types.ObjectId(), key: q.key, ...(update.$setOnInsert || {}) };
        s.save = async function () {
          store.settings.set(this.key, this);
          return this;
        };
        store.settings.set(q.key, s);
      }
      return s;
    };

    AdminAuditLog.countDocuments = async () => store.auditLogs.size;
    AdminAuditLog.find = () => makeChain(Array.from(store.auditLogs.values()));
    AdminAuditLog.create = async (doc) => {
      const entry = { _id: new mongoose.Types.ObjectId(), ...doc, createdAt: new Date() };
      store.auditLogs.set(String(entry._id), entry);
      return entry;
    };
    AdminAuditLog.aggregate = async () => [
      { _id: 'notification_broadcast', count: 1 },
      { _id: 'system_setting_update', count: 1 },
    ];

    // Express app setup
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
  // SUITE 1: MODULE 7 — NOTIFICATION MANAGEMENT
  // ══════════════════════════════════════════════════════════════════
  describe('Module 7: Notification Management', () => {
    test('POST /api/admin/notifications/send — sends notification to specific users', async () => {
      const res = await requestApi('POST', '/api/admin/notifications/send', {
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          targetType: 'specific_users',
          userIds: [String(renterId)],
          title: 'Chào mừng thành viên mới',
          body: 'Bạn nhận được 1 voucher giảm 10% cho đơn thuê đầu tiên!',
          type: 'promo',
        },
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.sentCount, 1);
      assert.ok(store.notifications.size >= 1);
    });

    test('POST /api/admin/notifications/send — rejects missing title or body (HTTP 400)', async () => {
      const res = await requestApi('POST', '/api/admin/notifications/send', {
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          targetType: 'all',
          title: '',
          body: '',
        },
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /tiêu đề/i);
    });

    test('POST /api/admin/notifications/send — broadcasts notification to specific role', async () => {
      const res = await requestApi('POST', '/api/admin/notifications/send', {
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          targetType: 'role',
          targetRole: 'renter',
          title: 'Cập nhật chính sách bảo hiểm thiết bị',
          body: 'TechShare nâng cấp gói bảo vệ người thuê lên 50.000.000đ',
          type: 'system',
        },
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.sentCount >= 1);
    });

    test('GET /api/admin/notifications — lists notifications with pagination', async () => {
      const res = await requestApi('GET', '/api/admin/notifications?page=1&limit=10', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length >= 1);
    });

    test('GET /api/admin/notifications/history — retrieves broadcast history', async () => {
      const res = await requestApi('GET', '/api/admin/notifications/history', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // SUITE 2: MODULE 8 — ADVANCED ANALYTICS & REPORTS
  // ══════════════════════════════════════════════════════════════════
  describe('Module 8: Advanced Analytics & Reports', () => {
    test('GET /api/admin/analytics/advanced — computes accurate KPIs and chart trends', async () => {
      const res = await requestApi('GET', '/api/admin/analytics/advanced?period=7d', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.kpi);
      assert.equal(res.body.data.kpi.grossBookingValue, 1500000);
      assert.equal(res.body.data.kpi.totalRentalFee, 1000000);
      assert.equal(res.body.data.kpi.platformServiceFeeRevenue, 100000); // 10% of rental fee
      assert.equal(typeof res.body.data.kpi.bookingCompletionRate, 'number');
      assert.ok(Array.isArray(res.body.data.charts.bookingTrends));
      assert.ok(Array.isArray(res.body.data.charts.revenueTrends));
    });

    test('GET /api/admin/analytics/export — exports analytics report as CSV', async () => {
      const res = await requestApi('GET', '/api/admin/analytics/export?period=30d', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.equal(res.status, 200);
      assert.ok(res.headers.get('content-type').includes('text/csv'));
      assert.ok(typeof res.body === 'string');
      assert.ok(res.body.includes('Chỉ số'));
      assert.ok(res.body.includes('Tổng giá trị giao dịch'));
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // SUITE 3: MODULE 9 — SYSTEM SETTINGS
  // ══════════════════════════════════════════════════════════════════
  describe('Module 9: System Settings', () => {
    test('GET /api/admin/settings — lists system settings grouped by category', async () => {
      const res = await requestApi('GET', '/api/admin/settings', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.grouped);
      assert.ok(Array.isArray(res.body.grouped.general));
      assert.ok(Array.isArray(res.body.grouped.booking));
      assert.ok(Array.isArray(res.body.grouped.finance));
    });

    test('GET /api/admin/settings/:key — retrieves a specific setting', async () => {
      const res = await requestApi('GET', '/api/admin/settings/platform_maintenance', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.key, 'platform_maintenance');
      assert.equal(typeof res.body.data.value.enabled, 'boolean');
    });

    test('PATCH /api/admin/settings/:key — updates setting value and logs audit', async () => {
      const res = await requestApi('PATCH', '/api/admin/settings/platform_maintenance', {
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          value: { enabled: true, message: 'Bảo trì hệ thống vào 02:00 sáng mai.' },
          description: 'Cập nhật thông báo bảo trì',
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.value.enabled, true);

      // Verify audit entry created
      const audit = Array.from(store.auditLogs.values()).find(
        (a) => a.action === 'system_setting_update' && a.targetId === 'platform_maintenance'
      );
      assert.ok(audit, 'Cập nhật cấu hình phải tạo nhật ký kiểm toán');
    });

    test('PATCH /api/admin/settings/:key — PREVENTS modifying forbidden server secrets (HTTP 403)', async () => {
      const res = await requestApi('PATCH', '/api/admin/settings/jwt_secret_override', {
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          value: 'hacked_secret',
        },
      });

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /bảo mật từ chối/i);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // SUITE 4: MODULE 10 — CENTRALIZED AUDIT LOGS
  // ══════════════════════════════════════════════════════════════════
  describe('Module 10: Centralized Audit Logs', () => {
    test('GET /api/admin/audit-logs — queries audit logs with pagination and filters', async () => {
      const res = await requestApi('GET', '/api/admin/audit-logs?page=1&limit=15', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length >= 1);
    });

    test('GET /api/admin/audit-logs/stats — retrieves audit operation statistics', async () => {
      const res = await requestApi('GET', '/api/admin/audit-logs/stats', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(typeof res.body.data.totalLogs, 'number');
      assert.equal(typeof res.body.data.successRate, 'number');
    });

    test('GET /api/admin/audit-logs/export — exports audit logs as CSV', async () => {
      const res = await requestApi('GET', '/api/admin/audit-logs/export', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.equal(res.status, 200);
      assert.ok(res.headers.get('content-type').includes('text/csv'));
      assert.ok(typeof res.body === 'string');
      assert.ok(res.body.includes('Thời gian,Quản trị viên'));
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // SUITE 5: SECURITY & RBAC REJECTION
  // ══════════════════════════════════════════════════════════════════
  describe('Security & RBAC Enforcement', () => {
    test('Reject unauthenticated access to /api/admin/notifications with HTTP 401', async () => {
      const res = await requestApi('GET', '/api/admin/notifications');
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    test('Reject non-admin access to /api/admin/settings with HTTP 403', async () => {
      const res = await requestApi('GET', '/api/admin/settings', {
        headers: { Authorization: `Bearer ${renterToken}` },
      });
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });

    test('Reject non-admin access to /api/admin/analytics/advanced with HTTP 403', async () => {
      const res = await requestApi('GET', '/api/admin/analytics/advanced', {
        headers: { Authorization: `Bearer ${renterToken}` },
      });
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });

    test('Reject non-admin access to /api/admin/audit-logs with HTTP 403', async () => {
      const res = await requestApi('GET', '/api/admin/audit-logs', {
        headers: { Authorization: `Bearer ${renterToken}` },
      });
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });
  });
});
