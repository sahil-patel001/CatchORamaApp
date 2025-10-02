import express from "express";
import {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  activateUser,
  getProfile,
  updateProfile,
  getUserStats,
  updateUserNotificationPreferences,
  getUserNotificationPreferences,
} from "../controllers/userController.js";
import { protect, authorize } from "../middleware/auth.js";
import {
  validate,
  validateBody,
  validateParams,
} from "../middleware/validation.js";
import {
  updateUserSchema,
  idParamSchema,
  idParamOnlySchema,
} from "../validation/schemas.js";

const router = express.Router();

// All routes are protected
router.use(protect);

// Profile routes (accessible by all authenticated users)
router.get("/profile", getProfile);
router.put("/profile", updateProfile);

// Notification preference routes
router.get(
  "/:id/preferences",
  validateParams(idParamOnlySchema),
  getUserNotificationPreferences
);
router.patch(
  "/:id/preferences",
  validateParams(idParamOnlySchema),
  updateUserNotificationPreferences
);

// Admin only routes
router.get("/stats", authorize("superadmin"), getUserStats);
router.get("/", authorize("superadmin"), getUsers);
router.get("/:id", validateParams(idParamOnlySchema), getUser);
router.put("/:id", validate(updateUserSchema), updateUser);
router.delete(
  "/:id",
  authorize("superadmin"),
  validateParams(idParamOnlySchema),
  deleteUser
);
router.patch(
  "/:id/activate",
  authorize("superadmin"),
  validateParams(idParamOnlySchema),
  activateUser
);

export default router;
