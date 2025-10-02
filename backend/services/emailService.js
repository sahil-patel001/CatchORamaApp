import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { notificationConfig } from "../config/notification.js";
import fs from "fs/promises";
import path from "path";

/**
 * Email Service
 * Handles email notifications with support for multiple providers
 */
class EmailService {
  constructor() {
    this.config = notificationConfig.email;
    this.transporter = null;
    this.sesClient = null;
    this.initialized = false;
  }

  /**
   * Initialize email service based on configuration
   */
  async initialize() {
    if (this.initialized || !this.config.enabled) {
      return;
    }

    try {
      switch (this.config.service) {
        case "nodemailer":
          await this.initializeNodemailer();
          break;
        case "sendgrid":
          this.initializeSendGrid();
          break;
        case "aws-ses":
          await this.initializeAWSSES();
          break;
        default:
          throw new Error(`Unknown email service: ${this.config.service}`);
      }

      this.initialized = true;
      console.log(`📧 Email service initialized: ${this.config.service}`);
    } catch (error) {
      console.error("Failed to initialize email service:", error);
      throw error;
    }
  }

  /**
   * Initialize NodeMailer transporter
   */
  async initializeNodemailer() {
    this.transporter = nodemailer.createTransport({
      host: this.config.nodemailer.host,
      port: this.config.nodemailer.port,
      secure: this.config.nodemailer.secure,
      auth: {
        user: this.config.nodemailer.auth.user,
        pass: this.config.nodemailer.auth.pass,
      },
    });

    // Verify connection
    await this.transporter.verify();
  }

  /**
   * Initialize SendGrid
   */
  initializeSendGrid() {
    sgMail.setApiKey(this.config.sendgrid.apiKey);
  }

  /**
   * Initialize AWS SES client
   */
  async initializeAWSSES() {
    const sesConfig = {
      region: this.config.awsSes.region,
    };

    // Add credentials if provided
    if (this.config.awsSes.accessKeyId && this.config.awsSes.secretAccessKey) {
      sesConfig.credentials = {
        accessKeyId: this.config.awsSes.accessKeyId,
        secretAccessKey: this.config.awsSes.secretAccessKey,
      };
    }

    this.sesClient = new SESClient(sesConfig);

    // Test the connection by attempting to get send quota
    try {
      const { GetSendQuotaCommand } = await import("@aws-sdk/client-ses");
      const command = new GetSendQuotaCommand({});
      await this.sesClient.send(command);
    } catch (error) {
      console.warn("AWS SES connection test failed:", error.message);
      // Don't throw here as credentials might be valid but permissions limited
    }
  }

  /**
   * Send notification email to user
   * @param {string} userId - User ID
   * @param {Object} notification - Notification object
   * @returns {Promise<Object>} Send result
   */
  async sendNotificationEmail(userId, notification) {
    try {
      if (!this.config.enabled) {
        console.log("📧 Email notifications disabled, skipping email");
        return { success: false, reason: "Email notifications disabled" };
      }

      await this.initialize();

      // Get user email
      const userEmail = await this.getUserEmail(userId);
      if (!userEmail) {
        console.warn(`No email found for user ${userId}`);
        return { success: false, reason: "No email address found" };
      }

      // Generate email content
      const emailContent = await this.generateEmailContent(notification);

      // Send email based on service
      let result;
      switch (this.config.service) {
        case "nodemailer":
          result = await this.sendWithNodemailer(userEmail, emailContent);
          break;
        case "sendgrid":
          result = await this.sendWithSendGrid(userEmail, emailContent);
          break;
        case "aws-ses":
          result = await this.sendWithAWSSES(userEmail, emailContent);
          break;
        default:
          throw new Error(`Unknown email service: ${this.config.service}`);
      }

      console.log(
        `📧 Email sent to ${userEmail} for notification ${notification._id}`
      );
      return result;
    } catch (error) {
      console.error("Error sending notification email:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user email by ID
   * @param {string} userId - User ID
   * @returns {Promise<string>} User email
   */
  async getUserEmail(userId) {
    try {
      // Import here to avoid circular dependency
      const User = (await import("../models/User.js")).default;
      const Vendor = (await import("../models/Vendor.js")).default;

      // Try to find user in User collection first
      let user = await User.findById(userId).select("email");

      // If not found, try Vendor collection
      if (!user) {
        user = await Vendor.findById(userId).select("email");
      }

      return user?.email || null;
    } catch (error) {
      console.error("Error fetching user email:", error);
      return null;
    }
  }

  /**
   * Generate email content from notification
   * @param {Object} notification - Notification object
   * @returns {Promise<Object>} Email content
   */
  async generateEmailContent(notification) {
    try {
      // Try to load custom template if available
      const templatePath = path.join(
        this.config.templates.dir,
        `${notification.type}.html`
      );

      let htmlContent;
      try {
        const template = await fs.readFile(templatePath, "utf8");
        htmlContent = this.replaceTemplatePlaceholders(template, notification);
      } catch (templateError) {
        // Fall back to default template
        htmlContent = this.generateDefaultEmailHTML(notification);
      }

      return {
        subject: this.generateEmailSubject(notification),
        html: htmlContent,
        text: this.stripHtmlTags(htmlContent),
      };
    } catch (error) {
      console.error("Error generating email content:", error);
      throw error;
    }
  }

  /**
   * Generate email subject from notification
   * @param {Object} notification - Notification object
   * @returns {string} Email subject
   */
  generateEmailSubject(notification) {
    const companyName = this.config.templates.companyName;
    return `[${companyName}] ${notification.title}`;
  }

  /**
   * Generate default HTML email template
   * @param {Object} notification - Notification object
   * @returns {string} HTML content
   */
  generateDefaultEmailHTML(notification) {
    const { companyName, logoUrl, supportEmail, companyAddress } =
      this.config.templates;
    const currentYear = new Date().getFullYear();

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${notification.title}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #f0f0f0; }
        .logo { max-width: 200px; height: auto; }
        .content { padding: 30px 0; }
        .notification-type { background: #f8f9fa; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
        .footer { border-top: 1px solid #eee; padding: 20px 0; text-align: center; font-size: 12px; color: #666; }
        .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            ${
              logoUrl
                ? `<img src="${logoUrl}" alt="${companyName}" class="logo">`
                : `<h1>${companyName}</h1>`
            }
        </div>
        
        <div class="content">
            <div class="notification-type">
                <strong>Notification Type:</strong> ${this.formatNotificationType(
                  notification.type
                )}
            </div>
            
            <h2>${notification.title}</h2>
            <p>${notification.message}</p>
            
            ${
              notification.metadata?.actionUrl
                ? `<a href="${notification.metadata.actionUrl}" class="button">View Details</a>`
                : ""
            }
            
            <p><em>Received on: ${new Date(
              notification.createdAt
            ).toLocaleString()}</em></p>
        </div>
        
        <div class="footer">
            <p>© ${currentYear} ${companyName}. All rights reserved.</p>
            <p>
                Need help? Contact us at <a href="mailto:${supportEmail}">${supportEmail}</a>
            </p>
            ${companyAddress ? `<p>${companyAddress}</p>` : ""}
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Format notification type for display
   * @param {string} type - Notification type
   * @returns {string} Formatted type
   */
  formatNotificationType(type) {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  /**
   * Replace template placeholders
   * @param {string} template - HTML template
   * @param {Object} notification - Notification object
   * @returns {string} Processed template
   */
  replaceTemplatePlaceholders(template, notification) {
    const replacements = {
      "{{title}}": notification.title,
      "{{message}}": notification.message,
      "{{type}}": this.formatNotificationType(notification.type),
      "{{date}}": new Date(notification.createdAt).toLocaleString(),
      "{{companyName}}": this.config.templates.companyName,
      "{{logoUrl}}": this.config.templates.logoUrl,
      "{{supportEmail}}": this.config.templates.supportEmail,
      "{{companyAddress}}": this.config.templates.companyAddress,
      "{{year}}": new Date().getFullYear().toString(),
    };

    let processedTemplate = template;
    Object.entries(replacements).forEach(([placeholder, value]) => {
      processedTemplate = processedTemplate.replace(
        new RegExp(placeholder, "g"),
        value || ""
      );
    });

    return processedTemplate;
  }

  /**
   * Strip HTML tags for plain text version
   * @param {string} html - HTML content
   * @returns {string} Plain text
   */
  stripHtmlTags(html) {
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Send email using NodeMailer
   * @param {string} email - Recipient email
   * @param {Object} content - Email content
   * @returns {Promise<Object>} Send result
   */
  async sendWithNodemailer(email, content) {
    const mailOptions = {
      from: `${this.config.nodemailer.from.name} <${this.config.nodemailer.from.email}>`,
      to: email,
      subject: content.subject,
      html: content.html,
      text: content.text,
    };

    const result = await this.transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  }

  /**
   * Send email using SendGrid
   * @param {string} email - Recipient email
   * @param {Object} content - Email content
   * @returns {Promise<Object>} Send result
   */
  async sendWithSendGrid(email, content) {
    const msg = {
      to: email,
      from: {
        email: this.config.sendgrid.from.email,
        name: this.config.sendgrid.from.name,
      },
      subject: content.subject,
      html: content.html,
      text: content.text,
    };

    const result = await sgMail.send(msg);
    return { success: true, messageId: result[0].headers["x-message-id"] };
  }

  /**
   * Send email using AWS SES
   * @param {string} email - Recipient email
   * @param {Object} content - Email content
   * @returns {Promise<Object>} Send result
   */
  async sendWithAWSSES(email, content) {
    const params = {
      Source: `${this.config.awsSes.from.name} <${this.config.awsSes.from.email}>`,
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Subject: {
          Data: content.subject,
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: content.html,
            Charset: "UTF-8",
          },
          Text: {
            Data: content.text,
            Charset: "UTF-8",
          },
        },
      },
    };

    const command = new SendEmailCommand(params);
    const result = await this.sesClient.send(command);

    return {
      success: true,
      messageId: result.MessageId,
      sesMessageId: result.MessageId,
    };
  }

  /**
   * Send bulk emails
   * @param {Array} emails - Array of email addresses
   * @param {Object} content - Email content
   * @returns {Promise<Array>} Send results
   */
  async sendBulkEmails(emails, content) {
    const results = [];

    for (const email of emails) {
      try {
        const result = await this.sendEmail(email, content);
        results.push({ email, ...result });
      } catch (error) {
        results.push({ email, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Send custom email (not notification-based)
   * @param {string} email - Recipient email
   * @param {Object} content - Email content
   * @returns {Promise<Object>} Send result
   */
  async sendEmail(email, content) {
    try {
      await this.initialize();

      switch (this.config.service) {
        case "nodemailer":
          return await this.sendWithNodemailer(email, content);
        case "sendgrid":
          return await this.sendWithSendGrid(email, content);
        case "aws-ses":
          return await this.sendWithAWSSES(email, content);
        default:
          throw new Error(`Unknown email service: ${this.config.service}`);
      }
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
export default emailService;
