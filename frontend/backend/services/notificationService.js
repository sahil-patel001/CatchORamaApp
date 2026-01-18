import Notification from "../models/Notification.js";
import { notificationConfig } from "../config/notification.js";
import { emailService } from "./emailService.js";
import { websocketService } from "./websocketService.js";

/**
 * Core Notification Service
 * Handles creation, delivery, and management of notifications
 */
class NotificationService {
  constructor() {
    this.config = notificationConfig;
    this.failedDeliveries = new Map(); // Track failed deliveries for retry
    this.retryQueue = new Map(); // Queue for retry attempts
    this.fallbackStats = {
      websocketFailures: 0,
      emailFallbacks: 0,
      retryAttempts: 0,
      successfulRetries: 0,
    };
    this.maxRetryAttempts = 3;
    this.retryDelays = [1000, 5000, 15000]; // 1s, 5s, 15s
  }

  /**
   * Create a new notification
   * @param {Object} notificationData - Notification data
   * @param {string} notificationData.userId - Target user ID
   * @param {string} notificationData.type - Notification type
   * @param {string} notificationData.title - Notification title
   * @param {string} notificationData.message - Notification message
   * @param {Object} notificationData.metadata - Additional metadata
   * @param {boolean} notificationData.sendEmail - Whether to send email
   * @param {boolean} notificationData.sendWebSocket - Whether to send via WebSocket
   * @returns {Promise<Object>} Created notification
   */
  async createNotification({
    userId,
    type,
    title,
    message,
    metadata = {},
    sendEmail = true,
    sendWebSocket = true,
  }) {
    try {
      // Validate notification type
      if (!Object.values(this.config.types).includes(type)) {
        throw new Error(`Invalid notification type: ${type}`);
      }

      // Check user preferences for delivery methods
      const userPreferences = await this.getUserNotificationPreferences(userId);

      // Apply user preferences to delivery options
      const finalSendEmail =
        sendEmail &&
        userPreferences.email &&
        userPreferences[this.getPreferenceKey(type)];
      const finalSendWebSocket =
        sendWebSocket &&
        userPreferences.push &&
        userPreferences[this.getPreferenceKey(type)];

      // Create notification in database
      const notification = new Notification({
        userId,
        type,
        title,
        message,
        category: this.getCategoryForType(type),
        metadata: {
          ...metadata,
          userPreferences: {
            emailEnabled: userPreferences.email,
            pushEnabled: userPreferences.push,
            typeEnabled: userPreferences[this.getPreferenceKey(type)],
          },
        },
        isRead: false,
        createdAt: new Date(),
      });

      await notification.save();

      // Send via configured channels with fallback logic
      const deliveryResults = await this.deliverNotificationWithFallback(
        notification,
        { sendWebSocket: finalSendWebSocket, sendEmail: finalSendEmail }
      );

      // Store delivery results in notification metadata
      notification.metadata = {
        ...notification.metadata,
        deliveryResults,
        deliveryAttempt: 1,
        lastDeliveryAttempt: new Date(),
      };

      await notification.save();

      // Log delivery attempt
      this.logDeliveryAttempt(notification, deliveryResults);

      return notification;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }

  /**
   * Get user notification preferences
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User preferences
   */
  async getUserNotificationPreferences(userId) {
    try {
      // Import here to avoid circular dependency
      const User = (await import("../models/User.js")).default;
      const Vendor = (await import("../models/Vendor.js")).default;

      // Get user preferences
      const user = await User.findById(userId).select(
        "notificationPreferences role"
      );
      if (!user) {
        // Return default preferences if user not found
        return {
          email: true,
          push: true,
          lowStock: true,
          newOrder: true,
          systemAlerts: true,
          commissionUpdates: true,
        };
      }

      let preferences = user.notificationPreferences || {};

      // If user is a vendor, also check vendor-specific notification settings
      if (user.role === "vendor") {
        const vendor = await Vendor.findOne({ userId }).select(
          "settings.notifications"
        );
        if (vendor && vendor.settings?.notifications) {
          preferences = {
            ...preferences,
            email: preferences.email && vendor.settings.notifications.email,
            push: preferences.push && vendor.settings.notifications.push,
          };
        }
      }

      // Ensure all required preferences exist with defaults
      return {
        email: preferences.email !== false,
        push: preferences.push !== false,
        lowStock: preferences.lowStock !== false,
        newOrder: preferences.newOrder !== false,
        systemAlerts: preferences.systemAlerts !== false,
        commissionUpdates: preferences.commissionUpdates !== false,
      };
    } catch (error) {
      console.error("Error getting user notification preferences:", error);
      // Return defaults on error
      return {
        email: true,
        push: true,
        lowStock: true,
        newOrder: true,
        systemAlerts: true,
        commissionUpdates: true,
      };
    }
  }

  /**
   * Get preference key for notification type
   * @param {string} type - Notification type
   * @returns {string} Preference key
   */
  getPreferenceKey(type) {
    const typeMap = {
      [this.config.types.LOW_STOCK]: "lowStock",
      [this.config.types.NEW_ORDER]: "newOrder",
      [this.config.types.CUBIC_VOLUME_ALERT]: "systemAlerts",
      [this.config.types.SYSTEM_ALERT]: "systemAlerts",
      [this.config.types.COMMISSION_UPDATE]: "commissionUpdates",
      [this.config.types.PRODUCT_ARCHIVED]: "systemAlerts",
      [this.config.types.VENDOR_STATUS_CHANGE]: "systemAlerts",
    };

    return typeMap[type] || "systemAlerts";
  }

  /**
   * Get category for notification type
   * @param {string} type - Notification type
   * @returns {string} Category
   */
  getCategoryForType(type) {
    const categoryMap = {
      [this.config.types.LOW_STOCK]: "product",
      [this.config.types.NEW_ORDER]: "order",
      [this.config.types.CUBIC_VOLUME_ALERT]: "product",
      [this.config.types.SYSTEM_ALERT]: "system",
      [this.config.types.COMMISSION_UPDATE]: "commission",
      [this.config.types.PRODUCT_ARCHIVED]: "product",
      [this.config.types.VENDOR_STATUS_CHANGE]: "account",
    };

    return categoryMap[type] || "system";
  }

  /**
   * Log delivery attempt with detailed information
   * @param {Object} notification - Notification object
   * @param {Object} deliveryResults - Delivery results
   */
  logDeliveryAttempt(notification, deliveryResults) {
    const logLevel =
      deliveryResults.websocket.success || deliveryResults.email.success
        ? "info"
        : "warn";
    const status =
      deliveryResults.websocket.success || deliveryResults.email.success
        ? "SUCCESS"
        : "FAILED";

    const logData = {
      notificationId: notification._id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      deliveryStatus: status,
      websocket: {
        attempted: deliveryResults.websocket.attempted,
        success: deliveryResults.websocket.success,
        error: deliveryResults.websocket.error,
      },
      email: {
        attempted: deliveryResults.email.attempted,
        success: deliveryResults.email.success,
        error: deliveryResults.email.error,
      },
      fallbackUsed: deliveryResults.fallbackUsed,
      retryScheduled: deliveryResults.retryScheduled,
      timestamp: new Date().toISOString(),
    };

    if (logLevel === "info") {
      console.log(
        `📧 Notification delivered successfully:`,
        JSON.stringify(logData, null, 2)
      );
    } else {
      console.warn(
        `⚠️ Notification delivery failed:`,
        JSON.stringify(logData, null, 2)
      );
    }

    // Update internal stats
    if (deliveryResults.websocket.success) {
      this.fallbackStats.successfulRetries++;
    }
  }

  /**
   * Deliver notification with comprehensive fallback mechanisms
   * @param {Object} notification - Notification object
   * @param {Object} options - Delivery options
   * @returns {Promise<Object>} Delivery results
   */
  async deliverNotificationWithFallback(notification, options = {}) {
    const { sendWebSocket = true, sendEmail = true } = options;
    const results = {
      websocket: { attempted: false, success: false, error: null },
      email: { attempted: false, success: false, error: null },
      fallbackUsed: false,
      retryScheduled: false,
    };

    try {
      // Primary delivery: WebSocket
      if (sendWebSocket && this.config.websocket.enabled) {
        results.websocket.attempted = true;
        try {
          const websocketResult = await websocketService.sendNotificationToUser(
            notification.userId,
            notification
          );
          results.websocket.success = websocketResult.success;

          if (!websocketResult.success) {
            results.websocket.error =
              websocketResult.reason || "WebSocket delivery failed";
            this.fallbackStats.websocketFailures++;

            // Schedule retry for WebSocket failure
            this.scheduleRetry(notification, "websocket");
            results.retryScheduled = true;
          }
        } catch (error) {
          results.websocket.success = false;
          results.websocket.error = error.message;
          this.fallbackStats.websocketFailures++;
          console.error("WebSocket delivery error:", error);
        }
      }

      // Fallback delivery: Email (if WebSocket failed or unavailable)
      if (sendEmail && this.config.email.enabled) {
        const shouldSendEmail = !results.websocket.success || !sendWebSocket;

        if (shouldSendEmail) {
          results.email.attempted = true;
          results.fallbackUsed = !results.websocket.success;

          try {
            const emailResult = await emailService.sendNotificationEmail(
              notification.userId,
              notification
            );
            results.email.success = emailResult.success;

            if (results.fallbackUsed && results.email.success) {
              this.fallbackStats.emailFallbacks++;
              console.log(
                `📧 Email fallback successful for notification ${notification._id}`
              );
            }

            if (!emailResult.success) {
              results.email.error =
                emailResult.error || "Email delivery failed";
            }
          } catch (error) {
            results.email.success = false;
            results.email.error = error.message;
            console.error("Email delivery error:", error);
          }
        }
      }

      // If both primary and fallback failed, add to failed delivery tracking
      if (!results.websocket.success && !results.email.success) {
        this.trackFailedDelivery(notification, results);
      }

      return results;
    } catch (error) {
      console.error("Error in fallback delivery:", error);
      return {
        ...results,
        error: error.message,
      };
    }
  }

  /**
   * Schedule retry for failed notification delivery
   * @param {Object} notification - Notification object
   * @param {string} failedMethod - The method that failed (websocket, email)
   */
  scheduleRetry(notification, failedMethod) {
    const notificationId = notification._id.toString();
    const currentAttempts = this.retryQueue.get(notificationId)?.attempts || 0;

    if (currentAttempts >= this.maxRetryAttempts) {
      console.warn(
        `🚫 Max retry attempts reached for notification ${notificationId}`
      );
      return;
    }

    const retryDelay =
      this.retryDelays[currentAttempts] ||
      this.retryDelays[this.retryDelays.length - 1];
    const retryInfo = {
      notification,
      failedMethod,
      attempts: currentAttempts + 1,
      nextRetry: new Date(Date.now() + retryDelay),
      retryDelay,
    };

    this.retryQueue.set(notificationId, retryInfo);
    this.fallbackStats.retryAttempts++;

    console.log(
      `🔄 Scheduled retry ${retryInfo.attempts}/${this.maxRetryAttempts} for notification ${notificationId} in ${retryDelay}ms`
    );

    setTimeout(() => {
      this.executeRetry(notificationId);
    }, retryDelay);
  }

  /**
   * Execute retry for a failed notification
   * @param {string} notificationId - Notification ID
   */
  async executeRetry(notificationId) {
    const retryInfo = this.retryQueue.get(notificationId);
    if (!retryInfo) {
      return;
    }

    console.log(
      `🔄 Executing retry ${retryInfo.attempts}/${this.maxRetryAttempts} for notification ${notificationId}`
    );

    try {
      let success = false;

      // Retry based on the failed method
      if (retryInfo.failedMethod === "websocket") {
        const result = await websocketService.sendNotificationToUser(
          retryInfo.notification.userId,
          retryInfo.notification
        );
        success = result.success;

        if (success) {
          console.log(
            `✅ WebSocket retry successful for notification ${notificationId}`
          );
          this.fallbackStats.successfulRetries++;
        }
      } else if (retryInfo.failedMethod === "email") {
        const result = await emailService.sendNotificationEmail(
          retryInfo.notification.userId,
          retryInfo.notification
        );
        success = result.success;

        if (success) {
          console.log(
            `✅ Email retry successful for notification ${notificationId}`
          );
          this.fallbackStats.successfulRetries++;
        }
      }

      if (success) {
        // Remove from retry queue on success
        this.retryQueue.delete(notificationId);

        // Update notification in database
        await Notification.findByIdAndUpdate(notificationId, {
          $set: {
            "metadata.retrySuccessful": true,
            "metadata.retryAttempt": retryInfo.attempts,
            "metadata.lastSuccessfulDelivery": new Date(),
          },
        });
      } else {
        // Schedule next retry if not at max attempts
        if (retryInfo.attempts < this.maxRetryAttempts) {
          this.scheduleRetry(retryInfo.notification, retryInfo.failedMethod);
        } else {
          console.error(
            `🚫 All retry attempts failed for notification ${notificationId}`
          );
          this.retryQueue.delete(notificationId);

          // Mark as permanently failed
          await Notification.findByIdAndUpdate(notificationId, {
            $set: {
              "metadata.deliveryFailed": true,
              "metadata.maxRetriesReached": true,
              "metadata.finalFailureTime": new Date(),
            },
          });
        }
      }
    } catch (error) {
      console.error(
        `Error executing retry for notification ${notificationId}:`,
        error
      );

      // Schedule next retry on error (if not at max attempts)
      if (retryInfo.attempts < this.maxRetryAttempts) {
        this.scheduleRetry(retryInfo.notification, retryInfo.failedMethod);
      } else {
        this.retryQueue.delete(notificationId);
      }
    }
  }

  /**
   * Track failed delivery for analytics and debugging
   * @param {Object} notification - Notification object
   * @param {Object} deliveryResults - Delivery results
   */
  trackFailedDelivery(notification, deliveryResults) {
    const failureInfo = {
      notificationId: notification._id,
      userId: notification.userId,
      type: notification.type,
      timestamp: new Date(),
      websocketError: deliveryResults.websocket.error,
      emailError: deliveryResults.email.error,
      retryScheduled: deliveryResults.retryScheduled,
    };

    this.failedDeliveries.set(notification._id.toString(), failureInfo);

    console.warn(
      `📊 Tracked failed delivery for notification ${notification._id}:`,
      {
        websocketFailed: !deliveryResults.websocket.success,
        emailFailed: !deliveryResults.email.success,
        errors: {
          websocket: deliveryResults.websocket.error,
          email: deliveryResults.email.error,
        },
      }
    );
  }

  /**
   * Get offline notifications for a user (for when they reconnect)
   * @param {string} userId - User ID
   * @param {Date} lastSeen - Last time user was online
   * @returns {Promise<Array>} Offline notifications
   */
  async getOfflineNotifications(userId, lastSeen) {
    try {
      const offlineNotifications = await Notification.find({
        userId,
        createdAt: { $gte: lastSeen },
        isRead: false,
      })
        .sort({ createdAt: -1 })
        .limit(50) // Limit to prevent overwhelming the user
        .lean();

      console.log(
        `📱 Retrieved ${offlineNotifications.length} offline notifications for user ${userId}`
      );

      return offlineNotifications;
    } catch (error) {
      console.error("Error getting offline notifications:", error);
      return [];
    }
  }

  /**
   * Deliver offline notifications when user reconnects
   * @param {string} userId - User ID
   * @param {Date} lastSeen - Last time user was online
   * @returns {Promise<Object>} Delivery result
   */
  async deliverOfflineNotifications(userId, lastSeen) {
    try {
      const offlineNotifications = await this.getOfflineNotifications(
        userId,
        lastSeen
      );

      if (offlineNotifications.length === 0) {
        return { success: true, delivered: 0 };
      }

      let delivered = 0;
      const deliveryPromises = offlineNotifications.map(
        async (notification) => {
          try {
            const result = await websocketService.sendNotificationToUser(
              userId,
              notification
            );
            if (result.success) {
              delivered++;
            }
            return result;
          } catch (error) {
            console.error(
              `Error delivering offline notification ${notification._id}:`,
              error
            );
            return { success: false, error: error.message };
          }
        }
      );

      await Promise.allSettled(deliveryPromises);

      console.log(
        `📱 Delivered ${delivered}/${offlineNotifications.length} offline notifications to user ${userId}`
      );

      return {
        success: true,
        total: offlineNotifications.length,
        delivered,
        failed: offlineNotifications.length - delivered,
      };
    } catch (error) {
      console.error("Error delivering offline notifications:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Bulk retry failed notifications
   * @param {Object} filters - Filters for selecting notifications to retry
   * @returns {Promise<Object>} Retry results
   */
  async bulkRetryFailedNotifications(filters = {}) {
    try {
      const {
        maxAge = 24 * 60 * 60 * 1000, // 24 hours
        notificationType = null,
        userId = null,
        limit = 100,
      } = filters;

      const query = {
        "metadata.deliveryFailed": { $ne: true },
        "metadata.maxRetriesReached": { $ne: true },
        createdAt: { $gte: new Date(Date.now() - maxAge) },
        $or: [
          { "metadata.deliveryResults.websocket.success": false },
          { "metadata.deliveryResults.email.success": false },
        ],
      };

      if (notificationType) {
        query.type = notificationType;
      }

      if (userId) {
        query.userId = userId;
      }

      const failedNotifications = await Notification.find(query)
        .limit(limit)
        .lean();

      console.log(
        `🔄 Found ${failedNotifications.length} notifications for bulk retry`
      );

      let retried = 0;
      const retryPromises = failedNotifications.map(async (notification) => {
        try {
          const deliveryResults = await this.deliverNotificationWithFallback(
            notification,
            {
              sendWebSocket:
                !notification.metadata?.deliveryResults?.websocket?.success,
              sendEmail:
                !notification.metadata?.deliveryResults?.email?.success,
            }
          );

          if (
            deliveryResults.websocket.success ||
            deliveryResults.email.success
          ) {
            retried++;

            // Update notification
            await Notification.findByIdAndUpdate(notification._id, {
              $set: {
                "metadata.bulkRetrySuccessful": true,
                "metadata.bulkRetryTime": new Date(),
                "metadata.deliveryResults": deliveryResults,
              },
            });
          }

          return deliveryResults;
        } catch (error) {
          console.error(
            `Error in bulk retry for notification ${notification._id}:`,
            error
          );
          return { success: false, error: error.message };
        }
      });

      await Promise.allSettled(retryPromises);

      console.log(
        `🔄 Bulk retry completed: ${retried}/${failedNotifications.length} successful`
      );

      return {
        success: true,
        total: failedNotifications.length,
        retried,
        failed: failedNotifications.length - retried,
      };
    } catch (error) {
      console.error("Error in bulk retry:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get fallback statistics and health metrics
   * @returns {Object} Fallback statistics
   */
  getFallbackStatistics() {
    const activeRetries = this.retryQueue.size;
    const trackedFailures = this.failedDeliveries.size;

    return {
      ...this.fallbackStats,
      activeRetries,
      trackedFailures,
      retrySuccessRate:
        this.fallbackStats.retryAttempts > 0
          ? (this.fallbackStats.successfulRetries /
              this.fallbackStats.retryAttempts) *
            100
          : 0,
      fallbackUsageRate:
        this.fallbackStats.websocketFailures > 0
          ? (this.fallbackStats.emailFallbacks /
              this.fallbackStats.websocketFailures) *
            100
          : 0,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Clean up old failed delivery records and completed retries
   * @param {number} maxAge - Maximum age in milliseconds (default: 7 days)
   */
  cleanupFailedDeliveries(maxAge = 7 * 24 * 60 * 60 * 1000) {
    const cutoffTime = Date.now() - maxAge;
    let cleaned = 0;

    for (const [
      notificationId,
      failureInfo,
    ] of this.failedDeliveries.entries()) {
      if (failureInfo.timestamp.getTime() < cutoffTime) {
        this.failedDeliveries.delete(notificationId);
        cleaned++;
      }
    }

    console.log(`🧹 Cleaned up ${cleaned} old failed delivery records`);
    return cleaned;
  }

  /**
   * Create bulk notifications for multiple users
   * @param {Array} users - Array of user objects
   * @param {Object} notificationTemplate - Notification template
   * @returns {Promise<Array>} Created notifications
   */
  async createBulkNotifications(users, notificationTemplate) {
    try {
      const notifications = [];

      for (const user of users) {
        const notification = await this.createNotification({
          ...notificationTemplate,
          userId: user._id || user.id,
        });
        notifications.push(notification);
      }

      return notifications;
    } catch (error) {
      console.error("Error creating bulk notifications:", error);
      throw error;
    }
  }

  /**
   * Broadcast notification to all users with a specific role
   * @param {string} role - User role (admin, vendor, etc.)
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Object>} Broadcast result
   */
  async broadcastToRole(role, notificationData) {
    try {
      console.log(`📢 Broadcasting notification to role: ${role}`);

      // Import user models dynamically to avoid circular dependencies
      const { default: User } = await import("../models/User.js");
      const { default: Vendor } = await import("../models/Vendor.js");

      let users = [];

      // Get users based on role
      if (role === "admin" || role === "super_admin") {
        users = await User.find({ role }).select("_id email");
      } else if (role === "vendor") {
        users = await Vendor.find({ status: "active" }).select("_id email");
      } else {
        // Try both collections
        const adminUsers = await User.find({ role }).select("_id email");
        const vendorUsers = await Vendor.find({ role }).select("_id email");
        users = [...adminUsers, ...vendorUsers];
      }

      if (users.length === 0) {
        return { success: false, reason: `No users found with role: ${role}` };
      }

      // Create notifications for all users
      const notifications = await this.createBulkNotifications(users, {
        ...notificationData,
        sendWebSocket: false, // We'll handle WebSocket separately for efficiency
      });

      // Send WebSocket notification to role room
      const websocketResult = await websocketService.sendNotificationToRole(
        role,
        notifications[0] // Use first notification as template
      );

      console.log(
        `📢 Broadcast to role ${role} completed: ${users.length} users, WebSocket: ${websocketResult.success}`
      );

      return {
        success: true,
        notificationsCreated: notifications.length,
        usersTargeted: users.length,
        websocketDelivery: websocketResult,
      };
    } catch (error) {
      console.error(`Error broadcasting to role ${role}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Broadcast notification to vendors with specific status
   * @param {string} status - Vendor status (active, inactive, pending)
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Object>} Broadcast result
   */
  async broadcastToVendorStatus(status, notificationData) {
    try {
      console.log(`📢 Broadcasting notification to vendor status: ${status}`);

      const { default: Vendor } = await import("../models/Vendor.js");

      const vendors = await Vendor.find({ status }).select("_id email");

      if (vendors.length === 0) {
        return {
          success: false,
          reason: `No vendors found with status: ${status}`,
        };
      }

      // Create notifications for all vendors
      const notifications = await this.createBulkNotifications(vendors, {
        ...notificationData,
        sendWebSocket: false,
      });

      // Send WebSocket notification to vendor status room
      const websocketResult =
        await websocketService.sendNotificationToVendorStatus(
          status,
          notifications[0]
        );

      console.log(
        `📢 Broadcast to vendor status ${status} completed: ${vendors.length} vendors`
      );

      return {
        success: true,
        notificationsCreated: notifications.length,
        vendorsTargeted: vendors.length,
        websocketDelivery: websocketResult,
      };
    } catch (error) {
      console.error(`Error broadcasting to vendor status ${status}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Broadcast system announcement to all active users
   * @param {Object} announcementData - Announcement data
   * @returns {Promise<Object>} Broadcast result
   */
  async broadcastSystemAnnouncement(announcementData) {
    try {
      console.log("📢 Broadcasting system announcement to all users");

      // Get all active users and vendors
      const { default: User } = await import("../models/User.js");
      const { default: Vendor } = await import("../models/Vendor.js");

      const [users, vendors] = await Promise.all([
        User.find({ status: { $ne: "inactive" } }).select("_id email"),
        Vendor.find({ status: "active" }).select("_id email"),
      ]);

      const allUsers = [...users, ...vendors];

      if (allUsers.length === 0) {
        return { success: false, reason: "No active users found" };
      }

      // Create notifications for all users
      const notifications = await this.createBulkNotifications(allUsers, {
        ...announcementData,
        type: "system_announcement",
        sendWebSocket: false,
      });

      // Send WebSocket broadcast
      const websocketResult = await websocketService.sendBroadcastNotification(
        notifications[0]
      );

      // Also send as system announcement
      await websocketService.sendSystemAnnouncement({
        title: announcementData.title,
        message: announcementData.message,
        type: "announcement",
        priority: "high",
      });

      console.log(
        `📢 System announcement broadcast completed: ${allUsers.length} users`
      );

      return {
        success: true,
        notificationsCreated: notifications.length,
        usersTargeted: allUsers.length,
        websocketDelivery: websocketResult,
      };
    } catch (error) {
      console.error("Error broadcasting system announcement:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Broadcast notification to users with specific preferences
   * @param {string} preference - Notification preference type
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Object>} Broadcast result
   */
  async broadcastToPreference(preference, notificationData) {
    try {
      console.log(`📢 Broadcasting notification to preference: ${preference}`);

      // Get users with specific notification preferences enabled
      const { default: User } = await import("../models/User.js");
      const { default: Vendor } = await import("../models/Vendor.js");

      const preferenceQuery = {};
      preferenceQuery[`notificationPreferences.${preference}`] = true;

      const [users, vendors] = await Promise.all([
        User.find(preferenceQuery).select("_id email"),
        Vendor.find(preferenceQuery).select("_id email"),
      ]);

      const allUsers = [...users, ...vendors];

      if (allUsers.length === 0) {
        return {
          success: false,
          reason: `No users found with preference: ${preference}`,
        };
      }

      // Create notifications for all users
      const notifications = await this.createBulkNotifications(allUsers, {
        ...notificationData,
        sendWebSocket: false,
      });

      // Send WebSocket notification to preference room
      const websocketResult =
        await websocketService.sendNotificationToPreference(
          preference,
          notifications[0]
        );

      console.log(
        `📢 Broadcast to preference ${preference} completed: ${allUsers.length} users`
      );

      return {
        success: true,
        notificationsCreated: notifications.length,
        usersTargeted: allUsers.length,
        websocketDelivery: websocketResult,
      };
    } catch (error) {
      console.error(`Error broadcasting to preference ${preference}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Broadcast targeted notification based on multiple criteria
   * @param {Object} criteria - Targeting criteria
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Object>} Broadcast result
   */
  async broadcastTargeted(criteria, notificationData) {
    try {
      console.log("📢 Broadcasting targeted notification", criteria);

      const { userIds, roles, vendorStatuses, preferences, locations } =
        criteria;
      let allUsers = [];

      // Import models
      const { default: User } = await import("../models/User.js");
      const { default: Vendor } = await import("../models/Vendor.js");

      // Collect users based on different criteria
      if (userIds && userIds.length > 0) {
        const users = await User.find({ _id: { $in: userIds } }).select(
          "_id email"
        );
        const vendors = await Vendor.find({ _id: { $in: userIds } }).select(
          "_id email"
        );
        allUsers.push(...users, ...vendors);
      }

      if (roles && roles.length > 0) {
        for (const role of roles) {
          if (role === "vendor") {
            const vendors = await Vendor.find({ status: "active" }).select(
              "_id email"
            );
            allUsers.push(...vendors);
          } else {
            const users = await User.find({ role }).select("_id email");
            allUsers.push(...users);
          }
        }
      }

      if (vendorStatuses && vendorStatuses.length > 0) {
        const vendors = await Vendor.find({
          status: { $in: vendorStatuses },
        }).select("_id email");
        allUsers.push(...vendors);
      }

      if (preferences && preferences.length > 0) {
        for (const preference of preferences) {
          const preferenceQuery = {};
          preferenceQuery[`notificationPreferences.${preference}`] = true;

          const users = await User.find(preferenceQuery).select("_id email");
          const vendors = await Vendor.find(preferenceQuery).select(
            "_id email"
          );
          allUsers.push(...users, ...vendors);
        }
      }

      if (locations && locations.length > 0) {
        const users = await User.find({
          location: { $in: locations },
        }).select("_id email");
        const vendors = await Vendor.find({
          location: { $in: locations },
        }).select("_id email");
        allUsers.push(...users, ...vendors);
      }

      // Remove duplicates
      const uniqueUsers = Array.from(
        new Map(allUsers.map((user) => [user._id.toString(), user])).values()
      );

      if (uniqueUsers.length === 0) {
        return {
          success: false,
          reason: "No users match the targeting criteria",
        };
      }

      // Create notifications for all users
      const notifications = await this.createBulkNotifications(uniqueUsers, {
        ...notificationData,
        sendWebSocket: false,
      });

      // Send WebSocket notification using targeted approach
      const websocketResult = await websocketService.sendTargetedNotification(
        criteria,
        notifications[0]
      );

      console.log(
        `📢 Targeted broadcast completed: ${uniqueUsers.length} users`
      );

      return {
        success: true,
        notificationsCreated: notifications.length,
        usersTargeted: uniqueUsers.length,
        websocketDelivery: websocketResult,
      };
    } catch (error) {
      console.error("Error broadcasting targeted notification:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Broadcast low stock alert to relevant users
   * @param {Object} productData - Product data
   * @param {number} currentStock - Current stock level
   * @param {number} threshold - Low stock threshold
   * @returns {Promise<Object>} Broadcast result
   */
  async broadcastLowStockAlert(productData, currentStock, threshold) {
    try {
      const notificationData = {
        type: "low_stock",
        title: "Low Stock Alert",
        message: `Product "${productData.name}" is running low on stock (${currentStock} remaining, threshold: ${threshold})`,
        metadata: {
          productId: productData._id,
          productName: productData.name,
          currentStock,
          threshold,
          vendorId: productData.vendorId,
        },
      };

      // Broadcast to vendor and admins
      const results = await Promise.all([
        this.createNotification({
          ...notificationData,
          userId: productData.vendorId,
        }),
        this.broadcastToRole("admin", notificationData),
        this.broadcastToPreference("lowStock", notificationData),
      ]);

      return {
        success: true,
        vendorNotified: true,
        adminsBroadcast: results[1],
        preferenceBroadcast: results[2],
      };
    } catch (error) {
      console.error("Error broadcasting low stock alert:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Broadcast new order notification to relevant users
   * @param {Object} orderData - Order data
   * @returns {Promise<Object>} Broadcast result
   */
  async broadcastNewOrderNotification(orderData) {
    try {
      const notificationData = {
        type: "new_order",
        title: "New Order Received",
        message: `New order #${orderData.orderNumber} has been placed`,
        metadata: {
          orderId: orderData._id,
          orderNumber: orderData.orderNumber,
          vendorId: orderData.vendorId,
          totalAmount: orderData.totalAmount,
        },
      };

      // Broadcast to vendor and admins
      const results = await Promise.all([
        this.createNotification({
          ...notificationData,
          userId: orderData.vendorId,
        }),
        this.broadcastToRole("admin", notificationData),
        this.broadcastToPreference("newOrders", notificationData),
      ]);

      return {
        success: true,
        vendorNotified: true,
        adminsBroadcast: results[1],
        preferenceBroadcast: results[2],
      };
    } catch (error) {
      console.error("Error broadcasting new order notification:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Broadcast notification orchestrator - handles complex broadcasting scenarios
   * @param {Object} broadcastConfig - Broadcast configuration
   * @returns {Promise<Object>} Orchestrated broadcast result
   */
  async orchestrateBroadcast(broadcastConfig) {
    try {
      const {
        type,
        notificationData,
        targeting,
        priority = "normal",
        scheduleAt = null,
        retryOnFailure = true,
      } = broadcastConfig;

      console.log(`🎼 Orchestrating broadcast of type: ${type}`);

      const results = {
        type,
        priority,
        startTime: new Date(),
        broadcasts: [],
        totalUsersTargeted: 0,
        totalNotificationsCreated: 0,
        errors: [],
      };

      // Handle scheduled broadcasts
      if (scheduleAt && new Date(scheduleAt) > new Date()) {
        console.log(`⏰ Scheduling broadcast for: ${scheduleAt}`);
        // In a real implementation, you'd use a job queue like Bull or Agenda
        setTimeout(() => {
          this.orchestrateBroadcast({
            ...broadcastConfig,
            scheduleAt: null,
          });
        }, new Date(scheduleAt) - new Date());

        return { success: true, scheduled: true, scheduleAt };
      }

      // Execute different targeting strategies
      if (targeting.roles && targeting.roles.length > 0) {
        for (const role of targeting.roles) {
          try {
            const result = await this.broadcastToRole(role, notificationData);
            results.broadcasts.push({ type: "role", target: role, ...result });
            if (result.success) {
              results.totalUsersTargeted += result.usersTargeted || 0;
              results.totalNotificationsCreated +=
                result.notificationsCreated || 0;
            }
          } catch (error) {
            results.errors.push({
              type: "role",
              target: role,
              error: error.message,
            });
          }
        }
      }

      if (targeting.vendorStatuses && targeting.vendorStatuses.length > 0) {
        for (const status of targeting.vendorStatuses) {
          try {
            const result = await this.broadcastToVendorStatus(
              status,
              notificationData
            );
            results.broadcasts.push({
              type: "vendorStatus",
              target: status,
              ...result,
            });
            if (result.success) {
              results.totalUsersTargeted += result.vendorsTargeted || 0;
              results.totalNotificationsCreated +=
                result.notificationsCreated || 0;
            }
          } catch (error) {
            results.errors.push({
              type: "vendorStatus",
              target: status,
              error: error.message,
            });
          }
        }
      }

      if (targeting.preferences && targeting.preferences.length > 0) {
        for (const preference of targeting.preferences) {
          try {
            const result = await this.broadcastToPreference(
              preference,
              notificationData
            );
            results.broadcasts.push({
              type: "preference",
              target: preference,
              ...result,
            });
            if (result.success) {
              results.totalUsersTargeted += result.usersTargeted || 0;
              results.totalNotificationsCreated +=
                result.notificationsCreated || 0;
            }
          } catch (error) {
            results.errors.push({
              type: "preference",
              target: preference,
              error: error.message,
            });
          }
        }
      }

      if (targeting.userIds && targeting.userIds.length > 0) {
        try {
          const result = await this.broadcastTargeted(
            { userIds: targeting.userIds },
            notificationData
          );
          results.broadcasts.push({
            type: "targeted",
            target: "userIds",
            ...result,
          });
          if (result.success) {
            results.totalUsersTargeted += result.usersTargeted || 0;
            results.totalNotificationsCreated +=
              result.notificationsCreated || 0;
          }
        } catch (error) {
          results.errors.push({
            type: "targeted",
            target: "userIds",
            error: error.message,
          });
        }
      }

      if (targeting.broadcast === "all") {
        try {
          const result = await this.broadcastSystemAnnouncement(
            notificationData
          );
          results.broadcasts.push({
            type: "systemAnnouncement",
            target: "all",
            ...result,
          });
          if (result.success) {
            results.totalUsersTargeted += result.usersTargeted || 0;
            results.totalNotificationsCreated +=
              result.notificationsCreated || 0;
          }
        } catch (error) {
          results.errors.push({
            type: "systemAnnouncement",
            target: "all",
            error: error.message,
          });
        }
      }

      results.endTime = new Date();
      results.duration = results.endTime - results.startTime;
      results.success =
        results.broadcasts.some((b) => b.success) &&
        results.errors.length === 0;

      // Handle retries for failed broadcasts
      if (!results.success && retryOnFailure && results.errors.length > 0) {
        console.log(
          `🔄 Retrying failed broadcasts (${results.errors.length} errors)`
        );
        // Implement retry logic here
      }

      console.log(`🎼 Broadcast orchestration completed:`, {
        type,
        success: results.success,
        duration: `${results.duration}ms`,
        usersTargeted: results.totalUsersTargeted,
        notificationsCreated: results.totalNotificationsCreated,
        errors: results.errors.length,
      });

      return results;
    } catch (error) {
      console.error("Error orchestrating broadcast:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get broadcasting statistics and health metrics
   * @returns {Promise<Object>} Broadcasting statistics
   */
  async getBroadcastingStatistics() {
    try {
      const now = new Date();
      const last24Hours = new Date(now - 24 * 60 * 60 * 1000);
      const last7Days = new Date(now - 7 * 24 * 60 * 60 * 1000);

      // Get notification statistics
      const [total, last24HoursCount, last7DaysCount, unreadCount, byType] =
        await Promise.all([
          Notification.countDocuments(),
          Notification.countDocuments({ createdAt: { $gte: last24Hours } }),
          Notification.countDocuments({ createdAt: { $gte: last7Days } }),
          Notification.countDocuments({ isRead: false }),
          Notification.aggregate([
            { $group: { _id: "$type", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ]),
        ]);

      // Get WebSocket connection statistics
      const websocketStats = websocketService.getConnectionInfo();

      return {
        notifications: {
          total,
          last24Hours: last24HoursCount,
          last7Days: last7DaysCount,
          unread: unreadCount,
          byType: byType.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
        },
        websocket: websocketStats,
        broadcasting: {
          enabled: this.config.websocket.enabled && this.config.email.enabled,
          websocketEnabled: this.config.websocket.enabled,
          emailEnabled: this.config.email.enabled,
          activeConnections: websocketStats.total,
          authenticatedConnections: websocketStats.authenticated,
        },
        timestamp: now.toISOString(),
      };
    } catch (error) {
      console.error("Error getting broadcasting statistics:", error);
      return { error: error.message };
    }
  }

  /**
   * Test broadcasting system with a sample notification
   * @param {string} testType - Type of test to run
   * @returns {Promise<Object>} Test results
   */
  async testBroadcastingSystem(testType = "basic") {
    try {
      console.log(`🧪 Testing broadcasting system: ${testType}`);

      const testNotification = {
        type: "system_test",
        title: "Broadcasting System Test",
        message: `Test notification sent at ${new Date().toISOString()}`,
        metadata: {
          testType,
          timestamp: new Date().toISOString(),
        },
      };

      const results = {
        testType,
        startTime: new Date(),
        tests: [],
        websocketConnections: websocketService.getConnectionInfo().total,
      };

      switch (testType) {
        case "basic":
          // Test WebSocket broadcast
          const websocketTest =
            await websocketService.sendBroadcastNotification({
              ...testNotification,
              _id: "test-notification-id",
            });
          results.tests.push({ name: "WebSocket Broadcast", ...websocketTest });
          break;

        case "role":
          // Test role-based broadcast
          const roleTest = await this.broadcastToRole(
            "admin",
            testNotification
          );
          results.tests.push({ name: "Role Broadcast", ...roleTest });
          break;

        case "comprehensive":
          // Test multiple broadcasting methods
          const tests = await Promise.allSettled([
            websocketService.sendBroadcastNotification({
              ...testNotification,
              _id: "test-notification-id-1",
            }),
            this.broadcastToRole("admin", testNotification),
            websocketService.sendSystemAnnouncement({
              title: "Test Announcement",
              message: "System test announcement",
            }),
          ]);

          results.tests = tests.map((test, index) => ({
            name: ["WebSocket", "Role", "System Announcement"][index],
            success: test.status === "fulfilled",
            result: test.status === "fulfilled" ? test.value : test.reason,
          }));
          break;

        default:
          throw new Error(`Unknown test type: ${testType}`);
      }

      results.endTime = new Date();
      results.duration = results.endTime - results.startTime;
      results.success = results.tests.every((test) => test.success);

      console.log(`🧪 Broadcasting system test completed:`, {
        testType,
        success: results.success,
        duration: `${results.duration}ms`,
        testsRun: results.tests.length,
      });

      return results;
    } catch (error) {
      console.error("Error testing broadcasting system:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get notifications for a user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @param {number} options.page - Page number (default: 1)
   * @param {number} options.limit - Items per page (default: 20)
   * @param {boolean} options.unreadOnly - Only unread notifications
   * @param {string} options.type - Filter by notification type
   * @returns {Promise<Object>} Paginated notifications
   */
  async getUserNotifications(
    userId,
    { page = 1, limit = 20, unreadOnly = false, type = null } = {}
  ) {
    try {
      const query = { userId };

      if (unreadOnly) {
        query.isRead = false;
      }

      if (type) {
        query.type = type;
      }

      const skip = (page - 1) * limit;

      const [notifications, total] = await Promise.all([
        Notification.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Notification.countDocuments(query),
      ]);

      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error fetching user notifications:", error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID (for security)
   * @returns {Promise<Object>} Updated notification
   */
  async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { isRead: true, readAt: new Date() },
        { new: true }
      );

      if (!notification) {
        throw new Error("Notification not found or unauthorized");
      }

      return notification;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Update result
   */
  async markAllAsRead(userId) {
    try {
      const result = await Notification.updateMany(
        { userId, isRead: false },
        { isRead: true, readAt: new Date() }
      );

      return result;
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      throw error;
    }
  }

  /**
   * Delete notification
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID (for security)
   * @returns {Promise<boolean>} Success status
   */
  async deleteNotification(notificationId, userId) {
    try {
      const result = await Notification.deleteOne({
        _id: notificationId,
        userId,
      });

      return result.deletedCount > 0;
    } catch (error) {
      console.error("Error deleting notification:", error);
      throw error;
    }
  }

  /**
   * Get unread notification count for user
   * @param {string} userId - User ID
   * @returns {Promise<number>} Unread count
   */
  async getUnreadCount(userId) {
    try {
      const count = await Notification.countDocuments({
        userId,
        isRead: false,
      });

      return count;
    } catch (error) {
      console.error("Error getting unread count:", error);
      throw error;
    }
  }

  /**
   * Clean up old notifications based on retention policy
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupOldNotifications() {
    try {
      const retentionDate = new Date();
      retentionDate.setDate(
        retentionDate.getDate() - this.config.cleanup.retentionDays
      );

      const result = await Notification.deleteMany({
        createdAt: { $lt: retentionDate },
      });

      console.log(
        `🧹 Cleaned up ${result.deletedCount} old notifications (older than ${this.config.cleanup.retentionDays} days)`
      );

      return result;
    } catch (error) {
      console.error("Error cleaning up old notifications:", error);
      throw error;
    }
  }

  /**
   * Send notification to role (all users with specific role)
   * @param {string} role - User role
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Array>} Created notifications
   */
  async sendToRole(role, notificationData) {
    try {
      console.log(`🔍 Looking for users with role: ${role}`);

      // Import here to avoid circular dependency
      const User = (await import("../models/User.js")).default;
      const Vendor = (await import("../models/Vendor.js")).default;

      let users = [];

      if (role === this.config.roles.SUPER_ADMIN) {
        // Look for both "super_admin" and "superadmin" role formats
        users = await User.find({
          $or: [{ role: "super_admin" }, { role: "superadmin" }],
        }).select("_id email");
        console.log(
          `👥 Found ${users.length} super admin users:`,
          users.map((u) => u.email)
        );
      } else if (role === this.config.roles.VENDOR) {
        users = await Vendor.find({ status: "active" }).select("_id email");
        console.log(`👥 Found ${users.length} active vendor users`);
      }

      if (users.length === 0) {
        console.log(`⚠️  No users found with role: ${role}`);
        return [];
      }

      console.log(
        `📤 Creating ${users.length} notifications for role: ${role}`
      );
      const result = await this.createBulkNotifications(
        users,
        notificationData
      );
      console.log(`✅ Successfully created notifications for role: ${role}`);

      return result;
    } catch (error) {
      console.error("❌ Error sending notification to role:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;
