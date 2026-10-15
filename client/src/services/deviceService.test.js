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
