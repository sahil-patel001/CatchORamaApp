#!/usr/bin/env node

/**
 * Simple Cubic Weight Test (No DB Connection Required)
 */

import {
  calculateCubicWeight,
  shouldTriggerCubicVolumeAlert,
} from "../utils/notificationTriggers.js";

console.log("🧪 Testing Cubic Weight Calculation Logic\n");

// Test cases
const testCases = [
  {
    name: "Small box (10×10×10cm)",
    product: { length: 10, breadth: 10, height: 10 },
    expectedWeight: (10 * 10 * 10) / 6000,
    expectedTrigger: false,
  },
  {
    name: "Medium box (30×30×30cm)",
    product: { length: 30, breadth: 30, height: 30 },
    expectedWeight: (30 * 30 * 30) / 6000,
    expectedTrigger: false,
  },
  {
    name: "Large box (50×40×60cm)",
    product: { length: 50, breadth: 40, height: 60 },
    expectedWeight: (50 * 40 * 60) / 6000,
    expectedTrigger: false, // 20kg < 32kg threshold
  },
  {
    name: "Very large box (80×60×50cm)",
    product: { length: 80, breadth: 60, height: 50 },
    expectedWeight: (80 * 60 * 50) / 6000,
    expectedTrigger: true, // 40kg > 32kg threshold
  },
  {
    name: "Huge box (100×80×60cm)",
    product: { length: 100, breadth: 80, height: 60 },
    expectedWeight: (100 * 80 * 60) / 6000,
    expectedTrigger: true, // 80kg > 32kg threshold
  },
  {
    name: "Box with missing dimension",
    product: { length: 50, breadth: null, height: 40 },
    expectedWeight: 0,
    expectedTrigger: false,
  },
  {
    name: "Box with pre-calculated cubic weight",
    product: { length: 10, breadth: 10, height: 10, cubicWeight: 50 },
    expectedWeight: 50, // Should use pre-calculated value
    expectedTrigger: true,
  },
];

let passed = 0;
let failed = 0;

console.log("📏 Testing with 32kg threshold (default)\n");

testCases.forEach((testCase, index) => {
  const calculatedWeight = calculateCubicWeight(testCase.product);
  const shouldTrigger = shouldTriggerCubicVolumeAlert(testCase.product);

  const weightMatch =
    Math.abs(calculatedWeight - testCase.expectedWeight) < 0.001;
  const triggerMatch = shouldTrigger === testCase.expectedTrigger;
  const success = weightMatch && triggerMatch;

  console.log(`${index + 1}. ${testCase.name}`);
  console.log(
    `   Dimensions: ${testCase.product.length || 0} × ${
      testCase.product.breadth || 0
    } × ${testCase.product.height || 0} cm`
  );
  if (testCase.product.cubicWeight) {
    console.log(`   Pre-calculated: ${testCase.product.cubicWeight}kg`);
  }
  console.log(
    `   Calculated Weight: ${calculatedWeight.toFixed(
      3
    )}kg (expected: ${testCase.expectedWeight.toFixed(3)}kg)`
  );
  console.log(
    `   Should Trigger Alert: ${shouldTrigger} (expected: ${
      testCase.expectedTrigger
    }) ${success ? "✅" : "❌"}`
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
  console.log("🎉 All cubic weight tests passed!");
} else {
  console.log("❌ Some tests failed!");
  process.exit(1);
}
