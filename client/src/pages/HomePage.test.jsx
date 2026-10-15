import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { HomePage } from './HomePage';
import { deviceService } from '../services/deviceService.js';

jest.mock('../services/deviceService.js', () => ({ deviceService: { getNearbyDevices: jest.fn(), getDevices: jest.fn() } }));
jest.mock('../components/home/HeroSection', () => ({ HeroSection: () => null }));
jest.mock('react-router-dom', () => ({ Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a> }));

let container, root, success, failure;
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
    getCurrentPosition: jest.fn((resolve, reject) => { success = resolve; failure = reject; }),
  } });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); jest.useRealTimers(); });
const mount = async () => { await act(async () => root.render(<HomePage />)); };
const allow = async () => { await act(async () => success({ coords: { latitude: 21, longitude: 105 } })); };
const retry = async () => {
  const button = [...container.querySelectorAll('button')].find(b => b.textContent.includes('Try Again'));
  expect(button).toBeDefined();
  await act(async () => button.click());
};

test('waits for location, renders exactly the nearby response and sends page 1 limit 12', async () => {
  let resolve;
  deviceService.getNearbyDevices.mockReturnValue(new Promise(r => { resolve = r; }));
  await mount();
  expect(container.textContent).toContain('Finding devices near you...');
  expect(deviceService.getNearbyDevices).not.toHaveBeenCalled();
  await allow();
  expect(container.textContent).toContain('Loading nearby devices...');
  expect(deviceService.getNearbyDevices).toHaveBeenCalledWith({ lat: 21, lng: 105, radius: 10000, page: 1, limit: 12 });
  await act(async () => resolve({ data: Array.from({ length: 12 }, (_, i) => ({ _id: String(i), name: `Device ${i}` })) }));
  expect(container.querySelectorAll('article')).toHaveLength(12);
  expect(deviceService.getDevices).not.toHaveBeenCalled();
});

test('denied location makes no request; retry after allowing renders five devices', async () => {
  deviceService.getNearbyDevices.mockResolvedValue({ data: Array.from({ length: 5 }, (_, i) => ({ _id: String(i), name: 'Nearby' })) });
  await mount();
  await act(async () => failure({ code: 1 }));
  expect(container.textContent).toContain('Location permission is blocked in your browser');
  expect(deviceService.getNearbyDevices).not.toHaveBeenCalled();
  await retry();
  expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledTimes(2);
  await allow();
  expect(container.querySelectorAll('article')).toHaveLength(5);
});

test('API failure is distinct and retry supports empty results', async () => {
  deviceService.getNearbyDevices.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ data: [] });
  await mount(); await allow();
  expect(container.textContent).toContain('Unable to load nearby devices.');
  await retry();
  expect(container.textContent).toContain('No nearby devices found.');
  expect(container.querySelectorAll('article')).toHaveLength(0);
});

test('location timeout ends loading even if browser never responds', async () => {
  jest.useFakeTimers(); await mount();
  await act(async () => jest.advanceTimersByTime(20000));
  expect(container.textContent).toContain('Location request timed out.');
  expect(deviceService.getNearbyDevices).not.toHaveBeenCalled();
});

test('unmount ignores late location callback', async () => {
  await mount();
  await act(async () => root.render(null));
  await allow();
  expect(deviceService.getNearbyDevices).not.toHaveBeenCalled();
});


test('position unavailable shows code 2 instead of a permission denied message', async () => {
  await mount();
  await act(async () => failure({ code: 2, message: 'Network location provider unavailable' }));
  expect(container.textContent).toContain('POSITION_UNAVAILABLE, code 2');
  expect(container.textContent).not.toContain('Location permission is blocked');
  expect(deviceService.getNearbyDevices).not.toHaveBeenCalled();
});

test('browser timeout has a distinct message and retry really requests again', async () => {
  await mount();
  expect(navigator.geolocation.getCurrentPosition.mock.calls[0][2]).toEqual({ enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  await act(async () => failure({ code: 3, message: 'Timeout expired' }));
  expect(container.textContent).toContain('Location request timed out.');
  await retry();
  expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledTimes(2);
});

test('permission inspection does not block geolocation or retry', async () => {
  Object.defineProperty(navigator, 'permissions', { configurable: true, value: { query: jest.fn().mockResolvedValue({ state: 'denied' }) } });
  await mount();
  expect(navigator.permissions.query).toHaveBeenCalledWith({ name: 'geolocation' });
  expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
  await act(async () => failure({ code: 1, message: 'User denied Geolocation' }));
  await retry();
  expect(navigator.permissions.query).toHaveBeenCalledTimes(2);
  expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledTimes(2);
  delete navigator.permissions;
});
