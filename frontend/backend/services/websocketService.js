import { notificationConfig } from "../config/notification.js";
import {
  authenticateSocket,
  authorizeSocket,
  rateLimitSocket,
  validateSocketData,
  logSocketEvent,
  handleSocketError,
} from "../middleware/websocketAuth.js";

/**
 * WebSocket Service
 * Handles real-time notification delivery via Socket.IO
 */
class WebSocketService {
  constructor() {
    this.config = notificationConfig.websocket;
    this.io = null;
    this.initialized = false;
    this.connectionPool = new Map(); // Track active connections
    this.connectionStats = {
      totalConnections: 0,
      totalDisconnections: 0,
      errors: 0,
      lastReset: new Date(),
    };
    this.heartbeatInterval = null;
    this.cleanupInterval = null;
  }

  /**
   * Initialize WebSocket service with Socket.IO instance
   * @param {Object} io - Socket.IO server instance
   */
  initialize(io) {
    if (this.initialized || !this.config.enabled) {
      return;
    }

    this.io = io;
    this.setupAuthenticationMiddleware();
    this.setupEventHandlers();
    this.setupConnectionManagement();
    this.setupErrorHandling();
    this.startHeartbeatMonitoring();
    this.startPeriodicCleanup();
    this.initialized = true;
    console.log("🔗 WebSocket service initialized with connection management");
  }

  /**
   * Set up authentication middleware for WebSocket connections
   */
  setupAuthenticationMiddleware() {
    // Apply authentication middleware
    this.io.use(authenticateSocket);

    // Apply rate limiting middleware
    this.io.use(
      rateLimitSocket({
        windowMs: 60000, // 1 minute
        maxEvents: 100, // 100 events per minute per user
      })
    );

    console.log("🔐 WebSocket authentication middleware configured");
  }

  /**
   * Set up Socket.IO event handlers
   */
  setupEventHandlers() {
    this.io.on("connection", (socket) => {
      console.log(
        `🔗 WebSocket client connected: ${socket.id} (User: ${socket.userId}, Role: ${socket.userRole})`
      );

      // Automatically join user to appropriate rooms after authentication
      this.handleUserJoin(socket);

      // Handle notification acknowledgment with validation
      socket.on(
        "notification-ack",
        logSocketEvent("notification-ack")(
          validateSocketData({
            required: ["notificationId"],
            types: { notificationId: "string" },
          })((socket, data) =>
            this.handleNotificationAck(socket, data.notificationId)
          )
        )
      );

      // Handle notification read status update
      socket.on(
        "notification-read",
        logSocketEvent("notification-read")(
          validateSocketData({
            required: ["notificationId"],
            types: { notificationId: "string" },
          })((socket, data) =>
            this.handleNotificationRead(socket, data.notificationId)
          )
        )
      );

      // Handle get unread count request
      socket.on(
        "get-unread-count",
        logSocketEvent("get-unread-count")((socket) =>
          this.handleGetUnreadCount(socket)
        )
      );

      // Handle mark all notifications as read
      socket.on(
        "mark-all-read",
        logSocketEvent("mark-all-read")((socket) =>
          this.handleMarkAllRead(socket)
        )
      );

      // Handle subscribe to specific notification types
      socket.on(
        "subscribe-notification-type",
        logSocketEvent("subscribe-notification-type")(
          validateSocketData({
            required: ["notificationType"],
            types: { notificationType: "string" },
          })((socket, data) =>
            this.handleSubscribeNotificationType(socket, data.notificationType)
          )
        )
      );

      // Handle unsubscribe from specific notification types
      socket.on(
        "unsubscribe-notification-type",
        logSocketEvent("unsubscribe-notification-type")(
          validateSocketData({
            required: ["notificationType"],
            types: { notificationType: "string" },
          })((socket, data) =>
            this.handleUnsubscribeNotificationType(
              socket,
              data.notificationType
            )
          )
        )
      );

      // Handle request for recent notifications
      socket.on(
        "get-recent-notifications",
        logSocketEvent("get-recent-notifications")(
          validateSocketData({
            types: { limit: "number", offset: "number" },
          })((socket, data) => this.handleGetRecentNotifications(socket, data))
        )
      );

      // Handle bulk notification actions
      socket.on(
        "bulk-notification-action",
        logSocketEvent("bulk-notification-action")(
          validateSocketData({
            required: ["action", "notificationIds"],
            types: {
              action: "string",
              notificationIds: "object", // array
            },
          })((socket, data) => this.handleBulkNotificationAction(socket, data))
        )
      );

      // Handle user disconnection
      socket.on("disconnect", (reason) => {
        console.log(
          `🔌 WebSocket client disconnected: ${socket.id} (Reason: ${reason})`
        );
        this.handleUserDisconnect(socket);
      });

      // Handle ping/pong for connection health
      socket.on("ping", () => {
        socket.emit("pong", { timestamp: new Date().toISOString() });
      });

      // Handle errors
      socket.on("error", (error) => {
        handleSocketError(socket, error);
      });

      // Send welcome message with connection info
      socket.emit("connection-established", {
        success: true,
        userId: socket.userId,
        role: socket.userRole,
        timestamp: new Date().toISOString(),
        message: "WebSocket connection established successfully",
      });
    });

    // Handle connection errors
    this.io.on("connect_error", (error) => {
      console.error("🔗 WebSocket connection error:", error);
      this.connectionStats.errors++;
    });
  }

  /**
   * Set up connection management and tracking
   */
  setupConnectionManagement() {
    // Track connection events
    this.io.on("connection", (socket) => {
      this.addConnectionToPool(socket);
    });

    console.log("📊 Connection management setup complete");
  }

  /**
   * Set up comprehensive error handling
   */
  setupErrorHandling() {
    // Global error handler for the server
    this.io.engine.on("connection_error", (err) => {
      console.error("🔥 Socket.IO engine connection error:", {
        req: err.req,
        code: err.code,
        message: err.message,
        context: err.context,
      });
      this.connectionStats.errors++;
    });

    // Handle server-level errors
    this.io.on("error", (error) => {
      console.error("🔥 Socket.IO server error:", error);
      this.connectionStats.errors++;
    });

    console.log("🛡️ Error handling setup complete");
  }

  /**
   * Add connection to the connection pool for tracking
   * @param {Object} socket - Socket instance
   */
  addConnectionToPool(socket) {
    const connectionInfo = {
      socketId: socket.id,
      userId: socket.userId,
      userRole: socket.userRole,
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
      isAuthenticated: !!(socket.userId && socket.userRole),
      rooms: [],
      errorCount: 0,
    };

    this.connectionPool.set(socket.id, connectionInfo);
    this.connectionStats.totalConnections++;

    // Update connection info when user is authenticated
    socket.on("rooms-joined", (data) => {
      if (this.connectionPool.has(socket.id)) {
        const conn = this.connectionPool.get(socket.id);
        conn.rooms = data.rooms || [];
        conn.isAuthenticated = true;
        conn.userId = data.userId;
        conn.userRole = data.role;
      }
    });

    // Track heartbeat
    socket.on("pong", () => {
      if (this.connectionPool.has(socket.id)) {
        this.connectionPool.get(socket.id).lastHeartbeat = new Date();
      }
    });

    // Handle socket errors
    socket.on("error", (error) => {
      this.handleConnectionError(socket, error);
    });

    // Clean up on disconnect
    socket.on("disconnect", (reason) => {
      this.removeConnectionFromPool(socket.id, reason);
    });

    console.log(
      `📊 Connection ${socket.id} added to pool (Total: ${this.connectionPool.size})`
    );
  }

  /**
   * Remove connection from the connection pool
   * @param {string} socketId - Socket ID
   * @param {string} reason - Disconnect reason
   */
  removeConnectionFromPool(socketId, reason) {
    if (this.connectionPool.has(socketId)) {
      const connectionInfo = this.connectionPool.get(socketId);
      const connectionDuration = new Date() - connectionInfo.connectedAt;

      console.log(`📊 Connection ${socketId} removed from pool`, {
        userId: connectionInfo.userId,
        duration: `${Math.round(connectionDuration / 1000)}s`,
        reason,
        errorCount: connectionInfo.errorCount,
      });

      this.connectionPool.delete(socketId);
      this.connectionStats.totalDisconnections++;
    }
  }

  /**
   * Handle connection-specific errors
   * @param {Object} socket - Socket instance
   * @param {Error} error - Error object
   */
  handleConnectionError(socket, error) {
    console.error(`🔥 Socket ${socket.id} error:`, error);

    if (this.connectionPool.has(socket.id)) {
      const conn = this.connectionPool.get(socket.id);
      conn.errorCount++;
      conn.lastError = {
        message: error.message,
        timestamp: new Date(),
      };

      // Disconnect problematic connections
      if (conn.errorCount >= 5) {
        console.warn(
          `⚠️ Disconnecting problematic socket ${socket.id} (${conn.errorCount} errors)`
        );
        socket.disconnect(true);
      }
    }

    this.connectionStats.errors++;

    // Send error response to client
    handleSocketError(socket, error);
  }

  /**
   * Start heartbeat monitoring to detect stale connections
   */
  startHeartbeatMonitoring() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      this.performHeartbeatCheck();
    }, 30000); // Check every 30 seconds

    console.log("💓 Heartbeat monitoring started");
  }

  /**
   * Perform heartbeat check on all connections
   */
  async performHeartbeatCheck() {
    try {
      const now = new Date();
      const staleThreshold = 60000; // 1 minute
      const staleConnections = [];

      for (const [socketId, conn] of this.connectionPool.entries()) {
        const timeSinceHeartbeat = now - conn.lastHeartbeat;

        if (timeSinceHeartbeat > staleThreshold) {
          staleConnections.push(socketId);
        }
      }

      // Send ping to all connections
      if (this.io) {
        this.io.emit("ping");
      }

      // Handle stale connections
      if (staleConnections.length > 0) {
        console.warn(`💓 Found ${staleConnections.length} stale connections`);

        for (const socketId of staleConnections) {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            console.warn(`💓 Disconnecting stale connection: ${socketId}`);
            socket.disconnect(true);
          }
        }
      }

      console.log(
        `💓 Heartbeat check completed (${this.connectionPool.size} active connections)`
      );
    } catch (error) {
      console.error("💓 Error during heartbeat check:", error);
    }
  }

  /**
   * Start periodic cleanup tasks
   */
  startPeriodicCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.performPeriodicCleanup();
    }, 300000); // Run every 5 minutes

    console.log("🧹 Periodic cleanup started");
  }

  /**
   * Perform periodic cleanup tasks
   */
  async performPeriodicCleanup() {
    try {
      console.log("🧹 Starting periodic cleanup...");

      // Clean up orphaned connections
      await this.cleanupOrphanedConnections();

      // Clean up empty rooms
      await this.cleanupEmptyRooms();

      // Log connection statistics
      this.logConnectionStatistics();

      console.log("🧹 Periodic cleanup completed");
    } catch (error) {
      console.error("🧹 Error during periodic cleanup:", error);
    }
  }

  /**
   * Clean up orphaned connections that exist in pool but not in socket.io
   */
  async cleanupOrphanedConnections() {
    try {
      if (!this.io) return;

      const activeSockets = await this.io.fetchSockets();
      const activeSocketIds = new Set(activeSockets.map((socket) => socket.id));
      const orphanedConnections = [];

      for (const socketId of this.connectionPool.keys()) {
        if (!activeSocketIds.has(socketId)) {
          orphanedConnections.push(socketId);
        }
      }

      for (const socketId of orphanedConnections) {
        console.log(`🧹 Cleaning up orphaned connection: ${socketId}`);
        this.connectionPool.delete(socketId);
      }

      if (orphanedConnections.length > 0) {
        console.log(
          `🧹 Cleaned up ${orphanedConnections.length} orphaned connections`
        );
      }
    } catch (error) {
      console.error("🧹 Error cleaning up orphaned connections:", error);
    }
  }

  /**
   * Log current connection statistics
   */
  logConnectionStatistics() {
    const stats = {
      activeConnections: this.connectionPool.size,
      totalConnections: this.connectionStats.totalConnections,
      totalDisconnections: this.connectionStats.totalDisconnections,
      totalErrors: this.connectionStats.errors,
      uptime: new Date() - this.connectionStats.lastReset,
    };

    const authenticatedCount = Array.from(this.connectionPool.values()).filter(
      (conn) => conn.isAuthenticated
    ).length;

    console.log("📊 Connection Statistics:", {
      ...stats,
      authenticatedConnections: authenticatedCount,
      unauthenticatedConnections: stats.activeConnections - authenticatedCount,
      uptimeHours: Math.round((stats.uptime / (1000 * 60 * 60)) * 100) / 100,
    });
  }

  /**
   * Get detailed connection information
   * @returns {Object} Detailed connection info
   */
  getConnectionInfo() {
    const connections = Array.from(this.connectionPool.values());
    const now = new Date();

    return {
      total: connections.length,
      authenticated: connections.filter((conn) => conn.isAuthenticated).length,
      byRole: connections.reduce((acc, conn) => {
        if (conn.userRole) {
          acc[conn.userRole] = (acc[conn.userRole] || 0) + 1;
        }
        return acc;
      }, {}),
      averageConnectionTime:
        connections.length > 0
          ? connections.reduce(
              (sum, conn) => sum + (now - conn.connectedAt),
              0
            ) /
            connections.length /
            1000
          : 0,
      errorStats: {
        totalErrors: this.connectionStats.errors,
        connectionsWithErrors: connections.filter((conn) => conn.errorCount > 0)
          .length,
      },
      statistics: this.connectionStats,
    };
  }

  /**
   * Gracefully shutdown the WebSocket service
   */
  async shutdown() {
    try {
      console.log("🔌 Shutting down WebSocket service...");

      // Clear intervals
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = null;
      }

      // Notify all clients of shutdown
      if (this.io) {
        this.io.emit("server-shutdown", {
          message: "Server is shutting down",
          timestamp: new Date().toISOString(),
        });

        // Wait a bit for the message to be sent
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Close all connections
        this.io.close();
      }

      // Clear connection pool
      this.connectionPool.clear();
      this.initialized = false;

      console.log("🔌 WebSocket service shutdown complete");
    } catch (error) {
      console.error("🔌 Error during WebSocket service shutdown:", error);
    }
  }

  /**
   * Handle user joining rooms (automatically called after authentication)
   * @param {Object} socket - Socket instance
   */
  handleUserJoin(socket) {
    if (!socket.userId || !socket.userRole) {
      console.warn("Socket not properly authenticated for room joining");
      return;
    }

    const joinedRooms = this.assignUserToRooms(socket);

    console.log(
      `👤 User ${socket.userId} (${socket.userRole}) joined ${
        joinedRooms.length
      } WebSocket rooms: ${joinedRooms.join(", ")}`
    );

    // Send room join confirmation
    socket.emit("rooms-joined", {
      success: true,
      userId: socket.userId,
      role: socket.userRole,
      rooms: joinedRooms,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Assign user to appropriate rooms based on their role and attributes
   * @param {Object} socket - Socket instance
   * @returns {Array} Array of room names the user joined
   */
  assignUserToRooms(socket) {
    const joinedRooms = [];

    // Join user-specific room (always)
    const userRoom = `user-${socket.userId}`;
    socket.join(userRoom);
    joinedRooms.push(userRoom);

    // Join role-specific room (always)
    const roleRoom = `role-${socket.userRole}`;
    socket.join(roleRoom);
    joinedRooms.push(roleRoom);

    // Join vendor-specific room if user is a vendor
    if (socket.userRole === "vendor") {
      const vendorId = socket.user.vendorId || socket.user._id;
      const vendorRoom = `vendor-${vendorId}`;
      socket.join(vendorRoom);
      joinedRooms.push(vendorRoom);

      // Join vendor status room (active, inactive, pending)
      if (socket.user.status) {
        const statusRoom = `vendor-status-${socket.user.status}`;
        socket.join(statusRoom);
        joinedRooms.push(statusRoom);
      }
    }

    // Join admin-specific rooms if user is admin
    if (socket.userRole === "admin" || socket.userRole === "super_admin") {
      const adminRoom = "admin-all";
      socket.join(adminRoom);
      joinedRooms.push(adminRoom);
    }

    // Join location-based rooms if user has location data
    if (socket.user.location) {
      const locationRoom = `location-${socket.user.location}`;
      socket.join(locationRoom);
      joinedRooms.push(locationRoom);
    }

    // Join notification preference rooms
    if (socket.user.notificationPreferences) {
      const preferences = socket.user.notificationPreferences;
      if (preferences.lowStock) {
        socket.join("pref-low-stock");
        joinedRooms.push("pref-low-stock");
      }
      if (preferences.newOrders) {
        socket.join("pref-new-orders");
        joinedRooms.push("pref-new-orders");
      }
      if (preferences.systemUpdates) {
        socket.join("pref-system-updates");
        joinedRooms.push("pref-system-updates");
      }
    }

    return joinedRooms;
  }

  /**
   * Remove user from specific room
   * @param {Object} socket - Socket instance
   * @param {string} roomName - Room name to leave
   * @returns {boolean} Success status
   */
  removeUserFromRoom(socket, roomName) {
    try {
      socket.leave(roomName);
      console.log(`🚪 User ${socket.userId} left room: ${roomName}`);
      return true;
    } catch (error) {
      console.error(`Error removing user from room ${roomName}:`, error);
      return false;
    }
  }

  /**
   * Add user to specific room
   * @param {Object} socket - Socket instance
   * @param {string} roomName - Room name to join
   * @returns {boolean} Success status
   */
  addUserToRoom(socket, roomName) {
    try {
      socket.join(roomName);
      console.log(`🚪 User ${socket.userId} joined room: ${roomName}`);
      return true;
    } catch (error) {
      console.error(`Error adding user to room ${roomName}:`, error);
      return false;
    }
  }

  /**
   * Get all rooms a user is currently in
   * @param {Object} socket - Socket instance
   * @returns {Array} Array of room names
   */
  getUserRooms(socket) {
    return Array.from(socket.rooms).filter((room) => room !== socket.id);
  }

  /**
   * Update user's room membership based on changed attributes
   * @param {string} userId - User ID
   * @param {Object} updates - Updated user attributes
   */
  async updateUserRooms(userId, updates) {
    try {
      if (!this.io) {
        return;
      }

      const userRoom = `user-${userId}`;
      const connectedSockets = await this.io.in(userRoom).fetchSockets();

      for (const socket of connectedSockets) {
        // Remove from old rooms if role changed
        if (updates.role && updates.role !== socket.userRole) {
          socket.leave(`role-${socket.userRole}`);
          socket.join(`role-${updates.role}`);
          socket.userRole = updates.role;
        }

        // Update vendor-specific rooms if status changed
        if (updates.status && socket.userRole === "vendor") {
          // Leave old status room
          if (socket.user.status) {
            socket.leave(`vendor-status-${socket.user.status}`);
          }
          // Join new status room
          socket.join(`vendor-status-${updates.status}`);
        }

        // Update user object
        socket.user = { ...socket.user, ...updates };

        console.log(`🔄 Updated room membership for user ${userId}`);

        // Notify client of room changes
        socket.emit("room-membership-updated", {
          userId,
          updates,
          rooms: this.getUserRooms(socket),
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error updating user rooms:", error);
    }
  }

  /**
   * Get room statistics and membership information
   * @returns {Promise<Object>} Room statistics
   */
  async getRoomStatistics() {
    try {
      if (!this.io) {
        return { rooms: {}, totalRooms: 0, totalConnections: 0 };
      }

      const allSockets = await this.io.fetchSockets();
      const roomStats = {};
      let totalConnections = 0;

      // Collect room membership data
      for (const socket of allSockets) {
        totalConnections++;
        const userRooms = this.getUserRooms(socket);

        for (const room of userRooms) {
          if (!roomStats[room]) {
            roomStats[room] = {
              memberCount: 0,
              members: [],
              roomType: this.getRoomType(room),
            };
          }
          roomStats[room].memberCount++;
          roomStats[room].members.push({
            userId: socket.userId,
            role: socket.userRole,
            socketId: socket.id,
          });
        }
      }

      return {
        rooms: roomStats,
        totalRooms: Object.keys(roomStats).length,
        totalConnections,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error getting room statistics:", error);
      return {
        rooms: {},
        totalRooms: 0,
        totalConnections: 0,
        error: error.message,
      };
    }
  }

  /**
   * Determine room type based on room name
   * @param {string} roomName - Room name
   * @returns {string} Room type
   */
  getRoomType(roomName) {
    if (roomName.startsWith("user-")) return "user";
    if (roomName.startsWith("role-")) return "role";
    if (roomName.startsWith("vendor-")) return "vendor";
    if (roomName.startsWith("type-")) return "notification-type";
    if (roomName.startsWith("location-")) return "location";
    if (roomName.startsWith("pref-")) return "preference";
    if (roomName.startsWith("vendor-status-")) return "vendor-status";
    if (roomName === "admin-all") return "admin";
    return "custom";
  }

  /**
   * Broadcast message to specific room type
   * @param {string} roomType - Room type (role, vendor, location, etc.)
   * @param {string} identifier - Room identifier
   * @param {Object} message - Message to broadcast
   * @returns {Promise<Object>} Broadcast result
   */
  async broadcastToRoomType(roomType, identifier, message) {
    try {
      if (!this.io) {
        return { success: false, reason: "WebSocket not initialized" };
      }

      let roomName;
      switch (roomType) {
        case "role":
          roomName = `role-${identifier}`;
          break;
        case "vendor":
          roomName = `vendor-${identifier}`;
          break;
        case "location":
          roomName = `location-${identifier}`;
          break;
        case "vendor-status":
          roomName = `vendor-status-${identifier}`;
          break;
        case "notification-type":
          roomName = `type-${identifier}`;
          break;
        case "preference":
          roomName = `pref-${identifier}`;
          break;
        case "admin":
          roomName = "admin-all";
          break;
        default:
          return { success: false, reason: "Invalid room type" };
      }

      const connectedSockets = await this.io.in(roomName).fetchSockets();

      if (connectedSockets.length === 0) {
        return { success: false, reason: "No users in target room" };
      }

      // Broadcast message
      this.io.to(roomName).emit("room-broadcast", {
        roomType,
        identifier,
        message,
        timestamp: new Date().toISOString(),
      });

      console.log(
        `📢 Broadcast sent to room ${roomName} (${connectedSockets.length} connections)`
      );

      return {
        success: true,
        roomName,
        connectionsCount: connectedSockets.length,
      };
    } catch (error) {
      console.error("Error broadcasting to room type:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clean up empty rooms (optional maintenance function)
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupEmptyRooms() {
    try {
      if (!this.io) {
        return { cleaned: 0 };
      }

      const roomStats = await this.getRoomStatistics();
      const emptyRooms = Object.keys(roomStats.rooms).filter(
        (roomName) => roomStats.rooms[roomName].memberCount === 0
      );

      // Note: Socket.IO automatically cleans up empty rooms,
      // but this method can be used for logging or custom cleanup logic
      console.log(`🧹 Found ${emptyRooms.length} empty rooms for cleanup`);

      return {
        cleaned: emptyRooms.length,
        emptyRooms,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error cleaning up empty rooms:", error);
      return { cleaned: 0, error: error.message };
    }
  }

  /**
   * Get users in specific room
   * @param {string} roomName - Room name
   * @returns {Promise<Array>} Array of users in the room
   */
  async getUsersInRoom(roomName) {
    try {
      if (!this.io) {
        return [];
      }

      const connectedSockets = await this.io.in(roomName).fetchSockets();
      return connectedSockets.map((socket) => ({
        userId: socket.userId,
        role: socket.userRole,
        socketId: socket.id,
        joinedAt: socket.handshake.time,
      }));
    } catch (error) {
      console.error(`Error getting users in room ${roomName}:`, error);
      return [];
    }
  }

  /**
   * Force user to leave specific room (admin function)
   * @param {string} userId - User ID
   * @param {string} roomName - Room name
   * @returns {Promise<Object>} Operation result
   */
  async forceUserLeaveRoom(userId, roomName) {
    try {
      if (!this.io) {
        return { success: false, reason: "WebSocket not initialized" };
      }

      const userRoom = `user-${userId}`;
      const connectedSockets = await this.io.in(userRoom).fetchSockets();
      let removedCount = 0;

      for (const socket of connectedSockets) {
        if (this.removeUserFromRoom(socket, roomName)) {
          removedCount++;
          // Notify user they were removed from room
          socket.emit("room-removed", {
            roomName,
            reason: "Administrative action",
            timestamp: new Date().toISOString(),
          });
        }
      }

      console.log(
        `🚫 Removed user ${userId} from room ${roomName} (${removedCount} connections)`
      );

      return {
        success: true,
        userId,
        roomName,
        removedConnections: removedCount,
      };
    } catch (error) {
      console.error("Error forcing user to leave room:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle notification acknowledgment
   * @param {Object} socket - Socket instance
   * @param {string} notificationId - Notification ID
   */
  handleNotificationAck(socket, notificationId) {
    console.log(
      `✅ Notification ${notificationId} acknowledged by user ${socket.userId}`
    );

    // Optionally update notification status in database
    this.updateNotificationDeliveryStatus(notificationId, socket.userId);
  }

  /**
   * Handle notification read status update
   * @param {Object} socket - Socket instance
   * @param {string} notificationId - Notification ID
   */
  async handleNotificationRead(socket, notificationId) {
    try {
      console.log(
        `📖 Notification ${notificationId} marked as read by user ${socket.userId}`
      );

      // Import notification model dynamically to avoid circular dependencies
      const { default: Notification } = await import(
        "../models/Notification.js"
      );

      // Update notification as read in database
      await Notification.findOneAndUpdate(
        { _id: notificationId, userId: socket.userId },
        { isRead: true, readAt: new Date() }
      );

      // Send confirmation back to client
      socket.emit("notification-read-confirmed", {
        notificationId,
        success: true,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      socket.emit("notification-read-error", {
        notificationId,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle get unread count request
   * @param {Object} socket - Socket instance
   */
  async handleGetUnreadCount(socket) {
    try {
      // Import notification model dynamically to avoid circular dependencies
      const { default: Notification } = await import(
        "../models/Notification.js"
      );

      const unreadCount = await Notification.countDocuments({
        userId: socket.userId,
        isRead: false,
      });

      socket.emit("unread-count", {
        count: unreadCount,
        userId: socket.userId,
        timestamp: new Date().toISOString(),
      });

      console.log(
        `📊 Sent unread count (${unreadCount}) to user ${socket.userId}`
      );
    } catch (error) {
      console.error("Error getting unread count:", error);
      socket.emit("unread-count-error", {
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle mark all notifications as read for a user
   * @param {Object} socket - Socket instance
   */
  async handleMarkAllRead(socket) {
    try {
      // Import notification model dynamically to avoid circular dependencies
      const { default: Notification } = await import(
        "../models/Notification.js"
      );

      const result = await Notification.updateMany(
        { userId: socket.userId, isRead: false },
        { isRead: true, readAt: new Date() }
      );

      socket.emit("mark-all-read-confirmed", {
        success: true,
        modifiedCount: result.modifiedCount,
        timestamp: new Date().toISOString(),
      });

      console.log(
        `📖 Marked ${result.modifiedCount} notifications as read for user ${socket.userId}`
      );
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      socket.emit("mark-all-read-error", {
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle subscription to specific notification types
   * @param {Object} socket - Socket instance
   * @param {string} notificationType - Notification type to subscribe to
   */
  handleSubscribeNotificationType(socket, notificationType) {
    const typeRoom = `type-${notificationType}`;
    socket.join(typeRoom);

    console.log(
      `🔔 User ${socket.userId} subscribed to notification type: ${notificationType}`
    );

    socket.emit("subscription-confirmed", {
      success: true,
      notificationType,
      action: "subscribed",
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle unsubscription from specific notification types
   * @param {Object} socket - Socket instance
   * @param {string} notificationType - Notification type to unsubscribe from
   */
  handleUnsubscribeNotificationType(socket, notificationType) {
    const typeRoom = `type-${notificationType}`;
    socket.leave(typeRoom);

    console.log(
      `🔕 User ${socket.userId} unsubscribed from notification type: ${notificationType}`
    );

    socket.emit("subscription-confirmed", {
      success: true,
      notificationType,
      action: "unsubscribed",
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle request for recent notifications
   * @param {Object} socket - Socket instance
   * @param {Object} data - Request data with limit and offset
   */
  async handleGetRecentNotifications(socket, data = {}) {
    try {
      const { limit = 20, offset = 0 } = data;

      // Import notification model dynamically to avoid circular dependencies
      const { default: Notification } = await import(
        "../models/Notification.js"
      );

      const notifications = await Notification.find({
        userId: socket.userId,
      })
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(Math.min(limit, 50)) // Cap at 50 to prevent abuse
        .select("_id type title message metadata createdAt isRead");

      const totalCount = await Notification.countDocuments({
        userId: socket.userId,
      });

      socket.emit("recent-notifications", {
        success: true,
        notifications,
        pagination: {
          limit,
          offset,
          total: totalCount,
          hasMore: offset + notifications.length < totalCount,
        },
        timestamp: new Date().toISOString(),
      });

      console.log(
        `📋 Sent ${notifications.length} recent notifications to user ${socket.userId}`
      );
    } catch (error) {
      console.error("Error getting recent notifications:", error);
      socket.emit("recent-notifications-error", {
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle bulk notification actions (mark multiple as read, delete, etc.)
   * @param {Object} socket - Socket instance
   * @param {Object} data - Action data
   */
  async handleBulkNotificationAction(socket, data) {
    try {
      const { action, notificationIds } = data;

      if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
        throw new Error("Invalid notification IDs array");
      }

      // Import notification model dynamically to avoid circular dependencies
      const { default: Notification } = await import(
        "../models/Notification.js"
      );

      let result;
      const query = {
        _id: { $in: notificationIds },
        userId: socket.userId, // Ensure user can only act on their own notifications
      };

      switch (action) {
        case "mark-read":
          result = await Notification.updateMany(query, {
            isRead: true,
            readAt: new Date(),
          });
          break;

        case "mark-unread":
          result = await Notification.updateMany(query, {
            isRead: false,
            $unset: { readAt: 1 },
          });
          break;

        case "delete":
          result = await Notification.deleteMany(query);
          break;

        default:
          throw new Error(`Unsupported bulk action: ${action}`);
      }

      socket.emit("bulk-action-confirmed", {
        success: true,
        action,
        modifiedCount: result.modifiedCount || result.deletedCount,
        notificationIds,
        timestamp: new Date().toISOString(),
      });

      console.log(
        `🔄 Bulk action '${action}' performed on ${
          result.modifiedCount || result.deletedCount
        } notifications for user ${socket.userId}`
      );
    } catch (error) {
      console.error("Error performing bulk notification action:", error);
      socket.emit("bulk-action-error", {
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle user disconnection
   * @param {Object} socket - Socket instance
   */
  handleUserDisconnect(socket) {
    if (socket.userId && socket.userRole) {
      console.log(`👋 User ${socket.userId} (${socket.userRole}) disconnected`);

      // Optionally perform cleanup tasks here
      // e.g., update user's last seen timestamp, clean up temporary data, etc.
    }
  }

  /**
   * Send notification to specific user
   * @param {string} userId - User ID
   * @param {Object} notification - Notification object
   * @returns {Promise<Object>} Send result
   */
  async sendNotificationToUser(userId, notification) {
    try {
      if (!this.config.enabled || !this.io) {
        console.log("🔗 WebSocket notifications disabled, skipping WebSocket");
        return { success: false, reason: "WebSocket notifications disabled" };
      }

      const room = `user-${userId}`;
      const connectedSockets = await this.io.in(room).fetchSockets();

      if (connectedSockets.length === 0) {
        console.log(`📱 No active WebSocket connections for user ${userId}`);
        return { success: false, reason: "User not connected" };
      }

      // Prepare notification data for client
      const notificationData = {
        id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        metadata: notification.metadata,
        createdAt: notification.createdAt,
        isRead: notification.isRead,
      };

      // Send to user's room
      this.io.to(room).emit("notification", notificationData);

      console.log(
        `🔔 WebSocket notification sent to user ${userId} (${connectedSockets.length} connections)`
      );

      return {
        success: true,
        connectionsCount: connectedSockets.length,
        notificationId: notification._id,
      };
    } catch (error) {
      console.error("Error sending WebSocket notification to user:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification to all users with specific role
   * @param {string} role - User role
   * @param {Object} notification - Notification object
   * @returns {Promise<Object>} Send result
   */
  async sendNotificationToRole(role, notification) {
    return this.broadcastNotificationToRoom(
      `role-${role}`,
      notification,
      `role ${role}`
    );
  }

  /**
   * Send notification to vendor status group
   * @param {string} status - Vendor status (active, inactive, pending)
   * @param {Object} notification - Notification object
   * @returns {Promise<Object>} Send result
   */
  async sendNotificationToVendorStatus(status, notification) {
    return this.broadcastNotificationToRoom(
      `vendor-status-${status}`,
      notification,
      `vendor status ${status}`
    );
  }

  /**
   * Send notification to users with specific preferences
   * @param {string} preference - Notification preference (low-stock, new-orders, system-updates)
   * @param {Object} notification - Notification object
   * @returns {Promise<Object>} Send result
   */
  async sendNotificationToPreference(preference, notification) {
    return this.broadcastNotificationToRoom(
      `pref-${preference}`,
      notification,
      `preference ${preference}`
    );
  }

  /**
   * Send notification to location-based group
   * @param {string} location - Location identifier
   * @param {Object} notification - Notification object
   * @returns {Promise<Object>} Send result
   */
  async sendNotificationToLocation(location, notification) {
    return this.broadcastNotificationToRoom(
      `location-${location}`,
      notification,
      `location ${location}`
    );
  }

  /**
   * Generic method to broadcast notification to a specific room
   * @param {string} roomName - Room name
   * @param {Object} notification - Notification object
   * @param {string} roomDescription - Human-readable room description for logging
   * @returns {Promise<Object>} Send result
   */
  async broadcastNotificationToRoom(roomName, notification, roomDescription) {
    try {
      if (!this.config.enabled || !this.io) {
        console.log("🔗 WebSocket notifications disabled, skipping WebSocket");
        return { success: false, reason: "WebSocket notifications disabled" };
      }

      const connectedSockets = await this.io.in(roomName).fetchSockets();

      if (connectedSockets.length === 0) {
        console.log(
          `📱 No active WebSocket connections for ${roomDescription}`
        );
        return {
          success: false,
          reason: `No users connected for ${roomDescription}`,
        };
      }

      // Prepare notification data for client
      const notificationData = {
        id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        metadata: notification.metadata,
        createdAt: notification.createdAt,
        isRead: notification.isRead,
      };

      // Send to room
      this.io.to(roomName).emit("notification", notificationData);

      console.log(
        `🔔 WebSocket notification sent to ${roomDescription} (${connectedSockets.length} connections)`
      );

      return {
        success: true,
        connectionsCount: connectedSockets.length,
        notificationId: notification._id,
        roomName,
      };
    } catch (error) {
      console.error(
        `Error sending WebSocket notification to ${roomDescription}:`,
        error
      );
      return { success: false, error: error.message };
    }
  }

  /**
   * Send broadcast notification to all connected users
   * @param {Object} notification - Notification object
   * @returns {Promise<Object>} Send result
   */
  async sendBroadcastNotification(notification) {
    try {
      if (!this.config.enabled || !this.io) {
        console.log("🔗 WebSocket notifications disabled, skipping WebSocket");
        return { success: false, reason: "WebSocket notifications disabled" };
      }

      const allSockets = await this.io.fetchSockets();

      if (allSockets.length === 0) {
        console.log("📱 No active WebSocket connections for broadcast");
        return { success: false, reason: "No users connected" };
      }

      // Prepare notification data for client
      const notificationData = {
        id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        metadata: notification.metadata,
        createdAt: notification.createdAt,
        isRead: notification.isRead,
      };

      // Send to all connected clients
      this.io.emit("notification", notificationData);

      console.log(
        `📢 Broadcast WebSocket notification sent to ${allSockets.length} connections`
      );

      return {
        success: true,
        connectionsCount: allSockets.length,
        notificationId: notification._id,
      };
    } catch (error) {
      console.error("Error sending broadcast WebSocket notification:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification to users subscribed to a specific notification type
   * @param {string} notificationType - Notification type
   * @param {Object} notification - Notification object
   * @returns {Promise<Object>} Send result
   */
  async sendNotificationToType(notificationType, notification) {
    try {
      if (!this.config.enabled || !this.io) {
        console.log("🔗 WebSocket notifications disabled, skipping WebSocket");
        return { success: false, reason: "WebSocket notifications disabled" };
      }

      const typeRoom = `type-${notificationType}`;
      const connectedSockets = await this.io.in(typeRoom).fetchSockets();

      if (connectedSockets.length === 0) {
        console.log(
          `📱 No active WebSocket connections for type ${notificationType}`
        );
        return { success: false, reason: "No users subscribed to type" };
      }

      // Prepare notification data for client
      const notificationData = {
        id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        metadata: notification.metadata,
        createdAt: notification.createdAt,
        isRead: notification.isRead,
      };

      // Send to type room
      this.io.to(typeRoom).emit("notification", notificationData);

      console.log(
        `🔔 WebSocket notification sent to type ${notificationType} (${connectedSockets.length} connections)`
      );

      return {
        success: true,
        connectionsCount: connectedSockets.length,
        notificationId: notification._id,
      };
    } catch (error) {
      console.error("Error sending WebSocket notification to type:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification to specific vendor's users
   * @param {string} vendorId - Vendor ID
   * @param {Object} notification - Notification object
   * @returns {Promise<Object>} Send result
   */
  async sendNotificationToVendor(vendorId, notification) {
    try {
      if (!this.config.enabled || !this.io) {
        console.log("🔗 WebSocket notifications disabled, skipping WebSocket");
        return { success: false, reason: "WebSocket notifications disabled" };
      }

      const vendorRoom = `vendor-${vendorId}`;
      const connectedSockets = await this.io.in(vendorRoom).fetchSockets();

      if (connectedSockets.length === 0) {
        console.log(
          `📱 No active WebSocket connections for vendor ${vendorId}`
        );
        return { success: false, reason: "Vendor not connected" };
      }

      // Prepare notification data for client
      const notificationData = {
        id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        metadata: notification.metadata,
        createdAt: notification.createdAt,
        isRead: notification.isRead,
      };

      // Send to vendor room
      this.io.to(vendorRoom).emit("notification", notificationData);

      console.log(
        `🏪 WebSocket notification sent to vendor ${vendorId} (${connectedSockets.length} connections)`
      );

      return {
        success: true,
        connectionsCount: connectedSockets.length,
        notificationId: notification._id,
      };
    } catch (error) {
      console.error("Error sending WebSocket notification to vendor:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send system announcement to all users
   * @param {Object} announcement - Announcement data
   * @returns {Promise<Object>} Send result
   */
  async sendSystemAnnouncement(announcement) {
    try {
      if (!this.io) {
        return { success: false, reason: "WebSocket not initialized" };
      }

      const allSockets = await this.io.fetchSockets();

      if (allSockets.length === 0) {
        console.log("📱 No active WebSocket connections for announcement");
        return { success: false, reason: "No users connected" };
      }

      // Send system announcement to all connected clients
      this.io.emit("system-announcement", {
        ...announcement,
        timestamp: new Date().toISOString(),
      });

      console.log(
        `📢 System announcement sent to ${allSockets.length} connections`
      );

      return {
        success: true,
        connectionsCount: allSockets.length,
      };
    } catch (error) {
      console.error("Error sending system announcement:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send targeted notification based on multiple criteria
   * @param {Object} criteria - Targeting criteria
   * @param {Object} notification - Notification object
   * @returns {Promise<Object>} Send result
   */
  async sendTargetedNotification(criteria, notification) {
    try {
      if (!this.config.enabled || !this.io) {
        console.log("🔗 WebSocket notifications disabled, skipping WebSocket");
        return { success: false, reason: "WebSocket notifications disabled" };
      }

      const { userIds, roles, vendors, notificationTypes } = criteria;
      const targetRooms = [];

      // Build target rooms based on criteria
      if (userIds && userIds.length > 0) {
        targetRooms.push(...userIds.map((id) => `user-${id}`));
      }

      if (roles && roles.length > 0) {
        targetRooms.push(...roles.map((role) => `role-${role}`));
      }

      if (vendors && vendors.length > 0) {
        targetRooms.push(...vendors.map((vendorId) => `vendor-${vendorId}`));
      }

      if (notificationTypes && notificationTypes.length > 0) {
        targetRooms.push(...notificationTypes.map((type) => `type-${type}`));
      }

      if (targetRooms.length === 0) {
        return { success: false, reason: "No target criteria specified" };
      }

      // Prepare notification data for client
      const notificationData = {
        id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        metadata: notification.metadata,
        createdAt: notification.createdAt,
        isRead: notification.isRead,
      };

      let totalConnections = 0;

      // Send to each target room
      for (const room of targetRooms) {
        const connectedSockets = await this.io.in(room).fetchSockets();
        if (connectedSockets.length > 0) {
          this.io.to(room).emit("notification", notificationData);
          totalConnections += connectedSockets.length;
        }
      }

      console.log(
        `🎯 Targeted WebSocket notification sent to ${totalConnections} connections across ${targetRooms.length} rooms`
      );

      return {
        success: true,
        connectionsCount: totalConnections,
        targetRooms: targetRooms.length,
        notificationId: notification._id,
      };
    } catch (error) {
      console.error("Error sending targeted WebSocket notification:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get connected users count
   * @returns {Promise<Object>} Connection statistics
   */
  async getConnectionStats() {
    try {
      if (!this.io) {
        return { total: 0, byRole: {}, byUser: {} };
      }

      const allSockets = await this.io.fetchSockets();
      const stats = {
        total: allSockets.length,
        authenticated: 0,
        byRole: {},
        byUser: {},
      };

      // Count connections by role and user
      for (const socket of allSockets) {
        if (socket.userId && socket.userRole) {
          stats.authenticated++;

          // Count by role
          stats.byRole[socket.userRole] =
            (stats.byRole[socket.userRole] || 0) + 1;

          // Count by user
          stats.byUser[socket.userId] = (stats.byUser[socket.userId] || 0) + 1;
        }
      }

      return stats;
    } catch (error) {
      console.error("Error getting connection stats:", error);
      return { total: 0, authenticated: 0, byRole: {}, byUser: {} };
    }
  }

  /**
   * Disconnect user from WebSocket
   * @param {string} userId - User ID
   * @returns {Promise<number>} Number of disconnected sockets
   */
  async disconnectUser(userId) {
    try {
      if (!this.io) {
        return 0;
      }

      const room = `user-${userId}`;
      const connectedSockets = await this.io.in(room).fetchSockets();

      let disconnectedCount = 0;
      for (const socket of connectedSockets) {
        socket.disconnect(true);
        disconnectedCount++;
      }

      console.log(
        `🔌 Disconnected ${disconnectedCount} sockets for user ${userId}`
      );
      return disconnectedCount;
    } catch (error) {
      console.error("Error disconnecting user:", error);
      return 0;
    }
  }

  /**
   * Update notification delivery status (optional feature)
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID
   */
  async updateNotificationDeliveryStatus(notificationId, userId) {
    try {
      // This could be used to track delivery confirmation
      // For now, just log the acknowledgment
      console.log(
        `📝 Delivery confirmed for notification ${notificationId} to user ${userId}`
      );

      // Optionally update database with delivery confirmation
      // const Notification = (await import("../models/Notification.js")).default;
      // await Notification.findByIdAndUpdate(notificationId, {
      //   deliveryConfirmed: true,
      //   deliveryConfirmedAt: new Date()
      // });
    } catch (error) {
      console.error("Error updating notification delivery status:", error);
    }
  }

  /**
   * Send system status update to all connected clients
   * @param {Object} statusData - Status data
   */
  async sendSystemStatus(statusData) {
    try {
      if (!this.io) {
        return;
      }

      this.io.emit("system-status", {
        ...statusData,
        timestamp: new Date().toISOString(),
      });

      console.log("📊 System status update sent to all connected clients");
    } catch (error) {
      console.error("Error sending system status:", error);
    }
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
export default websocketService;
