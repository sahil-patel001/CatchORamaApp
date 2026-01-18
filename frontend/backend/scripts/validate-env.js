#!/usr/bin/env node

/**
 * Environment Validation Script
 * Validates environment configuration without starting the server
 */

import { initializeEnvironment } from "../config/environment.js";

console.log("🔧 Validating environment configuration...\n");

try {
  const validation = initializeEnvironment();

  if (validation.errors.length === 0) {
    console.log("\n🎉 Environment configuration is valid!");
    process.exit(0);
  } else {
    console.log(
      "\n❌ Environment configuration has errors. Please fix them before starting the application."
    );
    process.exit(1);
  }
} catch (error) {
  console.error("❌ Error validating environment:", error.message);
  process.exit(1);
}
