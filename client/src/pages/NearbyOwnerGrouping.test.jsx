import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { NearbyPage } from './NearbyPage';
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
let testRevision = 0;

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
  const mockMap = {
    remove: jest.fn(),
    flyToLocation: jest.fn(),
    flyTo: jest.fn(),
    clearMarkers: jest.fn(() => {
      mockMap.addMarker.mockClear();
    }),
    addMarker: jest.fn((lngLat, opts) => createMockMarker(lngLat, opts)),
    on: jest.fn((event, callback) => {
      listeners[event] = callback;
    }),
    _trigger: (event, payload) => {
      if (listeners[event]) listeners[event](payload);
    },
  };
  return mockMap;
};

const mount = async () => {
  await act(async () => {
    root.render(<NearbyPage />);
  });
};

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  testRevision += 1;

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
    revision: testRevision,
    source: 'GPS',
    loading: false,
    error: null,
    refreshLocation: jest.fn(),
  };
  useUserLocation.mockImplementation(() => location);

  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  delete window.FaviMap;
});

describe('Nearby Owner-Based Redesign Specification', () => {
  test('1. Multiple devices belonging to one owner at one location produce ONE marker', async () => {
    const devices = [
      {
        _id: 'dev-1',
        title: 'Sony A7 IV',
        dailyRate: 450000,
        status: 'available',
        category: 'camera',
        distanceMeters: 100,
        ownerId: 'owner-A',
        owner: { _id: 'owner-A', name: 'Alice Owner', isVerified: true, rating: 5.0, totalReviews: 10 },
        location: { type: 'Point', coordinates: [105.85, 21.03], addressText: '123 Trang Tien' },
      },
      {
        _id: 'dev-2',
        title: 'Canon R6',
        dailyRate: 400000,
        status: 'available',
        category: 'camera',
        distanceMeters: 100,
        ownerId: 'owner-A',
        owner: { _id: 'owner-A', name: 'Alice Owner', isVerified: true, rating: 5.0, totalReviews: 10 },
        location: { type: 'Point', coordinates: [105.85, 21.03], addressText: '123 Trang Tien' },
      },
    ];

    deviceService.getNearbyDevices.mockResolvedValue({ data: devices });
    await mount();

    const ownerMarkers = mockMapInstance.addMarker.mock.calls.filter(
      ([, opts]) => opts?.title && opts.title.includes('Alice Owner')
    );
    expect(ownerMarkers).toHaveLength(1);
    expect(ownerMarkers[0][1].title).toBe('Alice Owner (2 devices)');

    expect(container.querySelectorAll('.nearby-device-list li')).toHaveLength(2);
    expect(container.textContent).toContain('Devices by Alice Owner');
  });

  test('2. The same owner at different locations produces SEPARATE markers', async () => {
    const devices = [
      {
        _id: 'dev-1',
        title: 'Camera at Location 1',
        dailyRate: 300000,
        status: 'available',
        distanceMeters: 300,
        ownerId: 'owner-A',
        owner: { _id: 'owner-A', name: 'Alice Owner' },
        location: { type: 'Point', coordinates: [105.85, 21.03], addressText: 'Location 1' },
      },
      {
        _id: 'dev-2',
        title: 'Drone at Location 2',
        dailyRate: 500000,
        status: 'available',
        distanceMeters: 800,
        ownerId: 'owner-A',
        owner: { _id: 'owner-A', name: 'Alice Owner' },
        location: { type: 'Point', coordinates: [105.80, 21.00], addressText: 'Location 2' },
      },
    ];

    deviceService.getNearbyDevices.mockResolvedValue({ data: devices });
    await mount();

    const ownerMarkers = mockMapInstance.addMarker.mock.calls.filter(
      ([, opts]) => opts?.title && opts.title.includes('Alice Owner')
    );
    expect(ownerMarkers).toHaveLength(2);
  });

  test('3. Different owners at the same coordinates remain distinguishable', async () => {
    const devices = [
      {
        _id: 'dev-1',
        title: 'Device of Owner A',
        dailyRate: 300000,
        status: 'available',
        distanceMeters: 200,
        ownerId: 'owner-A',
        owner: { _id: 'owner-A', name: 'Owner Alpha' },
        location: { type: 'Point', coordinates: [105.85, 21.03] },
      },
      {
        _id: 'dev-2',
        title: 'Device of Owner B',
        dailyRate: 350000,
        status: 'available',
        distanceMeters: 200,
        ownerId: 'owner-B',
        owner: { _id: 'owner-B', name: 'Owner Beta' },
        location: { type: 'Point', coordinates: [105.85, 21.03] },
      },
    ];

    deviceService.getNearbyDevices.mockResolvedValue({ data: devices });
    await mount();

    const ownerAMarkers = mockMapInstance.addMarker.mock.calls.filter(
      ([, opts]) => opts?.title && opts.title.includes('Owner Alpha')
    );
    const ownerBMarkers = mockMapInstance.addMarker.mock.calls.filter(
      ([, opts]) => opts?.title && opts.title.includes('Owner Beta')
    );

    expect(ownerAMarkers).toHaveLength(1);
    expect(ownerBMarkers).toHaveLength(1);

    const coordA = ownerAMarkers[0][0];
    const coordB = ownerBMarkers[0][0];
    expect(coordA).not.toEqual(coordB);
  });

  test('4 & 5. Clicking a marker selects the owner and renders ONLY that owner devices', async () => {
    const devices = [
      {
        _id: 'dev-1',
        title: 'Alpha Device 1',
        dailyRate: 200000,
        status: 'available',
        distanceMeters: 150,
        ownerId: 'owner-A',
        owner: { _id: 'owner-A', name: 'Owner Alpha' },
        location: { type: 'Point', coordinates: [105.85, 21.03] },
      },
      {
        _id: 'dev-2',
        title: 'Beta Device 1',
        dailyRate: 400000,
        status: 'available',
        distanceMeters: 350,
        ownerId: 'owner-B',
        owner: { _id: 'owner-B', name: 'Owner Beta' },
        location: { type: 'Point', coordinates: [105.88, 21.05] },
      },
    ];

    deviceService.getNearbyDevices.mockResolvedValue({ data: devices });
    await mount();

    const betaMarkerRes = mockMapInstance.addMarker.mock.results.find(
      (res) => res.value?.options?.title && res.value.options.title.includes('Owner Beta')
    );
    expect(betaMarkerRes).toBeDefined();

    await act(async () => betaMarkerRes.value._triggerClick());

    expect(container.textContent).toContain('Owner Beta');
    expect(container.textContent).toContain('Beta Device 1');
    expect(container.textContent).not.toContain('Alpha Device 1');
  });

  test('6. Details and Book Now buttons have correct paths and state', async () => {
    const devices = [
      {
        _id: 'target-dev-99',
        title: 'MacBook Pro M3',
        dailyRate: 500000,
        status: 'available',
        distanceMeters: 400,
        ownerId: 'owner-Z',
        owner: { _id: 'owner-Z', name: 'Zack Tech' },
        location: { type: 'Point', coordinates: [105.85, 21.03] },
      },
    ];

    deviceService.getNearbyDevices.mockResolvedValue({ data: devices });
    await mount();

    const detailsLink = [...container.querySelectorAll('a')].find((a) => a.textContent === 'Details');
    const bookNowLink = [...container.querySelectorAll('a')].find((a) => a.textContent === 'Book Now');

    expect(detailsLink).toBeDefined();
    expect(detailsLink.getAttribute('href')).toBe('/device/target-dev-99');
    expect(detailsLink.getAttribute('data-return-to')).toBe('/nearby');

    expect(bookNowLink).toBeDefined();
    expect(bookNowLink.getAttribute('href')).toBe('/booking/target-dev-99');
  });

  test('7. Clicking filters updates owners and devices smoothly without error', async () => {
    const devices = [
      {
        _id: 'dev-1',
        title: 'Canon Camera',
        category: 'camera',
        dailyRate: 300000,
        status: 'available',
        distanceMeters: 200,
        ownerId: 'owner-A',
        owner: { _id: 'owner-A', name: 'Camera Owner' },
        location: { type: 'Point', coordinates: [105.85, 21.03] },
      },
      {
        _id: 'dev-2',
        title: 'Dell Laptop',
        category: 'laptop',
        dailyRate: 500000,
        status: 'available',
        distanceMeters: 400,
        ownerId: 'owner-B',
        owner: { _id: 'owner-B', name: 'Laptop Owner' },
        location: { type: 'Point', coordinates: [105.82, 21.01] },
      },
    ];

    deviceService.getNearbyDevices.mockResolvedValue({ data: devices });
    await mount();

    expect(container.textContent).toContain('2 owners');

    // Click 'Cameras' filter button
    const cameraButton = [...container.querySelectorAll('.nearby-cat-pill')].find(
      (btn) => btn.textContent.trim() === 'Cameras'
    );
    expect(cameraButton).toBeDefined();

    await act(async () => {
      cameraButton.click();
    });

    // Only 1 owner remains
    expect(container.textContent).toContain('1 owner');
    expect(container.textContent).toContain('Camera Owner');
    expect(container.textContent).not.toContain('Laptop Owner');

    // Click 'Drones' filter button (0 matches)
    const droneButton = [...container.querySelectorAll('.nearby-cat-pill')].find(
      (btn) => btn.textContent.trim() === 'Drones'
    );
    await act(async () => {
      droneButton.click();
    });

    expect(container.textContent).toContain('No devices match the selected filters.');

    // Click 'Reset filters' button
    const resetBtn = container.querySelector('.nearby-reset-filter-btn');
    expect(resetBtn).toBeDefined();
    await act(async () => {
      resetBtn.click();
    });

    expect(container.textContent).toContain('2 owners');
  });
});
