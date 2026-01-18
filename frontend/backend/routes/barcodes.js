import express from "express";
import {
  generateProductBarcode,
  generateBulkBarcodes,
  validateBarcode,
  getProductBarcode,
  regenerateProductBarcode,
  getVendorProductBarcodes,
  checkBarcodeUniqueness,
  validateBarcodeComprehensive,
  generateBarcodeImageEndpoint,
  generateBulkBarcodeImages,
  getProductBarcodeImage,
  getBarcodeFormats,
  getAllBarcodes,
  updateProductBarcode,
  deleteProductBarcode,
  searchBarcodes,
  bulkDeleteBarcodes,
  getBarcodeStats,
  // New storage-related endpoints
  storeBarcodeImageEndpoint,
  getStoredBarcodeImage,
  deleteStoredBarcodeImage,
  regenerateBarcodeImageEndpoint,
  bulkStoreBarcodeImagesEndpoint,
  cleanupBarcodeImagesEndpoint,
  getBarcodeStorageStats,
  // Direct barcode document management endpoints
  getAllBarcodeDocuments,
  getBarcodeDocument,
  updateBarcodeDocument,
  deleteBarcodeDocument,
  getBarcodeAnalytics,
  bulkUpdateBarcodeDocuments,
  recordBarcodeprint,
  getBarcodePrintHistory,
  // Advanced regeneration endpoints
  bulkRegenerateProductBarcodesEndpoint,
  regenerateOutdatedBarcodesEndpoint,
  getBarcodeRegenerationStatsEndpoint,
  toggleAutoRegeneration,
  getProductsNeedingRegeneration,
  // Index management endpoints
  createBarcodeIndexesEndpoint,
  analyzeBarcodeIndexUsageEndpoint,
  optimizeBarcodeIndexesEndpoint,
  getBarcodeIndexInfoEndpoint,
  getBarcodeQueryPerformanceEndpoint,
} from "../controllers/barcodeController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

// Apply authentication and admin authorization middleware to all routes
router.use(protect);
router.use(authorize("superadmin", "vendor"));

/**
 * @route GET /api/v1/barcodes
 * @desc Get all barcodes with pagination and filtering
 * @access Private (Super Admin only)
 */
router.get("/", getAllBarcodes);

/**
 * @route GET /api/v1/barcodes/search
 * @desc Search barcodes by text, product, or vendor
 * @access Private (Super Admin only)
 */
router.get("/search", searchBarcodes);

/**
 * @route GET /api/v1/barcodes/stats
 * @desc Get barcode statistics and analytics
 * @access Private (Super Admin only)
 */
router.get("/stats", getBarcodeStats);

/**
 * @route POST /api/v1/barcodes/generate
 * @desc Generate a barcode for a specific product
 * @access Private (Super Admin only)
 */
router.post("/generate", generateProductBarcode);

/**
 * @route POST /api/v1/barcodes/generate-bulk
 * @desc Generate barcodes for multiple products
 * @access Private (Super Admin only)
 */
router.post("/generate-bulk", generateBulkBarcodes);

/**
 * @route POST /api/v1/barcodes/bulk-delete
 * @desc Delete multiple barcodes
 * @access Private (Super Admin only)
 */
router.post("/bulk-delete", bulkDeleteBarcodes);

/**
 * @route POST /api/v1/barcodes/validate
 * @desc Validate a barcode format
 * @access Private (Super Admin only)
 */
router.post("/validate", validateBarcode);

/**
 * @route GET /api/v1/barcodes/product/:productId
 * @desc Get barcode information for a specific product
 * @access Private (Super Admin only)
 */
router.get("/product/:productId", getProductBarcode);

/**
 * @route PUT /api/v1/barcodes/product/:productId
 * @desc Update barcode for a specific product
 * @access Private (Super Admin only)
 */
router.put("/product/:productId", updateProductBarcode);

/**
 * @route DELETE /api/v1/barcodes/product/:productId
 * @desc Delete barcode for a specific product
 * @access Private (Super Admin only)
 */
router.delete("/product/:productId", deleteProductBarcode);

/**
 * @route PUT /api/v1/barcodes/regenerate/:productId
 * @desc Regenerate barcode for a product
 * @access Private (Super Admin only)
 */
router.put("/regenerate/:productId", regenerateProductBarcode);

/**
 * @route GET /api/v1/barcodes/vendor/:vendorId
 * @desc Get all products with barcodes for a specific vendor
 * @access Private (Super Admin only)
 */
router.get("/vendor/:vendorId", getVendorProductBarcodes);

/**
 * @route POST /api/v1/barcodes/check-uniqueness
 * @desc Check if a barcode is unique in the system
 * @access Private (Super Admin only)
 */
router.post("/check-uniqueness", checkBarcodeUniqueness);

/**
 * @route POST /api/v1/barcodes/validate-comprehensive
 * @desc Get comprehensive validation report for a barcode
 * @access Private (Super Admin only)
 */
router.post("/validate-comprehensive", validateBarcodeComprehensive);

/**
 * @route POST /api/v1/barcodes/generate-image
 * @desc Generate barcode image for specific barcode text
 * @access Private (Super Admin only)
 */
router.post("/generate-image", generateBarcodeImageEndpoint);

/**
 * @route POST /api/v1/barcodes/generate-bulk-images
 * @desc Generate multiple barcode images for bulk operations
 * @access Private (Super Admin only)
 */
router.post("/generate-bulk-images", generateBulkBarcodeImages);

/**
 * @route GET /api/v1/barcodes/image/:productId
 * @desc Get barcode image for an existing product
 * @access Private (Super Admin only)
 */
router.get("/image/:productId", getProductBarcodeImage);

/**
 * @route GET /api/v1/barcodes/formats
 * @desc Get supported barcode formats and options
 * @access Private (Super Admin only)
 */
router.get("/formats", getBarcodeFormats);

// ============= BARCODE IMAGE STORAGE ROUTES =============

/**
 * @route POST /api/v1/barcodes/store-image
 * @desc Store barcode image with metadata in persistent storage
 * @access Private (Super Admin only)
 */
router.post("/store-image", storeBarcodeImageEndpoint);

/**
 * @route GET /api/v1/barcodes/stored-image/:barcodeId
 * @desc Retrieve stored barcode image by barcode ID
 * @access Private (Super Admin only)
 */
router.get("/stored-image/:barcodeId", getStoredBarcodeImage);

/**
 * @route DELETE /api/v1/barcodes/stored-image/:barcodeId
 * @desc Delete stored barcode image and metadata
 * @access Private (Super Admin only)
 */
router.delete("/stored-image/:barcodeId", deleteStoredBarcodeImage);

/**
 * @route POST /api/v1/barcodes/regenerate-image/:productId
 * @desc Regenerate barcode image when product details change
 * @access Private (Super Admin only)
 */
router.post("/regenerate-image/:productId", regenerateBarcodeImageEndpoint);

/**
 * @route POST /api/v1/barcodes/bulk-store-images
 * @desc Bulk store barcode images for multiple products
 * @access Private (Super Admin only)
 */
router.post("/bulk-store-images", bulkStoreBarcodeImagesEndpoint);

/**
 * @route POST /api/v1/barcodes/cleanup-images
 * @desc Clean up old barcode images (with dry-run option)
 * @access Private (Super Admin only)
 */
router.post("/cleanup-images", cleanupBarcodeImagesEndpoint);

/**
 * @route GET /api/v1/barcodes/storage-stats
 * @desc Get barcode storage statistics and health metrics
 * @access Private (Super Admin only)
 */
router.get("/storage-stats", getBarcodeStorageStats);

// ============= DIRECT BARCODE DOCUMENT MANAGEMENT ROUTES =============

/**
 * @route GET /api/v1/barcodes/documents
 * @desc Get all barcode documents with filtering and pagination
 * @access Private (Super Admin only)
 */
router.get("/documents", getAllBarcodeDocuments);

/**
 * @route GET /api/v1/barcodes/document/:barcodeId
 * @desc Get a specific barcode document by ID
 * @access Private (Super Admin only)
 */
router.get("/document/:barcodeId", getBarcodeDocument);

/**
 * @route PUT /api/v1/barcodes/document/:barcodeId
 * @desc Update barcode document metadata
 * @access Private (Super Admin only)
 */
router.put("/document/:barcodeId", updateBarcodeDocument);

/**
 * @route DELETE /api/v1/barcodes/document/:barcodeId
 * @desc Delete barcode document
 * @access Private (Super Admin only)
 */
router.delete("/document/:barcodeId", deleteBarcodeDocument);

/**
 * @route GET /api/v1/barcodes/analytics
 * @desc Get barcode usage analytics and statistics
 * @access Private (Super Admin only)
 */
router.get("/analytics", getBarcodeAnalytics);

/**
 * @route PUT /api/v1/barcodes/bulk-update
 * @desc Bulk update barcode documents
 * @access Private (Super Admin only)
 */
router.put("/bulk-update", bulkUpdateBarcodeDocuments);

/**
 * @route POST /api/v1/barcodes/record-print
 * @desc Record barcode print activity
 * @access Private (Super Admin only)
 */
router.post("/record-print", recordBarcodeprint);

/**
 * @route GET /api/v1/barcodes/print-history/:barcodeId
 * @desc Get barcode print history with pagination
 * @access Private (Super Admin only)
 */
router.get("/print-history/:barcodeId", getBarcodePrintHistory);

// ============= ADVANCED BARCODE REGENERATION ROUTES =============

/**
 * @route POST /api/v1/barcodes/bulk-regenerate
 * @desc Bulk regenerate barcodes for multiple products
 * @access Private (Super Admin only)
 */
router.post("/bulk-regenerate", bulkRegenerateProductBarcodesEndpoint);

/**
 * @route POST /api/v1/barcodes/regenerate-outdated
 * @desc Regenerate barcodes for products that need regeneration
 * @access Private (Super Admin only)
 */
router.post("/regenerate-outdated", regenerateOutdatedBarcodesEndpoint);

/**
 * @route GET /api/v1/barcodes/regeneration-stats
 * @desc Get barcode regeneration statistics and analytics
 * @access Private (Super Admin only)
 */
router.get("/regeneration-stats", getBarcodeRegenerationStatsEndpoint);

/**
 * @route PUT /api/v1/barcodes/auto-regenerate/:productId
 * @desc Toggle automatic barcode regeneration for a product
 * @access Private (Super Admin only)
 */
router.put("/auto-regenerate/:productId", toggleAutoRegeneration);

/**
 * @route GET /api/v1/barcodes/needs-regeneration
 * @desc Get products that need barcode regeneration
 * @access Private (Super Admin only)
 */
router.get("/needs-regeneration", getProductsNeedingRegeneration);

// ============= BARCODE INDEX MANAGEMENT ROUTES =============

/**
 * @route POST /api/v1/barcodes/indexes/create
 * @desc Create optimized barcode indexes for better performance
 * @access Private (Super Admin only)
 */
router.post("/indexes/create", createBarcodeIndexesEndpoint);

/**
 * @route GET /api/v1/barcodes/indexes/analyze
 * @desc Analyze barcode index usage and performance patterns
 * @access Private (Super Admin only)
 */
router.get("/indexes/analyze", analyzeBarcodeIndexUsageEndpoint);

/**
 * @route POST /api/v1/barcodes/indexes/optimize
 * @desc Optimize existing barcode indexes and remove unused ones
 * @access Private (Super Admin only)
 */
router.post("/indexes/optimize", optimizeBarcodeIndexesEndpoint);

/**
 * @route GET /api/v1/barcodes/indexes/info
 * @desc Get comprehensive information about barcode database indexes
 * @access Private (Super Admin only)
 */
router.get("/indexes/info", getBarcodeIndexInfoEndpoint);

/**
 * @route GET /api/v1/barcodes/indexes/performance
 * @desc Get barcode query performance metrics and test results
 * @access Private (Super Admin only)
 */
router.get("/indexes/performance", getBarcodeQueryPerformanceEndpoint);

export default router;
