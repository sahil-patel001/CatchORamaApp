/**
 * Notification Middleware Index
 * Centralized export for all notification-related middleware
 */

// Import all notification middleware modules
import * as auth from "./notificationAuth.js";
import * as preferences from "./notificationPreferences.js";
import * as security from "./notificationSecurity.js";
import * as websocketAuth from "./websocketAuth.js";

/**
 * Comprehensive notification middleware object
 * Provides organized access to all notification middleware functions
 */
export const NotificationMiddleware = {
  // Authentication and authorization
  auth: {
    requireAccess: auth.requireNotificationAccess,
    requireCreateAccess: auth.requireNotificationCreateAccess,
    requireManageAccess: auth.requireNotificationManageAccess,
    requireOwnership: auth.requireNotificationOwnership,
    validateData: auth.validateNotificationData,
    validateQuery: auth.validateNotificationQuery,
    rateLimit: auth.rateLimit,
    checkDeliveryEligibility: auth.checkDeliveryEligibility,
    logOperation: auth.logNotificationOperation,
    handleError: auth.handleNotificationError,
  },

  // User preferences
  preferences: {
    loadUserPreferences: preferences.loadUserPreferences,
    checkQuietHours: preferences.checkQuietHours,
    applyUserPreferences: preferences.applyUserPreferences,
    validatePreferencesData: preferences.validatePreferencesData,
    requirePreferencesAccess: preferences.requirePreferencesAccess,
    generatePreferencesSummary: preferences.generatePreferencesSummary,
  },

  // Security measures
  security: {
    csrfProtection: security.csrfProtection,
    generateCSRFToken: security.generateCSRFToken,
    validateSecurity: security.validateNotificationSecurity,
    ipAccessControl: security.ipAccessControl,
    spamDetection: security.spamDetection,
    auditTrail: security.auditTrail,
    encryptSensitiveData: security.encryptSensitiveData,
    contentFilter: security.contentFilter,
  },

  // WebSocket authentication
  websocket: {
    authenticate: websocketAuth.authenticateSocket,
    authorize: websocketAuth.authorizeSocket,
    rateLimit: websocketAuth.rateLimitSocket,
    validateData: websocketAuth.validateSocketData,
    logEvent: websocketAuth.logSocketEvent,
    handleError: websocketAuth.handleSocketError,
    createAuthenticatedNamespace: websocketAuth.createAuthenticatedNamespace,
  },
};

/**
 * Common middleware chains for different notification operations
 */

/**
 * Standard middleware chain for notification list/read operations
 */
export const notificationReadChain = [
  auth.requireNotificationAccess,
  auth.validateNotificationQuery,
  auth.rateLimit({ maxRequests: 200 }), // Higher limit for reads
  auth.logOperation("read"),
  security.auditTrail,
];

/**
 * Standard middleware chain for notification creation
 */
export const notificationCreateChain = [
  auth.requireNotificationAccess,
  auth.requireNotificationCreateAccess,
  auth.validateNotificationData,
  security.validateNotificationSecurity,
  security.contentFilter,
  security.spamDetection,
  auth.checkDeliveryEligibility,
  preferences.loadUserPreferences,
  preferences.checkQuietHours,
  preferences.applyUserPreferences,
  auth.rateLimit({ maxRequests: 50 }), // Lower limit for creates
  auth.logOperation("create"),
  security.auditTrail,
];

/**
 * Standard middleware chain for notification updates
 */
export const notificationUpdateChain = [
  auth.requireNotificationAccess,
  auth.requireNotificationOwnership,
  auth.validateNotificationData,
  security.validateNotificationSecurity,
  auth.rateLimit({ maxRequests: 100 }),
  auth.logOperation("update"),
  security.auditTrail,
];

/**
 * Standard middleware chain for notification deletion
 */
export const notificationDeleteChain = [
  auth.requireNotificationAccess,
  auth.requireNotificationOwnership,
  auth.rateLimit({ maxRequests: 50 }),
  auth.logOperation("delete"),
  security.auditTrail,
];

/**
 * Standard middleware chain for admin notification operations
 */
export const notificationAdminChain = [
  auth.requireNotificationAccess,
  auth.requireNotificationManageAccess,
  auth.validateNotificationQuery,
  auth.rateLimit({ maxRequests: 500, skipAdmins: true }),
  auth.logOperation("admin"),
  security.auditTrail,
];

/**
 * Standard middleware chain for preferences operations
 */
export const preferencesChain = [
  auth.requireNotificationAccess,
  preferences.requirePreferencesAccess,
  preferences.validatePreferencesData,
  preferences.generatePreferencesSummary,
  auth.rateLimit({ maxRequests: 20 }),
  auth.logOperation("preferences"),
  security.auditTrail,
];

/**
 * WebSocket middleware chain for notification events
 */
export const websocketChain = [
  websocketAuth.authenticateSocket,
  websocketAuth.rateLimitSocket(),
  websocketAuth.logSocketEvent("notification"),
];

/**
 * Helper function to create custom middleware chains
 * @param {Array} middlewares - Array of middleware functions
 * @param {Object} options - Chain options
 * @returns {Array} Middleware chain
 */
export const createMiddlewareChain = (middlewares, options = {}) => {
  const chain = [...middlewares];

  // Add common middleware if requested
  if (options.includeAuth !== false) {
    chain.unshift(auth.requireNotificationAccess);
  }

  if (options.includeRateLimit !== false) {
    const rateLimitOptions = options.rateLimit || {};
    chain.push(auth.rateLimit(rateLimitOptions));
  }

  if (options.includeAudit !== false) {
    chain.push(security.auditTrail);
  }

  if (options.includeErrorHandler !== false) {
    chain.push(auth.handleNotificationError);
  }

  return chain;
};

/**
 * Conditional middleware application
 * @param {Function} condition - Function that returns boolean
 * @param {Function} middleware - Middleware to apply conditionally
 * @returns {Function} Conditional middleware
 */
export const conditionalMiddleware = (condition, middleware) => {
  return (req, res, next) => {
    if (condition(req, res)) {
      return middleware(req, res, next);
    }
    next();
  };
};

/**
 * Async middleware wrapper for error handling
 * @param {Function} asyncMiddleware - Async middleware function
 * @returns {Function} Wrapped middleware
 */
export const asyncMiddleware = (asyncMiddleware) => {
  return (req, res, next) => {
    Promise.resolve(asyncMiddleware(req, res, next)).catch(next);
  };
};

// Export individual middleware modules for direct access
export { auth, preferences, security, websocketAuth };

// Export commonly used middleware functions directly
export {
  requireNotificationAccess,
  validateNotificationData,
  validateNotificationQuery,
  requireNotificationOwnership,
  loadUserPreferences,
  applyUserPreferences,
} from "./notificationAuth.js";

export {
  authenticateSocket,
  authorizeSocket,
  rateLimitSocket,
} from "./websocketAuth.js";

export default NotificationMiddleware;
