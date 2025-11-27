import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: [true, "Vendor ID is required"],
    },
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      minlength: [2, "Product name must be at least 2 characters"],
      maxlength: [200, "Product name must be less than 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description must be less than 1000 characters"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    discountPrice: {
      type: Number,
      min: [0, "Discount price cannot be negative"],
      validate: {
        validator: function (value) {
          // Skip validation if no discount price is set
          if (!value) return true;

          // For updates, get the price from the update data or current document
          const currentPrice = this.getUpdate
            ? this.getUpdate().$set?.price ||
              this.getUpdate().price ||
              this._update?.price
            : this.price;

          // If we have a current price, validate against it
          if (currentPrice !== undefined && currentPrice !== null) {
            return value < currentPrice;
          }

          // If no current price available, skip validation (will be caught by other validations)
          return true;
        },
        message: "Discount price must be less than regular price",
      },
    },
    stock: {
      type: Number,
      required: [true, "Stock quantity is required"],
      min: [0, "Stock cannot be negative"],
      default: 0,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
      minlength: [2, "Category must be at least 2 characters"],
      maxlength: [50, "Category must be less than 50 characters"],
    },
    subcategory: {
      type: String,
      trim: true,
      maxlength: [50, "Subcategory must be less than 50 characters"],
    },
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        alt: String,
        isPrimary: {
          type: Boolean,
          default: false,
        },
      },
    ],
    specifications: {
      weight: Number,
      dimensions: {
        length: Number,
        width: Number,
        height: Number,
        unit: {
          type: String,
          enum: ["cm", "in", "m", "ft"],
          default: "cm",
        },
      },
      color: String,
      material: String,
      brand: String,
      model: String,
    },
    customFields: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "draft", "out_of_stock", "archived"],
      default: "active",
    },
    seo: {
      metaTitle: String,
      metaDescription: String,
      keywords: [String],
      slug: {
        type: String,
        sparse: true, // Removed global unique constraint
      },
    },
    inventory: {
      sku: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
      },
      barcode: String, // Legacy barcode field for backwards compatibility
      trackInventory: {
        type: Boolean,
        default: true,
      },
      lowStockThreshold: {
        type: Number,
        default: 10,
      },
    },
    // Barcode management
    barcodeData: {
      barcodeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Barcode",
        sparse: true,
        // index: true, // Removed - using specific indexes below
      },
      barcodeText: {
        type: String,
        sparse: true,
        maxlength: [32, "Barcode text must not exceed 32 characters"],
        validate: {
          validator: function (value) {
            if (!value) return true; // Optional field
            // Validate barcode format: ${Price}-{ProductName}-{VendorPrefix}
            const barcodeRegex = /^\$\d+\.\d{2}-[A-Za-z0-9]+-[A-Za-z0-9]+$/;
            return barcodeRegex.test(value);
          },
          message:
            "Barcode text must follow format: ${Price}-{ProductName}-{VendorPrefix}",
        },
      },
      hasBarcode: {
        type: Boolean,
        default: false,
        // index: true, // Removed - using specific indexes below
      },
      barcodeGenerated: {
        type: Boolean,
        default: false,
      },
      lastBarcodeUpdate: {
        type: Date,
      },
      barcodeVersion: {
        type: Number,
        default: 1,
        min: [1, "Barcode version must be at least 1"],
      },
      invalidationReason: {
        type: String,
        trim: true,
        maxlength: [200, "Invalidation reason must not exceed 200 characters"],
      },
      invalidatedAt: {
        type: Date,
      },
      autoRegenerateEnabled: {
        type: Boolean,
        default: false,
      },
    },
    pricing: {
      costPrice: Number,
      compareAtPrice: Number,
      taxable: {
        type: Boolean,
        default: true,
      },
    },
    shipping: {
      weight: Number,
      requiresShipping: {
        type: Boolean,
        default: true,
      },
    },
    length: {
      type: Number,
    },
    breadth: {
      type: Number,
    },
    height: {
      type: Number,
    },
    weight: {
      type: Number,
    },
    cubicWeight: {
      type: Number,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for vendor information
productSchema.virtual("vendor", {
  ref: "Vendor",
  localField: "vendorId",
  foreignField: "_id",
  justOne: true,
});

// Virtual for barcode information
productSchema.virtual("barcode", {
  ref: "Barcode",
  localField: "barcodeData.barcodeId",
  foreignField: "_id",
  justOne: true,
});

// Virtual for effective price (discount price if available, otherwise regular price)
productSchema.virtual("effectivePrice").get(function () {
  return this.discountPrice || this.price;
});

// Virtual for discount percentage
productSchema.virtual("discountPercentage").get(function () {
  if (!this.discountPrice) return 0;
  return Math.round(((this.price - this.discountPrice) / this.price) * 100);
});

// Virtual for stock status
productSchema.virtual("stockStatus").get(function () {
  if (this.stock === 0) return "out_of_stock";
  if (this.inventory && this.stock <= this.inventory.lowStockThreshold)
    return "low_stock";
  return "in_stock";
});

// Virtual for primary image
productSchema.virtual("primaryImage").get(function () {
  if (!this.images || !Array.isArray(this.images) || this.images.length === 0) {
    return null;
  }
  const primary = this.images.find((img) => img.isPrimary);
  return primary || this.images[0] || null;
});

// Indexes for performance - optimized for common queries
productSchema.index({ vendorId: 1 });
productSchema.index({ name: "text", description: "text" });
productSchema.index({ category: 1 });
productSchema.index({ status: 1 });
productSchema.index({ price: 1 });
productSchema.index({ stock: 1 });
productSchema.index({ createdAt: -1 });

// Compound indexes - most selective field first
productSchema.index({ vendorId: 1, status: 1, createdAt: -1 }); // Common vendor queries with sorting
productSchema.index({ status: 1, category: 1 }); // Category filtering on active products
productSchema.index({ vendorId: 1, category: 1, status: 1 }); // Vendor category queries
productSchema.index({ stock: 1, status: 1 }); // Low stock queries
productSchema.index({ price: 1, status: 1 }); // Price range queries on active products

// Unique constraints:
// 1. Product name must be unique within vendor + category combination
productSchema.index({ name: 1, vendorId: 1, category: 1 }, { unique: true });
// 2. SEO slug must be unique within vendor (for SEO purposes)
productSchema.index(
  { "seo.slug": 1, vendorId: 1 },
  { unique: true, sparse: true }
);

// Barcode indexes - handled by barcodeIndexingService.js
// productSchema.index({ "barcodeData.barcodeId": 1 }); // Removed - handled by barcodeIndexingService
// productSchema.index({ "barcodeData.barcodeText": 1 }); // Removed - handled by barcodeIndexingService
// productSchema.index({ "barcodeData.hasBarcode": 1 }); // Removed - handled by barcodeIndexingService
// productSchema.index({ vendorId: 1, "barcodeData.hasBarcode": 1 }); // Removed - handled by barcodeIndexingService

// Pre-save middleware to generate SKU if not provided
productSchema.pre("save", function (next) {
  if (this.inventory && !this.inventory.sku && this.isNew) {
    // Generate SKU: VENDOR_ID_TIMESTAMP
    this.inventory.sku = `${this.vendorId
      .toString()
      .slice(-6)
      .toUpperCase()}_${Date.now()}`;
  }
  next();
});

// Pre-save middleware to generate slug if not provided
productSchema.pre("save", function (next) {
  if (this.seo && !this.seo.slug && this.name) {
    this.seo.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  next();
});

// Pre-save middleware to invalidate barcode when product details change
productSchema.pre("save", function (next) {
  // Check if barcode-affecting fields have changed
  const barcodeAffectingFields = ["name", "price", "discountPrice"];
  const hasChanges = barcodeAffectingFields.some((field) =>
    this.isModified(field)
  );

  if (
    hasChanges &&
    this.barcodeData &&
    this.barcodeData.hasBarcode &&
    !this.isNew
  ) {
    // Mark barcode as needing regeneration
    this.barcodeData.barcodeGenerated = false;
    this.barcodeData.lastBarcodeUpdate = new Date();
    this.barcodeData.barcodeVersion += 1;

    // Add metadata about what changed
    this.barcodeData.invalidationReason = `Product details changed: ${barcodeAffectingFields
      .filter((field) => this.isModified(field))
      .join(", ")}`;
    this.barcodeData.invalidatedAt = new Date();
  }

  next();
});

// Post-save middleware to trigger automatic barcode regeneration (optional)
productSchema.post("save", async function (doc) {
  // Only trigger automatic regeneration if enabled via environment variable
  const autoRegenerate = process.env.AUTO_REGENERATE_BARCODES === "true";

  if (
    autoRegenerate &&
    doc.barcodeData &&
    doc.barcodeData.hasBarcode &&
    !doc.barcodeData.barcodeGenerated
  ) {
    try {
      // Import regeneration service dynamically to avoid circular dependencies
      const { regenerateProductBarcode } = await import(
        "../services/barcodeRegenerationService.js"
      );

      // Trigger regeneration in background (don't await to avoid blocking save)
      setImmediate(async () => {
        try {
          const result = await regenerateProductBarcode(doc._id, {
            reason: "automatic_product_update",
            forceRegenerate: true,
            regenerateImage: true,
            preserveHistory: true,
          });

          if (result.success) {
            console.log(
              `✅ Auto-regenerated barcode for product ${doc._id}: ${result.barcodeText}`
            );
          } else {
            console.warn(
              `⚠️ Failed to auto-regenerate barcode for product ${doc._id}: ${result.error}`
            );
          }
        } catch (error) {
          console.error(
            `❌ Error in automatic barcode regeneration for product ${doc._id}:`,
            error
          );
        }
      });
    } catch (error) {
      console.error("❌ Error importing barcode regeneration service:", error);
    }
  }
});

// Instance method to check if product is in stock
productSchema.methods.isInStock = function (quantity = 1) {
  return this.stock >= quantity && this.status === "active";
};

// Instance method to reduce stock
productSchema.methods.reduceStock = function (quantity) {
  if (this.stock < quantity) {
    throw new Error("Insufficient stock");
  }
  this.stock -= quantity;
  if (this.stock === 0) {
    this.status = "out_of_stock";
  }
  return this.save();
};

// Instance method to increase stock
productSchema.methods.increaseStock = function (quantity) {
  this.stock += quantity;
  if (this.status === "out_of_stock" && this.stock > 0) {
    this.status = "active";
  }
  return this.save();
};

// Instance method to archive product
productSchema.methods.archive = function () {
  this.status = "archived";
  return this.save();
};

// Instance method to unarchive product
productSchema.methods.unarchive = function () {
  this.status = "active";
  return this.save();
};

// Instance method to set barcode
productSchema.methods.setBarcode = function (barcodeId, barcodeText) {
  if (!this.barcodeData) {
    this.barcodeData = {};
  }
  this.barcodeData.barcodeId = barcodeId;
  this.barcodeData.barcodeText = barcodeText;
  this.barcodeData.hasBarcode = true;
  this.barcodeData.barcodeGenerated = true;
  this.barcodeData.lastBarcodeUpdate = new Date();
  this.barcodeData.barcodeVersion += 1;
  return this.save();
};

// Instance method to remove barcode
productSchema.methods.removeBarcode = function () {
  if (this.barcodeData) {
    this.barcodeData.barcodeId = null;
    this.barcodeData.barcodeText = null;
    this.barcodeData.hasBarcode = false;
    this.barcodeData.lastBarcodeUpdate = new Date();
  }
  return this.save();
};

// Instance method to check if product has barcode
productSchema.methods.hasBarcode = function () {
  return (
    this.barcodeData &&
    this.barcodeData.hasBarcode &&
    this.barcodeData.barcodeId
  );
};

// Instance method to get barcode info
productSchema.methods.getBarcodeInfo = function () {
  if (!this.hasBarcode()) {
    return null;
  }
  return {
    barcodeId: this.barcodeData.barcodeId,
    barcodeText: this.barcodeData.barcodeText,
    version: this.barcodeData.barcodeVersion,
    lastUpdate: this.barcodeData.lastBarcodeUpdate,
    generated: this.barcodeData.barcodeGenerated,
  };
};

// Instance method to update barcode version (when product details change)
productSchema.methods.invalidateBarcode = function () {
  if (this.barcodeData && this.barcodeData.hasBarcode) {
    this.barcodeData.barcodeGenerated = false;
    this.barcodeData.lastBarcodeUpdate = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Static method to find products by vendor
productSchema.statics.findByVendor = function (vendorId, options = {}) {
  const query = { vendorId };
  if (options.status) query.status = options.status;
  return this.find(query).populate("vendor", "businessName");
};

// Static method to search products
productSchema.statics.search = function (searchTerm, options = {}) {
  const query = {
    $text: { $search: searchTerm },
    status: { $ne: "archived" }, // Exclude archived products by default
  };

  if (options.category) query.category = options.category;
  if (options.vendorId) query.vendorId = options.vendorId;
  if (options.includeArchived) {
    delete query.status; // Remove status filter to include archived products
  }

  return this.find(query, { score: { $meta: "textScore" } }).sort({
    score: { $meta: "textScore" },
  });
};

// Static method to find products with barcodes
productSchema.statics.findWithBarcodes = function (
  vendorId = null,
  options = {}
) {
  const query = {
    "barcodeData.hasBarcode": true,
    status: { $ne: "archived" },
  };

  if (vendorId) query.vendorId = vendorId;
  if (options.includeArchived) {
    delete query.status;
  }

  return this.find(query)
    .populate("vendor", "businessName")
    .populate("barcode");
};

// Static method to find products without barcodes
productSchema.statics.findWithoutBarcodes = function (
  vendorId = null,
  options = {}
) {
  const query = {
    $or: [
      { "barcodeData.hasBarcode": false },
      { "barcodeData.hasBarcode": { $exists: false } },
      { barcodeData: { $exists: false } },
    ],
    status: { $ne: "archived" },
  };

  if (vendorId) query.vendorId = vendorId;
  if (options.includeArchived) {
    delete query.status;
  }

  return this.find(query).populate("vendor", "businessName");
};

// Static method to find products by barcode text
productSchema.statics.findByBarcodeText = function (barcodeText) {
  return this.findOne({ "barcodeData.barcodeText": barcodeText })
    .populate("vendor", "businessName")
    .populate("barcode");
};

// Static method to get barcode statistics
productSchema.statics.getBarcodeStats = async function (vendorId = null) {
  const matchStage = { status: { $ne: "archived" } };
  if (vendorId) matchStage.vendorId = vendorId;

  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalProducts: { $sum: 1 },
        productsWithBarcodes: {
          $sum: {
            $cond: [{ $eq: ["$barcodeData.hasBarcode", true] }, 1, 0],
          },
        },
        productsWithoutBarcodes: {
          $sum: {
            $cond: [{ $ne: ["$barcodeData.hasBarcode", true] }, 1, 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalProducts: 1,
        productsWithBarcodes: 1,
        productsWithoutBarcodes: 1,
        barcodePercentage: {
          $cond: [
            { $eq: ["$totalProducts", 0] },
            0,
            {
              $multiply: [
                { $divide: ["$productsWithBarcodes", "$totalProducts"] },
                100,
              ],
            },
          ],
        },
      },
    },
  ];

  const stats = await this.aggregate(pipeline);
  return (
    stats[0] || {
      totalProducts: 0,
      productsWithBarcodes: 0,
      productsWithoutBarcodes: 0,
      barcodePercentage: 0,
    }
  );
};

const Product = mongoose.model("Product", productSchema);

export default Product;
