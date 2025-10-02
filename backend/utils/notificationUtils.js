/**
 * Notification Utilities Index
 * Centralized export for all notification utility functions
 */

// Import all utility modules
import * as formatters from "./notificationFormatters.js";
import * as validators from "./notificationValidators.js";
import * as helpers from "./notificationHelpers.js";
import * as triggers from "./notificationTriggers.js";

/**
 * Comprehensive notification utilities object
 * Provides a single import point for all notification-related utilities
 */
export const NotificationUtils = {
  // Formatting utilities
  format: {
    title: formatters.formatNotificationTitle,
    message: formatters.formatNotificationMessage,
    metadata: formatters.formatNotificationMetadata,
    forUI: formatters.formatNotificationForUI,
    timeAgo: formatters.formatTimeAgo,
    priority: formatters.formatNotificationPriority,
    category: formatters.formatNotificationCategory,
    summary: formatters.generateNotificationSummary,
    sortByPriority: formatters.sortNotificationsByPriority,
    truncateMessage: formatters.truncateMessage,
    createTemplate: formatters.createNotificationTemplate,
  },

  // Validation utilities
  validate: {
    type: validators.validateNotificationType,
    userId: validators.validateUserId,
    title: validators.validateNotificationTitle,
    message: validators.validateNotificationMessage,
    metadata: validators.validateNotificationMetadata,
    notification: validators.validateNotification,
    query: validators.validateNotificationQuery,
    bulk: validators.validateBulkNotifications,
    filters: validators.validateNotificationFilters,
    sanitize: validators.sanitizeNotificationInput,
  },

  // Helper utilities
  helper: {
    isSystemEnabled: helpers.isNotificationSystemEnabled,
    isEmailEnabled: helpers.isEmailNotificationEnabled,
    isWebSocketEnabled: helpers.isWebSocketNotificationEnabled,
    isTriggerEnabled: helpers.isTriggerEnabled,
    getTypeConfig: helpers.getNotificationTypeConfig,
    shouldReceive: helpers.shouldUserReceiveNotification,
    getDeliveryChannels: helpers.getDeliveryChannels,
    buildQuery: helpers.buildNotificationQuery,
    calculateStats: helpers.calculateNotificationStats,
    groupByDate: helpers.groupNotificationsByDate,
    createDigest: helpers.createNotificationDigest,
    isExpired: helpers.isNotificationExpired,
    filterByRetention: helpers.filterNotificationsByRetention,
    prepareForAPI: helpers.prepareNotificationForAPI,
    prepareForCreation: helpers.prepareNotificationForCreation,
  },

  // Trigger utilities
  trigger: {
    lowStock: triggers.triggerLowStockNotification,
    newOrder: triggers.triggerNewOrderNotification,
    cubicVolume: triggers.triggerCubicVolumeAlert,
    productArchived: triggers.triggerProductArchivedNotification,
    vendorStatusChange: triggers.triggerVendorStatusChangeNotification,
    commissionUpdate: triggers.triggerCommissionUpdateNotification,
    systemAlert: triggers.triggerSystemAlert,
    batch: triggers.batchTriggerNotifications,
    checkLowStock: triggers.checkAndTriggerLowStockAlerts,
  },
};

/**
 * Quick access functions for common operations
 */

/**
 * Create and validate a notification
 * @param {Object} notificationData - Notification data
 * @returns {Object} Created notification or error
 */
export const createNotification = (notificationData) => {
  // Sanitize input
  const sanitized = validators.sanitizeNotificationInput(notificationData);

  // Validate
  const validation = validators.validateNotification(sanitized);
  if (!validation.isValid) {
    return {
      success: false,
      error: validation.error,
    };
  }

  // Format and prepare
  const formatted = {
    ...sanitized,
    title:
      sanitized.title ||
      formatters.formatNotificationTitle(sanitized.type, sanitized.metadata),
    message:
      sanitized.message ||
      formatters.formatNotificationMessage(sanitized.type, sanitized.metadata),
    metadata: formatters.formatNotificationMetadata(
      sanitized.type,
      sanitized.metadata || {}
    ),
  };

  return helpers.prepareNotificationForCreation(formatted);
};

/**
 * Process notification query with validation and formatting
 * @param {Object} query - Query parameters
 * @param {Object} filters - Filter parameters
 * @returns {Object} Processed query or error
 */
export const processNotificationQuery = (query = {}, filters = {}) => {
  // Validate query parameters
  const queryValidation = validators.validateNotificationQuery(query);
  if (!queryValidation.isValid) {
    return {
      success: false,
      errors: queryValidation.errors,
    };
  }

  // Validate filters
  const filterValidation = validators.validateNotificationFilters(filters);
  if (!filterValidation.isValid) {
    return {
      success: false,
      errors: filterValidation.errors,
    };
  }

  // Build database query
  const { query: dbQuery, options } = helpers.buildNotificationQuery(
    filters,
    query
  );

  return {
    success: true,
    dbQuery,
    options,
  };
};

/**
 * Format notifications for API response
 * @param {Array} notifications - Array of notifications
 * @param {Object} options - Formatting options
 * @returns {Object} Formatted response
 */
export const formatNotificationsResponse = (notifications, options = {}) => {
  const formatted = notifications.map((notification) =>
    helpers.prepareNotificationForAPI(notification, options)
  );

  const stats = helpers.calculateNotificationStats(notifications);

  return {
    notifications: formatted,
    stats,
    meta: {
      total: notifications.length,
      formatted: formatted.length,
      timestamp: new Date().toISOString(),
    },
  };
};

/**
 * Check notification delivery eligibility
 * @param {string} userId - User ID
 * @param {string} type - Notification type
 * @param {Object} userPreferences - User preferences
 * @returns {Object} Delivery eligibility
 */
export const checkDeliveryEligibility = (
  userId,
  type,
  userPreferences = {}
) => {
  // Validate inputs
  const userValidation = validators.validateUserId(userId);
  if (!userValidation.isValid) {
    return {
      eligible: false,
      error: userValidation.error,
    };
  }

  const typeValidation = validators.validateNotificationType(type);
  if (!typeValidation.isValid) {
    return {
      eligible: false,
      error: typeValidation.error,
    };
  }

  // Check system status
  if (!helpers.isNotificationSystemEnabled()) {
    return {
      eligible: false,
      reason: "Notification system is disabled",
    };
  }

  // Check user eligibility
  const shouldReceive = helpers.shouldUserReceiveNotification(
    userId,
    type,
    userPreferences
  );
  if (!shouldReceive) {
    return {
      eligible: false,
      reason: "User preferences exclude this notification type",
    };
  }

  // Get delivery channels
  const channels = helpers.getDeliveryChannels(userId, type, userPreferences);

  return {
    eligible: true,
    channels,
    typeConfig: helpers.getNotificationTypeConfig(type),
  };
};

/**
 * Bulk process notifications with validation
 * @param {Array} notifications - Array of notifications
 * @param {Object} options - Processing options
 * @returns {Object} Processing results
 */
export const bulkProcessNotifications = (notifications, options = {}) => {
  // Validate bulk operation
  const validation = validators.validateBulkNotifications(
    notifications,
    options.maxBatchSize
  );
  if (!validation.isValid) {
    return {
      success: false,
      error: validation.error,
    };
  }

  const results = {
    success: true,
    processed: 0,
    failed: 0,
    notifications: [],
    errors: [],
  };

  notifications.forEach((notificationData, index) => {
    const result = createNotification(notificationData);
    if (result.success) {
      results.notifications.push(result.notification);
      results.processed++;
    } else {
      results.errors.push({
        index,
        error: result.error,
        data: notificationData,
      });
      results.failed++;
    }
  });

  return results;
};

// Export individual utility modules for direct access
export { formatters, validators, helpers, triggers };

// Export commonly used functions directly
export {
  // Formatters
  formatNotificationTitle,
  formatNotificationMessage,
  formatNotificationMetadata,
  formatNotificationForUI,
  formatTimeAgo,
} from "./notificationFormatters.js";

export {
  // Validators
  validateNotification,
  validateNotificationType,
  validateUserId,
  sanitizeNotificationInput,
} from "./notificationValidators.js";

export {
  // Helpers
  isNotificationSystemEnabled,
  getNotificationTypeConfig,
  shouldUserReceiveNotification,
  calculateNotificationStats,
} from "./notificationHelpers.js";

export {
  // Triggers
  triggerLowStockNotification,
  triggerNewOrderNotification,
  triggerCubicVolumeAlert,
  triggerSystemAlert,
} from "./notificationTriggers.js";

export default NotificationUtils;
