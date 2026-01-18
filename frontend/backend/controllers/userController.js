import { asyncHandler } from "../middleware/errorHandler.js";
import User from "../models/User.js";
import Vendor from "../models/Vendor.js";
import { triggerSystemAlert } from "../utils/notificationTriggers.js";

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private (Super Admin only)
export const getUsers = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, search, role, sort = "-createdAt" } = req.query;

  // Build query
  let query = { isActive: true };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  if (role) {
    query.role = role;
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Execute query
  const users = await User.find(query)
    .populate("vendor", "businessName")
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count for pagination
  const total = await User.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

// @desc    Get single user
// @route   GET /api/v1/users/:id
// @access  Private
export const getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id).populate(
    "vendor",
    "businessName phone address"
  );

  if (!user) {
    return res.status(404).json({
      success: false,
      error: {
        message: "User not found",
      },
    });
  }

  // Check authorization (users can only view their own profile unless they're super admin)
  if (
    req.user.role !== "superadmin" &&
    req.user._id.toString() !== user._id.toString()
  ) {
    return res.status(403).json({
      success: false,
      error: {
        message: "Not authorized to view this user",
      },
    });
  }

  res.status(200).json({
    success: true,
    data: {
      user,
    },
  });
});

// @desc    Update user
// @route   PUT /api/v1/users/:id
// @access  Private
export const updateUser = asyncHandler(async (req, res, next) => {
  const { name, email, role } = req.body;

  let user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: {
        message: "User not found",
      },
    });
  }

  // Check authorization
  if (
    req.user.role !== "superadmin" &&
    req.user._id.toString() !== user._id.toString()
  ) {
    return res.status(403).json({
      success: false,
      error: {
        message: "Not authorized to update this user",
      },
    });
  }

  // Only super admin can change roles
  if (role && req.user.role !== "superadmin") {
    return res.status(403).json({
      success: false,
      error: {
        message: "Not authorized to change user role",
      },
    });
  }

  // Check if email is already taken by another user
  if (email && email !== user.email) {
    const existingUser = await User.findOne({ email, _id: { $ne: user._id } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Email is already taken",
        },
      });
    }
  }

  // Store previous role for notification logic
  const previousRole = user.role;

  // Update user
  const updateData = {};
  if (name) updateData.name = name;
  if (email) updateData.email = email;
  if (role && req.user.role === "superadmin") updateData.role = role;

  user = await User.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  }).populate("vendor", "businessName phone address");

  // Trigger system alert for role changes
  if (role && role !== previousRole && req.user.role === "superadmin") {
    try {
      await triggerSystemAlert(
        "User Role Changed",
        `User "${user.name}" (${
          user.email
        }) role has been changed from "${previousRole}" to "${role}" by ${
          req.user.name || req.user.email
        }.`,
        {
          userId: user._id,
          userName: user.name,
          userEmail: user.email,
          previousRole,
          newRole: role,
          changedBy: req.user.name || req.user.email,
          changedAt: new Date().toISOString(),
          actionUrl: `/admin/users/${user._id}`,
        }
      );
    } catch (notificationError) {
      console.error(
        "Failed to send user role change system alert:",
        notificationError
      );
      // Don't fail the user update if notification fails
    }
  }

  res.status(200).json({
    success: true,
    data: {
      user,
    },
    message: "User updated successfully",
  });
});

// @desc    Delete user
// @route   DELETE /api/v1/users/:id
// @access  Private (Super Admin only)
export const deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: {
        message: "User not found",
      },
    });
  }

  // Prevent super admin from deleting themselves
  if (user._id.toString() === req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      error: {
        message: "Cannot delete your own account",
      },
    });
  }

  // Soft delete - mark as inactive instead of actually deleting
  user.isActive = false;
  await user.save();

  // Trigger system alert for user deactivation
  try {
    await triggerSystemAlert(
      "User Account Deactivated",
      `User account "${user.name}" (${user.email}) has been deactivated by ${
        req.user.name || req.user.email
      }.`,
      {
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        userRole: user.role,
        deactivatedBy: req.user.name || req.user.email,
        deactivatedAt: new Date().toISOString(),
        actionUrl: `/admin/users/${user._id}`,
      }
    );
  } catch (notificationError) {
    console.error(
      "Failed to send user deactivation system alert:",
      notificationError
    );
    // Don't fail the user deactivation if notification fails
  }

  res.status(200).json({
    success: true,
    message: "User deactivated successfully",
  });
});

// @desc    Activate user
// @route   PATCH /api/v1/users/:id/activate
// @access  Private (Super Admin only)
export const activateUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: {
        message: "User not found",
      },
    });
  }

  user.isActive = true;
  await user.save();

  res.status(200).json({
    success: true,
    data: {
      user,
    },
    message: "User activated successfully",
  });
});

// @desc    Get user profile
// @route   GET /api/v1/users/profile
// @access  Private
export const getProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id).populate(
    "vendor",
    "businessName phone address businessDetails settings"
  );

  res.status(200).json({
    success: true,
    data: {
      user,
    },
  });
});

// @desc    Update user profile
// @route   PUT /api/v1/users/profile
// @access  Private
export const updateProfile = asyncHandler(async (req, res, next) => {
  const { name, email } = req.body;

  // Check if email is already taken by another user
  if (email && email !== req.user.email) {
    const existingUser = await User.findOne({
      email,
      _id: { $ne: req.user._id },
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Email is already taken",
        },
      });
    }
  }

  // Update user
  const updateData = {};
  if (name) updateData.name = name;
  if (email) updateData.email = email;

  const user = await User.findByIdAndUpdate(req.user._id, updateData, {
    new: true,
    runValidators: true,
  }).populate("vendor", "businessName phone address businessDetails settings");

  res.status(200).json({
    success: true,
    data: {
      user,
    },
    message: "Profile updated successfully",
  });
});

// @desc    Update user notification preferences
// @route   PATCH /api/v1/users/:id/preferences
// @access  Private
export const updateUserNotificationPreferences = asyncHandler(
  async (req, res, next) => {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: "User not found",
        },
      });
    }

    // Check authorization (users can only update their own preferences unless super admin)
    if (
      req.user.role !== "superadmin" &&
      req.user._id.toString() !== user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        error: {
          message: "Not authorized to update this user's preferences",
        },
      });
    }

    const { email, push, lowStock, newOrder, systemAlerts, commissionUpdates } =
      req.body;

    // Update notification preferences
    const updateData = {};
    if (email !== undefined)
      updateData["notificationPreferences.email"] = email;
    if (push !== undefined) updateData["notificationPreferences.push"] = push;
    if (lowStock !== undefined)
      updateData["notificationPreferences.lowStock"] = lowStock;
    if (newOrder !== undefined)
      updateData["notificationPreferences.newOrder"] = newOrder;
    if (systemAlerts !== undefined)
      updateData["notificationPreferences.systemAlerts"] = systemAlerts;
    if (commissionUpdates !== undefined)
      updateData["notificationPreferences.commissionUpdates"] =
        commissionUpdates;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    ).select("notificationPreferences");

    res.status(200).json({
      success: true,
      data: {
        notificationPreferences: updatedUser.notificationPreferences,
      },
      message: "Notification preferences updated successfully",
    });
  }
);

// @desc    Get user notification preferences
// @route   GET /api/v1/users/:id/preferences
// @access  Private
export const getUserNotificationPreferences = asyncHandler(
  async (req, res, next) => {
    const user = await User.findById(req.params.id).select(
      "notificationPreferences"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: "User not found",
        },
      });
    }

    // Check authorization (users can only view their own preferences unless super admin)
    if (
      req.user.role !== "superadmin" &&
      req.user._id.toString() !== user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        error: {
          message: "Not authorized to view this user's preferences",
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        notificationPreferences: user.notificationPreferences,
      },
    });
  }
);

// @desc    Get user statistics
// @route   GET /api/v1/users/stats
// @access  Private (Super Admin only)
export const getUserStats = asyncHandler(async (req, res, next) => {
  const stats = await User.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: {
          $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] },
        },
        inactiveUsers: {
          $sum: { $cond: [{ $eq: ["$isActive", false] }, 1, 0] },
        },
        superAdmins: {
          $sum: { $cond: [{ $eq: ["$role", "superadmin"] }, 1, 0] },
        },
        vendors: {
          $sum: { $cond: [{ $eq: ["$role", "vendor"] }, 1, 0] },
        },
      },
    },
  ]);

  const userStats = stats[0] || {
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    superAdmins: 0,
    vendors: 0,
  };

  // Get recent registrations
  const recentUsers = await User.find({ isActive: true })
    .sort({ createdAt: -1 })
    .limit(10)
    .select("name email role createdAt");

  res.status(200).json({
    success: true,
    data: {
      stats: userStats,
      recentUsers,
    },
  });
});
