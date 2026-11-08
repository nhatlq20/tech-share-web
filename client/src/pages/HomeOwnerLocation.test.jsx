import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { HomePage } from './HomePage';
import { DeviceCard, calculateDistanceMeters } from '../components/device/DeviceCard.jsx';
import { DeviceGrid } from '../components/device/DeviceGrid.jsx';
import { deviceService } from '../services/deviceService.js';
import { LOCATION_CACHE_KEY } from '../hooks/useUserLocation';

jest.mock('../services/deviceService.js', () => ({
  deviceService: {
    getRecommendedDevices: jest.fn(),
    getNearbyDevices: jest.fn(),
    getDevices: jest.fn(),
  },
}));

jest.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => ({ isAuthenticated: true, user: null }),
}));

jest.mock('../components/home/HeroSection', () => ({
  HeroSection: ({ searchInput, onSearchChange, onSearchSubmit, onClearSearch }) => (
    <div data-testid="mock-hero">
      <input
        aria-label="Search devices input"
        value={searchInput || ''}
        onChange={(e) => onSearchChange?.(e.target.value)}
      />
      <button type="button" onClick={() => onSearchSubmit?.('Canon')}>
        Search Submit
      </button>
      <button type="button" onClick={() => onClearSearch?.()}>
        Search Clear
      </button>
    </div>
  ),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => mockNavigate,
}));

describe('Home Page – Owner-Based Device Location & Card Rendering (TC-01 through TC-10)', () => {
  let container, root;

  const mockUserCoords = { lat: 21.0285, lng: 105.8542 }; // Hanoi center
  const saveCachedLocation = (coords = mockUserCoords) => {
    localStorage.setItem(
      LOCATION_CACHE_KEY,
      JSON.stringify({
        latitude: coords.lat,
        longitude: coords.lng,
        accuracy: 20,
        timestamp: Date.now(),
      })
    );
  };

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    jest.clearAllMocks();
    mockNavigate.mockReset();
    jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
    localStorage.clear();

    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: { query: jest.fn().mockResolvedValue({ state: 'granted' }) },
    });

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: jest.fn((resolve) =>
          resolve({
            coords: {
              latitude: mockUserCoords.lat,
              longitude: mockUserCoords.lng,
              accuracy: 20,
            },
            timestamp: Date.now(),
          })
        ),
      },
    });

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    jest.restoreAllMocks();
  });

  const mount = async (element) => {
    await act(async () => root.render(element));
  };

  test('TC-01: Multiple devices belonging to the same owner display the same distance', async () => {
    const ownerAlice = {
      _id: 'owner-alice',
      name: 'Alice Nguyen',
      avatar: 'https://example.com/alice.jpg',
      location: { type: 'Point', coordinates: [105.8048, 21.0245] }, // ~5.1 km from user
    };

    // Device 1 and Device 2 belong to Alice
    const device1 = {
      _id: 'dev-1',
      name: 'Sony A7 IV Camera',
      category: 'camera',
      pricePerDay: 450000,
      status: 'available',
      ownerId: ownerAlice._id,
      owner: ownerAlice,
    };

    const device2 = {
      _id: 'dev-2',
      name: 'FE 24-70mm GM Lens',
      category: 'accessory',
      pricePerDay: 250000,
      status: 'available',
      ownerId: ownerAlice._id,
      owner: ownerAlice,
    };

    await mount(
      <div>
        <DeviceCard device={device1} userCoordinates={mockUserCoords} />
        <DeviceCard device={device2} userCoordinates={mockUserCoords} />
      </div>
    );

    const distanceEls = container.querySelectorAll('.device-card-distance');
    expect(distanceEls).toHaveLength(2);

    // Both cards must display the exact same distance
    const distText1 = distanceEls[0].textContent.trim();
    const distText2 = distanceEls[1].textContent.trim();
    expect(distText1).toBe(distText2);
    expect(distText1).toContain('5.1 km away');

    // Both cards display owner name
    const ownerRows = container.querySelectorAll('.device-card-owner-name');
    expect(ownerRows).toHaveLength(2);
    expect(ownerRows[0].textContent).toBe('Owner: Alice Nguyen');
    expect(ownerRows[1].textContent).toBe('Owner: Alice Nguyen');
  });

  test('TC-02: Different owners display different distances based on their respective locations', async () => {
    const ownerHanoi = {
      _id: 'owner-hn',
      name: 'Hanoi Owner',
      location: { type: 'Point', coordinates: [105.8500, 21.0280] }, // ~0.4 km away
    };

    const ownerCanTho = {
      _id: 'owner-ct',
      name: 'Can Tho Owner',
      location: { type: 'Point', coordinates: [105.7469, 10.0452] }, // ~1200+ km away
    };

    const deviceHanoi = {
      _id: 'dev-hn',
      name: 'Hanoi Camera',
      category: 'camera',
      pricePerDay: 300000,
      owner: ownerHanoi,
    };

    const deviceCanTho = {
      _id: 'dev-ct',
      name: 'Can Tho Drone',
      category: 'drone',
      pricePerDay: 800000,
      owner: ownerCanTho,
    };

    await mount(
      <div>
        <DeviceCard device={deviceHanoi} userCoordinates={mockUserCoords} />
        <DeviceCard device={deviceCanTho} userCoordinates={mockUserCoords} />
      </div>
    );

    const distanceEls = container.querySelectorAll('.device-card-distance');
    expect(distanceEls).toHaveLength(2);

    const distHanoi = distanceEls[0].textContent.trim();
    const distCanTho = distanceEls[1].textContent.trim();

    expect(distHanoi).not.toBe(distCanTho);
    expect(distHanoi).toBe('0.4 km away');
    expect(parseFloat(distCanTho)).toBeGreaterThan(1000);
  });

  test('TC-03: Updating an owner location updates the location and distance of all their devices', async () => {
    let ownerBob = {
      _id: 'owner-bob',
      name: 'Bob Tran',
      location: { type: 'Point', coordinates: [105.8048, 21.0245] }, // Hanoi location
    };

    const device1 = {
      _id: 'bob-dev-1',
      name: 'MacBook Pro M3',
      category: 'laptop',
      pricePerDay: 500000,
      owner: ownerBob,
    };
    const device2 = {
      _id: 'bob-dev-2',
      name: 'iPad Pro M2',
      category: 'tablet',
      pricePerDay: 350000,
      owner: ownerBob,
    };

    await mount(
      <div>
        <DeviceCard device={device1} userCoordinates={mockUserCoords} />
        <DeviceCard device={device2} userCoordinates={mockUserCoords} />
      </div>
    );

    let distanceEls = container.querySelectorAll('.device-card-distance');
    expect(distanceEls[0].textContent.trim()).toBe('5.1 km away');
    expect(distanceEls[1].textContent.trim()).toBe('5.1 km away');

    // Bob updates his profile location to Da Nang [108.2022, 16.0544]
    const updatedOwnerBob = {
      ...ownerBob,
      location: { type: 'Point', coordinates: [108.2022, 16.0544] },
    };

    const updatedDev1 = { ...device1, owner: updatedOwnerBob };
    const updatedDev2 = { ...device2, owner: updatedOwnerBob };

    await mount(
      <div>
        <DeviceCard device={updatedDev1} userCoordinates={mockUserCoords} />
        <DeviceCard device={updatedDev2} userCoordinates={mockUserCoords} />
      </div>
    );

    distanceEls = container.querySelectorAll('.device-card-distance');
    // Both devices now automatically reflect Bob's new Da Nang location (~605.9 km away)
    expect(distanceEls[0].textContent.trim()).toBe('605.9 km away');
    expect(distanceEls[1].textContent.trim()).toBe('605.9 km away');
    expect(distanceEls[0].textContent.trim()).toBe(distanceEls[1].textContent.trim());
  });

  test('TC-04: Devices belonging to owners without valid coordinates do not display fabricated distances', async () => {
    const ownerNoCoords = {
      _id: 'owner-no-coords',
      name: 'No Location Owner',
      location: null,
    };

    const deviceWithoutLocation = {
      _id: 'dev-no-loc',
      name: 'Studio Lighting Kit',
      category: 'accessory',
      pricePerDay: 150000,
      status: 'available',
      owner: ownerNoCoords,
    };

    await mount(<DeviceCard device={deviceWithoutLocation} userCoordinates={mockUserCoords} />);

    // Must NOT render any distance element or fabricated fallback
    const distanceEl = container.querySelector('.device-card-distance');
    expect(distanceEl).toBeNull();
    expect(container.textContent).not.toContain('km away');

    // Must still render owner name, status badge, title, price
    expect(container.querySelector('.device-card-owner-name').textContent).toBe('Owner: No Location Owner');
    expect(container.querySelector('.device-card-status').textContent).toBe('Available');
    expect(container.querySelector('.device-card-title').textContent).toBe('Studio Lighting Kit');
  });

  test('TC-05: Devices are still displayed correctly when location permission is unavailable', async () => {
    const device = {
      _id: 'dev-available',
      name: 'Sony FX3 Cinema Camera',
      category: 'camera',
      pricePerDay: 900000,
      status: 'available',
      owner: {
        _id: 'owner-x',
        name: 'Cinema Owner',
        location: { type: 'Point', coordinates: [105.8500, 21.0280] },
      },
    };

    // User coordinates are null (e.g. permission not granted or unavailable)
    await mount(<DeviceCard device={device} userCoordinates={null} />);

    // Distance must not be rendered without user coordinates
    expect(container.querySelector('.device-card-distance')).toBeNull();

    // All core card elements are displayed properly
    expect(container.querySelector('.device-card-title').textContent).toBe('Sony FX3 Cinema Camera');
    expect(container.querySelector('.device-card-category').textContent).toBe('Camera');
    expect(container.querySelector('.device-card-owner-name').textContent).toBe('Owner: Cinema Owner');
    expect(container.querySelector('.device-card-status').textContent).toBe('Available');
    expect(container.querySelector('.device-card-rent-cta')).not.toBeNull();
  });

  test('TC-06: Existing device details navigation works', async () => {
    const device = {
      _id: 'dev-nav-123',
      name: 'Fujifilm X-T5',
      category: 'camera',
      pricePerDay: 400000,
      owner: { name: 'Photo Guy' },
    };

    await mount(<DeviceCard device={device} />);

    const linkEl = container.querySelector('.device-card-link');
    expect(linkEl).not.toBeNull();
    expect(linkEl.getAttribute('href')).toBe('/device/dev-nav-123');
  });

  test('TC-07: Existing booking functionality works from Home device card', async () => {
    const device = {
      _id: 'dev-book-456',
      name: 'DJI Mini 4 Pro',
      category: 'drone',
      pricePerDay: 550000,
      owner: { name: 'Drone Master' },
    };

    await mount(<DeviceCard device={device} />);

    const bookBtn = container.querySelector('.device-card-rent-cta');
    expect(bookBtn).not.toBeNull();
    expect(bookBtn.textContent).toContain('Book now');

    await act(async () => {
      bookBtn.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith('/booking/dev-book-456');
  });

  test('TC-08: Recommendation sorting and pagination remain correct on HomePage', async () => {
    saveCachedLocation();

    deviceService.getRecommendedDevices.mockResolvedValue({
      data: [
        {
          _id: 'dev-p1',
          name: 'Device Page 1',
          pricePerDay: 200000,
          distanceMeters: 1200,
          owner: { _id: 'o1', name: 'Owner 1' },
        },
      ],
      pagination: {
        total: 48,
        page: 1,
        limit: 24,
        totalPages: 2,
      },
    });

    await mount(<HomePage />);

    expect(deviceService.getRecommendedDevices).toHaveBeenCalledWith({
      lat: mockUserCoords.lat,
      lng: mockUserCoords.lng,
      page: 1,
      limit: 24,
    });

    expect(container.textContent).toContain('Device Page 1');
    expect(container.textContent).toContain('1.2 km away');
    expect(container.querySelector('.home-pagination')).not.toBeNull();

    // Click next page
    const nextBtn = [...container.querySelectorAll('button')].find((b) =>
      b.textContent.includes('Next')
    );
    expect(nextBtn).toBeDefined();

    deviceService.getRecommendedDevices.mockResolvedValue({
      data: [
        {
          _id: 'dev-p2',
          name: 'Device Page 2',
          pricePerDay: 300000,
          distanceMeters: 3500,
          owner: { _id: 'o2', name: 'Owner 2' },
        },
      ],
      pagination: {
        total: 48,
        page: 2,
        limit: 24,
        totalPages: 2,
      },
    });

    await act(async () => {
      nextBtn.click();
    });

    expect(deviceService.getRecommendedDevices).toHaveBeenLastCalledWith({
      lat: mockUserCoords.lat,
      lng: mockUserCoords.lng,
      page: 2,
      limit: 24,
    });
  });

  test('TC-09: No API or frontend code depends on persisted devices.location', async () => {
    // Device object has NO persisted `location` field (or location is unset)
    const deviceWithoutPersistedLocation = {
      _id: 'dev-no-persisted-loc',
      name: 'Wireless Mic Set',
      category: 'audio',
      pricePerDay: 180000,
      status: 'available',
      // Dynamic owner populated from users collection
      owner: {
        _id: 'owner-mic',
        name: 'Audio Pro',
        location: { type: 'Point', coordinates: [105.8450, 21.0250] },
      },
    };

    expect(deviceWithoutPersistedLocation.location).toBeUndefined();

    await mount(
      <DeviceCard
        device={deviceWithoutPersistedLocation}
        userCoordinates={mockUserCoords}
      />
    );

    // Distance is derived solely from owner.location
    const distanceEl = container.querySelector('.device-card-distance');
    expect(distanceEl).not.toBeNull();
    expect(distanceEl.textContent).toContain('km away');
    expect(container.querySelector('.device-card-owner-name').textContent).toBe('Owner: Audio Pro');
  });

  test('TC-10: Existing Home functionality is not broken (categories, search, rendering)', async () => {
    saveCachedLocation();

    deviceService.getRecommendedDevices.mockResolvedValue({
      data: [
        {
          _id: 'dev-camera-1',
          name: 'Canon R6 Mark II',
          category: 'camera',
          pricePerDay: 600000,
          owner: { name: 'Pro Shooter' },
        },
      ],
      pagination: { total: 1, page: 1, limit: 24, totalPages: 1 },
    });

    await mount(<HomePage />);

    // Verify category filtering triggers recommended API with category
    const cameraChip = [...container.querySelectorAll('.home-category-chip')].find((c) =>
      c.textContent.includes('Cameras')
    );
    expect(cameraChip).toBeDefined();

    await act(async () => {
      cameraChip.click();
    });

    expect(deviceService.getRecommendedDevices).toHaveBeenLastCalledWith({
      lat: mockUserCoords.lat,
      lng: mockUserCoords.lng,
      page: 1,
      limit: 24,
      category: 'camera',
    });

    // Verify search input triggers search
    const searchInput = container.querySelector('input[aria-label="Search devices input"]');
    const searchSubmitBtn = [...container.querySelectorAll('button')].find((b) =>
      b.textContent.includes('Search Submit')
    );

    await act(async () => {
      searchInput.value = 'Canon';
      searchSubmitBtn.click();
    });

    expect(deviceService.getRecommendedDevices).toHaveBeenLastCalledWith({
      lat: mockUserCoords.lat,
      lng: mockUserCoords.lng,
      page: 1,
      limit: 24,
      category: 'camera',
      q: 'Canon',
    });
  });
});
