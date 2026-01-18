import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import {
  generateBarcodeImage,
  generateBarcodeDataURL,
  generateProductBarcodeImage,
  getDefaultImageOptions,
} from "../utils/barcodeImageUtils.js";
import Barcode from "../models/Barcode.js";
import Product from "../models/Product.js";

/**
 * Barcode Image Storage Service
 * Handles storage, retrieval, and management of barcode images
 * Supports local storage with extensibility for cloud providers
 */

// Storage configuration
const STORAGE_CONFIG = {
  local: {
    enabled: true,
    baseDir: process.env.BARCODE_STORAGE_DIR || "./uploads/barcodes",
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedFormats: ["png", "jpeg", "jpg"],
  },
  cloudinary: {
    enabled: process.env.CLOUDINARY_ENABLED === "true",
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    folder: process.env.CLOUDINARY_BARCODE_FOLDER || "barcodes",
  },
  aws: {
    enabled: process.env.AWS_S3_ENABLED === "true",
    region: process.env.AWS_REGION || "us-east-1",
    bucket: process.env.AWS_S3_BARCODE_BUCKET,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    folder: process.env.AWS_S3_BARCODE_FOLDER || "barcodes",
  },
};

/**
 * Generate a unique filename for barcode image
 * @param {string} barcodeText - The barcode text
 * @param {string} format - Image format (png, jpeg, jpg)
 * @param {string} productId - Optional product ID for uniqueness
 * @returns {string} Unique filename
 */
export const generateBarcodeFilename = (
  barcodeText,
  format = "png",
  productId = null
) => {
  // Create a hash from barcode text and product ID for uniqueness
  const hash = crypto
    .createHash("md5")
    .update(`${barcodeText}-${productId || ""}-${Date.now()}`)
    .digest("hex");

  // Sanitize barcode text for filename
  const sanitizedBarcode = barcodeText
    .replace(/[^a-zA-Z0-9\-]/g, "_")
    .substring(0, 20);

  return `${sanitizedBarcode}_${hash.substring(0, 8)}.${format}`;
};

/**
 * Ensure storage directories exist
 * @param {string} storagePath - Path to create
 */
export const ensureStorageDirectories = async (storagePath) => {
  try {
    await fs.mkdir(storagePath, { recursive: true });
  } catch (error) {
    if (error.code !== "EEXIST") {
      throw new Error(`Failed to create storage directory: ${error.message}`);
    }
  }
};

/**
 * Save barcode image to local storage
 * @param {Buffer} imageBuffer - Image buffer
 * @param {string} filename - Filename
 * @param {string} subfolder - Optional subfolder
 * @returns {Promise<string>} File path
 */
export const saveToLocalStorage = async (
  imageBuffer,
  filename,
  subfolder = ""
) => {
  if (!STORAGE_CONFIG.local.enabled) {
    throw new Error("Local storage is disabled");
  }

  const baseDir = STORAGE_CONFIG.local.baseDir;
  const fullDir = subfolder ? path.join(baseDir, subfolder) : baseDir;
  const filePath = path.join(fullDir, filename);

  // Ensure directory exists
  await ensureStorageDirectories(fullDir);

  // Check file size
  if (imageBuffer.length > STORAGE_CONFIG.local.maxFileSize) {
    throw new Error(
      `Image size ${imageBuffer.length} bytes exceeds maximum allowed size of ${STORAGE_CONFIG.local.maxFileSize} bytes`
    );
  }

  // Save file
  await fs.writeFile(filePath, imageBuffer);

  return filePath;
};

/**
 * Read barcode image from local storage
 * @param {string} filePath - File path
 * @returns {Promise<Buffer>} Image buffer
 */
export const readFromLocalStorage = async (filePath) => {
  try {
    const imageBuffer = await fs.readFile(filePath);
    return imageBuffer;
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error("Barcode image file not found");
    }
    throw new Error(`Failed to read barcode image: ${error.message}`);
  }
};

/**
 * Delete barcode image from local storage
 * @param {string} filePath - File path
 * @returns {Promise<boolean>} Success status
 */
export const deleteFromLocalStorage = async (filePath) => {
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      return true; // File already doesn't exist
    }
    console.warn(`Failed to delete barcode image file: ${error.message}`);
    return false;
  }
};

/**
 * Store barcode image with metadata
 * @param {Object} params - Storage parameters
 * @param {string} params.barcodeText - Barcode text
 * @param {string} params.productId - Product ID
 * @param {string} params.vendorId - Vendor ID
 * @param {string} params.generatedBy - User ID who generated the barcode
 * @param {Object} params.imageOptions - Image generation options
 * @param {Object} params.productInfo - Product information for styling
 * @param {string} params.storageType - Storage type ('local', 'cloudinary', 's3')
 * @returns {Promise<Object>} Storage result with barcode document
 */
export const storeBarcodeImage = async ({
  barcodeText,
  productId,
  vendorId,
  generatedBy,
  imageOptions = {},
  productInfo = {},
  storageType = "local",
}) => {
  try {
    // Parse barcode components
    const barcodeComponents = parseBarcodeComponents(barcodeText);

    // Generate image buffer
    const finalImageOptions = {
      ...getDefaultImageOptions("product"),
      ...imageOptions,
    };

    let imageBuffer;
    if (Object.keys(productInfo).length > 0) {
      imageBuffer = generateProductBarcodeImage(
        barcodeText,
        productInfo,
        finalImageOptions
      );
    } else {
      imageBuffer = generateBarcodeImage(barcodeText, finalImageOptions);
    }

    // Generate filename
    const filename = generateBarcodeFilename(barcodeText, "png", productId);
    let filePath = null;
    let imageUrl = null;
    let storageMetadata = {};

    // Store based on storage type
    switch (storageType) {
      case "local":
        filePath = await saveToLocalStorage(
          imageBuffer,
          filename,
          `${new Date().getFullYear()}/${new Date().getMonth() + 1}`
        );
        imageUrl = `/api/v1/barcodes/image-file/${path.basename(filePath)}`;
        storageMetadata = {
          storageType: "local",
          filePath,
          filename,
          size: imageBuffer.length,
        };
        break;

      case "cloudinary":
        if (!STORAGE_CONFIG.cloudinary.enabled) {
          throw new Error("Cloudinary storage is not configured");
        }
        // TODO: Implement Cloudinary upload
        throw new Error("Cloudinary storage not yet implemented");

      case "s3":
        if (!STORAGE_CONFIG.aws.enabled) {
          throw new Error("AWS S3 storage is not configured");
        }
        // TODO: Implement S3 upload
        throw new Error("AWS S3 storage not yet implemented");

      default:
        throw new Error(`Unsupported storage type: ${storageType}`);
    }

    // Create or update Barcode document
    let barcodeDoc = await Barcode.findOne({ productId, vendorId });

    if (barcodeDoc) {
      // Update existing barcode
      barcodeDoc.barcodeText = barcodeText;
      barcodeDoc.vendorPrefix = barcodeComponents.vendorPrefix;
      barcodeDoc.productName = barcodeComponents.productName;
      barcodeDoc.price = barcodeComponents.price;
      barcodeDoc.formattedPrice = barcodeComponents.formattedPrice;
      barcodeDoc.imageData = {
        dataUrl: null, // Don't store large data URLs
        width: finalImageOptions.width || 300,
        height: finalImageOptions.height || 120,
        format: "png",
        options: finalImageOptions,
        ...storageMetadata,
      };
      barcodeDoc.metadata.lastUpdated = new Date();
      barcodeDoc.metadata.version += 1;
    } else {
      // Create new barcode document
      barcodeDoc = new Barcode({
        productId,
        vendorId,
        barcodeText,
        vendorPrefix: barcodeComponents.vendorPrefix,
        productName: barcodeComponents.productName,
        price: barcodeComponents.price,
        formattedPrice: barcodeComponents.formattedPrice,
        imageData: {
          dataUrl: null,
          width: finalImageOptions.width || 300,
          height: finalImageOptions.height || 120,
          format: "png",
          options: finalImageOptions,
          ...storageMetadata,
        },
        metadata: {
          generatedBy,
          generatedAt: new Date(),
          lastUpdated: new Date(),
          version: 1,
          isActive: true,
        },
        usage: {
          printCount: 0,
          printHistory: [],
        },
        validation: {
          isValid: true,
          validationErrors: [],
          lastValidated: new Date(),
        },
      });
    }

    await barcodeDoc.save();

    // Update Product model with barcode reference
    await Product.findByIdAndUpdate(productId, {
      $set: {
        "barcodeData.barcodeId": barcodeDoc._id,
        "barcodeData.barcodeText": barcodeText,
        "barcodeData.hasBarcode": true,
        "barcodeData.barcodeGenerated": true,
        "barcodeData.lastBarcodeUpdate": new Date(),
      },
    });

    return {
      success: true,
      barcode: barcodeDoc,
      imageUrl,
      filePath,
      storageType,
      metadata: storageMetadata,
    };
  } catch (error) {
    throw new Error(`Failed to store barcode image: ${error.message}`);
  }
};

/**
 * Retrieve barcode image
 * @param {string} barcodeId - Barcode document ID
 * @param {string} format - Return format ('buffer', 'base64', 'dataURL', 'url')
 * @returns {Promise<Object>} Image data
 */
export const retrieveBarcodeImage = async (barcodeId, format = "buffer") => {
  try {
    const barcodeDoc = await Barcode.findById(barcodeId).populate(
      "product vendor"
    );
    if (!barcodeDoc) {
      throw new Error("Barcode not found");
    }

    const { imageData } = barcodeDoc;
    if (!imageData || !imageData.filePath) {
      throw new Error("Barcode image not found in storage");
    }

    let imageBuffer;
    switch (imageData.storageType) {
      case "local":
        imageBuffer = await readFromLocalStorage(imageData.filePath);
        break;

      case "cloudinary":
        // TODO: Implement Cloudinary retrieval
        throw new Error("Cloudinary retrieval not yet implemented");

      case "s3":
        // TODO: Implement S3 retrieval
        throw new Error("S3 retrieval not yet implemented");

      default:
        throw new Error(`Unsupported storage type: ${imageData.storageType}`);
    }

    // Return in requested format
    switch (format) {
      case "buffer":
        return {
          imageBuffer,
          contentType: `image/${imageData.format}`,
          metadata: barcodeDoc.toObject(),
        };

      case "base64":
        return {
          base64: imageBuffer.toString("base64"),
          contentType: `image/${imageData.format}`,
          metadata: barcodeDoc.toObject(),
        };

      case "dataURL":
        return {
          dataURL: `data:image/${
            imageData.format
          };base64,${imageBuffer.toString("base64")}`,
          metadata: barcodeDoc.toObject(),
        };

      case "url":
        return {
          imageUrl: `/api/v1/barcodes/image/${barcodeId}`,
          metadata: barcodeDoc.toObject(),
        };

      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  } catch (error) {
    throw new Error(`Failed to retrieve barcode image: ${error.message}`);
  }
};

/**
 * Delete barcode image and metadata
 * @param {string} barcodeId - Barcode document ID
 * @returns {Promise<boolean>} Success status
 */
export const deleteBarcodeImage = async (barcodeId) => {
  try {
    const barcodeDoc = await Barcode.findById(barcodeId);
    if (!barcodeDoc) {
      return true; // Already doesn't exist
    }

    const { imageData } = barcodeDoc;

    // Delete image file
    if (imageData && imageData.filePath) {
      switch (imageData.storageType) {
        case "local":
          await deleteFromLocalStorage(imageData.filePath);
          break;

        case "cloudinary":
          // TODO: Implement Cloudinary deletion
          console.warn("Cloudinary deletion not yet implemented");
          break;

        case "s3":
          // TODO: Implement S3 deletion
          console.warn("S3 deletion not yet implemented");
          break;
      }
    }

    // Remove barcode document
    await Barcode.findByIdAndDelete(barcodeId);

    // Update Product model
    if (barcodeDoc.productId) {
      await Product.findByIdAndUpdate(barcodeDoc.productId, {
        $set: {
          "barcodeData.barcodeId": null,
          "barcodeData.barcodeText": null,
          "barcodeData.hasBarcode": false,
          "barcodeData.barcodeGenerated": false,
          "barcodeData.lastBarcodeUpdate": new Date(),
        },
      });
    }

    return true;
  } catch (error) {
    console.error(`Failed to delete barcode image: ${error.message}`);
    return false;
  }
};

/**
 * Regenerate barcode image when product details change
 * @param {string} productId - Product ID
 * @param {string} generatedBy - User ID who initiated regeneration
 * @returns {Promise<Object>} Regeneration result
 */
export const regenerateBarcodeImage = async (productId, generatedBy) => {
  try {
    const product = await Product.findById(productId).populate("vendorId");
    if (!product) {
      throw new Error("Product not found");
    }

    const vendor = product.vendorId;
    if (!vendor) {
      throw new Error("Vendor not found for product");
    }

    // Check if product has existing barcode
    const existingBarcode = await Barcode.findOne({ productId });
    if (existingBarcode) {
      // Delete existing image
      await deleteBarcodeImage(existingBarcode._id);
    }

    // Generate new barcode text (assuming you have a function for this)
    const { generateUniqueBarcode } = await import("../utils/barcodeUtils.js");

    const vendorPrefix = vendor.vendorPrefix;
    if (!vendorPrefix) {
      throw new Error("Vendor prefix not found. Please contact administrator.");
    }

    const price =
      product.discountPrice && product.discountPrice > 0
        ? product.discountPrice
        : product.price;

    const newBarcodeText = await generateUniqueBarcode(
      vendorPrefix,
      product.name,
      price,
      Product,
      productId
    );

    // Store new barcode image
    const productInfo = {
      productName: product.name,
      vendorName: vendor.businessName,
      price: `$${price.toFixed(2)}`,
      showProductInfo: true,
    };

    const result = await storeBarcodeImage({
      barcodeText: newBarcodeText,
      productId,
      vendorId: vendor._id,
      generatedBy,
      productInfo,
    });

    return {
      success: true,
      oldBarcodeText: existingBarcode?.barcodeText || null,
      newBarcodeText,
      ...result,
    };
  } catch (error) {
    throw new Error(`Failed to regenerate barcode image: ${error.message}`);
  }
};

/**
 * Bulk store barcode images
 * @param {Array} products - Array of product objects with barcode details
 * @param {string} generatedBy - User ID who generated the barcodes
 * @param {Object} options - Bulk operation options
 * @returns {Promise<Object>} Bulk operation result
 */
export const bulkStoreBarcodeImages = async (
  products,
  generatedBy,
  options = {}
) => {
  const results = [];
  const errors = [];
  const { storageType = "local", imageOptions = {} } = options;

  for (const productData of products) {
    try {
      const {
        productId,
        vendorId,
        barcodeText,
        productInfo = {},
      } = productData;

      const result = await storeBarcodeImage({
        barcodeText,
        productId,
        vendorId,
        generatedBy,
        imageOptions,
        productInfo,
        storageType,
      });

      results.push({
        productId,
        success: true,
        barcodeId: result.barcode._id,
        imageUrl: result.imageUrl,
      });
    } catch (error) {
      errors.push({
        productId: productData.productId,
        error: error.message,
      });
    }
  }

  return {
    success: true,
    results,
    errors,
    summary: {
      totalRequested: products.length,
      successCount: results.length,
      errorCount: errors.length,
    },
  };
};

/**
 * Clean up old barcode images
 * @param {Object} options - Cleanup options
 * @param {number} options.olderThanDays - Delete images older than this many days
 * @param {boolean} options.dryRun - Only report what would be deleted
 * @returns {Promise<Object>} Cleanup result
 */
export const cleanupOldBarcodeImages = async (options = {}) => {
  const { olderThanDays = 90, dryRun = false } = options;
  const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

  try {
    // Find old barcode documents
    const oldBarcodes = await Barcode.find({
      "metadata.isActive": false,
      "metadata.lastUpdated": { $lt: cutoffDate },
    });

    const results = [];
    let deletedCount = 0;
    let errorCount = 0;

    for (const barcodeDoc of oldBarcodes) {
      try {
        if (!dryRun) {
          await deleteBarcodeImage(barcodeDoc._id);
          deletedCount++;
        }

        results.push({
          barcodeId: barcodeDoc._id,
          barcodeText: barcodeDoc.barcodeText,
          lastUpdated: barcodeDoc.metadata.lastUpdated,
          action: dryRun ? "would_delete" : "deleted",
        });
      } catch (error) {
        errorCount++;
        results.push({
          barcodeId: barcodeDoc._id,
          barcodeText: barcodeDoc.barcodeText,
          error: error.message,
          action: "error",
        });
      }
    }

    return {
      success: true,
      dryRun,
      cutoffDate,
      summary: {
        totalFound: oldBarcodes.length,
        deletedCount,
        errorCount,
      },
      results,
    };
  } catch (error) {
    throw new Error(`Failed to cleanup old barcode images: ${error.message}`);
  }
};

/**
 * Get storage statistics
 * @returns {Promise<Object>} Storage statistics
 */
export const getStorageStats = async () => {
  try {
    // Get barcode counts by storage type
    const storageStats = await Barcode.aggregate([
      {
        $group: {
          _id: "$imageData.storageType",
          count: { $sum: 1 },
          totalSize: { $sum: "$imageData.size" },
          avgSize: { $avg: "$imageData.size" },
        },
      },
    ]);

    // Get total storage usage
    const totalStats = await Barcode.aggregate([
      {
        $group: {
          _id: null,
          totalBarcodes: { $sum: 1 },
          totalSize: { $sum: "$imageData.size" },
          avgSize: { $avg: "$imageData.size" },
          activeBarcodes: {
            $sum: { $cond: ["$metadata.isActive", 1, 0] },
          },
        },
      },
    ]);

    // Get storage health metrics
    const healthMetrics = {
      storageTypes: storageStats.map((stat) => ({
        type: stat._id || "unknown",
        count: stat.count,
        totalSize: stat.totalSize || 0,
        avgSize: Math.round(stat.avgSize || 0),
        sizeFormatted: formatBytes(stat.totalSize || 0),
      })),
      overall: totalStats[0]
        ? {
            totalBarcodes: totalStats[0].totalBarcodes,
            totalSize: totalStats[0].totalSize || 0,
            avgSize: Math.round(totalStats[0].avgSize || 0),
            activeBarcodes: totalStats[0].activeBarcodes,
            sizeFormatted: formatBytes(totalStats[0].totalSize || 0),
          }
        : {
            totalBarcodes: 0,
            totalSize: 0,
            avgSize: 0,
            activeBarcodes: 0,
            sizeFormatted: "0 B",
          },
    };

    return {
      success: true,
      ...healthMetrics,
      config: {
        local: {
          enabled: STORAGE_CONFIG.local.enabled,
          baseDir: STORAGE_CONFIG.local.baseDir,
          maxFileSize: STORAGE_CONFIG.local.maxFileSize,
          maxFileSizeFormatted: formatBytes(STORAGE_CONFIG.local.maxFileSize),
        },
        cloudinary: {
          enabled: STORAGE_CONFIG.cloudinary.enabled,
        },
        aws: {
          enabled: STORAGE_CONFIG.aws.enabled,
        },
      },
    };
  } catch (error) {
    throw new Error(`Failed to get storage stats: ${error.message}`);
  }
};

/**
 * Helper function to parse barcode components
 * @param {string} barcodeText - Barcode text
 * @returns {Object} Parsed components
 */
const parseBarcodeComponents = (barcodeText) => {
  const parts = barcodeText.split("-");
  if (parts.length < 3) {
    throw new Error("Invalid barcode format");
  }

  const vendorPrefix = parts[0];
  const pricePart = parts[parts.length - 1];
  const productName = parts.slice(1, -1).join("-");

  // Extract price
  const priceMatch = pricePart.match(/(\d+\.\d{2})\$$/);
  if (!priceMatch) {
    throw new Error("Invalid price format in barcode");
  }

  const price = parseFloat(priceMatch[1]);
  const formattedPrice = pricePart;

  return {
    vendorPrefix,
    productName,
    price,
    formattedPrice,
  };
};

/**
 * Helper function to format bytes
 * @param {number} bytes - Bytes to format
 * @returns {string} Formatted string
 */
const formatBytes = (bytes) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export default {
  storeBarcodeImage,
  retrieveBarcodeImage,
  deleteBarcodeImage,
  regenerateBarcodeImage,
  bulkStoreBarcodeImages,
  cleanupOldBarcodeImages,
  getStorageStats,
  generateBarcodeFilename,
  ensureStorageDirectories,
  saveToLocalStorage,
  readFromLocalStorage,
  deleteFromLocalStorage,
};
