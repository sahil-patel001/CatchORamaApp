/**
 * Barcode Database Indexing Service
 *
 * This service manages database indexes for optimal barcode search and lookup performance.
 * It provides index creation, optimization, and monitoring capabilities.
 */

import mongoose from "mongoose";
import Product from "../models/Product.js";
import Barcode from "../models/Barcode.js";
import Vendor from "../models/Vendor.js";

/**
 * Create optimized indexes for barcode operations
 * @param {Object} options - Indexing options
 * @returns {Object} Index creation results
 */
export const createBarcodeIndexes = async (options = {}) => {
  const { dropExisting = false, background = true, verbose = true } = options;

  const results = {
    success: true,
    created: [],
    errors: [],
    summary: {
      totalIndexes: 0,
      successCount: 0,
      errorCount: 0,
    },
  };

  if (verbose) {
    console.log("🔍 Creating optimized barcode indexes...");
  }

  try {
    // ============= BARCODE COLLECTION INDEXES =============

    const barcodeIndexes = [
      // Primary search indexes
      {
        name: "barcode_text_unique",
        spec: { barcodeText: 1 },
        options: { unique: true, background },
      },
      {
        name: "product_id_index",
        spec: { productId: 1 },
        options: { background },
      },
      {
        name: "vendor_id_index",
        spec: { vendorId: 1 },
        options: { background },
      },

      // Search and filtering indexes
      {
        name: "vendor_prefix_index",
        spec: { vendorPrefix: 1 },
        options: { background },
      },
      {
        name: "product_name_text",
        spec: { productName: "text" },
        options: { background },
      },
      {
        name: "price_range_index",
        spec: { price: 1 },
        options: { background },
      },

      // Status and metadata indexes
      {
        name: "metadata_active_index",
        spec: { "metadata.isActive": 1 },
        options: { background },
      },
      {
        name: "validation_valid_index",
        spec: { "validation.isValid": 1 },
        options: { background },
      },
      {
        name: "metadata_generated_date",
        spec: { "metadata.generatedAt": -1 },
        options: { background },
      },
      {
        name: "created_date_desc",
        spec: { createdAt: -1 },
        options: { background },
      },

      // Usage tracking indexes
      {
        name: "usage_print_count",
        spec: { "usage.printCount": -1 },
        options: { background },
      },
      {
        name: "usage_last_printed",
        spec: { "usage.lastPrinted": -1 },
        options: { background, sparse: true },
      },

      // Image data indexes
      {
        name: "image_storage_type",
        spec: { "imageData.storageType": 1 },
        options: { background },
      },
      {
        name: "image_has_image",
        spec: { "imageData.hasImage": 1 },
        options: { background },
      },

      // Compound indexes for common query patterns
      {
        name: "vendor_active_compound",
        spec: { vendorId: 1, "metadata.isActive": 1 },
        options: { background },
      },
      {
        name: "product_active_compound",
        spec: { productId: 1, "metadata.isActive": 1 },
        options: { background },
      },
      {
        name: "vendor_prefix_active_compound",
        spec: { vendorPrefix: 1, "metadata.isActive": 1 },
        options: { background },
      },
      {
        name: "vendor_valid_compound",
        spec: { vendorId: 1, "validation.isValid": 1 },
        options: { background },
      },
      {
        name: "active_valid_compound",
        spec: { "metadata.isActive": 1, "validation.isValid": 1 },
        options: { background },
      },
      {
        name: "vendor_generated_date_compound",
        spec: { vendorId: 1, "metadata.generatedAt": -1 },
        options: { background },
      },
      {
        name: "vendor_print_count_compound",
        spec: { vendorId: 1, "usage.printCount": -1 },
        options: { background },
      },

      // Analytics and reporting indexes
      {
        name: "analytics_date_vendor_compound",
        spec: { createdAt: -1, vendorId: 1, "metadata.isActive": 1 },
        options: { background },
      },
      {
        name: "regeneration_tracking",
        spec: { "metadata.regenerationReason": 1, "metadata.generatedAt": -1 },
        options: { background, sparse: true },
      },

      // Search optimization indexes
      {
        name: "barcode_search_compound",
        spec: {
          barcodeText: 1,
          "metadata.isActive": 1,
          "validation.isValid": 1,
        },
        options: { background },
      },
      {
        name: "vendor_search_compound",
        spec: {
          vendorId: 1,
          vendorPrefix: 1,
          "metadata.isActive": 1,
        },
        options: { background },
      },
    ];

    // Create Barcode collection indexes
    for (const indexDef of barcodeIndexes) {
      try {
        if (dropExisting) {
          try {
            await Barcode.collection.dropIndex(indexDef.name);
            if (verbose)
              console.log(`   Dropped existing index: ${indexDef.name}`);
          } catch (error) {
            // Index might not exist, continue
          }
        }

        await Barcode.collection.createIndex(indexDef.spec, {
          name: indexDef.name,
          ...indexDef.options,
        });

        results.created.push({
          collection: "barcodes",
          name: indexDef.name,
          spec: indexDef.spec,
        });
        results.summary.successCount++;

        if (verbose) {
          console.log(`   ✅ Created barcode index: ${indexDef.name}`);
        }
      } catch (error) {
        results.errors.push({
          collection: "barcodes",
          name: indexDef.name,
          error: error.message,
        });
        results.summary.errorCount++;

        if (verbose) {
          console.error(
            `   ❌ Failed to create barcode index ${indexDef.name}: ${error.message}`
          );
        }
      }
    }

    // ============= PRODUCT COLLECTION BARCODE INDEXES =============

    const productBarcodeIndexes = [
      // Barcode data indexes
      {
        name: "barcode_data_id_index",
        spec: { "barcodeData.barcodeId": 1 },
        options: { background, sparse: true },
      },
      {
        name: "barcode_data_text_index",
        spec: { "barcodeData.barcodeText": 1 },
        options: { background, sparse: true },
      },
      {
        name: "barcode_data_has_barcode",
        spec: { "barcodeData.hasBarcode": 1 },
        options: { background },
      },
      {
        name: "barcode_data_generated",
        spec: { "barcodeData.barcodeGenerated": 1 },
        options: { background },
      },
      {
        name: "barcode_data_version",
        spec: { "barcodeData.barcodeVersion": -1 },
        options: { background },
      },
      {
        name: "barcode_data_last_update",
        spec: { "barcodeData.lastBarcodeUpdate": -1 },
        options: { background, sparse: true },
      },

      // Invalidation tracking indexes
      {
        name: "barcode_invalidation_date",
        spec: { "barcodeData.invalidatedAt": -1 },
        options: { background, sparse: true },
      },
      {
        name: "barcode_auto_regenerate",
        spec: { "barcodeData.autoRegenerateEnabled": 1 },
        options: { background },
      },

      // Compound indexes for barcode queries
      {
        name: "vendor_has_barcode_compound",
        spec: { vendorId: 1, "barcodeData.hasBarcode": 1 },
        options: { background },
      },
      {
        name: "vendor_barcode_generated_compound",
        spec: { vendorId: 1, "barcodeData.barcodeGenerated": 1 },
        options: { background },
      },
      {
        name: "has_barcode_generated_compound",
        spec: {
          "barcodeData.hasBarcode": 1,
          "barcodeData.barcodeGenerated": 1,
        },
        options: { background },
      },
      {
        name: "vendor_barcode_status_compound",
        spec: {
          vendorId: 1,
          "barcodeData.hasBarcode": 1,
          "barcodeData.barcodeGenerated": 1,
        },
        options: { background },
      },

      // Regeneration tracking compound indexes
      {
        name: "barcode_needs_regeneration",
        spec: {
          "barcodeData.hasBarcode": 1,
          "barcodeData.barcodeGenerated": 1,
          "barcodeData.invalidatedAt": -1,
        },
        options: { background },
      },
      {
        name: "vendor_regeneration_tracking",
        spec: {
          vendorId: 1,
          "barcodeData.hasBarcode": 1,
          "barcodeData.barcodeGenerated": 1,
          "barcodeData.lastBarcodeUpdate": -1,
        },
        options: { background },
      },

      // Auto-regeneration compound indexes
      {
        name: "auto_regenerate_enabled_compound",
        spec: {
          "barcodeData.autoRegenerateEnabled": 1,
          "barcodeData.hasBarcode": 1,
          "barcodeData.barcodeGenerated": 1,
        },
        options: { background },
      },
    ];

    // Create Product collection barcode indexes
    for (const indexDef of productBarcodeIndexes) {
      try {
        if (dropExisting) {
          try {
            await Product.collection.dropIndex(indexDef.name);
            if (verbose)
              console.log(
                `   Dropped existing product index: ${indexDef.name}`
              );
          } catch (error) {
            // Index might not exist, continue
          }
        }

        await Product.collection.createIndex(indexDef.spec, {
          name: indexDef.name,
          ...indexDef.options,
        });

        results.created.push({
          collection: "products",
          name: indexDef.name,
          spec: indexDef.spec,
        });
        results.summary.successCount++;

        if (verbose) {
          console.log(`   ✅ Created product barcode index: ${indexDef.name}`);
        }
      } catch (error) {
        results.errors.push({
          collection: "products",
          name: indexDef.name,
          error: error.message,
        });
        results.summary.errorCount++;

        if (verbose) {
          console.error(
            `   ❌ Failed to create product barcode index ${indexDef.name}: ${error.message}`
          );
        }
      }
    }

    results.summary.totalIndexes =
      barcodeIndexes.length + productBarcodeIndexes.length;

    if (verbose) {
      console.log(`\n📊 Barcode Indexing Summary:`);
      console.log(`   Total indexes: ${results.summary.totalIndexes}`);
      console.log(`   Successfully created: ${results.summary.successCount}`);
      console.log(`   Errors: ${results.summary.errorCount}`);
    }

    return results;
  } catch (error) {
    console.error("❌ Error creating barcode indexes:", error);
    results.success = false;
    results.error = error.message;
    return results;
  }
};

/**
 * Analyze index usage and performance
 * @returns {Object} Index analysis results
 */
export const analyzeBarcodeIndexUsage = async () => {
  try {
    console.log("📊 Analyzing barcode index usage...");

    // Get index stats for Barcode collection
    const barcodeIndexStats = await Barcode.collection.indexStats();

    // Get index stats for Product collection (barcode-related only)
    const productIndexStats = await Product.collection.indexStats();

    // Filter product indexes to barcode-related ones
    const barcodeRelatedIndexes = productIndexStats.filter(
      (stat) =>
        stat.name.includes("barcode") ||
        (stat.key && JSON.stringify(stat.key).includes("barcodeData"))
    );

    // Analyze query patterns
    const queryPatterns = await analyzeQueryPatterns();

    return {
      success: true,
      data: {
        barcodeIndexes: barcodeIndexStats,
        productBarcodeIndexes: barcodeRelatedIndexes,
        queryPatterns,
        recommendations: generateIndexRecommendations(
          barcodeIndexStats,
          barcodeRelatedIndexes
        ),
      },
    };
  } catch (error) {
    console.error("Error analyzing barcode index usage:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Analyze common query patterns for index optimization
 * @returns {Object} Query pattern analysis
 */
const analyzeQueryPatterns = async () => {
  try {
    // Get sample of recent queries from MongoDB profiler if enabled
    // This is a simplified analysis based on common patterns

    const patterns = {
      // Barcode collection patterns
      barcodePatterns: [
        {
          pattern: "{ barcodeText: 1 }",
          frequency: "high",
          description: "Unique barcode lookup",
        },
        {
          pattern: "{ vendorId: 1, 'metadata.isActive': 1 }",
          frequency: "high",
          description: "Active barcodes by vendor",
        },
        {
          pattern: "{ productId: 1 }",
          frequency: "medium",
          description: "Barcode by product",
        },
        {
          pattern: "{ vendorPrefix: 1, 'metadata.isActive': 1 }",
          frequency: "medium",
          description: "Active barcodes by vendor prefix",
        },
        {
          pattern: "{ 'validation.isValid': 1, 'metadata.isActive': 1 }",
          frequency: "medium",
          description: "Valid active barcodes",
        },
      ],

      // Product collection patterns
      productPatterns: [
        {
          pattern:
            "{ 'barcodeData.hasBarcode': 1, 'barcodeData.barcodeGenerated': 1 }",
          frequency: "high",
          description: "Products needing regeneration",
        },
        {
          pattern: "{ vendorId: 1, 'barcodeData.hasBarcode': 1 }",
          frequency: "high",
          description: "Products with barcodes by vendor",
        },
        {
          pattern: "{ 'barcodeData.barcodeText': 1 }",
          frequency: "medium",
          description: "Product by barcode text",
        },
        {
          pattern: "{ 'barcodeData.autoRegenerateEnabled': 1 }",
          frequency: "low",
          description: "Auto-regeneration enabled products",
        },
      ],
    };

    return patterns;
  } catch (error) {
    console.error("Error analyzing query patterns:", error);
    return { error: error.message };
  }
};

/**
 * Generate index recommendations based on usage analysis
 * @param {Array} barcodeStats - Barcode collection index stats
 * @param {Array} productStats - Product collection barcode index stats
 * @returns {Array} Recommendations
 */
const generateIndexRecommendations = (barcodeStats, productStats) => {
  const recommendations = [];

  // Analyze unused indexes
  const unusedBarcodeIndexes = barcodeStats.filter(
    (stat) => stat.accesses?.ops === 0 && stat.name !== "_id_"
  );

  const unusedProductIndexes = productStats.filter(
    (stat) => stat.accesses?.ops === 0 && stat.name !== "_id_"
  );

  if (unusedBarcodeIndexes.length > 0) {
    recommendations.push({
      type: "remove_unused",
      collection: "barcodes",
      indexes: unusedBarcodeIndexes.map((idx) => idx.name),
      reason: "These indexes are not being used and consume storage space",
    });
  }

  if (unusedProductIndexes.length > 0) {
    recommendations.push({
      type: "remove_unused",
      collection: "products",
      indexes: unusedProductIndexes.map((idx) => idx.name),
      reason: "These barcode-related indexes are not being used",
    });
  }

  // Recommend additional indexes based on missing patterns
  recommendations.push({
    type: "optimization",
    collection: "barcodes",
    suggestion:
      "Consider adding partial indexes for frequently filtered fields",
    reason:
      "Partial indexes can improve performance for specific query patterns",
  });

  return recommendations;
};

/**
 * Optimize existing barcode indexes
 * @param {Object} options - Optimization options
 * @returns {Object} Optimization results
 */
export const optimizeBarcodeIndexes = async (options = {}) => {
  const { removeUnused = false, verbose = true } = options;

  try {
    if (verbose) {
      console.log("🔧 Optimizing barcode indexes...");
    }

    // Analyze current index usage
    const analysis = await analyzeBarcodeIndexUsage();

    if (!analysis.success) {
      throw new Error(analysis.error);
    }

    const results = {
      success: true,
      optimizations: [],
      recommendations: analysis.data.recommendations,
    };

    // Remove unused indexes if requested
    if (removeUnused) {
      const unusedRecommendations = analysis.data.recommendations.filter(
        (rec) => rec.type === "remove_unused"
      );

      for (const rec of unusedRecommendations) {
        for (const indexName of rec.indexes) {
          try {
            if (rec.collection === "barcodes") {
              await Barcode.collection.dropIndex(indexName);
            } else if (rec.collection === "products") {
              await Product.collection.dropIndex(indexName);
            }

            results.optimizations.push({
              action: "dropped",
              collection: rec.collection,
              index: indexName,
            });

            if (verbose) {
              console.log(
                `   🗑️ Dropped unused index: ${rec.collection}.${indexName}`
              );
            }
          } catch (error) {
            if (verbose) {
              console.warn(
                `   ⚠️ Failed to drop index ${indexName}: ${error.message}`
              );
            }
          }
        }
      }
    }

    return results;
  } catch (error) {
    console.error("Error optimizing barcode indexes:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get comprehensive barcode index information
 * @returns {Object} Index information
 */
export const getBarcodeIndexInfo = async () => {
  try {
    // Get all indexes for both collections
    const barcodeIndexes = await Barcode.collection.listIndexes().toArray();
    const productIndexes = await Product.collection.listIndexes().toArray();

    // Filter product indexes to barcode-related ones
    const productBarcodeIndexes = productIndexes.filter(
      (index) =>
        index.name.includes("barcode") ||
        JSON.stringify(index.key).includes("barcodeData")
    );

    // Get collection stats
    const barcodeStats = await Barcode.collection.stats();
    const productStats = await Product.collection.stats();

    return {
      success: true,
      data: {
        collections: {
          barcodes: {
            totalIndexes: barcodeIndexes.length,
            indexes: barcodeIndexes,
            stats: barcodeStats,
          },
          products: {
            barcodeIndexes: productBarcodeIndexes.length,
            indexes: productBarcodeIndexes,
            stats: productStats,
          },
        },
        summary: {
          totalBarcodeIndexes:
            barcodeIndexes.length + productBarcodeIndexes.length,
          indexSizeBytes:
            (barcodeStats.totalIndexSize || 0) +
            (productStats.totalIndexSize || 0),
        },
      },
    };
  } catch (error) {
    console.error("Error getting barcode index info:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export default {
  createBarcodeIndexes,
  analyzeBarcodeIndexUsage,
  optimizeBarcodeIndexes,
  getBarcodeIndexInfo,
};
