import React, { act, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { NearbyPage } from './NearbyPage';
import { getDevicePosition } from '../components/map/MapView';
import { useUserLocation } from '../hooks/useUserLocation';
import { deviceService } from '../services/deviceService';

jest.mock('../hooks/useUserLocation', () => ({ useUserLocation: jest.fn() }));
jest.mock('../services/deviceService', () => ({ deviceService: { getNearbyDevices: jest.fn() } }));
jest.mock('react-router-dom', () => ({
  Link: ({ to, state, children, ...props }) => (
    <a href={to} data-return-to={state?.from} {...props}>
      {children}
    </a>
  ),
}));

let root, container, location, mockMapInstance;

const createMockMarker = (lngLat, options = {}) => {
  const el = document.createElement('div');
  const listeners = {};
  return {
    lngLat,
    options,
    getElement: jest.fn(() => el),
    on: jest.fn((event, callback) => {
      listeners[event] = callback;
    }),
    remove: jest.fn(),
    getPopup: jest.fn(() => ({ addTo: jest.fn() })),
    _triggerClick: () => {
      if (el.onclick) el.onclick();
      if (listeners.click) listeners.click();
    },
  };
};

const createMockMap = () => {
  const listeners = {};
  return {
    remove: jest.fn(),
    flyToLocation: jest.fn(),
    flyTo: jest.fn(),
    clearMarkers: jest.fn(),
    addMarker: jest.fn((lngLat, opts) => createMockMarker(lngLat, opts)),
    on: jest.fn((event, callback) => {
      listeners[event] = callback;
    }),
    _trigger: (event, payload) => {
      if (listeners[event]) listeners[event](payload);
    },
  };
};

const device = (extra = {}) => ({
  _id: 'device-1',
  title: 'Nearby camera',
  dailyRate: 120000,
  status: 'available',
  distanceMeters: 1500,
  images: ['camera.jpg'],
  location: { type: 'Point', coordinates: [105.85, 21.03] },
  ...extra,
});

const mount = async (strict) => {
  await act(async () => {
    root.render(strict ? <StrictMode><NearbyPage /></StrictMode> : <NearbyPage />);
  });
};

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();

  mockMapInstance = createMockMap();
  window.FaviMap = {
    ready: jest.fn((fn) => fn()),
    create: jest.fn(() => mockMapInstance),
    clearMarkers: jest.fn(),
    addMarker: jest.fn(),
    flyToLocation: jest.fn(),
  };

  location = {
    latitude: 21.0285,
    longitude: 105.8542,
    revision: 0,
    source: 'CACHE',
    loading: false,
    error: null,
    refreshLocation: jest.fn(),
  };
  useUserLocation.mockImplementation(() => location);
  deviceService.getNearbyDevices.mockReset().mockResolvedValue({ data: [device()] });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  delete window.FaviMap;
});

test('uses nearby API, converts marker coordinates, selects preview and links to details', async () => {
  await mount();
  expect(deviceService.getNearbyDevices).toHaveBeenCalledWith({ lat: 21.0285, lng: 105.8542, radius: 10000, page: 1, limit: 100 });
  // Favi Map expects [longitude, latitude]
  expect(mockMapInstance.addMarker).toHaveBeenCalledWith([105.85, 21.03], expect.objectContaining({ title: 'Nearby camera' }));
  const markerResult = mockMapInstance.addMarker.mock.results.find(
    (res) => res.value?.options?.title === 'Nearby camera'
  );
  await act(async () => markerResult.value._triggerClick());
  expect(container.querySelector('[aria-label="Selected device"]').textContent).toContain('Nearby camera');
  expect(container.querySelector('a').getAttribute('href')).toBe('/device/device-1');
  expect(container.querySelector('a').getAttribute('data-return-to')).toBe('/nearby');
  expect(deviceService.getNearbyDevices).toHaveBeenCalledTimes(1);
});

test('recenter sets map to the user coordinates', async () => {
  await mount();
  mockMapInstance.flyToLocation.mockClear();
  await act(async () => [...container.querySelectorAll('button')].find((b) => b.textContent === 'Recenter on me').click());
  expect(mockMapInstance.flyToLocation).toHaveBeenCalledWith([105.8542, 21.0285], 13);
});

test('empty results retain map and user marker', async () => {
  deviceService.getNearbyDevices.mockResolvedValue({ data: [] });
  await mount();
  expect(container.querySelector('.nearby-map')).not.toBeNull();
  expect(container.textContent).toContain('No available devices within 10 km.');
});

test('API error is distinct from empty results and can retry', async () => {
  deviceService.getNearbyDevices.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ data: [] });
  await mount();
  expect(container.textContent).toContain('Unable to load nearby devices.');
  expect(container.textContent).not.toContain('No available devices within 10 km.');
  await act(async () => [...container.querySelectorAll('button')].find((b) => b.textContent === 'Try Again').click());
  expect(container.textContent).toContain('No available devices within 10 km.');
});

test('location loading and error make no API call', async () => {
  location = { ...location, latitude: null, longitude: null, loading: true };
  await mount();
  expect(container.textContent).toContain('Finding your location...');
  location = { ...location, loading: false, error: 'Permission denied' };
  await mount();
  expect(container.textContent).toContain('Unable to determine your location.');
  expect(deviceService.getNearbyDevices).not.toHaveBeenCalled();
});

test('late response from old location cannot replace the new markers', async () => {
  let resolveOld;
  deviceService.getNearbyDevices.mockReturnValueOnce(new Promise((resolve) => { resolveOld = resolve; }));
  await mount();
  location = { ...location, latitude: 10.0452, longitude: 105.7469, revision: 1 };
  deviceService.getNearbyDevices.mockResolvedValue({
    data: [device({ _id: 'new', title: 'New location device', location: { type: 'Point', coordinates: [105.75, 10.04] } })],
  });
  await mount();
  await act(async () => resolveOld({ data: [device()] }));
  expect(container.textContent).toContain('New location device');
  expect(container.textContent).not.toContain('Nearby camera');
});

test('duplicates, invalid coordinates and ineligible devices do not create markers', async () => {
  deviceService.getNearbyDevices.mockResolvedValue({
    data: [
      device(),
      device(),
      device({ _id: 'bad', location: { type: 'Point', coordinates: [105, 91] } }),
      device({ _id: 'far', distanceMeters: 10001 }),
      device({ _id: 'rented', status: 'rented' }),
    ],
  });
  await mount();
  expect(container.querySelectorAll('.nearby-device-list li')).toHaveLength(1);
  expect(getDevicePosition(device({ location: { type: 'Point', coordinates: ['105', 21] } }))).toBeNull();
});

test('all API pages are loaded and StrictMode reuses the same request', async () => {
  deviceService.getNearbyDevices.mockResolvedValueOnce({ data: [device()], pagination: { totalPages: 2 } })
    .mockResolvedValueOnce({ data: [device({ _id: 'second', title: 'Second device' })], pagination: { totalPages: 2 } });
  await mount(true);
  expect(deviceService.getNearbyDevices).toHaveBeenCalledTimes(2);
  expect(container.querySelectorAll('.nearby-device-list li')).toHaveLength(2);
});

test('GPS refresh failure keeps cached map and devices', async () => {
  await mount();
  location = { ...location, warning: 'GPS unavailable' };
  await mount();
  expect(container.querySelectorAll('.nearby-device-list li')).toHaveLength(1);
  expect(deviceService.getNearbyDevices).toHaveBeenCalledTimes(1);
});

test('tile failures show a distinct warning while keeping device information', async () => {
  await mount();
  await act(async () => mockMapInstance._trigger('error'));
  expect(container.textContent).toContain('Map tiles could not load.');
  expect(container.querySelectorAll('.nearby-device-list li')).toHaveLength(1);
});
