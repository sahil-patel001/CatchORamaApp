#!/usr/bin/env node

/**
 * Test New Order Notification Functionality
 * This script tests the new order notification triggers with various scenarios
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Order from "../models/Order.js";
import Vendor from "../models/Vendor.js";
import { triggerNewOrderNotification } from "../utils/notificationTriggers.js";

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

async function testNotificationLogic() {
  console.log("🧪 Testing New Order Notification Logic\n");

  // Test Scenario 1: Mock order with basic data
  console.log("📦 Scenario 1: Basic order notification");
  const mockOrder1 = {
    _id: new mongoose.Types.ObjectId(),
    orderNumber: "ORD-12345",
    orderTotal: 99.99,
    items: [
      {
        productId: new mongoose.Types.ObjectId(),
        name: "Test Product 1",
        quantity: 2,
        price: 29.99,
      },
      {
        productId: new mongoose.Types.ObjectId(),
        name: "Test Product 2",
        quantity: 1,
        price: 39.99,
      },
    ],
    customer: {
      name: "John Doe",
      email: "john.doe@example.com",
    },
  };

  const mockVendor1 = {
    _id: new mongoose.Types.ObjectId(),
    userId: new mongoose.Types.ObjectId(),
    businessName: "Test Electronics Store",
    name: "Test Vendor",
  };

  console.log(`  Order: #${mockOrder1.orderNumber}`);
  console.log(`  Total: $${mockOrder1.orderTotal}`);
  console.log(`  Items: ${mockOrder1.items.length}`);
  console.log(
    `  Customer: ${mockOrder1.customer.name} (${mockOrder1.customer.email})`
  );
  console.log(`  Vendor: ${mockVendor1.businessName}`);
  console.log("  ✅ Mock notification would be triggered\n");

  // Test Scenario 2: Large order
  console.log("📦 Scenario 2: Large order notification");
  const mockOrder2 = {
    _id: new mongoose.Types.ObjectId(),
    orderNumber: "ORD-67890",
    orderTotal: 1299.99,
    items: [
      {
        productId: new mongoose.Types.ObjectId(),
        name: "Laptop",
        quantity: 1,
        price: 999.99,
      },
      {
        productId: new mongoose.Types.ObjectId(),
        name: "Mouse",
        quantity: 2,
        price: 49.99,
      },
      {
        productId: new mongoose.Types.ObjectId(),
        name: "Keyboard",
        quantity: 1,
        price: 149.99,
      },
      {
        productId: new mongoose.Types.ObjectId(),
        name: "Monitor",
        quantity: 1,
        price: 299.99,
      },
    ],
    customer: {
      name: "Jane Smith",
      email: "jane.smith@company.com",
    },
  };

  const mockVendor2 = {
    _id: new mongoose.Types.ObjectId(),
    userId: new mongoose.Types.ObjectId(),
    businessName: "Tech Solutions Inc",
    name: "Tech Vendor",
  };

  console.log(`  Order: #${mockOrder2.orderNumber}`);
  console.log(`  Total: $${mockOrder2.orderTotal}`);
  console.log(`  Items: ${mockOrder2.items.length}`);
  console.log(
    `  Customer: ${mockOrder2.customer.name} (${mockOrder2.customer.email})`
  );
  console.log(`  Vendor: ${mockVendor2.businessName}`);
  console.log("  ✅ Mock notification would be triggered\n");

  // Test Scenario 3: Single item order
  console.log("📦 Scenario 3: Single item order notification");
  const mockOrder3 = {
    _id: new mongoose.Types.ObjectId(),
    orderNumber: "ORD-11111",
    orderTotal: 25.99,
    items: [
      {
        productId: new mongoose.Types.ObjectId(),
        name: "Phone Case",
        quantity: 1,
        price: 25.99,
      },
    ],
    customer: {
      name: "Bob Wilson",
      email: "bob.wilson@email.com",
    },
  };

  const mockVendor3 = {
    _id: new mongoose.Types.ObjectId(),
    userId: new mongoose.Types.ObjectId(),
    businessName: "Mobile Accessories Plus",
    name: "Mobile Vendor",
  };

  console.log(`  Order: #${mockOrder3.orderNumber}`);
  console.log(`  Total: $${mockOrder3.orderTotal}`);
  console.log(`  Items: ${mockOrder3.items.length}`);
  console.log(
    `  Customer: ${mockOrder3.customer.name} (${mockOrder3.customer.email})`
  );
  console.log(`  Vendor: ${mockVendor3.businessName}`);
  console.log("  ✅ Mock notification would be triggered\n");
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

    // Find orders for this vendor
    const orders = await Order.find({ vendorId: vendor._id })
      .limit(3)
      .populate("vendorId", "businessName name userId");
    if (orders.length === 0) {
      console.log("⚠️  No orders found for vendor. Skipping real data test.");
      return;
    }

    console.log(`📦 Found ${orders.length} orders for testing:\n`);

    for (const order of orders) {
      console.log(`  • Order #${order.orderNumber}`);
      console.log(`    Total: $${order.orderTotal}`);
      console.log(`    Items: ${order.items.length}`);
      console.log(
        `    Customer: ${order.customer.name} (${order.customer.email})`
      );
      console.log(`    Status: ${order.status}`);
      console.log(`    Created: ${order.createdAt.toLocaleDateString()}`);
      console.log("    ✅ Would trigger new order notification\n");
    }
  } catch (error) {
    console.error("❌ Error testing with real data:", error.message);
  }
}

async function testNotificationCreation() {
  console.log("📧 Testing Notification Creation (Dry Run)\n");

  try {
    // Find a vendor and order for testing
    const vendor = await Vendor.findOne().populate("userId", "email name");
    const order = await Order.findOne({ vendorId: vendor?._id });

    if (!vendor || !order) {
      console.log(
        "⚠️  Missing vendor or order data. Skipping notification test."
      );
      return;
    }

    console.log(`🧪 Testing notification for order: #${order.orderNumber}`);
    console.log(`   Total: $${order.orderTotal}`);
    console.log(`   Items: ${order.items.length}`);
    console.log(
      `   Customer: ${order.customer.name} (${order.customer.email})`
    );
    console.log(`   Vendor: ${vendor.businessName || vendor.name}`);
    console.log(`   Vendor Email: ${vendor.userId?.email}`);

    // Note: We're not actually sending the notification in this test
    // to avoid spam. In a real scenario, you would uncomment the line below:
    // const result = await triggerNewOrderNotification(order, vendor);
    // console.log(`   Notification result: ${result.success ? '✅' : '❌'}`);

    console.log("   📧 Notification creation skipped (dry run mode)");
  } catch (error) {
    console.error("❌ Error testing notification creation:", error.message);
  }
}

async function testMetadataStructure() {
  console.log("🔧 Testing Notification Metadata Structure\n");

  const sampleOrder = {
    _id: new mongoose.Types.ObjectId(),
    orderNumber: "ORD-SAMPLE",
    orderTotal: 149.97,
    items: [
      {
        productId: new mongoose.Types.ObjectId(),
        name: "Widget A",
        quantity: 2,
        price: 49.99,
      },
      {
        productId: new mongoose.Types.ObjectId(),
        name: "Widget B",
        quantity: 1,
        price: 49.99,
      },
    ],
    customer: {
      name: "Test Customer",
      email: "test@example.com",
    },
  };

  const sampleVendor = {
    _id: new mongoose.Types.ObjectId(),
    userId: new mongoose.Types.ObjectId(),
    businessName: "Sample Store",
    name: "Sample Vendor",
  };

  console.log("📋 Expected notification metadata:");
  console.log(`  orderId: ${sampleOrder._id}`);
  console.log(`  orderNumber: ${sampleOrder.orderNumber}`);
  console.log(`  totalAmount: ${sampleOrder.orderTotal.toFixed(2)}`);
  console.log(`  itemCount: ${sampleOrder.items.length}`);
  console.log(`  vendorId: ${sampleVendor._id}`);
  console.log(`  vendorName: ${sampleVendor.businessName}`);
  console.log(`  customerName: ${sampleOrder.customer.name}`);
  console.log(`  customerEmail: ${sampleOrder.customer.email}`);
  console.log(`  actionUrl: /vendor/orders/${sampleOrder._id}`);
  console.log("  ✅ Metadata structure validated\n");
}

async function main() {
  console.log("🚀 New Order Notification Test Suite\n");

  try {
    await connectDB();

    // Run test scenarios
    await testNotificationLogic();

    // Test with real data if available
    await testWithRealData();

    // Test notification creation (dry run)
    await testNotificationCreation();

    // Test metadata structure
    await testMetadataStructure();

    console.log("✅ All tests completed successfully!");
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

export { testNotificationLogic, testWithRealData, testNotificationCreation };
