import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import User from '../src/models/User.js';
import Account from '../src/models/Account.js';
import Otp from '../src/models/Otp.js';
import Role from '../src/models/Role.js';
import { registerInit, registerVerifyOtp, login } from '../src/controllers/authController.js';

describe('FEATURE: Account & User Consistent Registration Flow', () => {
  beforeEach(() => {
    // Stub nodemailer to avoid real network attempts in unit tests
    nodemailer.createTransport = () => ({
      sendMail: async () => ({ messageId: 'test-id' }),
    });
  });

  test('TC-REG-01: User model sanitizes empty referralCode to undefined and preserves valid referralCode', () => {
    const userWithEmptyRef = new User({
      accountId: new mongoose.Types.ObjectId(),
      name: 'Nguyen Van A',
      username: 'nguyenvana',
      email: 'a@example.com',
      referralCode: '',
    });

    const userObj = userWithEmptyRef.toObject();
    assert.strictEqual(
      userObj.referralCode,
      undefined,
      'Empty referralCode string must be converted to undefined to prevent sparse unique index collisions'
    );

    const userWithValidRef = new User({
      accountId: new mongoose.Types.ObjectId(),
      name: 'Nguyen Van B',
      username: 'nguyenvanb',
      email: 'b@example.com',
      referralCode: 'TSREF123',
    });

    const validObj = userWithValidRef.toObject();
    assert.strictEqual(
      validObj.referralCode,
      'TSREF123',
      'Valid non-empty referralCode must be preserved'
    );
  });

  test('TC-REG-02: User model properly exposes email and role as persisted paths with fallback getters', () => {
    const user = new User({
      accountId: new mongoose.Types.ObjectId(),
      name: 'Tran Thi C',
      username: 'tranthic',
      email: 'c@example.com',
      role: 'renter',
    });

    assert.strictEqual(user.email, 'c@example.com');
    assert.strictEqual(user.role, 'renter');

    // GeoJSON location should default to undefined (not empty coordinates array)
    const userObj = user.toObject();
    assert.strictEqual(userObj.location, undefined);
  });

  test('TC-REG-03: registerInit cleans up orphaned accounts that have no matching user document', async () => {
    const orphanedAccountId = new mongoose.Types.ObjectId();
    let accountDeleted = false;

    Account.findOne = () => ({
      lean: async () => ({
        _id: orphanedAccountId,
        username: 'orphanuser',
        email: 'orphan@example.com',
      }),
    });

    // Simulating no user exists for this accountId
    User.findOne = () => ({
      lean: async () => null,
    });

    Account.deleteOne = async (filter) => {
      if (String(filter._id) === String(orphanedAccountId)) {
        accountDeleted = true;
      }
      return { deletedCount: 1 };
    };

    Otp.findOneAndUpdate = async () => ({});

    const req = {
      body: {
        username: 'orphanuser',
        name: 'Orphan User',
        phone: '0987654321',
        email: 'orphan@example.com',
        password: 'Password123',
      },
    };

    let responseCode = null;
    let responseBody = null;
    const res = {
      status: (code) => {
        responseCode = code;
        return {
          json: (data) => {
            responseBody = data;
            return data;
          },
        };
      },
    };

    await registerInit(req, res);

    assert.strictEqual(accountDeleted, true, 'Orphaned account should be deleted on new registration attempt');
    assert.strictEqual(responseCode, 200);
    assert.strictEqual(responseBody?.success, true);
  });

  test('TC-REG-04: registerVerifyOtp rolls back (deletes) created Account if User creation fails', async () => {
    const otpId = new mongoose.Types.ObjectId();
    const mockOtpRecord = {
      _id: otpId,
      otp: '123456',
      expiresAt: new Date(Date.now() + 60000),
      payload: {
        username: 'failuser',
        name: 'Fail User',
        phone: '0912345678',
        email: 'fail@example.com',
        passwordHash: '$2a$10$abcdefg123456',
      },
    };

    Otp.findOne = async () => mockOtpRecord;
    Account.findOne = async () => null;
    Role.findOne = () => ({
      lean: async () => ({ _id: new mongoose.Types.ObjectId(), code: 'renter' }),
    });

    let savedAccount = false;
    let rolledBackAccount = false;

    // Mock Account save and rollback
    Account.prototype.save = async function () {
      savedAccount = true;
      return this;
    };
    Account.deleteOne = async () => {
      rolledBackAccount = true;
      return { deletedCount: 1 };
    };

    // Force User.save to throw an error (simulating database error)
    User.prototype.save = async function () {
      throw new Error('Simulated DB error when inserting into users collection');
    };

    const req = {
      body: {
        email: 'fail@example.com',
        otp: '123456',
      },
    };

    let responseCode = null;
    let responseBody = null;
    const res = {
      status: (code) => {
        responseCode = code;
        return {
          json: (data) => {
            responseBody = data;
            return data;
          },
        };
      },
    };

    await registerVerifyOtp(req, res);

    assert.strictEqual(savedAccount, true, 'Account was initially saved');
    assert.strictEqual(rolledBackAccount, true, 'Account must be rolled back (deleted) when User.save() throws');
    assert.strictEqual(responseCode, 500);
    assert.strictEqual(responseBody?.success, false);
    assert.match(responseBody?.message, /activating your account/i);
  });

  test('TC-REG-05: registerVerifyOtp creates both Account and User with matching IDs when valid', async () => {
    const otpId = new mongoose.Types.ObjectId();
    const mockOtpRecord = {
      _id: otpId,
      otp: '654321',
      expiresAt: new Date(Date.now() + 60000),
      payload: {
        username: 'successuser',
        name: 'Success User',
        phone: '0911223344',
        email: 'success@example.com',
        passwordHash: '$2a$10$successhash',
      },
    };

    Otp.findOne = async () => mockOtpRecord;
    Otp.deleteOne = async () => ({ deletedCount: 1 });
    Account.findOne = async () => null;
    Role.findOne = () => ({
      lean: async () => ({ _id: new mongoose.Types.ObjectId(), code: 'renter' }),
    });

    let savedAccountData = null;
    let savedUserData = null;

    Account.prototype.save = async function () {
      savedAccountData = this;
      return this;
    };

    User.prototype.save = async function () {
      savedUserData = this;
      return this;
    };

    const req = {
      body: {
        email: 'success@example.com',
        otp: '654321',
      },
    };

    let responseCode = null;
    let responseBody = null;
    const res = {
      status: (code) => {
        responseCode = code;
        return {
          json: (data) => {
            responseBody = data;
            return data;
          },
        };
      },
    };

    await registerVerifyOtp(req, res);

    assert.strictEqual(responseCode, 201);
    assert.strictEqual(responseBody?.success, true);
    assert.ok(savedAccountData, 'Account document should be saved');
    assert.ok(savedUserData, 'User document should be saved');
    assert.strictEqual(String(savedUserData.accountId), String(savedAccountData._id));
    assert.strictEqual(String(savedAccountData.userId), String(savedUserData._id));
    assert.strictEqual(savedUserData.username, 'successuser');
    assert.strictEqual(savedUserData.email, 'success@example.com');
    assert.strictEqual(savedUserData.role, 'renter');
    assert.ok(savedUserData.referralCode, 'User should receive a generated unique referral code');
  });

  test('TC-REG-06: login auto-heals existing account lacking user profile', async () => {
    const mockAccountId = new mongoose.Types.ObjectId();
    const mockRoleId = new mongoose.Types.ObjectId();
    const mockAccount = {
      _id: mockAccountId,
      username: 'orphanlogin',
      email: 'orphanlogin@example.com',
      passwordHash: '$2a$10$dummyHash',
      roleId: { _id: mockRoleId, code: 'renter' },
      isActive: true,
      isbanned: false,
    };

    const makeQuery = (data) => ({
      select: () => makeQuery(data),
      populate: () => makeQuery(data),
      lean: () => Promise.resolve(data),
      then: (resolve) => resolve(data),
    });

    Account.findOne = () => makeQuery(mockAccount);
    User.findById = () => makeQuery(null);
    User.findOne = () => makeQuery(null);

    let healedUser = null;
    User.prototype.save = async function () {
      healedUser = this;
      return this;
    };

    let accountUpdated = false;
    Account.updateOne = async () => {
      accountUpdated = true;
      return { modifiedCount: 1 };
    };

    // Mock bcrypt compare
    const originalBcryptCompare = (await import('bcryptjs')).default.compare;
    (await import('bcryptjs')).default.compare = async () => true;

    const req = {
      body: {
        identifier: 'orphanlogin',
        password: 'ValidPassword123',
      },
    };

    let responseCode = null;
    let responseBody = null;
    const res = {
      status: (code) => {
        responseCode = code;
        return {
          json: (data) => {
            responseBody = data;
            return data;
          },
        };
      },
    };

    await login(req, res);

    // Restore bcrypt
    (await import('bcryptjs')).default.compare = originalBcryptCompare;

    assert.strictEqual(responseCode, 200);
    assert.strictEqual(responseBody?.success, true);
    assert.ok(healedUser, 'User profile should be automatically healed and created');
    assert.strictEqual(String(healedUser.accountId), String(mockAccountId));
    assert.strictEqual(healedUser.username, 'orphanlogin');
  });
});
