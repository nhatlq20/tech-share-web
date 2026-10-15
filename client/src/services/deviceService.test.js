import api from './api';
import { getRecommendedDevices } from './deviceService';

jest.mock('./api', () => ({ __esModule: true, default: { get: jest.fn() } }));

test('recommendations keep the existing endpoint and page 1 / limit 12 contract', async () => {
  api.get.mockResolvedValue({ success: true, data: [] });
  await getRecommendedDevices({ lat: 21.0285, lng: 105.8542 });
  expect(api.get).toHaveBeenCalledTimes(1);
  expect(api.get).toHaveBeenCalledWith('/devices/recommended', {
    params: { lat: 21.0285, lng: 105.8542, page: 1, limit: 12 },
  });
});

beforeEach(() => { jest.clearAllMocks(); api.get.mockResolvedValue({ success: true, data: [] }); });

test('camera filter is sent to recommended API with coordinates and pagination', async () => {
  await getRecommendedDevices({ lat: 21.0285, lng: 105.8542, category: 'camera', page: 2, limit: 12 });
  expect(api.get).toHaveBeenCalledWith('/devices/recommended', {
    params: { lat: 21.0285, lng: 105.8542, category: 'camera', page: 2, limit: 12 },
  });
});

test.each(['all', 'All', '', undefined])('all/empty category %s does not send a category filter', async category => {
  await getRecommendedDevices({ lat: 21.0285, lng: 105.8542, category });
  expect(api.get.mock.calls[0][1].params).not.toHaveProperty('category');
});
