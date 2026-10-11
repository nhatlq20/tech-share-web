import express from 'express';
import {
  createBooking,
  getMyBookings,
  getBookingById,
  validatePricing,
  getDeviceAvailability,
} from '../controllers/bookingController.js';

import {
  getOwnerBookings,
  approveBooking,
  rejectBooking,
  handoverBooking,
  completeBooking,
} from '../controllers/ownerController.js';

const router = express.Router();

// Specific routes
router.get('/my-bookings', getMyBookings);
router.get('/owner', getOwnerBookings);
router.post('/validate-pricing', validatePricing);
router.get('/availability/:id', getDeviceAvailability);

// Booking state transitions for owner
router.patch('/:id/approve', approveBooking);
router.patch('/:id/reject', rejectBooking);
router.patch('/:id/handover', handoverBooking);
router.patch('/:id/complete', completeBooking);

// Standard REST routes
router.post('/', createBooking);
router.get('/:id', getBookingById);

export default router;
