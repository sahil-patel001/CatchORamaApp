/**
 * Barcode Regeneration Service
 *
 * This service handles automatic barcode regeneration when product details change.
 * It provides both synchronous and asynchronous regeneration options.
 */

import mongoose from "mongoose";
import Product from "../models/Product.js";
import Barcode from "../models/Barcode.js";
import Vendor from "../models/Vendor.js";
import {
  generateBarcode,
  validateBarcodeFormat,
  parseBarcode,
  formatPrice,
} from "../utils/barcodeUtils.js";
import {
  storeBarcodeImage,
  deleteBarcodeImage,
  regenerateBarcodeImage,
} from "./barcodeStorageService.js";

/**
 * Regenerate barcode for a single product
 * @param {string|ObjectId} productId - Product ID
 * @param {Object} options - Regeneration options
 * @returns {Object} Regeneration result
 */
export const regenerateProductBarcode = async (productId, options = {}) => {
  const {
    userId = null,
    reason = "product_details_changed",
    forceRegenerate = false,
    regenerateImage = true,
    preserveHistory = true,
  } = options;

  try {
    // Get product with vendor info
    const product = await Product.findById(productId).populate("vendorId");
    if (!product) {
      throw new Error("Product not found");
    }

    const vendor = product.vendorId;
    if (!vendor) {
      throw new Error("Vendor not found for product");
    }

    // Check if regeneration is needed
    if (!forceRegenerate && product.barcodeData?.barcodeGenerated) {
      return {
        success: true,
        skipped: true,
        reason: "Barcode is already up to date",
        productId,
      };
    }

    // Generate new barcode text
    const newBarcodeText = generateBarcode(
      product.name,
      product.price,
      vendor.businessName
    );

    // Validate the new barcode
    if (!validateBarcodeFormat(newBarcodeText)) {
      throw new Error(
        `Generated barcode has invalid format: ${newBarcodeText}`
      );
    }

    // Check if barcode text already exists for another product
    const existingBarcode = await Barcode.findOne({
      barcodeText: newBarcodeText,
      productId: { $ne: productId },
    });

    if (existingBarcode) {
      throw new Error(
        `Barcode text already exists for another product: ${newBarcodeText}`
      );
    }

    // Parse barcode components
    const components = parseBarcode(newBarcodeText);
    if (!components) {
      throw new Error(`Failed to parse barcode components: ${newBarcodeText}`);
    }

    // Add formatted price since parseBarcode doesn't return it
    components.formattedPrice = formatPrice(components.price);

    let barcodeDoc = null;
    let oldBarcodeDoc = null;

    // Get existing barcode document
    if (product.barcodeData?.barcodeId) {
      oldBarcodeDoc = await Barcode.findById(product.barcodeData.barcodeId);
    }

    // Create or update barcode document
    if (oldBarcodeDoc) {
      // Archive old barcode if preserving history
      if (preserveHistory) {
        oldBarcodeDoc.metadata.isActive = false;
        oldBarcodeDoc.metadata.replacedAt = new Date();
        oldBarcodeDoc.metadata.replacedBy = userId;
        oldBarcodeDoc.metadata.replacementReason = reason;
        await oldBarcodeDoc.save();
      } else {
        // Delete old barcode and its image
        await deleteBarcodeImage(oldBarcodeDoc._id);
      }

      // Create new barcode document
      barcodeDoc = new Barcode({
        productId: product._id,
        vendorId: vendor._id,
        barcodeText: newBarcodeText,
        vendorPrefix: components.vendorPrefix,
        productName: components.productName,
        price: components.price,
        formattedPrice: components.formattedPrice,
        imageData: {
          dataUrl: null,
          width: 300,
          height: 120,
          format: "png",
          options: {},
        },
        metadata: {
          generatedBy: userId,
          generatedAt: new Date(),
          lastUpdated: new Date(),
          version: (oldBarcodeDoc?.metadata?.version || 0) + 1,
          isActive: true,
          regenerationReason: reason,
          previousBarcodeId: preserveHistory ? oldBarcodeDoc._id : null,
        },
        usage: {
          printCount: 0,
          printHistory: [],
        },
        validation: {
          isValid: true,
          validationErrors: [],
          lastValidated: new Date(),
        },
      });
    } else {
      // Create new barcode document
      barcodeDoc = new Barcode({
        productId: product._id,
        vendorId: vendor._id,
        barcodeText: newBarcodeText,
        vendorPrefix: components.vendorPrefix,
        productName: components.productName,
        price: components.price,
        formattedPrice: components.formattedPrice,
        imageData: {
          dataUrl: null,
          width: 300,
          height: 120,
          format: "png",
          options: {},
        },
        metadata: {
          generatedBy: userId,
          generatedAt: new Date(),
          lastUpdated: new Date(),
          version: 1,
          isActive: true,
          regenerationReason: reason,
        },
        usage: {
          printCount: 0,
          printHistory: [],
        },
        validation: {
          isValid: true,
          validationErrors: [],
          lastValidated: new Date(),
        },
      });
    }

    await barcodeDoc.save();

    // Update product barcode data
    product.barcodeData = {
      barcodeId: barcodeDoc._id,
      barcodeText: newBarcodeText,
      hasBarcode: true,
      barcodeGenerated: true,
      lastBarcodeUpdate: new Date(),
      barcodeVersion: barcodeDoc.metadata.version,
    };

    await product.save();

    // Generate barcode image if requested
    let imageResult = null;
    if (regenerateImage) {
      try {
        imageResult = await storeBarcodeImage(
          barcodeDoc._id,
          newBarcodeText,
          { format: "png", width: 300, height: 120 },
          "local"
        );
      } catch (imageError) {
        console.warn(
          `Failed to generate barcode image for ${productId}:`,
          imageError
        );
        imageResult = { error: imageError.message };
      }
    }

    return {
      success: true,
      productId: product._id,
      barcodeId: barcodeDoc._id,
      oldBarcodeId: oldBarcodeDoc?._id || null,
      barcodeText: newBarcodeText,
      version: barcodeDoc.metadata.version,
      reason,
      imageResult,
      metadata: {
        generatedAt: barcodeDoc.metadata.generatedAt,
        preservedHistory: preserveHistory && !!oldBarcodeDoc,
      },
    };
  } catch (error) {
    console.error(
      `Error regenerating barcode for product ${productId}:`,
      error
    );
    return {
      success: false,
      productId,
      error: error.message,
      reason,
    };
  }
};

/**
 * Bulk regenerate barcodes for multiple products
 * @param {Array} productIds - Array of product IDs
 * @param {Object} options - Regeneration options
 * @returns {Object} Bulk regeneration results
 */
export const bulkRegenerateProductBarcodes = async (
  productIds,
  options = {}
) => {
  const {
    userId = null,
    reason = "bulk_regeneration",
    concurrency = 5,
    continueOnError = true,
  } = options;

  const results = [];
  const errors = [];

  // Process products in batches to avoid overwhelming the system
  for (let i = 0; i < productIds.length; i += concurrency) {
    const batch = productIds.slice(i, i + concurrency);

    const batchPromises = batch.map(async (productId) => {
      try {
        const result = await regenerateProductBarcode(productId, {
          ...options,
          userId,
          reason,
        });

        if (result.success) {
          results.push(result);
        } else {
          errors.push({
            productId,
            error: result.error,
          });
        }
      } catch (error) {
        errors.push({
          productId,
          error: error.message,
        });

        if (!continueOnError) {
          throw error;
        }
      }
    });

    await Promise.all(batchPromises);

    // Add small delay between batches to prevent overwhelming the database
    if (i + concurrency < productIds.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return {
    success: true,
    totalRequested: productIds.length,
    successCount: results.length,
    errorCount: errors.length,
    results,
    errors,
    summary: {
      processed: results.length + errors.length,
      successRate: ((results.length / productIds.length) * 100).toFixed(2),
    },
  };
};

/**
 * Regenerate barcodes for products that need regeneration
 * @param {Object} filters - Filter criteria for finding products
 * @param {Object} options - Regeneration options
 * @returns {Object} Regeneration results
 */
export const regenerateOutdatedBarcodes = async (
  filters = {},
  options = {}
) => {
  const {
    vendorId = null,
    limit = 100,
    userId = null,
    reason = "automated_regeneration",
  } = options;

  try {
    // Build query for products that need barcode regeneration
    const query = {
      "barcodeData.hasBarcode": true,
      "barcodeData.barcodeGenerated": false, // Products marked as needing regeneration
    };

    if (vendorId) {
      query.vendorId = vendorId;
    }

    // Add custom filters
    Object.assign(query, filters);

    // Find products that need regeneration
    const products = await Product.find(query)
      .limit(limit)
      .select("_id name barcodeData")
      .lean();

    if (products.length === 0) {
      return {
        success: true,
        message: "No products found that need barcode regeneration",
        totalRequested: 0,
        successCount: 0,
        errorCount: 0,
        results: [],
        errors: [],
      };
    }

    const productIds = products.map((p) => p._id);

    // Bulk regenerate barcodes
    const result = await bulkRegenerateProductBarcodes(productIds, {
      ...options,
      userId,
      reason,
    });

    return {
      ...result,
      message: `Regenerated barcodes for ${result.successCount} out of ${products.length} products`,
    };
  } catch (error) {
    console.error("Error regenerating outdated barcodes:", error);
    throw error;
  }
};

/**
 * Schedule automatic barcode regeneration for products with changes
 * @param {Object} options - Scheduling options
 * @returns {Object} Scheduling result
 */
export const scheduleAutomaticRegeneration = async (options = {}) => {
  const {
    checkInterval = 5 * 60 * 1000, // 5 minutes
    maxBatchSize = 50,
    userId = null,
  } = options;

  const regenerationJob = async () => {
    try {
      console.log("🔄 Running automatic barcode regeneration check...");

      const result = await regenerateOutdatedBarcodes(
        {},
        {
          limit: maxBatchSize,
          userId,
          reason: "scheduled_regeneration",
        }
      );

      if (result.successCount > 0) {
        console.log(
          `✅ Automatically regenerated ${result.successCount} barcodes`
        );
      }

      if (result.errorCount > 0) {
        console.warn(`⚠️ ${result.errorCount} barcode regenerations failed`);
        result.errors.forEach((error) => {
          console.warn(`   - Product ${error.productId}: ${error.error}`);
        });
      }

      return result;
    } catch (error) {
      console.error("❌ Error in automatic barcode regeneration:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  };

  // Run initial check
  await regenerationJob();

  // Schedule recurring checks
  const intervalId = setInterval(regenerationJob, checkInterval);

  return {
    success: true,
    message: "Automatic barcode regeneration scheduled",
    intervalId,
    checkInterval,
    maxBatchSize,
  };
};

/**
 * Get barcode regeneration statistics
 * @param {Object} filters - Filter criteria
 * @returns {Object} Statistics
 */
export const getBarcodeRegenerationStats = async (filters = {}) => {
  const { vendorId = null, startDate = null, endDate = null } = filters;

  try {
    // Build match stage for aggregation
    const matchStage = {
      "metadata.isActive": { $in: [true, false] }, // Include both active and inactive
    };

    if (vendorId) {
      matchStage.vendorId = new mongoose.Types.ObjectId(vendorId);
    }

    if (startDate || endDate) {
      matchStage["metadata.generatedAt"] = {};
      if (startDate) {
        matchStage["metadata.generatedAt"].$gte = new Date(startDate);
      }
      if (endDate) {
        matchStage["metadata.generatedAt"].$lte = new Date(endDate);
      }
    }

    // Aggregation pipeline
    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalBarcodes: { $sum: 1 },
          activeBarcodes: {
            $sum: { $cond: ["$metadata.isActive", 1, 0] },
          },
          replacedBarcodes: {
            $sum: { $cond: ["$metadata.replacedAt", 1, 0] },
          },
          regeneratedBarcodes: {
            $sum: { $cond: ["$metadata.regenerationReason", 1, 0] },
          },
          averageVersion: { $avg: "$metadata.version" },
          regenerationReasons: { $addToSet: "$metadata.regenerationReason" },
        },
      },
      {
        $project: {
          _id: 0,
          totalBarcodes: 1,
          activeBarcodes: 1,
          replacedBarcodes: 1,
          regeneratedBarcodes: 1,
          averageVersion: { $round: ["$averageVersion", 2] },
          regenerationReasons: {
            $filter: {
              input: "$regenerationReasons",
              cond: { $ne: ["$$this", null] },
            },
          },
          replacementRate: {
            $round: [
              {
                $multiply: [
                  { $divide: ["$replacedBarcodes", "$totalBarcodes"] },
                  100,
                ],
              },
              2,
            ],
          },
          regenerationRate: {
            $round: [
              {
                $multiply: [
                  { $divide: ["$regeneratedBarcodes", "$totalBarcodes"] },
                  100,
                ],
              },
              2,
            ],
          },
        },
      },
    ];

    const stats = await Barcode.aggregate(pipeline);

    // Get products needing regeneration
    const productsNeedingRegeneration = await Product.countDocuments({
      "barcodeData.hasBarcode": true,
      "barcodeData.barcodeGenerated": false,
      ...(vendorId && { vendorId }),
    });

    return {
      success: true,
      data: {
        ...(stats[0] || {
          totalBarcodes: 0,
          activeBarcodes: 0,
          replacedBarcodes: 0,
          regeneratedBarcodes: 0,
          averageVersion: 0,
          regenerationReasons: [],
          replacementRate: 0,
          regenerationRate: 0,
        }),
        productsNeedingRegeneration,
        filters: { vendorId, startDate, endDate },
      },
    };
  } catch (error) {
    console.error("Error getting barcode regeneration stats:", error);
    throw error;
  }
};

export default {
  regenerateProductBarcode,
  bulkRegenerateProductBarcodes,
  regenerateOutdatedBarcodes,
  scheduleAutomaticRegeneration,
  getBarcodeRegenerationStats,
};
