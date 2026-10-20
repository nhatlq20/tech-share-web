import api from './api';
import { getRecommendedDevices, getNearbyDevices } from './deviceService';

jest.mock('./api', () => ({ __esModule: true, default: { get: jest.fn() } }));

test('recommendations keep the existing endpoint and page 1 / limit 24 contract', async () => {
  api.get.mockResolvedValue({ success: true, data: [] });
  await getRecommendedDevices({ lat: 21.0285, lng: 105.8542 });
  expect(api.get).toHaveBeenCalledTimes(1);
  expect(api.get).toHaveBeenCalledWith('/devices/recommended', {
    params: { lat: 21.0285, lng: 105.8542, page: 1, limit: 24 },
  });
});

beforeEach(() => { jest.clearAllMocks(); api.get.mockResolvedValue({ success: true, data: [] }); });

test('camera filter is sent to recommended API with coordinates and pagination', async () => {
  await getRecommendedDevices({ lat: 21.0285, lng: 105.8542, category: 'camera', page: 2, limit: 24 });
  expect(api.get).toHaveBeenCalledWith('/devices/recommended', {
    params: { lat: 21.0285, lng: 105.8542, category: 'camera', page: 2, limit: 24 },
  });
});

test.each(['all', 'All', '', undefined])('all/empty category %s does not send a category filter', async category => {
  await getRecommendedDevices({ lat: 21.0285, lng: 105.8542, category });
  expect(api.get.mock.calls[0][1].params).not.toHaveProperty('category');
});

test('nearby uses its own endpoint and preserves the 10000 meter radius', async () => {
  await getNearbyDevices({ lat: 21.0285, lng: 105.8542, radius: 10000, page: 1, limit: 100 });
  expect(api.get).toHaveBeenCalledWith('/devices/nearby', { params: { lat: 21.0285, lng: 105.8542, radius: 10000, page: 1, limit: 100 } });
});
test.each([{ lat: Infinity, lng: 105 }, { lat: 91, lng: 105 }, { lat: 21, lng: -181 }])('nearby rejects invalid coordinates %s', async params => {
  await expect(getNearbyDevices(params)).rejects.toThrow(); expect(api.get).not.toHaveBeenCalled();
});

test('search q keyword is sent to recommended API with coordinates and limit 12', async () => {
  await getRecommendedDevices({ lat: 21.0285, lng: 105.8542, q: 'sony' });
  expect(api.get).toHaveBeenCalledWith('/devices/recommended', {
    params: { lat: 21.0285, lng: 105.8542, page: 1, limit: 12, q: 'sony' },
  });
});

test('search q combined with category is sent to recommended API', async () => {
  await getRecommendedDevices({ lat: 21.0285, lng: 105.8542, category: 'camera', q: 'sony', page: 1, limit: 12 });
  expect(api.get).toHaveBeenCalledWith('/devices/recommended', {
    params: { lat: 21.0285, lng: 105.8542, category: 'camera', page: 1, limit: 12, q: 'sony' },
  });
});

test('search q keyword is trimmed', async () => {
  await getRecommendedDevices({ lat: 21.0285, lng: 105.8542, q: '  macbook  ' });
  expect(api.get).toHaveBeenCalledWith('/devices/recommended', {
    params: { lat: 21.0285, lng: 105.8542, page: 1, limit: 12, q: 'macbook' },
  });
});

test.each(['', '   ', undefined, null])('empty/whitespace search q %s is omitted from params', async emptyQ => {
  await getRecommendedDevices({ lat: 21.0285, lng: 105.8542, q: emptyQ });
  expect(api.get.mock.calls[0][1].params).not.toHaveProperty('q');
});
