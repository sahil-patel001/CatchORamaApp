import dotenv from "dotenv";
import { connectDB, disconnectDB } from "../config/database.js";
import Category from "../models/Category.js";
import Vendor from "../models/Vendor.js";

// Load environment variables
dotenv.config();

const fixCategoryDuplicates = async () => {
  try {
    console.log("🔧 Starting category duplicate fix...");

    // Connect to database
    await connectDB();

    // Step 1: Drop the existing unique index on name field
    console.log("📋 Checking existing indexes...");
    const indexes = await Category.collection.getIndexes();
    console.log("Current indexes:", Object.keys(indexes));

    // Drop the problematic unique index on name field if it exists
    try {
      await Category.collection.dropIndex("name_1");
      console.log("✅ Dropped global unique index on name field");
    } catch (error) {
      if (error.code === 27) {
        console.log("ℹ️  Global unique index on name field does not exist");
      } else {
        console.log("⚠️  Error dropping index:", error.message);
      }
    }

    // Step 2: Ensure the compound index exists
    try {
      await Category.collection.createIndex(
        { name: 1, vendorId: 1 },
        { unique: true, name: "name_vendorId_unique" }
      );
      console.log("✅ Created compound unique index on name + vendorId");
    } catch (error) {
      if (error.code === 85) {
        console.log("ℹ️  Compound unique index already exists");
      } else {
        console.log("⚠️  Error creating compound index:", error.message);
      }
    }

    // Step 3: Find and handle duplicate categories
    console.log("🔍 Looking for duplicate categories...");

    const duplicates = await Category.aggregate([
      {
        $group: {
          _id: { name: "$name", vendorId: "$vendorId" },
          count: { $sum: 1 },
          docs: { $push: "$_id" },
        },
      },
      {
        $match: { count: { $gt: 1 } },
      },
    ]);

    if (duplicates.length > 0) {
      console.log(`Found ${duplicates.length} duplicate category groups`);

      for (const duplicate of duplicates) {
        console.log(`Fixing duplicates for category: ${duplicate._id.name}`);
        // Keep the first document, remove the rest
        const docsToRemove = duplicate.docs.slice(1);
        await Category.deleteMany({ _id: { $in: docsToRemove } });
        console.log(`  ✅ Removed ${docsToRemove.length} duplicate documents`);
      }
    } else {
      console.log("✅ No duplicate categories found");
    }

    // Step 4: List all categories to verify
    const allCategories = await Category.find({}).populate(
      "vendorId",
      "businessName"
    );
    console.log("\n📋 Current categories in database:");

    const categoryByVendor = {};
    allCategories.forEach((cat) => {
      const vendorName = cat.vendorId?.businessName || "Unknown Vendor";
      if (!categoryByVendor[vendorName]) {
        categoryByVendor[vendorName] = [];
      }
      categoryByVendor[vendorName].push(cat.name);
    });

    Object.entries(categoryByVendor).forEach(([vendor, categories]) => {
      console.log(`  ${vendor}: ${categories.join(", ")}`);
    });

    console.log(`\n✅ Total categories: ${allCategories.length}`);
    console.log("🎉 Category duplicate fix completed successfully!");
  } catch (error) {
    console.error("❌ Error fixing category duplicates:", error);
    process.exit(1);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
};

// Run the fix
fixCategoryDuplicates();
