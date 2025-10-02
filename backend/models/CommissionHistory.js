import mongoose from "mongoose";

const commissionHistorySchema = new mongoose.Schema(
  {
    commissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Commission",
      required: [true, "Commission ID is required"],
    },
    action: {
      type: String,
      enum: [
        "created",
        "calculated",
        "approved",
        "paid",
        "disputed",
        "updated",
        "cancelled",
        "regenerated",
        "status_changed",
        "payment_updated",
        "notes_updated",
      ],
      required: [true, "Action is required"],
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Performed by user is required"],
    },
    previousValues: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    newValues: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    changes: [{
      field: String,
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed,
    }],
    metadata: {
      ipAddress: String,
      userAgent: String,
      source: {
        type: String,
        enum: ["web", "api", "system", "bulk"],
        default: "web",
      },
      sessionId: String,
    },
    notes: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for commission information
commissionHistorySchema.virtual("commission", {
  ref: "Commission",
  localField: "commissionId",
  foreignField: "_id",
  justOne: true,
});

// Virtual for user information
commissionHistorySchema.virtual("user", {
  ref: "User",
  localField: "performedBy",
  foreignField: "_id",
  justOne: true,
});

// Indexes for performance
commissionHistorySchema.index({ commissionId: 1 });
commissionHistorySchema.index({ performedBy: 1 });
commissionHistorySchema.index({ action: 1 });
commissionHistorySchema.index({ timestamp: -1 });

// Compound indexes
commissionHistorySchema.index({ commissionId: 1, timestamp: -1 });
commissionHistorySchema.index({ performedBy: 1, timestamp: -1 });

// Static method to log commission action
commissionHistorySchema.statics.logAction = function (
  commissionId,
  action,
  performedBy,
  previousValues = {},
  newValues = {},
  metadata = {},
  notes = ""
) {
  // Calculate changes
  const changes = [];
  const allFields = new Set([...Object.keys(previousValues), ...Object.keys(newValues)]);
  
  allFields.forEach(field => {
    const oldValue = previousValues[field];
    const newValue = newValues[field];
    
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        field,
        oldValue,
        newValue,
      });
    }
  });

  return this.create({
    commissionId,
    action,
    performedBy,
    previousValues,
    newValues,
    changes,
    metadata,
    notes,
  });
};

// Static method to get commission history
commissionHistorySchema.statics.getCommissionHistory = function (
  commissionId,
  options = {}
) {
  const query = { commissionId };
  
  if (options.action) {
    query.action = options.action;
  }
  
  if (options.performedBy) {
    query.performedBy = options.performedBy;
  }
  
  if (options.startDate || options.endDate) {
    query.timestamp = {};
    if (options.startDate) query.timestamp.$gte = new Date(options.startDate);
    if (options.endDate) query.timestamp.$lte = new Date(options.endDate);
  }

  return this.find(query)
    .populate("performedBy", "name email")
    .sort({ timestamp: -1 })
    .limit(options.limit || 100);
};

// Static method to get user activity history
commissionHistorySchema.statics.getUserActivity = function (
  userId,
  options = {}
) {
  const query = { performedBy: userId };
  
  if (options.action) {
    query.action = options.action;
  }
  
  if (options.startDate || options.endDate) {
    query.timestamp = {};
    if (options.startDate) query.timestamp.$gte = new Date(options.startDate);
    if (options.endDate) query.timestamp.$lte = new Date(options.endDate);
  }

  return this.find(query)
    .populate("commission", "vendorId calculation.commissionAmount status")
    .sort({ timestamp: -1 })
    .limit(options.limit || 100);
};

// Static method to get activity statistics
commissionHistorySchema.statics.getActivityStats = function (options = {}) {
  const matchStage = {};
  
  if (options.startDate || options.endDate) {
    matchStage.timestamp = {};
    if (options.startDate) matchStage.timestamp.$gte = new Date(options.startDate);
    if (options.endDate) matchStage.timestamp.$lte = new Date(options.endDate);
  }
  
  if (options.performedBy) {
    matchStage.performedBy = new mongoose.Types.ObjectId(options.performedBy);
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalActions: { $sum: 1 },
        actionBreakdown: {
          $push: "$action",
        },
        userBreakdown: {
          $push: "$performedBy",
        },
        dailyActivity: {
          $push: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
            action: "$action",
          },
        },
      },
    },
    {
      $project: {
        totalActions: 1,
        actionCounts: {
          $arrayToObject: {
            $map: {
              input: { $setUnion: ["$actionBreakdown"] },
              as: "action",
              in: {
                k: "$$action",
                v: {
                  $size: {
                    $filter: {
                      input: "$actionBreakdown",
                      cond: { $eq: ["$$this", "$$action"] },
                    },
                  },
                },
              },
            },
          },
        },
        uniqueUsers: { $size: { $setUnion: ["$userBreakdown"] } },
        dailyActivityCounts: {
          $arrayToObject: {
            $map: {
              input: { $setUnion: ["$dailyActivity.date"] },
              as: "date",
              in: {
                k: "$$date",
                v: {
                  $size: {
                    $filter: {
                      input: "$dailyActivity",
                      cond: { $eq: ["$$this.date", "$$date"] },
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

const CommissionHistory = mongoose.model("CommissionHistory", commissionHistorySchema);

export default CommissionHistory;
