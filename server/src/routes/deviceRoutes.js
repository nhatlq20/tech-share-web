import express from 'express';
import {
  getDevices,
  getNearbyDevices,
  getDeviceById,
} from '../controllers/deviceController.js';

const router = express.Router();

// Specific routes before parameterized :id route
router.get('/nearby', getNearbyDevices);

// Root devices listing with search, category, pagination & sorting
router.get('/', getDevices);

// Parameterized device detail route
router.get('/:id', getDeviceById);

export default router;
