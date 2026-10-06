import express from 'express';
import {
  getAdminAnalytics,
  getAdminUsers,
  toggleUserStatus,
  getAdminDevices,
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
router.delete('/devices/:id', removeDevice);

// 4. eKYC Verification
router.get('/ekyc-requests', getAdminEkycRequests);
router.patch('/ekyc/:id/approve', approveEkycRequest);
router.patch('/ekyc/:id/reject', rejectEkycRequest);

export default router;

