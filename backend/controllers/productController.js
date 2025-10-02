import { asyncHandler } from "../middleware/errorHandler.js";
import Product from "../models/Product.js";
import Vendor from "../models/Vendor.js";
import mongoose from "mongoose";
import {
  shouldTriggerLowStockNotification,
  triggerLowStockNotification,
  shouldTriggerCubicVolumeAlert,
  triggerCubicVolumeAlert,
  calculateCubicWeight,
} from "../utils/notificationTriggers.js";
import { notificationConfig } from "../config/notification.js";

// @desc    Get all products
// @route   GET /api/v1/products
// @access  Private
export const getProducts = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    search,
    category,
    minPrice,
    maxPrice,
    inStock,
    sort = "-createdAt",
  } = req.query;

  // Build query
  let query = {
    status: { $ne: "archived" }, // Exclude archived products by default
  };

  // For vendors, only show their products - optimize with lean query
  if (req.user.role === "vendor") {
    const vendor = await Vendor.findOne({ userId: req.user._id })
      .select("_id")
      .lean();
    if (vendor) {
      query.vendorId = vendor._id;
    } else {
      // If vendor profile doesn't exist, return empty results
      query.vendorId = new mongoose.Types.ObjectId(); // Non-existent ID to return empty results
    }
  }

  // Search functionality - use text index when available
  if (search) {
    // First try text search if it's a full-text search
    if (search.length > 2) {
      query.$text = { $search: search };
    } else {
      // Fallback to regex for short searches
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }
  }

  // Filter by category - use exact match when possible
  if (category) {
    query.category = category;
  }

  // Price range filter
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = parseFloat(minPrice);
    if (maxPrice) query.price.$lte = parseFloat(maxPrice);
  }

  // Stock filter - only apply if inStock is explicitly true (to show only in-stock items)
  // If inStock is false or undefined, show all products regardless of stock
  if (inStock === true || inStock === "true") {
    query.stock = { $gt: 0 };
  }
  // Note: We don't filter when inStock is false - this shows all products

  // Calculate pagination
  const skip = (page - 1) * limit;
  const limitNum = parseInt(limit);

  // Execute query and count in parallel for better performance
  const [products, total] = await Promise.all([
    Product.find(query)
      .populate("vendor", "businessName vendorPrefix")
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(), // Use lean for better performance when we don't need full Mongoose documents
    Product.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: {
      products,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
  });
});

// @desc    Get single product
// @route   GET /api/v1/products/:id
// @access  Private
export const getProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id).populate(
    "vendor",
    "businessName phone address"
  );

  if (!product) {
    return res.status(404).json({
      success: false,
      error: {
        message: "Product not found",
      },
    });
  }

  // Check authorization for vendors
  if (req.user.role === "vendor") {
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor || product.vendorId.toString() !== vendor._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          message: "Not authorized to view this product",
        },
      });
    }
  }

  res.status(200).json({
    success: true,
    data: {
      product,
    },
  });
});

// @desc    Create product
// @route   POST /api/v1/products
// @access  Private (Vendors and Super Admin)
export const createProduct = asyncHandler(async (req, res, next) => {
  let vendorId;

  if (req.user.role === "vendor") {
    // For vendors, get their vendor ID and settings
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Vendor profile not found",
        },
      });
    }
    vendorId = vendor._id;

    // Store vendor for later use in setting defaults
    req.vendor = vendor;
  } else if (req.user.role === "superadmin") {
    // For super admin, vendor ID should be provided in request
    vendorId = req.body.vendorId;
    if (!vendorId) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Vendor ID is required",
        },
      });
    }
  }

  // Create product
  const productData = {
    ...req.body,
    vendorId,
  };

  if (req.body.length) {
    productData.length = parseFloat(req.body.length);
  }
  if (req.body.breadth) {
    productData.breadth = parseFloat(req.body.breadth);
  }
  if (req.body.height) {
    productData.height = parseFloat(req.body.height);
  }
  if (req.body.weight) {
    productData.weight = parseFloat(req.body.weight);
  }
  if (req.body.cubicWeight) {
    productData.cubicWeight = parseFloat(req.body.cubicWeight);
  }

  // Handle low stock threshold in inventory
  if (req.body.lowStockThreshold) {
    productData["inventory.lowStockThreshold"] = parseInt(
      req.body.lowStockThreshold
    );
  } else if (
    req.vendor &&
    req.vendor.settings?.inventory?.defaultLowStockThreshold
  ) {
    // Use vendor's default low stock threshold if not explicitly provided
    productData["inventory.lowStockThreshold"] =
      req.vendor.settings.inventory.defaultLowStockThreshold;
  } else if (req.user.role === "superadmin" && vendorId) {
    // For super admin creating products, get vendor's default threshold
    const vendor = await Vendor.findById(vendorId);
    if (vendor && vendor.settings?.inventory?.defaultLowStockThreshold) {
      productData["inventory.lowStockThreshold"] =
        vendor.settings.inventory.defaultLowStockThreshold;
    }
  }

  // Handle image upload - save to images array as expected by schema
  if (req.file) {
    productData.images = [
      {
        url: req.file.path,
        alt: req.body.name || "Product image",
        isPrimary: true,
      },
    ];
  }

  const product = await Product.create(productData);
  await product.populate(
    "vendorId",
    "businessName vendorPrefix userId name email"
  );

  // Check if low stock notification should be triggered for new product
  if (shouldTriggerLowStockNotification(product)) {
    try {
      await triggerLowStockNotification(product, product.vendorId);
    } catch (notificationError) {
      console.error(
        "Failed to send low stock notification:",
        notificationError
      );
      // Don't fail the product creation if notification fails
    }
  }

  // Check if cubic volume alert should be triggered for new product

  // Check for cubic volume alert and prepare response
  let responseMessage = "Product created successfully";
  let warnings = [];

  if (shouldTriggerCubicVolumeAlert(product)) {
    // Calculate cubic weight for display
    const cubicWeight = product.cubicWeight || calculateCubicWeight(product);
    const threshold = notificationConfig.triggers.cubicVolume.thresholdKg;

    // Add warning for vendor
    warnings.push({
      type: "cubic_volume_warning",
      message: `⚠️ High Volume Product: This product has a cubic weight of ${cubicWeight.toFixed(
        2
      )}kg, which exceeds our ${threshold}kg threshold. This may result in higher shipping costs and has been flagged for admin review.`,
      cubicWeight: cubicWeight.toFixed(2),
      threshold: threshold,
      dimensions: `${product.length || 0}cm × ${product.breadth || 0}cm × ${
        product.height || 0
      }cm`,
    });

    try {
      await triggerCubicVolumeAlert(product, product.vendorId);
    } catch (notificationError) {
      console.error("Failed to send cubic volume alert:", notificationError);
      // Don't fail the product creation if notification fails
    }
  }

  res.status(201).json({
    success: true,
    data: {
      product,
    },
    message: responseMessage,
    warnings: warnings.length > 0 ? warnings : undefined,
  });
});

// @desc    Update product
// @route   PUT /api/v1/products/:id
// @access  Private
export const updateProduct = asyncHandler(async (req, res, next) => {
  let product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      error: {
        message: "Product not found",
      },
    });
  }

  // Check authorization for vendors
  if (req.user.role === "vendor") {
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor || product.vendorId.toString() !== vendor._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          message: "Not authorized to update this product",
        },
      });
    }
  }

  const updateData = { ...req.body };

  // Store original dimension values for comparison
  const originalDimensions = {
    length: product.length,
    breadth: product.breadth,
    height: product.height,
  };

  if (req.body.length) {
    updateData.length = parseFloat(req.body.length);
  } else {
    delete updateData.length; // Prevent saving empty strings
  }

  if (req.body.breadth) {
    updateData.breadth = parseFloat(req.body.breadth);
  } else {
    delete updateData.breadth; // Prevent saving empty strings
  }

  if (req.body.height) {
    updateData.height = parseFloat(req.body.height);
  } else {
    delete updateData.height; // Prevent saving empty strings
  }

  if (req.body.weight) {
    updateData.weight = parseFloat(req.body.weight);
  } else {
    delete updateData.weight; // Prevent saving empty strings
  }

  if (req.body.cubicWeight) {
    updateData.cubicWeight = parseFloat(req.body.cubicWeight);
  } else {
    delete updateData.cubicWeight; // Prevent saving empty strings
  }

  // Handle low stock threshold in inventory
  if (req.body.lowStockThreshold) {
    updateData["inventory.lowStockThreshold"] = parseInt(
      req.body.lowStockThreshold
    );
  } else if (req.body.lowStockThreshold === "") {
    // If explicitly set to empty, unset the field
    updateData.$unset = updateData.$unset || {};
    updateData.$unset["inventory.lowStockThreshold"] = "";
  }

  // Handle image upload - save to images array as expected by schema
  if (req.file) {
    updateData.images = [
      {
        url: req.file.path,
        alt: req.body.name || product.name || "Product image",
        isPrimary: true,
      },
    ];
  }

  // Additional validation for discount price vs regular price
  if (
    updateData.discountPrice !== undefined &&
    updateData.discountPrice !== null
  ) {
    const priceToCheck =
      updateData.price !== undefined ? updateData.price : product.price;
    if (updateData.discountPrice >= priceToCheck) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Discount price must be less than regular price",
        },
      });
    }
  }

  // Store previous stock for notification logic
  const previousStock = product.stock;

  // Update product
  product = await Product.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  }).populate("vendorId", "businessName vendorPrefix userId name email");

  // Check if low stock notification should be triggered
  if (
    updateData.stock !== undefined &&
    shouldTriggerLowStockNotification(product, previousStock)
  ) {
    try {
      await triggerLowStockNotification(product, product.vendorId);
    } catch (notificationError) {
      console.error(
        "Failed to send low stock notification:",
        notificationError
      );
      // Don't fail the product update if notification fails
    }
  }

  // Check if cubic volume alert should be triggered (only when dimensions change AND threshold is breached)
  // Only the three fields used in cubic volume calculation: length, breadth, height
  const dimensionFields = ["length", "breadth", "height"];
  // Check if any dimension value has actually changed
  const dimensionsActuallyChanged = dimensionFields.some((field) => {
    // Check if field exists in updateData AND its value is different from original
    return (
      updateData[field] !== undefined &&
      updateData[field] !== originalDimensions[field]
    );
  });

  // const dimensionsChanged = dimensionFields.some(
  //   (field) => updateData[field] !== undefined
  // );

  // Check for cubic volume alert and prepare response
  let responseMessage = "Product updated successfully";
  let warnings = [];

  // Only trigger notification if:
  // 1. Dimensional fields (length, breadth, height) were changed
  // 2. AND the updated product now exceeds the cubic weight threshold
  if (dimensionsActuallyChanged) {
    const updatedCubicWeight =
      product.cubicWeight || calculateCubicWeight(product);
    const threshold = notificationConfig.triggers.cubicVolume.thresholdKg;
    const exceedsThreshold = updatedCubicWeight > threshold;

    if (exceedsThreshold) {
      // Add warning for vendor
      warnings.push({
        type: "cubic_volume_warning",
        message: `⚠️ High Volume Product: This product has a cubic weight of ${updatedCubicWeight.toFixed(
          2
        )}kg, which exceeds our ${threshold}kg threshold. This may result in higher shipping costs and has been flagged for admin review.`,
        cubicWeight: updatedCubicWeight.toFixed(2),
        threshold: threshold,
        dimensions: `${product.length || 0}cm × ${product.breadth || 0}cm × ${
          product.height || 0
        }cm`,
      });

      try {
        await triggerCubicVolumeAlert(product, product.vendorId);
      } catch (notificationError) {
        console.error("Failed to send cubic volume alert:", notificationError);
        // Don't fail the product update if notification fails
      }
    }
  }

  res.status(200).json({
    success: true,
    data: {
      product,
    },
    message: responseMessage,
    warnings: warnings.length > 0 ? warnings : undefined,
  });
});

// @desc    Check if product is linked to orders
// @route   GET /api/v1/products/:id/order-linkage
// @access  Private
export const checkProductOrderLinkage = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      error: {
        message: "Product not found",
      },
    });
  }

  // Check authorization for vendors
  if (req.user.role === "vendor") {
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor || product.vendorId.toString() !== vendor._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          message: "Not authorized to access this product",
        },
      });
    }
  }

  // Import Order model dynamically to avoid circular dependency
  const Order = (await import("../models/Order.js")).default;

  // Check if product is linked to any orders
  const linkedOrders = await Order.find({
    "items.productId": req.params.id,
  })
    .select("orderNumber status createdAt")
    .limit(5);

  const hasLinkedOrders = linkedOrders.length > 0;

  res.status(200).json({
    success: true,
    data: {
      hasLinkedOrders,
      linkedOrdersCount: linkedOrders.length,
      linkedOrders: linkedOrders.map((order) => ({
        orderNumber: order.orderNumber,
        status: order.status,
        createdAt: order.createdAt,
      })),
    },
  });
});

// @desc    Delete product
// @route   DELETE /api/v1/products/:id
// @access  Private
export const deleteProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      error: {
        message: "Product not found",
      },
    });
  }

  // Check authorization for vendors
  if (req.user.role === "vendor") {
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor || product.vendorId.toString() !== vendor._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          message: "Not authorized to delete this product",
        },
      });
    }
  }

  // Import Order model dynamically to avoid circular dependency
  const Order = (await import("../models/Order.js")).default;

  // Check if product is linked to any orders
  const linkedOrders = await Order.find({
    "items.productId": req.params.id,
  });

  if (linkedOrders.length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        message: "Cannot delete product that is linked to existing orders",
        code: "PRODUCT_HAS_ORDERS",
        linkedOrdersCount: linkedOrders.length,
      },
    });
  }

  await product.deleteOne();

  res.status(200).json({
    success: true,
    message: "Product deleted successfully",
  });
});

// @desc    Archive product
// @route   PATCH /api/v1/products/:id/archive
// @access  Private
export const archiveProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      error: {
        message: "Product not found",
      },
    });
  }

  // Check authorization for vendors
  if (req.user.role === "vendor") {
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor || product.vendorId.toString() !== vendor._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          message: "Not authorized to archive this product",
        },
      });
    }
  }

  // Archive the product
  await product.archive();
  await product.populate("vendor", "businessName vendorPrefix");

  res.status(200).json({
    success: true,
    data: {
      product,
    },
    message: "Product archived successfully",
  });
});

// @desc    Unarchive product
// @route   PATCH /api/v1/products/:id/unarchive
// @access  Private
export const unarchiveProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      error: {
        message: "Product not found",
      },
    });
  }

  // Check authorization for vendors
  if (req.user.role === "vendor") {
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor || product.vendorId.toString() !== vendor._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          message: "Not authorized to unarchive this product",
        },
      });
    }
  }

  // Unarchive the product
  await product.unarchive();
  await product.populate("vendor", "businessName vendorPrefix");

  res.status(200).json({
    success: true,
    data: {
      product,
    },
    message: "Product unarchived successfully",
  });
});

// @desc    Get archived products
// @route   GET /api/v1/products/archived
// @access  Private
export const getArchivedProducts = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    search,
    category,
    sort = "-createdAt",
  } = req.query;

  // Build query for archived products
  let query = { status: "archived" };

  // For vendors, only show their products
  if (req.user.role === "vendor") {
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (vendor) {
      query.vendorId = vendor._id;
    } else {
      // If vendor profile doesn't exist, return empty results
      query.vendorId = new mongoose.Types.ObjectId();
    }
  }

  // Search functionality
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { category: { $regex: search, $options: "i" } },
    ];
  }

  // Filter by category
  if (category) {
    query.category = { $regex: category, $options: "i" };
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Execute query
  const products = await Product.find(query)
    .populate("vendor", "businessName vendorPrefix")
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count
  const total = await Product.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

// @desc    Update product stock
// @route   PATCH /api/v1/products/:id/stock
// @access  Private
export const updateProductStock = asyncHandler(async (req, res, next) => {
  const { stock, operation = "set" } = req.body;

  const product = await Product.findById(req.params.id).populate(
    "vendorId",
    "businessName vendorPrefix userId name"
  );

  if (!product) {
    return res.status(404).json({
      success: false,
      error: {
        message: "Product not found",
      },
    });
  }

  // Check authorization for vendors
  if (req.user.role === "vendor") {
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor || product.vendorId._id.toString() !== vendor._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          message: "Not authorized to update this product",
        },
      });
    }
  }

  // Store previous stock for notification logic
  const previousStock = product.stock;

  // Update stock based on operation
  switch (operation) {
    case "add":
      await product.increaseStock(stock);
      break;
    case "subtract":
      await product.reduceStock(stock);
      break;
    case "set":
    default:
      product.stock = stock;
      if (product.stock === 0) {
        product.status = "out_of_stock";
      } else if (product.status === "out_of_stock") {
        product.status = "active";
      }
      await product.save();
      break;
  }

  // Check if low stock notification should be triggered
  if (shouldTriggerLowStockNotification(product, previousStock)) {
    try {
      await triggerLowStockNotification(product, product.vendorId);
    } catch (notificationError) {
      console.error(
        "Failed to send low stock notification:",
        notificationError
      );
      // Don't fail the stock update if notification fails
    }
  }

  res.status(200).json({
    success: true,
    data: {
      product,
    },
    message: "Product stock updated successfully",
  });
});

// @desc    Get product categories
// @route   GET /api/v1/products/categories
// @access  Private
export const getProductCategories = asyncHandler(async (req, res, next) => {
  let query = {};

  // For vendors, only get categories from their products
  if (req.user.role === "vendor") {
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (vendor) {
      query.vendorId = vendor._id;
    } else {
      // If vendor profile doesn't exist, return empty results
      query.vendorId = new mongoose.Types.ObjectId();
    }
  }

  const categories = await Product.distinct("category", query);

  res.status(200).json({
    success: true,
    data: {
      categories: categories.sort(),
    },
  });
});

// @desc    Search products
// @route   GET /api/v1/products/search
// @access  Private
export const searchProducts = asyncHandler(async (req, res, next) => {
  const { q: searchTerm, category, vendorId, limit = 10 } = req.query;

  if (!searchTerm) {
    return res.status(400).json({
      success: false,
      error: {
        message: "Search term is required",
      },
    });
  }

  const options = {};
  if (category) options.category = category;
  if (vendorId) options.vendorId = vendorId;

  const products = await Product.search(searchTerm, options)
    .populate("vendor", "businessName vendorPrefix")
    .limit(parseInt(limit));

  res.status(200).json({
    success: true,
    data: {
      products,
      count: products.length,
    },
  });
});

// @desc    Get low stock products
// @route   GET /api/v1/products/low-stock
// @access  Private
export const getLowStockProducts = asyncHandler(async (req, res, next) => {
  let query = {};

  // For vendors, only show their products
  if (req.user.role === "vendor") {
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (vendor) {
      query.vendorId = vendor._id;
    } else {
      // If vendor profile doesn't exist, return empty results
      query.vendorId = new mongoose.Types.ObjectId();
    }
  }

  // Find products where stock is less than or equal to the low stock threshold
  // Use aggregation to compare stock with inventory.lowStockThreshold
  const lowStockProducts = await Product.aggregate([
    { $match: query },
    {
      $match: {
        $expr: {
          $and: [
            { $gt: ["$stock", 0] }, // Stock is greater than 0 (not out of stock)
            {
              $lte: [
                "$stock",
                {
                  $ifNull: ["$inventory.lowStockThreshold", 10], // Default to 10 if no threshold set
                },
              ],
            },
          ],
        },
      },
    },
    {
      $lookup: {
        from: "vendors",
        localField: "vendorId",
        foreignField: "_id",
        as: "vendor",
      },
    },
    {
      $unwind: "$vendor",
    },
    {
      $project: {
        name: 1,
        stock: 1,
        category: 1,
        price: 1,
        lowStockThreshold: "$inventory.lowStockThreshold",
        vendor: {
          businessName: "$vendor.businessName",
        },
        createdAt: 1,
      },
    },
    { $sort: { stock: 1 } }, // Sort by stock ascending (lowest first)
  ]);

  res.status(200).json({
    success: true,
    data: {
      products: lowStockProducts,
      count: lowStockProducts.length,
    },
  });
});
