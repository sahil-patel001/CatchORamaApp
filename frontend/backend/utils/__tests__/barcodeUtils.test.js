import { jest } from "@jest/globals";
import {
  formatPrice,
  truncateProductName,
  generateBarcode,
  validateBarcodeFormat,
  parseBarcode,
  generateVendorPrefix,
  isBarcodeUnique,
  generateUniqueBarcode,
  validateBarcodeBusinessRules,
} from "../barcodeUtils.js";

describe("Barcode Utils", () => {
  describe("formatPrice", () => {
    it("should format price with 2 decimal places and $ symbol", () => {
      expect(formatPrice(3)).toBe("$3.00");
      expect(formatPrice(3.5)).toBe("$3.50");
      expect(formatPrice(3.99)).toBe("$3.99");
      expect(formatPrice(0)).toBe("$0.00");
      expect(formatPrice(100.123)).toBe("$100.12");
    });

    it("should throw error for invalid price inputs", () => {
      expect(() => formatPrice("3")).toThrow("Price must be a valid number");
      expect(() => formatPrice(null)).toThrow("Price must be a valid number");
      expect(() => formatPrice(undefined)).toThrow(
        "Price must be a valid number"
      );
      expect(() => formatPrice(NaN)).toThrow("Price must be a valid number");
      expect(() => formatPrice(-1)).toThrow("Price cannot be negative");
    });
  });

  describe("truncateProductName", () => {
    it("should return original name if within max length", () => {
      expect(truncateProductName("USB", 10)).toBe("USB");
      expect(truncateProductName("USB Cable", 10)).toBe("USB Cable");
    });

    it("should truncate name from the end if exceeds max length", () => {
      expect(truncateProductName("USB Cable Long Name", 8)).toBe("USB Cabl");
      expect(truncateProductName("Very Long Product Name", 5)).toBe("Very ");
    });

    it("should handle edge cases", () => {
      expect(truncateProductName("USB", 3)).toBe("USB");
      expect(truncateProductName("USB", 2)).toBe("US");
      expect(truncateProductName("USB", 0)).toBe("");
    });

    it("should throw error for invalid inputs", () => {
      expect(() => truncateProductName(123, 5)).toThrow(
        "Product name must be a string"
      );
      expect(() => truncateProductName("USB", "5")).toThrow(
        "Max length must be a positive number"
      );
      expect(() => truncateProductName("USB", -1)).toThrow(
        "Max length must be a positive number"
      );
    });
  });

  describe("generateBarcode", () => {
    it("should generate correct barcode format", () => {
      const barcode = generateBarcode("VD01", "USB 2.0", 3);
      expect(barcode).toBe("$3.00-USB 2.0-VD01");
      expect(barcode.length).toBeLessThanOrEqual(32);
    });

    it("should truncate product name when barcode would exceed 32 characters", () => {
      const longProductName = "Very Long Product Name That Exceeds Length";
      const barcode = generateBarcode("VD01", longProductName, 99.99);
      expect(barcode.length).toBeLessThanOrEqual(32);
      expect(barcode).toMatch(/^\$99\.99-.+-VD01$/);
    });

    it("should handle various price formats", () => {
      expect(generateBarcode("VD01", "USB", 0)).toBe("$0.00-USB-VD01");
      expect(generateBarcode("VD01", "USB", 1.5)).toBe("$1.50-USB-VD01");
      expect(generateBarcode("VD01", "USB", 999.99)).toBe("$999.99-USB-VD01");
    });

    it("should handle different vendor prefixes", () => {
      expect(generateBarcode("AB12", "USB", 3)).toBe("$3.00-USB-AB12");
      expect(generateBarcode("VENDOR", "USB", 3)).toBe("$3.00-USB-VENDOR");
    });

    it("should throw error for invalid inputs", () => {
      expect(() => generateBarcode("", "USB", 3)).toThrow(
        "Vendor prefix must be a non-empty string"
      );
      expect(() => generateBarcode("VD01", "", 3)).toThrow(
        "Product name must be a non-empty string"
      );
      expect(() => generateBarcode("VD01", "USB", -1)).toThrow(
        "Price must be a valid positive number"
      );
      expect(() => generateBarcode("VD01", "USB", "invalid")).toThrow(
        "Price must be a valid positive number"
      );
    });

    it("should throw error when vendor prefix and price are too long", () => {
      const longPrefix = "VERYLONGVENDORPREFIXEXTRA";
      expect(() => generateBarcode(longPrefix, "USB", 999.99)).toThrow(
        "Vendor prefix and price are too long to generate a valid barcode"
      );
    });

    it("should handle whitespace in inputs", () => {
      const barcode = generateBarcode(" VD01 ", " USB Cable ", 3.5);
      expect(barcode).toBe("$3.50-USB Cable-VD01");
    });
  });

  describe("validateBarcodeFormat", () => {
    it("should validate correct barcode formats", () => {
      expect(validateBarcodeFormat("$3.00-USB-VD01")).toBe(true);
      expect(validateBarcodeFormat("$99.99-Product Name-AB12")).toBe(true);
      expect(validateBarcodeFormat("$0.01-X-V1")).toBe(true);
    });

    it("should reject invalid barcode formats", () => {
      expect(validateBarcodeFormat("")).toBe(false);
      expect(validateBarcodeFormat("3.00-USB-VD01")).toBe(false); // Missing $
      expect(validateBarcodeFormat("$3-USB-VD01")).toBe(false); // Invalid price format
      expect(validateBarcodeFormat("$3.0-USB-VD01")).toBe(false); // Invalid price format
      expect(validateBarcodeFormat("$3.00-VD01")).toBe(false); // Missing product name
      expect(validateBarcodeFormat("$3.00USBVD01")).toBe(false); // Missing separators
      expect(validateBarcodeFormat(123)).toBe(false); // Not a string
    });

    it("should reject barcodes exceeding 32 characters", () => {
      const longBarcode = "$99.99-Very Long Product Name Here-VD01"; // > 32 chars
      expect(validateBarcodeFormat(longBarcode)).toBe(false);
    });
  });

  describe("parseBarcode", () => {
    it("should parse valid barcodes correctly", () => {
      const result = parseBarcode("$3.00-USB 2.0-VD01");
      expect(result).toEqual({
        vendorPrefix: "VD01",
        productName: "USB 2.0",
        price: 3.0,
      });
    });

    it("should handle product names with dashes", () => {
      const result = parseBarcode("$15.99-USB-C-Cable-VD01");
      expect(result).toEqual({
        vendorPrefix: "VD01",
        productName: "USB-C-Cable",
        price: 15.99,
      });
    });

    it("should handle various price formats", () => {
      expect(parseBarcode("$0.01-USB-VD01")).toEqual({
        vendorPrefix: "VD01",
        productName: "USB",
        price: 0.01,
      });

      expect(parseBarcode("$999.99-USB-VD01")).toEqual({
        vendorPrefix: "VD01",
        productName: "USB",
        price: 999.99,
      });
    });

    it("should throw error for invalid barcodes", () => {
      expect(() => parseBarcode("invalid")).toThrow("Invalid barcode format");
      expect(() => parseBarcode("$3.00-USB")).toThrow(
        "Invalid barcode format"
      );
      expect(() => parseBarcode("")).toThrow("Invalid barcode format");
    });
  });

  describe("generateVendorPrefix", () => {
    it("should generate prefix from business name and vendor ID", () => {
      expect(
        generateVendorPrefix("Acme Corp", "507f1f77bcf86cd799439011")
      ).toBe("AC11");
      expect(generateVendorPrefix("Best Buy", "123456789012345678901234")).toBe(
        "BB34"
      );
      expect(generateVendorPrefix("Tech Solutions", "abcdef1234567890")).toBe(
        "TS90"
      );
    });

    it("should handle business names with special characters", () => {
      expect(generateVendorPrefix("A1 Tech & Co.", "12345678")).toBe("AT78");
      expect(generateVendorPrefix("123 Numbers Only", "abc123")).toBe("NO23");
    });

    it("should pad with V when business name has insufficient letters", () => {
      expect(generateVendorPrefix("A", "12345678")).toBe("AV78");
      expect(generateVendorPrefix("123", "12345678")).toBe("VV78");
      expect(generateVendorPrefix("!@#$%", "12345678")).toBe("VV78");
    });

    it("should handle short vendor IDs", () => {
      expect(generateVendorPrefix("Acme Corp", "1")).toBe("AC1");
      expect(generateVendorPrefix("Acme Corp", "12")).toBe("AC12");
    });

    it("should throw error for invalid inputs", () => {
      expect(() => generateVendorPrefix("", "12345678")).toThrow(
        "Business name must be a non-empty string"
      );
      expect(() => generateVendorPrefix("Acme", "")).toThrow(
        "Vendor ID must be a non-empty string"
      );
      expect(() => generateVendorPrefix(123, "12345678")).toThrow(
        "Business name must be a non-empty string"
      );
      expect(() => generateVendorPrefix("Acme", 123)).toThrow(
        "Vendor ID must be a non-empty string"
      );
    });

    it("should handle whitespace in business name", () => {
      expect(generateVendorPrefix(" Acme Corp ", "12345678")).toBe("AC78");
      expect(generateVendorPrefix("  Tech  Solutions  ", "12345678")).toBe(
        "TS78"
      );
    });
  });

  describe("Integration tests", () => {
    it("should generate and validate barcode end-to-end", () => {
      const vendorPrefix = "VD01";
      const productName = "USB 2.0 Cable";
      const price = 15.99;

      const barcode = generateBarcode(vendorPrefix, productName, price);
      expect(validateBarcodeFormat(barcode)).toBe(true);

      const parsed = parseBarcode(barcode);
      expect(parsed.vendorPrefix).toBe(vendorPrefix);
      expect(parsed.productName).toBe(productName);
      expect(parsed.price).toBe(price);
    });

    it("should handle truncation in end-to-end flow", () => {
      const vendorPrefix = "VENDOR";
      const longProductName = "Very Long Product Name That Will Be Truncated";
      const price = 999.99;

      const barcode = generateBarcode(vendorPrefix, longProductName, price);
      expect(barcode.length).toBeLessThanOrEqual(32);
      expect(validateBarcodeFormat(barcode)).toBe(true);

      const parsed = parseBarcode(barcode);
      expect(parsed.vendorPrefix).toBe(vendorPrefix);
      expect(parsed.productName.length).toBeLessThan(longProductName.length);
      expect(parsed.price).toBe(price);
    });
  });

  describe("isBarcodeUnique", () => {
    const mockProduct = {
      findOne: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should return true when barcode is unique", async () => {
      mockProduct.findOne.mockResolvedValue(null);

      const isUnique = await isBarcodeUnique(
        "$15.99-USB Cable-TS",
        mockProduct
      );

      expect(isUnique).toBe(true);
      expect(mockProduct.findOne).toHaveBeenCalledWith({
        barcode: "$15.99-USB Cable-TS",
      });
    });

    it("should return false when barcode exists", async () => {
      mockProduct.findOne.mockResolvedValue({ _id: "existing-id" });

      const isUnique = await isBarcodeUnique(
        "$15.99-USB Cable-TS",
        mockProduct
      );

      expect(isUnique).toBe(false);
    });

    it("should exclude specific product ID from check", async () => {
      mockProduct.findOne.mockResolvedValue(null);

      await isBarcodeUnique("$15.99-USB Cable-TS", mockProduct, "exclude-id");

      expect(mockProduct.findOne).toHaveBeenCalledWith({
        barcode: "$15.99-USB Cable-TS",
        _id: { $ne: "exclude-id" },
      });
    });

    it("should throw error for invalid barcode input", async () => {
      await expect(isBarcodeUnique("", mockProduct)).rejects.toThrow(
        "Barcode must be a non-empty string"
      );
      await expect(isBarcodeUnique(null, mockProduct)).rejects.toThrow(
        "Barcode must be a non-empty string"
      );
    });
  });

  describe("generateUniqueBarcode", () => {
    const mockProduct = {
      findOne: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should return original barcode if unique", async () => {
      mockProduct.findOne.mockResolvedValue(null);

      const barcode = await generateUniqueBarcode(
        "TS",
        "USB Cable",
        15.99,
        mockProduct
      );

      expect(barcode).toBe("$15.99-USB Cable-TS");
      expect(mockProduct.findOne).toHaveBeenCalledTimes(1);
    });

    it("should generate alternative when original is not unique", async () => {
      // First call returns existing product, subsequent calls return null
      mockProduct.findOne
        .mockResolvedValueOnce({ _id: "existing-id" })
        .mockResolvedValue(null);

      const barcode = await generateUniqueBarcode(
        "TS",
        "USB Cable",
        15.99,
        mockProduct
      );

      // The function should try to generate alternatives, the second attempt should be unique
      expect(barcode.startsWith("$15.99-")).toBe(true);
      expect(barcode.endsWith("-TS")).toBe(true);
      expect(barcode.length).toBeLessThanOrEqual(32);
      expect(mockProduct.findOne).toHaveBeenCalledTimes(2);
    });

    it("should handle very long product names", async () => {
      mockProduct.findOne
        .mockResolvedValueOnce({ _id: "existing-id" })
        .mockResolvedValue(null);

      const longName = "Very Long Product Name That Needs Truncation";
      const barcode = await generateUniqueBarcode(
        "VENDOR",
        longName,
        999.99,
        mockProduct
      );

      expect(barcode.length).toBeLessThanOrEqual(32);
      expect(barcode.startsWith("$999.99-")).toBe(true);
      expect(barcode.endsWith("-VENDOR")).toBe(true);
    });

    it("should add numeric suffix when needed", async () => {
      // Mock that all attempts fail until we get to suffix
      mockProduct.findOne
        .mockResolvedValueOnce({ _id: "existing-1" }) // Original
        .mockResolvedValueOnce({ _id: "existing-2" }) // First truncation
        .mockResolvedValueOnce({ _id: "existing-3" }) // Second truncation
        .mockResolvedValueOnce({ _id: "existing-4" }) // Third truncation
        .mockResolvedValueOnce({ _id: "existing-5" }) // Fourth truncation
        .mockResolvedValueOnce({ _id: "existing-6" }) // Fifth truncation
        .mockResolvedValue(null); // Finally unique with suffix

      const barcode = await generateUniqueBarcode(
        "TS",
        "USB",
        15.99,
        mockProduct
      );

      expect(barcode.length).toBeLessThanOrEqual(32);
      expect(barcode.startsWith("$15.99-")).toBe(true);
      expect(barcode.includes("001")).toBe(true); // Should have numeric suffix
    });

    it("should throw error when unable to generate unique barcode", async () => {
      // Mock that all attempts fail
      mockProduct.findOne.mockResolvedValue({ _id: "existing-id" });

      await expect(
        generateUniqueBarcode("VERYLONGPREFIX", "Product", 999.99, mockProduct)
      ).rejects.toThrow(
        "Unable to generate a unique barcode after multiple attempts"
      );
    });
  });

  describe("validateBarcodeBusinessRules", () => {
    it("should validate correct barcode", () => {
      const result = validateBarcodeBusinessRules("$15.99-USB Cable-TS");

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.parsed).toEqual({
        vendorPrefix: "TS",
        productName: "USB Cable",
        price: 15.99,
      });
    });

    it("should detect invalid format", () => {
      const result = validateBarcodeBusinessRules("invalid-format");

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Barcode format is invalid");
    });

    it("should validate vendor prefix length", () => {
      const shortPrefix = validateBarcodeBusinessRules("$15.99-USB-");
      expect(shortPrefix.errors).toContain(
        "Vendor prefix should be between 1-10 characters"
      );

      const longPrefix = validateBarcodeBusinessRules(
        "$15.99-USB-VERYLONGPREFIX"
      );
      expect(longPrefix.errors).toContain(
        "Vendor prefix should be between 1-10 characters"
      );
    });

    it("should validate product name", () => {
      const emptyName = validateBarcodeBusinessRules("$15.99--TS");
      expect(emptyName.errors).toContain("Product name cannot be empty");

      // Use a shorter but still long product name that passes format validation
      const longName = validateBarcodeBusinessRules(
        "$15.99-TwentyOneCharacterName-TS"
      );
      expect(longName.errors).toContain(
        "Product name in barcode is too long (max 20 characters)"
      );
    });

    it("should validate price range", () => {
      const zeroPrice = validateBarcodeBusinessRules("$0.00-USB-TS");
      expect(zeroPrice.errors).toContain("Price must be greater than 0");

      const highPrice = validateBarcodeBusinessRules("$9999999.99-USB-TS");
      expect(highPrice.errors).toContain(
        "Price is too large (max $999,999.99)"
      );
    });

    it("should validate against product data context", () => {
      const productData = { price: 20.99, discountPrice: 15.99 };

      // Should pass with discount price
      const validDiscount = validateBarcodeBusinessRules(
        "$15.99-USB-TS",
        productData
      );
      expect(validDiscount.isValid).toBe(true);

      // Should pass with regular price
      const validRegular = validateBarcodeBusinessRules(
        "$20.99-USB-TS",
        productData
      );
      expect(validRegular.isValid).toBe(true);

      // Should fail with different price
      const invalidPrice = validateBarcodeBusinessRules(
        "$25.99-USB-TS",
        productData
      );
      expect(invalidPrice.errors).toContain(
        "Barcode price does not match product price or discount price"
      );
    });

    it("should detect suspicious patterns", () => {
      const doubleSpaces = validateBarcodeBusinessRules("$15.99-USB  Cable-TS");
      expect(doubleSpaces.errors).toContain(
        "Product name contains multiple consecutive spaces"
      );

      const prefixSpaces = validateBarcodeBusinessRules("$15.99-USB Cable-T S");
      expect(prefixSpaces.errors).toContain(
        "Vendor prefix should not contain spaces"
      );
    });

    it("should detect invalid characters", () => {
      const invalidChars = validateBarcodeBusinessRules(
        "$15.99-USB|Cable-TS<>"
      );
      expect(invalidChars.errors).toContain(
        "Barcode contains invalid characters"
      );
    });

    it("should handle parsing errors gracefully", () => {
      const result = validateBarcodeBusinessRules(
        "completely-invalid-barcode-format"
      );
      expect(result.isValid).toBe(false);
      // Should contain format error since format validation fails first
      expect(result.errors).toContain("Barcode format is invalid");
    });
  });
});
