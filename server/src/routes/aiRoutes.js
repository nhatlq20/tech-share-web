import express from "express";
import { aiCompare } from "../controllers/aiController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// API so sánh 2 thiết bị bằng Gemini AI
router.post("/compare-devices", aiCompare);

export default router;