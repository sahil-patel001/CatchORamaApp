import { NotificationUtils } from "../utils/notificationUtils.js";
import { notificationConfig } from "../config/notification.js";

/**
 * Notification Preferences Middleware
 * Handles user notification preferences and settings
 */

/**
 * Load user notification preferences
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const loadUserPreferences = async (req, res, next) => {
  try {
    if (!req.notificationUser) {
      return res.status(401).json({
        error: "Notification access required",
        code: "NOTIFICATION_ACCESS_REQUIRED",
      });
    }

    // In a real application, this would load from a UserPreferences model
    // For now, we'll use default preferences
    const defaultPreferences = {
      enabled: true,
      email: {
        enabled: true,
        [notificationConfig.types.LOW_STOCK]: true,
        [notificationConfig.types.NEW_ORDER]: true,
        [notificationConfig.types.CUBIC_VOLUME_ALERT]: true,
        [notificationConfig.types.COMMISSION_UPDATE]: true,
        [notificationConfig.types.PRODUCT_ARCHIVED]: true,
        [notificationConfig.types.VENDOR_STATUS_CHANGE]: true,
        [notificationConfig.types.SYSTEM_ALERT]: true,
      },
      websocket: {
        enabled: true,
        [notificationConfig.types.LOW_STOCK]: true,
        [notificationConfig.types.NEW_ORDER]: true,
        [notificationConfig.types.CUBIC_VOLUME_ALERT]: true,
        [notificationConfig.types.COMMISSION_UPDATE]: true,
        [notificationConfig.types.PRODUCT_ARCHIVED]: true,
        [notificationConfig.types.VENDOR_STATUS_CHANGE]: true,
        [notificationConfig.types.SYSTEM_ALERT]: true,
      },
      categories: {
        inventory: true,
        orders: true,
        financial: true,
        products: true,
        account: true,
        system: true,
        compliance: true,
        general: true,
      },
      digest: {
        enabled: false,
        frequency: "weekly", // daily, weekly, monthly
        time: "09:00",
        timezone: "UTC",
      },
      quietHours: {
        enabled: false,
        start: "22:00",
        end: "08:00",
        timezone: "UTC",
      },
    };

    // TODO: Load actual preferences from database
    // const preferences = await UserNotificationPreferences.findOne({
    //   userId: req.notificationUser.id
    // });

    req.userNotificationPreferences = defaultPreferences;

    next();
  } catch (error) {
    console.error("Error loading user notification preferences:", error);
    res.status(500).json({
      error: "Failed to load notification preferences",
      code: "PREFERENCES_LOAD_ERROR",
    });
  }
};

/**
 * Check if notifications should be sent based on quiet hours
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const checkQuietHours = (req, res, next) => {
  try {
    const preferences = req.userNotificationPreferences;

    if (!preferences?.quietHours?.enabled) {
      return next();
    }

    const now = new Date();
    const currentTime = now.toTimeString().substring(0, 5); // HH:MM format

    const { start, end } = preferences.quietHours;

    // Check if current time is within quiet hours
    let isQuietHour = false;

    if (start <= end) {
      // Same day quiet hours (e.g., 22:00 to 23:59)
      isQuietHour = currentTime >= start && currentTime <= end;
    } else {
      // Overnight quiet hours (e.g., 22:00 to 08:00)
      isQuietHour = currentTime >= start || currentTime <= end;
    }

    if (isQuietHour) {
      // Store notification for later delivery instead of sending immediately
      req.notificationDeliveryMode = "delayed";
      req.notificationDelayReason = "quiet_hours";
    }

    next();
  } catch (error) {
    console.error("Error checking quiet hours:", error);
    next(); // Continue on error to avoid blocking notifications
  }
};

/**
 * Apply user preferences to notification delivery
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const applyUserPreferences = (req, res, next) => {
  try {
    const preferences = req.userNotificationPreferences;
    const notificationData = req.validatedNotification;

    if (!preferences || !notificationData) {
      return next();
    }

    // Check if notifications are globally disabled for user
    if (!preferences.enabled) {
      req.notificationDelivery = {
        channels: { email: false, websocket: false },
        reason: "user_disabled",
      };
      return next();
    }

    // Get the delivery channels based on user preferences
    const channels = NotificationUtils.helper.getDeliveryChannels(
      req.notificationUser.id,
      notificationData.type,
      preferences
    );

    // Override delivery channels based on preferences
    if (!preferences.email?.enabled) {
      channels.email = false;
    }

    if (!preferences.websocket?.enabled) {
      channels.websocket = false;
    }

    // Check type-specific preferences
    if (preferences.email?.[notificationData.type] === false) {
      channels.email = false;
    }

    if (preferences.websocket?.[notificationData.type] === false) {
      channels.websocket = false;
    }

    // Check category preferences
    const typeConfig = NotificationUtils.helper.getTypeConfig(
      notificationData.type
    );
    if (preferences.categories?.[typeConfig.category] === false) {
      channels.email = false;
      channels.websocket = false;
    }

    req.notificationDelivery = {
      ...req.notificationDelivery,
      channels,
      preferences: {
        applied: true,
        quietHours: req.notificationDelayReason === "quiet_hours",
      },
    };

    next();
  } catch (error) {
    console.error("Error applying user preferences:", error);
    next(); // Continue on error to avoid blocking notifications
  }
};

/**
 * Validate notification preferences data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const validatePreferencesData = (req, res, next) => {
  try {
    const preferencesData = req.body;

    if (!preferencesData || typeof preferencesData !== "object") {
      return res.status(400).json({
        error: "Preferences data is required",
        code: "PREFERENCES_DATA_REQUIRED",
      });
    }

    const errors = [];

    // Validate enabled flag
    if (
      preferencesData.enabled !== undefined &&
      typeof preferencesData.enabled !== "boolean"
    ) {
      errors.push("enabled must be a boolean");
    }

    // Validate email preferences
    if (preferencesData.email) {
      if (typeof preferencesData.email !== "object") {
        errors.push("email preferences must be an object");
      } else {
        if (
          preferencesData.email.enabled !== undefined &&
          typeof preferencesData.email.enabled !== "boolean"
        ) {
          errors.push("email.enabled must be a boolean");
        }

        // Validate type-specific preferences
        Object.values(notificationConfig.types).forEach((type) => {
          if (
            preferencesData.email[type] !== undefined &&
            typeof preferencesData.email[type] !== "boolean"
          ) {
            errors.push(`email.${type} must be a boolean`);
          }
        });
      }
    }

    // Validate websocket preferences
    if (preferencesData.websocket) {
      if (typeof preferencesData.websocket !== "object") {
        errors.push("websocket preferences must be an object");
      } else {
        if (
          preferencesData.websocket.enabled !== undefined &&
          typeof preferencesData.websocket.enabled !== "boolean"
        ) {
          errors.push("websocket.enabled must be a boolean");
        }

        // Validate type-specific preferences
        Object.values(notificationConfig.types).forEach((type) => {
          if (
            preferencesData.websocket[type] !== undefined &&
            typeof preferencesData.websocket[type] !== "boolean"
          ) {
            errors.push(`websocket.${type} must be a boolean`);
          }
        });
      }
    }

    // Validate category preferences
    if (preferencesData.categories) {
      if (typeof preferencesData.categories !== "object") {
        errors.push("category preferences must be an object");
      } else {
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
        Object.entries(preferencesData.categories).forEach(
          ([category, enabled]) => {
            if (!validCategories.includes(category)) {
              errors.push(`Invalid category: ${category}`);
            }
            if (typeof enabled !== "boolean") {
              errors.push(`categories.${category} must be a boolean`);
            }
          }
        );
      }
    }

    // Validate digest preferences
    if (preferencesData.digest) {
      if (typeof preferencesData.digest !== "object") {
        errors.push("digest preferences must be an object");
      } else {
        if (
          preferencesData.digest.enabled !== undefined &&
          typeof preferencesData.digest.enabled !== "boolean"
        ) {
          errors.push("digest.enabled must be a boolean");
        }

        if (
          preferencesData.digest.frequency &&
          !["daily", "weekly", "monthly"].includes(
            preferencesData.digest.frequency
          )
        ) {
          errors.push("digest.frequency must be daily, weekly, or monthly");
        }

        if (
          preferencesData.digest.time &&
          !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(preferencesData.digest.time)
        ) {
          errors.push("digest.time must be in HH:MM format");
        }
      }
    }

    // Validate quiet hours preferences
    if (preferencesData.quietHours) {
      if (typeof preferencesData.quietHours !== "object") {
        errors.push("quiet hours preferences must be an object");
      } else {
        if (
          preferencesData.quietHours.enabled !== undefined &&
          typeof preferencesData.quietHours.enabled !== "boolean"
        ) {
          errors.push("quietHours.enabled must be a boolean");
        }

        if (
          preferencesData.quietHours.start &&
          !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(
            preferencesData.quietHours.start
          )
        ) {
          errors.push("quietHours.start must be in HH:MM format");
        }

        if (
          preferencesData.quietHours.end &&
          !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(
            preferencesData.quietHours.end
          )
        ) {
          errors.push("quietHours.end must be in HH:MM format");
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: "Invalid preferences data",
        code: "INVALID_PREFERENCES_DATA",
        details: errors,
      });
    }

    req.validatedPreferences = preferencesData;
    next();
  } catch (error) {
    console.error("Error validating preferences data:", error);
    res.status(500).json({
      error: "Internal server error during preferences validation",
      code: "PREFERENCES_VALIDATION_ERROR",
    });
  }
};

/**
 * Check if user has permission to modify preferences
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const requirePreferencesAccess = (req, res, next) => {
  try {
    if (!req.notificationUser) {
      return res.status(401).json({
        error: "Authentication required",
        code: "AUTHENTICATION_REQUIRED",
      });
    }

    const targetUserId = req.params.userId || req.notificationUser.id;

    // Users can only modify their own preferences unless they're admin
    if (
      req.notificationUser.role !== "super_admin" &&
      targetUserId !== req.notificationUser.id
    ) {
      return res.status(403).json({
        error: "Insufficient permissions to modify preferences",
        code: "INSUFFICIENT_PERMISSIONS",
      });
    }

    req.targetUserId = targetUserId;
    next();
  } catch (error) {
    console.error("Error checking preferences access:", error);
    res.status(500).json({
      error: "Internal server error during preferences access check",
      code: "PREFERENCES_ACCESS_ERROR",
    });
  }
};

/**
 * Generate notification preferences summary
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const generatePreferencesSummary = (req, res, next) => {
  try {
    const preferences = req.userNotificationPreferences;

    if (!preferences) {
      return next();
    }

    const summary = {
      globalEnabled: preferences.enabled,
      emailEnabled: preferences.email?.enabled,
      websocketEnabled: preferences.websocket?.enabled,
      totalTypes: Object.values(notificationConfig.types).length,
      enabledTypes: {
        email: 0,
        websocket: 0,
      },
      enabledCategories: 0,
      digestEnabled: preferences.digest?.enabled,
      quietHoursEnabled: preferences.quietHours?.enabled,
    };

    // Count enabled types
    Object.values(notificationConfig.types).forEach((type) => {
      if (preferences.email?.[type] !== false) {
        summary.enabledTypes.email++;
      }
      if (preferences.websocket?.[type] !== false) {
        summary.enabledTypes.websocket++;
      }
    });

    // Count enabled categories
    Object.entries(preferences.categories || {}).forEach(
      ([category, enabled]) => {
        if (enabled !== false) {
          summary.enabledCategories++;
        }
      }
    );

    req.preferencesSummary = summary;
    next();
  } catch (error) {
    console.error("Error generating preferences summary:", error);
    next(); // Continue on error
  }
};

export default {
  loadUserPreferences,
  checkQuietHours,
  applyUserPreferences,
  validatePreferencesData,
  requirePreferencesAccess,
  generatePreferencesSummary,
};
