import express from 'express';
import {
  getDevices,
  getNearbyDevices,
  getRecommendedDevices,
  getDeviceById,
  createDevice
} from '../controllers/deviceController.js';
import { getDeviceAvailability } from '../controllers/bookingController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { requireOwner } from '../middlewares/roleMiddleware.js';

const router = express.Router();

// Specific routes before parameterized :id route
router.get('/nearby', getNearbyDevices);
router.get('/recommended', getRecommendedDevices);
router.get('/my-devices', getOwnerDevices);
router.get('/owner/analytics', getOwnerAnalytics);

// Root devices listing with search, category, pagination & sorting
router.get('/', getDevices);

// Device availability for calendar & booking range picker
router.get('/:id/availability', getDeviceAvailability);

// Device mutations
router.patch('/:id/status', toggleDeviceStatus);
router.patch('/:id/blocked-dates', toggleBlockedDate);

// Parameterized device detail route
router.get('/:id', getDeviceById);

router.post('/',protect, requireOwner,createDevice)

export default router;


