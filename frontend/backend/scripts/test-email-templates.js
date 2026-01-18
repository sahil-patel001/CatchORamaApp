#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Email Template Testing CLI Utility
 * Usage: node scripts/test-email-templates.js [command] [options]
 */

const commands = {
  validate: "Validate all email templates",
  test: "Test template rendering with sample data",
  report: "Generate HTML validation report",
  send: "Send test email (requires email configuration)",
  list: "List all available templates",
};

// Global variables for modules
let emailTemplateValidator, emailService;

async function loadModules() {
  try {
    const validatorModule = await import("../utils/emailTemplateValidator.js");
    emailTemplateValidator =
      validatorModule.emailTemplateValidator || validatorModule.default;

    const serviceModule = await import("../services/emailService.js");
    emailService = serviceModule.emailService || serviceModule.default;
  } catch (error) {
    console.error("❌ Failed to import required modules:", error.message);
    throw error;
  }
}

async function main() {
  // Load modules first
  await loadModules();
  const args = process.argv.slice(2);
  const command = args[0] || "validate";

  console.log("🔧 Email Template Testing Utility\n");

  try {
    switch (command) {
      case "validate":
        await validateTemplates();
        break;
      case "test":
        await testTemplateRendering(args[1]);
        break;
      case "report":
        await generateReport(args[1]);
        break;
      case "send":
        await sendTestEmail(args[1], args[2]);
        break;
      case "list":
        await listTemplates();
        break;
      case "help":
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

/**
 * Validate all email templates
 */
async function validateTemplates() {
  console.log("📋 Validating email templates...\n");

  const results = await emailTemplateValidator.validateAllTemplates();

  console.log(
    `Overall Status: ${results.isValid ? "✅ VALID" : "❌ INVALID"}\n`
  );

  if (results.errors.length > 0) {
    console.log("❌ Errors:");
    results.errors.forEach((error) => console.log(`  • ${error}`));
    console.log();
  }

  if (results.warnings.length > 0) {
    console.log("⚠️  Warnings:");
    results.warnings.forEach((warning) => console.log(`  • ${warning}`));
    console.log();
  }

  console.log("📊 Template Summary:");
  Object.entries(results.templates).forEach(([name, validation]) => {
    const status = validation.isValid ? "✅" : "❌";
    const errorCount = validation.errors.length;
    const warningCount = validation.warnings.length;
    console.log(
      `  ${status} ${name} (${errorCount} errors, ${warningCount} warnings)`
    );
  });

  if (!results.isValid) {
    process.exit(1);
  }
}

/**
 * Test template rendering with sample data
 */
async function testTemplateRendering(templateName) {
  if (!templateName) {
    console.log("❌ Please specify a template name");
    console.log(
      "Usage: node scripts/test-email-templates.js test <template-name>"
    );
    process.exit(1);
  }

  console.log(`🧪 Testing template rendering: ${templateName}\n`);

  const result = await emailTemplateValidator.testTemplateRendering(
    templateName
  );

  if (result.isValid) {
    console.log("✅ Template rendering successful");

    if (result.warnings.length > 0) {
      console.log("\n⚠️  Warnings:");
      result.warnings.forEach((warning) => console.log(`  • ${warning}`));
    }

    // Save rendered content to file
    const outputDir = "./temp";
    await fs.mkdir(outputDir, { recursive: true });
    const outputFile = path.join(outputDir, `${templateName}-test.html`);
    await fs.writeFile(outputFile, result.renderedContent);
    console.log(`\n📄 Rendered template saved to: ${outputFile}`);
  } else {
    console.log("❌ Template rendering failed");
    result.errors.forEach((error) => console.log(`  • ${error}`));
    process.exit(1);
  }
}

/**
 * Generate HTML validation report
 */
async function generateReport(outputPath) {
  console.log("📊 Generating validation report...\n");

  const report = await emailTemplateValidator.generateValidationReport();
  const outputFile = outputPath || "./temp/email-template-report.html";

  // Ensure directory exists
  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  await fs.writeFile(outputFile, report);

  console.log(`✅ Validation report generated: ${outputFile}`);
}

/**
 * Send test email
 */
async function sendTestEmail(templateName, recipientEmail) {
  if (!templateName || !recipientEmail) {
    console.log("❌ Please specify template name and recipient email");
    console.log(
      "Usage: node scripts/test-email-templates.js send <template-name> <recipient-email>"
    );
    process.exit(1);
  }

  console.log(`📧 Sending test email: ${templateName} to ${recipientEmail}\n`);

  try {
    // Generate sample notification data
    const sampleData = emailTemplateValidator.generateSampleData(templateName);
    const notification = {
      _id: "test-notification-id",
      type: templateName,
      title: sampleData.title,
      message: sampleData.message,
      createdAt: new Date(),
      metadata: sampleData.metadata || {},
    };

    // Generate email content
    const emailContent = await emailService.generateEmailContent(notification);

    // Send email
    const result = await emailService.sendEmail(recipientEmail, emailContent);

    if (result.success) {
      console.log("✅ Test email sent successfully");
      console.log(`📬 Message ID: ${result.messageId}`);
    } else {
      console.log("❌ Failed to send test email");
      console.log(`Error: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.log("❌ Failed to send test email");
    console.log(`Error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * List all available templates
 */
async function listTemplates() {
  console.log("📋 Available email templates:\n");

  try {
    const templateDir = "./templates/emails";
    const files = await fs.readdir(templateDir);
    const htmlFiles = files.filter((file) => file.endsWith(".html"));

    if (htmlFiles.length === 0) {
      console.log("No email templates found.");
      return;
    }

    htmlFiles.forEach((file, index) => {
      const templateName = path.basename(file, ".html");
      console.log(`  ${index + 1}. ${templateName}`);
    });

    console.log(`\nTotal templates: ${htmlFiles.length}`);
  } catch (error) {
    console.log("❌ Failed to list templates");
    console.log(`Error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Show help information
 */
function showHelp() {
  console.log("Email Template Testing Utility\n");
  console.log(
    "Usage: node scripts/test-email-templates.js [command] [options]\n"
  );
  console.log("Available commands:");

  Object.entries(commands).forEach(([command, description]) => {
    console.log(`  ${command.padEnd(12)} ${description}`);
  });

  console.log("\nExamples:");
  console.log("  node scripts/test-email-templates.js validate");
  console.log("  node scripts/test-email-templates.js test low_stock");
  console.log(
    "  node scripts/test-email-templates.js report ./reports/validation.html"
  );
  console.log(
    "  node scripts/test-email-templates.js send new_order user@example.com"
  );
  console.log("  node scripts/test-email-templates.js list");
}

// Run the CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
