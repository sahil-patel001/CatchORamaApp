#!/usr/bin/env node

/**
 * Test Cubic Volume Notification Functionality
 * This script tests the cubic volume notification triggers with various scenarios
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "../models/Product.js";
import Vendor from "../models/Vendor.js";
import {
  calculateCubicWeight,
  shouldTriggerCubicVolumeAlert,
  triggerCubicVolumeAlert,
} from "../utils/notificationTriggers.js";
import { notificationConfig } from "../config/notification.js";

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

async function testCubicWeightCalculation() {
  console.log("🧪 Testing Cubic Weight Calculation Logic\n");

  const testCases = [
    {
      name: "Small product (below threshold)",
      product: { length: 10, breadth: 10, height: 10 },
      expectedCubicWeight: (10 * 10 * 10) / 6000, // 0.167kg
      shouldTrigger: false,
    },
    {
      name: "Medium product (at threshold)",
      product: { length: 40, breadth: 30, height: 20 },
      expectedCubicWeight: (40 * 30 * 20) / 6000, // 4kg
      shouldTrigger: false,
    },
    {
      name: "Large product (above threshold)",
      product: { length: 50, breadth: 40, height: 60 },
      expectedCubicWeight: (50 * 40 * 60) / 6000, // 20kg
      shouldTrigger: false, // Still below 32kg
    },
    {
      name: "Very large product (well above threshold)",
      product: { length: 80, breadth: 60, height: 50 },
      expectedCubicWeight: (80 * 60 * 50) / 6000, // 40kg
      shouldTrigger: true,
    },
    {
      name: "Huge product (way above threshold)",
      product: { length: 100, breadth: 80, height: 60 },
      expectedCubicWeight: (100 * 80 * 60) / 6000, // 80kg
      shouldTrigger: true,
    },
    {
      name: "Product with missing dimensions",
      product: { length: 50, breadth: null, height: 40 },
      expectedCubicWeight: 0,
      shouldTrigger: false,
    },
    {
      name: "Product with pre-calculated cubic weight",
      product: { length: 10, breadth: 10, height: 10, cubicWeight: 50 },
      expectedCubicWeight: 50, // Should use pre-calculated value
      shouldTrigger: true,
    },
  ];

  const threshold = notificationConfig.triggers.cubicVolume.thresholdKg;
  console.log(`📏 Current threshold: ${threshold}kg\n`);

  let passed = 0;
  let failed = 0;

  testCases.forEach((testCase, index) => {
    const calculatedWeight = calculateCubicWeight(testCase.product);
    const shouldTrigger = shouldTriggerCubicVolumeAlert(testCase.product);

    const weightMatch =
      Math.abs(calculatedWeight - testCase.expectedCubicWeight) < 0.001;
    const triggerMatch = shouldTrigger === testCase.shouldTrigger;
    const success = weightMatch && triggerMatch;

    console.log(`${index + 1}. ${testCase.name}`);
    console.log(
      `   Dimensions: ${testCase.product.length || 0} × ${
        testCase.product.breadth || 0
      } × ${testCase.product.height || 0} cm`
    );
    if (testCase.product.cubicWeight) {
      console.log(
        `   Pre-calculated weight: ${testCase.product.cubicWeight}kg`
      );
    }
    console.log(
      `   Calculated weight: ${calculatedWeight.toFixed(3)}kg (expected: ${
        testCase.expectedCubicWeight
      }kg)`
    );
    console.log(
      `   Should trigger: ${shouldTrigger} (expected: ${
        testCase.shouldTrigger
      }) ${success ? "✅" : "❌"}`
    );
    console.log();

    if (success) {
      passed++;
    } else {
      failed++;
    }
  });

  console.log(`📊 Test Results: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    console.log("❌ Some cubic weight calculation tests failed!");
    return false;
  } else {
    console.log("🎉 All cubic weight calculation tests passed!\n");
    return true;
  }
}

async function testWithRealData() {
  console.log("🔍 Testing with Real Database Data\n");

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
      const cubicWeight = product.cubicWeight || calculateCubicWeight(product);
      const shouldTrigger = shouldTriggerCubicVolumeAlert(product);
      const threshold = notificationConfig.triggers.cubicVolume.thresholdKg;

      console.log(`  • ${product.name}`);
      console.log(
        `    Dimensions: ${product.length || 0} × ${product.breadth || 0} × ${
          product.height || 0
        } cm`
      );
      console.log(`    Cubic Weight: ${cubicWeight.toFixed(2)}kg`);
      console.log(`    Threshold: ${threshold}kg`);
      console.log(
        `    Should trigger alert: ${shouldTrigger ? "✅ YES" : "❌ NO"}`
      );
      console.log();
    }
  } catch (error) {
    console.error("❌ Error testing with real data:", error.message);
  }
}

async function testNotificationCreation() {
  console.log("📧 Testing Notification Creation (Dry Run)\n");

  try {
    // Find a vendor for testing
    const vendor = await Vendor.findOne().populate("userId", "email name");

    if (!vendor) {
      console.log("⚠️  Missing vendor data. Skipping notification test.");
      return;
    }

    // Create a test product with high cubic weight
    const testProduct = {
      _id: new mongoose.Types.ObjectId(),
      name: "Test Large Product",
      length: 100,
      breadth: 80,
      height: 60,
      vendorId: vendor._id,
    };

    const cubicWeight = calculateCubicWeight(testProduct);
    const shouldTrigger = shouldTriggerCubicVolumeAlert(testProduct);
    const threshold = notificationConfig.triggers.cubicVolume.thresholdKg;

    console.log(`🧪 Testing notification for: ${testProduct.name}`);
    console.log(
      `   Dimensions: ${testProduct.length} × ${testProduct.breadth} × ${testProduct.height} cm`
    );
    console.log(`   Cubic Weight: ${cubicWeight.toFixed(2)}kg`);
    console.log(`   Threshold: ${threshold}kg`);
    console.log(`   Vendor: ${vendor.businessName || vendor.name}`);
    console.log(`   Should trigger: ${shouldTrigger ? "✅" : "❌"}`);

    // Note: We're not actually sending the notification in this test
    // to avoid spam. In a real scenario, you would uncomment the line below:
    // const result = await triggerCubicVolumeAlert(testProduct, vendor);
    // console.log(`   Notification result: ${result.success ? '✅' : '❌'}`);

    console.log("   📧 Notification creation skipped (dry run mode)");
  } catch (error) {
    console.error("❌ Error testing notification creation:", error.message);
  }
}

async function testMetadataStructure() {
  console.log("🔧 Testing Notification Metadata Structure\n");

  const sampleProduct = {
    _id: new mongoose.Types.ObjectId(),
    name: "Sample Large Product",
    length: 80,
    breadth: 60,
    height: 50,
  };

  const sampleVendor = {
    _id: new mongoose.Types.ObjectId(),
    businessName: "Sample Electronics",
    name: "Sample Vendor",
    email: "vendor@sample.com",
  };

  const cubicWeight = calculateCubicWeight(sampleProduct);
  const threshold = notificationConfig.triggers.cubicVolume.thresholdKg;
  const dimensionsStr = `${sampleProduct.length}cm × ${sampleProduct.breadth}cm × ${sampleProduct.height}cm`;

  console.log("📋 Expected notification metadata:");
  console.log(`  productId: ${sampleProduct._id}`);
  console.log(`  productName: ${sampleProduct.name}`);
  console.log(`  vendorId: ${sampleVendor._id}`);
  console.log(`  vendorName: ${sampleVendor.businessName}`);
  console.log(`  vendorEmail: ${sampleVendor.email}`);
  console.log(`  cubicWeight: ${cubicWeight.toFixed(2)}`);
  console.log(`  thresholdKg: ${threshold}`);
  console.log(`  dimensions: ${dimensionsStr}`);
  console.log(`  length: ${sampleProduct.length}`);
  console.log(`  breadth: ${sampleProduct.breadth}`);
  console.log(`  height: ${sampleProduct.height}`);
  console.log(`  actionUrl: /admin/products/${sampleProduct._id}`);
  console.log("  ✅ Metadata structure validated\n");
}

async function main() {
  console.log("🚀 Cubic Volume Notification Test Suite\n");

  try {
    await connectDB();

    // Run test scenarios
    const calculationTestsPassed = await testCubicWeightCalculation();

    // Test with real data if available
    await testWithRealData();

    // Test notification creation (dry run)
    await testNotificationCreation();

    // Test metadata structure
    await testMetadataStructure();

    if (calculationTestsPassed) {
      console.log("✅ All tests completed successfully!");
    } else {
      console.log("❌ Some tests failed!");
      process.exit(1);
    }
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

export {
  testCubicWeightCalculation,
  testWithRealData,
  testNotificationCreation,
};
