/**
 * Migration: Optimize Barcode Indexes
 * Version: 002
 * Created: 2024
 *
 * This migration:
 * 1. Creates optimized indexes for barcode search and lookup operations
 * 2. Adds compound indexes for common query patterns
 * 3. Creates specialized indexes for analytics and reporting
 * 4. Optimizes existing indexes for better performance
 */

import mongoose from "mongoose";
import { pathToFileURL } from 'url';
await import(pathToFileURL('../models/Product.js'));
await import(pathToFileURL('../models/Barcode.js'));
await import(pathToFileURL('../models/Vendor.js'));
import {
  createBarcodeIndexes,
  optimizeBarcodeIndexes,
} from import(pathToFileURL('../services/barcodeIndexingService.js'));

/**
 * Run the migration
 */
export const up = async () => {
  console.log("🚀 Starting Barcode Index Optimization Migration...");

  try {
    // Step 1: Create optimized barcode indexes
    console.log("📋 Step 1: Creating optimized barcode indexes...");

    const indexResults = await createBarcodeIndexes({
      dropExisting: false, // Don't drop existing indexes to avoid downtime
      background: true, // Create indexes in background
      verbose: true,
    });

    if (!indexResults.success) {
      throw new Error(
        `Failed to create barcode indexes: ${indexResults.error}`
      );
    }

    console.log(`✅ Index creation completed:`);
    console.log(
      `   - Successfully created: ${indexResults.summary.successCount} indexes`
    );
    console.log(`   - Errors: ${indexResults.summary.errorCount} indexes`);

    if (indexResults.errors.length > 0) {
      console.log("⚠️ Index creation errors:");
      indexResults.errors.forEach((error) => {
        console.log(`   - ${error.collection}.${error.name}: ${error.error}`);
      });
    }

    // Step 2: Create additional specialized indexes not covered by the service
    console.log("📋 Step 2: Creating specialized barcode indexes...");

    const specializedIndexes = [
      // Barcode collection specialized indexes
      {
        collection: Barcode,
        name: "barcode_full_text_search",
        spec: {
          barcodeText: "text",
          productName: "text",
          vendorPrefix: "text",
        },
        options: {
          background: true,
          name: "barcode_full_text_search",
          weights: {
            barcodeText: 10,
            productName: 5,
            vendorPrefix: 3,
          },
        },
      },
      {
        collection: Barcode,
        name: "barcode_price_range_active",
        spec: {
          price: 1,
          "metadata.isActive": 1,
          "validation.isValid": 1,
        },
        options: {
          background: true,
          name: "barcode_price_range_active",
        },
      },
      {
        collection: Barcode,
        name: "barcode_usage_analytics",
        spec: {
          vendorId: 1,
          "usage.printCount": -1,
          "metadata.generatedAt": -1,
        },
        options: {
          background: true,
          name: "barcode_usage_analytics",
        },
      },
      {
        collection: Barcode,
        name: "barcode_regeneration_history",
        spec: {
          "metadata.replacedAt": -1,
          "metadata.replacedBy": 1,
          "metadata.isActive": 1,
        },
        options: {
          background: true,
          name: "barcode_regeneration_history",
          sparse: true,
        },
      },

      // Product collection specialized indexes
      {
        collection: Product,
        name: "product_barcode_search_optimization",
        spec: {
          "barcodeData.barcodeText": 1,
          vendorId: 1,
          status: 1,
        },
        options: {
          background: true,
          name: "product_barcode_search_optimization",
          sparse: true,
        },
      },
      {
        collection: Product,
        name: "product_barcode_regeneration_queue",
        spec: {
          "barcodeData.hasBarcode": 1,
          "barcodeData.barcodeGenerated": 1,
          "barcodeData.invalidatedAt": -1,
          "barcodeData.autoRegenerateEnabled": 1,
        },
        options: {
          background: true,
          name: "product_barcode_regeneration_queue",
        },
      },
      {
        collection: Product,
        name: "product_barcode_analytics",
        spec: {
          vendorId: 1,
          "barcodeData.hasBarcode": 1,
          "barcodeData.lastBarcodeUpdate": -1,
          createdAt: -1,
        },
        options: {
          background: true,
          name: "product_barcode_analytics",
        },
      },
    ];

    let specializedSuccessCount = 0;
    let specializedErrorCount = 0;
    const specializedErrors = [];

    for (const indexDef of specializedIndexes) {
      try {
        await indexDef.collection.collection.createIndex(
          indexDef.spec,
          indexDef.options
        );
        specializedSuccessCount++;
        console.log(`   ✅ Created specialized index: ${indexDef.name}`);
      } catch (error) {
        specializedErrorCount++;
        specializedErrors.push({
          name: indexDef.name,
          error: error.message,
        });

        // Don't fail the migration for index creation errors, just log them
        console.warn(
          `   ⚠️ Failed to create specialized index ${indexDef.name}: ${error.message}`
        );
      }
    }

    console.log(`✅ Specialized index creation completed:`);
    console.log(
      `   - Successfully created: ${specializedSuccessCount} indexes`
    );
    console.log(`   - Errors: ${specializedErrorCount} indexes`);

    // Step 3: Optimize query performance with partial indexes
    console.log(
      "📋 Step 3: Creating partial indexes for query optimization..."
    );

    const partialIndexes = [
      // Active barcodes only
      {
        collection: Barcode,
        name: "barcode_active_only_partial",
        spec: { vendorId: 1, createdAt: -1 },
        options: {
          background: true,
          name: "barcode_active_only_partial",
          partialFilterExpression: { "metadata.isActive": true },
        },
      },
      // Valid barcodes only
      {
        collection: Barcode,
        name: "barcode_valid_only_partial",
        spec: { barcodeText: 1, vendorPrefix: 1 },
        options: {
          background: true,
          name: "barcode_valid_only_partial",
          partialFilterExpression: { "validation.isValid": true },
        },
      },
      // Products with barcodes only
      {
        collection: Product,
        name: "product_with_barcode_partial",
        spec: { vendorId: 1, "barcodeData.barcodeText": 1 },
        options: {
          background: true,
          name: "product_with_barcode_partial",
          partialFilterExpression: { "barcodeData.hasBarcode": true },
        },
      },
      // Products needing regeneration only
      {
        collection: Product,
        name: "product_needs_regeneration_partial",
        spec: { vendorId: 1, "barcodeData.invalidatedAt": -1 },
        options: {
          background: true,
          name: "product_needs_regeneration_partial",
          partialFilterExpression: {
            "barcodeData.hasBarcode": true,
            "barcodeData.barcodeGenerated": false,
          },
        },
      },
    ];

    let partialSuccessCount = 0;
    let partialErrorCount = 0;

    for (const indexDef of partialIndexes) {
      try {
        await indexDef.collection.collection.createIndex(
          indexDef.spec,
          indexDef.options
        );
        partialSuccessCount++;
        console.log(`   ✅ Created partial index: ${indexDef.name}`);
      } catch (error) {
        partialErrorCount++;
        console.warn(
          `   ⚠️ Failed to create partial index ${indexDef.name}: ${error.message}`
        );
      }
    }

    console.log(`✅ Partial index creation completed:`);
    console.log(`   - Successfully created: ${partialSuccessCount} indexes`);
    console.log(`   - Errors: ${partialErrorCount} indexes`);

    // Step 4: Create summary statistics
    const barcodeIndexCount = await Barcode.collection.listIndexes().toArray();
    const productIndexes = await Product.collection.listIndexes().toArray();
    const productBarcodeIndexCount = productIndexes.filter(
      (index) =>
        index.name.includes("barcode") ||
        JSON.stringify(index.key).includes("barcodeData")
    ).length;

    console.log("\n📊 Migration Summary:");
    console.log(
      `   - Total barcode collection indexes: ${barcodeIndexCount.length}`
    );
    console.log(
      `   - Total product barcode indexes: ${productBarcodeIndexCount}`
    );
    console.log(
      `   - Standard indexes created: ${indexResults.summary.successCount}`
    );
    console.log(`   - Specialized indexes created: ${specializedSuccessCount}`);
    console.log(`   - Partial indexes created: ${partialSuccessCount}`);
    console.log(
      `   - Total successful: ${
        indexResults.summary.successCount +
        specializedSuccessCount +
        partialSuccessCount
      }`
    );
    console.log(
      `   - Total errors: ${
        indexResults.summary.errorCount +
        specializedErrorCount +
        partialErrorCount
      }`
    );

    console.log(
      "\n🎉 Barcode Index Optimization Migration completed successfully!"
    );

    return {
      success: true,
      summary: {
        standardIndexes: {
          success: indexResults.summary.successCount,
          errors: indexResults.summary.errorCount,
        },
        specializedIndexes: {
          success: specializedSuccessCount,
          errors: specializedErrorCount,
        },
        partialIndexes: {
          success: partialSuccessCount,
          errors: partialErrorCount,
        },
        totalBarcodeIndexes: barcodeIndexCount.length,
        totalProductBarcodeIndexes: productBarcodeIndexCount,
      },
      errors: [...indexResults.errors, ...specializedErrors],
    };
  } catch (error) {
    console.error("💥 Migration failed:", error);
    throw error;
  }
};

/**
 * Rollback the migration
 */
export const down = async () => {
  console.log("🔄 Rolling back Barcode Index Optimization Migration...");

  try {
    // Get list of indexes to remove
    const indexesToRemove = [
      // Standard barcode indexes (keep only the basic ones)
      "vendor_prefix_index",
      "product_name_text",
      "price_range_index",
      "usage_print_count",
      "usage_last_printed",
      "image_storage_type",
      "image_has_image",
      "vendor_valid_compound",
      "active_valid_compound",
      "vendor_generated_date_compound",
      "vendor_print_count_compound",
      "analytics_date_vendor_compound",
      "regeneration_tracking",
      "barcode_search_compound",
      "vendor_search_compound",

      // Specialized indexes
      "barcode_full_text_search",
      "barcode_price_range_active",
      "barcode_usage_analytics",
      "barcode_regeneration_history",
      "product_barcode_search_optimization",
      "product_barcode_regeneration_queue",
      "product_barcode_analytics",

      // Partial indexes
      "barcode_active_only_partial",
      "barcode_valid_only_partial",
      "product_with_barcode_partial",
      "product_needs_regeneration_partial",
    ];

    let removedCount = 0;
    let errorCount = 0;

    // Remove indexes from Barcode collection
    for (const indexName of indexesToRemove) {
      try {
        await Barcode.collection.dropIndex(indexName);
        removedCount++;
        console.log(`   ✅ Removed barcode index: ${indexName}`);
      } catch (error) {
        if (!error.message.includes("index not found")) {
          errorCount++;
          console.warn(
            `   ⚠️ Error removing barcode index ${indexName}: ${error.message}`
          );
        }
      }
    }

    // Remove indexes from Product collection
    const productIndexesToRemove = [
      "barcode_data_version",
      "barcode_data_last_update",
      "barcode_invalidation_date",
      "barcode_auto_regenerate",
      "vendor_barcode_generated_compound",
      "has_barcode_generated_compound",
      "vendor_barcode_status_compound",
      "barcode_needs_regeneration",
      "vendor_regeneration_tracking",
      "auto_regenerate_enabled_compound",
      "product_barcode_search_optimization",
      "product_barcode_regeneration_queue",
      "product_barcode_analytics",
      "product_with_barcode_partial",
      "product_needs_regeneration_partial",
    ];

    for (const indexName of productIndexesToRemove) {
      try {
        await Product.collection.dropIndex(indexName);
        removedCount++;
        console.log(`   ✅ Removed product barcode index: ${indexName}`);
      } catch (error) {
        if (!error.message.includes("index not found")) {
          errorCount++;
          console.warn(
            `   ⚠️ Error removing product barcode index ${indexName}: ${error.message}`
          );
        }
      }
    }

    console.log(`\n📊 Rollback Summary:`);
    console.log(`   - Indexes removed: ${removedCount}`);
    console.log(`   - Errors: ${errorCount}`);

    console.log(
      "🎉 Barcode Index Optimization Migration rollback completed successfully!"
    );

    return {
      success: true,
      removedCount,
      errorCount,
    };
  } catch (error) {
    console.error("💥 Rollback failed:", error);
    throw error;
  }
};

/**
 * Check migration status
 */
export const status = async () => {
  try {
    // Check if optimization indexes exist
    const barcodeIndexes = await Barcode.collection.listIndexes().toArray();
    const productIndexes = await Product.collection.listIndexes().toArray();

    const optimizedIndexes = [
      "barcode_full_text_search",
      "barcode_price_range_active",
      "barcode_usage_analytics",
      "product_barcode_analytics",
    ];

    const foundOptimizedIndexes = optimizedIndexes.filter(
      (indexName) =>
        barcodeIndexes.some((idx) => idx.name === indexName) ||
        productIndexes.some((idx) => idx.name === indexName)
    );

    const migrationApplied =
      foundOptimizedIndexes.length >= optimizedIndexes.length / 2;

    // Get comprehensive stats
    const barcodeIndexCount = barcodeIndexes.length;
    const productBarcodeIndexes = productIndexes.filter(
      (index) =>
        index.name.includes("barcode") ||
        JSON.stringify(index.key).includes("barcodeData")
    );

    return {
      migrationApplied,
      foundOptimizedIndexes,
      stats: {
        totalBarcodeIndexes: barcodeIndexCount,
        totalProductBarcodeIndexes: productBarcodeIndexes.length,
        optimizedIndexesFound: foundOptimizedIndexes.length,
        optimizedIndexesExpected: optimizedIndexes.length,
      },
      indexes: {
        barcodeIndexes: barcodeIndexes.map((idx) => idx.name),
        productBarcodeIndexes: productBarcodeIndexes.map((idx) => idx.name),
      },
    };
  } catch (error) {
    console.error("Error checking migration status:", error);
    return {
      error: error.message,
    };
  }
};

export default {
  up,
  down,
  status,
};
