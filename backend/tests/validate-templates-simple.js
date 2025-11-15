#!/usr/bin/env node

/**
 * Simple Email Template Validation
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const templatesDir = path.join(__dirname, "templates", "emails");

const requiredPlaceholders = [
  "{{title}}",
  "{{message}}",
  "{{date}}",
  "{{companyName}}",
  "{{supportEmail}}",
  "{{year}}",
];

async function validateAllTemplates() {
  console.log("🔍 Validating Email Templates\n");

  try {
    const files = await fs.readdir(templatesDir);
    const htmlFiles = files.filter((file) => file.endsWith(".html"));

    console.log(`📁 Found ${htmlFiles.length} template files:\n`);

    let allValid = true;

    for (const file of htmlFiles) {
      const templatePath = path.join(templatesDir, file);
      const content = await fs.readFile(templatePath, "utf-8");

      console.log(`📄 ${file}`);

      // Check for required placeholders
      const missingPlaceholders = [];
      const foundPlaceholders = [];

      for (const placeholder of requiredPlaceholders) {
        if (content.includes(placeholder)) {
          foundPlaceholders.push(placeholder);
        } else {
          missingPlaceholders.push(placeholder);
        }
      }

      // Check for basic HTML structure
      const hasDoctype = content.includes("<!DOCTYPE html>");
      const hasTitle = content.includes("<title>");
      const hasBody = content.includes("<body>");
      const hasContainer = content.includes("container");

      console.log(
        `  ✅ Required placeholders found: ${foundPlaceholders.length}/${requiredPlaceholders.length}`
      );

      if (missingPlaceholders.length > 0) {
        console.log(
          `  ❌ Missing placeholders: ${missingPlaceholders.join(", ")}`
        );
        allValid = false;
      }

      if (!hasDoctype) {
        console.log(`  ❌ Missing DOCTYPE declaration`);
        allValid = false;
      }

      if (!hasTitle) {
        console.log(`  ❌ Missing <title> tag`);
        allValid = false;
      }

      if (!hasBody) {
        console.log(`  ❌ Missing <body> tag`);
        allValid = false;
      }

      if (!hasContainer) {
        console.log(`  ⚠️  No container class found (may affect styling)`);
      }

      // Check for metadata usage
      const metadataUsage = (content.match(/\{\{metadata\./g) || []).length;
      console.log(`  📊 Metadata placeholders: ${metadataUsage}`);

      console.log();
    }

    console.log(`📊 Validation Summary:`);
    console.log(`  Total templates: ${htmlFiles.length}`);
    console.log(
      `  Validation result: ${allValid ? "✅ ALL PASSED" : "❌ SOME FAILED"}`
    );

    if (allValid) {
      console.log(`🎉 All email templates are valid!`);
    } else {
      console.log(
        `⚠️  Some templates need attention. Please review the issues above.`
      );
    }

    return allValid;
  } catch (error) {
    console.error("❌ Error validating templates:", error.message);
    return false;
  }
}

// Run validation
validateAllTemplates().then((success) => {
  process.exit(success ? 0 : 1);
});
