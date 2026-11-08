import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import adminRoutes from '../src/routes/adminRoutes.js';
import Booking from '../src/models/Booking.js';
import Dispute from '../src/models/Dispute.js';
import User from '../src/models/User.js';
import Device from '../src/models/Device.js';
import WalletTransaction from '../src/models/WalletTransaction.js';
import AdminAuditLog from '../src/models/AdminAuditLog.js';
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
  const disputeId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a666666');

  // In-memory data store for tests
  const store = {
    users: new Map(),
    accounts: new Map(),
    roles: new Map(),
    devices: new Map(),
    bookings: new Map(),
    disputes: new Map(),
    walletTransactions: new Map(),
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
      wallet: { balance: 10000000, escrowBalance: 0 },
    };
    const renterUser = {
      _id: renterId,
      name: 'Nguyễn Văn Renter',
      email: 'renter@techshare.vn',
      phone: '0901234567',
      role: 'renter',
      isActive: true,
      wallet: { balance: 5000000, escrowBalance: 2000000 },
    };
    const ownerUser = {
      _id: ownerId,
      name: 'Trần Văn Owner',
      email: 'owner@techshare.vn',
      phone: '0912345678',
      role: 'owner',
      isActive: true,
      wallet: { balance: 3000000, escrowBalance: 0 },
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
    const testDispute = {
      _id: disputeId,
      bookingId: testBooking,
      raisedBy: ownerUser,
      reason: 'Thiết bị bị trầy xước màn hình cảm ứng khi hoàn trả',
      evidenceImages: ['https://example.com/scratch.jpg'],
      requestedDeductAmount: 1000000,
      status: 'pending',
      adminDecision: 'none',
      finalDeductAmount: 0,
      adminNote: '',
      createdAt: new Date('2026-11-06'),
    };

    store.users.set(adminId.toString(), adminUser);
    store.users.set(renterId.toString(), renterUser);
    store.users.set(ownerId.toString(), ownerUser);
    store.devices.set(deviceId.toString(), testDevice);
    store.bookings.set(bookingId.toString(), testBooking);
    store.disputes.set(disputeId.toString(), testDispute);

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

    Dispute.find = (query) => {
      const arr = Array.from(store.disputes.values());
      const filtered = query?.status && query.status !== 'all'
        ? arr.filter((d) => d.status === query.status)
        : arr;
      return makeChain(filtered);
    };
    Dispute.countDocuments = async () => store.disputes.size;
    Dispute.findById = (id) => {
      const dId = id?._id || id;
      const d = store.disputes.get(dId.toString());
      if (!d) return makeChain(null);
      return makeChain(d);
    };

    User.findById = (id) => {
      const uId = id?._id || id;
      const u = store.users.get(uId.toString());
      return makeChain(u ? { ...u } : null);
    };
    User.findByIdAndUpdate = async (id, update) => {
      const uId = id?._id || id;
      const u = store.users.get(uId.toString());
      if (!u) return null;
      if (update.$set) {
        if (update.$set['wallet.balance'] !== undefined) u.wallet.balance = update.$set['wallet.balance'];
        if (update.$set['wallet.escrowBalance'] !== undefined) u.wallet.escrowBalance = update.$set['wallet.escrowBalance'];
      }
      return u;
    };
    User.aggregate = async () => [
      {
        totalWalletBalance: 18000000,
        totalEscrowBalance: 2000000,
        totalUsersWithWallet: 3,
      },
    ];

    WalletTransaction.create = async (doc) => {
      const id = new mongoose.Types.ObjectId();
      const tx = { _id: id, createdAt: new Date(), ...doc };
      store.walletTransactions.set(id.toString(), tx);
      return tx;
    };
    WalletTransaction.find = (query) => {
      const arr = Array.from(store.walletTransactions.values());
      const filtered = query?.userId ? arr.filter((t) => t.userId.toString() === query.userId.toString()) : arr;
      return makeChain(filtered);
    };
    WalletTransaction.countDocuments = async () => store.walletTransactions.size;
    WalletTransaction.aggregate = async () => [
      { _id: 'rental_payout', totalAmount: 1000000, count: 1 },
      { _id: 'deposit_refund', totalAmount: 1000000, count: 1 },
    ];
    WalletTransaction.findById = (id) => {
      const tx = store.walletTransactions.get(id.toString());
      return makeChain(tx ? { ...tx } : null);
    };

    AdminAuditLog.create = async (doc) => {
      const id = new mongoose.Types.ObjectId();
      const entry = { _id: id, createdAt: new Date(), ...doc };
      store.auditLogs.set(id.toString(), entry);
      return entry;
    };
    AdminAuditLog.find = () => makeChain(Array.from(store.auditLogs.values()));
    AdminAuditLog.countDocuments = async () => store.auditLogs.size;

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

  test('TC-P1-SEC-02: Non-admin (renter/owner) request to /api/admin/disputes returns 403', async () => {
    const res = await requestApi('GET', '/api/admin/disputes', {
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

  // ── 3. MODULE 2: DISPUTE RESOLUTION TESTS ──────────────────────────
  test('TC-P1-DISP-01: Admin can retrieve disputes list and single dispute details', async () => {
    const resList = await requestApi('GET', '/api/admin/disputes', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(resList.status, 200);
    assert.ok(Array.isArray(resList.body.data));

    const resDetail = await requestApi('GET', `/api/admin/disputes/${disputeId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(resDetail.status, 200);
    assert.equal(resDetail.body.data._id.toString(), disputeId.toString());
  });

  test('TC-P1-DISP-02: Admin moves dispute to in_review status with internal note', async () => {
    const res = await requestApi('PATCH', `/api/admin/disputes/${disputeId}/review`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { adminNote: 'Đang yêu cầu thêm ảnh chụp hiện trạng' },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'in_review');
    assert.ok(res.body.data.adminNote.includes('Đang yêu cầu thêm ảnh'));
  });

  test('TC-P1-DISP-03: Reject resolution with negative deduction amount', async () => {
    const res = await requestApi('PATCH', `/api/admin/disputes/${disputeId}/resolve`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { decision: 'partial_deduct', deductAmount: -500000 },
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.message.includes('không được âm'));
  });

  test('TC-P1-DISP-04: Reject resolution when deduction amount exceeds actual deposit held', async () => {
    const res = await requestApi('PATCH', `/api/admin/disputes/${disputeId}/resolve`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { decision: 'partial_deduct', deductAmount: 5000000 }, // Held deposit is 2,000,000
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.message.includes('vượt quá tiền cọc thực tế'));
  });

  test('TC-P1-DISP-05: Resolve dispute with partial deduction and verify financial consistency', async () => {
    const initialRenterBalance = store.users.get(renterId.toString()).wallet.balance;
    const initialOwnerBalance = store.users.get(ownerId.toString()).wallet.balance;

    // Deduct 1,000,000 from 2,000,000 deposit; refund 1,000,000 to renter; pay 1,000,000 to owner
    const res = await requestApi('PATCH', `/api/admin/disputes/${disputeId}/resolve`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        decision: 'partial_deduct',
        deductAmount: 1000000,
        adminNote: 'Đồng ý bồi thường 1.000.000₫ cho chủ máy theo thỏa thuận',
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'resolved');
    assert.equal(res.body.data.finalDeductAmount, 1000000);

    // Verify wallet updates
    const updatedRenter = store.users.get(renterId.toString());
    const updatedOwner = store.users.get(ownerId.toString());
    assert.equal(updatedRenter.wallet.balance, initialRenterBalance + 1000000);
    assert.equal(updatedOwner.wallet.balance, initialOwnerBalance + 1000000);
    assert.equal(updatedRenter.wallet.escrowBalance, 0); // Escrow reduced by 2,000,000

    // Verify Audit log was created
    const logs = Array.from(store.auditLogs.values());
    const resolveLog = logs.find((l) => l.action === 'DISPUTE_RESOLVE');
    assert.ok(resolveLog, 'Audit log entry for DISPUTE_RESOLVE must exist');
    assert.equal(resolveLog.targetId, disputeId.toString());
  });

  test('TC-P1-DISP-06: Prevent resolving an already resolved dispute (Idempotency)', async () => {
    const res = await requestApi('PATCH', `/api/admin/disputes/${disputeId}/resolve`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { decision: 'full_refund' },
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.message.includes('không thể phân xử lần 2'));
  });

  // ── 4. MODULE 3: WALLET & TRANSACTIONS TESTS ────────────────────────
  test('TC-P1-WALL-01: Admin can retrieve platform wallet overview', async () => {
    const res = await requestApi('GET', '/api/admin/wallet/overview', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.data.totalWalletBalance !== undefined);
    assert.ok(res.body.data.totalEscrowBalance !== undefined);
    assert.ok(Array.isArray(res.body.data.recentTransactions));
  });

  test('TC-P1-WALL-02: Admin can list wallet transactions with filter by type and status', async () => {
    const res = await requestApi('GET', '/api/admin/wallet/transactions?status=completed&page=1&limit=10', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.pagination);
  });

  test('TC-P1-WALL-03: Admin can inspect specific user wallet and transaction history', async () => {
    const res = await requestApi('GET', `/api/admin/wallet/users/${renterId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.name, 'Nguyễn Văn Renter');
    assert.ok(res.body.data.wallet);
    assert.ok(Array.isArray(res.body.data.transactions));
  });

  test('TC-P1-WALL-04: Admin can export wallet transactions to CSV', async () => {
    const res = await requestApi('GET', '/api/admin/wallet/export', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type']?.includes('text/csv'));
    assert.ok(typeof res.body === 'string' && res.body.includes('Mã giao dịch'));
  });

  // ── 5. AUDIT LOGS TESTS ───────────────────────────────────────────
  test('TC-P1-AUDIT-01: Admin can query central audit logs', async () => {
    const res = await requestApi('GET', '/api/admin/audit-logs', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length > 0);
  });
});
