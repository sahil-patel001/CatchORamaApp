import { notificationConfig } from "../config/notification.js";

/**
 * Notification Formatting Utilities
 * Contains functions for formatting notification content, titles, and metadata
 */

/**
 * Format notification title based on type and context
 * @param {string} type - Notification type
 * @param {Object} context - Context data for formatting
 * @returns {string} Formatted title
 */
export const formatNotificationTitle = (type, context = {}) => {
  const titleTemplates = {
    [notificationConfig.types.LOW_STOCK]: "Low Stock Alert",
    [notificationConfig.types.NEW_ORDER]: "New Order Received",
    [notificationConfig.types.CUBIC_VOLUME_ALERT]: "Cubic Volume Alert",
    [notificationConfig.types.SYSTEM_ALERT]: context.title || "System Alert",
    [notificationConfig.types.COMMISSION_UPDATE]: "Commission Update",
    [notificationConfig.types.PRODUCT_ARCHIVED]: "Product Archived",
    [notificationConfig.types.VENDOR_STATUS_CHANGE]: "Account Status Update",
  };

  return titleTemplates[type] || "Notification";
};

/**
 * Format notification message based on type and context
 * @param {string} type - Notification type
 * @param {Object} context - Context data for formatting
 * @returns {string} Formatted message
 */
export const formatNotificationMessage = (type, context = {}) => {
  switch (type) {
    case notificationConfig.types.LOW_STOCK:
      return `Your product "${context.productName}" is running low on stock. Current quantity: ${context.currentQuantity}, Threshold: ${context.threshold}`;

    case notificationConfig.types.NEW_ORDER:
      return `You have received a new order #${
        context.orderNumber
      }. Total amount: $${context.totalAmount?.toFixed(2)}`;

    case notificationConfig.types.CUBIC_VOLUME_ALERT:
      return `Product "${context.productName}" by ${
        context.vendorName
      } has a cubic weight of ${context.cubicWeight?.toFixed(
        2
      )}kg, which exceeds the ${context.threshold}kg threshold.`;

    case notificationConfig.types.SYSTEM_ALERT:
      return context.message || "A system alert has been triggered.";

    case notificationConfig.types.COMMISSION_UPDATE:
      const actionMessages = {
        approved: `Your commission of $${context.amount?.toFixed(
          2
        )} has been approved and will be processed for payment.`,
        paid: `Your commission of $${context.amount?.toFixed(
          2
        )} has been paid and transferred to your account.`,
        disputed: `Your commission of $${context.amount?.toFixed(
          2
        )} is under dispute. Please contact support.`,
        generated: `A new commission of $${context.amount?.toFixed(
          2
        )} has been generated for your recent sales.`,
      };
      return (
        actionMessages[context.action] ||
        `Your commission status has been updated to ${context.action}.`
      );

    case notificationConfig.types.PRODUCT_ARCHIVED:
      return `Your product "${
        context.productName
      }" has been archived. Reason: ${context.reason || "Manual archive"}`;

    case notificationConfig.types.VENDOR_STATUS_CHANGE:
      const statusMessages = {
        active:
          "Your vendor account has been activated and you can now start selling.",
        inactive:
          "Your vendor account has been deactivated. Please contact support for assistance.",
        pending:
          "Your vendor account is under review. We'll notify you once it's processed.",
        suspended:
          "Your vendor account has been suspended. Please contact support immediately.",
      };
      return (
        statusMessages[context.newStatus] ||
        `Your vendor account status has been changed from ${context.oldStatus} to ${context.newStatus}.`
      );

    default:
      return context.message || "You have a new notification.";
  }
};

/**
 * Format notification metadata with proper structure and validation
 * @param {string} type - Notification type
 * @param {Object} rawMetadata - Raw metadata object
 * @returns {Object} Formatted and validated metadata
 */
export const formatNotificationMetadata = (type, rawMetadata = {}) => {
  const baseMetadata = {
    type,
    createdAt: new Date().toISOString(),
    ...rawMetadata,
  };

  // Type-specific metadata formatting
  switch (type) {
    case notificationConfig.types.LOW_STOCK:
      return {
        ...baseMetadata,
        productId: rawMetadata.productId,
        productName: rawMetadata.productName,
        vendorId: rawMetadata.vendorId,
        currentQuantity: parseInt(rawMetadata.currentQuantity) || 0,
        threshold: parseInt(rawMetadata.threshold) || 0,
        actionUrl:
          rawMetadata.actionUrl || `/vendor/products/${rawMetadata.productId}`,
        priority: "high",
        category: "inventory",
      };

    case notificationConfig.types.NEW_ORDER:
      return {
        ...baseMetadata,
        orderId: rawMetadata.orderId,
        orderNumber: rawMetadata.orderNumber,
        vendorId: rawMetadata.vendorId,
        totalAmount: parseFloat(rawMetadata.totalAmount) || 0,
        itemCount: parseInt(rawMetadata.itemCount) || 0,
        actionUrl:
          rawMetadata.actionUrl || `/vendor/orders/${rawMetadata.orderId}`,
        priority: "medium",
        category: "orders",
      };

    case notificationConfig.types.CUBIC_VOLUME_ALERT:
      return {
        ...baseMetadata,
        productId: rawMetadata.productId,
        productName: rawMetadata.productName,
        vendorId: rawMetadata.vendorId,
        vendorName: rawMetadata.vendorName,
        cubicWeight: parseFloat(rawMetadata.cubicWeight) || 0,
        threshold: parseFloat(rawMetadata.threshold) || 32,
        dimensions: rawMetadata.dimensions || {},
        actionUrl:
          rawMetadata.actionUrl || `/admin/products/${rawMetadata.productId}`,
        priority: "high",
        category: "compliance",
      };

    case notificationConfig.types.COMMISSION_UPDATE:
      return {
        ...baseMetadata,
        commissionId: rawMetadata.commissionId,
        vendorId: rawMetadata.vendorId,
        vendorName: rawMetadata.vendorName,
        amount: parseFloat(rawMetadata.amount) || 0,
        action: rawMetadata.action,
        period: rawMetadata.period,
        actionUrl: rawMetadata.actionUrl || `/vendor/commissions`,
        priority: "medium",
        category: "financial",
      };

    case notificationConfig.types.PRODUCT_ARCHIVED:
      return {
        ...baseMetadata,
        productId: rawMetadata.productId,
        productName: rawMetadata.productName,
        vendorId: rawMetadata.vendorId,
        reason: rawMetadata.reason || "Manual archive",
        archivedAt: rawMetadata.archivedAt || new Date().toISOString(),
        actionUrl: rawMetadata.actionUrl || `/vendor/products/archived`,
        priority: "low",
        category: "products",
      };

    case notificationConfig.types.VENDOR_STATUS_CHANGE:
      return {
        ...baseMetadata,
        vendorId: rawMetadata.vendorId,
        vendorName: rawMetadata.vendorName,
        oldStatus: rawMetadata.oldStatus,
        newStatus: rawMetadata.newStatus,
        changedAt: rawMetadata.changedAt || new Date().toISOString(),
        actionUrl: rawMetadata.actionUrl || `/vendor/settings`,
        priority: rawMetadata.newStatus === "suspended" ? "high" : "medium",
        category: "account",
      };

    case notificationConfig.types.SYSTEM_ALERT:
      return {
        ...baseMetadata,
        severity: rawMetadata.severity || "medium",
        alertedAt: rawMetadata.alertedAt || new Date().toISOString(),
        actionUrl: rawMetadata.actionUrl,
        priority: rawMetadata.severity === "critical" ? "high" : "medium",
        category: "system",
      };

    default:
      return {
        ...baseMetadata,
        priority: "medium",
        category: "general",
      };
  }
};

/**
 * Format notification for display in UI
 * @param {Object} notification - Notification object
 * @returns {Object} Formatted notification for UI
 */
export const formatNotificationForUI = (notification) => {
  return {
    id: notification._id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    isRead: notification.isRead,
    createdAt: notification.createdAt,
    readAt: notification.readAt,
    metadata: {
      ...notification.metadata,
      timeAgo: formatTimeAgo(notification.createdAt),
      priority: notification.metadata?.priority || "medium",
      category: notification.metadata?.category || "general",
    },
  };
};

/**
 * Format time difference as human-readable string
 * @param {Date|string} date - Date to format
 * @returns {string} Human-readable time difference
 */
export const formatTimeAgo = (date) => {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now - past) / 1000);

  if (diffInSeconds < 60) {
    return "just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks > 1 ? "s" : ""} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths > 1 ? "s" : ""} ago`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} year${diffInYears > 1 ? "s" : ""} ago`;
};

/**
 * Format notification priority for display
 * @param {string} priority - Priority level
 * @returns {Object} Priority display info
 */
export const formatNotificationPriority = (priority) => {
  const priorityConfig = {
    high: {
      label: "High",
      color: "#dc3545",
      icon: "🔴",
      urgency: 3,
    },
    medium: {
      label: "Medium",
      color: "#ffc107",
      icon: "🟡",
      urgency: 2,
    },
    low: {
      label: "Low",
      color: "#28a745",
      icon: "🟢",
      urgency: 1,
    },
  };

  return priorityConfig[priority] || priorityConfig.medium;
};

/**
 * Format notification category for display
 * @param {string} category - Category name
 * @returns {Object} Category display info
 */
export const formatNotificationCategory = (category) => {
  const categoryConfig = {
    inventory: {
      label: "Inventory",
      icon: "📦",
      color: "#17a2b8",
    },
    orders: {
      label: "Orders",
      icon: "🛒",
      color: "#28a745",
    },
    financial: {
      label: "Financial",
      icon: "💰",
      color: "#ffc107",
    },
    products: {
      label: "Products",
      icon: "🏷️",
      color: "#6f42c1",
    },
    account: {
      label: "Account",
      icon: "👤",
      color: "#fd7e14",
    },
    system: {
      label: "System",
      icon: "⚙️",
      color: "#6c757d",
    },
    compliance: {
      label: "Compliance",
      icon: "⚖️",
      color: "#dc3545",
    },
    general: {
      label: "General",
      icon: "📋",
      color: "#495057",
    },
  };

  return categoryConfig[category] || categoryConfig.general;
};

/**
 * Generate notification summary for batch operations
 * @param {Array} notifications - Array of notifications
 * @returns {Object} Summary statistics
 */
export const generateNotificationSummary = (notifications) => {
  const summary = {
    total: notifications.length,
    unread: 0,
    byType: {},
    byPriority: { high: 0, medium: 0, low: 0 },
    byCategory: {},
    recent: 0, // Last 24 hours
  };

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  notifications.forEach((notification) => {
    // Count unread
    if (!notification.isRead) {
      summary.unread++;
    }

    // Count by type
    const type = notification.type;
    summary.byType[type] = (summary.byType[type] || 0) + 1;

    // Count by priority
    const priority = notification.metadata?.priority || "medium";
    summary.byPriority[priority]++;

    // Count by category
    const category = notification.metadata?.category || "general";
    summary.byCategory[category] = (summary.byCategory[category] || 0) + 1;

    // Count recent
    if (new Date(notification.createdAt) > oneDayAgo) {
      summary.recent++;
    }
  });

  return summary;
};

/**
 * Sort notifications by priority and date
 * @param {Array} notifications - Array of notifications
 * @returns {Array} Sorted notifications
 */
export const sortNotificationsByPriority = (notifications) => {
  const priorityOrder = { high: 3, medium: 2, low: 1 };

  return notifications.sort((a, b) => {
    // First sort by read status (unread first)
    if (a.isRead !== b.isRead) {
      return a.isRead ? 1 : -1;
    }

    // Then by priority
    const aPriority = priorityOrder[a.metadata?.priority] || 2;
    const bPriority = priorityOrder[b.metadata?.priority] || 2;

    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }

    // Finally by date (newest first)
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
};

/**
 * Truncate notification message for display
 * @param {string} message - Original message
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated message
 */
export const truncateMessage = (message, maxLength = 100) => {
  if (!message || message.length <= maxLength) {
    return message;
  }

  return message.substring(0, maxLength - 3).trim() + "...";
};

/**
 * Create notification template for specific context
 * @param {string} type - Notification type
 * @param {Object} context - Context data
 * @returns {Object} Notification template
 */
export const createNotificationTemplate = (type, context = {}) => {
  return {
    type,
    title: formatNotificationTitle(type, context),
    message: formatNotificationMessage(type, context),
    metadata: formatNotificationMetadata(type, context),
  };
};

export default {
  formatNotificationTitle,
  formatNotificationMessage,
  formatNotificationMetadata,
  formatNotificationForUI,
  formatTimeAgo,
  formatNotificationPriority,
  formatNotificationCategory,
  generateNotificationSummary,
  sortNotificationsByPriority,
  truncateMessage,
  createNotificationTemplate,
};
