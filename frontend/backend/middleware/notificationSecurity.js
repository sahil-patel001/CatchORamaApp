import crypto from "crypto";
import { NotificationUtils } from "../utils/notificationUtils.js";

/**
 * Notification Security Middleware
 * Additional security measures for notification operations
 */

/**
 * Generate and validate CSRF tokens for notification operations
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const csrfProtection = (req, res, next) => {
  try {
    // Skip CSRF for GET requests
    if (req.method === "GET") {
      return next();
    }

    // Skip CSRF for WebSocket connections
    if (req.headers.upgrade === "websocket") {
      return next();
    }

    const token = req.headers["x-csrf-token"] || req.body._csrf;
    const sessionToken = req.session?.csrfToken;

    if (!token || !sessionToken || token !== sessionToken) {
      return res.status(403).json({
        error: "Invalid or missing CSRF token",
        code: "CSRF_TOKEN_INVALID",
      });
    }

    next();
  } catch (error) {
    console.error("CSRF protection error:", error);
    res.status(500).json({
      error: "CSRF validation error",
      code: "CSRF_VALIDATION_ERROR",
    });
  }
};

/**
 * Generate CSRF token for client
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const generateCSRFToken = (req, res, next) => {
  try {
    if (!req.session) {
      console.warn("Session not available for CSRF token generation");
      return next();
    }

    const token = crypto.randomBytes(32).toString("hex");
    req.session.csrfToken = token;
    res.locals.csrfToken = token;

    next();
  } catch (error) {
    console.error("CSRF token generation error:", error);
    next(); // Continue without CSRF token
  }
};

/**
 * Validate notification content for security issues
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const validateNotificationSecurity = (req, res, next) => {
  try {
    const notificationData = req.validatedNotification || req.body;

    if (!notificationData) {
      return next();
    }

    const securityIssues = [];

    // Check for potentially malicious content
    const suspiciousPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /<object[^>]*>.*?<\/object>/gi,
      /<embed[^>]*>/gi,
      /data:text\/html/gi,
    ];

    const textFields = [notificationData.title, notificationData.message];

    textFields.forEach((field, index) => {
      if (field && typeof field === "string") {
        suspiciousPatterns.forEach((pattern) => {
          if (pattern.test(field)) {
            securityIssues.push(
              `Suspicious content detected in ${
                index === 0 ? "title" : "message"
              }`
            );
          }
        });
      }
    });

    // Check metadata for suspicious content
    if (
      notificationData.metadata &&
      typeof notificationData.metadata === "object"
    ) {
      Object.entries(notificationData.metadata).forEach(([key, value]) => {
        if (typeof value === "string") {
          suspiciousPatterns.forEach((pattern) => {
            if (pattern.test(value)) {
              securityIssues.push(
                `Suspicious content detected in metadata.${key}`
              );
            }
          });
        }
      });
    }

    // Check for excessively long content (potential DoS)
    if (notificationData.title && notificationData.title.length > 500) {
      securityIssues.push("Title exceeds maximum allowed length");
    }

    if (notificationData.message && notificationData.message.length > 2000) {
      securityIssues.push("Message exceeds maximum allowed length");
    }

    // Check for suspicious URLs in metadata
    if (notificationData.metadata?.actionUrl) {
      const url = notificationData.metadata.actionUrl;

      // Only allow relative URLs or URLs from allowed domains
      if (
        url.startsWith("http") &&
        !url.startsWith(process.env.ALLOWED_DOMAIN || "http://localhost")
      ) {
        securityIssues.push("External URLs not allowed in action URL");
      }

      // Check for suspicious URL patterns
      if (/javascript:|data:|vbscript:/i.test(url)) {
        securityIssues.push("Suspicious URL scheme detected");
      }
    }

    if (securityIssues.length > 0) {
      return res.status(400).json({
        error: "Security validation failed",
        code: "SECURITY_VALIDATION_FAILED",
        issues: securityIssues,
      });
    }

    next();
  } catch (error) {
    console.error("Notification security validation error:", error);
    res.status(500).json({
      error: "Security validation error",
      code: "SECURITY_VALIDATION_ERROR",
    });
  }
};

/**
 * IP-based access control for notifications
 * @param {Object} options - IP filtering options
 * @returns {Function} Express middleware
 */
export const ipAccessControl = (options = {}) => {
  const { allowedIPs = [], blockedIPs = [], enabled = false } = options;

  return (req, res, next) => {
    if (!enabled) {
      return next();
    }

    const clientIP = req.ip || req.connection.remoteAddress;

    // Check blocked IPs first
    if (blockedIPs.length > 0 && blockedIPs.includes(clientIP)) {
      return res.status(403).json({
        error: "Access denied from this IP address",
        code: "IP_BLOCKED",
      });
    }

    // Check allowed IPs if specified
    if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
      return res.status(403).json({
        error: "Access denied from this IP address",
        code: "IP_NOT_ALLOWED",
      });
    }

    next();
  };
};

/**
 * Detect and prevent notification spam
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const spamDetection = (req, res, next) => {
  try {
    const userId = req.notificationUser?.id;
    const notificationData = req.validatedNotification;

    if (!userId || !notificationData) {
      return next();
    }

    // Simple spam detection based on content similarity and frequency
    const contentHash = crypto
      .createHash("sha256")
      .update(`${notificationData.title}${notificationData.message}`)
      .digest("hex");

    // Store in memory for demo (use Redis in production)
    if (!req.app.locals.spamTracker) {
      req.app.locals.spamTracker = new Map();
    }

    const spamTracker = req.app.locals.spamTracker;
    const userKey = `${userId}:${contentHash}`;
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    // Clean old entries
    for (const [key, timestamps] of spamTracker.entries()) {
      const filteredTimestamps = timestamps.filter((ts) => ts > fiveMinutesAgo);
      if (filteredTimestamps.length === 0) {
        spamTracker.delete(key);
      } else {
        spamTracker.set(key, filteredTimestamps);
      }
    }

    // Check for spam
    const userTimestamps = spamTracker.get(userKey) || [];
    const recentCount = userTimestamps.filter(
      (ts) => ts > fiveMinutesAgo
    ).length;

    if (recentCount >= 5) {
      // Max 5 identical notifications per 5 minutes
      return res.status(429).json({
        error: "Potential spam detected. Too many similar notifications",
        code: "SPAM_DETECTED",
        retryAfter: 300, // 5 minutes
      });
    }

    // Add current timestamp
    userTimestamps.push(now);
    spamTracker.set(userKey, userTimestamps);

    next();
  } catch (error) {
    console.error("Spam detection error:", error);
    next(); // Continue on error to avoid blocking legitimate notifications
  }
};

/**
 * Audit trail for notification operations
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const auditTrail = (req, res, next) => {
  try {
    const auditData = {
      timestamp: new Date().toISOString(),
      userId: req.notificationUser?.id,
      userRole: req.notificationUser?.role,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      method: req.method,
      path: req.path,
      operation: req.notificationAuditLog?.operation,
    };

    // Add sensitive operation details
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      auditData.body = {
        type: req.validatedNotification?.type,
        targetUserId: req.validatedNotification?.userId,
      };
    }

    // Log to audit system (could be database, file, or external service)
    console.log("🔍 Notification Audit:", JSON.stringify(auditData, null, 2));

    // Store audit data for potential use by other middleware
    req.auditTrail = auditData;

    next();
  } catch (error) {
    console.error("Audit trail error:", error);
    next(); // Continue on error
  }
};

/**
 * Encrypt sensitive notification data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const encryptSensitiveData = (req, res, next) => {
  try {
    const notificationData = req.validatedNotification;

    if (!notificationData || !process.env.NOTIFICATION_ENCRYPTION_KEY) {
      return next();
    }

    // Encrypt sensitive metadata fields
    if (notificationData.metadata) {
      const sensitiveFields = ["email", "phone", "address", "personalInfo"];
      const encryptionKey = process.env.NOTIFICATION_ENCRYPTION_KEY;

      sensitiveFields.forEach((field) => {
        if (notificationData.metadata[field]) {
          const cipher = crypto.createCipher("aes-256-cbc", encryptionKey);
          let encrypted = cipher.update(
            notificationData.metadata[field],
            "utf8",
            "hex"
          );
          encrypted += cipher.final("hex");
          notificationData.metadata[field] = encrypted;
          notificationData.metadata[`${field}_encrypted`] = true;
        }
      });

      req.validatedNotification = notificationData;
    }

    next();
  } catch (error) {
    console.error("Encryption error:", error);
    next(); // Continue without encryption on error
  }
};

/**
 * Content filtering for inappropriate content
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const contentFilter = (req, res, next) => {
  try {
    const notificationData = req.validatedNotification || req.body;

    if (!notificationData) {
      return next();
    }

    // Simple profanity filter (in production, use a proper library)
    const inappropriateWords = [
      // Add inappropriate words here
      "spam",
      "scam",
      "fraud",
      "hack",
      "virus",
    ];

    const textContent = [notificationData.title, notificationData.message]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const foundInappropriate = inappropriateWords.some((word) =>
      textContent.includes(word.toLowerCase())
    );

    if (foundInappropriate) {
      return res.status(400).json({
        error: "Content contains inappropriate language",
        code: "INAPPROPRIATE_CONTENT",
      });
    }

    next();
  } catch (error) {
    console.error("Content filtering error:", error);
    next(); // Continue on error
  }
};

export default {
  csrfProtection,
  generateCSRFToken,
  validateNotificationSecurity,
  ipAccessControl,
  spamDetection,
  auditTrail,
  encryptSensitiveData,
  contentFilter,
};
