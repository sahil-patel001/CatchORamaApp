#!/usr/bin/env node

/**
 * Script to create missing vendor profiles for Google OAuth users
 * This fixes users who signed up via Google OAuth before the vendor profile creation was implemented
 */

import mongoose from "mongoose";
import User from "../models/User.js";
import Vendor from "../models/Vendor.js";
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.join(__dirname, "../.env") });

async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error);
    process.exit(1);
  }
}

async function fixGoogleOAuthVendors() {
  try {
    console.log(
      "🔍 Looking for Google OAuth vendor users without vendor profiles..."
    );

    // Find all Google OAuth users with vendor role who don't have vendor profiles
    const usersWithoutVendors = await User.aggregate([
      {
        $match: {
          role: "vendor",
          googleId: { $exists: true, $ne: null },
          isActive: true,
        },
      },
      {
        $lookup: {
          from: "vendors",
          localField: "_id",
          foreignField: "userId",
          as: "vendorProfile",
        },
      },
      {
        $match: {
          vendorProfile: { $size: 0 },
        },
      },
    ]);

    if (usersWithoutVendors.length === 0) {
      console.log(
        "✅ All Google OAuth vendor users already have vendor profiles"
      );
      return;
    }

    console.log(
      `📋 Found ${usersWithoutVendors.length} Google OAuth users needing vendor profiles:`
    );

    for (const user of usersWithoutVendors) {
      console.log(`   - ${user.name} (${user.email})`);
    }

    console.log("\n🔧 Creating vendor profiles...");

    let successCount = 0;
    let errorCount = 0;

    for (const user of usersWithoutVendors) {
      try {
        const vendor = await Vendor.create({
          userId: user._id,
          businessName: `${user.name}'s Business`,
          status: "active",
          verificationStatus: {
            email: true, // Google OAuth users have verified emails
            phone: false,
            business: false,
          },
        });

        console.log(
          `   ✅ Created vendor profile for ${user.name} (${user.email})`
        );
        successCount++;
      } catch (error) {
        console.error(
          `   ❌ Failed to create vendor profile for ${user.name} (${user.email}):`,
          error.message
        );
        errorCount++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Successfully created: ${successCount} vendor profiles`);
    if (errorCount > 0) {
      console.log(`   ❌ Failed to create: ${errorCount} vendor profiles`);
    }

    if (successCount > 0) {
      console.log(
        "\n🎉 Google OAuth vendor profile fix completed successfully!"
      );
    }
  } catch (error) {
    console.error("❌ Error during fix process:", error);
  }
}

async function main() {
  console.log("🚀 Starting Google OAuth vendor profile fix...\n");

  await connectToDatabase();
  await fixGoogleOAuthVendors();

  console.log("\n👋 Closing database connection...");
  await mongoose.connection.close();
  console.log("✅ Database connection closed");

  process.exit(0);
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Promise Rejection:", err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});

main();
