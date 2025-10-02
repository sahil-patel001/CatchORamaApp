import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      // index: true, // Removed - using compound indexes below
    },
    type: {
      type: String,
      required: [true, "Notification type is required"],
      enum: [
        "low_stock",
        "new_order",
        "order_status_update",
        "product_approved",
        "product_rejected",
        "commission_payment",
        "system_maintenance",
        "account_update",
        "cubic_volume_alert",
        "system_alert",
        "commission_update",
        "product_archived",
        "vendor_status_change",
        "general",
      ],
      // index: true, // Removed - using compound indexes below
    },
    title: {
      type: String,
      required: [true, "Notification title is required"],
      trim: true,
      maxlength: [200, "Title must be less than 200 characters"],
    },
    message: {
      type: String,
      required: [true, "Notification message is required"],
      trim: true,
      maxlength: [1000, "Message must be less than 1000 characters"],
    },
    isRead: {
      type: Boolean,
      default: false,
      // index: true, // Removed - using compound indexes below
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      validate: {
        validator: function (v) {
          // Ensure metadata is an object if provided
          return v === null || v === undefined || typeof v === "object";
        },
        message: "Metadata must be an object",
      },
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      // index: true, // Removed - using compound indexes below
    },
    category: {
      type: String,
      enum: ["product", "order", "system", "account", "commission"],
      required: [true, "Notification category is required"],
      // index: true, // Removed - using compound indexes below
    },
    actionUrl: {
      type: String,
      trim: true,
      maxlength: [500, "Action URL must be less than 500 characters"],
      validate: {
        validator: function (v) {
          if (!v) return true; // Optional field
          // Basic URL validation
          try {
            new URL(v);
            return true;
          } catch {
            return /^\/[a-zA-Z0-9\-_\/\?\&\=]*$/.test(v); // Allow relative URLs
          }
        },
        message: "Please provide a valid URL or relative path",
      },
    },
    expiresAt: {
      type: Date,
      // TTL index will be created separately below
    },
    deliveryStatus: {
      email: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
        error: String,
      },
      push: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
        error: String,
      },
      inApp: {
        delivered: { type: Boolean, default: true },
        deliveredAt: { type: Date, default: Date.now },
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        // Remove sensitive fields from JSON output
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Virtual for user information
notificationSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

// Virtual for formatted creation date
notificationSchema.virtual("formattedDate").get(function () {
  return this.createdAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
});

// Virtual for time ago
notificationSchema.virtual("timeAgo").get(function () {
  const now = new Date();
  const diffMs = now - this.createdAt;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return this.createdAt.toLocaleDateString();
});

// Compound indexes for efficient queries
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, category: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, priority: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 }); // For admin queries
notificationSchema.index({ expiresAt: 1 }); // TTL index

// Instance method to mark as read
notificationSchema.methods.markAsRead = function () {
  this.isRead = true;
  return this.save();
};

// Instance method to check if notification is expired
notificationSchema.methods.isExpired = function () {
  return this.expiresAt && this.expiresAt < new Date();
};

// Instance method to get notification summary
notificationSchema.methods.getSummary = function () {
  return {
    id: this._id,
    type: this.type,
    title: this.title,
    message:
      this.message.substring(0, 100) + (this.message.length > 100 ? "..." : ""),
    isRead: this.isRead,
    priority: this.priority,
    category: this.category,
    timeAgo: this.timeAgo,
    actionUrl: this.actionUrl,
  };
};

// Static method to find unread notifications for a user
notificationSchema.statics.findUnreadByUser = function (userId, limit = 10) {
  return this.find({
    userId,
    isRead: false,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gte: new Date() } },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get notification count for user
notificationSchema.statics.getUnreadCount = function (userId) {
  return this.countDocuments({
    userId,
    isRead: false,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gte: new Date() } },
    ],
  });
};

// Static method to mark all as read for user
notificationSchema.statics.markAllAsReadForUser = function (userId) {
  return this.updateMany({ userId, isRead: false }, { isRead: true });
};

// Static method to find notifications with pagination
notificationSchema.statics.findWithPagination = function (
  userId,
  options = {}
) {
  const {
    page = 1,
    limit = 20,
    type,
    category,
    isRead,
    priority,
    sortBy = "createdAt",
    sortOrder = -1,
    search,
    startDate,
    endDate,
  } = options;

  const query = { userId };

  // Add filters
  if (type) query.type = type;
  if (category) query.category = category;
  if (typeof isRead === "boolean") query.isRead = isRead;
  if (priority) query.priority = priority;

  // Add search functionality
  if (search) {
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { title: { $regex: search, $options: "i" } },
        { message: { $regex: search, $options: "i" } },
        { type: { $regex: search, $options: "i" } },
      ],
    });
  }

  // Add date range filtering
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      query.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      // Add 23:59:59 to include the entire end date
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      query.createdAt.$lte = endOfDay;
    }
  }

  // Exclude expired notifications
  const expirationCondition = {
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gte: new Date() } },
    ],
  };

  // Combine expiration condition with existing query
  if (query.$and) {
    query.$and.push(expirationCondition);
  } else {
    query.$and = [expirationCondition];
  }

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder };

  return Promise.all([
    this.find(query).sort(sort).skip(skip).limit(limit).lean(),
    this.countDocuments(query),
  ]).then(([notifications, total]) => ({
    notifications,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  }));
};

// Static method to create notification with validation
notificationSchema.statics.createNotification = async function (data) {
  const {
    userId,
    type,
    title,
    message,
    metadata = {},
    priority = "medium",
    category,
    actionUrl,
    expiresAt,
  } = data;

  // Validate required fields
  if (!userId || !type || !title || !message || !category) {
    throw new Error("Missing required notification fields");
  }

  // Create notification
  const notification = new this({
    userId,
    type,
    title,
    message,
    metadata,
    priority,
    category,
    actionUrl,
    expiresAt,
  });

  return await notification.save();
};

// Static method to cleanup expired notifications
notificationSchema.statics.cleanupExpired = function () {
  return this.deleteMany({
    expiresAt: { $lt: new Date() },
  });
};

// Pre-save middleware for validation and processing
notificationSchema.pre("save", function (next) {
  // Ensure metadata is properly formatted
  if (this.metadata && typeof this.metadata !== "object") {
    this.metadata = {};
  }

  // Set default expiration for certain types (30 days)
  if (
    !this.expiresAt &&
    ["system_maintenance", "general"].includes(this.type)
  ) {
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }

  // Auto-set category based on type if not provided
  if (!this.category) {
    const categoryMapping = {
      low_stock: "product",
      new_order: "order",
      order_status_update: "order",
      product_approved: "product",
      product_rejected: "product",
      commission_payment: "commission",
      system_maintenance: "system",
      account_update: "account",
      cubic_volume_alert: "product",
      general: "system",
    };
    this.category = categoryMapping[this.type] || "system";
  }

  next();
});

// Pre-remove middleware to clean up related data
notificationSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function (next) {
    // Add any cleanup logic here if needed
    next();
  }
);

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
