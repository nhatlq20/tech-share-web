import express from 'express';
import {
  createBooking,
  getMyBookings,
  getBookingById,
  validatePricing,
  getDeviceAvailability,
} from '../controllers/bookingController.js';

const router = express.Router();

// Specific routes
router.get('/my-bookings', getMyBookings);
router.post('/validate-pricing', validatePricing);
router.get('/availability/:id', getDeviceAvailability);

// Standard REST routes
router.post('/', createBooking);
router.get('/:id', getBookingById);

export default router;
