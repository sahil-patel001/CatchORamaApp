import express from "express";
import {
  getCommissions,
  getCommission,
  generateCommission,
  approveCommission,
  markCommissionAsPaid,
  disputeCommission,
  updateCommission,
  deleteCommission,
  getCommissionStats,
  getVendorCommissions,
  bulkGenerateCommissions,
} from "../controllers/commissionController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Vendor-specific routes
router.route("/vendor").get(authorize("vendor"), getVendorCommissions);

// Super admin only routes
router.use(authorize("superadmin"));

// Commission management routes
router.route("/").get(getCommissions);

router.route("/generate").post(generateCommission);

router.route("/bulk-generate").post(bulkGenerateCommissions);

router.route("/stats").get(getCommissionStats);

router.use(protect);

// Validate :id params
const objectIdPattern = /^[a-f\d]{24}$/i; // adjust to your ID format
router.param("id", (req, res, next, id) => {
  if (!objectIdPattern.test(id)) {
    return res.status(400).json({ message: "Invalid commission id" });
  }
  return next();
});

router
  .route("/:id")
  .get(getCommission)
  .put(updateCommission)
  .delete(deleteCommission);

router.route("/:id/approve").put(approveCommission);

router.route("/:id/pay").put(markCommissionAsPaid);

router.route("/:id/dispute").put(disputeCommission);

export default router;
