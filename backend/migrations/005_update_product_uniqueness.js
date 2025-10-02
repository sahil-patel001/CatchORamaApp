import dotenv from "dotenv";
import { connectDB } from "../config/database.js";

// Load environment variables
dotenv.config();

/**
 * Migration to update product uniqueness constraints
 * - Remove global unique constraint on seo.slug
 * - Remove vendor-only unique constraint on name
 * - Add vendor + category unique constraint on name
 * - Add vendor-specific unique constraint on seo.slug
 */
const updateProductUniqueness = async () => {
  try {
    console.log("🔧 Starting product uniqueness migration...");

    // Connect to database
    await connectDB();

    // Import Product model
    const Product = (await import("../models/Product.js")).default;

    console.log("📋 Checking existing indexes...");
    const indexes = await Product.collection.getIndexes();
    console.log("Current indexes:", Object.keys(indexes));

    // Step 1: Drop old problematic indexes
    const indexesToDrop = [
      "seo.slug_1", // Global unique on seo.slug
      "name_1_vendorId_1", // Vendor-only unique on name
    ];

    for (const indexName of indexesToDrop) {
      try {
        await Product.collection.dropIndex(indexName);
        console.log(`✅ Dropped index: ${indexName}`);
      } catch (error) {
        if (error.code === 27) {
          console.log(`ℹ️  Index ${indexName} does not exist`);
        } else {
          console.log(`⚠️  Error dropping index ${indexName}:`, error.message);
        }
      }
    }

    // Step 2: Create new compound unique indexes
    const newIndexes = [
      {
        keys: { name: 1, vendorId: 1, category: 1 },
        options: { unique: true, name: "name_vendorId_category_unique" },
        description: "Product name unique within vendor + category",
      },
      {
        keys: { "seo.slug": 1, vendorId: 1 },
        options: {
          unique: true,
          sparse: true,
          name: "seo_slug_vendorId_unique",
        },
        description: "SEO slug unique within vendor",
      },
    ];

    for (const indexDef of newIndexes) {
      try {
        await Product.collection.createIndex(indexDef.keys, indexDef.options);
        console.log(
          `✅ Created index: ${indexDef.options.name} - ${indexDef.description}`
        );
      } catch (error) {
        if (error.code === 85) {
          console.log(`ℹ️  Index ${indexDef.options.name} already exists`);
        } else {
          console.log(
            `⚠️  Error creating index ${indexDef.options.name}:`,
            error.message
          );
        }
      }
    }

    // Step 3: Check for and handle any existing duplicates
    console.log("🔍 Checking for existing duplicate products...");

    const duplicates = await Product.aggregate([
      {
        $group: {
          _id: { name: "$name", vendorId: "$vendorId", category: "$category" },
          count: { $sum: 1 },
          docs: { $push: "$_id" },
        },
      },
      {
        $match: { count: { $gt: 1 } },
      },
    ]);

    if (duplicates.length > 0) {
      console.log(`⚠️  Found ${duplicates.length} duplicate product groups:`);

      for (const duplicate of duplicates) {
        console.log(
          `   - Product: "${duplicate._id.name}" in category "${duplicate._id.category}"`
        );
        console.log(
          `     Vendor: ${duplicate._id.vendorId}, Count: ${duplicate.count}`
        );

        // Keep the first product, mark others for manual review
        const [keepId, ...duplicateIds] = duplicate.docs;
        console.log(`     Keeping: ${keepId}`);
        console.log(`     Duplicates: ${duplicateIds.join(", ")}`);

        // Add a suffix to duplicate product names to resolve conflicts
        for (let i = 0; i < duplicateIds.length; i++) {
          const duplicateId = duplicateIds[i];
          const suffix = ` (Duplicate ${i + 1})`;

          await Product.findByIdAndUpdate(duplicateId, {
            $set: {
              name: duplicate._id.name + suffix,
              status: "draft", // Mark as draft for manual review
            },
          });

          console.log(
            `     ✅ Renamed duplicate ${duplicateId} to "${duplicate._id.name}${suffix}"`
          );
        }
      }

      console.log(
        "\n📝 Note: Duplicate products have been renamed with suffixes and marked as 'draft'."
      );
      console.log(
        "   Please review these products manually and update them as needed."
      );
    } else {
      console.log("✅ No duplicate products found");
    }

    // Step 4: Verify new indexes are working
    console.log("\n📋 Verifying new indexes...");
    const finalIndexes = await Product.collection.getIndexes();

    const hasNameCategoryIndex = Object.keys(finalIndexes).includes(
      "name_vendorId_category_unique"
    );
    const hasSlugVendorIndex = Object.keys(finalIndexes).includes(
      "seo_slug_vendorId_unique"
    );

    console.log(
      "✅ Product name + vendor + category unique index:",
      hasNameCategoryIndex ? "EXISTS" : "MISSING"
    );
    console.log(
      "✅ SEO slug + vendor unique index:",
      hasSlugVendorIndex ? "EXISTS" : "MISSING"
    );

    if (hasNameCategoryIndex && hasSlugVendorIndex) {
      console.log("\n🎉 Product uniqueness migration completed successfully!");
      console.log("\n📋 New uniqueness rules:");
      console.log(
        "   - Product names must be unique within each vendor + category combination"
      );
      console.log(
        "   - Different vendors can have products with the same name"
      );
      console.log(
        "   - Same vendor can have products with same name in different categories"
      );
      console.log("   - SEO slugs are unique within each vendor");
    } else {
      console.log(
        "\n❌ Migration completed with issues. Please check the indexes manually."
      );
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error during product uniqueness migration:", error);
    process.exit(1);
  }
};

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  updateProductUniqueness();
}

export default updateProductUniqueness;
