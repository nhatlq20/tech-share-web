import express from 'express';
import {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  validatePricing,
  getDeviceAvailability,
  requestBookingExtension,
  approveBookingExtension,
  rejectBookingExtension,
  updateRenterHandover,
} from '../controllers/bookingController.js';
import {
  getOwnerBookings,
  approveBooking,
  rejectBooking,
  handoverBooking,
  completeBooking,
} from '../controllers/ownerController.js';
import { protect, optionalProtect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Specific routes (must be declared before parameterized :id routes)
router.get('/my-bookings', protect, getMyBookings);
router.get('/owner', getOwnerBookings);
router.post('/validate-pricing', validatePricing);
router.get('/availability/:id', getDeviceAvailability);

// Owner actions on bookings
router.patch('/:id/approve', approveBooking);
router.patch('/:id/reject', rejectBooking);
router.patch('/:id/handover', handoverBooking);
router.patch('/:id/complete', completeBooking);

// Renter handover QR & beforeRental photo upload actions
router.patch('/:id/handover-renter', protect, updateRenterHandover);
router.post('/:id/handover-renter', protect, updateRenterHandover);
router.patch('/:id/before-rental', protect, updateRenterHandover);

// Rental Extension actions
router.post('/:id/extend', protect, requestBookingExtension);
router.patch('/:id/extension/approve', protect, approveBookingExtension);
router.patch('/:id/extension/reject', protect, rejectBookingExtension);

// Standard REST routes
router.post('/', optionalProtect, createBooking);
router.get('/:id', protect, getBookingById);
router.patch('/:id/cancel', protect, cancelBooking);

export default router;
