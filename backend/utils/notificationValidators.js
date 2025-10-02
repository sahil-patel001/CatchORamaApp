import { notificationConfig } from "../config/notification.js";

/**
 * Notification Validation Utilities
 * Contains functions for validating notification data, types, and constraints
 */

/**
 * Validate notification type
 * @param {string} type - Notification type to validate
 * @returns {Object} Validation result
 */
export const validateNotificationType = (type) => {
  const validTypes = Object.values(notificationConfig.types);

  if (!type) {
    return {
      isValid: false,
      error: "Notification type is required",
    };
  }

  if (!validTypes.includes(type)) {
    return {
      isValid: false,
      error: `Invalid notification type: ${type}. Valid types are: ${validTypes.join(
        ", "
      )}`,
    };
  }

  return { isValid: true };
};

/**
 * Validate user ID format
 * @param {string} userId - User ID to validate
 * @returns {Object} Validation result
 */
export const validateUserId = (userId) => {
  if (!userId) {
    return {
      isValid: false,
      error: "User ID is required",
    };
  }

  if (typeof userId !== "string") {
    return {
      isValid: false,
      error: "User ID must be a string",
    };
  }

  // Basic MongoDB ObjectId validation (24 character hex string)
  if (!/^[0-9a-fA-F]{24}$/.test(userId)) {
    return {
      isValid: false,
      error:
        "User ID must be a valid MongoDB ObjectId (24 character hex string)",
    };
  }

  return { isValid: true };
};

/**
 * Validate notification title
 * @param {string} title - Title to validate
 * @returns {Object} Validation result
 */
export const validateNotificationTitle = (title) => {
  if (!title) {
    return {
      isValid: false,
      error: "Notification title is required",
    };
  }

  if (typeof title !== "string") {
    return {
      isValid: false,
      error: "Notification title must be a string",
    };
  }

  if (title.length < 3) {
    return {
      isValid: false,
      error: "Notification title must be at least 3 characters long",
    };
  }

  if (title.length > 200) {
    return {
      isValid: false,
      error: "Notification title must be no more than 200 characters long",
    };
  }

  return { isValid: true };
};

/**
 * Validate notification message
 * @param {string} message - Message to validate
 * @returns {Object} Validation result
 */
export const validateNotificationMessage = (message) => {
  if (!message) {
    return {
      isValid: false,
      error: "Notification message is required",
    };
  }

  if (typeof message !== "string") {
    return {
      isValid: false,
      error: "Notification message must be a string",
    };
  }

  if (message.length < 5) {
    return {
      isValid: false,
      error: "Notification message must be at least 5 characters long",
    };
  }

  if (message.length > 1000) {
    return {
      isValid: false,
      error: "Notification message must be no more than 1000 characters long",
    };
  }

  return { isValid: true };
};

/**
 * Validate notification metadata based on type
 * @param {string} type - Notification type
 * @param {Object} metadata - Metadata to validate
 * @returns {Object} Validation result
 */
export const validateNotificationMetadata = (type, metadata = {}) => {
  if (typeof metadata !== "object" || metadata === null) {
    return {
      isValid: false,
      error: "Notification metadata must be an object",
    };
  }

  // Type-specific metadata validation
  switch (type) {
    case notificationConfig.types.LOW_STOCK:
      return validateLowStockMetadata(metadata);

    case notificationConfig.types.NEW_ORDER:
      return validateNewOrderMetadata(metadata);

    case notificationConfig.types.CUBIC_VOLUME_ALERT:
      return validateCubicVolumeMetadata(metadata);

    case notificationConfig.types.COMMISSION_UPDATE:
      return validateCommissionMetadata(metadata);

    case notificationConfig.types.PRODUCT_ARCHIVED:
      return validateProductArchivedMetadata(metadata);

    case notificationConfig.types.VENDOR_STATUS_CHANGE:
      return validateVendorStatusMetadata(metadata);

    case notificationConfig.types.SYSTEM_ALERT:
      return validateSystemAlertMetadata(metadata);

    default:
      return { isValid: true }; // Generic metadata validation passed
  }
};

/**
 * Validate low stock notification metadata
 * @param {Object} metadata - Metadata to validate
 * @returns {Object} Validation result
 */
const validateLowStockMetadata = (metadata) => {
  const required = ["productId", "productName", "currentQuantity", "threshold"];
  const missing = required.filter((field) => metadata[field] === undefined);

  if (missing.length > 0) {
    return {
      isValid: false,
      error: `Missing required fields for low stock notification: ${missing.join(
        ", "
      )}`,
    };
  }

  if (
    typeof metadata.currentQuantity !== "number" ||
    metadata.currentQuantity < 0
  ) {
    return {
      isValid: false,
      error: "Current quantity must be a non-negative number",
    };
  }

  if (typeof metadata.threshold !== "number" || metadata.threshold < 0) {
    return {
      isValid: false,
      error: "Threshold must be a non-negative number",
    };
  }

  return { isValid: true };
};

/**
 * Validate new order notification metadata
 * @param {Object} metadata - Metadata to validate
 * @returns {Object} Validation result
 */
const validateNewOrderMetadata = (metadata) => {
  const required = ["orderId", "orderNumber", "totalAmount"];
  const missing = required.filter((field) => metadata[field] === undefined);

  if (missing.length > 0) {
    return {
      isValid: false,
      error: `Missing required fields for new order notification: ${missing.join(
        ", "
      )}`,
    };
  }

  if (typeof metadata.totalAmount !== "number" || metadata.totalAmount < 0) {
    return {
      isValid: false,
      error: "Total amount must be a non-negative number",
    };
  }

  if (
    metadata.itemCount !== undefined &&
    (typeof metadata.itemCount !== "number" || metadata.itemCount < 1)
  ) {
    return {
      isValid: false,
      error: "Item count must be a positive number",
    };
  }

  return { isValid: true };
};

/**
 * Validate cubic volume alert metadata
 * @param {Object} metadata - Metadata to validate
 * @returns {Object} Validation result
 */
const validateCubicVolumeMetadata = (metadata) => {
  const required = [
    "productId",
    "productName",
    "vendorId",
    "cubicWeight",
    "threshold",
  ];
  const missing = required.filter((field) => metadata[field] === undefined);

  if (missing.length > 0) {
    return {
      isValid: false,
      error: `Missing required fields for cubic volume alert: ${missing.join(
        ", "
      )}`,
    };
  }

  if (typeof metadata.cubicWeight !== "number" || metadata.cubicWeight <= 0) {
    return {
      isValid: false,
      error: "Cubic weight must be a positive number",
    };
  }

  if (typeof metadata.threshold !== "number" || metadata.threshold <= 0) {
    return {
      isValid: false,
      error: "Threshold must be a positive number",
    };
  }

  return { isValid: true };
};

/**
 * Validate commission update metadata
 * @param {Object} metadata - Metadata to validate
 * @returns {Object} Validation result
 */
const validateCommissionMetadata = (metadata) => {
  const required = ["commissionId", "vendorId", "amount", "action"];
  const missing = required.filter((field) => metadata[field] === undefined);

  if (missing.length > 0) {
    return {
      isValid: false,
      error: `Missing required fields for commission update: ${missing.join(
        ", "
      )}`,
    };
  }

  if (typeof metadata.amount !== "number" || metadata.amount < 0) {
    return {
      isValid: false,
      error: "Commission amount must be a non-negative number",
    };
  }

  const validActions = ["approved", "paid", "disputed", "generated"];
  if (!validActions.includes(metadata.action)) {
    return {
      isValid: false,
      error: `Invalid commission action: ${
        metadata.action
      }. Valid actions are: ${validActions.join(", ")}`,
    };
  }

  return { isValid: true };
};

/**
 * Validate product archived metadata
 * @param {Object} metadata - Metadata to validate
 * @returns {Object} Validation result
 */
const validateProductArchivedMetadata = (metadata) => {
  const required = ["productId", "productName", "vendorId"];
  const missing = required.filter((field) => metadata[field] === undefined);

  if (missing.length > 0) {
    return {
      isValid: false,
      error: `Missing required fields for product archived notification: ${missing.join(
        ", "
      )}`,
    };
  }

  return { isValid: true };
};

/**
 * Validate vendor status change metadata
 * @param {Object} metadata - Metadata to validate
 * @returns {Object} Validation result
 */
const validateVendorStatusMetadata = (metadata) => {
  const required = ["vendorId", "oldStatus", "newStatus"];
  const missing = required.filter((field) => metadata[field] === undefined);

  if (missing.length > 0) {
    return {
      isValid: false,
      error: `Missing required fields for vendor status change: ${missing.join(
        ", "
      )}`,
    };
  }

  const validStatuses = ["active", "inactive", "pending", "suspended"];
  if (!validStatuses.includes(metadata.oldStatus)) {
    return {
      isValid: false,
      error: `Invalid old status: ${
        metadata.oldStatus
      }. Valid statuses are: ${validStatuses.join(", ")}`,
    };
  }

  if (!validStatuses.includes(metadata.newStatus)) {
    return {
      isValid: false,
      error: `Invalid new status: ${
        metadata.newStatus
      }. Valid statuses are: ${validStatuses.join(", ")}`,
    };
  }

  return { isValid: true };
};

/**
 * Validate system alert metadata
 * @param {Object} metadata - Metadata to validate
 * @returns {Object} Validation result
 */
const validateSystemAlertMetadata = (metadata) => {
  if (
    metadata.severity &&
    !["low", "medium", "high", "critical"].includes(metadata.severity)
  ) {
    return {
      isValid: false,
      error:
        "Invalid severity level. Valid levels are: low, medium, high, critical",
    };
  }

  return { isValid: true };
};

/**
 * Validate complete notification object
 * @param {Object} notification - Notification object to validate
 * @returns {Object} Validation result
 */
export const validateNotification = (notification) => {
  if (!notification || typeof notification !== "object") {
    return {
      isValid: false,
      error: "Notification must be an object",
    };
  }

  // Validate required fields
  const requiredFields = ["userId", "type", "title", "message"];
  const missing = requiredFields.filter((field) => !notification[field]);

  if (missing.length > 0) {
    return {
      isValid: false,
      error: `Missing required fields: ${missing.join(", ")}`,
    };
  }

  // Validate individual fields
  const validations = [
    validateUserId(notification.userId),
    validateNotificationType(notification.type),
    validateNotificationTitle(notification.title),
    validateNotificationMessage(notification.message),
    validateNotificationMetadata(notification.type, notification.metadata),
  ];

  for (const validation of validations) {
    if (!validation.isValid) {
      return validation;
    }
  }

  return { isValid: true };
};

/**
 * Validate notification query parameters
 * @param {Object} query - Query parameters
 * @returns {Object} Validation result
 */
export const validateNotificationQuery = (query = {}) => {
  const errors = [];

  // Validate page
  if (query.page !== undefined) {
    const page = parseInt(query.page);
    if (isNaN(page) || page < 1) {
      errors.push("Page must be a positive integer");
    }
  }

  // Validate limit
  if (query.limit !== undefined) {
    const limit = parseInt(query.limit);
    if (isNaN(limit) || limit < 1 || limit > 100) {
      errors.push("Limit must be a positive integer between 1 and 100");
    }
  }

  // Validate type
  if (query.type !== undefined) {
    const typeValidation = validateNotificationType(query.type);
    if (!typeValidation.isValid) {
      errors.push(typeValidation.error);
    }
  }

  // Validate unreadOnly
  if (query.unreadOnly !== undefined && typeof query.unreadOnly !== "boolean") {
    errors.push("UnreadOnly must be a boolean");
  }

  // Validate sortBy
  if (query.sortBy !== undefined) {
    const validSortFields = ["createdAt", "readAt", "priority", "type"];
    if (!validSortFields.includes(query.sortBy)) {
      errors.push(
        `Invalid sort field: ${
          query.sortBy
        }. Valid fields are: ${validSortFields.join(", ")}`
      );
    }
  }

  // Validate sortOrder
  if (query.sortOrder !== undefined) {
    const validOrders = ["asc", "desc"];
    if (!validOrders.includes(query.sortOrder)) {
      errors.push(
        `Invalid sort order: ${
          query.sortOrder
        }. Valid orders are: ${validOrders.join(", ")}`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate bulk notification operation
 * @param {Array} notifications - Array of notifications
 * @param {number} maxBatchSize - Maximum batch size allowed
 * @returns {Object} Validation result
 */
export const validateBulkNotifications = (
  notifications,
  maxBatchSize = 100
) => {
  if (!Array.isArray(notifications)) {
    return {
      isValid: false,
      error: "Notifications must be an array",
    };
  }

  if (notifications.length === 0) {
    return {
      isValid: false,
      error: "At least one notification is required",
    };
  }

  if (notifications.length > maxBatchSize) {
    return {
      isValid: false,
      error: `Batch size exceeds maximum allowed (${maxBatchSize})`,
    };
  }

  // Validate each notification
  for (let i = 0; i < notifications.length; i++) {
    const validation = validateNotification(notifications[i]);
    if (!validation.isValid) {
      return {
        isValid: false,
        error: `Notification at index ${i}: ${validation.error}`,
      };
    }
  }

  return { isValid: true };
};

/**
 * Validate notification filters
 * @param {Object} filters - Filter object
 * @returns {Object} Validation result
 */
export const validateNotificationFilters = (filters = {}) => {
  const errors = [];

  // Validate dateFrom
  if (filters.dateFrom !== undefined) {
    const date = new Date(filters.dateFrom);
    if (isNaN(date.getTime())) {
      errors.push("dateFrom must be a valid date");
    }
  }

  // Validate dateTo
  if (filters.dateTo !== undefined) {
    const date = new Date(filters.dateTo);
    if (isNaN(date.getTime())) {
      errors.push("dateTo must be a valid date");
    }
  }

  // Validate date range
  if (filters.dateFrom && filters.dateTo) {
    const from = new Date(filters.dateFrom);
    const to = new Date(filters.dateTo);
    if (from > to) {
      errors.push("dateFrom must be before dateTo");
    }
  }

  // Validate priority
  if (filters.priority !== undefined) {
    const validPriorities = ["low", "medium", "high"];
    if (!validPriorities.includes(filters.priority)) {
      errors.push(
        `Invalid priority: ${
          filters.priority
        }. Valid priorities are: ${validPriorities.join(", ")}`
      );
    }
  }

  // Validate category
  if (filters.category !== undefined) {
    const validCategories = [
      "inventory",
      "orders",
      "financial",
      "products",
      "account",
      "system",
      "compliance",
      "general",
    ];
    if (!validCategories.includes(filters.category)) {
      errors.push(
        `Invalid category: ${
          filters.category
        }. Valid categories are: ${validCategories.join(", ")}`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Sanitize notification input to prevent XSS and other issues
 * @param {Object} notification - Notification object to sanitize
 * @returns {Object} Sanitized notification
 */
export const sanitizeNotificationInput = (notification) => {
  const sanitized = { ...notification };

  // Basic HTML/script tag removal for title and message
  if (sanitized.title) {
    sanitized.title = sanitized.title.replace(/<[^>]*>/g, "").trim();
  }

  if (sanitized.message) {
    sanitized.message = sanitized.message.replace(/<[^>]*>/g, "").trim();
  }

  // Sanitize metadata strings
  if (sanitized.metadata && typeof sanitized.metadata === "object") {
    const sanitizedMetadata = {};
    Object.entries(sanitized.metadata).forEach(([key, value]) => {
      if (typeof value === "string") {
        sanitizedMetadata[key] = value.replace(/<[^>]*>/g, "").trim();
      } else {
        sanitizedMetadata[key] = value;
      }
    });
    sanitized.metadata = sanitizedMetadata;
  }

  return sanitized;
};

export default {
  validateNotificationType,
  validateUserId,
  validateNotificationTitle,
  validateNotificationMessage,
  validateNotificationMetadata,
  validateNotification,
  validateNotificationQuery,
  validateBulkNotifications,
  validateNotificationFilters,
  sanitizeNotificationInput,
};
