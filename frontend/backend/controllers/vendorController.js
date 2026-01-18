import { asyncHandler } from "../middleware/errorHandler.js";
import User from "../models/User.js";
import Vendor from "../models/Vendor.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import {
  triggerVendorStatusChangeNotification,
  triggerCommissionUpdateNotification,
  triggerSystemAlert,
} from "../utils/notificationTriggers.js";

// @desc    Get all vendors
// @route   GET /api/v1/vendors
// @access  Private (Super Admin only)
export const getVendors = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    search,
    businessName,
    email,
    status,
    sort = "-createdAt",
  } = req.query;

  // Build query
  let query = {};

  if (search) {
    query.$or = [
      { businessName: { $regex: search, $options: "i" } },
      { "businessDetails.description": { $regex: search, $options: "i" } },
    ];
  }

  if (businessName) {
    query.businessName = { $regex: businessName, $options: "i" };
  }

  // Filter by status if provided
  if (status && status !== "all") {
    query.status = status;
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Execute query with population
  const vendors = await Vendor.find(query)
    .populate("user", "name email role createdAt lastLogin")
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count for pagination
  const total = await Vendor.countDocuments(query);

  // Get statistics for each vendor
  const vendorsWithStats = await Promise.all(
    vendors.map(async (vendor) => {
      const stats = await vendor.getStats();
      return {
        ...vendor.toObject(),
        stats,
      };
    })
  );

  res.status(200).json({
    success: true,
    data: {
      vendors: vendorsWithStats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

// @desc    Get single vendor
// @route   GET /api/v1/vendors/:id
// @access  Private
export const getVendor = asyncHandler(async (req, res, next) => {
  const vendor = await Vendor.findById(req.params.id).populate(
    "user",
    "name email role createdAt lastLogin"
  );

  if (!vendor) {
    return res.status(404).json({
      success: false,
      error: {
        message: "Vendor not found",
      },
    });
  }

  // Get vendor statistics
  const stats = await vendor.getStats();

  res.status(200).json({
    success: true,
    data: {
      vendor: {
        ...vendor.toObject(),
        stats,
      },
    },
  });
});

// @desc    Create vendor
// @route   POST /api/v1/vendors
// @access  Private (Super Admin only)
export const createVendor = asyncHandler(async (req, res, next) => {
  const {
    name,
    email,
    businessName,
    phone,
    address,
    businessDetails,
    password,
  } = req.body;

  // Check if user with email already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      error: {
        message: "User with this email already exists",
      },
    });
  }

  // Create user account
  const user = await User.create({
    name,
    email,
    password: password || "defaultPassword123",
    role: "vendor",
  });

  // Create vendor profile
  const vendorData = {
    userId: user._id,
    businessName,
    phone,
    status: "active",
  };

  if (address) {
    vendorData.address =
      typeof address === "string" ? { full: address } : address;
  }

  if (businessDetails) {
    vendorData.businessDetails = businessDetails;
  }

  const vendor = await Vendor.create(vendorData);

  // Populate user data
  await vendor.populate("user", "name email role createdAt");

  res.status(201).json({
    success: true,
    data: {
      vendor: vendor.toObject(),
    },
    message: "Vendor created successfully",
  });
});

// @desc    Update vendor
// @route   PUT /api/v1/vendors/:id
// @access  Private
export const updateVendor = asyncHandler(async (req, res, next) => {
  const {
    name,
    email,
    businessName,
    phone,
    address,
    businessDetails,
    commissionRate,
    status,
  } = req.body;

  let vendor = await Vendor.findById(req.params.id);
  if (!vendor) {
    return res.status(404).json({
      success: false,
      error: {
        message: "Vendor not found",
      },
    });
  }

  // Check authorization (vendors can only update their own profile)
  if (
    req.user.role === "vendor" &&
    vendor.userId.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({
      success: false,
      error: {
        message: "Not authorized to update this vendor",
      },
    });
  }

  // Update user information if provided
  if (name || email) {
    const user = await User.findById(vendor.userId);
    if (name) user.name = name;
    if (email) {
      // Check if email is already taken by another user
      const existingUser = await User.findOne({
        email,
        _id: { $ne: user._id },
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: {
            message: "Email is already taken",
          },
        });
      }
      user.email = email;
    }
    await user.save();
  }

  // Store previous values for notification logic
  const previousStatus = vendor.status;
  const previousCommissionRate = vendor.commissionRate;

  // Update vendor information
  const updateData = {};
  if (businessName) updateData.businessName = businessName;
  if (phone) updateData.phone = phone;
  if (address) {
    updateData.address =
      typeof address === "string" ? { full: address } : address;
  }

  // Update status if provided (super admin only)
  if (status !== undefined) {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({
        success: false,
        error: {
          message: "Only super admin can update vendor status",
        },
      });
    }

    // Validate status
    const validStatuses = ["active", "inactive", "suspended", "pending"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Status must be one of: ${validStatuses.join(", ")}`,
        },
      });
    }

    updateData.status = status;
  }

  // Update business details if provided
  if (businessDetails) {
    updateData.businessDetails = {
      ...vendor.businessDetails,
      ...businessDetails,
    };
  }

  // Update commission rate if provided (super admin only)
  if (commissionRate !== undefined) {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({
        success: false,
        error: {
          message: "Only super admin can update commission rates",
        },
      });
    }

    // Validate commission rate
    if (
      typeof commissionRate !== "number" ||
      commissionRate < 0 ||
      commissionRate > 1
    ) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Commission rate must be a number between 0 and 1",
        },
      });
    }

    updateData.commissionRate = commissionRate;
  }

  vendor = await Vendor.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  }).populate("userId", "name email role createdAt");

  // Trigger status change notification if status was updated
  if (status !== undefined && status !== previousStatus) {
    try {
      await triggerVendorStatusChangeNotification(vendor, {
        previousStatus,
        newStatus: status,
        changedBy: req.user.name || req.user.email,
        reason: req.body.statusReason || "Status updated by administrator",
      });
    } catch (notificationError) {
      console.error(
        "Failed to send vendor status change notification:",
        notificationError
      );
      // Don't fail the vendor update if notification fails
    }
  }

  // Trigger commission rate change notification if commission rate was updated
  if (
    commissionRate !== undefined &&
    commissionRate !== previousCommissionRate
  ) {
    try {
      await triggerCommissionUpdateNotification(vendor, {
        previousRate: previousCommissionRate,
        newRate: commissionRate,
        updatedBy: req.user.name || req.user.email,
        updateReason:
          req.body.commissionReason ||
          "Commission rate updated by administrator",
      });
    } catch (notificationError) {
      console.error(
        "Failed to send commission rate change notification:",
        notificationError
      );
      // Don't fail the vendor update if notification fails
    }
  }

  res.status(200).json({
    success: true,
    data: {
      vendor: vendor.toObject(),
    },
    message: "Vendor updated successfully",
  });
});

// @desc    Delete vendor
// @route   DELETE /api/v1/vendors/:id
// @access  Private (Super Admin only)
export const deleteVendor = asyncHandler(async (req, res, next) => {
  const vendor = await Vendor.findById(req.params.id);

  if (!vendor) {
    return res.status(404).json({
      success: false,
      error: {
        message: "Vendor not found",
      },
    });
  }

  // Delete associated user account
  await User.findByIdAndDelete(vendor.userId);

  // Delete vendor (this will trigger pre-remove middleware to clean up products and orders)
  await vendor.deleteOne();

  // Trigger system alert for vendor deletion
  try {
    await triggerSystemAlert(
      "Vendor Account Deleted",
      `Vendor account "${
        vendor.businessName || vendor.name
      }" has been permanently deleted by ${req.user.name || req.user.email}.`,
      {
        vendorId: vendor._id,
        vendorName: vendor.businessName || vendor.name,
        deletedBy: req.user.name || req.user.email,
        deletedAt: new Date().toISOString(),
        actionUrl: "/admin/vendors",
      }
    );
  } catch (notificationError) {
    console.error(
      "Failed to send vendor deletion system alert:",
      notificationError
    );
    // Don't fail the deletion if notification fails
  }

  res.status(200).json({
    success: true,
    message: "Vendor deleted successfully",
  });
});

// @desc    Update vendor settings
// @route   PATCH /api/v1/vendors/:id/settings
// @access  Private
export const updateVendorSettings = asyncHandler(async (req, res, next) => {
  const vendor = await Vendor.findById(req.params.id);

  if (!vendor) {
    return res.status(404).json({
      success: false,
      error: {
        message: "Vendor not found",
      },
    });
  }

  // Check authorization (vendors can only update their own settings)
  if (
    req.user.role === "vendor" &&
    vendor.userId.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({
      success: false,
      error: {
        message: "Not authorized to update this vendor's settings",
      },
    });
  }

  const { notifications, preferences, inventory } = req.body;

  // Update settings
  const updateData = {};
  if (notifications) {
    updateData["settings.notifications"] = {
      ...vendor.settings.notifications,
      ...notifications,
    };
  }
  if (preferences) {
    updateData["settings.preferences"] = {
      ...vendor.settings.preferences,
      ...preferences,
    };
  }
  if (inventory) {
    // Validate inventory settings
    if (inventory.defaultLowStockThreshold !== undefined) {
      const threshold = parseInt(inventory.defaultLowStockThreshold);
      if (isNaN(threshold) || threshold < 0 || threshold > 1000) {
        return res.status(400).json({
          success: false,
          error: {
            message:
              "Default low stock threshold must be a number between 0 and 1000",
          },
        });
      }
      inventory.defaultLowStockThreshold = threshold;
    }

    updateData["settings.inventory"] = {
      ...vendor.settings.inventory,
      ...inventory,
    };
  }

  const updatedVendor = await Vendor.findByIdAndUpdate(
    req.params.id,
    updateData,
    {
      new: true,
      runValidators: true,
    }
  ).populate("userId", "name email role createdAt");

  res.status(200).json({
    success: true,
    data: {
      vendor: updatedVendor,
    },
    message: "Vendor settings updated successfully",
  });
});

// @desc    Get vendor settings
// @route   GET /api/v1/vendors/:id/settings
// @access  Private
export const getVendorSettings = asyncHandler(async (req, res, next) => {
  const vendor = await Vendor.findById(req.params.id);

  if (!vendor) {
    return res.status(404).json({
      success: false,
      error: {
        message: "Vendor not found",
      },
    });
  }

  // Check authorization (vendors can only view their own settings)
  if (
    req.user.role === "vendor" &&
    vendor.userId.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({
      success: false,
      error: {
        message: "Not authorized to view this vendor's settings",
      },
    });
  }

  res.status(200).json({
    success: true,
    data: {
      settings: vendor.settings,
    },
  });
});

// @desc    Get vendor statistics
// @route   GET /api/v1/vendors/:id/stats
// @access  Private
export const getVendorStats = asyncHandler(async (req, res, next) => {
  const vendor = await Vendor.findById(req.params.id);

  if (!vendor) {
    return res.status(404).json({
      success: false,
      error: {
        message: "Vendor not found",
      },
    });
  }

  // Check authorization
  if (
    req.user.role === "vendor" &&
    vendor.userId.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({
      success: false,
      error: {
        message: "Not authorized to view this vendor's statistics",
      },
    });
  }

  const stats = await vendor.getStats();

  // Get additional statistics
  const [recentOrders, topProducts, monthlyStats] = await Promise.all([
    Order.find({ vendorId: vendor._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("orderNumber customer orderTotal status createdAt"),

    Product.find({ vendorId: vendor._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name price stock category"),

    Order.aggregate([
      { $match: { vendorId: vendor._id } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$orderTotal" },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 12 },
    ]),
  ]);

  res.status(200).json({
    success: true,
    data: {
      stats: {
        ...stats,
        recentOrders,
        topProducts,
        monthlyStats,
      },
    },
  });
});

// Get vendor invoice prefix
export const getVendorInvoicePrefix = asyncHandler(async (req, res, next) => {
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) {
    return res.status(404).json({
      success: false,
      error: { message: "Vendor not found" },
    });
  }
  // Only superadmin or the vendor themselves can view
  if (
    req.user.role !== "superadmin" &&
    vendor.userId.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({
      success: false,
      error: { message: "Not authorized to view this vendor's prefix" },
    });
  }
  res.status(200).json({
    success: true,
    data: { vendorPrefix: vendor.vendorPrefix },
  });
});

// Set vendor invoice prefix (superadmin only)
export const setVendorInvoicePrefix = asyncHandler(async (req, res, next) => {
  if (req.user.role !== "superadmin") {
    return res.status(403).json({
      success: false,
      error: { message: "Only superadmin can set invoice prefix" },
    });
  }
  const { prefix } = req.body;
  if (
    !prefix ||
    typeof prefix !== "string" ||
    !/^[A-Za-z0-9\-]{1,10}$/.test(prefix)
  ) {
    return res.status(400).json({
      success: false,
      error: { message: "Invalid prefix. Must be alphanumeric, max 10 chars." },
    });
  }
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) {
    return res.status(404).json({
      success: false,
      error: { message: "Vendor not found" },
    });
  }
  vendor.vendorPrefix = prefix;
  await vendor.save();
  res.status(200).json({
    success: true,
    data: { vendorPrefix: vendor.vendorPrefix },
    message: "Vendor prefix updated successfully",
  });
});

// @desc    Get current user's vendor profile
// @route   GET /api/v1/vendors/profile
// @access  Private (Vendor only)
export const getVendorProfile = asyncHandler(async (req, res, next) => {
  if (req.user.role !== "vendor") {
    return res.status(403).json({
      success: false,
      error: { message: "Only vendors can access this endpoint" },
    });
  }

  const vendor = await Vendor.findOne({ userId: req.user._id }).populate(
    "user",
    "name email role createdAt lastLogin"
  );

  if (!vendor) {
    return res.status(404).json({
      success: false,
      error: { message: "Vendor profile not found" },
    });
  }

  res.status(200).json({
    success: true,
    data: {
      vendor: vendor.toObject(),
    },
  });
});
