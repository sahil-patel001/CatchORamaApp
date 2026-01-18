#!/usr/bin/env node

/**
 * Comprehensive Email Template Testing Script
 * Tests all email templates with appropriate sample data
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const templatesDir = path.join(__dirname, "..", "templates", "emails");

// Base sample data
const baseSampleData = {
  title: "Test Notification",
  date: new Date().toLocaleDateString(),
  companyName: "Product Ecosystem Platform",
  supportEmail: "support@productecosystem.com",
  year: new Date().getFullYear(),
  companyAddress: "123 Business St, Tech City, TC 12345",
};

// Template-specific sample data
const templateSamples = {
  low_stock: {
    ...baseSampleData,
    title: "Low Stock Alert",
    message:
      "Your product 'Premium Wireless Headphones' is running low on stock with only 3 units remaining.",
    metadata: {
      productName: "Premium Wireless Headphones",
      currentQuantity: 3,
      threshold: 10,
      actionUrl: "/vendor/products/PROD123456",
    },
  },
  new_order: {
    ...baseSampleData,
    title: "New Order Received",
    message:
      "You have received a new order #ORD-2025-001 with a total amount of $299.99.",
    metadata: {
      orderNumber: "ORD-2025-001",
      totalAmount: "299.99",
      customerName: "John Doe",
      customerEmail: "john.doe@example.com",
      actionUrl: "/vendor/orders/ORD-2025-001",
    },
  },
  cubic_volume_alert: {
    ...baseSampleData,
    title: "Cubic Volume Alert",
    message:
      "Product 'Large Storage Container' by Tech Solutions Inc has a cubic weight of 45.5kg, which exceeds the 32kg threshold.",
    metadata: {
      productName: "Large Storage Container",
      vendorName: "Tech Solutions Inc",
      vendorEmail: "vendor@techsolutions.com",
      cubicWeight: "45.5",
      thresholdKg: 32,
      dimensions: "80cm × 60cm × 50cm",
      length: 80,
      breadth: 60,
      height: 50,
      actionUrl: "/admin/products/PROD789012",
    },
  },
  system_alert: {
    ...baseSampleData,
    title: "System Alert",
    message:
      "Database backup completed successfully. All data has been securely backed up.",
    metadata: {
      alertType: "info",
      source: "Backup Service",
      severity: "info",
      details: "Scheduled backup completed at 02:00 AM",
      actionRequired: false,
      actionUrl: "/admin/system/backups",
    },
  },
  commission_update: {
    ...baseSampleData,
    title: "Commission Rate Update",
    message:
      "Your commission rate has been updated from 8.5% to 10.0% effective immediately.",
    metadata: {
      vendorName: "Tech Solutions Inc",
      previousRate: "8.5",
      newRate: "10.0",
      effectiveDate: new Date().toLocaleDateString(),
      reason: "Performance milestone achieved",
      actionUrl: "/vendor/commissions",
    },
  },
  product_archived: {
    ...baseSampleData,
    title: "Product Archived",
    message:
      "Your product 'Legacy Widget Model X1' has been archived and is no longer active in the system.",
    metadata: {
      productId: "PROD456789",
      productName: "Legacy Widget Model X1",
      archiveReason: "End of product lifecycle",
      actionUrl: "/vendor/products/PROD456789",
    },
  },
  vendor_status_change: {
    ...baseSampleData,
    title: "Vendor Status Update",
    message:
      "Your vendor account status has been updated from 'pending' to 'active'. You can now access all vendor features.",
    metadata: {
      vendorName: "Jane Smith",
      businessName: "Innovation Electronics",
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

  // Remove conditional blocks for testing (simplified)
  result = result.replace(/\{\{#if [^}]+\}\}[\s\S]*?\{\{\/if\}\}/g, "");
  result = result.replace(/\{\{#eq [^}]+\}\}[\s\S]*?\{\{\/eq\}\}/g, "");
  result = result.replace(/\{\{#unless [^}]+\}\}[\s\S]*?\{\{\/unless\}\}/g, "");

  return result;
}

async function testAllTemplates() {
  console.log("🧪 Comprehensive Email Template Testing\n");

  try {
    const files = await fs.readdir(templatesDir);
    const htmlFiles = files.filter((file) => file.endsWith(".html"));

    console.log(`📁 Found ${htmlFiles.length} email templates\n`);

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    for (const file of htmlFiles) {
      const templateName = file.replace(".html", "");
      console.log(`📧 Testing ${file}:`);

      try {
        const templatePath = path.join(templatesDir, file);
        const content = await fs.readFile(templatePath, "utf-8");

        // Get sample data for this template
        const sampleData = templateSamples[templateName] || {
          ...baseSampleData,
          message: `This is a test message for the ${templateName} template.`,
          metadata: {},
        };

        // Test rendering
        const renderedContent = replacePlaceholders(content, sampleData);

        // Validation checks
        const checks = {
          hasTitle: renderedContent.includes(sampleData.title),
          hasMessage: renderedContent.includes(sampleData.message),
          hasCompanyName: renderedContent.includes(sampleData.companyName),
          hasDate: renderedContent.includes(sampleData.date),
          hasSupportEmail: renderedContent.includes(sampleData.supportEmail),
          hasYear: renderedContent.includes(sampleData.year.toString()),
          remainingPlaceholders:
            (renderedContent.match(/\{\{[^}]+\}\}/g) || []).length === 0,
        };

        const passedChecks = Object.values(checks).filter(Boolean).length;
        const totalChecks = Object.keys(checks).length;

        console.log(`  📊 Template size: ${content.length} characters`);
        console.log(`  📊 Rendered size: ${renderedContent.length} characters`);
        console.log(
          `  ✅ Validation: ${passedChecks}/${totalChecks} checks passed`
        );

        // Metadata validation
        if (
          sampleData.metadata &&
          Object.keys(sampleData.metadata).length > 0
        ) {
          const metadataKeys = Object.keys(sampleData.metadata);
          let metadataRendered = 0;

          for (const key of metadataKeys) {
            const value = sampleData.metadata[key];
            if (value && renderedContent.includes(value.toString())) {
              metadataRendered++;
            }
          }

          console.log(
            `  📊 Metadata: ${metadataRendered}/${metadataKeys.length} fields rendered`
          );
        }

        const isSuccess = passedChecks === totalChecks;
        console.log(`  🎉 Result: ${isSuccess ? "✅ PASS" : "❌ FAIL"}`);

        totalTests++;
        if (isSuccess) {
          passedTests++;
        } else {
          failedTests++;

          // Show failed checks
          Object.entries(checks).forEach(([check, passed]) => {
            if (!passed) {
              console.log(`    ❌ Failed: ${check}`);
            }
          });
        }
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
        totalTests++;
        failedTests++;
      }

      console.log();
    }

    console.log("📋 Test Summary:");
    console.log(`  Total templates tested: ${totalTests}`);
    console.log(`  Passed: ${passedTests}`);
    console.log(`  Failed: ${failedTests}`);
    console.log(
      `  Success rate: ${
        totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0
      }%`
    );

    if (failedTests === 0) {
      console.log("🎉 All email templates passed validation!");
    } else {
      console.log(
        "⚠️  Some templates need attention. Review the failed tests above."
      );
    }

    return failedTests === 0;
  } catch (error) {
    console.error("❌ Error testing templates:", error.message);
    return false;
  }
}

async function listTemplateFeatures() {
  console.log("📋 Template Feature Analysis\n");

  try {
    const files = await fs.readdir(templatesDir);
    const htmlFiles = files.filter((file) => file.endsWith(".html"));

    for (const file of htmlFiles) {
      const templatePath = path.join(templatesDir, file);
      const content = await fs.readFile(templatePath, "utf-8");

      const templateName = file
        .replace(".html", "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());

      // Analyze features
      const features = {
        hasResponsiveDesign: content.includes("@media"),
        hasGradients: content.includes("linear-gradient"),
        hasConditionals: content.includes("{{#if") || content.includes("{{#eq"),
        metadataCount: (content.match(/\{\{metadata\./g) || []).length,
        hasActionButton: content.includes('class="button"'),
        hasFooter: content.includes('class="footer"'),
        hasStyling: content.includes("<style>"),
      };

      console.log(`📧 ${templateName}:`);
      console.log(
        `   📱 Responsive: ${features.hasResponsiveDesign ? "✅" : "❌"}`
      );
      console.log(`   🎨 Gradients: ${features.hasGradients ? "✅" : "❌"}`);
      console.log(
        `   🔀 Conditionals: ${features.hasConditionals ? "✅" : "❌"}`
      );
      console.log(`   📊 Metadata fields: ${features.metadataCount}`);
      console.log(
        `   🔘 Action button: ${features.hasActionButton ? "✅" : "❌"}`
      );
      console.log(`   📄 Footer: ${features.hasFooter ? "✅" : "❌"}`);
      console.log(`   💅 Custom styling: ${features.hasStyling ? "✅" : "❌"}`);
      console.log();
    }
  } catch (error) {
    console.error("❌ Error analyzing templates:", error.message);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "test";

  switch (command) {
    case "test":
      await testAllTemplates();
      break;
    case "features":
      await listTemplateFeatures();
      break;
    case "all":
      await testAllTemplates();
      console.log("\n" + "=".repeat(60) + "\n");
      await listTemplateFeatures();
      break;
    default:
      console.log(
        "Usage: node test-all-email-templates.js [test|features|all]"
      );
      console.log("  test     - Test all templates with sample data (default)");
      console.log("  features - Analyze template features");
      console.log("  all      - Run both tests and feature analysis");
  }
}

// Run if this file is executed directly
const currentFile = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === currentFile;

if (isMainModule) {
  main().catch(console.error);
}

export { testAllTemplates, listTemplateFeatures };
