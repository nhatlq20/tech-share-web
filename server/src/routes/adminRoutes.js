import express from 'express';
import {
  getAdminAnalytics,
  getAdminUsers,
  toggleUserStatus,
  getAdminDevices,
  getAdminDeviceDetails,
  moderateDevice,
  removeDevice,
  getAdminEkycRequests,
  approveEkycRequest,
  rejectEkycRequest,
} from '../controllers/adminController.js';

const router = express.Router();

// 1. Overview & KPIs
router.get('/analytics', getAdminAnalytics);
router.get('/overview', getAdminAnalytics);

// 2. User Management & Trust Score
router.get('/users', getAdminUsers);
router.patch('/users/:id/status', toggleUserStatus);

// 3. Device Moderation
router.get('/devices', getAdminDevices);
router.get('/devices/moderation', getAdminDevices);
router.get('/devices/:id', getAdminDeviceDetails);
router.patch('/devices/:id/moderate', moderateDevice);
router.post('/devices/:id/moderate', moderateDevice);
router.delete('/devices/:id', removeDevice);

// 4. eKYC Verification
router.get('/ekyc-requests', getAdminEkycRequests);
router.patch('/ekyc/:id/approve', approveEkycRequest);
router.patch('/ekyc/:id/reject', rejectEkycRequest);

export default router;

