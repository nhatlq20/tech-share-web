import React, { act, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HomePage } from './HomePage';
import { deviceService } from '../services/deviceService.js';
import { useUserLocation, LOCATION_CACHE_KEY, LOCATION_FRESH_MS } from '../hooks/useUserLocation';

jest.mock('../services/deviceService.js', () => ({ deviceService: {
  getRecommendedDevices: jest.fn(), getNearbyDevices: jest.fn(), getDevices: jest.fn(),
} }));
jest.mock('../components/home/HeroSection', () => ({ HeroSection: () => null }));
jest.mock('react-router-dom', () => ({ Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a> }));

let container, root, success, failure, hook;
const cached = (extra = {}) => ({ latitude: 21.0285, longitude: 105.8542, accuracy: 20, timestamp: Date.now(), ...extra });
const save = (extra) => localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(cached(extra)));
const permission = (state) => Object.defineProperty(navigator, 'permissions', { configurable: true,
  value: { query: jest.fn().mockResolvedValue({ state }) } });
const result = (name = 'Cached device') => ({ data: [{ _id: name, name }] });
const Probe = () => { hook = useUserLocation(); return <span>{hook.source}:{String(hook.isStale)}</span>; };
const mount = async (element = <HomePage />) => { await act(async () => root.render(element)); };
const allow = async (extra = {}) => { await act(async () => success({ coords: cached(extra), timestamp: Date.now() })); };
const reject = async (code = 2) => { await act(async () => failure({ code, message: 'Test browser failure' })); };
const click = async (text) => {
  const button = [...container.querySelectorAll('button')].find(b => b.textContent.includes(text));
  expect(button).toBeDefined();
  await act(async () => button.click());
};
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
  localStorage.clear();
  permission('prompt');
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
    getCurrentPosition: jest.fn((resolve, reject) => { success = resolve; failure = reject; }),
  } });
  deviceService.getRecommendedDevices.mockReset().mockResolvedValue(result());
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount()); container.remove(); jest.useRealTimers(); jest.restoreAllMocks();
});

test('first visit prompts, persists browser location, then renders recommended devices', async () => {
  await mount();
  expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
  expect(deviceService.getRecommendedDevices).not.toHaveBeenCalled();
  await allow();
  expect(JSON.parse(localStorage.getItem(LOCATION_CACHE_KEY))).toEqual(cached({ timestamp: expect.any(Number) }));
  expect(deviceService.getRecommendedDevices).toHaveBeenCalledWith({ lat: 21.0285, lng: 105.8542, page: 1, limit: 12 });
  expect(container.querySelectorAll('article')).toHaveLength(1);
  expect(deviceService.getNearbyDevices).not.toHaveBeenCalled();
  expect(deviceService.getDevices).not.toHaveBeenCalled();
});

test.each(['prompt', 'denied'])('%s + cache renders without requesting browser position', async state => {
  save(); permission(state); await mount();
  expect(deviceService.getRecommendedDevices).toHaveBeenCalledTimes(1);
  expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled();
  expect(container.querySelectorAll('article')).toHaveLength(1);
  expect(container.textContent).toContain('Using your last known location.');
  expect(container.textContent).not.toContain('Unable to determine your location.');
});

test('cache starts API even while permission query is pending', async () => {
  save(); navigator.permissions.query.mockReturnValue(new Promise(() => {}));
  await mount();
  expect(deviceService.getRecommendedDevices).toHaveBeenCalledTimes(1);
  expect(container.querySelectorAll('article')).toHaveLength(1);
});

test('denied without cache shows fatal location error and makes no API request', async () => {
  permission('denied'); await mount();
  expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled();
  expect(deviceService.getRecommendedDevices).not.toHaveBeenCalled();
  expect(container.textContent).toContain('Unable to determine your location.');
  await click('Try Again'); await allow();
  expect(container.querySelectorAll('article')).toHaveLength(1);
});

test('stale cache remains usable and exposes CACHE/isStale', async () => {
  save({ timestamp: Date.now() - LOCATION_FRESH_MS - 1000 });
  await mount(<Probe />);
  expect(hook.source).toBe('CACHE'); expect(hook.isStale).toBe(true);
  await mount();
  expect(container.querySelectorAll('article')).toHaveLength(1);
  expect(container.textContent).toContain('It may be out of date.');
  expect(localStorage.getItem(LOCATION_CACHE_KEY)).not.toBeNull();
});

test('granted + cache starts immediately and significant Hanoi to Can Tho movement refetches page 1', async () => {
  save(); permission('granted'); await mount();
  expect(deviceService.getRecommendedDevices).toHaveBeenCalledTimes(1);
  expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
  deviceService.getRecommendedDevices.mockResolvedValue(result('Can Tho device'));
  await allow({ latitude: 10.0452, longitude: 105.7469 });
  expect(deviceService.getRecommendedDevices).toHaveBeenCalledTimes(2);
  expect(deviceService.getRecommendedDevices).toHaveBeenLastCalledWith({ lat: 10.0452, lng: 105.7469, page: 1, limit: 12 });
  expect(JSON.parse(localStorage.getItem(LOCATION_CACHE_KEY)).latitude).toBe(10.0452);
  expect(container.textContent).toContain('Can Tho device');
});

test('late Hanoi response cannot overwrite Can Tho response', async () => {
  save(); permission('granted'); let resolveOld;
  deviceService.getRecommendedDevices.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; }));
  await mount();
  deviceService.getRecommendedDevices.mockResolvedValue(result('Can Tho device'));
  await allow({ latitude: 10.0452, longitude: 105.7469 });
  await act(async () => resolveOld(result('Old Hanoi device')));
  expect(container.textContent).toContain('Can Tho device');
  expect(container.textContent).not.toContain('Old Hanoi device');
});

test('small jitter updates cache but does not refetch', async () => {
  save(); permission('granted'); await mount();
  await allow({ latitude: 21.02851 });
  expect(deviceService.getRecommendedDevices).toHaveBeenCalledTimes(1);
  expect(JSON.parse(localStorage.getItem(LOCATION_CACHE_KEY)).latitude).toBe(21.02851);
  expect(container.querySelectorAll('article')).toHaveLength(1);
});

test('background failure preserves cached coordinates and visible devices', async () => {
  save(); permission('granted'); const before = localStorage.getItem(LOCATION_CACHE_KEY);
  await mount(); await reject();
  expect(container.querySelectorAll('article')).toHaveLength(1);
  expect(localStorage.getItem(LOCATION_CACHE_KEY)).toBe(before);
  expect(container.textContent).not.toContain('Unable to determine your location.');
  expect(deviceService.getRecommendedDevices).toHaveBeenCalledTimes(1);
});

test('manual update can prompt and reloads recommendations even at the same location', async () => {
  save(); await mount(); await click('Update location');
  expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
  expect(container.querySelectorAll('article')).toHaveLength(1);
  await allow();
  expect(deviceService.getRecommendedDevices).toHaveBeenCalledTimes(2);
});

test('failed manual update keeps the current devices and cache', async () => {
  save(); await mount(); await click('Update location'); await reject(1);
  expect(container.querySelectorAll('article')).toHaveLength(1);
  expect(localStorage.getItem(LOCATION_CACHE_KEY)).not.toBeNull();
});

test.each(['{broken', JSON.stringify(cached({ latitude: 91 })), JSON.stringify(cached({ longitude: -181 })),
  JSON.stringify(cached({ timestamp: 'bad' })), JSON.stringify(cached({ accuracy: -1 }))])('invalid cache is removed safely: %s', async raw => {
  localStorage.setItem(LOCATION_CACHE_KEY, raw); await mount();
  expect(localStorage.getItem(LOCATION_CACHE_KEY)).toBeNull();
  expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
  await allow(); expect(container.querySelectorAll('article')).toHaveLength(1);
});

test('unavailable localStorage falls back to browser flow without crashing', async () => {
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  await mount(); await allow();
  expect(container.querySelectorAll('article')).toHaveLength(1);
});

test('unknown permission with cache does not prompt', async () => {
  save(); navigator.permissions.query.mockRejectedValue(new Error('unsupported'));
  await mount(); expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled();
  expect(container.querySelectorAll('article')).toHaveLength(1);
});

test('StrictMode cache mount sends exactly one meaningful recommendation request', async () => {
  save(); permission('granted');
  await mount(<StrictMode><HomePage /></StrictMode>);
  expect(deviceService.getRecommendedDevices).toHaveBeenCalledTimes(1);
  expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
  await allow(); expect(deviceService.getRecommendedDevices).toHaveBeenCalledTimes(1);
});

test('first visit StrictMode requests browser location once', async () => {
  await mount(<StrictMode><HomePage /></StrictMode>);
  expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
  await allow(); expect(deviceService.getRecommendedDevices).toHaveBeenCalledTimes(1);
});

test('API retry supports empty results', async () => {
  save(); deviceService.getRecommendedDevices.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ data: [] });
  await mount(); expect(container.textContent).toContain('Unable to load recommended devices.');
  await click('Try Again'); expect(container.textContent).toContain('No recommended devices found.');
});

test('application deadline ends loading when browser never calls back', async () => {
  jest.useFakeTimers(); await mount();
  await act(async () => jest.advanceTimersByTime(20000));
  expect(container.textContent).toContain('Location request timed out.');
  expect(deviceService.getRecommendedDevices).not.toHaveBeenCalled();
});

test('unmounted hook ignores late browser success', async () => {
  await mount(); await mount(null); await allow();
  expect(localStorage.getItem(LOCATION_CACHE_KEY)).toBeNull();
  expect(deviceService.getRecommendedDevices).not.toHaveBeenCalled();
});

test('a new Home mount reuses the previously successful browser location', async () => {
  await mount(); await allow();
  await mount(null);
  navigator.geolocation.getCurrentPosition.mockClear();
  deviceService.getRecommendedDevices.mockClear();
  await mount();
  expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled();
  expect(deviceService.getRecommendedDevices).toHaveBeenCalledTimes(1);
  expect(container.querySelectorAll('article')).toHaveLength(1);
});

test('granted without cache requests browser location and exposes BROWSER source', async () => {
  permission('granted'); await mount(<Probe />);
  expect(hook.source).toBe('NONE');
  expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
  await allow();
  expect(hook.source).toBe('BROWSER'); expect(hook.loading).toBe(false);
  expect(hook.isStale).toBe(false);
});

test('background deadline preserves rendered devices', async () => {
  jest.useFakeTimers(); save(); permission('granted'); await mount();
  await act(async () => jest.advanceTimersByTime(20000));
  expect(container.querySelectorAll('article')).toHaveLength(1);
  expect(container.textContent).not.toContain('Unable to determine your location.');
});

const pagedResult = (page, total = 30) => ({
  data: Array.from({ length: Math.max(0, Math.min(12, total - (page - 1) * 12)) }, (_, index) => ({
    _id: `device-${(page - 1) * 12 + index}`, name: `Device ${(page - 1) * 12 + index}`,
  })),
  pagination: { page, limit: 12, total, totalPages: Math.max(1, Math.ceil(total / 12)) },
});
const pageButton = number => container.querySelector(`button[aria-label="Page ${number}"]`);
const goToPage = async number => { await act(async () => pageButton(number).click()); };

test('30 devices paginate 12 / 12 / 6 and support returning to the previous page', async () => {
  save(); deviceService.getRecommendedDevices.mockImplementation(({ page }) => Promise.resolve(pagedResult(page)));
  await mount();
  expect(container.querySelectorAll('article')).toHaveLength(12);
  expect(container.textContent).toContain('Page 1 / 3');
  expect([...container.querySelectorAll('button')].find(b => b.textContent.includes('Previous')).disabled).toBe(true);
  await click('Next');
  expect(deviceService.getRecommendedDevices).toHaveBeenLastCalledWith({ lat: 21.0285, lng: 105.8542, page: 2, limit: 12 });
  expect(container.querySelectorAll('article')).toHaveLength(12);
  expect(container.querySelector('article').textContent).toContain('Device 12');
  await goToPage(3);
  expect(container.querySelectorAll('article')).toHaveLength(6);
  expect(container.querySelector('article').textContent).toContain('Device 24');
  expect([...container.querySelectorAll('button')].find(b => b.textContent.includes('Next')).disabled).toBe(true);
  await click('Previous');
  expect(pageButton(2).getAttribute('aria-current')).toBe('page');
  expect(deviceService.getRecommendedDevices).toHaveBeenCalledTimes(4);
});

test('single page hides pagination controls', async () => {
  save(); deviceService.getRecommendedDevices.mockResolvedValue(pagedResult(1, 8)); await mount();
  expect(container.querySelector('nav.home-pagination')).toBeNull();
  expect(container.querySelectorAll('article')).toHaveLength(8);
});

test('page failure retries that same page', async () => {
  save(); deviceService.getRecommendedDevices.mockResolvedValueOnce(pagedResult(1))
    .mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(pagedResult(2));
  await mount(); await click('Next');
  expect(container.textContent).toContain('Unable to load recommended devices.');
  await click('Try Again');
  expect(deviceService.getRecommendedDevices).toHaveBeenLastCalledWith({ lat: 21.0285, lng: 105.8542, page: 2, limit: 12 });
  expect(container.querySelector('article').textContent).toContain('Device 12');
});

test('location update resets page 1 without requesting page 2 at the new coordinates', async () => {
  save(); deviceService.getRecommendedDevices.mockImplementation(({ page }) => Promise.resolve(pagedResult(page)));
  await mount(); await goToPage(2); await click('Update location');
  await allow({ latitude: 10.0452, longitude: 105.7469 });
  expect(deviceService.getRecommendedDevices).toHaveBeenCalledTimes(3);
  expect(deviceService.getRecommendedDevices).toHaveBeenLastCalledWith({ lat: 10.0452, lng: 105.7469, page: 1, limit: 12 });
  expect(pageButton(1).getAttribute('aria-current')).toBe('page');
});

test('late page response cannot overwrite new location results', async () => {
  save(); let resolvePage;
  deviceService.getRecommendedDevices.mockResolvedValueOnce(pagedResult(1))
    .mockImplementationOnce(() => new Promise(resolve => { resolvePage = resolve; }))
    .mockResolvedValueOnce({ ...pagedResult(1, 14), data: [{ _id: 'new', name: 'New location device' }] });
  await mount(); await goToPage(2);
  expect(pageButton(3).disabled).toBe(true);
  await click('Update location'); await allow({ latitude: 10.0452, longitude: 105.7469 });
  await act(async () => resolvePage(pagedResult(2)));
  expect(container.querySelectorAll('article')).toHaveLength(1);
  expect(container.querySelector('article').textContent).toContain('New location device');
  expect(pageButton(1).getAttribute('aria-current')).toBe('page');
});

test('deleted final page redirects to the last remaining page', async () => {
  save(); deviceService.getRecommendedDevices.mockResolvedValueOnce(pagedResult(1))
    .mockResolvedValueOnce(pagedResult(3, 20)).mockResolvedValueOnce(pagedResult(2, 20));
  await mount(); await goToPage(3);
  expect(deviceService.getRecommendedDevices).toHaveBeenLastCalledWith({ lat: 21.0285, lng: 105.8542, page: 2, limit: 12 });
  expect(container.querySelectorAll('article')).toHaveLength(8);
  expect(pageButton(2).getAttribute('aria-current')).toBe('page');
});

test('cached location survives an unavailable startup backend and recommendations recover automatically', async () => {
  jest.useFakeTimers(); save();
  deviceService.getRecommendedDevices.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(result());
  await mount();
  expect(container.textContent).toContain('Reconnecting automatically...');
  expect(container.textContent).not.toContain('Unable to determine your location.');
  expect(localStorage.getItem(LOCATION_CACHE_KEY)).not.toBeNull();
  await act(async () => jest.advanceTimersByTime(1000));
  expect(container.querySelectorAll('article')).toHaveLength(1);
  expect(deviceService.getRecommendedDevices).toHaveBeenCalledTimes(2);
  expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled();
});

test('automatic API recovery is bounded and manual retry still works afterwards', async () => {
  jest.useFakeTimers(); save();
  deviceService.getRecommendedDevices.mockRejectedValue(new TypeError('Failed to fetch'));
  await mount();
  for (const delay of [1000, 2000, 4000, 8000]) await act(async () => jest.advanceTimersByTime(delay));
  expect(deviceService.getRecommendedDevices).toHaveBeenCalledTimes(5);
  expect(container.textContent).not.toContain('Reconnecting automatically...');
  await act(async () => jest.advanceTimersByTime(60000));
  expect(deviceService.getRecommendedDevices).toHaveBeenCalledTimes(5);
  deviceService.getRecommendedDevices.mockResolvedValue(result());
  await click('Try Again');
  expect(container.querySelectorAll('article')).toHaveLength(1);
});

test.each(['online', 'focus'])('%s recovers cached recommendations after connection failure', async event => {
  save(); deviceService.getRecommendedDevices.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(result());
  await mount();
  await act(async () => window.dispatchEvent(new Event(event)));
  expect(container.querySelectorAll('article')).toHaveLength(1);
  expect(deviceService.getRecommendedDevices).toHaveBeenCalledTimes(2);
});

test('backend 503 retries without requesting GPS again', async () => {
  jest.useFakeTimers(); save();
  deviceService.getRecommendedDevices.mockRejectedValueOnce(Object.assign(new Error('starting'), { status: 503 })).mockResolvedValueOnce(result());
  await mount(); await act(async () => jest.advanceTimersByTime(1000));
  expect(container.querySelectorAll('article')).toHaveLength(1);
  expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled();
});

test('invalid API requests do not loop automatically', async () => {
  jest.useFakeTimers(); save();
  deviceService.getRecommendedDevices.mockRejectedValue(Object.assign(new Error('bad request'), { status: 400 }));
  await mount(); await act(async () => jest.advanceTimersByTime(60000));
  expect(deviceService.getRecommendedDevices).toHaveBeenCalledTimes(1);
});

test('high accuracy failure retries real browser network positioning and persists success', async () => {
  await mount(); await reject(2);
  expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledTimes(2);
  expect(navigator.geolocation.getCurrentPosition.mock.calls[1][2]).toEqual({ enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 });
  await allow();
  expect(localStorage.getItem(LOCATION_CACHE_KEY)).not.toBeNull();
  expect(container.querySelectorAll('article')).toHaveLength(1);
});

test('both browser positioning attempts can fail without losing cached recommendations', async () => {
  save(); permission('granted'); await mount();
  await reject(3); await reject(2);
  expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledTimes(2);
  expect(container.querySelectorAll('article')).toHaveLength(1);
  expect(localStorage.getItem(LOCATION_CACHE_KEY)).not.toBeNull();
  expect(deviceService.getRecommendedDevices).toHaveBeenCalledTimes(1);
});

test('permission denied does not trigger a second GPS prompt', async () => {
  await mount(); await reject(1);
  expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
  expect(deviceService.getRecommendedDevices).not.toHaveBeenCalled();
});

test('unmount cancels pending recommendation recovery', async () => {
  jest.useFakeTimers(); save();
  deviceService.getRecommendedDevices.mockRejectedValue(new TypeError('Failed to fetch'));
  await mount(); await mount(null);
  await act(async () => jest.advanceTimersByTime(60000));
  expect(deviceService.getRecommendedDevices).toHaveBeenCalledTimes(1);
});

test('favorite control toggles independently of the device link and persists across Home mounts', async () => {
  save(); await mount();
  let favorite = container.querySelector('button[aria-label="Add to favorites: Cached device"]');
  expect(favorite.closest('a')).toBeNull();
  await act(async () => favorite.click());
  expect(favorite.getAttribute('aria-pressed')).toBe('true');
  expect(JSON.parse(localStorage.getItem('techshare:favorite-devices'))).toEqual(['Cached device']);
  await mount(null); await mount();
  favorite = container.querySelector('button[aria-label="Remove from favorites: Cached device"]');
  expect(favorite.getAttribute('aria-pressed')).toBe('true');
  await act(async () => favorite.click());
  expect(JSON.parse(localStorage.getItem('techshare:favorite-devices'))).toEqual([]);
});

test('unresponsive permission inspection cannot block first-visit browser positioning forever', async () => {
  jest.useFakeTimers();
  navigator.permissions.query.mockReturnValue(new Promise(() => {}));
  await mount();
  expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled();
  await act(async () => jest.advanceTimersByTime(1500));
  expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
  await allow();
  expect(container.querySelectorAll('article')).toHaveLength(1);
});

test('permission inspection timeout with cache still never triggers a browser prompt', async () => {
  jest.useFakeTimers(); save();
  navigator.permissions.query.mockReturnValue(new Promise(() => {}));
  await mount();
  expect(container.querySelectorAll('article')).toHaveLength(1);
  await act(async () => jest.advanceTimersByTime(1500));
  expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled();
  expect(deviceService.getRecommendedDevices).toHaveBeenCalledTimes(1);
});
