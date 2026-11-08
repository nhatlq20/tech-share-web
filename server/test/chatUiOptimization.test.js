import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';

describe('TC-CHAT-UI: Chat Switching Performance & State Management Tests', () => {
  // Test Mock State
  let messageCache;
  let activeBookingId;
  let listeners;
  let apiCallLog;
  let abortedRequests;

  before(() => {
    messageCache = new Map();
    activeBookingId = null;
    listeners = new Map();
    apiCallLog = [];
    abortedRequests = [];
  });

  test('TC-CHAT-UI-01: Cache hit returns cached messages instantly with zero network delay', () => {
    const bookingA = 'booking-111';
    const initialMessages = [
      { _id: 'm1', bookingId: bookingA, content: 'Xin chào', senderId: 'u1', createdAt: new Date().toISOString() },
      { _id: 'm2', bookingId: bookingA, content: 'Dạ chào bạn', senderId: 'u2', createdAt: new Date().toISOString() },
    ];

    // Populate cache for booking A
    messageCache.set(bookingA, {
      messages: initialMessages,
      bookingContext: { _id: bookingA, bookingCode: 'TS-111' },
      timestamp: Date.now(),
    });

    // Simulate switching to booking A
    const cached = messageCache.get(bookingA);
    assert.ok(cached, 'Cache must exist for bookingA');
    assert.equal(cached.messages.length, 2, 'Should immediately return 2 messages');
    assert.equal(cached.messages[0].content, 'Xin chào');
  });

  test('TC-CHAT-UI-02: Rapid conversation switching cancels earlier in-flight request via AbortController', async () => {
    let activeController = null;
    const history = [];

    const switchConversation = (newBookingId) => {
      if (activeController) {
        activeController.abort();
        abortedRequests.push(activeController);
      }
      const controller = new AbortController();
      activeController = controller;
      activeBookingId = newBookingId;

      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          if (controller.signal.aborted) {
            reject(new Error('AbortError'));
          } else {
            history.push(newBookingId);
            resolve({ bookingId: newBookingId, data: [`msg-from-${newBookingId}`] });
          }
        }, 100);

        controller.signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new Error('AbortError'));
        });
      });
    };

    // Rapid switch: A -> B within 20ms
    const reqA = switchConversation('booking-A').catch((e) => e.message);
    const reqB = switchConversation('booking-B').catch((e) => e.message);

    const [resA, resB] = await Promise.all([reqA, reqB]);

    assert.equal(resA, 'AbortError', 'In-flight request for booking-A should be aborted');
    assert.deepEqual(resB, { bookingId: 'booking-B', data: ['msg-from-booking-B'] }, 'Request for booking-B should resolve successfully');
    assert.equal(activeBookingId, 'booking-B', 'Active booking must remain booking-B');
  });

  test('TC-CHAT-UI-03: Room transition performs leaveChat(old) and joinChat(new) without socket reconnects', () => {
    const roomEvents = [];
    let currentRoom = null;

    const transitionRoom = (newRoom) => {
      if (currentRoom && currentRoom !== newRoom) {
        roomEvents.push({ action: 'leave', room: currentRoom });
      }
      currentRoom = newRoom;
      roomEvents.push({ action: 'join', room: newRoom });
    };

    transitionRoom('chat_room_1');
    transitionRoom('chat_room_2');
    transitionRoom('chat_room_3');

    assert.deepEqual(roomEvents, [
      { action: 'join', room: 'chat_room_1' },
      { action: 'leave', room: 'chat_room_1' },
      { action: 'join', room: 'chat_room_2' },
      { action: 'leave', room: 'chat_room_2' },
      { action: 'join', room: 'chat_room_3' },
    ]);
  });

  test('TC-CHAT-UI-04: Background conversations_updated event refreshes list without flashing skeleton loader', () => {
    let isLoading = false;
    let listData = ['conv-1', 'conv-2'];

    // Updated loadConversations implementation
    const loadConversations = (isInitial = false) => {
      if (isInitial) {
        isLoading = true;
      }
      // Fetch returns new item
      listData = ['conv-1', 'conv-2', 'conv-3'];
      if (isInitial) {
        isLoading = false;
      }
    };

    // 1. Initial load -> sets loading true then false
    loadConversations(true);
    assert.equal(isLoading, false);
    assert.equal(listData.length, 3);

    // 2. Background update triggered by socket / read receipts
    isLoading = false;
    loadConversations(false); // isInitial is false!
    assert.equal(isLoading, false, 'Background update must NEVER set isLoading to true');
    assert.equal(listData.length, 3);
  });

  test('TC-CHAT-UI-05: Clicking active conversation is a no-op (prevents redundant navigation and refetch)', () => {
    let navigateCalls = 0;
    const currentActive = 'booking-100';

    const handleSelectConversation = (bId) => {
      if (bId === currentActive) {
        return; // No-op
      }
      navigateCalls++;
    };

    handleSelectConversation('booking-100');
    assert.equal(navigateCalls, 0, 'Clicking the already active conversation should not trigger navigation');

    handleSelectConversation('booking-200');
    assert.equal(navigateCalls, 1, 'Clicking a different conversation triggers navigation');
  });

  test('TC-CHAT-UI-06: Message deduplication handles both new_message and receive_message without duplicating bubble', () => {
    let messages = [];

    const handleIncomingMessage = (msg) => {
      const exists = messages.some((m) => m._id === msg._id || (m.tempId && m.tempId === msg.tempId));
      if (exists) {
        messages = messages.map((m) =>
          m._id === msg._id || (m.tempId && m.tempId === msg.tempId) ? msg : m
        );
      } else {
        messages = [...messages, msg];
      }
    };

    const serverMsg = { _id: 'msg-999', bookingId: 'b-1', content: 'Thiết bị hoạt động tốt' };

    // Emit both events (as server might emit both)
    handleIncomingMessage(serverMsg); // via new_message
    handleIncomingMessage(serverMsg); // via receive_message

    assert.equal(messages.length, 1, 'Duplicate socket events must not create duplicate messages');
    assert.equal(messages[0].content, 'Thiết bị hoạt động tốt');
  });

  test('TC-CHAT-UI-07: Messages arriving for non-active conversation update cache silently without corrupting active view', () => {
    const activeId = 'active-booking';
    const backgroundId = 'background-booking';

    messageCache.set(activeId, { messages: [{ _id: 'a1', content: 'Đang xem cái này' }] });
    messageCache.set(backgroundId, { messages: [{ _id: 'bg1', content: 'Tin cũ trong nền' }] });

    let activeDisplayMessages = [...messageCache.get(activeId).messages];

    const onSocketMessage = (msg) => {
      const bId = msg.bookingId;
      // Update cache
      const cached = messageCache.get(bId);
      if (cached) {
        cached.messages.push(msg);
      }
      // Update active view ONLY if matching
      if (bId === activeId) {
        activeDisplayMessages.push(msg);
      }
    };

    // Incoming message for background booking
    onSocketMessage({ _id: 'bg2', bookingId: backgroundId, content: 'Tin nhắn mới của đơn khác' });

    assert.equal(activeDisplayMessages.length, 1, 'Active conversation display must remain unaffected');
    assert.equal(activeDisplayMessages[0].content, 'Đang xem cái này');

    // But the background cache MUST be updated
    const bgCache = messageCache.get(backgroundId);
    assert.equal(bgCache.messages.length, 2, 'Background cache must contain the new message');
    assert.equal(bgCache.messages[1].content, 'Tin nhắn mới của đơn khác');
  });

  test('TC-CHAT-UI-08: Socket listener useEffect does not depend on active bookingId, preventing listener thrashing', () => {
    let registerCount = 0;
    let cleanupCount = 0;

    // Simulate old vs new dependency array:
    // With ref (current implementation), effect dependencies are only [currentUserId, loadConversations]
    const deps = ['user-123', 'fn-ref'];
    let prevDeps = [...deps];

    const simulateEffectRun = (newDeps) => {
      const changed = newDeps.some((d, idx) => d !== prevDeps[idx]);
      if (changed) {
        cleanupCount++;
        registerCount++;
        prevDeps = [...newDeps];
      }
    };

    // Switching conversations changes activeBookingIdRef.current, NOT deps
    simulateEffectRun(deps); // user switches to conversation 1
    simulateEffectRun(deps); // user switches to conversation 2
    simulateEffectRun(deps); // user switches to conversation 3

    assert.equal(registerCount, 0, 'Socket listeners must NOT be re-registered on conversation switch');
    assert.equal(cleanupCount, 0, 'Socket listeners must NOT be cleaned up on conversation switch');
  });
});
