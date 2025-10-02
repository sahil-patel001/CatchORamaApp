import express from "express";
import { getSalesReport, getCommissionReport } from "../controllers/reportController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

// All routes in this file are protected and restricted to vendors and superadmins
router.use(protect);
router.use(authorize("vendor", "superadmin"));

router.route("/sales").get(getSalesReport);

// Commission report route - restricted to superadmin only
router.route("/commission").get(authorize("superadmin"), getCommissionReport);

export default router;
