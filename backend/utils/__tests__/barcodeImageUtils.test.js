import { jest } from "@jest/globals";
import {
  generateBarcodeImage,
  generateBarcodeDataURL,
  generateProductBarcodeImage,
  generateMultipleBarcodeImages,
  validateBarcodeForImageGeneration,
  getSupportedBarcodeFormats,
  getDefaultImageOptions,
} from "../barcodeImageUtils.js";

// Mock canvas since it's not available in test environment
jest.mock("canvas", () => ({
  createCanvas: jest.fn(() => ({
    getContext: jest.fn(() => ({
      fillStyle: "",
      fillRect: jest.fn(),
      fillText: jest.fn(),
      font: "",
      textAlign: "",
    })),
    toBuffer: jest.fn(() => Buffer.from("mock-image-data")),
    width: 400,
    height: 200,
  })),
}));

// Mock jsbarcode
jest.mock("jsbarcode", () => {
  return jest.fn((canvas, text, options) => {
    // Mock implementation - just validate that it's called correctly
    if (!text || typeof text !== "string") {
      throw new Error("Invalid barcode text");
    }
    // Simulate successful barcode generation
    return true;
  });
});

describe("Barcode Image Utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("generateBarcodeImage", () => {
    it("should generate barcode image buffer", () => {
      const result = generateBarcodeImage("TEST-123-45.67$");

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
      // Check if it's a PNG file by checking the PNG signature
      expect(result.toString("hex", 0, 8)).toBe("89504e470d0a1a0a");
    });

    it("should accept custom options", () => {
      const options = {
        width: 3,
        height: 120,
        fontSize: 16,
        background: "#f0f0f0",
      };

      const result = generateBarcodeImage("TEST-123-45.67$", options);

      expect(result).toBeInstanceOf(Buffer);
    });

    it("should throw error for invalid barcode text", async () => {
      // Import the module dynamically to work with ES modules
      const JsBarcode = (await import("jsbarcode")).default;

      // Test with an invalid format that JsBarcode doesn't support
      expect(() => {
        generateBarcodeImage("", { format: "INVALID_FORMAT" });
      }).toThrow("Failed to generate barcode image");
    });
  });

  describe("generateBarcodeDataURL", () => {
    it("should generate base64 data URL", () => {
      const result = generateBarcodeDataURL("TEST-123-45.67$");

      expect(result).toMatch(/^data:image\/png;base64,/);
      expect(result.length).toBeGreaterThan(50); // Should be a substantial base64 string
    });

    it("should work with custom options", () => {
      const options = { width: 2, height: 100 };
      const result = generateBarcodeDataURL("TEST-123-45.67$", options);

      expect(result).toMatch(/^data:image\/png;base64,/);
    });
  });

  describe("generateProductBarcodeImage", () => {
    it("should generate product barcode with info", () => {
      const productInfo = {
        productName: "USB Cable",
        vendorName: "Tech Solutions",
        price: "$15.99",
        showProductInfo: true,
      };

      const result = generateProductBarcodeImage(
        "TS-USB Cable-15.99$",
        productInfo
      );

      expect(result).toBeInstanceOf(Buffer);
    });

    it("should handle long product names", () => {
      const productInfo = {
        productName: "Very Long Product Name That Should Be Truncated",
        vendorName: "Vendor",
        price: "$99.99",
        showProductInfo: true,
      };

      const result = generateProductBarcodeImage(
        "VD-VeryLong-99.99$",
        productInfo
      );

      expect(result).toBeInstanceOf(Buffer);
    });

    it("should work without product info", () => {
      const result = generateProductBarcodeImage("TEST-123-45.67$", {
        showProductInfo: false,
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    it("should handle custom options", () => {
      const productInfo = {
        productName: "Test Product",
        vendorName: "Test Vendor",
        showProductInfo: true,
      };

      const customOptions = {
        width: 3,
        height: 120,
        background: "#ffffff",
      };

      const result = generateProductBarcodeImage(
        "TEST-123-45.67$",
        productInfo,
        customOptions
      );

      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe("generateMultipleBarcodeImages", () => {
    it("should generate multiple barcode images", () => {
      const barcodeData = [
        {
          barcodeText: "TS-USB-15.99$",
          productInfo: {
            productName: "USB Cable",
            vendorName: "Tech Solutions",
          },
        },
        {
          barcodeText: "VD-Mouse-29.99$",
          productInfo: {
            productName: "Wireless Mouse",
            vendorName: "Vendor Direct",
          },
        },
      ];

      const results = generateMultipleBarcodeImages(barcodeData);

      expect(results).toHaveLength(2);
      expect(results[0].barcodeText).toBe("TS-USB-15.99$");
      expect(results[0].imageBuffer).toBeInstanceOf(Buffer);
      expect(results[1].barcodeText).toBe("VD-Mouse-29.99$");
      expect(results[1].imageBuffer).toBeInstanceOf(Buffer);
    });

    it("should handle errors gracefully and continue", () => {
      const barcodeData = [
        {
          barcodeText: "", // Empty string should cause an error
          productInfo: { productName: "Invalid Product" },
        },
        {
          barcodeText: "VALID-123-45.67$",
          productInfo: { productName: "Valid Product" },
        },
      ];

      const results = generateMultipleBarcodeImages(barcodeData);

      expect(results).toHaveLength(1);
      expect(results[0].barcodeText).toBe("VALID-123-45.67$");
    });

    it("should work with empty array", () => {
      const results = generateMultipleBarcodeImages([]);

      expect(results).toHaveLength(0);
    });
  });

  describe("validateBarcodeForImageGeneration", () => {
    it("should validate correct barcode text", () => {
      const result = validateBarcodeForImageGeneration("TEST-123-45.67$");

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.format).toBe("CODE128");
      expect(result.length).toBe(15);
    });

    it("should reject empty or invalid input", () => {
      const emptyResult = validateBarcodeForImageGeneration("");
      expect(emptyResult.isValid).toBe(false);
      expect(emptyResult.errors).toContain(
        "Barcode text must be a non-empty string"
      );

      const nullResult = validateBarcodeForImageGeneration(null);
      expect(nullResult.isValid).toBe(false);
      expect(nullResult.errors).toContain(
        "Barcode text must be a non-empty string"
      );
    });

    it("should validate CODE128 format", () => {
      // Valid ASCII characters
      const validResult = validateBarcodeForImageGeneration(
        "ABC123-test",
        "CODE128"
      );
      expect(validResult.isValid).toBe(true);

      // Invalid non-ASCII characters
      const invalidResult = validateBarcodeForImageGeneration(
        "ABC123-tëst",
        "CODE128"
      );
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain(
        "Invalid character at position 8: CODE128 only supports ASCII characters"
      );
    });

    it("should validate CODE39 format", () => {
      // Valid CODE39 characters
      const validResult = validateBarcodeForImageGeneration(
        "ABC123-TEST",
        "CODE39"
      );
      expect(validResult.isValid).toBe(true);

      // Invalid lowercase characters for CODE39
      const invalidResult = validateBarcodeForImageGeneration(
        "abc123-test",
        "CODE39"
      );
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain(
        "CODE39 only supports: A-Z, 0-9, -, ., space, $, /, +, %, *"
      );
    });

    it("should reject overly long barcodes", () => {
      const longBarcode = "A".repeat(101);
      const result = validateBarcodeForImageGeneration(longBarcode);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Barcode text is too long (max 100 characters)"
      );
    });

    it("should handle unknown formats", () => {
      const result = validateBarcodeForImageGeneration(
        "TEST123",
        "UNKNOWN_FORMAT"
      );

      expect(result.format).toBe("UNKNOWN_FORMAT");
      expect(result.isValid).toBe(true); // Should pass basic validation
    });
  });

  describe("getSupportedBarcodeFormats", () => {
    it("should return array of supported formats", () => {
      const formats = getSupportedBarcodeFormats();

      expect(Array.isArray(formats)).toBe(true);
      expect(formats.length).toBeGreaterThan(0);

      const code128 = formats.find((f) => f.name === "CODE128");
      expect(code128).toBeDefined();
      expect(code128.recommended).toBe(true);
      expect(code128.description).toContain("ASCII");

      const code39 = formats.find((f) => f.name === "CODE39");
      expect(code39).toBeDefined();
      expect(code39.recommended).toBe(false);
    });

    it("should include all expected formats", () => {
      const formats = getSupportedBarcodeFormats();
      const formatNames = formats.map((f) => f.name);

      expect(formatNames).toContain("CODE128");
      expect(formatNames).toContain("CODE39");
      expect(formatNames).toContain("EAN13");
      expect(formatNames).toContain("EAN8");
      expect(formatNames).toContain("UPC");
    });
  });

  describe("getDefaultImageOptions", () => {
    it("should return product options by default", () => {
      const options = getDefaultImageOptions();

      expect(options.format).toBe("CODE128");
      expect(options.background).toBe("#ffffff");
      expect(options.lineColor).toBe("#000000");
      expect(options.displayValue).toBe(true);
    });

    it("should return product-specific options", () => {
      const options = getDefaultImageOptions("product");

      expect(options.width).toBe(2);
      expect(options.height).toBe(80);
      expect(options.fontSize).toBe(14);
      expect(options.margin).toBe(15);
    });

    it("should return inventory-specific options", () => {
      const options = getDefaultImageOptions("inventory");

      expect(options.width).toBe(1.5);
      expect(options.height).toBe(60);
      expect(options.fontSize).toBe(12);
      expect(options.margin).toBe(10);
    });

    it("should return shipping-specific options", () => {
      const options = getDefaultImageOptions("shipping");

      expect(options.width).toBe(3);
      expect(options.height).toBe(100);
      expect(options.fontSize).toBe(16);
      expect(options.margin).toBe(20);
    });

    it("should return small-specific options", () => {
      const options = getDefaultImageOptions("small");

      expect(options.width).toBe(1);
      expect(options.height).toBe(40);
      expect(options.fontSize).toBe(10);
      expect(options.margin).toBe(5);
    });

    it("should return base options for unknown use case", () => {
      const options = getDefaultImageOptions("unknown");

      expect(options.format).toBe("CODE128");
      expect(options.background).toBe("#ffffff");
      expect(options.lineColor).toBe("#000000");
      expect(options.displayValue).toBe(true);
      // Should not have size-specific properties
      expect(options.width).toBeUndefined();
      expect(options.height).toBeUndefined();
    });
  });
});
