import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Vendor from "../models/Vendor.js";

/**
 * WebSocket Authentication Middleware
 * Handles authentication for Socket.IO connections
 */

/**
 * Extract token from Socket.IO handshake
 * @param {Object} socket - Socket.IO socket instance
 * @returns {string|null} JWT token
 */
const extractToken = (socket) => {
  // Try to get token from auth header
  const authHeader = socket.handshake.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // Try to get token from query parameters
  if (socket.handshake.query.token) {
    return socket.handshake.query.token;
  }

  // Try to get token from cookies
  if (socket.handshake.headers.cookie) {
    const cookies = socket.handshake.headers.cookie
      .split(";")
      .map((cookie) => cookie.trim().split("="))
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {});

    if (cookies.token) {
      return cookies.token;
    }
  }

  return null;
};

/**
 * Authenticate WebSocket connection
 * @param {Object} socket - Socket.IO socket instance
 * @param {Function} next - Next middleware function
 */
export const authenticateSocket = async (socket, next) => {
  try {
    const token = extractToken(socket);

    if (!token) {
      return next(new Error("Authentication token required"));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded.id) {
      return next(new Error("Invalid authentication token"));
    }

    // Find user in database
    let user = await User.findById(decoded.id).select("-password");

    // If not found in User collection, try Vendor collection
    if (!user) {
      user = await Vendor.findById(decoded.id).select("-password");
    }

    if (!user) {
      return next(new Error("User not found"));
    }

    // Check if user/vendor is active
    if (user.status && user.status !== "active") {
      return next(new Error("Account is not active"));
    }

    // Attach user data to socket
    socket.user = user;
    socket.userId = user._id.toString();
    socket.userRole = user.role || "vendor"; // Default to vendor for Vendor collection

    console.log(
      `🔐 WebSocket authenticated: User ${socket.userId} (${socket.userRole})`
    );

    next();
  } catch (error) {
    console.error("WebSocket authentication error:", error);

    if (error.name === "JsonWebTokenError") {
      return next(new Error("Invalid authentication token"));
    } else if (error.name === "TokenExpiredError") {
      return next(new Error("Authentication token expired"));
    }

    return next(new Error("Authentication failed"));
  }
};

/**
 * Authorize WebSocket connection based on role
 * @param {Array} allowedRoles - Array of allowed roles
 * @returns {Function} Middleware function
 */
export const authorizeSocket = (allowedRoles = []) => {
  return (socket, next) => {
    try {
      if (!socket.user || !socket.userRole) {
        return next(new Error("User not authenticated"));
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(socket.userRole)) {
        return next(new Error("Insufficient permissions"));
      }

      console.log(
        `✅ WebSocket authorized: User ${socket.userId} (${socket.userRole})`
      );

      next();
    } catch (error) {
      console.error("WebSocket authorization error:", error);
      return next(new Error("Authorization failed"));
    }
  };
};

/**
 * Rate limiting for WebSocket events
 * @param {Object} options - Rate limiting options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.maxEvents - Maximum events per window
 * @returns {Function} Middleware function
 */
export const rateLimitSocket = (options = {}) => {
  const { windowMs = 60000, maxEvents = 100 } = options; // Default: 100 events per minute
  const clients = new Map();

  return (socket, next) => {
    const clientId = socket.userId || socket.id;
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
    if (client.count >= maxEvents) {
      return next(new Error("Rate limit exceeded"));
    }

    client.count++;
    next();
  };
};

/**
 * Validate WebSocket event data
 * @param {Object} schema - Validation schema (simple object with required fields)
 * @returns {Function} Event handler wrapper
 */
export const validateSocketData = (schema = {}) => {
  return (handler) => {
    return (socket, data, callback) => {
      try {
        // Basic validation
        if (schema.required && Array.isArray(schema.required)) {
          for (const field of schema.required) {
            if (!data || data[field] === undefined || data[field] === null) {
              const error = new Error(`Missing required field: ${field}`);
              if (callback) callback(error);
              return;
            }
          }
        }

        // Type validation
        if (schema.types) {
          for (const [field, expectedType] of Object.entries(schema.types)) {
            if (
              data[field] !== undefined &&
              typeof data[field] !== expectedType
            ) {
              const error = new Error(
                `Invalid type for field ${field}: expected ${expectedType}`
              );
              if (callback) callback(error);
              return;
            }
          }
        }

        // Call the original handler
        handler(socket, data, callback);
      } catch (error) {
        console.error("Socket data validation error:", error);
        if (callback) callback(error);
      }
    };
  };
};

/**
 * Log WebSocket events for debugging
 * @param {string} eventName - Event name
 * @returns {Function} Event handler wrapper
 */
export const logSocketEvent = (eventName) => {
  return (handler) => {
    return (socket, data, callback) => {
      console.log(
        `🔗 WebSocket Event: ${eventName} from user ${socket.userId} (${socket.userRole})`
      );

      // Log data if in development mode
      if (process.env.NODE_ENV === "development") {
        console.log("   Data:", JSON.stringify(data, null, 2));
      }

      handler(socket, data, callback);
    };
  };
};

/**
 * Handle WebSocket errors gracefully
 * @param {Object} socket - Socket instance
 * @param {Error} error - Error object
 */
export const handleSocketError = (socket, error) => {
  console.error(`🔗 WebSocket Error for user ${socket.userId}:`, error);

  // Send error to client
  socket.emit("error", {
    message: error.message || "An error occurred",
    timestamp: new Date().toISOString(),
  });

  // Optionally disconnect on critical errors
  if (
    error.message.includes("Authentication") ||
    error.message.includes("Authorization")
  ) {
    socket.disconnect(true);
  }
};

/**
 * Create authenticated WebSocket namespace
 * @param {Object} io - Socket.IO server instance
 * @param {string} namespace - Namespace name
 * @param {Array} allowedRoles - Allowed roles for this namespace
 * @returns {Object} Namespace instance
 */
export const createAuthenticatedNamespace = (
  io,
  namespace,
  allowedRoles = []
) => {
  const nsp = io.of(namespace);

  // Apply authentication middleware
  nsp.use(authenticateSocket);

  // Apply authorization middleware if roles specified
  if (allowedRoles.length > 0) {
    nsp.use(authorizeSocket(allowedRoles));
  }

  // Apply rate limiting
  nsp.use(rateLimitSocket());

  console.log(`🔗 Created authenticated WebSocket namespace: ${namespace}`);

  return nsp;
};

export default {
  authenticateSocket,
  authorizeSocket,
  rateLimitSocket,
  validateSocketData,
  logSocketEvent,
  handleSocketError,
  createAuthenticatedNamespace,
};
