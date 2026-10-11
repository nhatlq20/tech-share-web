import express from 'express';
import {
  getOwnerOverview,
  getOwnerDevices,
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
router.get('/devices', getOwnerDevices);
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

