import api from './api.js';
import { deviceService } from './deviceService.js';

export const getDevices = async (params = {}) => {
  return deviceService.getDevices({ limit: 50, ...params });
};

export const compareDevices = async (deviceId1, deviceId2) => {
  if (!deviceId1 || !deviceId2 || deviceId1 === deviceId2) {
    throw new Error('Select two different devices to compare.');
  }

  const response = await api.post('/ai/compare-devices', {
    deviceId1,
    deviceId2,
  });

  if (!response || response.success === false) {
    throw new Error(response?.message || 'The AI comparison service is unavailable.');
  }

  if (!response.comparison || typeof response.comparison !== 'object') {
    throw new Error(response.message || 'The comparison service returned an invalid response.');
  }

  return response.comparison;
};
