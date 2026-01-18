#!/usr/bin/env node

/**
 * Simple Low Stock Notification Test (No DB Connection Required)
 */

import { shouldTriggerLowStockNotification } from "../utils/notificationTriggers.js";

console.log("🧪 Testing Low Stock Notification Logic\n");

// Test cases
const testCases = [
  {
    name: "Product below default threshold",
    product: { stock: 5, inventory: {} },
    expected: true,
  },
  {
    name: "Product above default threshold",
    product: { stock: 15, inventory: {} },
    expected: false,
  },
  {
    name: "Product below custom inventory threshold",
    product: { stock: 8, inventory: { lowStockThreshold: 10 } },
    expected: true,
  },
  {
    name: "Product above custom inventory threshold",
    product: { stock: 12, inventory: { lowStockThreshold: 10 } },
    expected: false,
  },
  {
    name: "Product with custom product-level threshold",
    product: { stock: 5, lowStockThreshold: 8, inventory: {} },
    expected: true,
  },
  {
    name: "Stock transition - crossing threshold",
    product: { stock: 8, inventory: { lowStockThreshold: 10 } },
    previousStock: 12,
    expected: true,
  },
  {
    name: "Stock transition - already below threshold",
    product: { stock: 7, inventory: { lowStockThreshold: 10 } },
    previousStock: 8,
    expected: false,
  },
  {
    name: "Stock transition - staying above threshold",
    product: { stock: 15, inventory: { lowStockThreshold: 10 } },
    previousStock: 20,
    expected: false,
  },
];

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const result = shouldTriggerLowStockNotification(
    testCase.product,
    testCase.previousStock
  );
  const success = result === testCase.expected;

  console.log(`${index + 1}. ${testCase.name}`);
  console.log(
    `   Stock: ${testCase.product.stock}, Threshold: ${
      testCase.product.inventory?.lowStockThreshold ||
      testCase.product.lowStockThreshold ||
      10
    }`
  );
  if (testCase.previousStock !== undefined) {
    console.log(`   Previous Stock: ${testCase.previousStock}`);
  }
  console.log(
    `   Expected: ${testCase.expected}, Got: ${result} ${success ? "✅" : "❌"}`
  );
  console.log();

  if (success) {
    passed++;
  } else {
    failed++;
  }
});

console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log("🎉 All tests passed!");
} else {
  console.log("❌ Some tests failed!");
  process.exit(1);
}
