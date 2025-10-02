import express from "express";
import {
  getAdminDashboard,
  getVendorDashboard,
} from "../controllers/dashboardController.js";
import { protect, authorize } from "../middleware/auth.js";
import { dashboardCache } from "../middleware/cache.js";

const router = express.Router();

// All routes are protected
router.use(protect);

// Dashboard routes - with caching
router.get(
  "/admin",
  authorize("superadmin"),
  dashboardCache,
  getAdminDashboard
);
router.get("/vendor", authorize("vendor"), dashboardCache, getVendorDashboard);

export default router;
