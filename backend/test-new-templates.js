#!/usr/bin/env node

/**
 * Test New Email Templates Rendering
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const templatesDir = path.join(__dirname, "templates", "emails");

// Sample data for testing templates
const sampleData = {
  title: "Test Notification",
  message: "This is a test notification message to verify template rendering.",
  date: new Date().toLocaleDateString(),
  companyName: "Product Ecosystem Platform",
  supportEmail: "support@productecosystem.com",
  year: new Date().getFullYear(),
  companyAddress: "123 Business St, Tech City, TC 12345",
};

const templateSamples = {
  product_archived: {
    ...sampleData,
    title: "Product Archived",
    message:
      "Your product 'Sample Widget Pro' has been successfully archived and is no longer active in the system.",
    metadata: {
      productId: "PROD123456",
      productName: "Sample Widget Pro",
      archiveReason: "End of product lifecycle",
      actionUrl: "/vendor/products/PROD123456",
    },
  },
  vendor_status_change: {
    ...sampleData,
    title: "Vendor Status Update",
    message:
      "Your vendor account status has been updated from 'pending' to 'active'. You can now access all vendor features.",
    metadata: {
      vendorName: "John Smith",
      businessName: "Tech Solutions Inc",
      previousStatus: "pending",
      newStatus: "active",
      changedBy: "System Administrator",
      reason: "Account verification completed successfully",
      actionUrl: "/vendor/dashboard",
    },
  },
};

function replacePlaceholders(content, data) {
  let result = content;

  // Replace simple placeholders
  result = result.replace(/\{\{title\}\}/g, data.title || "");
  result = result.replace(/\{\{message\}\}/g, data.message || "");
  result = result.replace(/\{\{date\}\}/g, data.date || "");
  result = result.replace(/\{\{companyName\}\}/g, data.companyName || "");
  result = result.replace(/\{\{supportEmail\}\}/g, data.supportEmail || "");
  result = result.replace(/\{\{year\}\}/g, data.year || "");
  result = result.replace(/\{\{companyAddress\}\}/g, data.companyAddress || "");

  // Replace metadata placeholders
  if (data.metadata) {
    for (const [key, value] of Object.entries(data.metadata)) {
      const regex = new RegExp(`\\{\\{metadata\\.${key}\\}\\}`, "g");
      result = result.replace(regex, value || "");
    }
  }

  // Handle conditional blocks (simplified)
  result = result.replace(/\{\{#if [^}]+\}\}[\s\S]*?\{\{\/if\}\}/g, "");
  result = result.replace(/\{\{#eq [^}]+\}\}[\s\S]*?\{\{\/eq\}\}/g, "");

  return result;
}

async function testTemplateRendering() {
  console.log("🎨 Testing New Email Template Rendering\n");

  const newTemplates = ["product_archived.html", "vendor_status_change.html"];

  for (const templateFile of newTemplates) {
    console.log(`📧 Testing ${templateFile}:`);

    try {
      const templatePath = path.join(templatesDir, templateFile);
      const content = await fs.readFile(templatePath, "utf-8");

      const templateName = templateFile.replace(".html", "");
      const sampleDataForTemplate = templateSamples[templateName] || sampleData;

      const renderedContent = replacePlaceholders(
        content,
        sampleDataForTemplate
      );

      // Check that placeholders were replaced
      const remainingPlaceholders = (
        renderedContent.match(/\{\{[^}]+\}\}/g) || []
      ).length;

      console.log(`  📊 Template size: ${content.length} characters`);
      console.log(`  📊 Rendered size: ${renderedContent.length} characters`);
      console.log(`  📊 Remaining placeholders: ${remainingPlaceholders}`);

      // Check for key elements
      const hasTitle = renderedContent.includes(sampleDataForTemplate.title);
      const hasMessage = renderedContent.includes(
        sampleDataForTemplate.message
      );
      const hasCompanyName = renderedContent.includes(
        sampleDataForTemplate.companyName
      );
      const hasDate = renderedContent.includes(sampleDataForTemplate.date);

      console.log(`  ✅ Title rendered: ${hasTitle}`);
      console.log(`  ✅ Message rendered: ${hasMessage}`);
      console.log(`  ✅ Company name rendered: ${hasCompanyName}`);
      console.log(`  ✅ Date rendered: ${hasDate}`);

      if (sampleDataForTemplate.metadata) {
        const metadataKeys = Object.keys(sampleDataForTemplate.metadata);
        let metadataRendered = 0;

        for (const key of metadataKeys) {
          if (renderedContent.includes(sampleDataForTemplate.metadata[key])) {
            metadataRendered++;
          }
        }

        console.log(
          `  📊 Metadata rendered: ${metadataRendered}/${metadataKeys.length} fields`
        );
      }

      console.log(
        `  🎉 Template rendering: ${
          remainingPlaceholders === 0 ? "✅ SUCCESS" : "⚠️ PARTIAL"
        }`
      );
    } catch (error) {
      console.log(`  ❌ Error testing template: ${error.message}`);
    }

    console.log();
  }

  console.log("📋 Template Rendering Test Complete!\n");
}

async function listAllTemplates() {
  console.log("📁 All Available Email Templates:\n");

  try {
    const files = await fs.readdir(templatesDir);
    const htmlFiles = files.filter((file) => file.endsWith(".html"));

    for (let i = 0; i < htmlFiles.length; i++) {
      const file = htmlFiles[i];
      const templatePath = path.join(templatesDir, file);
      const stats = await fs.stat(templatePath);
      const templateName = file
        .replace(".html", "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());

      console.log(`${i + 1}. ${templateName}`);
      console.log(`   File: ${file}`);
      console.log(`   Size: ${stats.size} bytes`);
      console.log(`   Modified: ${stats.mtime.toLocaleDateString()}`);
      console.log();
    }

    console.log(`Total: ${htmlFiles.length} email templates`);
  } catch (error) {
    console.error("❌ Error listing templates:", error.message);
  }
}

// Run tests
async function main() {
  await listAllTemplates();
  await testTemplateRendering();
}

main().catch(console.error);
