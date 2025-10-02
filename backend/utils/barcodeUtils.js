/**
 * Barcode Generation Utilities
 *
 * This module provides utility functions for generating barcodes in the format:
 * {VendorPrefix}-{ProductName}-{Price}$
 *
 * Requirements:
 * - Maximum 32 characters total
 * - Truncate product name from the end if needed
 * - Price formatted to 2 decimal places with $ symbol
 */

/**
 * Formats a price to 2 decimal places with $ symbol
 * @param {number} price - The price to format
 * @returns {string} Formatted price (e.g., "3.00$")
 */
export const formatPrice = (price) => {
  if (typeof price !== "number" || isNaN(price)) {
    throw new Error("Price must be a valid number");
  }

  if (price < 0) {
    throw new Error("Price cannot be negative");
  }

  return `${price.toFixed(2)}$`;
};

/**
 * Truncates product name from the end to fit within the barcode length limit
 * @param {string} productName - The product name to truncate
 * @param {number} maxLength - Maximum allowed length for the product name
 * @returns {string} Truncated product name
 */
export const truncateProductName = (productName, maxLength) => {
  if (typeof productName !== "string") {
    throw new Error("Product name must be a string");
  }

  if (typeof maxLength !== "number" || maxLength < 0) {
    throw new Error("Max length must be a positive number");
  }

  if (productName.length <= maxLength) {
    return productName;
  }

  return productName.substring(0, maxLength);
};

/**
 * Generates a barcode string in the format: {VendorPrefix}-{ProductName}-{Price}$
 * Maximum length: 32 characters
 * @param {string} vendorPrefix - The vendor's prefix (e.g., "VD01")
 * @param {string} productName - The product name
 * @param {number} price - The product price
 * @returns {string} Generated barcode string
 */
export const generateBarcode = (vendorPrefix, productName, price) => {
  // Validate inputs
  if (typeof vendorPrefix !== "string" || !vendorPrefix.trim()) {
    throw new Error("Vendor prefix must be a non-empty string");
  }

  if (typeof productName !== "string" || !productName.trim()) {
    throw new Error("Product name must be a non-empty string");
  }

  if (typeof price !== "number" || isNaN(price) || price < 0) {
    throw new Error("Price must be a valid positive number");
  }

  const MAX_BARCODE_LENGTH = 32;

  // Clean inputs
  const cleanVendorPrefix = vendorPrefix.trim();
  const cleanProductName = productName.trim();

  // Format price
  const formattedPrice = formatPrice(price);

  // Calculate available space for product name
  // Format: {vendorPrefix}-{productName}-{price}$
  const separators = 2; // Two dashes
  const fixedLength =
    cleanVendorPrefix.length + separators + formattedPrice.length;
  const availableForProductName = MAX_BARCODE_LENGTH - fixedLength;

  if (availableForProductName <= 0) {
    throw new Error(
      "Vendor prefix and price are too long to generate a valid barcode"
    );
  }

  // Truncate product name if necessary
  const truncatedProductName = truncateProductName(
    cleanProductName,
    availableForProductName
  );

  // Generate final barcode
  const barcode = `${cleanVendorPrefix}-${truncatedProductName}-${formattedPrice}`;

  // Final validation
  if (barcode.length > MAX_BARCODE_LENGTH) {
    throw new Error(
      "Generated barcode exceeds maximum length of 32 characters"
    );
  }

  return barcode;
};

/**
 * Validates if a barcode string meets the format requirements
 * @param {string} barcode - The barcode string to validate
 * @returns {boolean} True if valid, false otherwise
 */
export const validateBarcodeFormat = (barcode) => {
  if (typeof barcode !== "string") {
    return false;
  }

  // Check length
  if (barcode.length === 0 || barcode.length > 32) {
    return false;
  }

  // Check format: should have at least 2 dashes and end with $
  const parts = barcode.split("-");
  if (parts.length < 3) {
    return false;
  }

  // Check if ends with $ and contains a valid price format
  const pricePart = parts[parts.length - 1];
  if (!pricePart.endsWith("$")) {
    return false;
  }

  // Extract price and validate format
  const priceString = pricePart.slice(0, -1);
  const priceRegex = /^\d+\.\d{2}$/;

  return priceRegex.test(priceString);
};

/**
 * Extracts components from a barcode string
 * @param {string} barcode - The barcode string to parse
 * @returns {object} Object with vendorPrefix, productName, and price
 */
export const parseBarcode = (barcode) => {
  if (!validateBarcodeFormat(barcode)) {
    throw new Error("Invalid barcode format");
  }

  const parts = barcode.split("-");
  const vendorPrefix = parts[0];
  const pricePart = parts[parts.length - 1];

  // Extract price (remove $ symbol)
  const priceString = pricePart.slice(0, -1);
  const price = parseFloat(priceString);

  // Extract product name (everything between vendor prefix and price)
  const productNameParts = parts.slice(1, -1);
  const productName = productNameParts.join("-");

  return {
    vendorPrefix,
    productName,
    price,
  };
};

/**
 * Generates a vendor prefix from business name
 * This is a helper function to create consistent vendor prefixes
 * @param {string} businessName - The business name
 * @param {string} vendorId - The vendor's database ID (last 2 characters used)
 * @returns {string} Generated vendor prefix (e.g., "VD01")
 */
export const generateVendorPrefix = (businessName, vendorId) => {
  if (typeof businessName !== "string" || !businessName.trim()) {
    throw new Error("Business name must be a non-empty string");
  }

  if (typeof vendorId !== "string" || !vendorId.trim()) {
    throw new Error("Vendor ID must be a non-empty string");
  }

  // Split business name into words and take first letter of each word
  const words = businessName
    .trim()
    .replace(/[^a-zA-Z\s]/g, "") // Remove non-letters and non-spaces
    .split(/\s+/) // Split by whitespace
    .filter((word) => word.length > 0); // Remove empty strings

  let businessInitials = "";
  for (const word of words) {
    if (businessInitials.length < 2) {
      businessInitials += word.charAt(0).toUpperCase();
    }
  }

  // If business name doesn't have enough letters, pad with 'V' for Vendor
  const paddedInitials = businessInitials.padEnd(2, "V");

  // Take last 2 characters of vendor ID
  const idSuffix = vendorId.slice(-2);

  return `${paddedInitials}${idSuffix}`;
};

/**
 * Check if a barcode is unique in the database
 * @param {string} barcode - The barcode to check
 * @param {Object} Product - Product model (injected to avoid circular imports)
 * @param {string} excludeProductId - Product ID to exclude from check (for updates)
 * @returns {Promise<boolean>} True if barcode is unique, false otherwise
 */
export const isBarcodeUnique = async (
  barcode,
  Product,
  excludeProductId = null
) => {
  if (typeof barcode !== "string" || barcode.trim() === "") {
    throw new Error("Barcode must be a non-empty string");
  }

  const query = { barcode: barcode.trim() };

  // Exclude current product from uniqueness check (for updates)
  if (excludeProductId) {
    query._id = { $ne: excludeProductId };
  }

  const existingProduct = await Product.findOne(query);
  return !existingProduct;
};

/**
 * Generate a unique barcode for a product, handling conflicts
 * @param {string} vendorPrefix - The vendor prefix
 * @param {string} productName - The product name
 * @param {number} price - The product price
 * @param {Object} Product - Product model (injected to avoid circular imports)
 * @param {string} excludeProductId - Product ID to exclude from uniqueness check
 * @returns {Promise<string>} A unique barcode
 */
export const generateUniqueBarcode = async (
  vendorPrefix,
  productName,
  price,
  Product,
  excludeProductId = null
) => {
  // First, try the standard barcode generation
  let baseBarcode = generateBarcode(vendorPrefix, productName, price);

  // Check if it's unique
  const isUnique = await isBarcodeUnique(
    baseBarcode,
    Product,
    excludeProductId
  );
  if (isUnique) {
    return baseBarcode;
  }

  // If not unique, try variations by truncating product name further
  const MAX_BARCODE_LENGTH = 32;
  const cleanVendorPrefix = vendorPrefix.trim();
  const formattedPrice = formatPrice(price);
  const separators = 2;
  const fixedLength =
    cleanVendorPrefix.length + separators + formattedPrice.length;

  let availableForProductName = MAX_BARCODE_LENGTH - fixedLength;

  // Try progressively shorter product names
  for (let attempt = 1; attempt <= 5; attempt++) {
    availableForProductName = Math.max(1, availableForProductName - attempt);

    if (availableForProductName <= 0) {
      break;
    }

    const truncatedName = truncateProductName(
      productName,
      availableForProductName
    );
    const candidateBarcode = `${cleanVendorPrefix}-${truncatedName}-${formattedPrice}`;

    const isUnique = await isBarcodeUnique(
      candidateBarcode,
      Product,
      excludeProductId
    );
    if (isUnique) {
      return candidateBarcode;
    }
  }

  // If still not unique, append a numeric suffix
  for (let suffix = 1; suffix <= 999; suffix++) {
    const suffixStr = suffix.toString().padStart(3, "0");
    const maxProductNameLength = availableForProductName - suffixStr.length - 1; // -1 for separator

    if (maxProductNameLength <= 0) {
      // If we can't fit product name + suffix, just use suffix
      const candidateBarcode = `${cleanVendorPrefix}-${suffixStr}-${formattedPrice}`;
      const isUnique = await isBarcodeUnique(
        candidateBarcode,
        Product,
        excludeProductId
      );
      if (isUnique) {
        return candidateBarcode;
      }
    } else {
      const truncatedName = truncateProductName(
        productName,
        maxProductNameLength
      );
      const candidateBarcode = `${cleanVendorPrefix}-${truncatedName}${suffixStr}-${formattedPrice}`;

      const isUnique = await isBarcodeUnique(
        candidateBarcode,
        Product,
        excludeProductId
      );
      if (isUnique) {
        return candidateBarcode;
      }
    }
  }

  // If we still can't generate a unique barcode, throw an error
  throw new Error(
    "Unable to generate a unique barcode after multiple attempts"
  );
};

/**
 * Validate barcode business rules
 * @param {string} barcode - The barcode to validate
 * @param {Object} productData - Product data for context validation
 * @returns {Object} Validation result with isValid flag and errors array
 */
export const validateBarcodeBusinessRules = (barcode, productData = {}) => {
  const errors = [];

  try {
    // Basic format validation
    if (!validateBarcodeFormat(barcode)) {
      errors.push("Barcode format is invalid");
      return { isValid: false, errors };
    }

    // Parse barcode components
    const parsed = parseBarcode(barcode);

    // Validate vendor prefix length (should be reasonable)
    if (parsed.vendorPrefix.length < 1 || parsed.vendorPrefix.length > 10) {
      errors.push("Vendor prefix should be between 1-10 characters");
    }

    // Validate product name length
    if (parsed.productName.length < 1) {
      errors.push("Product name cannot be empty");
    }

    if (parsed.productName.length > 20) {
      errors.push("Product name in barcode is too long (max 20 characters)");
    }

    // Validate price range
    if (parsed.price <= 0) {
      errors.push("Price must be greater than 0");
    }

    if (parsed.price > 999999.99) {
      errors.push("Price is too large (max $999,999.99)");
    }

    // Context validation if product data is provided
    if (
      productData.price &&
      Math.abs(parsed.price - productData.price) > 0.01
    ) {
      if (
        !productData.discountPrice ||
        Math.abs(parsed.price - productData.discountPrice) > 0.01
      ) {
        errors.push(
          "Barcode price does not match product price or discount price"
        );
      }
    }

    // Check for suspicious patterns
    if (parsed.productName.includes("  ")) {
      errors.push("Product name contains multiple consecutive spaces");
    }

    if (parsed.vendorPrefix.includes(" ")) {
      errors.push("Vendor prefix should not contain spaces");
    }

    // Check for invalid characters in components
    const invalidChars = /[<>:"\\|?*]/;
    if (
      invalidChars.test(parsed.vendorPrefix) ||
      invalidChars.test(parsed.productName)
    ) {
      errors.push("Barcode contains invalid characters");
    }
  } catch (error) {
    errors.push(`Barcode parsing error: ${error.message}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    parsed: errors.length === 0 ? parseBarcode(barcode) : null,
  };
};
