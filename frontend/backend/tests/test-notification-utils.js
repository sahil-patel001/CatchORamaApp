#!/usr/bin/env node

/**
 * Test script for notification utilities
 * Validates that all utility functions work correctly
 */

import {
  NotificationUtils,
  createNotification,
} from "../utils/notificationUtils.js";
import { notificationConfig } from "../config/notification.js";

async function testNotificationUtils() {
  console.log("🧪 Testing Notification Utilities...\n");

  let passed = 0;
  let failed = 0;

  const test = (name, condition) => {
    if (condition) {
      console.log(`✅ ${name}: PASSED`);
      passed++;
    } else {
      console.log(`❌ ${name}: FAILED`);
      failed++;
    }
  };

  // Test data
  const testNotification = {
    userId: "507f1f77bcf86cd799439011",
    type: notificationConfig.types.LOW_STOCK,
    title: "Test Low Stock Alert",
    message: "This is a test notification",
    metadata: {
      productId: "507f1f77bcf86cd799439012",
      productName: "Test Product",
      currentQuantity: 5,
      threshold: 10,
    },
  };

  // Test 1: Notification creation
  try {
    const result = createNotification(testNotification);
    test("Notification creation", result.success === true);
  } catch (error) {
    test("Notification creation", false);
    console.log("   Error:", error.message);
  }

  // Test 2: Notification validation
  try {
    const validation =
      NotificationUtils.validate.notification(testNotification);
    test("Notification validation", validation.isValid === true);
  } catch (error) {
    test("Notification validation", false);
    console.log("   Error:", error.message);
  }

  // Test 3: Type validation
  try {
    const typeValidation = NotificationUtils.validate.type(
      notificationConfig.types.LOW_STOCK
    );
    test("Type validation (valid)", typeValidation.isValid === true);

    const invalidTypeValidation =
      NotificationUtils.validate.type("invalid_type");
    test("Type validation (invalid)", invalidTypeValidation.isValid === false);
  } catch (error) {
    test("Type validation", false);
    console.log("   Error:", error.message);
  }

  // Test 4: User ID validation
  try {
    const userIdValidation = NotificationUtils.validate.userId(
      "507f1f77bcf86cd799439011"
    );
    test("User ID validation (valid)", userIdValidation.isValid === true);

    const invalidUserIdValidation =
      NotificationUtils.validate.userId("invalid");
    test(
      "User ID validation (invalid)",
      invalidUserIdValidation.isValid === false
    );
  } catch (error) {
    test("User ID validation", false);
    console.log("   Error:", error.message);
  }

  // Test 5: Message formatting
  try {
    const formattedMessage = NotificationUtils.format.message(
      notificationConfig.types.LOW_STOCK,
      { productName: "Test Product", currentQuantity: 5, threshold: 10 }
    );
    test("Message formatting", formattedMessage.includes("Test Product"));
  } catch (error) {
    test("Message formatting", false);
    console.log("   Error:", error.message);
  }

  // Test 6: Title formatting
  try {
    const formattedTitle = NotificationUtils.format.title(
      notificationConfig.types.LOW_STOCK
    );
    test("Title formatting", formattedTitle === "Low Stock Alert");
  } catch (error) {
    test("Title formatting", false);
    console.log("   Error:", error.message);
  }

  // Test 7: Metadata formatting
  try {
    const formattedMetadata = NotificationUtils.format.metadata(
      notificationConfig.types.LOW_STOCK,
      {
        productId: "123",
        productName: "Test",
        currentQuantity: 5,
        threshold: 10,
      }
    );
    test("Metadata formatting", formattedMetadata.priority === "high");
  } catch (error) {
    test("Metadata formatting", false);
    console.log("   Error:", error.message);
  }

  // Test 8: Time formatting
  try {
    const timeAgo = NotificationUtils.format.timeAgo(
      new Date(Date.now() - 60000)
    ); // 1 minute ago
    test("Time formatting", timeAgo.includes("minute"));
  } catch (error) {
    test("Time formatting", false);
    console.log("   Error:", error.message);
  }

  // Test 9: System status checks
  try {
    const isEnabled = NotificationUtils.helper.isSystemEnabled();
    test("System status check", typeof isEnabled === "boolean");
  } catch (error) {
    test("System status check", false);
    console.log("   Error:", error.message);
  }

  // Test 10: Type configuration
  try {
    const typeConfig = NotificationUtils.helper.getTypeConfig(
      notificationConfig.types.LOW_STOCK
    );
    test("Type configuration", typeConfig.name === "Low Stock Alert");
  } catch (error) {
    test("Type configuration", false);
    console.log("   Error:", error.message);
  }

  // Test 11: Query building
  try {
    const { dbQuery, options } = NotificationUtils.helper.buildQuery(
      { userId: "507f1f77bcf86cd799439011", unreadOnly: true },
      { page: 1, limit: 20 }
    );
    test(
      "Query building",
      dbQuery.userId === "507f1f77bcf86cd799439011" && dbQuery.isRead === false
    );
  } catch (error) {
    test("Query building", false);
    console.log("   Error:", error.message);
  }

  // Test 12: Input sanitization
  try {
    const maliciousInput = {
      userId: "507f1f77bcf86cd799439011",
      type: notificationConfig.types.SYSTEM_ALERT,
      title: '<script>alert("xss")</script>Test Title',
      message: '<img src="x" onerror="alert(1)">Test message',
      metadata: {},
    };
    const sanitized = NotificationUtils.validate.sanitize(maliciousInput);
    test(
      "Input sanitization",
      !sanitized.title.includes("<script>") &&
        !sanitized.message.includes("<img")
    );
  } catch (error) {
    test("Input sanitization", false);
    console.log("   Error:", error.message);
  }

  // Summary
  console.log(`\n📊 Test Results:`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(
    `   📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`
  );

  if (failed === 0) {
    console.log("\n🎉 All notification utility tests passed!");
    process.exit(0);
  } else {
    console.log("\n💥 Some tests failed. Please check the implementation.");
    process.exit(1);
  }
}

// Run tests
testNotificationUtils().catch((error) => {
  console.error("❌ Test execution failed:", error);
  process.exit(1);
});
