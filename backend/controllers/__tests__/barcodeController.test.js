import { jest } from "@jest/globals";
import {
  generateBarcode,
  validateBarcodeFormat,
  parseBarcode,
  generateVendorPrefix,
} from "../../utils/barcodeUtils.js";

describe("Barcode Controller Utils Integration", () => {
  describe("Barcode generation flow", () => {
    it("should generate valid barcode for typical product data", () => {
      // Simulate typical product data
      const vendorPrefix = "TS";
      const productName = "USB Cable";
      const price = 15.99;

      // Generate barcode
      const barcode = generateBarcode(vendorPrefix, productName, price);

      // Validate the generated barcode
      expect(validateBarcodeFormat(barcode)).toBe(true);
      expect(barcode).toBe("TS-USB Cable-15.99$");
      expect(barcode.length).toBeLessThanOrEqual(32);

      // Parse the barcode back
      const parsed = parseBarcode(barcode);
      expect(parsed.vendorPrefix).toBe(vendorPrefix);
      expect(parsed.productName).toBe(productName);
      expect(parsed.price).toBe(price);
    });

    it("should handle long product names by truncating", () => {
      const vendorPrefix = "VENDOR";
      const longProductName =
        "Very Long Product Name That Will Be Truncated For Barcode";
      const price = 999.99;

      const barcode = generateBarcode(vendorPrefix, longProductName, price);

      expect(validateBarcodeFormat(barcode)).toBe(true);
      expect(barcode.length).toBeLessThanOrEqual(32);

      const parsed = parseBarcode(barcode);
      expect(parsed.vendorPrefix).toBe(vendorPrefix);
      expect(parsed.productName.length).toBeLessThan(longProductName.length);
      expect(parsed.price).toBe(price);
    });

    it("should generate vendor prefix from business name and ID", () => {
      const businessName = "Tech Solutions Inc.";
      const vendorId = "507f1f77bcf86cd799439011";

      const prefix = generateVendorPrefix(businessName, vendorId);

      expect(prefix).toBe("TS11"); // Tech Solutions -> TS, last 2 chars of ID -> 11
      expect(prefix.length).toBe(4);
    });

    it("should handle discount prices in barcode generation", () => {
      const vendorPrefix = "VD";
      const productName = "Wireless Mouse";
      const regularPrice = 29.99;
      const discountPrice = 19.99;

      // Use discount price when available
      const barcode = generateBarcode(vendorPrefix, productName, discountPrice);

      expect(barcode).toBe("VD-Wireless Mouse-19.99$");
      expect(validateBarcodeFormat(barcode)).toBe(true);

      const parsed = parseBarcode(barcode);
      expect(parsed.price).toBe(discountPrice);
    });

    it("should validate different barcode formats correctly", () => {
      const validBarcodes = [
        "VD01-USB-3.00$",
        "TECH-Product Name-99.99$",
        "A1-X-0.01$",
      ];

      const invalidBarcodes = [
        "VD01-USB-3.00", // Missing $
        "VD01-USB-3$", // Invalid price format
        "VD01-3.00$", // Missing product name
        "VD01USB3.00$", // Missing separators
        "VD01-Very Long Product Name That Exceeds Thirty Two Characters-99.99$", // Too long
      ];

      validBarcodes.forEach((barcode) => {
        expect(validateBarcodeFormat(barcode)).toBe(true);
      });

      invalidBarcodes.forEach((barcode) => {
        expect(validateBarcodeFormat(barcode)).toBe(false);
      });
    });

    it("should handle edge cases in vendor prefix generation", () => {
      // Business name with special characters
      expect(generateVendorPrefix("A1 Tech & Co.", "12345678")).toBe("AT78");

      // Business name with numbers only
      expect(generateVendorPrefix("123 Numbers Only", "abc123")).toBe("NO23");

      // Single letter business name
      expect(generateVendorPrefix("A", "12345678")).toBe("AV78");

      // No letters in business name
      expect(generateVendorPrefix("123", "12345678")).toBe("VV78");

      // Short vendor ID
      expect(generateVendorPrefix("Tech Solutions", "1")).toBe("TS1");
    });

    it("should maintain consistency in end-to-end barcode operations", () => {
      const testCases = [
        {
          businessName: "Acme Corporation",
          vendorId: "507f1f77bcf86cd799439011",
          productName: "Professional Keyboard",
          price: 129.99,
        },
        {
          businessName: "Best Electronics",
          vendorId: "507f1f77bcf86cd799439012",
          productName: "HD Monitor",
          price: 299.5,
        },
        {
          businessName: "Quick Solutions",
          vendorId: "507f1f77bcf86cd799439013",
          productName: "USB-C Hub",
          price: 49.99,
        },
      ];

      testCases.forEach((testCase) => {
        // Generate vendor prefix
        const vendorPrefix = generateVendorPrefix(
          testCase.businessName,
          testCase.vendorId
        );

        // Generate barcode
        const barcode = generateBarcode(
          vendorPrefix,
          testCase.productName,
          testCase.price
        );

        // Validate barcode
        expect(validateBarcodeFormat(barcode)).toBe(true);
        expect(barcode.length).toBeLessThanOrEqual(32);

        // Parse and verify
        const parsed = parseBarcode(barcode);
        expect(parsed.vendorPrefix).toBe(vendorPrefix);
        expect(parsed.price).toBe(testCase.price);

        // Product name should match or be truncated version
        if (
          testCase.productName.length <=
          barcode.length -
            vendorPrefix.length -
            parsed.price.toFixed(2).length -
            3
        ) {
          expect(parsed.productName).toBe(testCase.productName);
        } else {
          expect(parsed.productName.length).toBeLessThan(
            testCase.productName.length
          );
          expect(testCase.productName.startsWith(parsed.productName)).toBe(
            true
          );
        }
      });
    });
  });

  describe("Error handling in barcode operations", () => {
    it("should throw errors for invalid inputs in generateBarcode", () => {
      expect(() => generateBarcode("", "Product", 10)).toThrow(
        "Vendor prefix must be a non-empty string"
      );
      expect(() => generateBarcode("VD", "", 10)).toThrow(
        "Product name must be a non-empty string"
      );
      expect(() => generateBarcode("VD", "Product", -1)).toThrow(
        "Price must be a valid positive number"
      );
      expect(() => generateBarcode("VD", "Product", "invalid")).toThrow(
        "Price must be a valid positive number"
      );
    });

    it("should throw errors for invalid inputs in generateVendorPrefix", () => {
      expect(() => generateVendorPrefix("", "id123")).toThrow(
        "Business name must be a non-empty string"
      );
      expect(() => generateVendorPrefix("Business", "")).toThrow(
        "Vendor ID must be a non-empty string"
      );
      expect(() => generateVendorPrefix(123, "id123")).toThrow(
        "Business name must be a non-empty string"
      );
      expect(() => generateVendorPrefix("Business", 123)).toThrow(
        "Vendor ID must be a non-empty string"
      );
    });

    it("should throw errors for invalid barcode parsing", () => {
      expect(() => parseBarcode("invalid-format")).toThrow(
        "Invalid barcode format"
      );
      expect(() => parseBarcode("VD01-Product-invalid$")).toThrow(
        "Invalid barcode format"
      );
      expect(() => parseBarcode("")).toThrow("Invalid barcode format");
    });

    it("should handle extremely long vendor prefix and price combinations", () => {
      const veryLongPrefix = "VERYLONGVENDORPREFIXEXTRA";
      const productName = "Product";
      const price = 999.99;

      expect(() => generateBarcode(veryLongPrefix, productName, price)).toThrow(
        "Vendor prefix and price are too long to generate a valid barcode"
      );
    });
  });
});
