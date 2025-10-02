import fs from "fs/promises";
import path from "path";
import { notificationConfig } from "../config/notification.js";

/**
 * Email Template Validator
 * Validates email templates for required placeholders and structure
 */
class EmailTemplateValidator {
  constructor() {
    this.templateDir = notificationConfig.email.templates.dir;
    this.requiredPlaceholders = [
      "{{title}}",
      "{{message}}",
      "{{date}}",
      "{{companyName}}",
      "{{supportEmail}}",
      "{{year}}",
    ];
  }

  /**
   * Validate all email templates
   * @returns {Promise<Object>} Validation results
   */
  async validateAllTemplates() {
    const results = {
      isValid: true,
      templates: {},
      errors: [],
      warnings: [],
    };

    try {
      const files = await fs.readdir(this.templateDir);
      const htmlFiles = files.filter((file) => file.endsWith(".html"));

      for (const file of htmlFiles) {
        const templateName = path.basename(file, ".html");
        const validation = await this.validateTemplate(templateName);
        results.templates[templateName] = validation;

        if (!validation.isValid) {
          results.isValid = false;
          results.errors.push(
            ...validation.errors.map((err) => `${templateName}: ${err}`)
          );
        }

        if (validation.warnings.length > 0) {
          results.warnings.push(
            ...validation.warnings.map((warn) => `${templateName}: ${warn}`)
          );
        }
      }

      // Check for missing templates
      const expectedTemplates = Object.values(notificationConfig.types);
      for (const templateType of expectedTemplates) {
        if (!results.templates[templateType]) {
          results.warnings.push(
            `Missing template for notification type: ${templateType}`
          );
        }
      }
    } catch (error) {
      results.isValid = false;
      results.errors.push(
        `Failed to read template directory: ${error.message}`
      );
    }

    return results;
  }

  /**
   * Validate a specific email template
   * @param {string} templateName - Template name (without .html extension)
   * @returns {Promise<Object>} Validation result
   */
  async validateTemplate(templateName) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      placeholders: {
        found: [],
        missing: [],
        unused: [],
      },
    };

    try {
      const templatePath = path.join(this.templateDir, `${templateName}.html`);
      const content = await fs.readFile(templatePath, "utf8");

      // Check for required placeholders
      for (const placeholder of this.requiredPlaceholders) {
        if (content.includes(placeholder)) {
          result.placeholders.found.push(placeholder);
        } else {
          result.placeholders.missing.push(placeholder);
          result.errors.push(`Missing required placeholder: ${placeholder}`);
          result.isValid = false;
        }
      }

      // Check for HTML structure
      if (!content.includes("<!DOCTYPE html>")) {
        result.warnings.push("Missing DOCTYPE declaration");
      }

      if (!content.includes("<html")) {
        result.errors.push("Missing HTML tag");
        result.isValid = false;
      }

      if (!content.includes("<head>")) {
        result.errors.push("Missing HEAD section");
        result.isValid = false;
      }

      if (!content.includes("<body>")) {
        result.errors.push("Missing BODY section");
        result.isValid = false;
      }

      // Check for responsive design
      if (!content.includes("viewport")) {
        result.warnings.push(
          "Missing viewport meta tag for mobile responsiveness"
        );
      }

      // Check for accessibility
      if (!content.includes("alt=") && content.includes("<img")) {
        result.warnings.push("Images without alt attributes detected");
      }

      // Find all placeholders in template
      const placeholderRegex = /\{\{[^}]+\}\}/g;
      const foundPlaceholders = content.match(placeholderRegex) || [];
      const uniquePlaceholders = [...new Set(foundPlaceholders)];

      // Check for unused template-specific placeholders
      const templateSpecificPlaceholders =
        this.getTemplateSpecificPlaceholders(templateName);
      for (const placeholder of templateSpecificPlaceholders) {
        if (!uniquePlaceholders.includes(placeholder)) {
          result.placeholders.unused.push(placeholder);
          result.warnings.push(
            `Template-specific placeholder not used: ${placeholder}`
          );
        }
      }

      // Check for invalid placeholders (should only contain letters, numbers, dots, and underscores)
      for (const placeholder of uniquePlaceholders) {
        const cleanPlaceholder = placeholder.replace(/^\{\{|\}\}$/g, "");
        if (!/^[a-zA-Z0-9._]+$/.test(cleanPlaceholder)) {
          result.errors.push(`Invalid placeholder format: ${placeholder}`);
          result.isValid = false;
        }
      }
    } catch (error) {
      result.isValid = false;
      result.errors.push(`Failed to read template file: ${error.message}`);
    }

    return result;
  }

  /**
   * Get template-specific placeholders based on notification type
   * @param {string} templateName - Template name
   * @returns {Array} Array of expected placeholders
   */
  getTemplateSpecificPlaceholders(templateName) {
    const templatePlaceholders = {
      low_stock: [
        "{{metadata.productName}}",
        "{{metadata.currentQuantity}}",
        "{{metadata.threshold}}",
        "{{metadata.actionUrl}}",
      ],
      new_order: [
        "{{metadata.orderNumber}}",
        "{{metadata.totalAmount}}",
        "{{metadata.itemCount}}",
        "{{metadata.actionUrl}}",
      ],
      cubic_volume_alert: [
        "{{metadata.productName}}",
        "{{metadata.cubicWeight}}",
        "{{metadata.thresholdKg}}",
        "{{metadata.dimensions}}",
        "{{metadata.vendorName}}",
        "{{metadata.vendorEmail}}",
        "{{metadata.actionUrl}}",
      ],
      system_alert: [
        "{{metadata.alertType}}",
        "{{metadata.priority}}",
        "{{metadata.component}}",
        "{{metadata.actionUrl}}",
      ],
      commission_update: [
        "{{metadata.vendorName}}",
        "{{metadata.amount}}",
        "{{metadata.status}}",
        "{{metadata.period}}",
        "{{metadata.actionUrl}}",
      ],
    };

    return templatePlaceholders[templateName] || [];
  }

  /**
   * Test email template rendering with sample data
   * @param {string} templateName - Template name
   * @param {Object} sampleData - Sample notification data
   * @returns {Promise<Object>} Rendering test result
   */
  async testTemplateRendering(templateName, sampleData = null) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      renderedContent: null,
    };

    try {
      const templatePath = path.join(this.templateDir, `${templateName}.html`);
      let content = await fs.readFile(templatePath, "utf8");

      // Use sample data or generate default sample data
      const testData = sampleData || this.generateSampleData(templateName);

      // Replace placeholders with test data
      content = this.replacePlaceholders(content, testData);

      // Check for unreplaced placeholders
      const unreplacedPlaceholders = content.match(/\{\{[^}]+\}\}/g);
      if (unreplacedPlaceholders) {
        result.warnings.push(
          `Unreplaced placeholders found: ${unreplacedPlaceholders.join(", ")}`
        );
      }

      result.renderedContent = content;
    } catch (error) {
      result.isValid = false;
      result.errors.push(`Template rendering failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Generate sample data for template testing
   * @param {string} templateName - Template name
   * @returns {Object} Sample notification data
   */
  generateSampleData(templateName) {
    const baseData = {
      title: "Test Notification",
      message: "This is a test notification message.",
      date: new Date().toLocaleString(),
      companyName: "Product Ecosystem Test",
      supportEmail: "support@test.com",
      year: new Date().getFullYear().toString(),
    };

    const templateSpecificData = {
      low_stock: {
        metadata: {
          productName: "Test Product",
          currentQuantity: "5",
          threshold: "10",
          actionUrl: "https://example.com/products",
        },
      },
      new_order: {
        metadata: {
          orderNumber: "ORD-12345",
          totalAmount: "99.99",
          itemCount: "3",
          actionUrl: "https://example.com/orders",
        },
      },
      cubic_volume_alert: {
        metadata: {
          productName: "Large Test Product",
          cubicWeight: "35.5",
          thresholdKg: "32",
          dimensions: "50cm × 40cm × 30cm",
          vendorName: "Test Vendor",
          vendorEmail: "vendor@test.com",
          actionUrl: "https://example.com/products",
        },
      },
      system_alert: {
        metadata: {
          alertType: "Database Connection",
          priority: "high",
          component: "User Authentication",
          actionUrl: "https://example.com/admin",
        },
      },
      commission_update: {
        metadata: {
          vendorName: "Test Vendor",
          amount: "150.00",
          status: "paid",
          period: "November 2024",
          actionUrl: "https://example.com/commissions",
        },
      },
    };

    return {
      ...baseData,
      ...templateSpecificData[templateName],
    };
  }

  /**
   * Replace placeholders in template content
   * @param {string} content - Template content
   * @param {Object} data - Replacement data
   * @returns {string} Content with placeholders replaced
   */
  replacePlaceholders(content, data) {
    let processedContent = content;

    // Simple placeholder replacement
    const replacements = {
      "{{title}}": data.title || "",
      "{{message}}": data.message || "",
      "{{date}}": data.date || "",
      "{{companyName}}": data.companyName || "",
      "{{supportEmail}}": data.supportEmail || "",
      "{{year}}": data.year || "",
    };

    // Add metadata replacements
    if (data.metadata) {
      Object.entries(data.metadata).forEach(([key, value]) => {
        replacements[`{{metadata.${key}}}`] = value || "";
      });
    }

    // Replace all placeholders
    Object.entries(replacements).forEach(([placeholder, value]) => {
      processedContent = processedContent.replace(
        new RegExp(placeholder, "g"),
        value
      );
    });

    return processedContent;
  }

  /**
   * Generate validation report
   * @returns {Promise<string>} HTML validation report
   */
  async generateValidationReport() {
    const results = await this.validateAllTemplates();

    let report = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Email Template Validation Report</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { background: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
            .success { color: #28a745; }
            .warning { color: #ffc107; }
            .error { color: #dc3545; }
            .template { margin: 20px 0; padding: 15px; border: 1px solid #dee2e6; border-radius: 5px; }
            .template h3 { margin-top: 0; }
            ul { margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Email Template Validation Report</h1>
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <p class="${results.isValid ? "success" : "error"}">
                Overall Status: ${results.isValid ? "✅ VALID" : "❌ INVALID"}
            </p>
        </div>
    `;

    if (results.errors.length > 0) {
      report += `
        <div class="error">
            <h2>❌ Errors</h2>
            <ul>
                ${results.errors.map((error) => `<li>${error}</li>`).join("")}
            </ul>
        </div>
      `;
    }

    if (results.warnings.length > 0) {
      report += `
        <div class="warning">
            <h2>⚠️ Warnings</h2>
            <ul>
                ${results.warnings
                  .map((warning) => `<li>${warning}</li>`)
                  .join("")}
            </ul>
        </div>
      `;
    }

    report += "<h2>Template Details</h2>";

    Object.entries(results.templates).forEach(([templateName, validation]) => {
      report += `
        <div class="template">
            <h3>${templateName} ${validation.isValid ? "✅" : "❌"}</h3>
            ${
              validation.errors.length > 0
                ? `
                <div class="error">
                    <strong>Errors:</strong>
                    <ul>${validation.errors
                      .map((error) => `<li>${error}</li>`)
                      .join("")}</ul>
                </div>
            `
                : ""
            }
            ${
              validation.warnings.length > 0
                ? `
                <div class="warning">
                    <strong>Warnings:</strong>
                    <ul>${validation.warnings
                      .map((warning) => `<li>${warning}</li>`)
                      .join("")}</ul>
                </div>
            `
                : ""
            }
            <div>
                <strong>Placeholders Found:</strong> ${
                  validation.placeholders.found.length
                }
                <br>
                <strong>Missing Placeholders:</strong> ${
                  validation.placeholders.missing.length
                }
            </div>
        </div>
      `;
    });

    report += "</body></html>";
    return report;
  }
}

// Export singleton instance
export const emailTemplateValidator = new EmailTemplateValidator();
export default emailTemplateValidator;
