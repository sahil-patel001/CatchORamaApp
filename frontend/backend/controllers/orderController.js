import { asyncHandler } from "../middleware/errorHandler.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Vendor from "../models/Vendor.js";
import mongoose from "mongoose";
import { triggerNewOrderNotification } from "../utils/notificationTriggers.js";

// @desc    Get all orders
// @route   GET /api/v1/orders
// @access  Private
export const getOrders = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    search,
    status,
    customer,
    startDate,
    endDate,
    sort = "-createdAt",
  } = req.query;

  // Build query
  let query = {};

  // For vendors, only show their orders - optimize with lean query
  if (req.user.role === "vendor") {
    const vendor = await Vendor.findOne({ userId: req.user._id })
      .select("_id")
      .lean();
    if (vendor) {
      query.vendorId = vendor._id;
    } else {
      // If vendor profile doesn't exist, return empty results
      query.vendorId = new mongoose.Types.ObjectId();
    }
  }

  // Search functionality - optimize regex patterns
  if (search) {
    query.$or = [
      { orderNumber: { $regex: search, $options: "i" } },
      { "customer.name": { $regex: search, $options: "i" } },
      { "customer.email": { $regex: search, $options: "i" } },
    ];
  }

  // Filter by status
  if (status) {
    query.status = status;
  }

  // Filter by customer
  if (customer) {
    query["customer.name"] = { $regex: customer, $options: "i" };
  }

  // Date range filter
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Execute query and count in parallel for better performance
  const [orders, total] = await Promise.all([
    Order.find(query)
      .populate("vendor", "businessName")
      .populate("items.productId", "name category")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean(), // Use lean for better performance
    Order.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: {
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

// @desc    Get single order
// @route   GET /api/v1/orders/:id
// @access  Private
export const getOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
    .populate("vendor", "businessName phone address")
    .populate("items.productId", "name category price");

  if (!order) {
    return res.status(404).json({
      success: false,
      error: {
        message: "Order not found",
      },
    });
  }

  // Check authorization for vendors
  if (req.user.role === "vendor") {
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor || order.vendorId.toString() !== vendor._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          message: "Not authorized to view this order",
        },
      });
    }
  }

  res.status(200).json({
    success: true,
    data: {
      order,
    },
  });
});

// @desc    Create order
// @route   POST /api/v1/orders
// @access  Private
export const createOrder = asyncHandler(async (req, res, next) => {
  const { customer, customerEmail, items } = req.body;

  let vendorId;

  if (req.user.role === "vendor") {
    // For vendors, get their vendor ID
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

  // Validate and process order items
  const processedItems = [];
  let subtotal = 0;

  for (const item of items) {
    const product = await Product.findById(item.productId);

    if (!product) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Product with ID ${item.productId} not found`,
        },
      });
    }

    // Check if product belongs to the vendor (for vendor users)
    if (
      req.user.role === "vendor" &&
      product.vendorId.toString() !== vendorId.toString()
    ) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Product ${product.name} does not belong to your store`,
        },
      });
    }

    // Check stock availability
    if (!product.isInStock(item.quantity)) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Insufficient stock for product ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`,
        },
      });
    }

    const itemTotal = item.quantity * item.price;
    subtotal += itemTotal;

    processedItems.push({
      productId: product._id,
      name: product.name,
      quantity: item.quantity,
      price: item.price,
      total: itemTotal,
    });

    // Reduce product stock
    await product.reduceStock(item.quantity);
  }

  // Create order
  const orderData = {
    vendorId,
    customer: {
      name: customer,
      email: customerEmail,
    },
    items: processedItems,
    subtotal,
    orderTotal: subtotal, // Will be recalculated in pre-save middleware
    status: req.body.status || "pending",
  };

  const order = await Order.create(orderData);
  await order.populate([
    { path: "vendorId", select: "businessName vendorPrefix userId name" },
    { path: "items.productId", select: "name category" },
  ]);

  // Trigger new order notification
  try {
    await triggerNewOrderNotification(order, order.vendorId);
  } catch (notificationError) {
    console.error("Failed to send new order notification:", notificationError);
    // Don't fail the order creation if notification fails
  }

  res.status(201).json({
    success: true,
    data: {
      order,
    },
    message: "Order created successfully",
  });
});

// @desc    Update order
// @route   PUT /api/v1/orders/:id
// @access  Private
export const updateOrder = asyncHandler(async (req, res, next) => {
  let order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      error: {
        message: "Order not found",
      },
    });
  }

  // Check authorization for vendors
  if (req.user.role === "vendor") {
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor || order.vendorId.toString() !== vendor._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          message: "Not authorized to update this order",
        },
      });
    }
  }

  // Update order
  order = await Order.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate([
    { path: "vendor", select: "businessName" },
    { path: "items.productId", select: "name category" },
  ]);

  res.status(200).json({
    success: true,
    data: {
      order,
    },
    message: "Order updated successfully",
  });
});

// @desc    Update order status
// @route   PATCH /api/v1/orders/:id/status
// @access  Private
export const updateOrderStatus = asyncHandler(async (req, res, next) => {
  const { status, note } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      error: {
        message: "Order not found",
      },
    });
  }

  // Check authorization for vendors
  if (req.user.role === "vendor") {
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor || order.vendorId.toString() !== vendor._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          message: "Not authorized to update this order",
        },
      });
    }
  }

  // Update status
  await order.updateStatus(status, note, req.user._id);
  await order.populate([
    { path: "vendor", select: "businessName" },
    { path: "items.productId", select: "name category" },
  ]);

  res.status(200).json({
    success: true,
    data: {
      order,
    },
    message: "Order status updated successfully",
  });
});

// @desc    Add tracking information
// @route   PATCH /api/v1/orders/:id/tracking
// @access  Private
export const addTrackingInfo = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      error: {
        message: "Order not found",
      },
    });
  }

  // Check authorization for vendors
  if (req.user.role === "vendor") {
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor || order.vendorId.toString() !== vendor._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          message: "Not authorized to update this order",
        },
      });
    }
  }

  // Add tracking info
  await order.addTrackingInfo(req.body);
  await order.populate([
    { path: "vendor", select: "businessName" },
    { path: "items.productId", select: "name category" },
  ]);

  res.status(200).json({
    success: true,
    data: {
      order,
    },
    message: "Tracking information added successfully",
  });
});

// @desc    Delete order
// @route   DELETE /api/v1/orders/:id
// @access  Private
export const deleteOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      error: {
        message: "Order not found",
      },
    });
  }

  // Check authorization for vendors
  if (req.user.role === "vendor") {
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor || order.vendorId.toString() !== vendor._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          message: "Not authorized to delete this order",
        },
      });
    }
  }

  // Only allow deletion of pending or cancelled orders
  if (!["pending", "cancelled"].includes(order.status)) {
    return res.status(400).json({
      success: false,
      error: {
        message: "Only pending or cancelled orders can be deleted",
      },
    });
  }

  // Restore product stock if order is being deleted
  if (order.status === "pending") {
    for (const item of order.items) {
      const product = await Product.findById(item.productId);
      if (product) {
        await product.increaseStock(item.quantity);
      }
    }
  }

  await order.deleteOne();

  res.status(200).json({
    success: true,
    message: "Order deleted successfully",
  });
});
