import express from "express";
import {
  getDevices,
  getNearbyDevices,
  getRecommendedDevices,
  getDeviceById,
  createDevice,
  updateDevice,
  myDevices,
  deleteOwner,
} from "../controllers/deviceController.js";
import {
  getOwnerDevices,
  getOwnerAnalytics,
  toggleDeviceStatus,
  toggleBlockedDate,
} from "../controllers/ownerController.js";
import { getDeviceAvailability } from "../controllers/bookingController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { requireOwner } from "../middlewares/roleMiddleware.js";

const router = express.Router();

// Specific routes before parameterized :id route
router.get("/nearby", getNearbyDevices);
router.get("/recommended", getRecommendedDevices);
router.get("/my-devices", getOwnerDevices);
router.get("/owner/analytics", getOwnerAnalytics);

// Root devices listing with search, category, pagination & sorting
router.get("/", getDevices);

// Device availability for calendar & booking range picker
router.get("/:id/availability", getDeviceAvailability);
router.delete("/:deviceId", protect, requireOwner, deleteOwner);
router.patch("/:id/status", toggleDeviceStatus);
router.patch("/:id/blocked-dates", toggleBlockedDate);

// Parameterized device detail route
router.get("/:id", getDeviceById);

router.post("/", protect, requireOwner, createDevice);
router.put("/:id", protect, requireOwner, updateDevice);
router.patch("/:id/update", protect, requireOwner, updateDevice);

export default router;
