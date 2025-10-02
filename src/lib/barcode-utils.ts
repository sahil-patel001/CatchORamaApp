import JsBarcode from "jsbarcode";
import { Product } from "@/types";

/**
 * Barcode generation and validation utilities for frontend
 */

export interface BarcodeData {
  text: string;
  productName: string;
  vendorName: string;
  price: number;
  productId: string;
}

export interface BarcodeImageOptions {
  width?: number;
  height?: number;
  displayValue?: boolean;
  font?: string;
  fontSize?: number;
  textAlign?: "left" | "center" | "right";
  textPosition?: "top" | "bottom";
  textMargin?: number;
  background?: string;
  lineColor?: string;
  margin?: number;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  format?: string;
}

/**
 * Generate barcode text following the 32-character format
 * Format: {VendorPrefix}-{ProductName}-${Price}
 * @param product - Product data
 * @param vendorPrefix - Vendor prefix (uses stored vendorPrefix from product.vendor)
 * @returns Formatted barcode text
 */
export function generateBarcodeText(
  product: Product,
  vendorPrefix?: string
): string {
  // Use the stored vendor prefix directly
  const vendorPrefixFromProduct =
    product.vendor && "vendorPrefix" in product.vendor
      ? (product.vendor.vendorPrefix as string)
      : null;
  const prefix = vendorPrefix || vendorPrefixFromProduct || "VD01"; // Default fallback

  // Format price with $ symbol at the beginning
  const price = "$" + (product.discountPrice || product.price).toFixed(2);

  // Calculate remaining space for product name
  const prefixPart = `${prefix}-`;
  const pricePart = `-${price}`;
  const maxProductNameLength = 32 - prefixPart.length - pricePart.length;

  // Truncate product name from the end if necessary
  let productName = product.name;
  if (productName.length > maxProductNameLength) {
    productName = productName.substring(0, maxProductNameLength);
  }

  // Construct final barcode text
  const barcodeText = `${prefix}-${productName}-${price}`;

  // Ensure it doesn't exceed 32 characters (safety check)
  if (barcodeText.length > 32) {
    // If still too long, truncate product name further
    const availableLength = 32 - prefix.length - price.length - 2; // 2 for the hyphens
    const truncatedName = productName.substring(
      0,
      Math.max(1, availableLength)
    );
    return `${prefix}-${truncatedName}-${price}`;
  }

  return barcodeText;
}

/**
 * Validate barcode format
 * @param barcodeText - Barcode text to validate
 * @returns Validation result with details
 */
export function validateBarcodeFormat(barcodeText: string): {
  isValid: boolean;
  errors: string[];
  length: number;
} {
  const errors: string[] = [];

  // Check length
  if (barcodeText.length > 32) {
    errors.push(
      `Barcode length ${barcodeText.length} exceeds maximum of 32 characters`
    );
  }

  if (barcodeText.length < 5) {
    errors.push(
      `Barcode length ${barcodeText.length} is too short (minimum 5 characters)`
    );
  }

  // Check format pattern: should have at least 2 hyphens and end with price$
  const parts = barcodeText.split("-");
  if (parts.length < 3) {
    errors.push(
      "Barcode should follow format: {VendorPrefix}-{ProductName}-${Price}"
    );
  }

  // Check if ends with price format ($ followed by number)
  if (!barcodeText.match(/-\$\d+\.\d{2}$/)) {
    errors.push("Barcode should end with price in format: -$XX.XX");
  }

  // Check for invalid characters (only alphanumeric, hyphens, dots, and $ allowed)
  if (!barcodeText.match(/^[A-Za-z0-9\-.$]+$/)) {
    errors.push(
      "Barcode contains invalid characters (only letters, numbers, hyphens, dots, and $ allowed)"
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    length: barcodeText.length,
  };
}

/**
 * Generate barcode image as data URL using canvas
 * @param barcodeText - Barcode text to encode
 * @param options - Image generation options
 * @returns Promise resolving to data URL
 */
export function generateBarcodeImage(
  barcodeText: string,
  options: BarcodeImageOptions = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Create canvas element
    const canvas = document.createElement("canvas");

    const defaultOptions: BarcodeImageOptions = {
      width: 3, // Increased from 2 for thicker bars
      height: 100, // Increased from 80 for better proportion
      displayValue: true,
      font: "Arial Black", // Changed to Arial Black for better readability
      fontSize: 16, // Increased from 12 for better readability
      textAlign: "center",
      textPosition: "bottom",
      textMargin: 8, // Increased from 2 for better spacing
      // fontOptions: "bold", // fontOptions not supported by JsBarcode
      background: "#ffffff",
      lineColor: "#000000",
      margin: 15, // Increased from 10 for better margins
      format: "CODE128",
    };

    const finalOptions = { ...defaultOptions, ...options };

    try {
      // Generate barcode on canvas
      JsBarcode(canvas, barcodeText, finalOptions);

      // Convert canvas to data URL
      const dataUrl = canvas.toDataURL("image/png");
      resolve(dataUrl);
    } catch (error) {
      reject(new Error(`Failed to generate barcode image: ${error}`));
    }
  });
}

/**
 * Generate barcode image with product information
 * @param barcodeData - Barcode and product data
 * @param options - Image generation options
 * @returns Promise resolving to data URL
 */
export async function generateProductBarcodeImage(
  barcodeData: BarcodeData,
  options: BarcodeImageOptions & {
    showProductInfo?: boolean;
    showPrice?: boolean;
    showVendor?: boolean;
  } = {}
): Promise<string> {
  const {
    showProductInfo = true,
    showPrice = true,
    showVendor = false,
    ...imageOptions
  } = options;

  // Create canvas with extra space for product info
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  // Set canvas dimensions larger for better text rendering quality
  // Using higher resolution for better text clarity when scaled down
  const canvasWidth = 1000; // Increased width for better text rendering
  const canvasHeight = showProductInfo ? 500 : 400; // Increased height for better proportions
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  // Fill background
  ctx.fillStyle = imageOptions.background || "#ffffff";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Add product information at the top if enabled
  if (showProductInfo) {
    ctx.fillStyle = imageOptions.lineColor || "#000000";
    ctx.textAlign = "center";

    let yPos = 40; // Adjusted for larger canvas
    const fontSize = (imageOptions.fontSize || 12) + 10; // Further increased font size for better readability

    // Vendor name (smaller, optional)
    if (showVendor && barcodeData.vendorName) {
      ctx.font = `bold ${fontSize - 4}px Arial Black`;
      ctx.fillText(barcodeData.vendorName, canvasWidth / 2, yPos);
      yPos += fontSize;
    }

    // Product name (truncate if too long)
    if (barcodeData.productName) {
      ctx.font = `bold ${fontSize}px Arial Black`;
      let displayName = barcodeData.productName;
      // Increased character limit since we have more canvas width
      if (displayName.length > 50) {
        displayName = displayName.substring(0, 47) + "...";
      }
      ctx.fillText(displayName, canvasWidth / 2, yPos);
      yPos += fontSize + 6;
    }

    // Price (optional)
    if (showPrice) {
      ctx.font = `bold ${fontSize}px Arial Black`;
      ctx.fillText(`$${barcodeData.price.toFixed(2)}`, canvasWidth / 2, yPos);
    }
  }

  // Generate barcode with maximum text readability settings
  const barcodeOptions: BarcodeImageOptions = {
    width: 2, // Bar width
    height: 100, // Increased height for better barcode proportion
    displayValue: true,
    font: "Arial", // Clean, readable font
    fontSize: 36, // Increased by 2px for even better readability
    // fontOptions: "normal", // fontOptions not supported by JsBarcode
    textAlign: "center",
    textPosition: "bottom",
    textMargin: 20, // Increased margin for text spacing
    background: "transparent",
    lineColor: "#000000",
    margin: 30, // Increased margins for better spacing
    marginTop: showProductInfo ? 120 : 40, // More space for product info
    marginBottom: 50, // Much more space for text
    marginLeft: 30,
    marginRight: 30,
    format: "CODE128",
    ...imageOptions,
  };

  try {
    // Generate barcode on the same canvas
    JsBarcode(canvas, barcodeData.text, barcodeOptions);

    // Convert canvas to data URL
    return canvas.toDataURL("image/png");
  } catch (error) {
    throw new Error(`Failed to generate product barcode image: ${error}`);
  }
}

/**
 * Parse barcode text to extract components
 * @param barcodeText - Barcode text to parse
 * @returns Parsed components
 */
export function parseBarcodeText(barcodeText: string): {
  vendorPrefix: string;
  productName: string;
  price: string;
  priceValue: number;
} | null {
  try {
    // Split by hyphens
    const parts = barcodeText.split("-");
    if (parts.length < 3) return null;

    const vendorPrefix = parts[0];
    const pricePart = parts[parts.length - 1]; // Last part should be price
    const productName = parts.slice(1, -1).join("-"); // Middle parts form product name

    // Extract price value
    const priceMatch = pricePart.match(/(\d+\.\d{2})\$$/);
    if (!priceMatch) return null;

    const priceValue = parseFloat(priceMatch[1]);

    return {
      vendorPrefix,
      productName,
      price: pricePart,
      priceValue,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Generate multiple barcode data objects from products
 * @param products - Array of products with quantities
 * @returns Array of barcode data objects
 */
export function generateBarcodeDataFromProducts(
  products: Array<{ product: Product; quantity: number }>
): BarcodeData[] {
  const barcodeDataList: BarcodeData[] = [];

  products.forEach(({ product, quantity }) => {
    // Generate barcode text for this product
    const barcodeText = generateBarcodeText(product);

    // Create barcode data objects based on quantity
    for (let i = 0; i < quantity; i++) {
      barcodeDataList.push({
        text: barcodeText,
        productName: product.name,
        vendorName: product.vendor?.businessName || "Unknown Vendor",
        price: product.discountPrice || product.price,
        productId: product._id || product.id,
      });
    }
  });

  return barcodeDataList;
}

/**
 * Validate if barcode text is unique (placeholder - would need backend integration)
 * @param barcodeText - Barcode text to check
 * @param excludeProductId - Product ID to exclude from check
 * @returns Promise resolving to uniqueness check result
 */
export async function checkBarcodeUniqueness(
  barcodeText: string,
  excludeProductId?: string
): Promise<{ isUnique: boolean; conflictProductId?: string }> {
  // This would typically call the backend API
  // For now, return a placeholder implementation
  return { isUnique: true };
}

/**
 * Format barcode text for display
 * @param barcodeText - Raw barcode text
 * @returns Formatted barcode text with separators
 */
export function formatBarcodeForDisplay(barcodeText: string): string {
  // Add spaces for better readability: ABC-ProductName-12.99$ -> ABC - ProductName - 12.99$
  return barcodeText.replace(/-/g, " - ");
}

/**
 * Get barcode dimensions for layout calculations
 * @param options - Image options
 * @returns Dimensions object
 */
export function getBarcodeDimensions(options: BarcodeImageOptions = {}): {
  width: number;
  height: number;
} {
  const defaultWidth = 300; // Approximate width for standard barcode
  const defaultHeight = options.displayValue ? 120 : 80;

  return {
    width: defaultWidth,
    height:
      defaultHeight + (options.marginTop || 0) + (options.marginBottom || 0),
  };
}
