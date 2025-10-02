import { NotificationUtils } from "../utils/notificationUtils.js";
import { notificationConfig } from "../config/notification.js";

/**
 * Notification Authentication and Authorization Middleware
 * Handles access control for notification-related operations
 */

/**
 * Check if user can access notifications
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const requireNotificationAccess = async (req, res, next) => {
  try {
    // Check if notification system is enabled
    if (!NotificationUtils.helper.isSystemEnabled()) {
      return res.status(503).json({
        error: "Notification system is currently disabled",
        code: "NOTIFICATION_SYSTEM_DISABLED",
      });
    }

    // Ensure user is authenticated (should be handled by auth middleware before this)
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required for notification access",
        code: "AUTHENTICATION_REQUIRED",
      });
    }

    // Add user info to request for downstream middleware
    req.notificationUser = {
      id: req.user._id.toString(),
      role: req.user.role || "vendor",
      email: req.user.email,
    };

    next();
  } catch (error) {
    console.error("Notification access check error:", error);
    res.status(500).json({
      error: "Internal server error during notification access check",
      code: "NOTIFICATION_ACCESS_ERROR",
    });
  }
};

/**
 * Check if user can create notifications (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const requireNotificationCreateAccess = (req, res, next) => {
  try {
    if (!req.notificationUser) {
      return res.status(401).json({
        error: "Notification access required",
        code: "NOTIFICATION_ACCESS_REQUIRED",
      });
    }

    // Only super admins can manually create notifications
    if (req.notificationUser.role !== "super_admin") {
      return res.status(403).json({
        error: "Insufficient permissions to create notifications",
        code: "INSUFFICIENT_PERMISSIONS",
        required: "super_admin",
        current: req.notificationUser.role,
      });
    }

    next();
  } catch (error) {
    console.error("Notification create access check error:", error);
    res.status(500).json({
      error: "Internal server error during notification create access check",
      code: "NOTIFICATION_CREATE_ACCESS_ERROR",
    });
  }
};

/**
 * Check if user can manage notifications (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const requireNotificationManageAccess = (req, res, next) => {
  try {
    if (!req.notificationUser) {
      return res.status(401).json({
        error: "Notification access required",
        code: "NOTIFICATION_ACCESS_REQUIRED",
      });
    }

    // Only super admins can manage all notifications
    if (req.notificationUser.role !== "super_admin") {
      return res.status(403).json({
        error: "Insufficient permissions to manage notifications",
        code: "INSUFFICIENT_PERMISSIONS",
        required: "super_admin",
        current: req.notificationUser.role,
      });
    }

    next();
  } catch (error) {
    console.error("Notification manage access check error:", error);
    res.status(500).json({
      error: "Internal server error during notification manage access check",
      code: "NOTIFICATION_MANAGE_ACCESS_ERROR",
    });
  }
};

/**
 * Check if user can access specific notification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const requireNotificationOwnership = async (req, res, next) => {
  try {
    if (!req.notificationUser) {
      return res.status(401).json({
        error: "Notification access required",
        code: "NOTIFICATION_ACCESS_REQUIRED",
      });
    }

    const notificationId = req.params.id || req.params.notificationId;

    if (!notificationId) {
      return res.status(400).json({
        error: "Notification ID is required",
        code: "NOTIFICATION_ID_REQUIRED",
      });
    }

    // Validate notification ID format
    const userIdValidation = NotificationUtils.validate.userId(notificationId);
    if (!userIdValidation.isValid) {
      return res.status(400).json({
        error: "Invalid notification ID format",
        code: "INVALID_NOTIFICATION_ID",
        details: userIdValidation.error,
      });
    }

    // Super admins can access any notification
    if (req.notificationUser.role === "super_admin") {
      req.notificationAccess = {
        canRead: true,
        canWrite: true,
        canDelete: true,
        reason: "admin_access",
      };
      return next();
    }

    // For other users, they can only access their own notifications
    // Note: This will be validated against the actual notification in the controller
    req.notificationAccess = {
      canRead: true,
      canWrite: true, // Can mark as read, etc.
      canDelete: true, // Can delete their own notifications
      reason: "owner_access",
      ownerId: req.notificationUser.id,
    };

    next();
  } catch (error) {
    console.error("Notification ownership check error:", error);
    res.status(500).json({
      error: "Internal server error during notification ownership check",
      code: "NOTIFICATION_OWNERSHIP_ERROR",
    });
  }
};

/**
 * Validate notification data in request body
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const validateNotificationData = (req, res, next) => {
  try {
    const notificationData = req.body;

    if (!notificationData || typeof notificationData !== "object") {
      return res.status(400).json({
        error: "Notification data is required",
        code: "NOTIFICATION_DATA_REQUIRED",
      });
    }

    // Sanitize input
    const sanitized = NotificationUtils.validate.sanitize(notificationData);

    // Validate notification
    const validation = NotificationUtils.validate.notification(sanitized);
    if (!validation.isValid) {
      return res.status(400).json({
        error: "Invalid notification data",
        code: "INVALID_NOTIFICATION_DATA",
        details: validation.error,
      });
    }

    // Add sanitized data to request
    req.validatedNotification = sanitized;

    next();
  } catch (error) {
    console.error("Notification data validation error:", error);
    res.status(500).json({
      error: "Internal server error during notification data validation",
      code: "NOTIFICATION_VALIDATION_ERROR",
    });
  }
};

/**
 * Validate notification query parameters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const validateNotificationQuery = (req, res, next) => {
  try {
    const query = req.query;

    // Validate query parameters
    const validation = NotificationUtils.validate.query(query);
    if (!validation.isValid) {
      return res.status(400).json({
        error: "Invalid query parameters",
        code: "INVALID_QUERY_PARAMETERS",
        details: validation.errors,
      });
    }

    // Process and build database query
    const filters = {
      userId: req.notificationUser?.id, // Always filter by current user unless admin
      type: query.type,
      unreadOnly: query.unreadOnly === "true",
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      priority: query.priority,
      category: query.category,
    };

    // Super admins can query all users' notifications
    if (req.notificationUser?.role === "super_admin" && query.userId) {
      filters.userId = query.userId;
    }

    const pagination = {
      page: parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 20,
      sortBy: query.sortBy || "createdAt",
      sortOrder: query.sortOrder || "desc",
    };

    const processed = NotificationUtils.helper.buildQuery(filters, pagination);

    req.notificationQuery = {
      filters,
      pagination,
      dbQuery: processed.query,
      dbOptions: processed.options,
    };

    next();
  } catch (error) {
    console.error("Notification query validation error:", error);
    res.status(500).json({
      error: "Internal server error during notification query validation",
      code: "NOTIFICATION_QUERY_VALIDATION_ERROR",
    });
  }
};

/**
 * Rate limiting for notification operations
 * @param {Object} options - Rate limiting options
 * @returns {Function} Express middleware
 */
export const rateLimit = (options = {}) => {
  const {
    windowMs = 60000, // 1 minute
    maxRequests = 100, // 100 requests per minute
    skipAdmins = true,
  } = options;

  const clients = new Map();

  return (req, res, next) => {
    try {
      // Skip rate limiting for admins if configured
      if (skipAdmins && req.notificationUser?.role === "super_admin") {
        return next();
      }

      const clientId = req.notificationUser?.id || req.ip;
      const now = Date.now();

      if (!clients.has(clientId)) {
        clients.set(clientId, { count: 1, resetTime: now + windowMs });
        return next();
      }

      const client = clients.get(clientId);

      // Reset counter if window has passed
      if (now > client.resetTime) {
        client.count = 1;
        client.resetTime = now + windowMs;
        return next();
      }

      // Check if limit exceeded
      if (client.count >= maxRequests) {
        return res.status(429).json({
          error: "Rate limit exceeded",
          code: "RATE_LIMIT_EXCEEDED",
          retryAfter: Math.ceil((client.resetTime - now) / 1000),
        });
      }

      client.count++;
      next();
    } catch (error) {
      console.error("Notification rate limiting error:", error);
      next(); // Continue on error to avoid blocking legitimate requests
    }
  };
};

/**
 * Check notification delivery eligibility
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const checkDeliveryEligibility = async (req, res, next) => {
  try {
    const { userId, type } = req.validatedNotification || {};

    if (!userId || !type) {
      return res.status(400).json({
        error: "User ID and notification type are required for delivery check",
        code: "DELIVERY_CHECK_MISSING_DATA",
      });
    }

    // Get user preferences (this would come from user settings in a real app)
    const userPreferences = req.userNotificationPreferences || {};

    // Check delivery eligibility
    const eligibility = NotificationUtils.checkDeliveryEligibility(
      userId,
      type,
      userPreferences
    );

    if (!eligibility.eligible) {
      return res.status(400).json({
        error: "Notification delivery not eligible",
        code: "DELIVERY_NOT_ELIGIBLE",
        reason: eligibility.reason || eligibility.error,
      });
    }

    // Add delivery info to request
    req.notificationDelivery = {
      channels: eligibility.channels,
      typeConfig: eligibility.typeConfig,
    };

    next();
  } catch (error) {
    console.error("Notification delivery eligibility check error:", error);
    res.status(500).json({
      error: "Internal server error during delivery eligibility check",
      code: "DELIVERY_ELIGIBILITY_ERROR",
    });
  }
};

/**
 * Log notification operations for auditing
 * @param {string} operation - Operation being performed
 * @returns {Function} Express middleware
 */
export const logNotificationOperation = (operation) => {
  return (req, res, next) => {
    try {
      const logData = {
        operation,
        userId: req.notificationUser?.id,
        userRole: req.notificationUser?.role,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date().toISOString(),
      };

      // Add operation-specific data
      switch (operation) {
        case "create":
          logData.notificationType = req.validatedNotification?.type;
          break;
        case "read":
        case "update":
        case "delete":
          logData.notificationId = req.params.id || req.params.notificationId;
          break;
        case "list":
          logData.queryParams = req.query;
          break;
      }

      console.log(
        `📝 Notification ${operation}:`,
        JSON.stringify(logData, null, 2)
      );

      // Store audit log (could be saved to database in production)
      req.notificationAuditLog = logData;

      next();
    } catch (error) {
      console.error("Notification operation logging error:", error);
      next(); // Continue on error to avoid blocking operations
    }
  };
};

/**
 * Handle notification errors consistently
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const handleNotificationError = (error, req, res, next) => {
  console.error("Notification middleware error:", error);

  // Don't handle if response already sent
  if (res.headersSent) {
    return next(error);
  }

  // Determine error type and response
  let statusCode = 500;
  let errorCode = "NOTIFICATION_ERROR";
  let message = "Internal server error";

  if (error.name === "ValidationError") {
    statusCode = 400;
    errorCode = "VALIDATION_ERROR";
    message = error.message;
  } else if (error.name === "CastError") {
    statusCode = 400;
    errorCode = "INVALID_ID";
    message = "Invalid ID format";
  } else if (error.name === "UnauthorizedError") {
    statusCode = 401;
    errorCode = "UNAUTHORIZED";
    message = "Authentication required";
  } else if (error.code === "NOTIFICATION_NOT_FOUND") {
    statusCode = 404;
    errorCode = "NOTIFICATION_NOT_FOUND";
    message = "Notification not found";
  }

  res.status(statusCode).json({
    error: message,
    code: errorCode,
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
};

export default {
  requireNotificationAccess,
  requireNotificationCreateAccess,
  requireNotificationManageAccess,
  requireNotificationOwnership,
  validateNotificationData,
  validateNotificationQuery,
  rateLimit,
  checkDeliveryEligibility,
  logNotificationOperation,
  handleNotificationError,
};
