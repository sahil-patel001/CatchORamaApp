import mongoose from "mongoose";

const vendorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      unique: true,
    },
    businessName: {
      type: String,
      required: [true, "Business name is required"],
      trim: true,
      minlength: [2, "Business name must be at least 2 characters"],
      maxlength: [100, "Business name must be less than 100 characters"],
    },
    phone: {
      type: String,
      trim: true,
      match: [
        /^[\+]?[1-9][\d\-\s\(\)]{0,20}$/,
        "Please enter a valid phone number",
      ],
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
      full: String, // For simple address storage
    },
    businessDetails: {
      description: String,
      website: String,
      taxId: {
        type: String,
        trim: true,
        maxlength: [20, "Tax ID must be less than 20 characters"],
        match: [
          /^[A-Za-z0-9]*$/,
          "Tax ID must contain only alphanumeric characters",
        ],
      }, // For ABN - alphanumeric
      gstRegistered: {
        type: Boolean,
        default: false,
      },
      businessType: {
        type: String,
        enum: ["individual", "partnership", "corporation", "llc", "other"],
        default: "individual",
      },
    },
    settings: {
      notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        push: { type: Boolean, default: true },
      },
      preferences: {
        currency: { type: String, default: "USD" },
        timezone: { type: String, default: "UTC" },
        language: { type: String, default: "en" },
      },
      inventory: {
        defaultLowStockThreshold: {
          type: Number,
          default: 10,
          min: [0, "Low stock threshold cannot be negative"],
          max: [1000, "Low stock threshold cannot exceed 1000"],
        },
        autoReorderEnabled: { type: Boolean, default: false },
        autoReorderQuantity: { type: Number, default: 50 },
      },
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended", "pending"],
      default: "active",
    },
    verificationStatus: {
      email: { type: Boolean, default: false },
      phone: { type: Boolean, default: false },
      business: { type: Boolean, default: false },
    },
    vendorPrefix: {
      type: String,
      default: function () {
        // This will be set during pre-save middleware
        return null;
      },
      trim: true,
      maxlength: [10, "Vendor prefix must be less than 10 characters"],
      unique: true,
      sparse: true, // Allow null values but ensure uniqueness when set
    },
    commissionRate: {
      type: Number,
      default: 0.05, // Default 5% commission rate
      min: [0, "Commission rate cannot be negative"],
      max: [1, "Commission rate cannot exceed 100%"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for user information
vendorSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

/**
 * Generate next available vendor prefix
 * @param {Array} existingPrefixes - Array of existing prefixes
 * @returns {string} Next available prefix (e.g., "VD01", "VD02")
 */
function getNextVendorPrefix(existingPrefixes) {
  const usedNumbers = existingPrefixes
    .filter((prefix) => prefix && prefix.startsWith("VD"))
    .map((prefix) => {
      const match = prefix.match(/VD(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((num) => !isNaN(num));

  const maxNumber = usedNumbers.length > 0 ? Math.max(...usedNumbers) : 0;
  const nextNumber = maxNumber + 1;
  return `VD${nextNumber.toString().padStart(2, "0")}`;
}

// Pre-save middleware to generate vendor prefix
vendorSchema.pre("save", async function (next) {
  if (this.isNew && !this.vendorPrefix) {
    try {
      // Get all existing vendor prefixes
      const existingVendors = await this.constructor.find({}, "vendorPrefix");
      const existingPrefixes = existingVendors
        .map((vendor) => vendor.vendorPrefix)
        .filter((prefix) => prefix);

      // Generate unique prefix
      let newPrefix = getNextVendorPrefix(existingPrefixes);

      // Ensure uniqueness (double-check)
      while (existingPrefixes.includes(newPrefix)) {
        newPrefix = getNextVendorPrefix([...existingPrefixes, newPrefix]);
      }

      this.vendorPrefix = newPrefix;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Virtual for products
vendorSchema.virtual("products", {
  ref: "Product",
  localField: "_id",
  foreignField: "vendorId",
});

// Virtual for orders
vendorSchema.virtual("orders", {
  ref: "Order",
  localField: "_id",
  foreignField: "vendorId",
});

// Virtual for statistics
vendorSchema.virtual("stats", {
  ref: "VendorStats",
  localField: "_id",
  foreignField: "vendorId",
  justOne: true,
});

// Indexes for performance
// vendorSchema.index({ userId: 1 }); // Removed - unique constraint creates index automatically
vendorSchema.index({ businessName: 1 });
vendorSchema.index({ status: 1 });
vendorSchema.index({ "businessDetails.businessType": 1 });

// Instance method to get vendor statistics
vendorSchema.methods.getStats = async function () {
  const Product = mongoose.model("Product");
  const Order = mongoose.model("Order");

  const [productCount, orderStats] = await Promise.all([
    Product.countDocuments({ vendorId: this._id }),
    Order.aggregate([
      { $match: { vendorId: this._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$orderTotal" },
          avgOrderValue: { $avg: "$orderTotal" },
        },
      },
    ]),
  ]);

  const stats = orderStats[0] || {
    totalOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
  };

  return {
    products: productCount,
    orders: stats.totalOrders,
    revenue: stats.totalRevenue,
    avgOrderValue: stats.avgOrderValue,
    commissionOwed: stats.totalRevenue * this.commissionRate,
    commissionRate: this.commissionRate,
  };
};

// Static method to get vendor with user info
vendorSchema.statics.findWithUser = function (filter = {}) {
  return this.find(filter).populate("user", "-password -refreshToken");
};

// Static method to get vendor by user ID
vendorSchema.statics.findByUserId = function (userId) {
  return this.findOne({ userId }).populate("user", "-password -refreshToken");
};

// Pre-remove middleware to clean up related data
vendorSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function (next) {
    try {
      const Product = mongoose.model("Product");
      const Order = mongoose.model("Order");

      // Remove all products and orders associated with this vendor
      await Promise.all([
        Product.deleteMany({ vendorId: this._id }),
        Order.deleteMany({ vendorId: this._id }),
      ]);

      next();
    } catch (error) {
      next(error);
    }
  }
);

const Vendor = mongoose.model("Vendor", vendorSchema);

export default Vendor;
