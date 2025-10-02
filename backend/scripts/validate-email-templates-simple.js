#!/usr/bin/env node

/**
 * Simple Email Template Validator
 */

import fs from "fs/promises";
import path from "path";

async function validateTemplates() {
  console.log("📋 Validating email templates...\n");

  try {
    const templateDir = "./templates/emails";
    const files = await fs.readdir(templateDir);
    const htmlFiles = files.filter((file) => file.endsWith(".html"));

    console.log(`Found ${htmlFiles.length} email templates:\n`);

    const requiredPlaceholders = [
      "{{title}}",
      "{{message}}",
      "{{date}}",
      "{{companyName}}",
      "{{supportEmail}}",
      "{{year}}",
    ];

    let allValid = true;

    for (const file of htmlFiles) {
      const templateName = path.basename(file, ".html");
      const templatePath = path.join(templateDir, file);
      const content = await fs.readFile(templatePath, "utf8");

      console.log(`📄 Validating: ${templateName}`);

      const missingPlaceholders = [];
      for (const placeholder of requiredPlaceholders) {
        if (!content.includes(placeholder)) {
          missingPlaceholders.push(placeholder);
        }
      }

      if (missingPlaceholders.length > 0) {
        console.log(
          `  ❌ Missing placeholders: ${missingPlaceholders.join(", ")}`
        );
        allValid = false;
      } else {
        console.log(`  ✅ All required placeholders present`);
      }

      // Check for basic HTML structure
      const checks = [
        { name: "DOCTYPE", check: content.includes("<!DOCTYPE html>") },
        { name: "HTML tag", check: content.includes("<html") },
        { name: "HEAD section", check: content.includes("<head>") },
        { name: "BODY section", check: content.includes("<body>") },
      ];

      for (const { name, check } of checks) {
        if (!check) {
          console.log(`  ⚠️  Missing: ${name}`);
        }
      }

      console.log();
    }

    console.log(`\n📊 Overall Status: ${allValid ? "✅ VALID" : "❌ INVALID"}`);

    if (!allValid) {
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error validating templates:", error.message);
    process.exit(1);
  }
}

// Run validation
validateTemplates().catch(console.error);
