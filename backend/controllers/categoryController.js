import { asyncHandler } from "../middleware/errorHandler.js";
import Category from "../models/Category.js";
import Vendor from "../models/Vendor.js";
import Product from "../models/Product.js";

// @desc    Get all categories
// @route   GET /api/v1/categories
// @access  Private (Superadmin, Vendor)
export const getCategories = asyncHandler(async (req, res, next) => {
  let query = {};
  const { vendorId } = req.query;

  // For vendors, only show their categories
  if (req.user.role === "vendor") {
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor) {
      return res
        .status(404)
        .json({ success: false, error: "Vendor not found" });
    }
    query.vendorId = vendor._id;
  } else if (req.user.role === "superadmin") {
    // For superadmin, filter by vendorId if provided
    if (vendorId) {
      query.vendorId = vendorId;
    }
    // If no vendorId provided, show all categories (existing behavior)
  }

  const categories = await Category.find(query).populate(
    "vendorId",
    "businessName"
  );

  res.status(200).json({
    success: true,
    data: categories,
  });
});

// @desc    Create a category
// @route   POST /api/v1/categories
// @access  Private (Superadmin, Vendor)
export const createCategory = asyncHandler(async (req, res, next) => {
  const { name, description, vendorId } = req.body;
  let targetVendorId;

  if (req.user.role === "vendor") {
    // For vendors, use their own vendor ID
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor) {
      return res
        .status(404)
        .json({ success: false, error: "Vendor not found" });
    }
    targetVendorId = vendor._id;
  } else if (req.user.role === "superadmin") {
    // For superadmin, vendor ID should be provided in request
    if (!vendorId) {
      return res.status(400).json({
        success: false,
        error: "Vendor ID is required for superadmin",
      });
    }
    targetVendorId = vendorId;
  }

  const category = await Category.create({
    name,
    description,
    vendorId: targetVendorId,
  });

  res.status(201).json({
    success: true,
    data: category,
  });
});

// @desc    Update a category
// @route   PUT /api/v1/categories/:id
// @access  Private (Superadmin, Vendor)
export const updateCategory = asyncHandler(async (req, res, next) => {
  const { name, description } = req.body;
  const categoryId = req.params.id;

  let category = await Category.findById(categoryId);
  if (!category) {
    return res
      .status(404)
      .json({ success: false, error: "Category not found" });
  }

  // Check authorization
  if (req.user.role === "vendor") {
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor || category.vendorId.toString() !== vendor._id.toString()) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to update this category",
      });
    }
  }
  // Superadmin can update any category

  category.name = name;
  category.description = description;
  await category.save();

  res.status(200).json({
    success: true,
    data: category,
  });
});

// @desc    Delete a category
// @route   DELETE /api/v1/categories/:id
// @access  Private (Superadmin, Vendor)
export const deleteCategory = asyncHandler(async (req, res, next) => {
  const categoryId = req.params.id;

  const category = await Category.findById(categoryId);
  if (!category) {
    return res
      .status(404)
      .json({ success: false, error: "Category not found" });
  }

  // Check authorization
  if (req.user.role === "vendor") {
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor || category.vendorId.toString() !== vendor._id.toString()) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to delete this category",
      });
    }
  }
  // Superadmin can delete any category

  // Check if category is in use
  const productCount = await Product.countDocuments({
    category: category.name,
    vendorId: category.vendorId,
  });
  if (productCount > 0) {
    return res.status(400).json({
      success: false,
      error: "Cannot delete category as it is currently in use by products.",
    });
  }

  await category.deleteOne();

  res.status(200).json({
    success: true,
    data: {},
  });
});
