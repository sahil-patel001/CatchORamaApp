import express from "express";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";
import { protect, authorize } from "../middleware/auth.js";
import { validate, validateParams } from "../middleware/validation.js";
import {
  createCategorySchema,
  updateCategorySchema,
  idParamSchema,
  idParamOnlySchema,
} from "../validation/schemas.js";

const router = express.Router();

router
  .route("/")
  .get(protect, authorize("superadmin", "vendor"), getCategories)
  .post(
    protect,
    authorize("superadmin", "vendor"),
    validate(createCategorySchema),
    createCategory
  );

router
  .route("/:id")
  .put(
    protect,
    authorize("superadmin", "vendor"),
    validate(updateCategorySchema),
    updateCategory
  )
  .delete(
    protect,
    authorize("superadmin", "vendor"),
    validateParams(idParamOnlySchema),
    deleteCategory
  );

export default router;
