import express from "express";
import {
  getVendors,
  getVendor,
  createVendor,
  updateVendor,
  deleteVendor,
  getVendorStats,
  getVendorInvoicePrefix,
  setVendorInvoicePrefix,
  updateVendorSettings,
  getVendorSettings,
  getVendorProfile,
} from "../controllers/vendorController.js";
import { protect, authorize } from "../middleware/auth.js";
import {
  validate,
  validateBody,
  validateQuery,
  validateParams,
} from "../middleware/validation.js";
import {
  createVendorSchema,
  updateVendorSchema,
  idParamSchema,
  idParamOnlySchema,
  vendorQuerySchema,
} from "../validation/schemas.js";

const router = express.Router();

// All routes are protected
router.use(protect);

// Vendor profile route (vendor only)
router.get("/profile", getVendorProfile);

// Routes accessible by super admin only
router.get(
  "/",
  authorize("superadmin"),
  validateQuery(vendorQuerySchema.shape.query),
  getVendors
);
router.get("/:id", validateParams(idParamOnlySchema), getVendor);
router.get("/:id/stats", validateParams(idParamOnlySchema), getVendorStats);
router.get(
  "/:id/settings",
  validateParams(idParamOnlySchema),
  getVendorSettings
);
router.get(
  "/:id/invoice-prefix",
  validateParams(idParamOnlySchema),
  getVendorInvoicePrefix
);
router.put("/:id", validate(updateVendorSchema), updateVendor);
router.patch(
  "/:id/settings",
  validateParams(idParamOnlySchema),
  updateVendorSettings
);
router.put(
  "/:id/invoice-prefix",
  authorize("superadmin"),
  setVendorInvoicePrefix
);

// Super admin only routes
router.post(
  "/",
  authorize("superadmin"),
  validateBody(createVendorSchema.shape.body),
  createVendor
);
router.delete(
  "/:id",
  authorize("superadmin"),
  validateParams(idParamOnlySchema),
  deleteVendor
);

export default router;
