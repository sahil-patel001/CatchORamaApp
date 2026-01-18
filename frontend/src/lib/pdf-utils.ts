import jsPDF from "jspdf";
import { BarcodeData, generateProductBarcodeImage } from "./barcode-utils";
import { Product } from "@/types";

/**
 * PDF generation utilities for barcode printing
 */

export interface BarcodeProduct {
  product: Product;
  quantity: number;
}

export interface PDFLayoutOptions {
  pageSize?: "a4" | "letter";
  orientation?: "portrait" | "landscape";
  rows?: number;
  columns?: number;
  margin?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  barcodeSize?: {
    width: number;
    height: number;
  };
  showProductInfo?: boolean;
  showPrice?: boolean;
  showVendor?: boolean;
}

export interface PDFGenerationResult {
  success: boolean;
  pdfBlob?: Blob;
  totalPages: number;
  totalBarcodes: number;
  error?: string;
}

/**
 * Default PDF layout options for A4 barcode sheets (Avery L7159 compatible)
 */
const DEFAULT_LAYOUT_OPTIONS: Required<PDFLayoutOptions> = {
  pageSize: "a4",
  orientation: "portrait",
  rows: 8,
  columns: 3,
  margin: {
    top: 12.5, // Standard Avery L7159 top margin
    bottom: 12.5,
    left: 2, // Moved 3mm more to the left (5mm - 3mm = 2mm)
    right: 5,
  },
  barcodeSize: {
    width: 63.5, // Standard Avery L7159 label width
    height: 33.9, // Standard Avery L7159 label height
  },
  showProductInfo: true,
  showPrice: true,
  showVendor: false,
};

/**
 * Calculate PDF layout dimensions for Avery L7159 template
 * @param options - Layout options
 * @returns Layout calculations
 */
function calculateLayout(options: Required<PDFLayoutOptions>) {
  // A4 dimensions in mm
  const pageWidth = 210;
  const pageHeight = 297;

  // Avery L7159 specific gutters (adjusted per client feedback)
  const columnGutter = 5.5; // Increased by 3mm (2.5mm + 3mm = 5.5mm)
  const rowGutter = 0; // Standard Avery L7159 row spacing (no gap)

  const availableWidth = pageWidth - options.margin.left - options.margin.right;
  const availableHeight =
    pageHeight - options.margin.top - options.margin.bottom;

  // Calculate total gutter space
  const totalColumnGutters = (options.columns - 1) * columnGutter;
  const totalRowGutters = (options.rows - 1) * rowGutter;

  // Calculate effective space for labels
  const effectiveWidth = availableWidth - totalColumnGutters;
  const effectiveHeight = availableHeight - totalRowGutters;

  // Use exact label dimensions
  const labelWidth = options.barcodeSize.width;
  const labelHeight = options.barcodeSize.height;

  return {
    pageWidth,
    pageHeight,
    availableWidth,
    availableHeight,
    labelWidth,
    labelHeight,
    columnGutter,
    rowGutter,
    effectiveWidth,
    effectiveHeight,
    barcodesPerPage: options.rows * options.columns,
  };
}

/**
 * Generate barcode PDF with 8x3 layout (24 barcodes per page)
 * @param barcodeProducts - Products with quantities
 * @param options - PDF generation options
 * @returns Promise resolving to PDF generation result
 */
export async function generateBarcodePDF(
  barcodeProducts: BarcodeProduct[],
  options: PDFLayoutOptions = {}
): Promise<PDFGenerationResult> {
  try {
    const layoutOptions = { ...DEFAULT_LAYOUT_OPTIONS, ...options };
    const layout = calculateLayout(layoutOptions);

    // Generate barcode data for all products
    const barcodeDataList: BarcodeData[] = [];

    for (const { product, quantity } of barcodeProducts) {
      // Use the updated generateBarcodeText function
      const { generateBarcodeText } = await import("./barcode-utils");
      const barcodeText = generateBarcodeText(product);

      // Add multiple entries based on quantity
      for (let i = 0; i < quantity; i++) {
        barcodeDataList.push({
          text: barcodeText,
          productName: product.name,
          vendorName: product.vendor?.businessName || "Unknown Vendor",
          price: product.discountPrice || product.price,
          productId: product._id || product.id,
        });
      }
    }

    if (barcodeDataList.length === 0) {
      return {
        success: false,
        totalPages: 0,
        totalBarcodes: 0,
        error: "No barcodes to generate",
      };
    }

    // Create PDF document
    const doc = new jsPDF({
      orientation: layoutOptions.orientation,
      unit: "mm",
      format: layoutOptions.pageSize,
    });

    // Calculate total pages needed
    const totalPages = Math.ceil(
      barcodeDataList.length / layout.barcodesPerPage
    );

    // Generate barcode images and add to PDF
    let currentPage = 1;
    let barcodeIndex = 0;

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) {
        doc.addPage();
      }

      // Page header removed as per client feedback
      // Previously showed "Barcode Sheet - Page X of Y" and date

      // Add barcodes to current page
      for (
        let row = 0;
        row < layoutOptions.rows && barcodeIndex < barcodeDataList.length;
        row++
      ) {
        for (
          let col = 0;
          col < layoutOptions.columns && barcodeIndex < barcodeDataList.length;
          col++
        ) {
          const barcodeData = barcodeDataList[barcodeIndex];

          // Calculate barcode position using Avery L7159 layout
          const x =
            layoutOptions.margin.left +
            col * (layout.labelWidth + layout.columnGutter);
          const y =
            layoutOptions.margin.top +
            row * (layout.labelHeight + layout.rowGutter);

          try {
            // Generate barcode image with maximum readability settings
            const barcodeImageUrl = await generateProductBarcodeImage(
              barcodeData,
              {
                width: 2, // Optimized bar width
                height: 100, // Increased height for better barcode proportion
                displayValue: true,
                font: "Arial", // Clean, readable font
                fontSize: 36, // Increased by 2px for even better readability
                textAlign: "center",
                textPosition: "bottom",
                textMargin: 20, // Increased margin for better text spacing
                background: "#ffffff",
                lineColor: "#000000",
                margin: 30, // Increased margins for better spacing
                showProductInfo: layoutOptions.showProductInfo,
                showPrice: layoutOptions.showPrice,
                showVendor: layoutOptions.showVendor,
              }
            );

            // Add barcode image to PDF
            doc.addImage(
              barcodeImageUrl,
              "PNG",
              x,
              y,
              layoutOptions.barcodeSize.width,
              layoutOptions.barcodeSize.height
            );

            // Debug borders removed as per client feedback
            // Uncomment the following lines if you need to debug label positioning:
            // if (process.env.NODE_ENV === "development") {
            //   doc.setDrawColor(200);
            //   doc.setLineWidth(0.1);
            //   doc.rect(x, y, layout.labelWidth, layout.labelHeight);
            // }
          } catch (error) {
            console.error(
              `Failed to generate barcode for ${barcodeData.productName}:`,
              error
            );

            // Add error placeholder
            doc.setFontSize(8);
            doc.setTextColor(255, 0, 0);
            doc.text(
              "Error generating barcode",
              x + layoutOptions.barcodeSize.width / 2,
              y + layoutOptions.barcodeSize.height / 2,
              { align: "center" }
            );
            doc.setTextColor(0);
          }

          barcodeIndex++;
        }
      }

      currentPage++;
    }

    // Add footer to last page
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Generated ${barcodeDataList.length} barcodes across ${totalPages} pages`,
      layout.pageWidth / 2,
      layout.pageHeight - 5,
      { align: "center" }
    );

    // Convert to blob
    const pdfBlob = doc.output("blob");

    return {
      success: true,
      pdfBlob,
      totalPages,
      totalBarcodes: barcodeDataList.length,
    };
  } catch (error) {
    console.error("PDF generation error:", error);
    return {
      success: false,
      totalPages: 0,
      totalBarcodes: 0,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Download generated PDF
 * @param pdfBlob - PDF blob to download
 * @param filename - Download filename
 */
export function downloadPDF(
  pdfBlob: Blob,
  filename: string = "barcodes.pdf"
): void {
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate filename for barcode PDF
 * @param barcodeProducts - Products being printed
 * @returns Formatted filename
 */
export function generatePDFFilename(barcodeProducts: BarcodeProduct[]): string {
  const totalBarcodes = barcodeProducts.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

  if (barcodeProducts.length === 1) {
    // Single product
    const product = barcodeProducts[0].product;
    const safeName = product.name
      .replace(/[^a-zA-Z0-9]/g, "_")
      .substring(0, 20);
    return `barcode_${safeName}_${totalBarcodes}x_${date}.pdf`;
  } else {
    // Multiple products
    return `barcodes_${barcodeProducts.length}products_${totalBarcodes}x_${date}.pdf`;
  }
}

/**
 * Validate PDF generation requirements
 * @param barcodeProducts - Products to validate
 * @returns Validation result
 */
export function validatePDFGeneration(barcodeProducts: BarcodeProduct[]): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if there are any products
  if (barcodeProducts.length === 0) {
    errors.push("No products selected for barcode generation");
  }

  // Check if any products have quantity > 0
  const totalBarcodes = barcodeProducts.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  if (totalBarcodes === 0) {
    errors.push("No barcodes to generate (all quantities are 0)");
  }

  // Check for very large quantities
  if (totalBarcodes > 1000) {
    warnings.push(
      `Large number of barcodes (${totalBarcodes}). Generation may take some time.`
    );
  }

  // Check for missing product data
  barcodeProducts.forEach((item, index) => {
    if (!item.product.name) {
      errors.push(`Product ${index + 1} is missing a name`);
    }

    if (!item.product.vendor?.businessName) {
      warnings.push(
        `Product "${item.product.name}" is missing vendor information`
      );
    }

    if (item.product.price <= 0 && !item.product.discountPrice) {
      warnings.push(`Product "${item.product.name}" has invalid pricing`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get PDF layout preview information
 * @param barcodeProducts - Products to generate
 * @param options - Layout options
 * @returns Layout preview data
 */
export function getPDFLayoutPreview(
  barcodeProducts: BarcodeProduct[],
  options: PDFLayoutOptions = {}
): {
  totalBarcodes: number;
  totalPages: number;
  barcodesPerPage: number;
  layout: string;
  estimatedFileSize: string;
} {
  const layoutOptions = { ...DEFAULT_LAYOUT_OPTIONS, ...options };
  const barcodesPerPage = layoutOptions.rows * layoutOptions.columns;
  const totalBarcodes = barcodeProducts.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  const totalPages = Math.ceil(totalBarcodes / barcodesPerPage);

  // Rough file size estimation (KB)
  const estimatedSizeKB = Math.max(50, totalPages * 150); // ~150KB per page average
  const estimatedFileSize =
    estimatedSizeKB > 1024
      ? `${(estimatedSizeKB / 1024).toFixed(1)} MB`
      : `${estimatedSizeKB} KB`;

  return {
    totalBarcodes,
    totalPages,
    barcodesPerPage,
    layout: `${layoutOptions.rows} × ${layoutOptions.columns}`,
    estimatedFileSize,
  };
}
