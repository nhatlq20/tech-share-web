import express from "express";
import {
  aiCompare,
  aiGenerateDeviceDescription,
} from "../controllers/aiController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { requireOwner } from "../middlewares/roleMiddleware.js";

const router = express.Router();

// API so sánh 2 thiết bị bằng Gemini AI
router.post("/compare-devices", aiCompare);
router.post(
  "/generate-device-description",
  protect,
  requireOwner,
  aiGenerateDeviceDescription,
);

export default router;