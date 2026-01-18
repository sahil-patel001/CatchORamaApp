import { asyncHandler } from "../middleware/errorHandler.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import Vendor from "../models/Vendor.js";

// @desc    Get all notifications for the authenticated user
// @route   GET /api/v1/notifications
// @access  Private
export const getNotifications = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 20,
    type,
    category,
    isRead,
    priority,
    sortBy = "createdAt",
    sortOrder = "desc",
    search,
    startDate,
    endDate,
  } = req.query;

  // Validate and parse pagination parameters
  const parsedPage = Math.max(1, parseInt(page));
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit))); // Max 100 per page

  // Use the static method from the model for pagination
  const options = {
    page: parsedPage,
    limit: parsedLimit,
    type,
    category,
    isRead, // Already transformed by validation middleware
    priority,
    sortBy,
    sortOrder: sortOrder === "asc" ? 1 : -1,
    search,
    startDate,
    endDate,
  };

  const result = await Notification.findWithPagination(req.user._id, options);

  // Add summary information to the response
  const summary = {
    total: result.pagination.total,
    unread: await Notification.getUnreadCount(req.user._id),
    filtered: result.notifications.length,
  };

  res.status(200).json({
    success: true,
    data: {
      notifications: result.notifications,
      pagination: result.pagination,
      summary,
      filters: {
        applied: {
          type,
          category,
          isRead, // Already transformed by validation middleware
          priority,
          search,
          startDate,
          endDate,
        },
        available: {
          types: [
            "low_stock",
            "new_order",
            "order_status_update",
            "product_approved",
            "product_rejected",
            "commission_payment",
            "system_maintenance",
            "account_update",
            "cubic_volume_alert",
            "general",
          ],
          categories: ["product", "order", "system", "account", "commission"],
          priorities: ["low", "medium", "high", "urgent"],
          sortOptions: ["createdAt", "updatedAt", "title", "priority", "type"],
        },
      },
    },
  });
});

// @desc    Get unread notifications for the authenticated user
// @route   GET /api/v1/notifications/unread
// @access  Private
export const getUnreadNotifications = asyncHandler(async (req, res, next) => {
  const { limit = 5 } = req.query;

  const notifications = await Notification.findUnreadByUser(
    req.user._id,
    parseInt(limit)
  );

  const unreadCount = await Notification.getUnreadCount(req.user._id);

  res.status(200).json({
    success: true,
    data: {
      notifications,
      unreadCount,
    },
  });
});

// @desc    Get notification by ID
// @route   GET /api/v1/notifications/:id
// @access  Private
export const getNotification = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    userId: req.user._id,
  }).populate("user", "name email");

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: "Notification not found",
    });
  }

  // Check if notification is expired
  if (notification.isExpired()) {
    return res.status(410).json({
      success: false,
      message: "Notification has expired",
    });
  }

  res.status(200).json({
    success: true,
    data: notification,
  });
});

// @desc    Create a new notification
// @route   POST /api/v1/notifications
// @access  Private (Admin only or system use)
export const createNotification = asyncHandler(async (req, res, next) => {
  const {
    userId,
    type,
    title,
    message,
    metadata = {},
    priority = "medium",
    category,
    actionUrl,
    expiresAt,
  } = req.body;

  // Validate required fields
  if (!userId || !type || !title || !message || !category) {
    return res.status(400).json({
      success: false,
      message:
        "Missing required fields: userId, type, title, message, category",
    });
  }

  // Verify the target user exists
  const targetUser = await User.findById(userId);
  if (!targetUser) {
    return res.status(404).json({
      success: false,
      message: "Target user not found",
    });
  }

  // Only allow admins to create notifications for other users
  if (req.user.role !== "superadmin" && userId !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message:
        "Insufficient permissions to create notification for other users",
    });
  }

  try {
    const notification = await Notification.createNotification({
      userId,
      type,
      title,
      message,
      metadata,
      priority,
      category,
      actionUrl,
      expiresAt,
    });

    // Populate user data for response
    await notification.populate("user", "name email");

    res.status(201).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// @desc    Mark notification as read
// @route   PATCH /api/v1/notifications/:id/read
// @access  Private
export const markNotificationAsRead = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: "Notification not found",
    });
  }

  // Check if notification is expired
  if (notification.isExpired()) {
    return res.status(410).json({
      success: false,
      message: "Notification has expired",
    });
  }

  // Mark as read if not already
  if (!notification.isRead) {
    await notification.markAsRead();
  }

  res.status(200).json({
    success: true,
    data: notification,
  });
});

// @desc    Mark notification as unread
// @route   PATCH /api/v1/notifications/:id/unread
// @access  Private
export const markNotificationAsUnread = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: "Notification not found",
    });
  }

  // Check if notification is expired
  if (notification.isExpired()) {
    return res.status(410).json({
      success: false,
      message: "Notification has expired",
    });
  }

  // Mark as unread if not already
  if (notification.isRead) {
    notification.isRead = false;
    notification.readAt = null;
    await notification.save();
  }

  res.status(200).json({
    success: true,
    data: notification,
  });
});

// @desc    Mark all notifications as read for user
// @route   PATCH /api/v1/notifications/mark-all-read
// @access  Private
export const markAllNotificationsAsRead = asyncHandler(
  async (req, res, next) => {
    const result = await Notification.markAllAsReadForUser(req.user._id);

    res.status(200).json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount,
        message: `${result.modifiedCount} notifications marked as read`,
      },
    });
  }
);

// @desc    Update notification
// @route   PUT /api/v1/notifications/:id
// @access  Private (Admin only or owner)
export const updateNotification = asyncHandler(async (req, res, next) => {
  const { title, message, metadata, priority, actionUrl, expiresAt } = req.body;

  const notification = await Notification.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: "Notification not found",
    });
  }

  // Check if notification is expired
  if (notification.isExpired()) {
    return res.status(410).json({
      success: false,
      message: "Notification has expired and cannot be updated",
    });
  }

  // Only allow admins to update system notifications
  if (
    req.user.role !== "superadmin" &&
    ["system_maintenance", "general"].includes(notification.type)
  ) {
    return res.status(403).json({
      success: false,
      message: "Insufficient permissions to update system notifications",
    });
  }

  // Update allowed fields
  if (title) notification.title = title;
  if (message) notification.message = message;
  if (metadata)
    notification.metadata = { ...notification.metadata, ...metadata };
  if (priority) notification.priority = priority;
  if (actionUrl !== undefined) notification.actionUrl = actionUrl;
  if (expiresAt !== undefined) notification.expiresAt = expiresAt;

  await notification.save();

  res.status(200).json({
    success: true,
    data: notification,
  });
});

// @desc    Delete notification
// @route   DELETE /api/v1/notifications/:id
// @access  Private (Admin only or owner)
export const deleteNotification = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: "Notification not found",
    });
  }

  // Only allow admins to delete system notifications
  if (
    req.user.role !== "superadmin" &&
    ["system_maintenance", "general"].includes(notification.type)
  ) {
    return res.status(403).json({
      success: false,
      message: "Insufficient permissions to delete system notifications",
    });
  }

  await notification.deleteOne();

  res.status(200).json({
    success: true,
    data: {
      message: "Notification deleted successfully",
    },
  });
});

// @desc    Get notification statistics for user
// @route   GET /api/v1/notifications/stats
// @access  Private
export const getNotificationStats = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  // Get counts by status
  const [totalCount, unreadCount, readCount] = await Promise.all([
    Notification.countDocuments({
      userId,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gte: new Date() } },
      ],
    }),
    Notification.getUnreadCount(userId),
    Notification.countDocuments({
      userId,
      isRead: true,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gte: new Date() } },
      ],
    }),
  ]);

  // Get counts by type
  const typeStats = await Notification.aggregate([
    {
      $match: {
        userId: userId,
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gte: new Date() } },
        ],
      },
    },
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
        unreadCount: {
          $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] },
        },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);

  // Get counts by priority
  const priorityStats = await Notification.aggregate([
    {
      $match: {
        userId: userId,
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gte: new Date() } },
        ],
      },
    },
    {
      $group: {
        _id: "$priority",
        count: { $sum: 1 },
        unreadCount: {
          $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] },
        },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      summary: {
        total: totalCount,
        unread: unreadCount,
        read: readCount,
      },
      byType: typeStats,
      byPriority: priorityStats,
    },
  });
});

// @desc    Bulk operations on notifications
// @route   POST /api/v1/notifications/bulk
// @access  Private
export const bulkNotificationOperations = asyncHandler(
  async (req, res, next) => {
    const { action, notificationIds, filters } = req.body;

    if (!action) {
      return res.status(400).json({
        success: false,
        message: "Action is required",
      });
    }

    let query = { userId: req.user._id };

    // Build query based on provided filters or IDs
    if (notificationIds && notificationIds.length > 0) {
      query._id = { $in: notificationIds };
    } else if (filters) {
      if (filters.type) query.type = filters.type;
      if (filters.category) query.category = filters.category;
      if (filters.priority) query.priority = filters.priority;
      if (typeof filters.isRead === "boolean") query.isRead = filters.isRead;
    }

    let result;

    switch (action) {
      case "mark_read":
        result = await Notification.updateMany(
          { ...query, isRead: false },
          { isRead: true }
        );
        break;

      case "mark_unread":
        result = await Notification.updateMany(
          { ...query, isRead: true },
          { isRead: false }
        );
        break;

      case "delete":
        // Only allow deletion of non-system notifications
        query.type = { $nin: ["system_maintenance", "general"] };
        result = await Notification.deleteMany(query);
        break;

      default:
        return res.status(400).json({
          success: false,
          message:
            "Invalid action. Supported actions: mark_read, mark_unread, delete",
        });
    }

    res.status(200).json({
      success: true,
      data: {
        action,
        modifiedCount: result.modifiedCount || result.deletedCount || 0,
        message: `Bulk ${action} completed successfully`,
      },
    });
  }
);

// @desc    Clean up expired notifications (Admin only)
// @route   DELETE /api/v1/notifications/cleanup
// @access  Private (Super Admin only)
export const cleanupExpiredNotifications = asyncHandler(
  async (req, res, next) => {
    // Only allow super admin to perform cleanup
    if (req.user.role !== "superadmin") {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions. Super admin access required.",
      });
    }

    const result = await Notification.cleanupExpired();

    res.status(200).json({
      success: true,
      data: {
        deletedCount: result.deletedCount,
        message: `${result.deletedCount} expired notifications cleaned up`,
      },
    });
  }
);
