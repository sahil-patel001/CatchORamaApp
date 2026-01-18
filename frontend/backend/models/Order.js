import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product ID is required"],
    },
    name: {
      type: String,
      required: [true, "Product name is required"],
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    total: {
      type: Number,
      required: [true, "Total is required"],
      min: [0, "Total cannot be negative"],
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: [true, "Vendor ID is required"],
    },
    customer: {
      name: {
        type: String,
        required: [true, "Customer name is required"],
        trim: true,
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
        match: [
          /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
          "Please enter a valid email",
        ],
      },
      phone: {
        type: String,
        trim: true,
      },
    },
    items: {
      type: [orderItemSchema],
      required: [true, "Order items are required"],
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: "Order must have at least one item",
      },
    },
    orderTotal: {
      type: Number,
      required: [true, "Order total is required"],
      min: [0, "Order total cannot be negative"],
    },
    subtotal: {
      type: Number,
      required: true,
      min: [0, "Subtotal cannot be negative"],
    },
    tax: {
      amount: {
        type: Number,
        default: 0,
        min: [0, "Tax amount cannot be negative"],
      },
      rate: {
        type: Number,
        default: 0,
        min: [0, "Tax rate cannot be negative"],
        max: [1, "Tax rate cannot exceed 100%"],
      },
    },
    shipping: {
      amount: {
        type: Number,
        default: 0,
        min: [0, "Shipping amount cannot be negative"],
      },
      method: String,
      address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String,
      },
    },
    discount: {
      amount: {
        type: Number,
        default: 0,
        min: [0, "Discount amount cannot be negative"],
      },
      code: String,
      type: {
        type: String,
        enum: ["percentage", "fixed"],
        default: "fixed",
      },
    },
    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded", "partially_refunded"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: [
        "credit_card",
        "debit_card",
        "paypal",
        "stripe",
        "cash",
        "bank_transfer",
      ],
      default: "credit_card",
    },
    trackingInfo: {
      trackingNumber: String,
      trackingLink: String,
      carrier: String,
      shippedAt: Date,
      estimatedDelivery: Date,
    },
    notes: {
      customer: String,
      internal: String,
    },
    statusHistory: [
      {
        status: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        note: String,
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for vendor information
orderSchema.virtual("vendor", {
  ref: "Vendor",
  localField: "vendorId",
  foreignField: "_id",
  justOne: true,
});

// Virtual for total items count
orderSchema.virtual("totalItems").get(function () {
  return this.items && Array.isArray(this.items)
    ? this.items.reduce((total, item) => total + item.quantity, 0)
    : 0;
});

// Virtual for order age in days
orderSchema.virtual("ageInDays").get(function () {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Indexes for performance - optimized for common queries
orderSchema.index({ vendorId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ "customer.email": 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ "trackingInfo.trackingNumber": 1 });

// Compound indexes - most selective field first, optimized for common queries
orderSchema.index({ vendorId: 1, status: 1, createdAt: -1 }); // Vendor order listing with status filter
orderSchema.index({ vendorId: 1, createdAt: -1 }); // Vendor order listing by date
orderSchema.index({ status: 1, createdAt: -1 }); // Admin status filtering
orderSchema.index({ paymentStatus: 1, createdAt: -1 }); // Payment status queries
orderSchema.index({ "customer.email": 1, createdAt: -1 }); // Customer order history

// Pre-save middleware to generate order number
orderSchema.pre("save", async function (next) {
  if (!this.orderNumber && this.isNew) {
    const Vendor = mongoose.model("Vendor");
    const vendor = await Vendor.findById(this.vendorId);
    const prefix =
      vendor && vendor.vendorPrefix ? `${vendor.vendorPrefix}-` : "INV-";
    const count = await this.constructor.countDocuments({
      vendorId: this.vendorId,
    });
    this.orderNumber = `${prefix}${String(count + 1).padStart(6, "0")}`;
  }
  next();
});

// Pre-save middleware to calculate totals
orderSchema.pre("save", function (next) {
  // Calculate subtotal from items
  if (this.items && Array.isArray(this.items)) {
    this.subtotal = this.items.reduce((total, item) => {
      item.total = item.quantity * item.price;
      return total + item.total;
    }, 0);
  } else {
    this.subtotal = 0;
  }

  // Calculate order total
  this.orderTotal =
    this.subtotal +
    (this.tax?.amount || 0) +
    (this.shipping?.amount || 0) -
    (this.discount?.amount || 0);

  next();
});

// Pre-save middleware to track status changes
orderSchema.pre("save", function (next) {
  if (this.isModified("status") && !this.isNew) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
      note: `Status changed to ${this.status}`,
    });
  }
  next();
});

// Instance method to update status
orderSchema.methods.updateStatus = function (
  newStatus,
  note = "",
  updatedBy = null
) {
  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    note: note || `Status changed to ${newStatus}`,
    updatedBy,
  });
  return this.save();
};

// Instance method to add tracking info
orderSchema.methods.addTrackingInfo = function (trackingData) {
  this.trackingInfo = { ...this.trackingInfo, ...trackingData };
  if (this.status === "processing") {
    this.status = "shipped";
    this.trackingInfo.shippedAt = new Date();
  }
  return this.save();
};

// Static method to find orders by vendor
orderSchema.statics.findByVendor = function (vendorId, options = {}) {
  const query = { vendorId };
  if (options.status) query.status = options.status;
  if (options.paymentStatus) query.paymentStatus = options.paymentStatus;

  return this.find(query)
    .populate("vendor", "businessName")
    .sort({ createdAt: -1 });
};

// Static method to get order statistics
orderSchema.statics.getStats = function (vendorId = null, dateRange = {}) {
  const matchStage = {};
  if (vendorId) matchStage.vendorId = new mongoose.Types.ObjectId(vendorId);
  if (dateRange.start || dateRange.end) {
    matchStage.createdAt = {};
    if (dateRange.start) matchStage.createdAt.$gte = new Date(dateRange.start);
    if (dateRange.end) matchStage.createdAt.$lte = new Date(dateRange.end);
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: "$orderTotal" },
        avgOrderValue: { $avg: "$orderTotal" },
        statusBreakdown: {
          $push: "$status",
        },
      },
    },
    {
      $project: {
        totalOrders: 1,
        totalRevenue: 1,
        avgOrderValue: { $round: ["$avgOrderValue", 2] },
        statusCounts: {
          $arrayToObject: {
            $map: {
              input: { $setUnion: ["$statusBreakdown"] },
              as: "status",
              in: {
                k: "$$status",
                v: {
                  $size: {
                    $filter: {
                      input: "$statusBreakdown",
                      cond: { $eq: ["$$this", "$$status"] },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  ]);
};

const Order = mongoose.model("Order", orderSchema);

export default Order;
