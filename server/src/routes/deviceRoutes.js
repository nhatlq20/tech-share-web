import express from 'express';
import {
  getDevices,
  getNearbyDevices,
  getDeviceById,
} from '../controllers/deviceController.js';
import { getDeviceAvailability } from '../controllers/bookingController.js';

import {
  getOwnerDevices,
  createOwnerDevice,
  toggleDeviceStatus,
  toggleBlockedDate,
  getOwnerAnalytics,
} from '../controllers/ownerController.js';

const router = express.Router();

// Specific routes before parameterized :id route
router.get('/nearby', getNearbyDevices);
router.get('/my-devices', getOwnerDevices);
router.get('/owner/analytics', getOwnerAnalytics);

// Create device
router.post('/', createOwnerDevice);

// Root devices listing with search, category, pagination & sorting
router.get('/', getDevices);

// Device availability for calendar & booking range picker
router.get('/:id/availability', getDeviceAvailability);

// Device mutations
router.patch('/:id/status', toggleDeviceStatus);
router.patch('/:id/blocked-dates', toggleBlockedDate);

// Parameterized device detail route
router.get('/:id', getDeviceById);

export default router;


