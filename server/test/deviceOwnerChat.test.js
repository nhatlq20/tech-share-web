import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { io as connect } from '../../client/node_modules/socket.io-client/build/esm/index.js';
import { getJwtConfig } from '../src/config/env.js';
import chatRoutes from '../src/routes/chatRoutes.js';
import { initSocket } from '../src/socket.js';
import { errorHandler } from '../src/middlewares/errorMiddleware.js';

const uri = process.env.TECHSHARE_TEST_MONGODB_URI;
if (uri && !/^mongodb:\/\/127\.0\.0\.1:\d+\/?$/.test(uri)) throw new Error('Use a dedicated local MongoDB instance.');

test('Device owner chats use real profiles, persist messages and enforce participant access', { skip: !uri }, async () => {
  await mongoose.connect(uri, { dbName: 'chat_test_' + randomUUID().replaceAll('-', ''), autoIndex: false });
  const db = mongoose.connection.db;
  const id = () => new mongoose.Types.ObjectId();
  const users = Array.from({ length: 3 }, (_, index) => ({ _id: id(), accountId: id(), name: ['Khách thuê', 'Chủ máy A', 'Chủ máy B'][index], avatar: '/avatar-' + index + '.png', isActive: true }));
  const devices = users.slice(1).map((user) => ({ _id: id(), ownerId: user._id, name: 'Máy ảnh tiếng Việt', images: [], isDeleted: false }));
  let server, io;
  const sockets = [];
  try {
    await db.collection('users').insertMany(users);
    await db.collection('accounts').insertMany(users.map((u) => ({ _id: u.accountId, isActive: true })));
    await db.collection('devices').insertMany(devices);
    const app = express();
    app.use(express.json());
    app.use('/api/chats', chatRoutes);
    app.use(errorHandler);
    server = app.listen(0, '127.0.0.1');
    io = initSocket(server);
    await once(server, 'listening');
    const base = 'http://127.0.0.1:' + server.address().port;
    const token = (index) => jwt.sign({ accountId: users[index].accountId, userId: users[index]._id, id: users[index].accountId }, getJwtConfig().secret);
    async function request(path, index = 0, method = 'GET', body) {
      const response = await fetch(base + '/api/chats' + path, { method, headers: { Authorization: 'Bearer ' + token(index), 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
      return { status: response.status, body: await response.json() };
    }
    const opened = await Promise.all(Array.from({ length: 6 }, () => request('/devices/' + devices[0]._id, 0, 'POST')));
    assert.ok(opened.every((r) => r.status === 200));
    const chat = opened[0].body.bookingId;
    assert.equal(new Set(opened.map((r) => r.body.bookingId)).size, 1);
    assert.equal(await db.collection('chat_inquiries').countDocuments(), 1);
    assert.equal(await db.collection('bookings').countDocuments(), 0);
    const history = await request('/' + chat);
    assert.equal(history.body.booking.partner.name, users[1].name);
    assert.equal(history.body.booking.partner.avatar, users[1].avatar);
    assert.deepEqual(history.body.data, []);
    assert.equal((await request('/devices/' + devices[0]._id, 1, 'POST')).status, 400);
    assert.equal((await request('/devices/' + id(), 0, 'POST')).status, 404);
    assert.equal((await request('/' + chat, 2)).status, 403);
    assert.equal((await request('/' + chat + '/read', 2, 'PATCH')).status, 403);
    assert.equal((await request('/' + chat + '/messages', 2, 'POST', { content: 'unauthorized' })).status, 403);

    const ownerSocket = connect(base, { auth: { token: token(1) }, transports: ['websocket'], forceNew: true });
    sockets.push(ownerSocket);
    await once(ownerSocket, 'connect');
    const joined = await ownerSocket.timeout(3000).emitWithAck('join_chat', chat);
    assert.equal(joined.success, true);
    let deliveries = 0;
    ownerSocket.on('new_message', () => { deliveries++; });
    const incoming = once(ownerSocket, 'new_message');
    const sent = await request('/' + chat + '/messages', 0, 'POST', { content: 'Xin chào, máy còn không?', tempId: 'temporary-message' });
    assert.equal(sent.status, 201);
    assert.equal(sent.body.data.senderId._id, String(users[0]._id));
    assert.equal((await incoming)[0].content, 'Xin chào, máy còn không?');
    assert.equal(deliveries, 1);
    assert.equal(sent.body.data.tempId, 'temporary-message');
    const reply = await request('/' + chat + '/messages', 1, 'POST', { content: 'Máy vẫn còn bạn nhé!' });
    assert.equal(reply.status, 201);
    assert.equal((await request('/' + chat)).body.data.length, 2);
    assert.equal((await request('/conversations', 1)).body.data[0].partner._id, String(users[0]._id));
    assert.equal((await request('/' + chat + '/read', 0, 'PATCH')).status, 200);
    assert.equal((await request('/devices/' + devices[0]._id, 0, 'POST')).body.bookingId, chat);
    const other = await request('/devices/' + devices[1]._id, 0, 'POST');
    assert.notEqual(other.body.bookingId, chat);
    const otherHistory = await request('/' + other.body.bookingId);
    assert.equal(otherHistory.body.booking.partner.name, users[2].name);
    assert.deepEqual(otherHistory.body.data, []);
    assert.equal((await request('/' + chat)).body.data[1].content, 'Máy vẫn còn bạn nhé!');

    const existingBooking = { _id: id(), deviceId: devices[1]._id, renterId: users[0]._id, ownerId: users[2]._id, status: 'active', updatedAt: new Date() };
    await db.collection('bookings').insertOne(existingBooking);
    assert.equal((await request('/devices/' + devices[1]._id, 0, 'POST')).body.bookingId, String(existingBooking._id));
    await db.collection('users').deleteOne({ _id: users[2]._id });
    assert.equal((await request('/devices/' + devices[1]._id, 0, 'POST')).status, 404);
  } finally {
    sockets.forEach((socket) => socket.disconnect());
    if (io) await new Promise((resolve) => io.close(resolve));
    if (server?.listening) await new Promise((resolve) => server.close(resolve));
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});
