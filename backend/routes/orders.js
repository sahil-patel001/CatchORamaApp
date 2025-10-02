import express from "express";
import {
  getOrders,
  getOrder,
  createOrder,
  updateOrder,
  updateOrderStatus,
  addTrackingInfo,
  deleteOrder,
} from "../controllers/orderController.js";
import { protect, authorize } from "../middleware/auth.js";
import {
  validate,
  validateBody,
  validateQuery,
  validateParams,
} from "../middleware/validation.js";
import {
  createOrderSchema,
  updateOrderSchema,
  idParamSchema,
  idParamOnlySchema,
  orderQuerySchema,
} from "../validation/schemas.js";

const router = express.Router();

// All routes are protected
router.use(protect);

// CRUD routes
router.get("/", validateQuery(orderQuerySchema.shape.query), getOrders);
router.get("/:id", validateParams(idParamOnlySchema), getOrder);
router.post(
  "/",
  authorize("superadmin", "vendor"),
  validateBody(createOrderSchema.shape.body),
  createOrder
);
router.put(
  "/:id",
  authorize("superadmin", "vendor"),
  validate(updateOrderSchema),
  updateOrder
);
router.delete(
  "/:id",
  authorize("superadmin", "vendor"),
  validateParams(idParamOnlySchema),
  deleteOrder
);

// Status and tracking management
router.patch(
  "/:id/status",
  authorize("superadmin", "vendor"),
  validateParams(idParamOnlySchema),
  updateOrderStatus
);
router.patch(
  "/:id/tracking",
  authorize("superadmin", "vendor"),
  validateParams(idParamOnlySchema),
  addTrackingInfo
);

export default router;
