import { notificationConfig } from "../config/notification.js";
import { validateNotification } from "./notificationValidators.js";
import { formatNotificationForUI } from "./notificationFormatters.js";

/**
 * Notification Helper Utilities
 * Contains helper functions for common notification operations
 */

/**
 * Check if notification system is enabled
 * @returns {boolean} True if notifications are enabled
 */
export const isNotificationSystemEnabled = () => {
  return notificationConfig.enabled;
};

/**
 * Check if email notifications are enabled
 * @returns {boolean} True if email notifications are enabled
 */
export const isEmailNotificationEnabled = () => {
  return notificationConfig.email.enabled;
};

/**
 * Check if WebSocket notifications are enabled
 * @returns {boolean} True if WebSocket notifications are enabled
 */
export const isWebSocketNotificationEnabled = () => {
  return notificationConfig.websocket.enabled;
};

/**
 * Check if specific notification trigger is enabled
 * @param {string} triggerType - Type of trigger to check
 * @returns {boolean} True if trigger is enabled
 */
export const isTriggerEnabled = (triggerType) => {
  const triggers = notificationConfig.triggers;

  switch (triggerType) {
    case "lowStock":
      return triggers.lowStock.enabled;
    case "newOrder":
      return triggers.newOrder.enabled;
    case "cubicVolume":
      return triggers.cubicVolume.enabled;
    default:
      return false;
  }
};

/**
 * Get notification type configuration
 * @param {string} type - Notification type
 * @returns {Object} Type configuration
 */
export const getNotificationTypeConfig = (type) => {
  const typeConfigs = {
    [notificationConfig.types.LOW_STOCK]: {
      name: "Low Stock Alert",
      description: "Alerts when product inventory falls below threshold",
      defaultPriority: "high",
      category: "inventory",
      emailEnabled: true,
      websocketEnabled: true,
      retentionDays: 30,
    },
    [notificationConfig.types.NEW_ORDER]: {
      name: "New Order",
      description: "Notification for new customer orders",
      defaultPriority: "medium",
      category: "orders",
      emailEnabled: true,
      websocketEnabled: true,
      retentionDays: 90,
    },
    [notificationConfig.types.CUBIC_VOLUME_ALERT]: {
      name: "Cubic Volume Alert",
      description: "Alerts for products exceeding cubic volume threshold",
      defaultPriority: "high",
      category: "compliance",
      emailEnabled: true,
      websocketEnabled: true,
      retentionDays: 60,
    },
    [notificationConfig.types.COMMISSION_UPDATE]: {
      name: "Commission Update",
      description: "Updates on commission status and payments",
      defaultPriority: "medium",
      category: "financial",
      emailEnabled: true,
      websocketEnabled: true,
      retentionDays: 365,
    },
    [notificationConfig.types.PRODUCT_ARCHIVED]: {
      name: "Product Archived",
      description: "Notification when products are archived",
      defaultPriority: "low",
      category: "products",
      emailEnabled: true,
      websocketEnabled: true,
      retentionDays: 30,
    },
    [notificationConfig.types.VENDOR_STATUS_CHANGE]: {
      name: "Account Status Change",
      description: "Notification for vendor account status changes",
      defaultPriority: "high",
      category: "account",
      emailEnabled: true,
      websocketEnabled: true,
      retentionDays: 180,
    },
    [notificationConfig.types.SYSTEM_ALERT]: {
      name: "System Alert",
      description: "System-wide alerts and announcements",
      defaultPriority: "medium",
      category: "system",
      emailEnabled: true,
      websocketEnabled: true,
      retentionDays: 90,
    },
  };

  return (
    typeConfigs[type] || {
      name: "Unknown",
      description: "Unknown notification type",
      defaultPriority: "medium",
      category: "general",
      emailEnabled: true,
      websocketEnabled: true,
      retentionDays: 90,
    }
  );
};

/**
 * Check if user should receive notification based on preferences
 * @param {string} userId - User ID
 * @param {string} type - Notification type
 * @param {Object} userPreferences - User notification preferences
 * @returns {boolean} True if user should receive notification
 */
export const shouldUserReceiveNotification = (
  userId,
  type,
  userPreferences = {}
) => {
  if (!isNotificationSystemEnabled()) {
    return false;
  }

  // Default to enabled if no preferences set
  const typeConfig = getNotificationTypeConfig(type);
  const defaultEnabled = true;

  // Check user preferences
  const categoryPrefs = userPreferences.categories || {};
  const typePrefs = userPreferences.types || {};

  // Check if category is disabled
  if (categoryPrefs[typeConfig.category] === false) {
    return false;
  }

  // Check if specific type is disabled
  if (typePrefs[type] === false) {
    return false;
  }

  return defaultEnabled;
};

/**
 * Get notification delivery channels for user
 * @param {string} userId - User ID
 * @param {string} type - Notification type
 * @param {Object} userPreferences - User notification preferences
 * @returns {Object} Delivery channels configuration
 */
export const getDeliveryChannels = (userId, type, userPreferences = {}) => {
  const typeConfig = getNotificationTypeConfig(type);
  const channels = {
    email: false,
    websocket: false,
  };

  if (!shouldUserReceiveNotification(userId, type, userPreferences)) {
    return channels;
  }

  // Check email delivery
  const emailPrefs = userPreferences.email || {};
  channels.email =
    isEmailNotificationEnabled() &&
    typeConfig.emailEnabled &&
    emailPrefs[type] !== false &&
    emailPrefs.enabled !== false;

  // Check WebSocket delivery
  const websocketPrefs = userPreferences.websocket || {};
  channels.websocket =
    isWebSocketNotificationEnabled() &&
    typeConfig.websocketEnabled &&
    websocketPrefs[type] !== false &&
    websocketPrefs.enabled !== false;

  return channels;
};

/**
 * Build notification query for database
 * @param {Object} filters - Filter parameters
 * @param {Object} pagination - Pagination parameters
 * @returns {Object} Database query and options
 */
export const buildNotificationQuery = (filters = {}, pagination = {}) => {
  const query = {};
  const options = {};

  // User filter
  if (filters.userId) {
    query.userId = filters.userId;
  }

  // Type filter
  if (filters.type) {
    query.type = filters.type;
  }

  // Read status filter
  if (filters.unreadOnly) {
    query.isRead = false;
  }

  // Date range filter
  if (filters.dateFrom || filters.dateTo) {
    query.createdAt = {};
    if (filters.dateFrom) {
      query.createdAt.$gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      query.createdAt.$lte = new Date(filters.dateTo);
    }
  }

  // Priority filter
  if (filters.priority) {
    query["metadata.priority"] = filters.priority;
  }

  // Category filter
  if (filters.category) {
    query["metadata.category"] = filters.category;
  }

  // Pagination
  const page = parseInt(pagination.page) || 1;
  const limit = parseInt(pagination.limit) || 20;
  options.skip = (page - 1) * limit;
  options.limit = Math.min(limit, 100); // Cap at 100

  // Sorting
  const sortBy = pagination.sortBy || "createdAt";
  const sortOrder = pagination.sortOrder === "asc" ? 1 : -1;
  options.sort = { [sortBy]: sortOrder };

  return { query, options };
};

/**
 * Calculate notification statistics
 * @param {Array} notifications - Array of notifications
 * @returns {Object} Statistics object
 */
export const calculateNotificationStats = (notifications) => {
  const stats = {
    total: notifications.length,
    unread: 0,
    read: 0,
    byType: {},
    byPriority: { high: 0, medium: 0, low: 0 },
    byCategory: {},
    recent: {
      last24Hours: 0,
      lastWeek: 0,
      lastMonth: 0,
    },
    oldestUnread: null,
    newestUnread: null,
  };

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  let oldestUnreadDate = null;
  let newestUnreadDate = null;

  notifications.forEach((notification) => {
    const createdAt = new Date(notification.createdAt);

    // Read status
    if (notification.isRead) {
      stats.read++;
    } else {
      stats.unread++;

      // Track oldest and newest unread
      if (!oldestUnreadDate || createdAt < oldestUnreadDate) {
        oldestUnreadDate = createdAt;
        stats.oldestUnread = notification;
      }
      if (!newestUnreadDate || createdAt > newestUnreadDate) {
        newestUnreadDate = createdAt;
        stats.newestUnread = notification;
      }
    }

    // By type
    const type = notification.type;
    stats.byType[type] = (stats.byType[type] || 0) + 1;

    // By priority
    const priority = notification.metadata?.priority || "medium";
    if (stats.byPriority[priority] !== undefined) {
      stats.byPriority[priority]++;
    }

    // By category
    const category = notification.metadata?.category || "general";
    stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;

    // Recent notifications
    if (createdAt > oneDayAgo) {
      stats.recent.last24Hours++;
    }
    if (createdAt > oneWeekAgo) {
      stats.recent.lastWeek++;
    }
    if (createdAt > oneMonthAgo) {
      stats.recent.lastMonth++;
    }
  });

  return stats;
};

/**
 * Group notifications by date
 * @param {Array} notifications - Array of notifications
 * @returns {Object} Grouped notifications
 */
export const groupNotificationsByDate = (notifications) => {
  const grouped = {};

  notifications.forEach((notification) => {
    const date = new Date(notification.createdAt);
    const dateKey = date.toISOString().split("T")[0]; // YYYY-MM-DD

    if (!grouped[dateKey]) {
      grouped[dateKey] = {
        date: dateKey,
        displayDate: date.toLocaleDateString(),
        notifications: [],
        count: 0,
        unreadCount: 0,
      };
    }

    grouped[dateKey].notifications.push(formatNotificationForUI(notification));
    grouped[dateKey].count++;

    if (!notification.isRead) {
      grouped[dateKey].unreadCount++;
    }
  });

  // Convert to array and sort by date (newest first)
  return Object.values(grouped).sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );
};

/**
 * Create notification digest for email summary
 * @param {Array} notifications - Array of notifications
 * @param {string} period - Digest period (daily, weekly)
 * @returns {Object} Digest data
 */
export const createNotificationDigest = (notifications, period = "daily") => {
  const stats = calculateNotificationStats(notifications);
  const grouped = groupNotificationsByDate(notifications);

  return {
    period,
    generatedAt: new Date().toISOString(),
    summary: {
      total: stats.total,
      unread: stats.unread,
      highPriority: stats.byPriority.high,
      categories: Object.keys(stats.byCategory).length,
    },
    notifications: notifications.slice(0, 10), // Top 10 for digest
    groupedByDate: grouped.slice(0, 7), // Last 7 days
    topCategories: Object.entries(stats.byCategory)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, count]) => ({ category, count })),
  };
};

/**
 * Check if notification is expired based on retention policy
 * @param {Object} notification - Notification object
 * @returns {boolean} True if notification is expired
 */
export const isNotificationExpired = (notification) => {
  const typeConfig = getNotificationTypeConfig(notification.type);
  const retentionDays = typeConfig.retentionDays;
  const expirationDate = new Date(notification.createdAt);
  expirationDate.setDate(expirationDate.getDate() + retentionDays);

  return new Date() > expirationDate;
};

/**
 * Filter notifications by retention policy
 * @param {Array} notifications - Array of notifications
 * @returns {Object} Filtered notifications
 */
export const filterNotificationsByRetention = (notifications) => {
  const active = [];
  const expired = [];

  notifications.forEach((notification) => {
    if (isNotificationExpired(notification)) {
      expired.push(notification);
    } else {
      active.push(notification);
    }
  });

  return { active, expired };
};

/**
 * Prepare notification for API response
 * @param {Object} notification - Raw notification object
 * @param {Object} options - Formatting options
 * @returns {Object} API-ready notification
 */
export const prepareNotificationForAPI = (notification, options = {}) => {
  const formatted = formatNotificationForUI(notification);

  if (options.includeMetadata === false) {
    delete formatted.metadata;
  }

  if (options.truncateMessage) {
    const maxLength =
      options.truncateMessage === true ? 100 : options.truncateMessage;
    if (formatted.message.length > maxLength) {
      formatted.message = formatted.message.substring(0, maxLength - 3) + "...";
    }
  }

  return formatted;
};

/**
 * Validate and prepare notification for creation
 * @param {Object} notificationData - Raw notification data
 * @returns {Object} Prepared notification or error
 */
export const prepareNotificationForCreation = (notificationData) => {
  // Validate the notification
  const validation = validateNotification(notificationData);
  if (!validation.isValid) {
    return {
      success: false,
      error: validation.error,
    };
  }

  // Add system metadata
  const prepared = {
    ...notificationData,
    createdAt: new Date(),
    isRead: false,
    readAt: null,
    metadata: {
      ...notificationData.metadata,
      createdAt: new Date().toISOString(),
      source: "system",
    },
  };

  return {
    success: true,
    notification: prepared,
  };
};

export default {
  isNotificationSystemEnabled,
  isEmailNotificationEnabled,
  isWebSocketNotificationEnabled,
  isTriggerEnabled,
  getNotificationTypeConfig,
  shouldUserReceiveNotification,
  getDeliveryChannels,
  buildNotificationQuery,
  calculateNotificationStats,
  groupNotificationsByDate,
  createNotificationDigest,
  isNotificationExpired,
  filterNotificationsByRetention,
  prepareNotificationForAPI,
  prepareNotificationForCreation,
};
