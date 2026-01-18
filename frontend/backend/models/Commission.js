import mongoose from "mongoose";

// Import will be added after CommissionHistory is defined to avoid circular dependency
let CommissionHistory;

const commissionSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: [true, "Vendor ID is required"],
    },
    period: {
      startDate: {
        type: Date,
        required: [true, "Period start date is required"],
      },
      endDate: {
        type: Date,
        required: [true, "Period end date is required"],
      },
      type: {
        type: String,
        enum: ["weekly", "monthly", "quarterly", "yearly", "custom"],
        default: "monthly",
      },
    },
    orderIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      },
    ],
    calculation: {
      totalRevenue: {
        type: Number,
        required: [true, "Total revenue is required"],
        min: [0, "Total revenue cannot be negative"],
      },
      commissionRate: {
        type: Number,
        required: [true, "Commission rate is required"],
        min: [0, "Commission rate cannot be negative"],
        max: [1, "Commission rate cannot exceed 100%"],
      },
      commissionAmount: {
        type: Number,
        required: [true, "Commission amount is required"],
        min: [0, "Commission amount cannot be negative"],
      },
      totalOrders: {
        type: Number,
        default: 0,
        min: [0, "Total orders cannot be negative"],
      },
      avgOrderValue: {
        type: Number,
        default: 0,
        min: [0, "Average order value cannot be negative"],
      },
    },
    status: {
      type: String,
      enum: [
        "pending",
        "calculated",
        "approved",
        "paid",
        "disputed",
        "cancelled",
      ],
      default: "pending",
    },
    payment: {
      method: {
        type: String,
        enum: ["bank_transfer", "paypal", "stripe", "check", "other"],
      },
      transactionId: String,
      paidAt: Date,
      paidBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      notes: String,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: Date,
    notes: String,
    metadata: {
      generatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      generatedAt: {
        type: Date,
        default: Date.now,
      },
      lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      lastModifiedAt: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for vendor information
commissionSchema.virtual("vendor", {
  ref: "Vendor",
  localField: "vendorId",
  foreignField: "_id",
  justOne: true,
});

// Virtual for orders
commissionSchema.virtual("orders", {
  ref: "Order",
  localField: "orderIds",
  foreignField: "_id",
});

// Virtual for period duration in days
commissionSchema.virtual("periodDuration").get(function () {
  if (this.period.startDate && this.period.endDate) {
    const diffTime = Math.abs(this.period.endDate - this.period.startDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  return 0;
});

// Virtual for payment status
commissionSchema.virtual("isPaid").get(function () {
  return this.status === "paid";
});

// Virtual for overdue status (30 days after approval)
commissionSchema.virtual("isOverdue").get(function () {
  if (this.status === "approved" && this.approvedAt) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return this.approvedAt < thirtyDaysAgo;
  }
  return false;
});

// Indexes for performance
commissionSchema.index({ vendorId: 1 });
commissionSchema.index({ status: 1 });
commissionSchema.index({ "period.startDate": 1, "period.endDate": 1 });
commissionSchema.index({ "payment.paidAt": 1 });
commissionSchema.index({ approvedAt: 1 });
commissionSchema.index({ createdAt: -1 });

// Compound indexes
commissionSchema.index({ vendorId: 1, status: 1 });
commissionSchema.index({
  vendorId: 1,
  "period.startDate": 1,
  "period.endDate": 1,
});

// Pre-save middleware to calculate commission amount
commissionSchema.pre("save", function (next) {
  if (
    this.isModified("calculation.totalRevenue") ||
    this.isModified("calculation.commissionRate")
  ) {
    this.calculation.commissionAmount =
      this.calculation.totalRevenue * this.calculation.commissionRate;
  }

  // Update lastModifiedAt
  if (!this.isNew) {
    this.metadata.lastModifiedAt = new Date();
  }

  next();
});

// Pre-save middleware to update payment status
commissionSchema.pre("save", function (next) {
  if (
    this.isModified("payment.paidAt") &&
    this.payment.paidAt &&
    this.status !== "paid"
  ) {
    this.status = "paid";
  }
  next();
});

// Instance method to approve commission
commissionSchema.methods.approve = function (approvedBy, metadata = {}) {
  const previousValues = { status: this.status };

  this.status = "approved";
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();
  this.metadata.lastModifiedBy = approvedBy;
  this.metadata.lastModifiedAt = new Date();

  const newValues = {
    status: this.status,
    approvedBy: this.approvedBy,
    approvedAt: this.approvedAt,
  };

  // Save the commission first
  return this.save().then(async (savedCommission) => {
    // History logging temporarily disabled
    console.log("Commission approved successfully - history logging disabled");
    return savedCommission;
  });
};

// Instance method to mark as paid
commissionSchema.methods.markAsPaid = function (
  paymentData,
  paidBy,
  metadata = {}
) {
  const previousValues = {
    status: this.status,
    payment: { ...this.payment },
  };

  this.status = "paid";
  this.payment = {
    ...this.payment,
    ...paymentData,
    paidAt: new Date(),
    paidBy,
  };
  this.metadata.lastModifiedBy = paidBy;
  this.metadata.lastModifiedAt = new Date();

  const newValues = {
    status: this.status,
    payment: { ...this.payment },
  };

  // Save the commission first
  return this.save().then(async (savedCommission) => {
    // History logging temporarily disabled
    console.log(
      "Commission marked as paid successfully - history logging disabled"
    );
    return savedCommission;
  });
};

// Instance method to dispute commission
commissionSchema.methods.dispute = function (notes, disputedBy, metadata = {}) {
  const previousValues = {
    status: this.status,
    notes: this.notes,
  };

  this.status = "disputed";
  this.notes = notes;
  this.metadata.lastModifiedBy = disputedBy;
  this.metadata.lastModifiedAt = new Date();

  const newValues = {
    status: this.status,
    notes: this.notes,
  };

  // Save the commission first
  return this.save().then(async (savedCommission) => {
    // History logging temporarily disabled to fix dispute functionality
    console.log("Commission disputed successfully - history logging disabled");
    return savedCommission;
  });
};

// Post-save middleware to log creation (temporarily disabled)
commissionSchema.post("save", async function (doc, next) {
  if (this.isNew) {
    console.log("Commission created successfully - history logging disabled");
  }
  next();
});

// Static method to find commissions by vendor
commissionSchema.statics.findByVendor = function (vendorId, options = {}) {
  const query = { vendorId };
  if (options.status) query.status = options.status;
  if (options.startDate || options.endDate) {
    query["period.startDate"] = {};
    if (options.startDate)
      query["period.startDate"].$gte = new Date(options.startDate);
    if (options.endDate)
      query["period.endDate"] = { $lte: new Date(options.endDate) };
  }

  return this.find(query)
    .populate("vendor", "businessName")
    .populate("approvedBy", "name email")
    .populate("payment.paidBy", "name email")
    .sort({ createdAt: -1 });
};

// Static method to get commission statistics
commissionSchema.statics.getStats = function (vendorId = null, dateRange = {}) {
  const matchStage = {};
  if (vendorId) matchStage.vendorId = new mongoose.Types.ObjectId(vendorId);
  if (dateRange.start || dateRange.end) {
    matchStage["period.startDate"] = {};
    if (dateRange.start)
      matchStage["period.startDate"].$gte = new Date(dateRange.start);
    if (dateRange.end)
      matchStage["period.endDate"] = { $lte: new Date(dateRange.end) };
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalCommissions: { $sum: 1 },
        totalAmount: { $sum: "$calculation.commissionAmount" },
        paidAmount: {
          $sum: {
            $cond: [
              { $eq: ["$status", "paid"] },
              "$calculation.commissionAmount",
              0,
            ],
          },
        },
        pendingAmount: {
          $sum: {
            $cond: [
              { $ne: ["$status", "paid"] },
              "$calculation.commissionAmount",
              0,
            ],
          },
        },
        statusBreakdown: {
          $push: "$status",
        },
      },
    },
    {
      $project: {
        totalCommissions: 1,
        totalAmount: { $round: ["$totalAmount", 2] },
        paidAmount: { $round: ["$paidAmount", 2] },
        pendingAmount: { $round: ["$pendingAmount", 2] },
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

// Static method to generate commission for a vendor and period
commissionSchema.statics.generateForVendor = async function (
  vendorId,
  startDate,
  endDate,
  generatedBy
) {
  const Order = mongoose.model("Order");
  const Vendor = mongoose.model("Vendor");

  // Check if commission already exists for this period
  const existingCommission = await this.findOne({
    vendorId,
    "period.startDate": { $lte: new Date(endDate) },
    "period.endDate": { $gte: new Date(startDate) },
  });

  if (existingCommission) {
    throw new Error("Commission already exists for this period");
  }

  // Get vendor information
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) {
    throw new Error("Vendor not found");
  }

  // Get orders for the period
  const orders = await Order.find({
    vendorId,
    createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
    status: "delivered",
    paymentStatus: "paid",
  });

  // Calculate totals
  const totalRevenue = orders.reduce((sum, order) => sum + order.orderTotal, 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Create commission record
  const commission = new this({
    vendorId,
    period: {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      type: "custom",
    },
    orderIds: orders.map((order) => order._id),
    calculation: {
      totalRevenue,
      commissionRate: vendor.commissionRate,
      commissionAmount: totalRevenue * vendor.commissionRate,
      totalOrders,
      avgOrderValue,
    },
    status: "calculated",
    metadata: {
      generatedBy,
      generatedAt: new Date(),
    },
  });

  return commission.save();
};

const Commission = mongoose.model("Commission", commissionSchema);

export default Commission;
