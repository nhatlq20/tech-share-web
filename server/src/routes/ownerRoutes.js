import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { requireOwner } from '../middlewares/roleMiddleware.js';
import {
  getOwnerOverview,
  getOwnerDevices,
  getOwnerDeviceById,
  updateOwnerDevice,
  createOwnerDevice,
  toggleDeviceStatus,
  toggleBlockedDate,
  getOwnerBookings,
  approveBooking,
  rejectBooking,
  handoverBooking,
  completeBooking,
  getOwnerAnalytics,
} from '../controllers/ownerController.js';

const router = express.Router();

// Overview & KPI
router.get('/overview', getOwnerOverview);
router.get('/kpi', getOwnerOverview);
router.get('/analytics', getOwnerAnalytics);

// Devices
router.get('/devices', protect, requireOwner, getOwnerDevices);
router.get('/devices/:id', protect, requireOwner, getOwnerDeviceById);
router.patch('/devices/:id', protect, requireOwner, updateOwnerDevice);
router.post('/devices', createOwnerDevice);
router.patch('/devices/:id/status', toggleDeviceStatus);
router.patch('/devices/:id/blocked-dates', toggleBlockedDate);

// Bookings
router.get('/bookings', getOwnerBookings);
router.patch('/bookings/:id/approve', approveBooking);
router.patch('/bookings/:id/reject', rejectBooking);
router.patch('/bookings/:id/handover', handoverBooking);
router.patch('/bookings/:id/complete', completeBooking);

export default router;
