#!/usr/bin/env node

/**
 * Environment Setup Script
 * Generates .env.example file and validates current environment
 */

import {
  generateEnvTemplate,
  validateEnvironment,
} from "../config/environment.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, "..");

/**
 * Main setup function
 */
async function setupEnvironment() {
  console.log("🚀 Setting up environment configuration...\n");

  try {
    // Generate .env.example file
    console.log("📝 Generating .env.example file...");
    const templatePath = path.join(projectRoot, ".env.example");
    await generateEnvTemplate(templatePath);
    console.log(`✅ Generated: ${templatePath}\n`);

    // Check if .env file exists
    const envPath = path.join(projectRoot, ".env");
    try {
      await fs.access(envPath);
      console.log("📄 Found existing .env file");
    } catch {
      console.log("⚠️  No .env file found");
      console.log(
        `💡 Copy ${templatePath} to ${envPath} and update the values\n`
      );
    }

    // Validate current environment
    console.log("🔧 Validating current environment configuration...");
    const validation = validateEnvironment();

    if (validation.errors.length > 0) {
      console.log("\n❌ Environment validation errors:");
      validation.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    if (validation.warnings.length > 0) {
      console.log("\n⚠️  Environment validation warnings:");
      validation.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
    }

    if (validation.errors.length === 0) {
      console.log("✅ Environment validation passed");
    }

    // Display setup instructions
    console.log("\n" + "=".repeat(60));
    console.log("📋 SETUP INSTRUCTIONS");
    console.log("=".repeat(60));

    console.log("\n1. Copy the generated .env.example to .env:");
    console.log(`   cp ${templatePath} ${envPath}`);

    console.log("\n2. Update the .env file with your actual values:");
    console.log("   - Set a strong JWT_SECRET (at least 32 characters)");
    console.log("   - Configure your MongoDB URI");
    console.log("   - Set up email service credentials");
    console.log("   - Configure CORS origins for your frontend");

    console.log("\n3. For email notifications, choose one service:");
    console.log("   a) NodeMailer (Gmail/SMTP):");
    console.log("      - Set EMAIL_SERVICE=nodemailer");
    console.log("      - Configure NODEMAILER_* variables");
    console.log("   b) SendGrid:");
    console.log("      - Set EMAIL_SERVICE=sendgrid");
    console.log("      - Configure SENDGRID_* variables");
    console.log("   c) AWS SES:");
    console.log("      - Set EMAIL_SERVICE=aws-ses");
    console.log("      - Configure AWS_SES_* variables");

    console.log("\n4. Restart your application to apply changes");

    console.log("\n5. Test your configuration:");
    console.log("   npm run validate-env");

    console.log("\n" + "=".repeat(60));

    // Generate validation script
    await generateValidationScript();

    console.log("\n🎉 Environment setup complete!");
  } catch (error) {
    console.error("❌ Error during environment setup:", error.message);
    process.exit(1);
  }
}

/**
 * Generate environment validation script
 */
async function generateValidationScript() {
  const scriptContent = `#!/usr/bin/env node

/**
 * Environment Validation Script
 * Validates environment configuration without starting the server
 */

import { initializeEnvironment } from "../config/environment.js";

console.log("🔧 Validating environment configuration...\\n");

try {
  const validation = initializeEnvironment();
  
  if (validation.errors.length === 0) {
    console.log("\\n🎉 Environment configuration is valid!");
    process.exit(0);
  } else {
    console.log("\\n❌ Environment configuration has errors. Please fix them before starting the application.");
    process.exit(1);
  }
} catch (error) {
  console.error("❌ Error validating environment:", error.message);
  process.exit(1);
}
`;

  const scriptPath = path.join(projectRoot, "scripts", "validate-env.js");
  await fs.writeFile(scriptPath, scriptContent, "utf8");

  // Make script executable
  try {
    await fs.chmod(scriptPath, 0o755);
  } catch (error) {
    // Ignore chmod errors on Windows
  }

  console.log(`📝 Generated validation script: ${scriptPath}`);
}

// Run the setup if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupEnvironment().catch((error) => {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  });
}

export { setupEnvironment };
