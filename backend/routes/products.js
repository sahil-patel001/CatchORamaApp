import express from "express";
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStock,
  getProductCategories,
  searchProducts,
  getLowStockProducts,
  checkProductOrderLinkage,
  archiveProduct,
  unarchiveProduct,
  getArchivedProducts,
} from "../controllers/productController.js";
import { protect, authorize } from "../middleware/auth.js";
import {
  validate,
  validateBody,
  validateQuery,
  validateParams,
} from "../middleware/validation.js";
import {
  productListCache,
  invalidateProductCache,
} from "../middleware/cache.js";
import {
  createProductSchema,
  updateProductSchema,
  idParamSchema,
  idParamOnlySchema,
  productQuerySchema,
} from "../validation/schemas.js";
import upload from "../middleware/upload.js";

const router = express.Router();

// All routes are protected
router.use(protect);

// Search and categories routes (before :id routes)
router.get("/search", searchProducts);
router.get("/categories", getProductCategories);
router.get("/low-stock", getLowStockProducts);
router.get("/archived", getArchivedProducts);

// CRUD routes - with caching
router.get(
  "/",
  validateQuery(productQuerySchema.shape.query),
  productListCache,
  getProducts
);
router.get("/:id", validateParams(idParamOnlySchema), getProduct);
router.get(
  "/:id/order-linkage",
  validateParams(idParamOnlySchema),
  checkProductOrderLinkage
);
router.post(
  "/",
  authorize("superadmin", "vendor"),
  upload,
  validateBody(createProductSchema.shape.body),
  invalidateProductCache,
  createProduct
);
router.put(
  "/:id",
  authorize("superadmin", "vendor"),
  upload,
  validate(updateProductSchema),
  invalidateProductCache,
  updateProduct
);
router.delete(
  "/:id",
  authorize("superadmin", "vendor"),
  validateParams(idParamOnlySchema),
  invalidateProductCache,
  deleteProduct
);

// Stock management
router.patch(
  "/:id/stock",
  authorize("superadmin", "vendor"),
  validateParams(idParamOnlySchema),
  updateProductStock
);

// Archive management
router.patch(
  "/:id/archive",
  authorize("superadmin", "vendor"),
  validateParams(idParamOnlySchema),
  archiveProduct
);
router.patch(
  "/:id/unarchive",
  authorize("superadmin", "vendor"),
  validateParams(idParamOnlySchema),
  unarchiveProduct
);

export default router;
