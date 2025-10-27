import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Load environment variables
dotenv.config();

/**
 * Environment Configuration and Validation
 * Centralizes environment variable management and validation
 */

/**
 * Environment variable schema definition
 */
const envSchema = {
  // Core server configuration
  NODE_ENV: {
    required: true,
    type: "string",
    default: "development",
    allowedValues: ["development", "production", "test"],
    description: "Application environment",
  },
  PORT: {
    required: false,
    type: "number",
    default: 5000,
    description: "Server port number",
  },
  API_VERSION: {
    required: false,
    type: "string",
    default: "v1",
    description: "API version prefix",
  },

  // Database configuration
  MONGODB_URI: {
    required: true,
    type: "string",
    description: "MongoDB connection URI for main database",
  },
  MONGODB_TEST_URI: {
    required: false,
    type: "string",
    description: "MongoDB connection URI for test database",
  },

  // JWT configuration
  JWT_SECRET: {
    required: true,
    type: "string",
    minLength: 32,
    description: "JWT secret key for token signing",
  },
  JWT_EXPIRES_IN: {
    required: false,
    type: "string",
    default: "7d",
    description: "JWT token expiration time",
  },

  // CORS configuration
  ALLOWED_ORIGINS: {
    required: false,
    type: "string",
    default: "http://localhost:5173,http://catchorama.com",
    description: "Comma-separated list of allowed CORS origins",
  },

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: {
    required: false,
    type: "number",
    default: 900000,
    description: "Rate limit window in milliseconds",
  },
  RATE_LIMIT_MAX_REQUESTS: {
    required: false,
    type: "number",
    default: 100,
    description: "Maximum requests per rate limit window",
  },

  // WebSocket configuration
  WEBSOCKET_NOTIFICATIONS_ENABLED: {
    required: false,
    type: "boolean",
    default: true,
    description: "Enable WebSocket real-time notifications",
  },
  WEBSOCKET_CORS_ORIGINS: {
    required: false,
    type: "string",
    default: "http://localhost:5173,http://localhost:3000,http://catchorama.com",
    description: "Comma-separated list of allowed WebSocket CORS origins",
  },
  WEBSOCKET_PING_TIMEOUT: {
    required: false,
    type: "number",
    default: 60000,
    description: "WebSocket ping timeout in milliseconds",
  },
  WEBSOCKET_PING_INTERVAL: {
    required: false,
    type: "number",
    default: 25000,
    description: "WebSocket ping interval in milliseconds",
  },

  // Notification system
  NOTIFICATIONS_ENABLED: {
    required: false,
    type: "boolean",
    default: true,
    description: "Enable notification system",
  },
  EMAIL_NOTIFICATIONS_ENABLED: {
    required: false,
    type: "boolean",
    default: true,
    description: "Enable email notifications",
  },

  // Email service configuration
  EMAIL_SERVICE: {
    required: false,
    type: "string",
    default: "nodemailer",
    allowedValues: ["nodemailer", "sendgrid", "aws-ses"],
    description: "Email service provider",
  },

  // NodeMailer configuration
  NODEMAILER_HOST: {
    required: false,
    type: "string",
    default: "smtp.gmail.com",
    description: "SMTP host for NodeMailer",
    dependsOn: { EMAIL_SERVICE: "nodemailer" },
  },
  NODEMAILER_PORT: {
    required: false,
    type: "number",
    default: 587,
    description: "SMTP port for NodeMailer",
    dependsOn: { EMAIL_SERVICE: "nodemailer" },
  },
  NODEMAILER_SECURE: {
    required: false,
    type: "boolean",
    default: false,
    description: "Use secure connection for NodeMailer",
    dependsOn: { EMAIL_SERVICE: "nodemailer" },
  },
  NODEMAILER_USER: {
    required: false,
    type: "string",
    description: "SMTP username for NodeMailer",
    dependsOn: { EMAIL_SERVICE: "nodemailer" },
    requiredIf: {
      EMAIL_NOTIFICATIONS_ENABLED: true,
      EMAIL_SERVICE: "nodemailer",
    },
  },
  NODEMAILER_PASS: {
    required: false,
    type: "string",
    description: "SMTP password for NodeMailer",
    dependsOn: { EMAIL_SERVICE: "nodemailer" },
    requiredIf: {
      EMAIL_NOTIFICATIONS_ENABLED: true,
      EMAIL_SERVICE: "nodemailer",
    },
  },
  NODEMAILER_FROM_NAME: {
    required: false,
    type: "string",
    default: "Product Ecosystem",
    description: "From name for NodeMailer emails",
    dependsOn: { EMAIL_SERVICE: "nodemailer" },
  },
  NODEMAILER_FROM_EMAIL: {
    required: false,
    type: "string",
    description: "From email for NodeMailer",
    dependsOn: { EMAIL_SERVICE: "nodemailer" },
    requiredIf: {
      EMAIL_NOTIFICATIONS_ENABLED: true,
      EMAIL_SERVICE: "nodemailer",
    },
  },

  // SendGrid configuration
  SENDGRID_API_KEY: {
    required: false,
    type: "string",
    description: "SendGrid API key",
    dependsOn: { EMAIL_SERVICE: "sendgrid" },
    requiredIf: {
      EMAIL_NOTIFICATIONS_ENABLED: true,
      EMAIL_SERVICE: "sendgrid",
    },
  },
  SENDGRID_FROM_EMAIL: {
    required: false,
    type: "string",
    description: "From email for SendGrid",
    dependsOn: { EMAIL_SERVICE: "sendgrid" },
    requiredIf: {
      EMAIL_NOTIFICATIONS_ENABLED: true,
      EMAIL_SERVICE: "sendgrid",
    },
  },
  SENDGRID_FROM_NAME: {
    required: false,
    type: "string",
    default: "Product Ecosystem",
    description: "From name for SendGrid emails",
    dependsOn: { EMAIL_SERVICE: "sendgrid" },
  },

  // AWS SES configuration
  AWS_SES_REGION: {
    required: false,
    type: "string",
    default: "us-east-1",
    description: "AWS SES region",
    dependsOn: { EMAIL_SERVICE: "aws-ses" },
  },
  AWS_SES_ACCESS_KEY_ID: {
    required: false,
    type: "string",
    description: "AWS SES access key ID",
    dependsOn: { EMAIL_SERVICE: "aws-ses" },
    requiredIf: { EMAIL_NOTIFICATIONS_ENABLED: true, EMAIL_SERVICE: "aws-ses" },
  },
  AWS_SES_SECRET_ACCESS_KEY: {
    required: false,
    type: "string",
    description: "AWS SES secret access key",
    dependsOn: { EMAIL_SERVICE: "aws-ses" },
    requiredIf: { EMAIL_NOTIFICATIONS_ENABLED: true, EMAIL_SERVICE: "aws-ses" },
  },
  AWS_SES_FROM_EMAIL: {
    required: false,
    type: "string",
    description: "From email for AWS SES",
    dependsOn: { EMAIL_SERVICE: "aws-ses" },
    requiredIf: { EMAIL_NOTIFICATIONS_ENABLED: true, EMAIL_SERVICE: "aws-ses" },
  },
  AWS_SES_FROM_NAME: {
    required: false,
    type: "string",
    default: "Product Ecosystem",
    description: "From name for AWS SES emails",
    dependsOn: { EMAIL_SERVICE: "aws-ses" },
  },

  // Email template configuration
  EMAIL_TEMPLATE_DIR: {
    required: false,
    type: "string",
    default: "./templates/emails",
    description: "Directory for email templates",
  },
  EMAIL_LOGO_URL: {
    required: false,
    type: "string",
    description: "Logo URL for email templates",
  },
  EMAIL_COMPANY_NAME: {
    required: false,
    type: "string",
    default: "Product Ecosystem",
    description: "Company name for email templates",
  },
  EMAIL_SUPPORT_EMAIL: {
    required: false,
    type: "string",
    default: "support@yourdomain.com",
    description: "Support email address",
  },
  EMAIL_COMPANY_ADDRESS: {
    required: false,
    type: "string",
    description: "Company address for email templates",
  },

  // Notification triggers
  LOW_STOCK_NOTIFICATIONS_ENABLED: {
    required: false,
    type: "boolean",
    default: true,
    description: "Enable low stock notifications",
  },
  NEW_ORDER_NOTIFICATIONS_ENABLED: {
    required: false,
    type: "boolean",
    default: true,
    description: "Enable new order notifications",
  },
  CUBIC_VOLUME_NOTIFICATIONS_ENABLED: {
    required: false,
    type: "boolean",
    default: true,
    description: "Enable cubic volume notifications",
  },
  CUBIC_VOLUME_THRESHOLD_KG: {
    required: false,
    type: "number",
    default: 32,
    description: "Cubic volume threshold in kg for alerts",
  },

  // Notification cleanup
  NOTIFICATION_RETENTION_DAYS: {
    required: false,
    type: "number",
    default: 90,
    description: "Number of days to retain notifications",
  },
  NOTIFICATION_CLEANUP_INTERVAL_HOURS: {
    required: false,
    type: "number",
    default: 24,
    description: "Interval in hours for notification cleanup",
  },

  // Google OAuth Configuration
  GOOGLE_CLIENT_ID: {
    required: false,
    type: "string",
    description: "Google OAuth Client ID for authentication",
  },
  GOOGLE_CLIENT_SECRET: {
    required: false,
    type: "string",
    description: "Google OAuth Client Secret for authentication",
  },
  GOOGLE_CALLBACK_URL: {
    required: false,
    type: "string",
    default: "http://localhost:5001/api/v1/auth/google/callback",
    description: "Google OAuth callback URL",
  },

  // Frontend Configuration
  FRONTEND_URL: {
    required: false,
    type: "string",
    default: "http://localhost:5173",
    description: "Frontend application URL for redirects",
  },
};

/**
 * Convert string value to appropriate type
 * @param {string} value - Environment variable value
 * @param {string} type - Expected type
 * @returns {any} Converted value
 */
const convertValue = (value, type) => {
  if (value === undefined || value === null || value === "") return value;

  switch (type) {
    case "boolean":
      if (typeof value === "boolean") return value;
      if (typeof value === "string") return value.toLowerCase() === "true";
      return Boolean(value);
    case "number":
      if (typeof value === "number") return value;
      const num = Number(value);
      return isNaN(num) ? value : num;
    case "string":
    default:
      return String(value);
  }
};

/**
 * Validate environment variables against schema
 * @returns {Object} Validation result
 */
export const validateEnvironment = () => {
  const errors = [];
  const warnings = [];
  const config = {};

  // Get current environment values
  const currentEnv = { ...process.env };

  // Validate each schema entry
  for (const [key, schema] of Object.entries(envSchema)) {
    const rawValue = currentEnv[key];
    let value = convertValue(rawValue, schema.type);

    // Use default if value is undefined
    if (value === undefined && schema.default !== undefined) {
      value = convertValue(schema.default, schema.type);
    }

    // Check required fields
    if (
      schema.required &&
      (value === undefined || value === null || value === "")
    ) {
      errors.push(`${key} is required but not provided`);
      continue;
    }

    // Check conditional requirements
    if (schema.requiredIf) {
      let shouldBeRequired = true;
      for (const [condKey, condValue] of Object.entries(schema.requiredIf)) {
        const condCurrentValue = convertValue(
          currentEnv[condKey],
          envSchema[condKey]?.type || "string"
        );
        if (condCurrentValue !== condValue) {
          shouldBeRequired = false;
          break;
        }
      }

      if (
        shouldBeRequired &&
        (value === undefined || value === null || value === "")
      ) {
        errors.push(
          `${key} is required when conditions are met: ${JSON.stringify(
            schema.requiredIf
          )}`
        );
        continue;
      }
    }

    // Type validation
    if (value !== undefined && schema.type) {
      const expectedType = schema.type;
      const actualType = typeof value;

      if (expectedType === "number" && actualType !== "number") {
        errors.push(`${key} should be a number, got ${actualType}`);
        continue;
      }

      if (expectedType === "boolean" && actualType !== "boolean") {
        errors.push(`${key} should be a boolean, got ${actualType}`);
        continue;
      }
    }

    // Value validation
    if (value !== undefined && schema.allowedValues) {
      if (!schema.allowedValues.includes(value)) {
        errors.push(
          `${key} must be one of: ${schema.allowedValues.join(
            ", "
          )}, got: ${value}`
        );
        continue;
      }
    }

    // Length validation
    if (value !== undefined && schema.minLength && typeof value === "string") {
      if (value.length < schema.minLength) {
        errors.push(
          `${key} must be at least ${schema.minLength} characters long`
        );
        continue;
      }
    }

    // Store validated value
    config[key] = value;

    // Check for warnings
    if (schema.dependsOn && value !== undefined) {
      for (const [depKey, depValue] of Object.entries(schema.dependsOn)) {
        const depCurrentValue = convertValue(
          currentEnv[depKey],
          envSchema[depKey]?.type || "string"
        );
        if (depCurrentValue !== depValue) {
          warnings.push(
            `${key} is set but ${depKey} is not set to '${depValue}' (current: '${depCurrentValue}')`
          );
        }
      }
    }
  }

  // Check for undefined environment variables that are set
  const definedKeys = Object.keys(envSchema);
  const extraKeys = Object.keys(currentEnv)
    .filter(
      (key) =>
        key.startsWith("NOTIFICATION") ||
        key.startsWith("EMAIL") ||
        key.startsWith("WEBSOCKET") ||
        key.startsWith("NODEMAILER") ||
        key.startsWith("SENDGRID") ||
        key.startsWith("AWS_SES")
    )
    .filter((key) => !definedKeys.includes(key));

  if (extraKeys.length > 0) {
    warnings.push(
      `Unknown environment variables found: ${extraKeys.join(", ")}`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    config,
  };
};

/**
 * Generate environment file template
 * @param {string} filename - Output filename
 * @returns {Promise<string>} Generated content
 */
export const generateEnvTemplate = async (filename = ".env.example") => {
  let content = `# ============================================
# PRODUCT ECOSYSTEM ENVIRONMENT CONFIGURATION
# ============================================
# Copy this file to .env and update the values
# Generated on: ${new Date().toISOString()}

`;

  const categories = {
    "Server Configuration": ["NODE_ENV", "PORT", "API_VERSION"],
    "Database Configuration": ["MONGODB_URI", "MONGODB_TEST_URI"],
    "Authentication Configuration": ["JWT_SECRET", "JWT_EXPIRES_IN"],
    "CORS Configuration": ["ALLOWED_ORIGINS"],
    "Rate Limiting": ["RATE_LIMIT_WINDOW_MS", "RATE_LIMIT_MAX_REQUESTS"],
    "WebSocket Configuration": [
      "WEBSOCKET_NOTIFICATIONS_ENABLED",
      "WEBSOCKET_CORS_ORIGINS",
      "WEBSOCKET_PING_TIMEOUT",
      "WEBSOCKET_PING_INTERVAL",
    ],
    "Notification System": [
      "NOTIFICATIONS_ENABLED",
      "EMAIL_NOTIFICATIONS_ENABLED",
      "EMAIL_SERVICE",
    ],
    "NodeMailer Configuration": [
      "NODEMAILER_HOST",
      "NODEMAILER_PORT",
      "NODEMAILER_SECURE",
      "NODEMAILER_USER",
      "NODEMAILER_PASS",
      "NODEMAILER_FROM_NAME",
      "NODEMAILER_FROM_EMAIL",
    ],
    "SendGrid Configuration": [
      "SENDGRID_API_KEY",
      "SENDGRID_FROM_EMAIL",
      "SENDGRID_FROM_NAME",
    ],
    "AWS SES Configuration": [
      "AWS_SES_REGION",
      "AWS_SES_ACCESS_KEY_ID",
      "AWS_SES_SECRET_ACCESS_KEY",
      "AWS_SES_FROM_EMAIL",
      "AWS_SES_FROM_NAME",
    ],
    "Email Template Configuration": [
      "EMAIL_TEMPLATE_DIR",
      "EMAIL_LOGO_URL",
      "EMAIL_COMPANY_NAME",
      "EMAIL_SUPPORT_EMAIL",
      "EMAIL_COMPANY_ADDRESS",
    ],
    "Notification Triggers": [
      "LOW_STOCK_NOTIFICATIONS_ENABLED",
      "NEW_ORDER_NOTIFICATIONS_ENABLED",
      "CUBIC_VOLUME_NOTIFICATIONS_ENABLED",
      "CUBIC_VOLUME_THRESHOLD_KG",
    ],
    "Cleanup Configuration": [
      "NOTIFICATION_RETENTION_DAYS",
      "NOTIFICATION_CLEANUP_INTERVAL_HOURS",
    ],
    "Google OAuth Configuration": [
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_SECRET",
      "GOOGLE_CALLBACK_URL",
    ],
    "Frontend Configuration": [
      "FRONTEND_URL",
    ],
  };

  for (const [category, keys] of Object.entries(categories)) {
    content += `\n# ${category}\n`;

    for (const key of keys) {
      const schema = envSchema[key];
      if (schema) {
        content += `# ${schema.description}\n`;

        if (schema.allowedValues) {
          content += `# Allowed values: ${schema.allowedValues.join(", ")}\n`;
        }

        if (schema.requiredIf) {
          content += `# Required when: ${JSON.stringify(schema.requiredIf)}\n`;
        }

        const defaultValue = schema.default !== undefined ? schema.default : "";
        const isRequired = schema.required ? "" : "# ";

        content += `${isRequired}${key}=${defaultValue}\n\n`;
      }
    }
  }

  // Write to file if filename provided
  if (filename) {
    const filePath = path.join(process.cwd(), filename);
    await fs.promises.writeFile(filePath, content, "utf8");
    console.log(`📝 Environment template generated: ${filePath}`);
  }

  return content;
};

/**
 * Load and validate environment on startup
 */
export const initializeEnvironment = () => {
  console.log("🔧 Validating environment configuration...");

  const validation = validateEnvironment();

  if (validation.errors.length > 0) {
    console.error("❌ Environment validation errors:");
    validation.errors.forEach((error) => console.error(`   - ${error}`));

    if (process.env.NODE_ENV === "production") {
      console.error(
        "🚨 Environment validation failed in production. Exiting..."
      );
      process.exit(1);
    } else {
      console.warn("⚠️  Continuing in development mode despite errors...");
    }
  }

  if (validation.warnings.length > 0) {
    console.warn("⚠️  Environment validation warnings:");
    validation.warnings.forEach((warning) => console.warn(`   - ${warning}`));
  }

  if (validation.errors.length === 0) {
    console.log("✅ Environment validation passed");
  }

  return validation;
};

export default {
  validateEnvironment,
  generateEnvTemplate,
  initializeEnvironment,
  envSchema,
};
