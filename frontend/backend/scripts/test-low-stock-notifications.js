#!/usr/bin/env node

/**
 * Test Low Stock Notification Functionality
 * This script tests the low stock notification triggers with various scenarios
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "../models/Product.js";
import Vendor from "../models/Vendor.js";
import {
  shouldTriggerLowStockNotification,
  triggerLowStockNotification,
} from "../utils/notificationTriggers.js";

// Load environment variables
dotenv.config();

async function connectDB() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/product-ecosystem"
    );
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

async function disconnectDB() {
  try {
    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ MongoDB disconnection failed:", error.message);
  }
}

async function testScenarios() {
  console.log("🧪 Testing Low Stock Notification Scenarios\n");

  // Test Scenario 1: Product with default threshold
  console.log("📦 Scenario 1: Product with default threshold (10)");
  const mockProduct1 = {
    _id: new mongoose.Types.ObjectId(),
    name: "Test Product 1",
    stock: 5,
    inventory: {},
    lowStockThreshold: undefined,
  };

  const shouldTrigger1 = shouldTriggerLowStockNotification(mockProduct1);
  console.log(
    `  Stock: ${mockProduct1.stock}, Threshold: 10, Should trigger: ${
      shouldTrigger1 ? "✅" : "❌"
    }`
  );

  // Test Scenario 2: Product with custom inventory threshold
  console.log("\n📦 Scenario 2: Product with custom inventory threshold (15)");
  const mockProduct2 = {
    _id: new mongoose.Types.ObjectId(),
    name: "Test Product 2",
    stock: 12,
    inventory: {
      lowStockThreshold: 15,
    },
  };

  const shouldTrigger2 = shouldTriggerLowStockNotification(mockProduct2);
  console.log(
    `  Stock: ${mockProduct2.stock}, Threshold: 15, Should trigger: ${
      shouldTrigger2 ? "✅" : "❌"
    }`
  );

  // Test Scenario 3: Product with custom product-level threshold
  console.log(
    "\n📦 Scenario 3: Product with custom product-level threshold (20)"
  );
  const mockProduct3 = {
    _id: new mongoose.Types.ObjectId(),
    name: "Test Product 3",
    stock: 18,
    lowStockThreshold: 20,
    inventory: {},
  };

  const shouldTrigger3 = shouldTriggerLowStockNotification(mockProduct3);
  console.log(
    `  Stock: ${mockProduct3.stock}, Threshold: 20, Should trigger: ${
      shouldTrigger3 ? "✅" : "❌"
    }`
  );

  // Test Scenario 4: Product above threshold
  console.log("\n📦 Scenario 4: Product above threshold");
  const mockProduct4 = {
    _id: new mongoose.Types.ObjectId(),
    name: "Test Product 4",
    stock: 50,
    inventory: {
      lowStockThreshold: 10,
    },
  };

  const shouldTrigger4 = shouldTriggerLowStockNotification(mockProduct4);
  console.log(
    `  Stock: ${mockProduct4.stock}, Threshold: 10, Should trigger: ${
      shouldTrigger4 ? "✅" : "❌"
    }`
  );

  // Test Scenario 5: Stock transition (crossing threshold)
  console.log("\n📦 Scenario 5: Stock transition (crossing threshold)");
  const mockProduct5 = {
    _id: new mongoose.Types.ObjectId(),
    name: "Test Product 5",
    stock: 8,
    inventory: {
      lowStockThreshold: 10,
    },
  };

  const previousStock = 12; // Was above threshold
  const shouldTrigger5 = shouldTriggerLowStockNotification(
    mockProduct5,
    previousStock
  );
  console.log(
    `  Previous: ${previousStock}, Current: ${
      mockProduct5.stock
    }, Threshold: 10, Should trigger: ${shouldTrigger5 ? "✅" : "❌"}`
  );

  // Test Scenario 6: Stock transition (not crossing threshold)
  console.log("\n📦 Scenario 6: Stock transition (not crossing threshold)");
  const mockProduct6 = {
    _id: new mongoose.Types.ObjectId(),
    name: "Test Product 6",
    stock: 7,
    inventory: {
      lowStockThreshold: 10,
    },
  };

  const previousStock6 = 8; // Was already below threshold
  const shouldTrigger6 = shouldTriggerLowStockNotification(
    mockProduct6,
    previousStock6
  );
  console.log(
    `  Previous: ${previousStock6}, Current: ${
      mockProduct6.stock
    }, Threshold: 10, Should trigger: ${shouldTrigger6 ? "✅" : "❌"}`
  );
}

async function testWithRealData() {
  console.log("\n🔍 Testing with Real Database Data\n");

  try {
    // Find a vendor for testing
    const vendor = await Vendor.findOne().populate("userId", "email name");
    if (!vendor) {
      console.log("⚠️  No vendors found in database. Skipping real data test.");
      return;
    }

    console.log(
      `📊 Found vendor: ${vendor.businessName || vendor.name} (${
        vendor.userId?.email
      })`
    );

    // Find products for this vendor
    const products = await Product.find({ vendorId: vendor._id }).limit(5);
    if (products.length === 0) {
      console.log("⚠️  No products found for vendor. Skipping real data test.");
      return;
    }

    console.log(`📦 Found ${products.length} products for testing:\n`);

    for (const product of products) {
      const threshold =
        product.inventory?.lowStockThreshold || product.lowStockThreshold || 10;
      const shouldTrigger = shouldTriggerLowStockNotification(product);

      console.log(`  • ${product.name}`);
      console.log(`    Stock: ${product.stock}, Threshold: ${threshold}`);
      console.log(
        `    Should trigger notification: ${shouldTrigger ? "✅ YES" : "❌ NO"}`
      );
      console.log(`    Status: ${product.stockStatus || "N/A"}\n`);
    }
  } catch (error) {
    console.error("❌ Error testing with real data:", error.message);
  }
}

async function testNotificationCreation() {
  console.log("📧 Testing Notification Creation (Dry Run)\n");

  try {
    // Find a vendor and product for testing
    const vendor = await Vendor.findOne().populate("userId", "email name");
    const product = await Product.findOne({ vendorId: vendor?._id });

    if (!vendor || !product) {
      console.log(
        "⚠️  Missing vendor or product data. Skipping notification test."
      );
      return;
    }

    // Create a low stock scenario
    const testProduct = {
      ...product.toObject(),
      stock: 3, // Force low stock
      inventory: {
        ...product.inventory,
        lowStockThreshold: 10,
      },
    };

    console.log(`🧪 Testing notification for: ${testProduct.name}`);
    console.log(`   Stock: ${testProduct.stock}, Threshold: 10`);
    console.log(`   Vendor: ${vendor.businessName || vendor.name}`);
    console.log(
      `   Should trigger: ${
        shouldTriggerLowStockNotification(testProduct) ? "✅" : "❌"
      }`
    );

    // Note: We're not actually sending the notification in this test
    // to avoid spam. In a real scenario, you would uncomment the line below:
    // const result = await triggerLowStockNotification(testProduct, vendor);
    // console.log(`   Notification result: ${result.success ? '✅' : '❌'}`);

    console.log("   📧 Notification creation skipped (dry run mode)");
  } catch (error) {
    console.error("❌ Error testing notification creation:", error.message);
  }
}

async function main() {
  console.log("🚀 Low Stock Notification Test Suite\n");

  try {
    await connectDB();

    // Run test scenarios
    await testScenarios();

    // Test with real data if available
    await testWithRealData();

    // Test notification creation (dry run)
    await testNotificationCreation();

    console.log("\n✅ All tests completed successfully!");
  } catch (error) {
    console.error("❌ Test suite failed:", error.message);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
}

// Run the test suite if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("❌ Unhandled error:", error);
    process.exit(1);
  });
}

export { testScenarios, testWithRealData, testNotificationCreation };
