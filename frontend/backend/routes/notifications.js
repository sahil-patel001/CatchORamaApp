import express from "express";
import {
  getNotifications,
  getUnreadNotifications,
  getNotification,
  createNotification,
  markNotificationAsRead,
  markNotificationAsUnread,
  markAllNotificationsAsRead,
  updateNotification,
  deleteNotification,
  getNotificationStats,
  bulkNotificationOperations,
  cleanupExpiredNotifications,
} from "../controllers/notificationController.js";
import { protect, authorize } from "../middleware/auth.js";
import {
  validate,
  validateBody,
  validateQuery,
  validateParams,
} from "../middleware/validation.js";
import {
  createNotificationSchema,
  updateNotificationSchema,
  notificationQuerySchema,
  notificationQueryOnlySchema,
  bulkNotificationSchema,
  idParamSchema,
  idParamOnlySchema,
} from "../validation/schemas.js";

const router = express.Router();

// All routes are protected
router.use(protect);

// Special routes (before :id routes)
router.get("/unread", getUnreadNotifications);
router.get("/stats", getNotificationStats);
router.patch("/mark-all-read", markAllNotificationsAsRead);
router.post(
  "/bulk",
  validateBody(bulkNotificationSchema),
  bulkNotificationOperations
);
router.delete("/cleanup", authorize("superadmin"), cleanupExpiredNotifications);

// Main CRUD routes
router
  .route("/")
  .get(validateQuery(notificationQueryOnlySchema), getNotifications)
  .post(validateBody(createNotificationSchema), createNotification);

// Individual notification routes
router
  .route("/:id")
  .get(validateParams(idParamOnlySchema), getNotification)
  .put(
    validateParams(idParamOnlySchema),
    validateBody(updateNotificationSchema),
    updateNotification
  )
  .delete(validateParams(idParamOnlySchema), deleteNotification);

// Mark as read/unread routes
router.patch(
  "/:id/read",
  validateParams(idParamOnlySchema),
  markNotificationAsRead
);
router.patch(
  "/:id/unread",
  validateParams(idParamOnlySchema),
  markNotificationAsUnread
);

export default router;
