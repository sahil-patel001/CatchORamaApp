import dotenv from "dotenv";
import { connectDB, disconnectDB } from "./config/database.js";
import Vendor from "./models/Vendor.js";
import User from "./models/User.js";

// Load environment variables
dotenv.config();

const verifyVendorData = async () => {
  try {
    console.log("🔍 Verifying vendor data in database...\n");

    // Connect to database
    await connectDB();

    // Get all vendors with their status
    const vendors = await Vendor.find({})
      .populate("userId", "name email")
      .sort({ createdAt: 1 });

    console.log(`📊 Total vendors in database: ${vendors.length}\n`);

    // Group vendors by status
    const vendorsByStatus = {
      active: [],
      inactive: [],
      pending: [],
      suspended: [],
    };

    vendors.forEach((vendor) => {
      const status = vendor.status || "unknown";
      if (vendorsByStatus[status]) {
        vendorsByStatus[status].push(vendor);
      } else {
        vendorsByStatus[status] = [vendor];
      }
    });

    // Display results
    Object.entries(vendorsByStatus).forEach(([status, statusVendors]) => {
      if (statusVendors.length > 0) {
        console.log(
          `🏷️  ${status.toUpperCase()} vendors (${statusVendors.length}):`
        );
        statusVendors.forEach((vendor) => {
          console.log(
            `   - ${vendor.businessName} (${
              vendor.userId?.name || "Unknown User"
            })`
          );
        });
        console.log("");
      }
    });

    // Verify the expected distribution
    console.log("✅ Expected distribution based on seeding:");
    console.log(
      "   - Active: 3 vendors (Demo Vendor Store, Tech Gadgets Store, Book Haven)"
    );
    console.log("   - Inactive: 2 vendors (Fashion Hub, Sports World)");
    console.log(
      "   - Pending: 2 vendors (Home & Garden Paradise, Beauty Care Plus)"
    );
    console.log("");

    console.log("🎉 Vendor data verification completed!");
  } catch (error) {
    console.error("❌ Error verifying vendor data:", error);
    process.exit(1);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
};

// Run the verification
verifyVendorData();
