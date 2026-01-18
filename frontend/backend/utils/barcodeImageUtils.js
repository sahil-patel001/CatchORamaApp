import JsBarcode from "jsbarcode";
import { createCanvas } from "canvas";
import fs from "fs/promises";
import path from "path";

/**
 * Generate barcode image as buffer
 * @param {string} barcodeText - The barcode text to encode
 * @param {Object} options - Image generation options
 * @returns {Buffer} PNG image buffer
 */
export const generateBarcodeImage = (barcodeText, options = {}) => {
  const {
    width = 3, // Increased from 2 for thicker bars
    height = 120, // Increased from 100 for better proportion
    displayValue = true,
    font = "Arial Black", // Changed to Arial Black for better readability
    fontSize = 24, // Increased from 20 for better print readability
    textAlign = "center",
    textPosition = "bottom",
    textMargin = 8, // Increased from 2 for better spacing
    fontOptions = "bold", // Added bold for better print quality
    background = "#ffffff",
    lineColor = "#000000",
    margin = 15, // Increased from 10 for better margins
    marginTop = undefined,
    marginBottom = undefined,
    marginLeft = undefined,
    marginRight = undefined,
    format = "CODE128", // Default barcode format
  } = options;

  // Create canvas
  const canvas = createCanvas(400, 200); // Initial size, will be adjusted
  const ctx = canvas.getContext("2d");

  try {
    // Generate barcode on canvas
    JsBarcode(canvas, barcodeText, {
      format,
      width,
      height,
      displayValue,
      font,
      fontSize,
      textAlign,
      textPosition,
      textMargin,
      fontOptions,
      background,
      lineColor,
      margin,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
    });

    // Return PNG buffer
    return canvas.toBuffer("image/png");
  } catch (error) {
    throw new Error(`Failed to generate barcode image: ${error.message}`);
  }
};

/**
 * Generate barcode image as base64 data URL
 * @param {string} barcodeText - The barcode text to encode
 * @param {Object} options - Image generation options
 * @returns {string} Base64 data URL
 */
export const generateBarcodeDataURL = (barcodeText, options = {}) => {
  const buffer = generateBarcodeImage(barcodeText, options);
  return `data:image/png;base64,${buffer.toString("base64")}`;
};

/**
 * Save barcode image to file
 * @param {string} barcodeText - The barcode text to encode
 * @param {string} filePath - Path where to save the image
 * @param {Object} options - Image generation options
 * @returns {Promise<string>} Saved file path
 */
export const saveBarcodeImage = async (barcodeText, filePath, options = {}) => {
  try {
    const buffer = generateBarcodeImage(barcodeText, options);

    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    // Write file
    await fs.writeFile(filePath, buffer);

    return filePath;
  } catch (error) {
    throw new Error(`Failed to save barcode image: ${error.message}`);
  }
};

/**
 * Generate barcode image with product-specific styling
 * @param {string} barcodeText - The barcode text to encode
 * @param {Object} productInfo - Product information for styling
 * @param {Object} customOptions - Custom styling options
 * @returns {Buffer} PNG image buffer
 */
export const generateProductBarcodeImage = (
  barcodeText,
  productInfo = {},
  customOptions = {}
) => {
  const {
    productName = "",
    vendorName = "",
    price = "",
    showProductInfo = true,
  } = productInfo;

  const defaultOptions = {
    width: 3, // Increased from 2 for thicker bars
    height: 100, // Increased from 80 for better proportion
    displayValue: true,
    font: "Arial Black", // Changed to Arial Black for better readability
    fontSize: 18, // Increased from 14 for better print readability
    textAlign: "center",
    textPosition: "bottom",
    textMargin: 10, // Increased from 5 for better spacing
    fontOptions: "bold", // Added bold for better print quality
    background: "#ffffff",
    lineColor: "#000000",
    margin: 20, // Increased from 15 for better margins
    marginTop: showProductInfo ? 40 : 20, // Increased for better spacing
    marginBottom: 25, // Increased from 20 for better spacing
    format: "CODE128",
  };

  const options = { ...defaultOptions, ...customOptions };

  // Create canvas with higher resolution for better print quality
  const canvas = createCanvas(600, showProductInfo ? 280 : 200); // Increased resolution
  const ctx = canvas.getContext("2d");

  try {
    // Fill background
    ctx.fillStyle = options.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add product information at the top if enabled
    if (showProductInfo && (productName || vendorName)) {
      ctx.fillStyle = options.lineColor;
      ctx.textAlign = "center";

      let yPos = 25; // Increased from 20 for better spacing

      if (vendorName) {
        // Vendor name with smaller, bold font
        ctx.font = `bold ${options.fontSize - 4}px Arial Black`;
        ctx.fillText(vendorName, canvas.width / 2, yPos);
        yPos += options.fontSize + 5; // Increased spacing
      }

      if (productName) {
        // Product name with larger, bold font for better readability
        ctx.font = `bold ${options.fontSize - 2}px Arial Black`;
        // Truncate product name if too long (adjusted for higher resolution)
        let displayName = productName;
        if (productName.length > 35) {
          // Increased from 30 due to higher resolution
          displayName = productName.substring(0, 32) + "...";
        }
        ctx.fillText(displayName, canvas.width / 2, yPos);
      }
    }

    // Generate barcode
    JsBarcode(canvas, barcodeText, options);

    return canvas.toBuffer("image/png");
  } catch (error) {
    throw new Error(
      `Failed to generate product barcode image: ${error.message}`
    );
  }
};

/**
 * Generate multiple barcode images for PDF printing
 * @param {Array} barcodeData - Array of barcode objects with text and info
 * @param {Object} options - Generation options
 * @returns {Array} Array of image buffers
 */
export const generateMultipleBarcodeImages = (barcodeData, options = {}) => {
  const images = [];

  for (const item of barcodeData) {
    const { barcodeText, productInfo = {}, customOptions = {} } = item;

    try {
      const imageBuffer = generateProductBarcodeImage(
        barcodeText,
        productInfo,
        { ...options, ...customOptions }
      );

      images.push({
        barcodeText,
        imageBuffer,
        productInfo,
      });
    } catch (error) {
      console.error(
        `Failed to generate barcode image for ${barcodeText}:`,
        error
      );
      // Continue with other barcodes even if one fails
    }
  }

  return images;
};

/**
 * Validate barcode text for image generation
 * @param {string} barcodeText - The barcode text to validate
 * @param {string} format - Barcode format (default: CODE128)
 * @returns {Object} Validation result
 */
export const validateBarcodeForImageGeneration = (
  barcodeText,
  format = "CODE128"
) => {
  const errors = [];

  if (!barcodeText || typeof barcodeText !== "string") {
    errors.push("Barcode text must be a non-empty string");
    return { isValid: false, errors };
  }

  // Validate based on format
  switch (format.toUpperCase()) {
    case "CODE128":
      // CODE128 can encode ASCII characters 0-127
      for (let i = 0; i < barcodeText.length; i++) {
        const charCode = barcodeText.charCodeAt(i);
        if (charCode > 127) {
          errors.push(
            `Invalid character at position ${i}: CODE128 only supports ASCII characters`
          );
        }
      }
      break;

    case "CODE39":
      // CODE39 supports: A-Z, 0-9, and some special characters
      const validChars = /^[A-Z0-9\-. $\/+%*]+$/;
      if (!validChars.test(barcodeText)) {
        errors.push(
          "CODE39 only supports: A-Z, 0-9, -, ., space, $, /, +, %, *"
        );
      }
      break;

    default:
      // For other formats, basic validation
      if (barcodeText.length === 0) {
        errors.push("Barcode text cannot be empty");
      }
  }

  // Check length limits
  if (barcodeText.length > 100) {
    errors.push("Barcode text is too long (max 100 characters)");
  }

  return {
    isValid: errors.length === 0,
    errors,
    format,
    length: barcodeText.length,
  };
};

/**
 * Get supported barcode formats
 * @returns {Array} Array of supported format objects
 */
export const getSupportedBarcodeFormats = () => {
  return [
    {
      name: "CODE128",
      description: "Most versatile, supports all ASCII characters",
      recommended: true,
    },
    {
      name: "CODE39",
      description: "Alphanumeric, widely supported",
      recommended: false,
    },
    {
      name: "EAN13",
      description: "13-digit European Article Number",
      recommended: false,
    },
    {
      name: "EAN8",
      description: "8-digit European Article Number",
      recommended: false,
    },
    {
      name: "UPC",
      description: "Universal Product Code",
      recommended: false,
    },
  ];
};

/**
 * Get default image generation options for different use cases
 * @param {string} useCase - Use case: 'product', 'inventory', 'shipping', 'small'
 * @returns {Object} Default options for the use case
 */
export const getDefaultImageOptions = (useCase = "product") => {
  const baseOptions = {
    format: "CODE128",
    background: "#ffffff",
    lineColor: "#000000",
    displayValue: true,
    font: "Arial",
    textAlign: "center",
    textPosition: "bottom",
  };

  switch (useCase.toLowerCase()) {
    case "product":
      return {
        ...baseOptions,
        width: 2,
        height: 80,
        fontSize: 14,
        margin: 15,
        textMargin: 5,
      };

    case "inventory":
      return {
        ...baseOptions,
        width: 1.5,
        height: 60,
        fontSize: 12,
        margin: 10,
        textMargin: 3,
      };

    case "shipping":
      return {
        ...baseOptions,
        width: 3,
        height: 100,
        fontSize: 16,
        margin: 20,
        textMargin: 8,
      };

    case "small":
      return {
        ...baseOptions,
        width: 1,
        height: 40,
        fontSize: 10,
        margin: 5,
        textMargin: 2,
      };

    default:
      return baseOptions;
  }
};
