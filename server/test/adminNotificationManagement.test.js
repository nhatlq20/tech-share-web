import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { getJwtConfig } from '../src/config/env.js';
import { errorHandler } from '../src/middlewares/errorMiddleware.js';
import AdminNotification from '../src/models/AdminNotification.js';
import Notification from '../src/models/Notification.js';
import EkycRequest from '../src/models/EkycRequest.js';
import { getUserNotifications } from '../src/services/notificationService.js';
import { recordAdminNotification } from '../src/services/adminNotificationService.js';
import adminRoutes from '../src/routes/adminRoutes.js';
import adminPageRoutes from '../src/routes/adminPageRoutes.js';
import ekycRoutes from '../src/routes/ekycRoutes.js';
import ownerEkycRoutes from '../src/routes/ownerEkycRoutes.js';
import deviceRoutes from '../src/routes/deviceRoutes.js';
import ownerRoutes from '../src/routes/ownerRoutes.js';

const mongoUri = process.env.TECHSHARE_TEST_MONGODB_URI;
if (mongoUri && !/^mongodb:\/\/127\.0\.0\.1:\d+\/?$/.test(mongoUri)) {
  throw new Error('Use a dedicated local MongoDB instance for notification integration tests.');
}

describe('Admin notification center with isolated MongoDB', { skip: !mongoUri }, () => {
  const id = () => new mongoose.Types.ObjectId();
  const identity = (role) => ({ userId: id(), accountId: id(), role });
  const admin = identity('admin');
  const secondAdmin = identity('admin');
  const renter = identity('renter');
  const owner = identity('owner');
  const revoked = identity('renter');
  const identities = [admin, secondAdmin, renter, owner, revoked];
  const photos = {
    idCardFrontUrl: 'https://example.test/front.png',
    idCardBackUrl: 'https://example.test/back.png',
    idCardNumber: 'PRIVATE-ID-TEST',
  };
  const apiRoot = '/api/admin/notifications';
  let server;
  let base;
  let db;
  let ekycId;
  let ownerRequestId;
  let deviceId;

  function sign(user) {
    return jwt.sign(user, getJwtConfig().secret, { expiresIn: '15m' });
  }

  before(async () => {
    await mongoose.connect(mongoUri, {
      dbName: 'notification_test_' + randomUUID().replace(/-/g, ''),
      serverSelectionTimeoutMS: 4000,
      autoIndex: false,
    });
    db = mongoose.connection.db;
    const roles = Object.fromEntries(['admin', 'renter', 'owner'].map((code) => [code, id()]));
    await db.collection('roles').insertMany(Object.entries(roles).map(([code, _id]) => ({ _id, code })));
    await db.collection('accounts').insertMany(identities.map((user) => ({
      _id: user.accountId, userId: user.userId, roleId: roles[user.role], isActive: true,
    })));
    await db.collection('users').insertMany(identities.map((user) => ({
      _id: user.userId, accountId: user.accountId, name: 'Người dùng thử nghiệm', address: 'Test address',
      isActive: true,
    })));
    await Notification.collection.insertOne({
      userId: admin.userId, title: 'User inbox only', body: 'Nội dung tiếng Việt', type: 'system',
      isRead: false, createdAt: new Date(),
    });

    const app = express();
    app.use(cookieParser());
    app.use(express.json());
    app.set('view engine', 'ejs');
    app.set('views', fileURLToPath(new URL('../src/views', import.meta.url)));
    app.use('/api/admin', adminRoutes);
    app.use('/api/ekyc', ekycRoutes);
    app.use('/api/owner-ekyc', ownerEkycRoutes);
    app.use('/api/devices', deviceRoutes);
    app.use('/api/owner', ownerRoutes);
    app.use('/admin', adminPageRoutes);
    app.use(errorHandler);
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
    base = 'http://127.0.0.1:' + server.address().port;
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    try {
      if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    } finally {
      await mongoose.disconnect();
    }
  });

  async function request(path, { user = admin, method = 'GET', body } = {}) {
    const response = await fetch(base + path, {
      method,
      headers: {
        ...(user && { Authorization: 'Bearer ' + sign(user) }),
        ...(body && { 'Content-Type': 'application/json' }),
      },
      body: body && JSON.stringify(body),
    });
    const payload = response.headers.get('content-type')?.includes('application/json')
      ? await response.json()
      : await response.text();
    return { status: response.status, headers: response.headers, payload };
  }

  test('creates exactly one notification after eKYC persistence, excluding sensitive fields', async (t) => {
    const submit = (body) => request('/api/ekyc/submit', { user: renter, method: 'POST', body });
    assert.equal((await submit({})).status, 400);
    assert.equal(await AdminNotification.countDocuments(), 0);
    const missingPhoto = await submit({ ...photos, idCardFrontUrl: ' ' });
    assert.ok(missingPhoto.status >= 400);
    assert.equal(await AdminNotification.countDocuments(), 0);

    const failedWrite = t.mock.method(EkycRequest, 'create', async () => {
      throw new Error('Simulated eKYC persistence failure');
    });
    try {
      assert.equal((await submit(photos)).status, 500);
      assert.equal(failedWrite.mock.callCount(), 1);
      assert.equal(await AdminNotification.countDocuments(), 0);
    } finally {
      failedWrite.mock.restore();
    }

    const created = await submit(photos);
    assert.equal(created.status, 201, created.payload.message);
    ekycId = created.payload.data._id;
    assert.equal((await submit(photos)).status, 400);
    await Promise.all(Array.from({ length: 3 }, () => recordAdminNotification('ekyc', ekycId)));
    const result = await request(apiRoot + '?category=ekyc');
    assert.equal(result.payload.summary.total, 1);
    assert.equal(result.payload.summary.pending, 1);
    assert.equal(result.payload.data[0]._id, 'ekyc:' + ekycId);
    assert.equal(result.payload.data[0].action.href, '/admin/ekyc-verification?id=' + ekycId);
    assert.doesNotMatch(JSON.stringify(result.payload), /PRIVATE-ID-TEST|front\.png|readBy/);
    const page = await request(result.payload.data[0].action.href);
    assert.equal(page.status, 200);
    assert.ok(page.payload.includes('data-id="' + ekycId + '"'));
    assert.ok(page.payload.includes('data-front="' + photos.idCardFrontUrl + '"'));
  });

  test('connects owner verification and both device creation paths to real detail links', async () => {
    await db.collection('accounts').updateOne({ _id: renter.accountId }, { $set: { isVerified: true } });
    const ownerRequest = await request('/api/owner-ekyc/submit', {
      user: renter, method: 'POST', body: { ...photos, idCardHoldingUrl: 'https://example.test/holding.png' },
    });
    assert.equal(ownerRequest.status, 201, ownerRequest.payload.message);
    ownerRequestId = ownerRequest.payload.data._id;
    const device = await request('/api/devices', { user: owner, method: 'POST', body: {
      title: 'Máy ảnh kiểm thử', name: 'Test Camera', brand: 'Canon', category: 'camera',
      description: 'Test listing', dailyRate: 100000, depositAmount: 0,
      images: [photos.idCardFrontUrl, photos.idCardBackUrl],
    } });
    assert.equal(device.status, 201, device.payload.message);
    deviceId = device.payload.data._id;
    const alias = await request('/api/owner/devices', { user: owner, method: 'POST', body: {
      name: 'Another test listing', dailyRate: 120000, images: [photos.idCardFrontUrl],
    } });
    assert.equal(alias.status, 201, alias.payload.message);

    const owners = await request(apiRoot + '?category=owner-verification');
    assert.equal(owners.payload.data[0].action.href, '/admin/owner-ekyc-verification?id=' + ownerRequestId);
    const ownerPage = await request(owners.payload.data[0].action.href);
    assert.equal(ownerPage.status, 200);
    assert.equal(ownerPage.headers.get('cache-control'), 'no-store');
    assert.ok(ownerPage.payload.includes('data-id="' + ownerRequestId + '"'));
    assert.ok(ownerPage.payload.includes('data-front="' + photos.idCardFrontUrl + '"'));
    assert.ok(ownerPage.payload.includes('data-back="' + photos.idCardBackUrl + '"'));
    assert.match(ownerPage.payload, /data-holding="https:\/\/example\.test\/holding\.png"/);
    assert.match(ownerPage.payload, /btn-inspect-owner/);
    const devices = await request(apiRoot + '?category=devices');
    assert.equal(devices.payload.pagination.total, 2);
    const record = devices.payload.data.find((item) => item._id === 'devices:' + deviceId);
    assert.ok(record);
    const devicePage = await request(record.action.href);
    assert.equal(devicePage.status, 200);
    assert.ok(devicePage.payload.includes('data-device-id="' + deviceId + '"'));
  });

  test('paginates and filters records, keeping unread and unresolved business counts independent', async () => {
    const first = await request(apiRoot + '?limit=1');
    const second = await request(apiRoot + '?limit=1&page=2');
    assert.equal(first.payload.pagination.total, 4);
    assert.notEqual(first.payload.data[0]._id, second.payload.data[0]._id);
    assert.equal(first.payload.summary.unread, 4);
    assert.equal(first.payload.summary.pending, 4);

    const endpoint = apiRoot + '/' + encodeURIComponent('ekyc:' + ekycId) + '/read';
    assert.equal((await request(endpoint, { method: 'PATCH' })).payload.unread, 3);
    assert.equal((await request(endpoint, { method: 'PATCH' })).payload.unread, 3);
    assert.equal((await EkycRequest.findById(ekycId).lean()).status, 'pending');
    const read = await request(apiRoot + '?search=identity+verification');
    assert.equal(read.payload.data[0].isRead, true);
    assert.equal(read.payload.summary.pending, 4);
    assert.equal((await request(apiRoot + '?category=ekyc&unread=true')).payload.pagination.total, 0);
    assert.equal((await request(apiRoot + '?search=%5B')).payload.pagination.total, 0);
    assert.equal((await request(apiRoot + '/unread-count', { user: secondAdmin })).payload.unread, 4);

    await EkycRequest.updateOne({ _id: ekycId }, { $set: { status: 'approved' } });
    assert.equal((await request(apiRoot + '/read-all', { method: 'PATCH' })).payload.unread, 0);
    const afterReadAll = await request(apiRoot + '?unread=true');
    assert.equal(afterReadAll.payload.pagination.total, 0);
    assert.equal(afterReadAll.payload.summary.pending, 3);
    assert.equal((await request(apiRoot + '/unread-count', { user: secondAdmin })).payload.unread, 4);
    const userInbox = await getUserNotifications(String(admin.userId));
    assert.deepEqual(userInbox.items.map(({ title, isRead }) => ({ title, isRead })), [{ title: 'User inbox only', isRead: false }]);
  });

  test('blocks unauthorized reads and updates and exposes no broadcast route', async () => {
    assert.equal((await request(apiRoot, { user: null })).status, 401);
    assert.equal((await request(apiRoot, { user: renter })).status, 403);
    assert.equal((await request(apiRoot, { user: { ...revoked, role: 'admin' } })).status, 403);
    assert.equal((await request('/admin/notifications', { user: renter })).status, 403);
    assert.equal((await request(apiRoot + '/read-all', { user: renter, method: 'PATCH' })).status, 403);
    assert.equal((await request(apiRoot + '/invalid/read', { method: 'PATCH' })).status, 400);
    assert.equal((await request(apiRoot + '/ekyc:' + id() + '/read', { method: 'PATCH' })).status, 404);
    assert.equal((await request(apiRoot + '/send', { method: 'POST', body: {} })).status, 404);
    const center = await request('/admin/notifications');
    assert.match(center.payload, /<h1>Admin Notifications<\/h1>/);
    assert.equal((center.payload.match(/data-admin-unread-badge/g) || []).length, 2);
    assert.doesNotMatch(center.payload, /Create Broadcast|broadcastForm|Broadcast Notifications/);

    await EkycRequest.deleteOne({ _id: ekycId });
    const historicalAlert = await request(apiRoot + '?category=ekyc');
    assert.equal(historicalAlert.payload.data[0].action, null);
  });
});
