import assert from 'node:assert/strict';
import { test, describe, before, after, beforeEach } from 'node:test';
import http from 'node:http';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { io as ClientIO } from '../../client/node_modules/socket.io-client/build/esm/index.js';
import { initSocket } from '../src/socket.js';
import chatRoutes from '../src/routes/chatRoutes.js';
import Message from '../src/models/Message.js';
import Booking from '../src/models/Booking.js';
import User from '../src/models/User.js';

const TEST_JWT_SECRET = process.env.JWT_SECRET || 'techshare_jwt_secret_key_2026';

// Cố định ID cho Renter, Owner, và người dùng thứ ba (unauthorized)
const BOOKING_ID = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a111111');
const RENTER_ID = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a222222');
const OWNER_ID = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a333333');
const THIRD_PARTY_ID = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a444444');
const ADMIN_ID = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a555555');

function createToken(userId, role = 'renter') {
  return jwt.sign(
    { userId: userId.toString(), _id: userId.toString(), id: userId.toString(), role },
    TEST_JWT_SECRET,
    { expiresIn: '1h' }
  );
}

const makeChain = (data) => {
  const chain = {
    populate: () => chain,
    sort: () => chain,
    select: () => chain,
    skip: () => chain,
    limit: () => chain,
    lean: async () => data,
  };
  return chain;
};

describe('TC-CHAT: Real-Time Chat & Receiver Resolution Tests', () => {
  let app;
  let server;
  let baseUrl;
  let ioServer;

  // In-memory data store for isolated testing
  let persistedMessages = [];
  let shouldSimulateDbFailure = false;

  // Backup original model methods
  const origBookingFindById = Booking.findById;
  const origBookingFind = Booking.find;
  const origMessageCreate = Message.create;
  const origMessageFindById = Message.findById;
  const origMessageCountDocuments = Message.countDocuments;
  const origMessageFind = Message.find;
  const origUserFindById = User.findById;

  before(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/chats', chatRoutes);

    server = http.createServer(app);
    ioServer = initSocket(server);

    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    const mockBooking = {
      _id: BOOKING_ID,
      bookingCode: 'TS-BK-001',
      renterId: RENTER_ID,
      ownerId: OWNER_ID,
      status: 'approved',
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000),
      deviceId: {
        _id: new mongoose.Types.ObjectId('64e0a12f9b1c2b001a999999'),
        name: 'Sony A7 IV',
        images: ['https://example.com/sony.jpg'],
        dailyRate: 350000,
        category: 'camera',
      },
    };

    // Mock Booking.findById
    Booking.findById = (id) => {
      const idStr = id?.toString();
      if (idStr === BOOKING_ID.toString()) {
        return makeChain(mockBooking);
      }
      return makeChain(null);
    };

    // Mock Booking.find
    Booking.find = () => {
      return makeChain([mockBooking]);
    };

    // Mock Message.create
    Message.create = async (doc) => {
      if (shouldSimulateDbFailure) {
        throw new Error('Simulated MongoDB Write Failure');
      }
      const newDoc = {
        _id: new mongoose.Types.ObjectId(),
        ...doc,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      persistedMessages.push(newDoc);
      return newDoc;
    };

    // Mock Message.findById
    Message.findById = (id) => {
      const idStr = id?.toString();
      const found = persistedMessages.find((m) => m._id.toString() === idStr);
      return makeChain(
        found
          ? {
              ...found,
              senderId: {
                _id: found.senderId,
                name: 'Test Sender',
                role: 'renter',
                isVerified: true,
              },
            }
          : null
      );
    };

    // Mock Message.countDocuments
    Message.countDocuments = async (query = {}) => {
      return persistedMessages.filter((m) => {
        if (query.receiverId && m.receiverId.toString() !== query.receiverId.toString()) return false;
        if (query.status && query.status.$ne && m.status === query.status.$ne) return false;
        return true;
      }).length;
    };

    // Mock Message.find
    Message.find = (query = {}) => {
      const list = persistedMessages.filter((m) => {
        if (query.bookingId && m.bookingId.toString() !== query.bookingId.toString()) return false;
        return true;
      });
      return makeChain(list);
    };

    // Mock User.findById
    User.findById = (id) => {
      return makeChain({
        _id: id,
        name: id?.toString() === RENTER_ID.toString() ? 'Renter User' : 'Owner User',
        avatar: 'https://avatar.test/img.png',
      });
    };
  });

  after(async () => {
    // Restore original methods
    Booking.findById = origBookingFindById;
    Booking.find = origBookingFind;
    Message.create = origMessageCreate;
    Message.findById = origMessageFindById;
    Message.countDocuments = origMessageCountDocuments;
    Message.find = origMessageFind;
    User.findById = origUserFindById;

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  beforeEach(() => {
    persistedMessages = [];
    shouldSimulateDbFailure = false;
  });

  // TC-CHAT-01: Renter sends message -> Sender = renter, Receiver = owner, HTTP 201, no 500 error
  test('TC-CHAT-01: Renter sends message successfully (Fix receiverId runtime error)', async () => {
    const renterToken = createToken(RENTER_ID, 'renter');
    const ownerToken = createToken(OWNER_ID, 'owner');

    // Kết nối Socket của Owner để nhận tin nhắn
    const ownerSocket = ClientIO(baseUrl, {
      auth: { token: ownerToken },
      transports: ['websocket'],
      forceNew: true,
    });
    await new Promise((res) => ownerSocket.on('connect', res));

    // Owner tham gia chat room của booking
    ownerSocket.emit('join_booking_chat', BOOKING_ID.toString());
    await new Promise((r) => setTimeout(r, 50));

    // Đăng ký listener nhận sự kiện receive_message
    const messagePromise = new Promise((resolve) => {
      ownerSocket.on('receive_message', (msg) => {
        resolve(msg);
      });
    });

    // Renter gửi tin nhắn qua REST API
    const res = await fetch(`${baseUrl}/api/chats/${BOOKING_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${renterToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'text',
        content: 'Chào chủ máy! Thiết bị còn hoạt động tốt không ạ?',
      }),
    });

    assert.equal(res.status, 201, `Expected HTTP 201, got ${res.status}`);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data);

    // Kiểm tra tin nhắn trong DB
    assert.equal(persistedMessages.length, 1);
    const saved = persistedMessages[0];
    assert.equal(saved.senderId.toString(), RENTER_ID.toString(), 'Sender must be Renter');
    assert.equal(saved.receiverId.toString(), OWNER_ID.toString(), 'Receiver must be Owner');
    assert.equal(saved.content, 'Chào chủ máy! Thiết bị còn hoạt động tốt không ạ?');

    // Kiểm tra Socket.IO nhận được tin nhắn đúng
    const receivedEvent = await messagePromise;
    assert.equal(receivedEvent.senderId._id.toString(), RENTER_ID.toString());
    assert.equal(receivedEvent.content, 'Chào chủ máy! Thiết bị còn hoạt động tốt không ạ?');

    ownerSocket.disconnect();
  });

  // TC-CHAT-02: Owner sends message -> Sender = owner, Receiver = renter
  test('TC-CHAT-02: Owner sends message to renter (Receiver resolved to renter)', async () => {
    const ownerToken = createToken(OWNER_ID, 'owner');
    const renterToken = createToken(RENTER_ID, 'renter');

    const renterSocket = ClientIO(baseUrl, {
      auth: { token: renterToken },
      transports: ['websocket'],
      forceNew: true,
    });
    await new Promise((res) => renterSocket.on('connect', res));

    renterSocket.emit('join_chat', BOOKING_ID.toString());
    await new Promise((r) => setTimeout(r, 50));

    const messagePromise = new Promise((resolve) => {
      renterSocket.on('receive_message', (msg) => resolve(msg));
    });

    const res = await fetch(`${baseUrl}/api/chats/${BOOKING_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'text',
        content: 'Máy hoạt động hoàn hảo bạn nhé!',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);

    assert.equal(persistedMessages.length, 1);
    const saved = persistedMessages[0];
    assert.equal(saved.senderId.toString(), OWNER_ID.toString(), 'Sender must be Owner');
    assert.equal(saved.receiverId.toString(), RENTER_ID.toString(), 'Receiver must be Renter');

    const receivedEvent = await messagePromise;
    assert.equal(receivedEvent.content, 'Máy hoạt động hoàn hảo bạn nhé!');

    renterSocket.disconnect();
  });

  // TC-CHAT-03: Unauthorized sender -> HTTP 403, no message created
  test('TC-CHAT-03: Third-party user attempts to send message to booking -> 403 Forbidden', async () => {
    const strangerToken = createToken(THIRD_PARTY_ID, 'renter');

    const res = await fetch(`${baseUrl}/api/chats/${BOOKING_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${strangerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'text',
        content: 'Tôi muốn chen ngang vào cuộc trò chuyện này.',
      }),
    });

    assert.equal(res.status, 403, 'Unauthorized user must receive HTTP 403');
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /participant/i);
    assert.equal(persistedMessages.length, 0, 'No message should be persisted');
  });

  // TC-CHAT-04: Missing authentication -> HTTP 401
  test('TC-CHAT-04: Missing authentication token returns 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/chats/${BOOKING_ID}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'text',
        content: 'Tin nhắn không có token',
      }),
    });

    assert.equal(res.status, 401, 'Request without token must receive HTTP 401');
    assert.equal(persistedMessages.length, 0);
  });

  // TC-CHAT-05: Invalid booking ID -> HTTP 400
  test('TC-CHAT-05: Malformed booking ID returns 400 Bad Request', async () => {
    const renterToken = createToken(RENTER_ID, 'renter');

    const res = await fetch(`${baseUrl}/api/chats/not-a-valid-object-id/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${renterToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'text',
        content: 'Test invalid ID',
      }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /invalid booking id/i);
  });

  // TC-CHAT-06: Nonexistent booking -> HTTP 404
  test('TC-CHAT-06: Nonexistent booking returns 404 Not Found', async () => {
    const renterToken = createToken(RENTER_ID, 'renter');
    const nonExistentBookingId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a999999');

    const res = await fetch(`${baseUrl}/api/chats/${nonExistentBookingId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${renterToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'text',
        content: 'Test nonexistent booking',
      }),
    });

    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /booking not found/i);
    assert.equal(persistedMessages.length, 0);
  });

  // TC-CHAT-07: Empty message -> HTTP 400 validation error
  test('TC-CHAT-07: Empty message content returns 400 validation error and does not persist', async () => {
    const renterToken = createToken(RENTER_ID, 'renter');

    // 1. Trống rỗng hoàn toàn
    const resEmpty = await fetch(`${baseUrl}/api/chats/${BOOKING_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${renterToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'text',
        content: '',
      }),
    });
    assert.equal(resEmpty.status, 400);

    // 2. Toàn khoảng trắng
    const resWhitespace = await fetch(`${baseUrl}/api/chats/${BOOKING_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${renterToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'text',
        content: '    ',
      }),
    });
    assert.equal(resWhitespace.status, 400);
    assert.equal(persistedMessages.length, 0, 'No empty message should be persisted');
  });

  // TC-CHAT-08: Database failure -> HTTP 500, no socket event
  test('TC-CHAT-08: Database failure returns 500 without false socket delivery', async () => {
    const renterToken = createToken(RENTER_ID, 'renter');
    const ownerToken = createToken(OWNER_ID, 'owner');

    const ownerSocket = ClientIO(baseUrl, {
      auth: { token: ownerToken },
      transports: ['websocket'],
      forceNew: true,
    });
    await new Promise((res) => ownerSocket.on('connect', res));
    ownerSocket.emit('join_booking_chat', BOOKING_ID.toString());
    await new Promise((r) => setTimeout(r, 50));

    let receivedAnyEvent = false;
    ownerSocket.on('receive_message', () => {
      receivedAnyEvent = true;
    });

    // Bật cờ lỗi database
    shouldSimulateDbFailure = true;

    const res = await fetch(`${baseUrl}/api/chats/${BOOKING_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${renterToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'text',
        content: 'Tin nhắn khi DB sập',
      }),
    });

    assert.equal(res.status, 500, 'Database failure must return 500');
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(receivedAnyEvent, false, 'No socket delivery event must occur on DB failure');

    ownerSocket.disconnect();
  });

  // TC-CHAT-09: Socket disconnection -> Message persists, sender receives 201
  test('TC-CHAT-09: Message persists and returns 201 even if receiver is disconnected', async () => {
    const renterToken = createToken(RENTER_ID, 'renter');

    // Người nhận hoàn toàn offline
    const res = await fetch(`${baseUrl}/api/chats/${BOOKING_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${renterToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'text',
        content: 'Bạn có đó không? (offline test)',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(persistedMessages.length, 1);
    assert.equal(persistedMessages[0].content, 'Bạn có đó không? (offline test)');
  });

  // TC-CHAT-10: Duplicate message handling -> Exactly 1 message per request
  test('TC-CHAT-10: One submission produces exactly one persisted message', async () => {
    const renterToken = createToken(RENTER_ID, 'renter');

    const res = await fetch(`${baseUrl}/api/chats/${BOOKING_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${renterToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'text',
        content: 'Tin nhắn đơn nhất không duplicate',
      }),
    });

    assert.equal(res.status, 201);
    assert.equal(persistedMessages.length, 1);
  });

  // TC-CHAT-11: Booking room authorization -> Unrelated user denied room access
  test('TC-CHAT-11: Unrelated user cannot join booking chat room via Socket.io', async () => {
    const strangerToken = createToken(THIRD_PARTY_ID, 'renter');

    const strangerSocket = ClientIO(baseUrl, {
      auth: { token: strangerToken },
      transports: ['websocket'],
      forceNew: true,
    });
    await new Promise((res) => strangerSocket.on('connect', res));

    let accessDeniedReceived = false;
    strangerSocket.on('error', (err) => {
      if (err.message && err.message.includes('Access denied')) {
        accessDeniedReceived = true;
      }
    });

    // Cố tình join phòng của booking người khác
    await new Promise((resolve) => {
      strangerSocket.emit('join_booking_chat', BOOKING_ID.toString(), (ack) => {
        assert.equal(ack.success, false);
        assert.match(ack.message, /access denied/i);
        resolve();
      });
      setTimeout(resolve, 200);
    });

    assert.ok(accessDeniedReceived, 'Socket should emit access denied error to unauthorized user');
    strangerSocket.disconnect();
  });

  // TC-CHAT-12: Existing chat history -> Participants can retrieve, strangers cannot
  test('TC-CHAT-12: Legitimate participants can retrieve chat history, unauthorized users get 403', async () => {
    // Thêm một tin nhắn mẫu vào persistedMessages
    persistedMessages.push({
      _id: new mongoose.Types.ObjectId(),
      bookingId: BOOKING_ID,
      senderId: RENTER_ID,
      receiverId: OWNER_ID,
      type: 'text',
      content: 'Lịch sử tin nhắn cũ',
      status: 'sent',
      createdAt: new Date(),
    });

    const renterToken = createToken(RENTER_ID, 'renter');
    const ownerToken = createToken(OWNER_ID, 'owner');
    const strangerToken = createToken(THIRD_PARTY_ID, 'renter');

    // 1. Renter truy cập lịch sử chat -> 200
    const resRenter = await fetch(`${baseUrl}/api/chats/${BOOKING_ID}`, {
      headers: { Authorization: `Bearer ${renterToken}` },
    });
    assert.equal(resRenter.status, 200);
    const bodyRenter = await resRenter.json();
    assert.equal(bodyRenter.success, true);
    assert.ok(bodyRenter.data);

    // 2. Owner truy cập lịch sử chat -> 200
    const resOwner = await fetch(`${baseUrl}/api/chats/${BOOKING_ID}`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(resOwner.status, 200);
    const bodyOwner = await resOwner.json();
    assert.equal(bodyOwner.success, true);

    // 3. Người lạ truy cập lịch sử chat -> 403
    const resStranger = await fetch(`${baseUrl}/api/chats/${BOOKING_ID}`, {
      headers: { Authorization: `Bearer ${strangerToken}` },
    });
    assert.equal(resStranger.status, 403);
    const bodyStranger = await resStranger.json();
    assert.equal(bodyStranger.success, false);
  });
});
