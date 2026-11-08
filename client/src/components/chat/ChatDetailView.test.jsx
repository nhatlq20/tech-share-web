import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { ChatDetailView } from './ChatDetailView';
import { getMessages, sendMessage, markAsRead } from '../../services/chatService';
import { getSocket } from '../../services/socketService';

jest.mock('react-router-dom', () => ({
  MemoryRouter: ({ children }) => children,
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/messages' }),
}));
jest.mock('../../services/chatService', () => ({ getMessages: jest.fn(), sendMessage: jest.fn(), markAsRead: jest.fn(), uploadChatImage: jest.fn() }));
jest.mock('../../services/socketService', () => ({ getSocket: jest.fn(), joinChat: jest.fn(), leaveChat: jest.fn(), sendTyping: jest.fn(), sendStopTyping: jest.fn() }));

let root, container, listeners;
const context = (id) => ({ bookingId: id, isInquiry: true, partner: { _id: 'owner-' + id, name: 'Chủ máy ' + id, avatar: '/' + id + '.png' } });
async function render(id, conversation = context(id)) {
  await act(async () => root.render(<MemoryRouter><ChatDetailView bookingId={id} conversation={conversation} currentUserId="renter" /></MemoryRouter>));
}
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  Element.prototype.scrollIntoView = jest.fn();
  jest.clearAllMocks();
  listeners = new Map();
  getSocket.mockReturnValue({ on: (key, fn) => listeners.set(key, fn), off: (key) => listeners.delete(key) });
  markAsRead.mockResolvedValue({});
  getMessages.mockImplementation(async (id) => ({ data: [], booking: context(id) }));
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

test('list updates keep history stable and switching recipients clears the draft', async () => {
  await render('A');
  expect(container.querySelector('h3').textContent).toBe('Chủ máy A');
  expect(container.querySelector('img').getAttribute('src')).toBe('/A.png');
  const input = container.querySelector('textarea');
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input, 'Nội dung đang soạn');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await render('A', { ...context('A'), unreadCount: 0 });
  expect(getMessages).toHaveBeenCalledTimes(1);
  await render('B');
  expect(container.querySelector('h3').textContent).toBe('Chủ máy B');
  expect(container.querySelector('textarea').value).toBe('');
  expect(getMessages).toHaveBeenCalledTimes(2);
  expect(listeners.has('receive_message')).toBe(false);
});

test('late history and send responses cannot leak into another recipient', async () => {
  let resolveA;
  getMessages.mockImplementation((id) => id === 'A' ? new Promise((resolve) => { resolveA = resolve; }) : Promise.resolve({ data: [], booking: context(id) }));
  await render('A');
  await render('B');
  await act(async () => resolveA({ data: [{ _id: 'old', content: 'Secret A' }], booking: context('A') }));
  expect(container.textContent).not.toContain('Secret A');
  expect(container.querySelector('h3').textContent).toBe('Chủ máy B');
  let finishSend;
  sendMessage.mockImplementation(() => new Promise((resolve) => { finishSend = resolve; }));
  const template = [...container.querySelectorAll('button')].find((button) => button.textContent.includes('fully charged'));
  await act(async () => template.click());
  await render('C');
  await act(async () => finishSend({ data: { _id: 'saved', bookingId: 'B', content: 'Secret B' } }));
  expect(container.textContent).not.toContain('Secret B');
  expect(container.querySelector('h3').textContent).toBe('Chủ máy C');
});

test('socket echo and REST confirmation render one message and clean up listeners', async () => {
  await render('A');
  sendMessage.mockImplementation(async (id, payload) => {
    const message = { ...payload, _id: 'saved', bookingId: id, senderId: 'renter', createdAt: new Date().toISOString() };
    listeners.get('new_message')(message);
    return { data: message };
  });
  const template = [...container.querySelectorAll('button')].find((button) => button.textContent.includes('fully charged'));
  await act(async () => template.click());
  expect(container.textContent.match(/Hi, is the device fully charged\?/g)).toHaveLength(2);
  await act(async () => root.unmount());
  expect(listeners.size).toBe(0);
});
