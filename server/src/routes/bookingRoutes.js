import express from 'express';
import {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  validatePricing,
  getDeviceAvailability,
} from '../controllers/bookingController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Specific routes (must be declared before parameterized :id routes)
router.get('/my-bookings', protect, getMyBookings);
router.post('/validate-pricing', validatePricing);
router.get('/availability/:id', getDeviceAvailability);

// Standard REST routes
router.post('/', createBooking);
router.get('/:id', protect, getBookingById);
router.patch('/:id/cancel', protect, cancelBooking);

export default router;
