import assert from 'node:assert/strict';
import { test, describe, before, after, beforeEach } from 'node:test';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import adminRoutes from '../src/routes/adminRoutes.js';
import adminEkycRoutes from '../src/routes/adminEkycRoutes.js';

const TEST_JWT_SECRET = process.env.JWT_SECRET || 'techshare_jwt_secret_key_2026';

// Định danh test người dùng cố định
const ADMIN_ID = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a111111');
const RENTER_ID = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a222222');
const OWNER_ID = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a333333');
const BOTH_ID = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a444444');
const REVOKED_ADMIN_ID = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a555555');
const DELETED_USER_ID = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a666666');

// Tạo token theo vai trò
function createToken(payload, secret = TEST_JWT_SECRET, options = {}) {
  return jwt.sign(payload, secret, { expiresIn: '1h', ...options });
}

describe('LOGIC-001: Admin Authentication & Authorization Security Tests', () => {
  let app;
  let server;
  let baseUrl;
  let originalDb;

  // Mock DB collections
  const mockUsers = new Map();
  const mockAccounts = new Map();

  before(async () => {
    originalDb = mongoose.connection.db;

    // Thiết lập mock database trong memory
    mongoose.connection.db = {
      collection(name) {
        if (name === 'users') {
          return {
            findOne: async (query) => {
              if (query._id) {
                return mockUsers.get(query._id.toString()) || null;
              }
              if (query.role) {
                for (const u of mockUsers.values()) {
                  if (u.role === query.role) return u;
                }
              }
              return null;
            },
            countDocuments: async () => mockUsers.size,
            find: () => ({
              sort: () => ({
                skip: () => ({
                  limit: () => ({
                    toArray: async () => Array.from(mockUsers.values()),
                  }),
                }),
              }),
            }),
            aggregate: () => ({
              toArray: async () => [],
            }),
          };
        }

        if (name === 'accounts') {
          return {
            findOne: async (query) => {
              if (query._id) {
                return mockAccounts.get(query._id.toString()) || null;
              }
              if (query.$or) {
                for (const cond of query.$or) {
                  const id = (cond.userId || cond._id)?.toString();
                  if (id && mockAccounts.has(id)) return mockAccounts.get(id);
                }
              }
              return null;
            },
          };
        }

        if (name === 'devices') {
          return {
            countDocuments: async () => 10,
            aggregate: () => ({
              toArray: async () => [],
            }),
            find: () => ({
              sort: () => ({
                skip: () => ({
                  limit: () => ({
                    toArray: async () => [],
                  }),
                }),
              }),
            }),
            findOne: async () => ({
              _id: new mongoose.Types.ObjectId('64e0a12f9b1c2b001a999999'),
              title: 'MacBook Pro M2',
              status: 'available',
            }),
            deleteOne: async () => ({ deletedCount: 1 }),
          };
        }

        if (name === 'bookings') {
          return {
            countDocuments: async () => 5,
            aggregate: () => ({
              toArray: async () => [],
            }),
            find: () => ({
              sort: () => ({
                limit: () => ({
                  toArray: async () => [],
                }),
              }),
            }),
          };
        }

        if (name === 'ekycrequests') {
          return {
            countDocuments: async () => 2,
            find: () => ({
              sort: () => ({
                skip: () => ({
                  limit: () => ({
                    toArray: async () => [],
                  }),
                }),
              }),
            }),
          };
        }

        return {
          findOne: async () => null,
          find: () => ({
            sort: () => ({
              skip: () => ({
                limit: () => ({
                  toArray: async () => [],
                }),
              }),
            }),
            toArray: async () => [],
          }),
          countDocuments: async () => 0,
        };
      },
    };

    // Khởi tạo Express Test App
    app = express();
    app.use(express.json());

    // Public / non-admin route để kiểm tra hồi quy
    app.get('/api/public/status', (req, res) => {
      res.json({ success: true, message: 'Public endpoint working normally' });
    });

    // Mount Admin routers
    app.use('/api/admin', adminEkycRoutes);
    app.use('/api/admin', adminRoutes);

    // Lắng nghe port ngẫu nhiên
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    mongoose.connection.db = originalDb;
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  beforeEach(() => {
    mockUsers.clear();
    mockAccounts.clear();

    // 1. Valid Admin User
    mockUsers.set(ADMIN_ID.toString(), {
      _id: ADMIN_ID,
      name: 'System Admin',
      role: 'admin',
      isActive: true,
    });
    mockAccounts.set(ADMIN_ID.toString(), {
      _id: ADMIN_ID,
      userId: ADMIN_ID,
      role: 'admin',
      isActive: true,
    });

    // 2. Regular Renter
    mockUsers.set(RENTER_ID.toString(), {
      _id: RENTER_ID,
      name: 'Regular Renter',
      role: 'renter',
      isActive: true,
    });
    mockAccounts.set(RENTER_ID.toString(), {
      _id: RENTER_ID,
      userId: RENTER_ID,
      role: 'renter',
      isActive: true,
    });

    // 3. Device Owner
    mockUsers.set(OWNER_ID.toString(), {
      _id: OWNER_ID,
      name: 'Device Owner',
      role: 'owner',
      isActive: true,
    });
    mockAccounts.set(OWNER_ID.toString(), {
      _id: OWNER_ID,
      userId: OWNER_ID,
      role: 'owner',
      isActive: true,
    });

    // 4. Dual Role User (Both)
    mockUsers.set(BOTH_ID.toString(), {
      _id: BOTH_ID,
      name: 'Dual Role User',
      role: 'both',
      isActive: true,
    });
    mockAccounts.set(BOTH_ID.toString(), {
      _id: BOTH_ID,
      userId: BOTH_ID,
      role: 'both',
      isActive: true,
    });

    // 5. Revoked Admin (Role changed in DB to 'renter')
    mockUsers.set(REVOKED_ADMIN_ID.toString(), {
      _id: REVOKED_ADMIN_ID,
      name: 'Revoked Admin',
      role: 'renter',
      isActive: true,
    });
    mockAccounts.set(REVOKED_ADMIN_ID.toString(), {
      _id: REVOKED_ADMIN_ID,
      userId: REVOKED_ADMIN_ID,
      role: 'renter',
      isActive: true,
    });

    // DELETED_USER_ID is not added to mockUsers or mockAccounts
  });

  // TC-SEC-01: Admin endpoint with no Authorization header -> 401
  test('TC-SEC-01: Admin endpoint with no Authorization header returns 401 Unauthorized', async () => {
    const endpoints = [
      '/api/admin/analytics',
      '/api/admin/users',
      '/api/admin/devices',
    ];

    for (const ep of endpoints) {
      const res = await fetch(`${baseUrl}${ep}`);
      assert.equal(res.status, 401, `Expected 401 for ${ep} without auth header, got ${res.status}`);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /token/i);
    }
  });

  // TC-SEC-02: Admin endpoint with valid renter/owner/both token -> 403
  test('TC-SEC-02: Admin endpoint with valid renter/owner/both token returns 403 Forbidden', async () => {
    const nonAdminRoles = [
      { id: RENTER_ID, role: 'renter' },
      { id: OWNER_ID, role: 'owner' },
      { id: BOTH_ID, role: 'both' },
    ];

    for (const { id, role } of nonAdminRoles) {
      const token = createToken({ userId: id.toString(), accountId: id.toString(), role });
      const res = await fetch(`${baseUrl}/api/admin/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      assert.equal(res.status, 403, `Expected 403 for role '${role}', got ${res.status}`);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /Admin/i);
    }
  });

  // TC-SEC-03: Admin endpoint with valid admin token -> 200 Success
  test('TC-SEC-03: Admin endpoint with valid admin token succeeds with 200', async () => {
    const adminToken = createToken({
      userId: ADMIN_ID.toString(),
      accountId: ADMIN_ID.toString(),
      role: 'admin',
    });

    const res = await fetch(`${baseUrl}/api/admin/analytics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.equal(res.status, 200, `Expected 200 for valid admin token, got ${res.status}`);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data);
    assert.equal(body.data.admin._id, ADMIN_ID.toString());
  });

  // TC-SEC-04: Admin endpoint with malformed/forged/expired token -> 401
  test('TC-SEC-04: Admin endpoint with malformed/forged/expired token returns 401 Unauthorized', async () => {
    // 1. Forged token with invalid signature
    const forgedToken = createToken(
      { userId: ADMIN_ID.toString(), role: 'admin' },
      'completely_wrong_secret_attacker_key'
    );
    const resForged = await fetch(`${baseUrl}/api/admin/analytics`, {
      headers: { Authorization: `Bearer ${forgedToken}` },
    });
    assert.equal(resForged.status, 401, 'Forged JWT signature must return 401');

    // 2. Expired token
    const expiredToken = jwt.sign(
      { userId: ADMIN_ID.toString(), role: 'admin' },
      TEST_JWT_SECRET,
      { expiresIn: '-10s' }
    );
    const resExpired = await fetch(`${baseUrl}/api/admin/analytics`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    assert.equal(resExpired.status, 401, 'Expired JWT must return 401');

    // 3. Malformed token string
    const resMalformed = await fetch(`${baseUrl}/api/admin/analytics`, {
      headers: { Authorization: 'Bearer this-is-not-a-valid-jwt-token' },
    });
    assert.equal(resMalformed.status, 401, 'Malformed JWT must return 401');

    // 4. Header without Bearer prefix
    const dummyToken = createToken({ userId: ADMIN_ID.toString(), role: 'admin' });
    const resNoBearer = await fetch(`${baseUrl}/api/admin/analytics`, {
      headers: { Authorization: `Basic ${dummyToken}` },
    });
    assert.equal(resNoBearer.status, 401, 'Non-Bearer auth header must return 401');
  });

  // TC-SEC-05: Non-admin trying to toggle user active status -> 403
  test('TC-SEC-05: Non-admin trying to toggle user active status receives 403 Forbidden', async () => {
    const renterToken = createToken({
      userId: RENTER_ID.toString(),
      accountId: RENTER_ID.toString(),
      role: 'renter',
    });

    const res = await fetch(`${baseUrl}/api/admin/users/${ADMIN_ID.toString()}/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${renterToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isActive: false }),
    });

    assert.equal(res.status, 403, 'Non-admin attempting to toggle user status must receive 403');
    const body = await res.json();
    assert.equal(body.success, false);
  });

  // TC-SEC-06: Non-admin trying to delete device -> 403
  test('TC-SEC-06: Non-admin trying to delete device receives 403 Forbidden', async () => {
    const ownerToken = createToken({
      userId: OWNER_ID.toString(),
      accountId: OWNER_ID.toString(),
      role: 'owner',
    });

    const res = await fetch(`${baseUrl}/api/admin/devices/64e0a12f9b1c2b001a999999`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });

    assert.equal(res.status, 403, 'Non-admin attempting to delete device must receive 403');
    const body = await res.json();
    assert.equal(body.success, false);
  });

  // TC-SEC-07: User whose admin role was revoked in DB -> 403
  test('TC-SEC-07: User with valid admin token whose role was revoked in DB receives 403 Forbidden', async () => {
    // Token has role: 'admin', but DB record for REVOKED_ADMIN_ID has role: 'renter'
    const staleAdminToken = createToken({
      userId: REVOKED_ADMIN_ID.toString(),
      accountId: REVOKED_ADMIN_ID.toString(),
      role: 'admin',
    });

    const res = await fetch(`${baseUrl}/api/admin/analytics`, {
      headers: { Authorization: `Bearer ${staleAdminToken}` },
    });

    assert.equal(res.status, 403, 'Revoked admin user must receive 403 Forbidden');
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /thu hồi/i);
  });

  // TC-SEC-08: Deleted user with stale admin token -> 401
  test('TC-SEC-08: Deleted user with stale admin token receives 401 Unauthorized', async () => {
    // Token has role: 'admin', but DELETED_USER_ID does not exist in mockUsers/mockAccounts
    const deletedUserToken = createToken({
      userId: DELETED_USER_ID.toString(),
      accountId: DELETED_USER_ID.toString(),
      role: 'admin',
    });

    const res = await fetch(`${baseUrl}/api/admin/analytics`, {
      headers: { Authorization: `Bearer ${deletedUserToken}` },
    });

    assert.equal(res.status, 401, 'Deleted user with stale admin token must receive 401');
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /xóa|không tồn tại/i);
  });

  // TC-SEC-09: Request attempting role forgery via body/query/headers -> rejected
  test('TC-SEC-09: Request attempting role forgery via body, query, or headers is rejected', async () => {
    // 1. Unauthenticated request with X-User-Id header pointing to admin
    const resHeaderBypass = await fetch(`${baseUrl}/api/admin/analytics`, {
      headers: {
        'x-user-id': ADMIN_ID.toString(),
        'X-User-Role': 'admin',
      },
    });
    assert.equal(resHeaderBypass.status, 401, 'X-User-Id header must not bypass authentication (must be 401)');

    // 2. Unauthenticated request with query parameters trying to claim admin identity
    const resQueryBypass = await fetch(`${baseUrl}/api/admin/analytics?userId=${ADMIN_ID.toString()}&role=admin`);
    assert.equal(resQueryBypass.status, 401, 'Query parameters must not bypass authentication (must be 401)');

    // 3. Authenticated renter attempting to elevate role via body or headers
    const renterToken = createToken({
      userId: RENTER_ID.toString(),
      accountId: RENTER_ID.toString(),
      role: 'renter',
    });
    const resBodyRole = await fetch(`${baseUrl}/api/admin/analytics`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${renterToken}`,
        'x-user-id': ADMIN_ID.toString(),
        'x-user-role': 'admin',
      },
    });
    assert.equal(resBodyRole.status, 403, 'Renter attempting header override must still receive 403');
  });

  // TC-SEC-10: Verify ALL admin routes require admin privileges
  test('TC-SEC-10: ALL /api/admin/* endpoints require admin privileges (no exceptions)', async () => {
    const renterToken = createToken({
      userId: RENTER_ID.toString(),
      accountId: RENTER_ID.toString(),
      role: 'renter',
    });

    const routes = [
      { method: 'GET', path: '/api/admin/analytics' },
      { method: 'GET', path: '/api/admin/overview' },
      { method: 'GET', path: '/api/admin/users' },
      { method: 'PATCH', path: '/api/admin/users/64e0a12f9b1c2b001a111111/status' },
      { method: 'GET', path: '/api/admin/devices' },
      { method: 'GET', path: '/api/admin/devices/moderation' },
      { method: 'GET', path: '/api/admin/devices/64e0a12f9b1c2b001a999999' },
      { method: 'PATCH', path: '/api/admin/devices/64e0a12f9b1c2b001a999999/moderate' },
      { method: 'POST', path: '/api/admin/devices/64e0a12f9b1c2b001a999999/moderate' },
      { method: 'DELETE', path: '/api/admin/devices/64e0a12f9b1c2b001a999999' },
      { method: 'GET', path: '/api/admin/ekyc' },
      { method: 'GET', path: '/api/admin/ekyc-requests' },
      { method: 'PATCH', path: '/api/admin/ekyc/64e0a12f9b1c2b001a888888/approve' },
      { method: 'PATCH', path: '/api/admin/ekyc/64e0a12f9b1c2b001a888888/reject' },
    ];

    for (const r of routes) {
      // 1. Unauthenticated test -> 401
      const resUnauth = await fetch(`${baseUrl}${r.path}`, {
        method: r.method,
        headers: { 'Content-Type': 'application/json' },
      });
      assert.equal(
        resUnauth.status,
        401,
        `Route ${r.method} ${r.path} must return 401 when unauthenticated (got ${resUnauth.status})`
      );

      // 2. Renter test -> 403
      const resForbidden = await fetch(`${baseUrl}${r.path}`, {
        method: r.method,
        headers: {
          Authorization: `Bearer ${renterToken}`,
          'Content-Type': 'application/json',
        },
      });
      assert.equal(
        resForbidden.status,
        403,
        `Route ${r.method} ${r.path} must return 403 for non-admin (got ${resForbidden.status})`
      );
    }
  });

  // TC-SEC-11: Verify non-admin routes still function normally for regular users
  test('TC-SEC-11: Public and non-admin routes remain functional and unaffected', async () => {
    // 1. Public route without auth header
    const resPublic = await fetch(`${baseUrl}/api/public/status`);
    assert.equal(resPublic.status, 200, 'Public route should return 200 without auth header');
    const bodyPublic = await resPublic.json();
    assert.equal(bodyPublic.success, true);

    // 2. Public route with regular user auth header
    const renterToken = createToken({
      userId: RENTER_ID.toString(),
      accountId: RENTER_ID.toString(),
      role: 'renter',
    });
    const resPublicWithAuth = await fetch(`${baseUrl}/api/public/status`, {
      headers: { Authorization: `Bearer ${renterToken}` },
    });
    assert.equal(resPublicWithAuth.status, 200, 'Public route should return 200 with user auth header');
  });
});
