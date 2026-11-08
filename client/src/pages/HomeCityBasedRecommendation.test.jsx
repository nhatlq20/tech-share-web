import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { HomePage } from './HomePage';
import { DeviceCard } from '../components/device/DeviceCard.jsx';
import { deviceService } from '../services/deviceService.js';
import { SUPPORTED_CITIES } from '../constants/cities.js';
import { useAuth } from '../context/AuthContext.jsx';

jest.mock('../services/deviceService.js', () => ({
  deviceService: {
    getRecommendedDevices: jest.fn(),
    getNearbyDevices: jest.fn(),
    getDevices: jest.fn(),
  },
}));

let mockAuthUser = null;
jest.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => ({ isAuthenticated: Boolean(mockAuthUser), user: mockAuthUser }),
}));

jest.mock('../components/home/HeroSection', () => ({
  HeroSection: ({ searchInput, onSearchChange, onSearchSubmit, onClearSearch }) => (
    <div data-testid="mock-hero">
      <input
        aria-label="Search devices input"
        value={searchInput || ''}
        onChange={(e) => onSearchChange?.(e.target.value)}
      />
      <button type="button" onClick={() => onSearchSubmit?.(searchInput)}>
        Search Submit
      </button>
      <button type="button" onClick={() => onClearSearch?.()}>
        Search Clear
      </button>
    </div>
  ),
}));

jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => jest.fn(),
}));

describe('Home Page – City-Based Device Recommendation (TC-01 through TC-08)', () => {
  let container, root;

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    jest.clearAllMocks();
    mockAuthUser = null;
    jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
    localStorage.clear();

    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: { query: jest.fn().mockResolvedValue({ state: 'denied' }) },
    });

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: jest.fn((resolve, reject) =>
          reject({ code: 1, message: 'User denied geolocation' })
        ),
      },
    });

    deviceService.getRecommendedDevices.mockReset();

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    jest.restoreAllMocks();
  });

  const mount = async (element = <HomePage />) => {
    await act(async () => root.render(element));
  };

  test('TC-01: User selects Can Tho -> returns devices from eligible owners within 100km of Can Tho', async () => {
    localStorage.setItem('techshare:selected-city', 'can_tho');

    deviceService.getRecommendedDevices.mockResolvedValue({
      data: [
        {
          _id: 'dev-cantho-1',
          name: 'EOS R8 Body',
          category: 'camera',
          pricePerDay: 400000,
          status: 'available',
          distanceMeters: 3200,
          owner: {
            _id: 'owner-cantho-a',
            name: 'Nguyen Van A',
            address: 'Cai Rang District, Can Tho',
          },
        },
        {
          _id: 'dev-cantho-2',
          name: 'Galaxy Tab S9',
          category: 'tablet',
          pricePerDay: 250000,
          status: 'available',
          distanceMeters: 12500,
          owner: {
            _id: 'owner-cantho-b',
            name: 'Nguyen Van B',
            address: 'Ninh Kieu District, Can Tho',
          },
        },
      ],
      pagination: { total: 2, page: 1, limit: 24, totalPages: 1 },
    });

    await mount();

    // Must call API using Can Tho coordinates (lat: 10.0452, lng: 105.7469)
    expect(deviceService.getRecommendedDevices).toHaveBeenCalledWith({
      lat: 10.0452,
      lng: 105.7469,
      page: 1,
      limit: 24,
    });

    expect(container.textContent).toContain('EOS R8 Body');
    expect(container.textContent).toContain('Owner: Nguyen Van A');
    expect(container.textContent).toContain('Location: Cần Thơ');
    expect(container.textContent).toContain('3.2 km away');

    expect(container.textContent).toContain('Galaxy Tab S9');
    expect(container.textContent).toContain('Owner: Nguyen Van B');
    expect(container.textContent).toContain('Location: Cần Thơ');
    expect(container.textContent).toContain('12.5 km away');

    // Devices from Hanoi must NOT appear in device grid
    const gridText = container.querySelector('.device-grid')?.textContent || '';
    expect(gridText).not.toContain('Hà Nội');
  });

  test('TC-02: User selects Hanoi -> returns devices from eligible owners within 100km of Hanoi', async () => {
    localStorage.setItem('techshare:selected-city', 'ha_noi');

    deviceService.getRecommendedDevices.mockResolvedValue({
      data: [
        {
          _id: 'dev-hanoi-1',
          name: 'MacBook Pro M3 Max',
          category: 'laptop',
          pricePerDay: 600000,
          status: 'available',
          distanceMeters: 800,
          owner: {
            _id: 'owner-hanoi-1',
            name: 'Nguyen Van Owner1',
            address: 'Số 15 phố Tràng Tiền, Hoàn Kiếm, Hà Nội',
          },
        },
      ],
      pagination: { total: 1, page: 1, limit: 24, totalPages: 1 },
    });

    await mount();

    // Must call API using Hanoi coordinates (lat: 21.0285, lng: 105.8542)
    expect(deviceService.getRecommendedDevices).toHaveBeenCalledWith({
      lat: 21.0285,
      lng: 105.8542,
      page: 1,
      limit: 24,
    });

    expect(container.textContent).toContain('MacBook Pro M3 Max');
    expect(container.textContent).toContain('Owner: Nguyen Van Owner1');
    expect(container.textContent).toContain('Location: Hà Nội');
    expect(container.textContent).toContain('0.8 km away');
  });

  test('TC-03: User switches from Can Tho to Hanoi -> Home reloads recommendations using Hanoi as search center', async () => {
    localStorage.setItem('techshare:selected-city', 'can_tho');

    deviceService.getRecommendedDevices.mockResolvedValueOnce({
      data: [
        {
          _id: 'dev-ct',
          name: 'Can Tho Camera',
          pricePerDay: 300000,
          distanceMeters: 4000,
          owner: { name: 'Can Tho Owner', address: 'Quận Cái Răng, Cần Thơ' },
        },
      ],
      pagination: { total: 1, page: 1, limit: 24, totalPages: 1 },
    });

    await mount();

    expect(deviceService.getRecommendedDevices).toHaveBeenLastCalledWith({
      lat: 10.0452,
      lng: 105.7469,
      page: 1,
      limit: 24,
    });
    expect(container.textContent).toContain('Can Tho Camera');

    // User switches dropdown to Hanoi
    deviceService.getRecommendedDevices.mockResolvedValueOnce({
      data: [
        {
          _id: 'dev-hn',
          name: 'Hanoi Drone',
          pricePerDay: 500000,
          distanceMeters: 1200,
          owner: { name: 'Hanoi Owner', address: 'Hoàn Kiếm, Hà Nội' },
        },
      ],
      pagination: { total: 1, page: 1, limit: 24, totalPages: 1 },
    });

    const citySelect = container.querySelector('#home-city-select');
    expect(citySelect).not.toBeNull();

    await act(async () => {
      citySelect.value = 'ha_noi';
      citySelect.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Home reloaded recommendations using Hanoi coordinates
    expect(deviceService.getRecommendedDevices).toHaveBeenLastCalledWith({
      lat: 21.0285,
      lng: 105.8542,
      page: 1,
      limit: 24,
    });
    expect(container.textContent).toContain('Hanoi Drone');
    expect(localStorage.getItem('techshare:selected-city')).toBe('ha_noi');
  });

  test('TC-04: Owner has multiple devices -> all devices inherit the same owner location and calculated distance', async () => {
    const ownerCanTho = {
      _id: 'owner-yen',
      name: 'Vũ Hải Yến (Studio Setup)',
      address: 'Quận Cái Răng, Cần Thơ',
      location: { type: 'Point', coordinates: [105.7760, 10.0110] },
    };

    const device1 = {
      _id: 'dev-mic',
      name: 'Shure SM7B Microphone',
      pricePerDay: 280000,
      status: 'available',
      owner: ownerCanTho,
    };

    const device2 = {
      _id: 'dev-dji',
      name: 'DJI Mic 2 Wireless',
      pricePerDay: 160000,
      status: 'available',
      owner: ownerCanTho,
    };

    const searchCenter = { lat: 10.0452, lng: 105.7469 }; // Can Tho center

    await mount(
      <div>
        <DeviceCard device={device1} userCoordinates={searchCenter} />
        <DeviceCard device={device2} userCoordinates={searchCenter} />
      </div>
    );

    const distEls = container.querySelectorAll('.device-card-distance');
    expect(distEls).toHaveLength(2);
    expect(distEls[0].textContent.trim()).toBe(distEls[1].textContent.trim());
    expect(distEls[0].textContent.trim()).toBe('5.0 km away');

    const locEls = container.querySelectorAll('.device-card-location-city');
    expect(locEls).toHaveLength(2);
    expect(locEls[0].textContent.trim()).toBe('Cần Thơ');
    expect(locEls[1].textContent.trim()).toBe('Cần Thơ');
  });

  test('TC-05: Owner is outside the 100km radius -> excluded from recommendations', async () => {
    localStorage.setItem('techshare:selected-city', 'can_tho');

    // Backend returns only devices within 100km of Can Tho (31 devices)
    deviceService.getRecommendedDevices.mockResolvedValue({
      data: [
        {
          _id: 'dev-yen',
          name: 'Studio Equipment',
          distanceMeters: 5020, // 5.0 km from Can Tho
          owner: { name: 'Vũ Hải Yến', address: 'Quận Cái Răng, Cần Thơ' },
        },
      ],
      pagination: { total: 1, page: 1, limit: 24, totalPages: 1 },
    });

    await mount();

    expect(container.textContent).toContain('Studio Equipment');
    // Distant owners from Hanoi (>1100km) or HCM (>120km) are not returned in device grid
    const gridText = container.querySelector('.device-grid')?.textContent || '';
    expect(gridText).not.toContain('Hà Nội');
    expect(gridText).not.toContain('TP. Hồ Chí Minh');
  });

  test('TC-06: Owner has missing coordinates -> do not fabricate distance or coordinates', async () => {
    const deviceNoCoords = {
      _id: 'dev-no-coords',
      name: 'No Location Gadget',
      category: 'accessory',
      pricePerDay: 100000,
      status: 'available',
      owner: {
        _id: 'owner-no-loc',
        name: 'Mystery Owner',
        address: '',
        location: null,
      },
    };

    await mount(<DeviceCard device={deviceNoCoords} userCoordinates={{ lat: 10.0452, lng: 105.7469 }} />);

    // Distance must NOT be rendered
    expect(container.querySelector('.device-card-distance')).toBeNull();
    expect(container.textContent).not.toContain('km away');

    // Title and owner name must render correctly
    expect(container.querySelector('.device-card-title').textContent).toBe('No Location Gadget');
    expect(container.querySelector('.device-card-owner-name').textContent).toBe('Owner: Mystery Owner');
  });

  test('TC-07: User has no GPS permission but has a saved city in profile -> recommendations work using saved city', async () => {
    // GPS is denied
    // User profile has address in Can Tho
    mockAuthUser = {
      _id: 'user-anlt',
      name: 'Lê Trường An',
      address: '600, Nguyễn Văn Cừ, Long Tuyền, Bình Thủy, Cần Thơ.',
    };

    deviceService.getRecommendedDevices.mockResolvedValue({
      data: [
        {
          _id: 'dev-profile-city',
          name: 'Can Tho Profile Device',
          pricePerDay: 350000,
          distanceMeters: 2500,
          owner: { name: 'Can Tho Resident', address: 'Bình Thủy, Cần Thơ' },
        },
      ],
      pagination: { total: 1, page: 1, limit: 24, totalPages: 1 },
    });

    await mount();

    // Priority 2: User's profile city (Can Tho) was resolved and used
    expect(deviceService.getRecommendedDevices).toHaveBeenCalledWith({
      lat: 10.0452,
      lng: 105.7469,
      page: 1,
      limit: 24,
    });
    expect(container.textContent).toContain('Can Tho Profile Device');
    expect(container.textContent).not.toContain('Unable to determine your location.');
  });

  test('TC-08: No devices found within search radius -> display proper empty state instead of unrelated devices', async () => {
    localStorage.setItem('techshare:selected-city', 'da_nang');

    deviceService.getRecommendedDevices.mockResolvedValue({
      data: [],
      pagination: { total: 0, page: 1, limit: 24, totalPages: 1 },
    });

    await mount();

    expect(deviceService.getRecommendedDevices).toHaveBeenCalledWith({
      lat: 16.0544,
      lng: 108.2022,
      page: 1,
      limit: 24,
    });

    // Empty state rendered with informative messaging
    expect(container.querySelector('.home-devices-empty')).not.toBeNull();
    expect(container.textContent).toContain('No devices available within 100km of Đà Nẵng.');
    expect(container.querySelectorAll('article')).toHaveLength(0);
  });
});
