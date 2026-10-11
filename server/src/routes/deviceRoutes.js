import express from 'express';
import {
  getDevices,
  getNearbyDevices,
  getDeviceById,
} from '../controllers/deviceController.js';
import { getDeviceAvailability } from '../controllers/bookingController.js';

const router = express.Router();

// Specific routes before parameterized :id route
router.get('/nearby', getNearbyDevices);

// Root devices listing with search, category, pagination & sorting
router.get('/', getDevices);

// Device availability for calendar & booking range picker
router.get('/:id/availability', getDeviceAvailability);

// Parameterized device detail route
router.get('/:id', getDeviceById);


router.post('/',au)
export default router;

