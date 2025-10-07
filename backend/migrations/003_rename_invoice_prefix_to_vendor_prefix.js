/**
 * Migration: Rename invoicePrefix to vendorPrefix and update default values
 *
 * This migration:
 * 1. Renames the invoicePrefix field to vendorPrefix in all vendor documents
 * 2. Updates default values from "INV-" pattern to "VD01", "VD02", etc.
 * 3. Ensures all vendor prefixes are unique
 * 4. Updates any existing prefixes to follow the new format
 */

import mongoose from "mongoose";
import { pathToFileURL } from 'url';
await import(pathToFileURL('../models/Vendor.js'));

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

/**
 * Up migration - rename invoicePrefix to vendorPrefix and update values
 */
export const up = async () => {
  try {
    console.log(
      "🔄 Starting migration: Rename invoicePrefix to vendorPrefix..."
    );

    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        process.env.MONGODB_URI || "mongodb://localhost:27017/product-ecosystem"
      );
    }

    // Get all vendors
    const vendors = await Vendor.find({});
    console.log(`📊 Found ${vendors.length} vendors to migrate`);

    if (vendors.length === 0) {
      console.log("✅ No vendors found, migration complete");
      return;
    }

    // Track existing prefixes to ensure uniqueness
    const existingPrefixes = [];
    const updates = [];

    // First pass: collect existing prefixes and prepare updates
    for (const vendor of vendors) {
      let newPrefix;

      // Check if vendor has an invoicePrefix
      if (vendor.invoicePrefix && vendor.invoicePrefix !== "INV-") {
        // Keep existing custom prefix if it's not the default
        newPrefix = vendor.invoicePrefix;
        // Remove trailing dash if present
        if (newPrefix.endsWith("-")) {
          newPrefix = newPrefix.slice(0, -1);
        }
      } else {
        // Generate new VD## prefix
        newPrefix = getNextVendorPrefix(existingPrefixes);
      }

      // Ensure uniqueness
      while (existingPrefixes.includes(newPrefix)) {
        newPrefix = getNextVendorPrefix(existingPrefixes);
      }

      existingPrefixes.push(newPrefix);
      updates.push({
        vendorId: vendor._id,
        oldPrefix: vendor.invoicePrefix,
        newPrefix: newPrefix,
      });
    }

    // Second pass: apply updates
    for (const update of updates) {
      await Vendor.findByIdAndUpdate(update.vendorId, {
        $set: { vendorPrefix: update.newPrefix },
        $unset: { invoicePrefix: 1 },
      });

      console.log(
        `  ✓ Updated vendor ${update.vendorId}: "${update.oldPrefix}" → "${update.newPrefix}"`
      );
    }

    // Update the schema to add unique index on vendorPrefix
    await mongoose.connection
      .collection("vendors")
      .createIndex({ vendorPrefix: 1 }, { unique: true, sparse: true });

    console.log("✅ Migration completed successfully!");
    console.log(
      `📈 Updated ${updates.length} vendors with new vendorPrefix field`
    );
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
};

/**
 * Down migration - rollback vendorPrefix to invoicePrefix
 */
export const down = async () => {
  try {
    console.log(
      "🔄 Starting rollback: Rename vendorPrefix back to invoicePrefix..."
    );

    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        process.env.MONGODB_URI || "mongodb://localhost:27017/product-ecosystem"
      );
    }

    // Get all vendors
    const vendors = await Vendor.find({});
    console.log(`📊 Found ${vendors.length} vendors to rollback`);

    // Update each vendor
    for (const vendor of vendors) {
      let invoicePrefix = "INV-"; // Default fallback

      if (vendor.vendorPrefix) {
        // Convert vendorPrefix back to invoicePrefix format
        invoicePrefix = vendor.vendorPrefix.endsWith("-")
          ? vendor.vendorPrefix
          : `${vendor.vendorPrefix}-`;
      }

      await Vendor.findByIdAndUpdate(vendor._id, {
        $set: { invoicePrefix: invoicePrefix },
        $unset: { vendorPrefix: 1 },
      });

      console.log(
        `  ✓ Rolled back vendor ${vendor._id}: vendorPrefix → "${invoicePrefix}"`
      );
    }

    // Remove the unique index on vendorPrefix
    try {
      await mongoose.connection
        .collection("vendors")
        .dropIndex("vendorPrefix_1");
    } catch (error) {
      // Index might not exist, ignore error
      console.log("  ⚠ Could not drop vendorPrefix index (might not exist)");
    }

    console.log("✅ Rollback completed successfully!");
    console.log(
      `📈 Rolled back ${vendors.length} vendors to invoicePrefix field`
    );
  } catch (error) {
    console.error("❌ Rollback failed:", error);
    throw error;
  }
};
