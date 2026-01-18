import {
  generateBarcode,
  validateBarcodeFormat,
  parseBarcode,
  generateVendorPrefix,
  isBarcodeUnique,
  generateUniqueBarcode,
  validateBarcodeBusinessRules,
} from "../utils/barcodeUtils.js";
import {
  generateBarcodeImage,
  generateBarcodeDataURL,
  generateProductBarcodeImage,
  generateMultipleBarcodeImages,
  validateBarcodeForImageGeneration,
  getSupportedBarcodeFormats,
  getDefaultImageOptions,
} from "../utils/barcodeImageUtils.js";
import {
  storeBarcodeImage,
  retrieveBarcodeImage,
  deleteBarcodeImage,
  regenerateBarcodeImage,
  bulkStoreBarcodeImages,
  cleanupOldBarcodeImages,
  getStorageStats,
} from "../services/barcodeStorageService.js";
import {
  regenerateProductBarcode as regenerateProductBarcodeService,
  bulkRegenerateProductBarcodes,
  regenerateOutdatedBarcodes,
  getBarcodeRegenerationStats,
} from "../services/barcodeRegenerationService.js";
import {
  createBarcodeIndexes,
  analyzeBarcodeIndexUsage,
  optimizeBarcodeIndexes,
  getBarcodeIndexInfo,
} from "../services/barcodeIndexingService.js";
import Product from "../models/Product.js";
import Vendor from "../models/Vendor.js";
import Barcode from "../models/Barcode.js";

/**
 * Generate a barcode for a specific product
 * POST /api/v1/barcodes/generate
 */
export const generateProductBarcode = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    // Find the product with vendor information
    const product = await Product.findById(productId).populate("vendorId");
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const vendor = product.vendorId;
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor information not found for this product",
      });
    }

    // Use the stored vendor prefix directly
    const vendorPrefix = vendor.vendorPrefix;
    if (!vendorPrefix) {
      return res.status(400).json({
        success: false,
        message: "Vendor prefix not found. Please contact administrator.",
      });
    }

    // Use the current price (discountPrice if available, otherwise regular price)
    const price =
      product.discountPrice && product.discountPrice > 0
        ? product.discountPrice
        : product.price;

    // Generate a unique barcode
    const barcode = await generateUniqueBarcode(
      vendorPrefix,
      product.name,
      price,
      Product,
      product._id
    );

    // Validate the generated barcode with business rules
    const validation = validateBarcodeBusinessRules(barcode, {
      price: product.price,
      discountPrice: product.discountPrice,
    });

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Generated barcode failed validation",
        errors: validation.errors,
      });
    }

    // Update product with barcode if it doesn't exist or is different
    if (!product.barcode || product.barcode !== barcode) {
      product.barcode = barcode;
      await product.save();
    }

    // Generate barcode image if requested
    let barcodeImage = null;
    const {
      generateImage,
      imageFormat = "dataURL",
      imageOptions = {},
    } = req.body;

    if (generateImage) {
      try {
        const productInfo = {
          productName: product.name,
          vendorName: vendor.businessName,
          price: `$${price.toFixed(2)}`,
          showProductInfo: imageOptions.showProductInfo !== false,
        };

        if (imageFormat === "dataURL") {
          barcodeImage = generateBarcodeDataURL(barcode, {
            ...getDefaultImageOptions("product"),
            ...imageOptions,
          });
        } else {
          const imageBuffer = generateProductBarcodeImage(
            barcode,
            productInfo,
            imageOptions
          );
          barcodeImage = imageBuffer.toString("base64");
        }
      } catch (imageError) {
        console.warn("Failed to generate barcode image:", imageError);
        // Continue without image if generation fails
      }
    }

    res.status(200).json({
      success: true,
      data: {
        barcode,
        productId: product._id,
        productName: product.name,
        price,
        vendorPrefix,
        vendorName: vendor.businessName,
        barcodeImage,
        imageFormat: generateImage ? imageFormat : null,
      },
      message: "Barcode generated successfully",
    });
  } catch (error) {
    console.error("Error generating barcode:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to generate barcode",
    });
  }
};

/**
 * Generate barcodes for multiple products
 * POST /api/v1/barcodes/generate-bulk
 */
export const generateBulkBarcodes = async (req, res) => {
  try {
    const { productIds } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Product IDs array is required",
      });
    }

    const results = [];
    const errors = [];

    // Process each product
    for (const productId of productIds) {
      try {
        // Find the product with vendor information
        const product = await Product.findById(productId).populate("vendorId");
        if (!product) {
          errors.push({
            productId,
            error: "Product not found",
          });
          continue;
        }

        const vendor = product.vendorId;
        if (!vendor) {
          errors.push({
            productId,
            error: "Vendor information not found",
          });
          continue;
        }

        // Use the stored vendor prefix directly
        const vendorPrefix = vendor.vendorPrefix;
        if (!vendorPrefix) {
          barcodeResults.push({
            productId: product._id,
            success: false,
            error: "Vendor prefix not found. Please contact administrator.",
          });
          continue;
        }

        // Use the current price
        const price =
          product.discountPrice && product.discountPrice > 0
            ? product.discountPrice
            : product.price;

        // Generate a unique barcode
        const barcode = await generateUniqueBarcode(
          vendorPrefix,
          product.name,
          price,
          Product,
          product._id
        );

        // Validate the generated barcode with business rules
        const validation = validateBarcodeBusinessRules(barcode, {
          price: product.price,
          discountPrice: product.discountPrice,
        });

        if (!validation.isValid) {
          errors.push({
            productId,
            error: `Barcode validation failed: ${validation.errors.join(", ")}`,
          });
          continue;
        }

        // Update product with barcode if it doesn't exist or is different
        if (!product.barcode || product.barcode !== barcode) {
          product.barcode = barcode;
          await product.save();
        }

        results.push({
          productId: product._id,
          productName: product.name,
          barcode,
          price,
          vendorPrefix,
          vendorName: vendor.businessName,
        });
      } catch (error) {
        errors.push({
          productId,
          error: error.message,
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        results,
        errors,
        totalProcessed: productIds.length,
        successCount: results.length,
        errorCount: errors.length,
      },
      message: `Processed ${productIds.length} products: ${results.length} successful, ${errors.length} errors`,
    });
  } catch (error) {
    console.error("Error generating bulk barcodes:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to generate bulk barcodes",
    });
  }
};

/**
 * Validate a barcode format
 * POST /api/v1/barcodes/validate
 */
export const validateBarcode = async (req, res) => {
  try {
    const { barcode } = req.body;

    if (!barcode) {
      return res.status(400).json({
        success: false,
        message: "Barcode is required",
      });
    }

    const formatValid = validateBarcodeFormat(barcode);
    const businessRulesValidation = validateBarcodeBusinessRules(barcode);

    // Check uniqueness in database
    let isUnique = false;
    try {
      isUnique = await isBarcodeUnique(barcode, Product);
    } catch (error) {
      console.warn("Error checking barcode uniqueness:", error);
    }

    const isValid = formatValid && businessRulesValidation.isValid;

    res.status(200).json({
      success: true,
      data: {
        barcode,
        isValid,
        formatValid,
        businessRulesValid: businessRulesValidation.isValid,
        isUnique,
        parsedData: businessRulesValidation.parsed,
        errors: businessRulesValidation.errors,
        length: barcode.length,
      },
      message: isValid ? "Barcode is valid" : "Barcode validation failed",
    });
  } catch (error) {
    console.error("Error validating barcode:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to validate barcode",
    });
  }
};

/**
 * Get barcode information for a product
 * GET /api/v1/barcodes/product/:productId
 */
export const getProductBarcode = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId).populate("vendorId");
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const vendor = product.vendorId;
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor information not found for this product",
      });
    }

    // If product doesn't have a barcode, generate one
    let barcode = product.barcode;
    if (!barcode) {
      const vendorPrefix = vendor.vendorPrefix;
      if (!vendorPrefix) {
        return res.status(400).json({
          success: false,
          message: "Vendor prefix not found. Please contact administrator.",
        });
      }

      const price =
        product.discountPrice && product.discountPrice > 0
          ? product.discountPrice
          : product.price;
      barcode = await generateUniqueBarcode(
        vendorPrefix,
        product.name,
        price,
        Product,
        product._id
      );

      // Save the generated barcode
      product.barcode = barcode;
      await product.save();
    }

    // Parse the barcode to get components
    const parsedBarcode = parseBarcode(barcode);

    res.status(200).json({
      success: true,
      data: {
        productId: product._id,
        productName: product.name,
        barcode,
        parsedBarcode,
        vendorName: vendor.businessName,
        currentPrice:
          product.discountPrice && product.discountPrice > 0
            ? product.discountPrice
            : product.price,
      },
      message: "Product barcode retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting product barcode:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get product barcode",
    });
  }
};

/**
 * Regenerate barcode for a product (useful when product details change)
 * PUT /api/v1/barcodes/regenerate/:productId
 */
export const regenerateProductBarcode = async (req, res) => {
  try {
    const { productId } = req.params;
    const {
      forceRegenerate = false,
      regenerateImage = true,
      preserveHistory = true,
      reason = "manual_regeneration",
    } = req.body;

    const userId = req.user?.id || req.user?._id;

    // Use the regeneration service
    const result = await regenerateProductBarcodeService(productId, {
      userId,
      reason,
      forceRegenerate,
      regenerateImage,
      preserveHistory,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    if (result.skipped) {
      return res.status(200).json({
        success: true,
        skipped: true,
        message: result.reason,
        data: {
          productId: result.productId,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        productId: result.productId,
        barcodeId: result.barcodeId,
        oldBarcodeId: result.oldBarcodeId,
        barcodeText: result.barcodeText,
        version: result.version,
        reason: result.reason,
        imageGenerated: result.imageResult && !result.imageResult.error,
        preservedHistory: result.metadata.preservedHistory,
      },
      message: "Barcode regenerated successfully",
    });
  } catch (error) {
    console.error("Error regenerating product barcode:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to regenerate barcode",
    });
  }
};

/**
 * Get all products with their barcodes for a specific vendor
 * GET /api/v1/barcodes/vendor/:vendorId
 */
export const getVendorProductBarcodes = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    // Get products for this vendor with pagination
    const products = await Product.find({ vendorId })
      .select("name price discountPrice barcode createdAt")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalProducts = await Product.countDocuments({ vendorId });

    // Process each product to ensure it has a barcode
    const productsWithBarcodes = [];

    for (const product of products) {
      let barcode = product.barcode;

      if (!barcode) {
        // Generate barcode if it doesn't exist
        const vendorPrefix = vendor.vendorPrefix;
        if (!vendorPrefix) {
          throw new Error(
            "Vendor prefix not found. Please contact administrator."
          );
        }

        const price =
          product.discountPrice && product.discountPrice > 0
            ? product.discountPrice
            : product.price;
        barcode = await generateUniqueBarcode(
          vendorPrefix,
          product.name,
          price,
          Product,
          product._id
        );

        // Save the generated barcode
        product.barcode = barcode;
        await product.save();
      }

      productsWithBarcodes.push({
        productId: product._id,
        productName: product.name,
        barcode,
        price:
          product.discountPrice && product.discountPrice > 0
            ? product.discountPrice
            : product.price,
        originalPrice: product.price,
        discountPrice: product.discountPrice,
        createdAt: product.createdAt,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        vendor: {
          id: vendor._id,
          businessName: vendor.businessName,
        },
        products: productsWithBarcodes,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalProducts / limit),
          totalProducts,
          hasNext: page * limit < totalProducts,
          hasPrev: page > 1,
        },
      },
      message: "Vendor product barcodes retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting vendor product barcodes:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get vendor product barcodes",
    });
  }
};

/**
 * Check if a barcode is unique
 * POST /api/v1/barcodes/check-uniqueness
 */
export const checkBarcodeUniqueness = async (req, res) => {
  try {
    const { barcode, excludeProductId } = req.body;

    if (!barcode) {
      return res.status(400).json({
        success: false,
        message: "Barcode is required",
      });
    }

    // Validate barcode format first
    const formatValid = validateBarcodeFormat(barcode);
    if (!formatValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid barcode format",
      });
    }

    // Check uniqueness
    const isUnique = await isBarcodeUnique(barcode, Product, excludeProductId);

    let conflictingProduct = null;
    if (!isUnique) {
      const query = { barcode: barcode.trim() };
      if (excludeProductId) {
        query._id = { $ne: excludeProductId };
      }
      conflictingProduct = await Product.findOne(query)
        .populate("vendorId", "businessName")
        .select("name vendorId");
    }

    res.status(200).json({
      success: true,
      data: {
        barcode,
        isUnique,
        conflictingProduct: conflictingProduct
          ? {
              id: conflictingProduct._id,
              name: conflictingProduct.name,
              vendorName: conflictingProduct.vendorId?.businessName,
            }
          : null,
      },
      message: isUnique ? "Barcode is unique" : "Barcode already exists",
    });
  } catch (error) {
    console.error("Error checking barcode uniqueness:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to check barcode uniqueness",
    });
  }
};

/**
 * Get comprehensive barcode validation report
 * POST /api/v1/barcodes/validate-comprehensive
 */
export const validateBarcodeComprehensive = async (req, res) => {
  try {
    const { barcode, productData, excludeProductId } = req.body;

    if (!barcode) {
      return res.status(400).json({
        success: false,
        message: "Barcode is required",
      });
    }

    // Format validation
    const formatValid = validateBarcodeFormat(barcode);

    // Business rules validation
    const businessRulesValidation = validateBarcodeBusinessRules(
      barcode,
      productData || {}
    );

    // Uniqueness check
    let isUnique = false;
    let conflictingProduct = null;
    try {
      isUnique = await isBarcodeUnique(barcode, Product, excludeProductId);

      if (!isUnique) {
        const query = { barcode: barcode.trim() };
        if (excludeProductId) {
          query._id = { $ne: excludeProductId };
        }
        conflictingProduct = await Product.findOne(query)
          .populate("vendorId", "businessName")
          .select("name vendorId");
      }
    } catch (error) {
      console.warn("Error checking barcode uniqueness:", error);
    }

    const overallValid =
      formatValid && businessRulesValidation.isValid && isUnique;

    res.status(200).json({
      success: true,
      data: {
        barcode,
        overallValid,
        validation: {
          formatValid,
          businessRulesValid: businessRulesValidation.isValid,
          isUnique,
        },
        parsedData: businessRulesValidation.parsed,
        errors: businessRulesValidation.errors,
        warnings: [],
        conflictingProduct: conflictingProduct
          ? {
              id: conflictingProduct._id,
              name: conflictingProduct.name,
              vendorName: conflictingProduct.vendorId?.businessName,
            }
          : null,
        length: barcode.length,
      },
      message: overallValid
        ? "Barcode passed all validations"
        : "Barcode validation failed",
    });
  } catch (error) {
    console.error("Error validating barcode comprehensively:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to validate barcode",
    });
  }
};

/**
 * Generate barcode image for a specific barcode text
 * POST /api/v1/barcodes/generate-image
 */
export const generateBarcodeImageEndpoint = async (req, res) => {
  try {
    const {
      barcodeText,
      format = "dataURL",
      imageOptions = {},
      productInfo = {},
      useCase = "product",
    } = req.body;

    if (!barcodeText) {
      return res.status(400).json({
        success: false,
        message: "Barcode text is required",
      });
    }

    // Validate barcode text for image generation
    const validation = validateBarcodeForImageGeneration(
      barcodeText,
      imageOptions.format
    );
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid barcode text for image generation",
        errors: validation.errors,
      });
    }

    let barcodeImage;
    const options = {
      ...getDefaultImageOptions(useCase),
      ...imageOptions,
    };

    try {
      if (format === "dataURL") {
        if (Object.keys(productInfo).length > 0) {
          const imageBuffer = generateProductBarcodeImage(
            barcodeText,
            productInfo,
            options
          );
          barcodeImage = `data:image/png;base64,${imageBuffer.toString(
            "base64"
          )}`;
        } else {
          barcodeImage = generateBarcodeDataURL(barcodeText, options);
        }
      } else if (format === "base64") {
        if (Object.keys(productInfo).length > 0) {
          const imageBuffer = generateProductBarcodeImage(
            barcodeText,
            productInfo,
            options
          );
          barcodeImage = imageBuffer.toString("base64");
        } else {
          const imageBuffer = generateBarcodeImage(barcodeText, options);
          barcodeImage = imageBuffer.toString("base64");
        }
      } else if (format === "buffer") {
        if (Object.keys(productInfo).length > 0) {
          barcodeImage = generateProductBarcodeImage(
            barcodeText,
            productInfo,
            options
          );
        } else {
          barcodeImage = generateBarcodeImage(barcodeText, options);
        }

        // Return image directly for buffer format
        res.setHeader("Content-Type", "image/png");
        res.setHeader(
          "Content-Disposition",
          `inline; filename="barcode-${barcodeText}.png"`
        );
        return res.send(barcodeImage);
      }

      res.status(200).json({
        success: true,
        data: {
          barcodeText,
          barcodeImage,
          format,
          validation,
          options: options,
        },
        message: "Barcode image generated successfully",
      });
    } catch (imageError) {
      console.error("Error generating barcode image:", imageError);
      return res.status(500).json({
        success: false,
        message: `Failed to generate barcode image: ${imageError.message}`,
      });
    }
  } catch (error) {
    console.error("Error in barcode image generation:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to generate barcode image",
    });
  }
};

/**
 * Generate multiple barcode images for bulk operations
 * POST /api/v1/barcodes/generate-bulk-images
 */
export const generateBulkBarcodeImages = async (req, res) => {
  try {
    const {
      productIds,
      format = "dataURL",
      imageOptions = {},
      useCase = "product",
    } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Product IDs array is required",
      });
    }

    const results = [];
    const errors = [];
    const options = {
      ...getDefaultImageOptions(useCase),
      ...imageOptions,
    };

    for (const productId of productIds) {
      try {
        // Find the product with vendor information
        const product = await Product.findById(productId).populate("vendorId");
        if (!product) {
          errors.push({
            productId,
            error: "Product not found",
          });
          continue;
        }

        const vendor = product.vendorId;
        if (!vendor) {
          errors.push({
            productId,
            error: "Vendor information not found",
          });
          continue;
        }

        // Generate barcode if it doesn't exist
        let barcode = product.barcode;
        if (!barcode) {
          const vendorPrefix = vendor.vendorPrefix;
          if (!vendorPrefix) {
            throw new Error(
              "Vendor prefix not found. Please contact administrator."
            );
          }

          const price =
            product.discountPrice && product.discountPrice > 0
              ? product.discountPrice
              : product.price;

          barcode = await generateUniqueBarcode(
            vendorPrefix,
            product.name,
            price,
            Product,
            product._id
          );

          // Save the generated barcode
          product.barcode = barcode;
          await product.save();
        }

        // Generate barcode image
        const productInfo = {
          productName: product.name,
          vendorName: vendor.businessName,
          price: `$${(product.discountPrice && product.discountPrice > 0
            ? product.discountPrice
            : product.price
          ).toFixed(2)}`,
          showProductInfo: options.showProductInfo !== false,
        };

        let barcodeImage;
        if (format === "dataURL") {
          const imageBuffer = generateProductBarcodeImage(
            barcode,
            productInfo,
            options
          );
          barcodeImage = `data:image/png;base64,${imageBuffer.toString(
            "base64"
          )}`;
        } else {
          const imageBuffer = generateProductBarcodeImage(
            barcode,
            productInfo,
            options
          );
          barcodeImage = imageBuffer.toString("base64");
        }

        results.push({
          productId: product._id,
          productName: product.name,
          barcode,
          barcodeImage,
          vendorName: vendor.businessName,
        });
      } catch (error) {
        errors.push({
          productId,
          error: error.message,
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        results,
        errors,
        summary: {
          totalRequested: productIds.length,
          successCount: results.length,
          errorCount: errors.length,
        },
        format,
        options,
      },
      message: `Generated ${results.length} barcode images successfully`,
    });
  } catch (error) {
    console.error("Error generating bulk barcode images:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to generate bulk barcode images",
    });
  }
};

/**
 * Get barcode image for an existing product
 * GET /api/v1/barcodes/image/:productId
 */
export const getProductBarcodeImage = async (req, res) => {
  try {
    const { productId } = req.params;
    const {
      format = "dataURL",
      imageOptions = {},
      useCase = "product",
      regenerate = false,
    } = req.query;

    const product = await Product.findById(productId).populate("vendorId");
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const vendor = product.vendorId;
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor information not found for this product",
      });
    }

    // Generate or regenerate barcode if needed
    let barcode = product.barcode;
    if (!barcode || regenerate) {
      const vendorPrefix = vendor.vendorPrefix;
      if (!vendorPrefix) {
        return res.status(400).json({
          success: false,
          message: "Vendor prefix not found. Please contact administrator.",
        });
      }

      const price =
        product.discountPrice && product.discountPrice > 0
          ? product.discountPrice
          : product.price;

      barcode = await generateUniqueBarcode(
        vendorPrefix,
        product.name,
        price,
        Product,
        product._id
      );

      // Save the barcode
      product.barcode = barcode;
      await product.save();
    }

    // Generate barcode image
    const productInfo = {
      productName: product.name,
      vendorName: vendor.businessName,
      price: `$${(product.discountPrice && product.discountPrice > 0
        ? product.discountPrice
        : product.price
      ).toFixed(2)}`,
      showProductInfo: imageOptions.showProductInfo !== "false",
    };

    const options = {
      ...getDefaultImageOptions(useCase),
      ...imageOptions,
    };

    let barcodeImage;
    if (format === "buffer") {
      barcodeImage = generateProductBarcodeImage(barcode, productInfo, options);

      res.setHeader("Content-Type", "image/png");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="barcode-${product.name.replace(
          /[^a-zA-Z0-9]/g,
          "_"
        )}.png"`
      );
      return res.send(barcodeImage);
    } else if (format === "dataURL") {
      const imageBuffer = generateProductBarcodeImage(
        barcode,
        productInfo,
        options
      );
      barcodeImage = `data:image/png;base64,${imageBuffer.toString("base64")}`;
    } else {
      const imageBuffer = generateProductBarcodeImage(
        barcode,
        productInfo,
        options
      );
      barcodeImage = imageBuffer.toString("base64");
    }

    res.status(200).json({
      success: true,
      data: {
        productId: product._id,
        productName: product.name,
        barcode,
        barcodeImage,
        format,
        vendorName: vendor.businessName,
        price:
          product.discountPrice && product.discountPrice > 0
            ? product.discountPrice
            : product.price,
      },
      message: "Product barcode image generated successfully",
    });
  } catch (error) {
    console.error("Error getting product barcode image:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get product barcode image",
    });
  }
};

/**
 * Get supported barcode formats and options
 * GET /api/v1/barcodes/formats
 */
export const getBarcodeFormats = async (req, res) => {
  try {
    const formats = getSupportedBarcodeFormats();
    const useCases = ["product", "inventory", "shipping", "small"];
    const imageFormats = ["dataURL", "base64", "buffer"];

    const defaultOptions = {};
    for (const useCase of useCases) {
      defaultOptions[useCase] = getDefaultImageOptions(useCase);
    }

    res.status(200).json({
      success: true,
      data: {
        barcodeFormats: formats,
        imageFormats,
        useCases,
        defaultOptions,
      },
      message: "Barcode formats and options retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting barcode formats:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get barcode formats",
    });
  }
};

/**
 * Get all barcodes with pagination and filtering
 * GET /api/v1/barcodes
 */
export const getAllBarcodes = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = "",
      vendorId = "",
      hasBarcode = "",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query = {};
    const productQuery = {};

    // Filter by vendor
    if (vendorId) {
      productQuery.vendorId = vendorId;
    }

    // Filter by barcode existence
    if (hasBarcode === "true") {
      productQuery.barcode = { $exists: true, $ne: null, $ne: "" };
    } else if (hasBarcode === "false") {
      productQuery.$or = [
        { barcode: { $exists: false } },
        { barcode: null },
        { barcode: "" },
      ];
    }

    // Search in product name or barcode
    if (search) {
      productQuery.$or = [
        { name: { $regex: search, $options: "i" } },
        { barcode: { $regex: search, $options: "i" } },
      ];
    }

    // Count total documents
    const totalProducts = await Product.countDocuments(productQuery);

    // Get paginated results
    const products = await Product.find(productQuery)
      .populate("vendorId", "businessName vendorPrefix")
      .select("name price discountPrice barcode createdAt updatedAt")
      .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Process results to include barcode information
    const barcodes = products.map((product) => {
      const vendor = product.vendorId;
      let barcodeInfo = null;

      if (product.barcode) {
        try {
          const parsed = parseBarcode(product.barcode);
          const validation = validateBarcodeBusinessRules(product.barcode, {
            price: product.price,
            discountPrice: product.discountPrice,
          });

          barcodeInfo = {
            text: product.barcode,
            parsed,
            isValid: validation.isValid,
            errors: validation.errors,
            length: product.barcode.length,
          };
        } catch (error) {
          barcodeInfo = {
            text: product.barcode,
            isValid: false,
            errors: [`Parsing error: ${error.message}`],
            length: product.barcode.length,
          };
        }
      }

      return {
        productId: product._id,
        productName: product.name,
        price: product.price,
        discountPrice: product.discountPrice,
        vendor: vendor
          ? {
              id: vendor._id,
              businessName: vendor.businessName,
              vendorPrefix: vendor.vendorPrefix,
            }
          : null,
        barcode: barcodeInfo,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        barcodes,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalProducts / limit),
          totalItems: totalProducts,
          itemsPerPage: parseInt(limit),
          hasNext: page * limit < totalProducts,
          hasPrev: page > 1,
        },
        filters: {
          search,
          vendorId,
          hasBarcode,
          sortBy,
          sortOrder,
        },
      },
      message: "Barcodes retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting all barcodes:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get barcodes",
    });
  }
};

/**
 * Update barcode for a product
 * PUT /api/v1/barcodes/product/:productId
 */
export const updateProductBarcode = async (req, res) => {
  try {
    const { productId } = req.params;
    const { barcode, validateOnly = false } = req.body;

    if (!barcode) {
      return res.status(400).json({
        success: false,
        message: "Barcode is required",
      });
    }

    // Find the product
    const product = await Product.findById(productId).populate("vendorId");
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Validate barcode format
    const formatValid = validateBarcodeFormat(barcode);
    if (!formatValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid barcode format",
      });
    }

    // Validate business rules
    const businessValidation = validateBarcodeBusinessRules(barcode, {
      price: product.price,
      discountPrice: product.discountPrice,
    });

    if (!businessValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Barcode validation failed",
        errors: businessValidation.errors,
      });
    }

    // Check uniqueness (excluding current product)
    const isUnique = await isBarcodeUnique(barcode, Product, productId);
    if (!isUnique) {
      return res.status(409).json({
        success: false,
        message: "Barcode already exists for another product",
      });
    }

    // If validateOnly is true, don't save, just return validation results
    if (validateOnly) {
      return res.status(200).json({
        success: true,
        data: {
          barcode,
          validation: {
            formatValid: true,
            businessRulesValid: true,
            isUnique: true,
          },
          parsed: businessValidation.parsed,
        },
        message: "Barcode validation passed",
      });
    }

    // Update the product barcode
    const oldBarcode = product.barcode;
    product.barcode = barcode;
    await product.save();

    res.status(200).json({
      success: true,
      data: {
        productId: product._id,
        productName: product.name,
        oldBarcode,
        newBarcode: barcode,
        vendorName: product.vendorId?.businessName,
        validation: businessValidation,
      },
      message: "Product barcode updated successfully",
    });
  } catch (error) {
    console.error("Error updating product barcode:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update product barcode",
    });
  }
};

/**
 * Delete barcode for a product
 * DELETE /api/v1/barcodes/product/:productId
 */
export const deleteProductBarcode = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId).populate("vendorId");
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const oldBarcode = product.barcode;
    if (!oldBarcode) {
      return res.status(400).json({
        success: false,
        message: "Product does not have a barcode to delete",
      });
    }

    // Clear the barcode
    product.barcode = null;
    await product.save();

    res.status(200).json({
      success: true,
      data: {
        productId: product._id,
        productName: product.name,
        deletedBarcode: oldBarcode,
        vendorName: product.vendorId?.businessName,
      },
      message: "Product barcode deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting product barcode:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete product barcode",
    });
  }
};

/**
 * Search barcodes
 * GET /api/v1/barcodes/search
 */
export const searchBarcodes = async (req, res) => {
  try {
    const {
      q = "",
      type = "all", // 'barcode', 'product', 'vendor', 'all'
      limit = 20,
      includeInvalid = false,
    } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters long",
      });
    }

    const searchQuery = q.trim();
    const productQuery = {};

    // Build search query based on type
    switch (type) {
      case "barcode":
        productQuery.barcode = { $regex: searchQuery, $options: "i" };
        break;
      case "product":
        productQuery.name = { $regex: searchQuery, $options: "i" };
        break;
      case "vendor":
        // We'll need to populate and filter by vendor name
        break;
      case "all":
      default:
        productQuery.$or = [
          { name: { $regex: searchQuery, $options: "i" } },
          { barcode: { $regex: searchQuery, $options: "i" } },
        ];
        break;
    }

    // Find products
    let query = Product.find(productQuery)
      .populate("vendorId", "businessName vendorPrefix")
      .select("name price discountPrice barcode createdAt")
      .limit(parseInt(limit));

    // If searching by vendor, we need to do a more complex query
    if (type === "vendor") {
      const vendors = await Product.aggregate([
        {
          $lookup: {
            from: "vendors",
            localField: "vendorId",
            foreignField: "_id",
            as: "vendor",
          },
        },
        { $unwind: "$vendor" },
        {
          $match: {
            "vendor.businessName": { $regex: searchQuery, $options: "i" },
          },
        },
        {
          $project: {
            name: 1,
            price: 1,
            discountPrice: 1,
            barcode: 1,
            createdAt: 1,
            vendorId: "$vendor",
          },
        },
        { $limit: parseInt(limit) },
      ]);

      const results = vendors.map((product) => {
        let barcodeInfo = null;
        if (product.barcode) {
          try {
            const parsed = parseBarcode(product.barcode);
            const validation = validateBarcodeBusinessRules(product.barcode, {
              price: product.price,
              discountPrice: product.discountPrice,
            });

            if (includeInvalid || validation.isValid) {
              barcodeInfo = {
                text: product.barcode,
                parsed,
                isValid: validation.isValid,
                errors: validation.errors,
              };
            }
          } catch (error) {
            if (includeInvalid) {
              barcodeInfo = {
                text: product.barcode,
                isValid: false,
                errors: [`Parsing error: ${error.message}`],
              };
            }
          }
        }

        return {
          productId: product._id,
          productName: product.name,
          price: product.price,
          discountPrice: product.discountPrice,
          vendor: {
            id: product.vendorId._id,
            businessName: product.vendorId.businessName,
            vendorPrefix: product.vendorId.vendorPrefix,
          },
          barcode: barcodeInfo,
          createdAt: product.createdAt,
        };
      });

      return res.status(200).json({
        success: true,
        data: {
          results,
          searchQuery,
          searchType: type,
          totalResults: results.length,
        },
        message: "Search completed successfully",
      });
    }

    const products = await query;

    // Process results
    const results = [];
    for (const product of products) {
      let barcodeInfo = null;
      if (product.barcode) {
        try {
          const parsed = parseBarcode(product.barcode);
          const validation = validateBarcodeBusinessRules(product.barcode, {
            price: product.price,
            discountPrice: product.discountPrice,
          });

          if (includeInvalid || validation.isValid) {
            barcodeInfo = {
              text: product.barcode,
              parsed,
              isValid: validation.isValid,
              errors: validation.errors,
            };
          }
        } catch (error) {
          if (includeInvalid) {
            barcodeInfo = {
              text: product.barcode,
              isValid: false,
              errors: [`Parsing error: ${error.message}`],
            };
          }
        }
      }

      // Only include if barcode exists and is valid (unless includeInvalid is true)
      if (barcodeInfo) {
        results.push({
          productId: product._id,
          productName: product.name,
          price: product.price,
          discountPrice: product.discountPrice,
          vendor: product.vendorId
            ? {
                id: product.vendorId._id,
                businessName: product.vendorId.businessName,
                vendorPrefix: product.vendorId.vendorPrefix,
              }
            : null,
          barcode: barcodeInfo,
          createdAt: product.createdAt,
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        results,
        searchQuery,
        searchType: type,
        totalResults: results.length,
      },
      message: "Search completed successfully",
    });
  } catch (error) {
    console.error("Error searching barcodes:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to search barcodes",
    });
  }
};

/**
 * Delete multiple barcodes
 * POST /api/v1/barcodes/bulk-delete
 */
export const bulkDeleteBarcodes = async (req, res) => {
  try {
    const { productIds } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Product IDs array is required",
      });
    }

    const results = [];
    const errors = [];

    for (const productId of productIds) {
      try {
        const product = await Product.findById(productId);
        if (!product) {
          errors.push({
            productId,
            error: "Product not found",
          });
          continue;
        }

        const oldBarcode = product.barcode;
        if (!oldBarcode) {
          errors.push({
            productId,
            error: "Product does not have a barcode",
          });
          continue;
        }

        // Clear the barcode
        product.barcode = null;
        await product.save();

        results.push({
          productId: product._id,
          productName: product.name,
          deletedBarcode: oldBarcode,
        });
      } catch (error) {
        errors.push({
          productId,
          error: error.message,
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        results,
        errors,
        summary: {
          totalRequested: productIds.length,
          successCount: results.length,
          errorCount: errors.length,
        },
      },
      message: `Deleted ${results.length} barcodes successfully`,
    });
  } catch (error) {
    console.error("Error bulk deleting barcodes:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to bulk delete barcodes",
    });
  }
};

/**
 * Get barcode statistics
 * GET /api/v1/barcodes/stats
 */
export const getBarcodeStats = async (req, res) => {
  try {
    // Get total products
    const totalProducts = await Product.countDocuments();

    // Get products with barcodes
    const productsWithBarcodes = await Product.countDocuments({
      barcode: { $exists: true, $ne: null, $ne: "" },
    });

    // Get products without barcodes
    const productsWithoutBarcodes = totalProducts - productsWithBarcodes;

    // Get barcode statistics by vendor
    const vendorStats = await Product.aggregate([
      {
        $match: {
          barcode: { $exists: true, $ne: null, $ne: "" },
        },
      },
      {
        $lookup: {
          from: "vendors",
          localField: "vendorId",
          foreignField: "_id",
          as: "vendor",
        },
      },
      { $unwind: "$vendor" },
      {
        $group: {
          _id: "$vendor._id",
          vendorName: { $first: "$vendor.businessName" },
          barcodeCount: { $sum: 1 },
          avgBarcodeLength: { $avg: { $strLenCP: "$barcode" } },
        },
      },
      { $sort: { barcodeCount: -1 } },
      { $limit: 10 },
    ]);

    // Get barcode length distribution
    const lengthDistribution = await Product.aggregate([
      {
        $match: {
          barcode: { $exists: true, $ne: null, $ne: "" },
        },
      },
      {
        $group: {
          _id: { $strLenCP: "$barcode" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Get recent barcode activity
    const recentActivity = await Product.find({
      barcode: { $exists: true, $ne: null, $ne: "" },
    })
      .populate("vendorId", "businessName")
      .select("name barcode createdAt updatedAt")
      .sort({ updatedAt: -1 })
      .limit(10);

    // Validate a sample of barcodes to get validation stats
    const sampleBarcodes = await Product.find({
      barcode: { $exists: true, $ne: null, $ne: "" },
    })
      .select("barcode price discountPrice")
      .limit(100);

    let validBarcodes = 0;
    let invalidBarcodes = 0;

    for (const product of sampleBarcodes) {
      try {
        const validation = validateBarcodeBusinessRules(product.barcode, {
          price: product.price,
          discountPrice: product.discountPrice,
        });
        if (validation.isValid) {
          validBarcodes++;
        } else {
          invalidBarcodes++;
        }
      } catch (error) {
        invalidBarcodes++;
      }
    }

    const validationRate =
      sampleBarcodes.length > 0
        ? ((validBarcodes / sampleBarcodes.length) * 100).toFixed(2)
        : 0;

    // Get storage statistics
    let storageStats = null;
    try {
      storageStats = await getStorageStats();
    } catch (error) {
      console.warn("Failed to get storage stats:", error);
    }

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalProducts,
          productsWithBarcodes,
          productsWithoutBarcodes,
          barcodeCompletionRate: (
            (productsWithBarcodes / totalProducts) *
            100
          ).toFixed(2),
        },
        validation: {
          sampleSize: sampleBarcodes.length,
          validBarcodes,
          invalidBarcodes,
          validationRate: `${validationRate}%`,
        },
        vendorStats,
        lengthDistribution: lengthDistribution.map((item) => ({
          length: item._id,
          count: item.count,
        })),
        recentActivity: recentActivity.map((product) => ({
          productId: product._id,
          productName: product.name,
          barcode: product.barcode,
          vendorName: product.vendorId?.businessName,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        })),
        storage: storageStats || { error: "Storage stats unavailable" },
      },
      message: "Barcode statistics retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting barcode stats:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get barcode statistics",
    });
  }
};

/**
 * Store barcode image with metadata
 * POST /api/v1/barcodes/store-image
 */
export const storeBarcodeImageEndpoint = async (req, res) => {
  try {
    const {
      productId,
      imageOptions = {},
      storageType = "local",
      generateIfNotExists = true,
    } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    // Find the product with vendor information
    const product = await Product.findById(productId).populate("vendorId");
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const vendor = product.vendorId;
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor information not found for this product",
      });
    }

    // Check if barcode already exists
    let barcodeText = product.barcodeData?.barcodeText || product.barcode;

    if (!barcodeText && generateIfNotExists) {
      // Generate new barcode if it doesn't exist
      const vendorPrefix = vendor.vendorPrefix;
      if (vendorPrefix.endsWith("-")) {
        vendorPrefix = vendorPrefix.slice(0, -1);
      }

      if (vendorPrefix === "INV" || vendorPrefix === "VD") {
        vendorPrefix = generateVendorPrefix(
          vendor.businessName,
          vendor._id.toString()
        );
      }

      const price =
        product.discountPrice && product.discountPrice > 0
          ? product.discountPrice
          : product.price;

      barcodeText = await generateUniqueBarcode(
        vendorPrefix,
        product.name,
        price,
        Product,
        product._id
      );

      // Update product with new barcode
      product.barcode = barcodeText;
      await product.save();
    }

    if (!barcodeText) {
      return res.status(400).json({
        success: false,
        message: "Product does not have a barcode and generation is disabled",
      });
    }

    // Prepare product info for image generation
    const productInfo = {
      productName: product.name,
      vendorName: vendor.businessName,
      price: `$${(product.discountPrice && product.discountPrice > 0
        ? product.discountPrice
        : product.price
      ).toFixed(2)}`,
      showProductInfo: imageOptions.showProductInfo !== false,
    };

    // Store barcode image
    const result = await storeBarcodeImage({
      barcodeText,
      productId: product._id,
      vendorId: vendor._id,
      generatedBy: req.user?.id || req.user?._id,
      imageOptions,
      productInfo,
      storageType,
    });

    res.status(200).json({
      success: true,
      data: {
        productId: product._id,
        productName: product.name,
        vendorName: vendor.businessName,
        barcodeId: result.barcode._id,
        barcodeText,
        imageUrl: result.imageUrl,
        storageType: result.storageType,
        metadata: result.metadata,
      },
      message: "Barcode image stored successfully",
    });
  } catch (error) {
    console.error("Error storing barcode image:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to store barcode image",
    });
  }
};

/**
 * Retrieve stored barcode image
 * GET /api/v1/barcodes/image/:barcodeId
 */
export const getStoredBarcodeImage = async (req, res) => {
  try {
    const { barcodeId } = req.params;
    const { format = "buffer" } = req.query;

    const result = await retrieveBarcodeImage(barcodeId, format);

    if (format === "buffer") {
      res.setHeader("Content-Type", result.contentType);
      res.setHeader(
        "Content-Disposition",
        `inline; filename="barcode-${barcodeId}.png"`
      );
      res.setHeader("Cache-Control", "public, max-age=31536000"); // 1 year cache
      return res.send(result.imageBuffer);
    }

    res.status(200).json({
      success: true,
      data: result,
      message: "Barcode image retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving barcode image:", error);
    res.status(404).json({
      success: false,
      message: error.message || "Barcode image not found",
    });
  }
};

/**
 * Delete stored barcode image
 * DELETE /api/v1/barcodes/image/:barcodeId
 */
export const deleteStoredBarcodeImage = async (req, res) => {
  try {
    const { barcodeId } = req.params;

    const success = await deleteBarcodeImage(barcodeId);

    if (success) {
      res.status(200).json({
        success: true,
        message: "Barcode image deleted successfully",
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to delete barcode image",
      });
    }
  } catch (error) {
    console.error("Error deleting barcode image:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete barcode image",
    });
  }
};

/**
 * Regenerate barcode image when product details change
 * POST /api/v1/barcodes/regenerate-image/:productId
 */
export const regenerateBarcodeImageEndpoint = async (req, res) => {
  try {
    const { productId } = req.params;

    const result = await regenerateBarcodeImage(
      productId,
      req.user?.id || req.user?._id
    );

    res.status(200).json({
      success: true,
      data: result,
      message: "Barcode image regenerated successfully",
    });
  } catch (error) {
    console.error("Error regenerating barcode image:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to regenerate barcode image",
    });
  }
};

/**
 * Bulk store barcode images
 * POST /api/v1/barcodes/bulk-store-images
 */
export const bulkStoreBarcodeImagesEndpoint = async (req, res) => {
  try {
    const { productIds, imageOptions = {}, storageType = "local" } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Product IDs array is required",
      });
    }

    // Prepare products data
    const productsData = [];
    const errors = [];

    for (const productId of productIds) {
      try {
        const product = await Product.findById(productId).populate("vendorId");
        if (!product) {
          errors.push({
            productId,
            error: "Product not found",
          });
          continue;
        }

        const vendor = product.vendorId;
        if (!vendor) {
          errors.push({
            productId,
            error: "Vendor information not found",
          });
          continue;
        }

        // Generate barcode if needed
        let barcodeText = product.barcodeData?.barcodeText || product.barcode;
        if (!barcodeText) {
          const vendorPrefix = vendor.vendorPrefix;
          if (vendorPrefix.endsWith("-")) {
            vendorPrefix = vendorPrefix.slice(0, -1);
          }

          if (vendorPrefix === "INV" || vendorPrefix === "VD") {
            vendorPrefix = generateVendorPrefix(
              vendor.businessName,
              vendor._id.toString()
            );
          }

          const price =
            product.discountPrice && product.discountPrice > 0
              ? product.discountPrice
              : product.price;

          barcodeText = await generateUniqueBarcode(
            vendorPrefix,
            product.name,
            price,
            Product,
            product._id
          );

          product.barcode = barcodeText;
          await product.save();
        }

        productsData.push({
          productId: product._id,
          vendorId: vendor._id,
          barcodeText,
          productInfo: {
            productName: product.name,
            vendorName: vendor.businessName,
            price: `$${(product.discountPrice && product.discountPrice > 0
              ? product.discountPrice
              : product.price
            ).toFixed(2)}`,
            showProductInfo: imageOptions.showProductInfo !== false,
          },
        });
      } catch (error) {
        errors.push({
          productId,
          error: error.message,
        });
      }
    }

    // Bulk store images
    const result = await bulkStoreBarcodeImages(
      productsData,
      req.user?.id || req.user?._id,
      { storageType, imageOptions }
    );

    // Combine preparation errors with storage errors
    result.errors = [...errors, ...result.errors];
    result.summary.totalRequested = productIds.length;
    result.summary.errorCount = result.errors.length;

    res.status(200).json({
      success: true,
      data: result,
      message: `Bulk stored ${result.summary.successCount} barcode images successfully`,
    });
  } catch (error) {
    console.error("Error bulk storing barcode images:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to bulk store barcode images",
    });
  }
};

/**
 * Clean up old barcode images
 * POST /api/v1/barcodes/cleanup-images
 */
export const cleanupBarcodeImagesEndpoint = async (req, res) => {
  try {
    const { olderThanDays = 90, dryRun = true } = req.body;

    const result = await cleanupOldBarcodeImages({ olderThanDays, dryRun });

    res.status(200).json({
      success: true,
      data: result,
      message: dryRun
        ? `Found ${result.summary.totalFound} barcode images that would be deleted`
        : `Cleaned up ${result.summary.deletedCount} old barcode images`,
    });
  } catch (error) {
    console.error("Error cleaning up barcode images:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to cleanup barcode images",
    });
  }
};

/**
 * Get barcode storage statistics
 * GET /api/v1/barcodes/storage-stats
 */
export const getBarcodeStorageStats = async (req, res) => {
  try {
    const stats = await getStorageStats();

    res.status(200).json({
      success: true,
      data: stats,
      message: "Barcode storage statistics retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting barcode storage stats:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get barcode storage statistics",
    });
  }
};

// ============= DIRECT BARCODE DOCUMENT MANAGEMENT =============

/**
 * Get all barcode documents with filtering and pagination
 * GET /api/v1/barcodes/documents
 */
export const getAllBarcodeDocuments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      vendorId,
      isActive,
      isValid,
      hasImage,
      sortBy = "createdAt",
      sortOrder = "desc",
      search,
    } = req.query;

    // Build filter query
    const filter = {};

    if (vendorId) {
      filter.vendorId = vendorId;
    }

    if (isActive !== undefined) {
      filter["metadata.isActive"] = isActive === "true";
    }

    if (isValid !== undefined) {
      filter["validation.isValid"] = isValid === "true";
    }

    if (hasImage !== undefined) {
      if (hasImage === "true") {
        filter["imageData.filePath"] = { $exists: true, $ne: null };
      } else {
        filter.$or = [
          { "imageData.filePath": { $exists: false } },
          { "imageData.filePath": null },
        ];
      }
    }

    if (search) {
      filter.$or = [
        { barcodeText: { $regex: search, $options: "i" } },
        { productName: { $regex: search, $options: "i" } },
        { vendorPrefix: { $regex: search, $options: "i" } },
      ];
    }

    // Count total documents
    const totalDocuments = await Barcode.countDocuments(filter);

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Get paginated results
    const barcodes = await Barcode.find(filter)
      .populate("productId", "name status")
      .populate("vendorId", "businessName")
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        barcodes,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalDocuments / limit),
          totalItems: totalDocuments,
          itemsPerPage: parseInt(limit),
          hasNext: page * limit < totalDocuments,
          hasPrev: page > 1,
        },
        filters: {
          vendorId,
          isActive,
          isValid,
          hasImage,
          search,
          sortBy,
          sortOrder,
        },
      },
      message: "Barcode documents retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting barcode documents:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get barcode documents",
    });
  }
};

/**
 * Get a specific barcode document by ID
 * GET /api/v1/barcodes/document/:barcodeId
 */
export const getBarcodeDocument = async (req, res) => {
  try {
    const { barcodeId } = req.params;
    const { includeImage = false } = req.query;

    const barcode = await Barcode.findById(barcodeId)
      .populate("productId", "name price discountPrice status")
      .populate("vendorId", "businessName")
      .populate("metadata.generatedBy", "name email");

    if (!barcode) {
      return res.status(404).json({
        success: false,
        message: "Barcode document not found",
      });
    }

    // Convert to object and handle image data
    const barcodeData = barcode.toObject();

    if (includeImage === "true" && barcodeData.imageData?.filePath) {
      try {
        const imageResult = await retrieveBarcodeImage(barcodeId, "dataURL");
        barcodeData.imageData.dataUrl = imageResult.dataURL;
      } catch (imageError) {
        console.warn("Failed to retrieve barcode image:", imageError);
        barcodeData.imageData.imageError = imageError.message;
      }
    }

    res.status(200).json({
      success: true,
      data: barcodeData,
      message: "Barcode document retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting barcode document:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get barcode document",
    });
  }
};

/**
 * Update barcode document metadata
 * PUT /api/v1/barcodes/document/:barcodeId
 */
export const updateBarcodeDocument = async (req, res) => {
  try {
    const { barcodeId } = req.params;
    const { isActive, notes, customMetadata } = req.body;

    const barcode = await Barcode.findById(barcodeId);
    if (!barcode) {
      return res.status(404).json({
        success: false,
        message: "Barcode document not found",
      });
    }

    // Update allowed fields
    if (isActive !== undefined) {
      barcode.metadata.isActive = isActive;
    }

    if (notes !== undefined) {
      barcode.metadata.notes = notes;
    }

    if (customMetadata && typeof customMetadata === "object") {
      barcode.metadata.customData = {
        ...barcode.metadata.customData,
        ...customMetadata,
      };
    }

    barcode.metadata.lastUpdated = new Date();

    await barcode.save();

    res.status(200).json({
      success: true,
      data: barcode,
      message: "Barcode document updated successfully",
    });
  } catch (error) {
    console.error("Error updating barcode document:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update barcode document",
    });
  }
};

/**
 * Delete barcode document
 * DELETE /api/v1/barcodes/document/:barcodeId
 */
export const deleteBarcodeDocument = async (req, res) => {
  try {
    const { barcodeId } = req.params;

    const success = await deleteBarcodeImage(barcodeId);

    if (success) {
      res.status(200).json({
        success: true,
        message: "Barcode document deleted successfully",
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to delete barcode document",
      });
    }
  } catch (error) {
    console.error("Error deleting barcode document:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete barcode document",
    });
  }
};

/**
 * Get barcode usage analytics
 * GET /api/v1/barcodes/analytics
 */
export const getBarcodeAnalytics = async (req, res) => {
  try {
    const { vendorId, startDate, endDate, groupBy = "day" } = req.query;

    // Build match stage
    const matchStage = {
      "metadata.isActive": true,
    };

    if (vendorId) {
      matchStage.vendorId = new mongoose.Types.ObjectId(vendorId);
    }

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) {
        matchStage.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        matchStage.createdAt.$lte = new Date(endDate);
      }
    }

    // Build aggregation pipeline
    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: {
            $dateToString: {
              format:
                groupBy === "month"
                  ? "%Y-%m"
                  : groupBy === "week"
                  ? "%Y-%U"
                  : "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          barcodesCreated: { $sum: 1 },
          totalPrints: { $sum: "$usage.printCount" },
          uniqueVendors: { $addToSet: "$vendorId" },
          avgPrintCount: { $avg: "$usage.printCount" },
          validBarcodes: {
            $sum: { $cond: ["$validation.isValid", 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          barcodesCreated: 1,
          totalPrints: 1,
          uniqueVendors: { $size: "$uniqueVendors" },
          avgPrintCount: { $round: ["$avgPrintCount", 2] },
          validBarcodes: 1,
          validationRate: {
            $round: [
              {
                $multiply: [
                  { $divide: ["$validBarcodes", "$barcodesCreated"] },
                  100,
                ],
              },
              2,
            ],
          },
        },
      },
      { $sort: { date: 1 } },
    ];

    const analytics = await Barcode.aggregate(pipeline);

    // Get summary statistics
    const summaryPipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalBarcodes: { $sum: 1 },
          totalPrints: { $sum: "$usage.printCount" },
          avgPrintsPerBarcode: { $avg: "$usage.printCount" },
          uniqueVendors: { $addToSet: "$vendorId" },
          validBarcodes: {
            $sum: { $cond: ["$validation.isValid", 1, 0] },
          },
          activeBarcodes: {
            $sum: { $cond: ["$metadata.isActive", 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalBarcodes: 1,
          totalPrints: 1,
          avgPrintsPerBarcode: { $round: ["$avgPrintsPerBarcode", 2] },
          uniqueVendors: { $size: "$uniqueVendors" },
          validBarcodes: 1,
          activeBarcodes: 1,
          validationRate: {
            $round: [
              {
                $multiply: [
                  { $divide: ["$validBarcodes", "$totalBarcodes"] },
                  100,
                ],
              },
              2,
            ],
          },
        },
      },
    ];

    const summary = await Barcode.aggregate(summaryPipeline);

    res.status(200).json({
      success: true,
      data: {
        analytics,
        summary: summary[0] || {
          totalBarcodes: 0,
          totalPrints: 0,
          avgPrintsPerBarcode: 0,
          uniqueVendors: 0,
          validBarcodes: 0,
          activeBarcodes: 0,
          validationRate: 0,
        },
        filters: {
          vendorId,
          startDate,
          endDate,
          groupBy,
        },
      },
      message: "Barcode analytics retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting barcode analytics:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get barcode analytics",
    });
  }
};

/**
 * Bulk update barcode documents
 * PUT /api/v1/barcodes/bulk-update
 */
export const bulkUpdateBarcodeDocuments = async (req, res) => {
  try {
    const { barcodeIds, updates } = req.body;

    if (!barcodeIds || !Array.isArray(barcodeIds) || barcodeIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Barcode IDs array is required",
      });
    }

    if (!updates || typeof updates !== "object") {
      return res.status(400).json({
        success: false,
        message: "Updates object is required",
      });
    }

    const results = [];
    const errors = [];

    for (const barcodeId of barcodeIds) {
      try {
        const barcode = await Barcode.findById(barcodeId);
        if (!barcode) {
          errors.push({
            barcodeId,
            error: "Barcode not found",
          });
          continue;
        }

        // Apply allowed updates
        if (updates.isActive !== undefined) {
          barcode.metadata.isActive = updates.isActive;
        }

        if (updates.notes !== undefined) {
          barcode.metadata.notes = updates.notes;
        }

        if (
          updates.customMetadata &&
          typeof updates.customMetadata === "object"
        ) {
          barcode.metadata.customData = {
            ...barcode.metadata.customData,
            ...updates.customMetadata,
          };
        }

        barcode.metadata.lastUpdated = new Date();

        await barcode.save();

        results.push({
          barcodeId,
          success: true,
          updatedFields: Object.keys(updates),
        });
      } catch (error) {
        errors.push({
          barcodeId,
          error: error.message,
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        results,
        errors,
        summary: {
          totalRequested: barcodeIds.length,
          successCount: results.length,
          errorCount: errors.length,
        },
      },
      message: `Bulk updated ${results.length} barcode documents successfully`,
    });
  } catch (error) {
    console.error("Error bulk updating barcode documents:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to bulk update barcode documents",
    });
  }
};

/**
 * Record barcode print activity
 * POST /api/v1/barcodes/record-print
 */
export const recordBarcodeprint = async (req, res) => {
  try {
    const { barcodeId, quantity = 1, method = "single", notes } = req.body;

    if (!barcodeId) {
      return res.status(400).json({
        success: false,
        message: "Barcode ID is required",
      });
    }

    const barcode = await Barcode.findById(barcodeId);
    if (!barcode) {
      return res.status(404).json({
        success: false,
        message: "Barcode not found",
      });
    }

    // Record print activity
    await barcode.addPrintRecord(
      req.user?.id || req.user?._id,
      quantity,
      method
    );

    res.status(200).json({
      success: true,
      data: {
        barcodeId,
        quantity,
        method,
        totalPrints: barcode.totalPrints,
        lastPrinted: barcode.usage.lastPrinted,
      },
      message: "Barcode print activity recorded successfully",
    });
  } catch (error) {
    console.error("Error recording barcode print:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to record barcode print activity",
    });
  }
};

/**
 * Get barcode print history
 * GET /api/v1/barcodes/print-history/:barcodeId
 */
export const getBarcodePrintHistory = async (req, res) => {
  try {
    const { barcodeId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const barcode = await Barcode.findById(barcodeId)
      .populate("usage.printHistory.printedBy", "name email")
      .lean();

    if (!barcode) {
      return res.status(404).json({
        success: false,
        message: "Barcode not found",
      });
    }

    // Paginate print history
    const printHistory = barcode.usage.printHistory || [];
    const totalRecords = printHistory.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedHistory = printHistory
      .sort((a, b) => new Date(b.printedAt) - new Date(a.printedAt))
      .slice(startIndex, endIndex);

    res.status(200).json({
      success: true,
      data: {
        barcodeId,
        printHistory: paginatedHistory,
        summary: {
          totalPrints: barcode.usage.printCount,
          totalRecords,
          lastPrinted: barcode.usage.lastPrinted,
        },
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalRecords / limit),
          totalItems: totalRecords,
          itemsPerPage: parseInt(limit),
          hasNext: endIndex < totalRecords,
          hasPrev: page > 1,
        },
      },
      message: "Barcode print history retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting barcode print history:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get barcode print history",
    });
  }
};

// ============= ADVANCED BARCODE REGENERATION ENDPOINTS =============

/**
 * Bulk regenerate barcodes for multiple products
 * POST /api/v1/barcodes/bulk-regenerate
 */
export const bulkRegenerateProductBarcodesEndpoint = async (req, res) => {
  try {
    const {
      productIds,
      reason = "bulk_regeneration",
      forceRegenerate = false,
      regenerateImage = true,
      preserveHistory = true,
      concurrency = 5,
      continueOnError = true,
    } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Product IDs array is required",
      });
    }

    const userId = req.user?.id || req.user?._id;

    const result = await bulkRegenerateProductBarcodes(productIds, {
      userId,
      reason,
      forceRegenerate,
      regenerateImage,
      preserveHistory,
      concurrency,
      continueOnError,
    });

    res.status(200).json({
      success: true,
      data: result,
      message: `Bulk regeneration completed: ${result.successCount}/${result.totalRequested} successful`,
    });
  } catch (error) {
    console.error("Error in bulk barcode regeneration:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to bulk regenerate barcodes",
    });
  }
};

/**
 * Regenerate outdated barcodes automatically
 * POST /api/v1/barcodes/regenerate-outdated
 */
export const regenerateOutdatedBarcodesEndpoint = async (req, res) => {
  try {
    const {
      vendorId = null,
      limit = 100,
      reason = "automated_regeneration",
      forceRegenerate = false,
      regenerateImage = true,
      preserveHistory = true,
    } = req.body;

    const userId = req.user?.id || req.user?._id;

    const result = await regenerateOutdatedBarcodes(
      {},
      {
        vendorId,
        limit,
        userId,
        reason,
        forceRegenerate,
        regenerateImage,
        preserveHistory,
      }
    );

    res.status(200).json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (error) {
    console.error("Error regenerating outdated barcodes:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to regenerate outdated barcodes",
    });
  }
};

/**
 * Get barcode regeneration statistics
 * GET /api/v1/barcodes/regeneration-stats
 */
export const getBarcodeRegenerationStatsEndpoint = async (req, res) => {
  try {
    const { vendorId, startDate, endDate } = req.query;

    const result = await getBarcodeRegenerationStats({
      vendorId,
      startDate,
      endDate,
    });

    res.status(200).json({
      success: true,
      data: result.data,
      message: "Barcode regeneration statistics retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting barcode regeneration stats:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get barcode regeneration statistics",
    });
  }
};

/**
 * Toggle automatic barcode regeneration for a product
 * PUT /api/v1/barcodes/auto-regenerate/:productId
 */
export const toggleAutoRegeneration = async (req, res) => {
  try {
    const { productId } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Enabled field must be a boolean",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Initialize barcodeData if it doesn't exist
    if (!product.barcodeData) {
      product.barcodeData = {
        barcodeId: null,
        barcodeText: null,
        hasBarcode: false,
        barcodeGenerated: false,
        lastBarcodeUpdate: null,
        barcodeVersion: 1,
        autoRegenerateEnabled: enabled,
      };
    } else {
      product.barcodeData.autoRegenerateEnabled = enabled;
    }

    await product.save();

    res.status(200).json({
      success: true,
      data: {
        productId,
        autoRegenerateEnabled: enabled,
        hasBarcode: product.barcodeData.hasBarcode,
      },
      message: `Automatic barcode regeneration ${
        enabled ? "enabled" : "disabled"
      } for product`,
    });
  } catch (error) {
    console.error("Error toggling auto-regeneration:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to toggle automatic regeneration",
    });
  }
};

/**
 * Get products that need barcode regeneration
 * GET /api/v1/barcodes/needs-regeneration
 */
export const getProductsNeedingRegeneration = async (req, res) => {
  try {
    const {
      vendorId,
      page = 1,
      limit = 50,
      sortBy = "barcodeData.invalidatedAt",
      sortOrder = "desc",
    } = req.query;

    // Build query for products that need regeneration
    const query = {
      "barcodeData.hasBarcode": true,
      "barcodeData.barcodeGenerated": false,
    };

    if (vendorId) {
      query.vendorId = vendorId;
    }

    // Count total documents
    const totalDocuments = await Product.countDocuments(query);

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Get paginated results
    const products = await Product.find(query)
      .populate("vendorId", "businessName")
      .select("name price discountPrice barcodeData createdAt updatedAt")
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        products,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalDocuments / limit),
          totalItems: totalDocuments,
          itemsPerPage: parseInt(limit),
          hasNext: page * limit < totalDocuments,
          hasPrev: page > 1,
        },
        filters: {
          vendorId,
          sortBy,
          sortOrder,
        },
      },
      message: `Found ${products.length} products needing barcode regeneration`,
    });
  } catch (error) {
    console.error("Error getting products needing regeneration:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get products needing regeneration",
    });
  }
};

// ============= BARCODE INDEX MANAGEMENT ENDPOINTS =============

/**
 * Create optimized barcode indexes
 * POST /api/v1/barcodes/indexes/create
 */
export const createBarcodeIndexesEndpoint = async (req, res) => {
  try {
    const {
      dropExisting = false,
      background = true,
      verbose = false,
    } = req.body;

    const result = await createBarcodeIndexes({
      dropExisting,
      background,
      verbose,
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || "Failed to create barcode indexes",
      });
    }

    res.status(200).json({
      success: true,
      data: result,
      message: `Successfully created ${result.summary.successCount} barcode indexes`,
    });
  } catch (error) {
    console.error("Error creating barcode indexes:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create barcode indexes",
    });
  }
};

/**
 * Analyze barcode index usage and performance
 * GET /api/v1/barcodes/indexes/analyze
 */
export const analyzeBarcodeIndexUsageEndpoint = async (req, res) => {
  try {
    const result = await analyzeBarcodeIndexUsage();

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || "Failed to analyze barcode index usage",
      });
    }

    res.status(200).json({
      success: true,
      data: result.data,
      message: "Barcode index usage analysis completed successfully",
    });
  } catch (error) {
    console.error("Error analyzing barcode index usage:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to analyze barcode index usage",
    });
  }
};

/**
 * Optimize barcode indexes
 * POST /api/v1/barcodes/indexes/optimize
 */
export const optimizeBarcodeIndexesEndpoint = async (req, res) => {
  try {
    const { removeUnused = false, verbose = false } = req.body;

    const result = await optimizeBarcodeIndexes({
      removeUnused,
      verbose,
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || "Failed to optimize barcode indexes",
      });
    }

    res.status(200).json({
      success: true,
      data: result,
      message: `Barcode index optimization completed with ${result.optimizations.length} changes`,
    });
  } catch (error) {
    console.error("Error optimizing barcode indexes:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to optimize barcode indexes",
    });
  }
};

/**
 * Get comprehensive barcode index information
 * GET /api/v1/barcodes/indexes/info
 */
export const getBarcodeIndexInfoEndpoint = async (req, res) => {
  try {
    const result = await getBarcodeIndexInfo();

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || "Failed to get barcode index information",
      });
    }

    res.status(200).json({
      success: true,
      data: result.data,
      message: "Barcode index information retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting barcode index info:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get barcode index information",
    });
  }
};

/**
 * Get barcode query performance metrics
 * GET /api/v1/barcodes/indexes/performance
 */
export const getBarcodeQueryPerformanceEndpoint = async (req, res) => {
  try {
    const {
      testQueries = true,
      includeExplain = false,
      sampleSize = 100,
    } = req.query;

    // Test common query patterns and measure performance
    const performanceTests = [];

    if (testQueries === "true") {
      const startTime = Date.now();

      // Test 1: Barcode lookup by text
      const barcodeTextTest = await Barcode.findOne({
        barcodeText: { $exists: true },
      }).explain(includeExplain === "true" ? "executionStats" : "queryPlanner");

      performanceTests.push({
        test: "barcode_text_lookup",
        executionTimeMs: Date.now() - startTime,
        indexUsed:
          barcodeTextTest.executionStats?.executionStages?.indexName ||
          barcodeTextTest.queryPlanner?.winningPlan?.inputStage?.indexName,
        explain: includeExplain === "true" ? barcodeTextTest : null,
      });

      // Test 2: Vendor barcode search
      const vendorSearchTest = await Barcode.find({
        vendorId: { $exists: true },
        "metadata.isActive": true,
      })
        .limit(parseInt(sampleSize))
        .explain(includeExplain === "true" ? "executionStats" : "queryPlanner");

      performanceTests.push({
        test: "vendor_barcode_search",
        indexUsed:
          vendorSearchTest.executionStats?.executionStages?.indexName ||
          vendorSearchTest.queryPlanner?.winningPlan?.inputStage?.indexName,
        explain: includeExplain === "true" ? vendorSearchTest : null,
      });

      // Test 3: Product regeneration queue
      const regenerationQueueTest = await Product.find({
        "barcodeData.hasBarcode": true,
        "barcodeData.barcodeGenerated": false,
      })
        .limit(parseInt(sampleSize))
        .explain(includeExplain === "true" ? "executionStats" : "queryPlanner");

      performanceTests.push({
        test: "regeneration_queue_search",
        indexUsed:
          regenerationQueueTest.executionStats?.executionStages?.indexName ||
          regenerationQueueTest.queryPlanner?.winningPlan?.inputStage
            ?.indexName,
        explain: includeExplain === "true" ? regenerationQueueTest : null,
      });
    }

    // Get index statistics
    const indexInfo = await getBarcodeIndexInfo();

    res.status(200).json({
      success: true,
      data: {
        performanceTests,
        indexInfo: indexInfo.success ? indexInfo.data : null,
        testConfig: {
          testQueries: testQueries === "true",
          includeExplain: includeExplain === "true",
          sampleSize: parseInt(sampleSize),
        },
      },
      message: "Barcode query performance metrics retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting barcode query performance:", error);
    res.status(500).json({
      success: false,
      message:
        error.message || "Failed to get barcode query performance metrics",
    });
  }
};
