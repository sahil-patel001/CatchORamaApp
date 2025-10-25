import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Notification system configuration
 * Centralizes all notification-related settings
 */
export const notificationConfig = {
  // General notification settings
  enabled: process.env.NOTIFICATIONS_ENABLED === "true" || true,

  // WebSocket configuration
  websocket: {
    enabled: process.env.WEBSOCKET_NOTIFICATIONS_ENABLED === "true" || true,
    port: parseInt(process.env.WEBSOCKET_PORT) || 5001,
    corsOrigins: process.env.WEBSOCKET_CORS_ORIGINS?.split(",") || [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://catchorama.com"
    ],
    pingTimeout: parseInt(process.env.WEBSOCKET_PING_TIMEOUT) || 60000,
    pingInterval: parseInt(process.env.WEBSOCKET_PING_INTERVAL) || 25000,
  },

  // Email configuration
  email: {
    enabled: process.env.EMAIL_NOTIFICATIONS_ENABLED === "true" || true,
    service: process.env.EMAIL_SERVICE || "nodemailer", // nodemailer, sendgrid, aws-ses

    // NodeMailer configuration
    nodemailer: {
      host: process.env.NODEMAILER_HOST || "smtp.gmail.com",
      port: parseInt(process.env.NODEMAILER_PORT) || 587,
      secure: process.env.NODEMAILER_SECURE === "true" || false,
      auth: {
        user: process.env.NODEMAILER_USER,
        pass: process.env.NODEMAILER_PASS,
      },
      from: {
        name: process.env.NODEMAILER_FROM_NAME || "Product Ecosystem",
        email: process.env.NODEMAILER_FROM_EMAIL,
      },
    },

    // SendGrid configuration
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY,
      from: {
        name: process.env.SENDGRID_FROM_NAME || "Product Ecosystem",
        email: process.env.SENDGRID_FROM_EMAIL,
      },
    },

    // AWS SES configuration
    awsSes: {
      region: process.env.AWS_SES_REGION || "us-east-1",
      accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY,
      from: {
        name: process.env.AWS_SES_FROM_NAME || "Product Ecosystem",
        email: process.env.AWS_SES_FROM_EMAIL,
      },
    },

    // Email template settings
    templates: {
      dir: process.env.EMAIL_TEMPLATE_DIR || "./templates/emails",
      logoUrl: process.env.EMAIL_LOGO_URL || "",
      companyName: process.env.EMAIL_COMPANY_NAME || "Product Ecosystem",
      supportEmail: process.env.EMAIL_SUPPORT_EMAIL || "support@yourdomain.com",
      companyAddress: process.env.EMAIL_COMPANY_ADDRESS || "",
    },
  },

  // Notification triggers configuration
  triggers: {
    lowStock: {
      enabled: process.env.LOW_STOCK_NOTIFICATIONS_ENABLED === "true" || true,
    },
    newOrder: {
      enabled: process.env.NEW_ORDER_NOTIFICATIONS_ENABLED === "true" || true,
    },
    cubicVolume: {
      enabled:
        process.env.CUBIC_VOLUME_NOTIFICATIONS_ENABLED === "true" || true,
      thresholdKg: parseFloat(process.env.CUBIC_VOLUME_THRESHOLD_KG) || 32, // 32kg threshold with new formula (÷2500)
    },
  },

  // Database cleanup configuration
  cleanup: {
    retentionDays: parseInt(process.env.NOTIFICATION_RETENTION_DAYS) || 90,
    intervalHours:
      parseInt(process.env.NOTIFICATION_CLEANUP_INTERVAL_HOURS) || 24,
  },

  // Notification types
  types: {
    LOW_STOCK: "low_stock",
    NEW_ORDER: "new_order",
    CUBIC_VOLUME_ALERT: "cubic_volume_alert",
    SYSTEM_ALERT: "system_alert",
    COMMISSION_UPDATE: "commission_update",
    PRODUCT_ARCHIVED: "product_archived",
    VENDOR_STATUS_CHANGE: "vendor_status_change",
  },

  // User roles for notifications
  roles: {
    SUPER_ADMIN: "super_admin",
    VENDOR: "vendor",
  },
};

/**
 * Validate notification configuration
 * Ensures required environment variables are set
 */
export const validateNotificationConfig = () => {
  const errors = [];

  if (notificationConfig.enabled) {
    // Validate email configuration
    if (notificationConfig.email.enabled) {
      const emailService = notificationConfig.email.service;

      switch (emailService) {
        case "nodemailer":
          if (!process.env.NODEMAILER_USER || !process.env.NODEMAILER_PASS) {
            errors.push(
              "NodeMailer requires NODEMAILER_USER and NODEMAILER_PASS environment variables"
            );
          }
          break;
        case "sendgrid":
          if (
            !process.env.SENDGRID_API_KEY ||
            !process.env.SENDGRID_FROM_EMAIL
          ) {
            errors.push(
              "SendGrid requires SENDGRID_API_KEY and SENDGRID_FROM_EMAIL environment variables"
            );
          }
          break;
        case "aws-ses":
          if (
            !process.env.AWS_SES_ACCESS_KEY_ID ||
            !process.env.AWS_SES_SECRET_ACCESS_KEY ||
            !process.env.AWS_SES_FROM_EMAIL
          ) {
            errors.push(
              "AWS SES requires AWS_SES_ACCESS_KEY_ID, AWS_SES_SECRET_ACCESS_KEY, and AWS_SES_FROM_EMAIL environment variables"
            );
          }
          break;
        default:
          errors.push(
            `Unknown email service: ${emailService}. Supported services: nodemailer, sendgrid, aws-ses`
          );
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export default notificationConfig;
