import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { banAccount, unbanAccount } from '../src/services/banService.js';
import { toggleUserBanStatus } from '../src/controllers/admin/adminBanController.js';
import { checkAccountNotBanned } from '../src/middlewares/banCheckMiddleware.js';
import Account from '../src/models/Account.js';
import User from '../src/models/User.js';

describe('FEATURE: User Account Ban & Real-Time Logout Management', () => {
  const mockAccountId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a111111');
  const mockUserId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a222222');
  const adminUser = {
    _id: new mongoose.Types.ObjectId('64e0a12f9b1c2b001a999999'),
    role: 'admin',
  };

  let mockAccountDoc;
  let mockUserDoc;

  beforeEach(() => {
    mockAccountDoc = {
      _id: mockAccountId,
      userId: mockUserId,
      username: 'testrenter',
      email: 'renter@test.com',
      isActive: true,
      isbanned: false,
      banReason: '',
      bannedAt: null,
      save: async function () { return this; },
    };

    mockUserDoc = {
      _id: mockUserId,
      accountId: mockAccountId,
      name: 'Test Renter',
      email: 'renter@test.com',
      isActive: true,
      isbanned: false,
      banReason: '',
      save: async function () { return this; },
    };

    // Mock Mongoose Model queries
    User.findById = async (id) => {
      if (String(id) === String(mockUserId)) return mockUserDoc;
      return null;
    };
    User.findOne = async () => mockUserDoc;
    User.updateOne = async (filter, update) => {
      if (update.$set) {
        Object.assign(mockUserDoc, update.$set);
      }
      return { modifiedCount: 1 };
    };

    const makeQuery = (data) => ({
      select: () => makeQuery(data),
      populate: () => makeQuery(data),
      lean: () => Promise.resolve(data),
      then: (resolve) => resolve(data),
    });

    Account.findById = (id) => {
      const doc = String(id) === String(mockAccountId) ? mockAccountDoc : null;
      return makeQuery(doc);
    };
    Account.findOne = () => makeQuery(mockAccountDoc);
    Account.updateOne = async (filter, update) => {
      if (update.$set) {
        Object.assign(mockAccountDoc, update.$set);
      }
      return { modifiedCount: 1 };
    };
  });

  test('TC-BAN-01: banAccount updates isbanned=true, banReason, and isActive=false in accounts', async () => {
    const reason = 'Vi phạm quy định giao nhận thiết bị, trễ hạn không thông báo';
    const result = await banAccount({
      targetId: mockUserId,
      reason,
      adminUser,
    });

    assert.equal(result.isbanned, true, 'Result must have isbanned=true');
    assert.equal(result.isActive, false, 'Result must have isActive=false');
    assert.equal(result.banReason, reason, 'Result must preserve the input reason');

    assert.equal(mockAccountDoc.isbanned, true, 'Account document must be updated with isbanned: true');
    assert.equal(mockAccountDoc.isActive, false, 'Account document must be updated with isActive: false');
    assert.equal(mockAccountDoc.banReason, reason, 'Account document must record banReason');
    assert.ok(mockAccountDoc.bannedAt instanceof Date, 'Account document must record bannedAt timestamp');

    assert.equal(mockUserDoc.isActive, false, 'User document must have isActive: false');
    assert.equal(mockUserDoc.isbanned, true, 'User document must have isbanned: true');
  });

  test('TC-BAN-02: unbanAccount restores isbanned=false, clears banReason, and sets isActive=true', async () => {
    // Ban first
    await banAccount({
      targetId: mockUserId,
      reason: 'Lý do ban test',
      adminUser,
    });
    assert.equal(mockAccountDoc.isbanned, true);

    // Unban
    const result = await unbanAccount({
      targetId: mockUserId,
      adminUser,
    });

    assert.equal(result.isbanned, false);
    assert.equal(result.isActive, true);
    assert.equal(result.banReason, '');

    assert.equal(mockAccountDoc.isbanned, false, 'Account document must have isbanned: false');
    assert.equal(mockAccountDoc.isActive, true, 'Account document must have isActive: true');
    assert.equal(mockAccountDoc.banReason, '', 'Account document must have empty banReason');
    assert.equal(mockUserDoc.isActive, true, 'User document must be active');
    assert.equal(mockUserDoc.isbanned, false, 'User document must have isbanned: false');
  });

  test('TC-BAN-03: adminBanController.toggleUserBanStatus locks user with reason and responds with JSON', async () => {
    const req = {
      params: { id: String(mockUserId) },
      body: {
        isbanned: true,
        reason: 'Gian lận thanh toán thẻ',
      },
      user: adminUser,
    };

    let statusCode = 200;
    let jsonResponse = null;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(payload) {
        jsonResponse = payload;
        return this;
      },
    };

    await toggleUserBanStatus(req, res, (err) => {
      if (err) throw err;
    });

    assert.equal(statusCode, 200);
    assert.equal(jsonResponse.success, true);
    assert.equal(jsonResponse.data.isbanned, true);
    assert.equal(jsonResponse.data.isActive, false);
    assert.equal(jsonResponse.data.banReason, 'Gian lận thanh toán thẻ');
  });

  test('TC-BAN-04: checkAccountNotBanned middleware rejects banned user request with 403 and reason', async () => {
    mockAccountDoc.isbanned = true;
    mockAccountDoc.isActive = false;
    mockAccountDoc.banReason = 'Tài khoản có dấu hiệu gian lận';

    const req = {
      user: {
        accountId: String(mockAccountId),
        userId: String(mockUserId),
      },
    };

    let statusCode = null;
    let jsonResponse = null;
    let nextCalled = false;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(payload) {
        jsonResponse = payload;
        return this;
      },
    };

    await checkAccountNotBanned(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false, 'Middleware should not call next() for banned user');
    assert.equal(statusCode, 403, 'Expected 403 status code for banned user');
    assert.equal(jsonResponse.success, false);
    assert.equal(jsonResponse.isbanned, true);
    assert.equal(jsonResponse.banReason, 'Tài khoản có dấu hiệu gian lận');
    assert.match(jsonResponse.message, /Tài khoản có dấu hiệu gian lận/);
  });

  test('TC-BAN-05: login with banned account credentials returns HTTP 403 with isbanned: true and reason', async () => {
    const { login } = await import('../src/controllers/authController.js');

    mockAccountDoc.isbanned = true;
    mockAccountDoc.isActive = false;
    mockAccountDoc.banReason = 'Vi phạm chính sách thanh toán và giữ tài sản';

    const req = {
      body: {
        identifier: 'renter@test.com',
        password: 'password123',
        portal: 'client',
      },
    };

    let statusCode = null;
    let jsonResponse = null;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(payload) {
        jsonResponse = payload;
        return this;
      },
    };

    await login(req, res);

    assert.equal(statusCode, 403, 'Login must return HTTP 403 when account is banned');
    assert.equal(jsonResponse.success, false);
    assert.equal(jsonResponse.isbanned, true);
    assert.equal(jsonResponse.banReason, 'Vi phạm chính sách thanh toán và giữ tài sản');
    assert.match(jsonResponse.message, /Vi phạm chính sách thanh toán và giữ tài sản/);
  });
});
