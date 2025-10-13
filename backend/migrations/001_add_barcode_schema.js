/**
 * Migration: Add Barcode Schema and Update Product Model
 * Version: 001
 * Created: 2024
 *
 * This migration:
 * 1. Creates the Barcode collection with proper indexes
 * 2. Updates existing Product documents to include barcodeData fields
 * 3. Migrates existing barcode field data to new structure
 * 4. Creates necessary indexes for performance
 */

import mongoose from "mongoose";
import Product from '../models/Product.js';
import Barcode from '../models/Barcode.js';


/**
 * Run the migration
 */
export const up = async () => {
  console.log("🚀 Starting Barcode Schema Migration...");

  try {
    // Step 1: Ensure Barcode collection exists with proper indexes
    console.log("📋 Step 1: Creating Barcode collection indexes...");

    // Create Barcode collection indexes
    await Barcode.collection.createIndexes([
      { key: { barcodeText: 1 }, unique: true },
      { key: { productId: 1 }, name: "productId_index" },
      { key: { vendorId: 1 }, name: "vendorId_index" },
      { key: { vendorPrefix: 1 }, name: "vendorPrefix_index" },
      { key: { "metadata.isActive": 1 }, name: "metadata_isActive_index" },
      { key: { "validation.isValid": 1 }, name: "validation_isValid_index" },
      { key: { createdAt: -1 }, name: "createdAt_desc_index" },
      {
        key: { "metadata.generatedAt": -1 },
        name: "metadata_generatedAt_desc_index",
      },
      // Compound indexes
      {
        key: { productId: 1, "metadata.isActive": 1 },
        name: "product_active_compound",
      },
      {
        key: { vendorId: 1, "metadata.isActive": 1 },
        name: "vendor_active_compound",
      },
      {
        key: { vendorPrefix: 1, "metadata.isActive": 1 },
        name: "vendorPrefix_active_compound",
      },
    ]);

    console.log("✅ Barcode collection indexes created");

    // Step 2: Add new indexes to Product collection for barcode data
    console.log("📋 Step 2: Creating Product collection barcode indexes...");

    try {
      await Product.collection.createIndexes([
        {
          key: { "barcodeData.barcodeId": 1 },
          sparse: true,
          name: "barcodeData_barcodeId_index",
        },
        {
          key: { "barcodeData.hasBarcode": 1 },
          name: "barcodeData_hasBarcode_index",
        },
        {
          key: { vendorId: 1, "barcodeData.hasBarcode": 1 },
          name: "vendor_hasBarcode_compound",
        },
      ]);
      console.log("✅ Product collection barcode indexes created");
    } catch (error) {
      console.warn("⚠️ Some Product indexes may already exist:", error.message);
    }

    // Step 3: Migrate existing Product documents
    console.log("📋 Step 3: Migrating existing Product documents...");

    // Find products that have the old barcode field but no barcodeData
    const productsToMigrate = await Product.find({
      $and: [
        {
          $or: [
            { barcode: { $exists: true, $ne: null, $ne: "" } },
            { "inventory.barcode": { $exists: true, $ne: null, $ne: "" } },
          ],
        },
        {
          $or: [
            { "barcodeData.hasBarcode": { $ne: true } },
            { barcodeData: { $exists: false } },
          ],
        },
      ],
    }).populate("vendorId");

    console.log(`Found ${productsToMigrate.length} products to migrate`);

    let migratedCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const product of productsToMigrate) {
      try {
        // Get barcode text from either location
        const barcodeText = product.barcode || product.inventory?.barcode;

        if (!barcodeText) {
          continue;
        }

        // Validate barcode format
        const barcodeRegex = /^[A-Za-z0-9]+-[A-Za-z0-9]+-\d+\.\d{2}\$$/;
        if (!barcodeRegex.test(barcodeText)) {
          console.warn(
            `⚠️ Invalid barcode format for product ${product._id}: ${barcodeText}`
          );
          continue;
        }

        // Parse barcode components
        const parts = barcodeText.split("-");
        const vendorPrefix = parts[0];
        const pricePart = parts[parts.length - 1];
        const productName = parts.slice(1, -1).join("-");

        const priceMatch = pricePart.match(/(\d+\.\d{2})\$$/);
        if (!priceMatch) {
          console.warn(
            `⚠️ Invalid price format in barcode for product ${product._id}: ${barcodeText}`
          );
          continue;
        }

        const price = parseFloat(priceMatch[1]);
        const formattedPrice = pricePart;

        // Check if Barcode document already exists
        let barcodeDoc = await Barcode.findOne({
          $or: [{ barcodeText }, { productId: product._id }],
        });

        if (!barcodeDoc) {
          // Create new Barcode document
          barcodeDoc = new Barcode({
            productId: product._id,
            vendorId: product.vendorId._id,
            barcodeText,
            vendorPrefix,
            productName,
            price,
            formattedPrice,
            imageData: {
              dataUrl: null,
              width: 300,
              height: 120,
              format: "png",
              options: {},
            },
            metadata: {
              generatedBy: null, // Migration - no specific user
              generatedAt: product.createdAt || new Date(),
              lastUpdated: new Date(),
              version: 1,
              isActive: true,
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

          await barcodeDoc.save();
        }

        // Update Product with barcodeData
        await Product.updateOne(
          { _id: product._id },
          {
            $set: {
              "barcodeData.barcodeId": barcodeDoc._id,
              "barcodeData.barcodeText": barcodeText,
              "barcodeData.hasBarcode": true,
              "barcodeData.barcodeGenerated": true,
              "barcodeData.lastBarcodeUpdate": new Date(),
              "barcodeData.barcodeVersion": 1,
            },
          }
        );

        migratedCount++;

        if (migratedCount % 100 === 0) {
          console.log(`📊 Migrated ${migratedCount} products so far...`);
        }
      } catch (error) {
        errorCount++;
        errors.push({
          productId: product._id,
          productName: product.name,
          error: error.message,
        });

        console.error(
          `❌ Error migrating product ${product._id}:`,
          error.message
        );
      }
    }

    console.log(`✅ Migration completed:`);
    console.log(`   - Products migrated: ${migratedCount}`);
    console.log(`   - Errors: ${errorCount}`);

    if (errors.length > 0) {
      console.log("❌ Migration errors:");
      errors.forEach((err) => {
        console.log(
          `   - Product ${err.productId} (${err.productName}): ${err.error}`
        );
      });
    }

    // Step 4: Update Products without barcodes to have proper barcodeData structure
    console.log("📋 Step 4: Updating products without barcodes...");

    const productsWithoutBarcodes = await Product.updateMany(
      {
        $and: [
          {
            $or: [
              { barcode: { $exists: false } },
              { barcode: null },
              { barcode: "" },
            ],
          },
          { barcodeData: { $exists: false } },
        ],
      },
      {
        $set: {
          "barcodeData.barcodeId": null,
          "barcodeData.barcodeText": null,
          "barcodeData.hasBarcode": false,
          "barcodeData.barcodeGenerated": false,
          "barcodeData.lastBarcodeUpdate": null,
          "barcodeData.barcodeVersion": 1,
        },
      }
    );

    console.log(
      `✅ Updated ${productsWithoutBarcodes.modifiedCount} products without barcodes`
    );

    // Step 5: Create summary statistics
    const totalProducts = await Product.countDocuments();
    const productsWithBarcodes = await Product.countDocuments({
      "barcodeData.hasBarcode": true,
    });
    const totalBarcodeDocuments = await Barcode.countDocuments();

    console.log("\n📊 Migration Summary:");
    console.log(`   - Total products: ${totalProducts}`);
    console.log(`   - Products with barcodes: ${productsWithBarcodes}`);
    console.log(`   - Total barcode documents: ${totalBarcodeDocuments}`);
    console.log(
      `   - Barcode completion rate: ${(
        (productsWithBarcodes / totalProducts) *
        100
      ).toFixed(2)}%`
    );

    console.log("\n🎉 Barcode Schema Migration completed successfully!");

    return {
      success: true,
      migratedCount,
      errorCount,
      errors,
      summary: {
        totalProducts,
        productsWithBarcodes,
        totalBarcodeDocuments,
        completionRate: ((productsWithBarcodes / totalProducts) * 100).toFixed(
          2
        ),
      },
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
  console.log("🔄 Rolling back Barcode Schema Migration...");

  try {
    // Step 1: Remove barcodeData from all products
    console.log("📋 Step 1: Removing barcodeData from products...");

    const result = await Product.updateMany(
      {},
      {
        $unset: {
          barcodeData: "",
        },
      }
    );

    console.log(`✅ Removed barcodeData from ${result.modifiedCount} products`);

    // Step 2: Drop Barcode collection
    console.log("📋 Step 2: Dropping Barcode collection...");

    try {
      await mongoose.connection.db.dropCollection("barcodes");
      console.log("✅ Barcode collection dropped");
    } catch (error) {
      if (error.message.includes("ns not found")) {
        console.log("ℹ️ Barcode collection doesn't exist, skipping...");
      } else {
        throw error;
      }
    }

    // Step 3: Remove barcode-related indexes from Product collection
    console.log(
      "📋 Step 3: Removing barcode indexes from Product collection..."
    );

    const indexesToDrop = [
      "barcodeData_barcodeId_index",
      "barcodeData_hasBarcode_index",
      "vendor_hasBarcode_compound",
    ];

    for (const indexName of indexesToDrop) {
      try {
        await Product.collection.dropIndex(indexName);
        console.log(`✅ Dropped index: ${indexName}`);
      } catch (error) {
        if (error.message.includes("index not found")) {
          console.log(`ℹ️ Index ${indexName} doesn't exist, skipping...`);
        } else {
          console.warn(`⚠️ Error dropping index ${indexName}:`, error.message);
        }
      }
    }

    console.log("🎉 Barcode Schema Migration rollback completed successfully!");

    return {
      success: true,
      message: "Migration rolled back successfully",
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
    // Check if Barcode collection exists
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    const barcodeCollectionExists = collections.some(
      (col) => col.name === "barcodes"
    );

    // Check if products have barcodeData
    const productWithBarcodeData = await Product.findOne({
      barcodeData: { $exists: true },
    });

    // Get counts
    const totalProducts = await Product.countDocuments();
    const productsWithBarcodeData = await Product.countDocuments({
      barcodeData: { $exists: true },
    });
    const productsWithBarcodes = await Product.countDocuments({
      "barcodeData.hasBarcode": true,
    });
    const totalBarcodes = barcodeCollectionExists
      ? await Barcode.countDocuments()
      : 0;

    const migrationApplied = barcodeCollectionExists && productWithBarcodeData;

    return {
      migrationApplied,
      barcodeCollectionExists,
      productWithBarcodeData: !!productWithBarcodeData,
      stats: {
        totalProducts,
        productsWithBarcodeData,
        productsWithBarcodes,
        totalBarcodes,
        completionRate:
          totalProducts > 0
            ? ((productsWithBarcodes / totalProducts) * 100).toFixed(2)
            : 0,
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
