import api from "./api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface BarcodeGenerateRequest {
  productId: string;
  generateImage?: boolean;
  imageFormat?: "dataURL" | "base64" | "buffer";
  imageOptions?: Record<string, any>;
}

interface BarcodeGenerateResponse {
  success: boolean;
  data: {
    barcode: string;
    productId: string;
    productName: string;
    price: number;
    vendorPrefix: string;
    vendorName: string;
    barcodeImage?: string;
    imageFormat?: string;
  };
  message: string;
}

interface BulkBarcodeGenerateRequest {
  productIds: string[];
}

interface BulkBarcodeGenerateResponse {
  success: boolean;
  data: {
    results: Array<{
      productId: string;
      productName: string;
      barcode: string;
      price: number;
      vendorPrefix: string;
      vendorName: string;
    }>;
    errors: Array<{
      productId: string;
      error: string;
    }>;
    totalProcessed: number;
    successCount: number;
    errorCount: number;
  };
  message: string;
}

interface BarcodeValidateRequest {
  barcode: string;
}

interface BarcodeValidateResponse {
  success: boolean;
  data: {
    barcode: string;
    isValid: boolean;
    formatValid: boolean;
    businessRulesValid: boolean;
    isUnique: boolean;
    parsedData: any;
    errors: string[];
    length: number;
  };
  message: string;
}

/**
 * Configure axios defaults for barcode service
 */
const axiosConfig = {
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
};

/**
 * Generate barcode for a single product
 * @param request - Barcode generation request
 * @returns Promise with barcode generation result
 */
export const generateProductBarcode = async (
  request: BarcodeGenerateRequest
): Promise<BarcodeGenerateResponse> => {
  // api interceptor returns response.data => { success, data, message }
  const body = await api.post(
    `/barcodes/generate`,
    request,
    axiosConfig
  );

  return body as any;
};

/**
 * Generate barcodes for multiple products
 * @param request - Bulk barcode generation request
 * @returns Promise with bulk generation results
 */
export const generateBulkBarcodes = async (
  request: BulkBarcodeGenerateRequest
): Promise<BulkBarcodeGenerateResponse> => {
  // api interceptor returns response.data => { success, data, message }
  const body: BulkBarcodeGenerateResponse = await api.post(
    `/barcodes/generate-bulk`,
    request,
    axiosConfig
  );

  return body;
};

/**
 * Validate a barcode format and business rules
 * @param request - Barcode validation request
 * @returns Promise with validation results
 */
export const validateBarcode = async (
  request: BarcodeValidateRequest
): Promise<BarcodeValidateResponse> => {
  // api interceptor returns response.data => { success, data, message }
  const body = await api.post(
    `/barcodes/validate`,
    request,
    axiosConfig
  );

  return body as any;
};

/**
 * Get barcode information for a specific product
 * @param productId - Product ID
 * @returns Promise with product barcode information
 */
export const getProductBarcode = async (productId: string) => {
  // api interceptor returns response.data => { success, data }
  const body = await api.get(
    `/barcodes/product/${productId}`,
    axiosConfig
  );

  return (body as any).data;
};

/**
 * Regenerate barcode for a product
 * @param productId - Product ID
 * @returns Promise with new barcode information
 */
export const regenerateProductBarcode = async (productId: string) => {
  // api interceptor returns response.data => { success, data }
  const body = await api.put(
    `/barcodes/regenerate/${productId}`,
    {},
    axiosConfig
  );

  return (body as any).data;
};

/**
 * Generate barcode image for specific barcode text
 * @param barcodeText - Barcode text to generate image for
 * @param options - Image generation options
 * @returns Promise with barcode image data
 */
export const generateBarcodeImage = async (
  barcodeText: string,
  options: {
    format?: "dataURL" | "base64" | "buffer";
    imageOptions?: Record<string, any>;
    productInfo?: Record<string, any>;
    useCase?: string;
  } = {}
) => {
  // api interceptor returns response.data => { success, data }
  const body = await api.post(
    `/barcodes/generate-image`,
    {
      barcodeText,
      ...options,
    },
    axiosConfig
  );

  return (body as any).data;
};

/**
 * Generate multiple barcode images for bulk operations
 * @param productIds - Array of product IDs
 * @param options - Image generation options
 * @returns Promise with bulk image generation results
 */
export const generateBulkBarcodeImages = async (
  productIds: string[],
  options: {
    format?: "dataURL" | "base64" | "buffer";
    imageOptions?: Record<string, any>;
    useCase?: string;
  } = {}
) => {
  // api interceptor returns response.data => { success, data }
  const body = await api.post(
    `/barcodes/generate-bulk-images`,
    {
      productIds,
      ...options,
    },
    axiosConfig
  );

  return (body as any).data;
};

/**
 * Get barcode image for an existing product
 * @param productId - Product ID
 * @param options - Image generation options
 * @returns Promise with product barcode image
 */
export const getProductBarcodeImage = async (
  productId: string,
  options: {
    format?: "dataURL" | "base64" | "buffer";
    imageOptions?: Record<string, any>;
    useCase?: string;
    regenerate?: boolean;
  } = {}
) => {
  // api interceptor returns response.data => { success, data }
  const body = await api.get(
    `/barcodes/image/${productId}`,
    {
      ...axiosConfig,
      params: options,
    }
  );

  return (body as any).data;
};

/**
 * Get supported barcode formats and options
 * @returns Promise with supported formats and options
 */
export const getBarcodeFormats = async () => {
  // api interceptor returns response.data => { success, data }
  const body = await api.get(
    `/barcodes/formats`,
    axiosConfig
  );

  return (body as any).data;
};

/**
 * Check if a barcode is unique in the system
 * @param barcode - Barcode text to check
 * @param excludeProductId - Optional product ID to exclude from check
 * @returns Promise with uniqueness check result
 */
export const checkBarcodeUniqueness = async (
  barcode: string,
  excludeProductId?: string
) => {
  // api interceptor returns response.data => { success, data }
  const body = await api.post(
    `/barcodes/check-uniqueness`,
    {
      barcode,
      excludeProductId,
    },
    axiosConfig
  );

  return (body as any).data;
};

/**
 * Get comprehensive barcode validation report
 * @param barcode - Barcode to validate
 * @param productData - Optional product data for validation
 * @param excludeProductId - Optional product ID to exclude from uniqueness check
 * @returns Promise with comprehensive validation results
 */
export const validateBarcodeComprehensive = async (
  barcode: string,
  productData?: Record<string, any>,
  excludeProductId?: string
) => {
  // api interceptor returns response.data => { success, data }
  const body = await api.post(
    `/barcodes/validate-comprehensive`,
    {
      barcode,
      productData,
      excludeProductId,
    },
    axiosConfig
  );

  return (body as any).data;
};

/**
 * Get barcode statistics and analytics
 * @returns Promise with barcode statistics
 */
export const getBarcodeStats = async () => {
  // api interceptor returns response.data => { success, data }
  const body = await api.get(
    `/barcodes/stats`,
    axiosConfig
  );

  return (body as any).data;
};

/**
 * Search barcodes by text, product, or vendor
 * @param query - Search query
 * @param options - Search options
 * @returns Promise with search results
 */
export const searchBarcodes = async (
  query: string,
  options: {
    type?: "all" | "barcode" | "product" | "vendor";
    limit?: number;
    includeInvalid?: boolean;
  } = {}
) => {
  // api interceptor returns response.data => { success, data }
  const body = await api.get(`${API_BASE_URL}/barcodes/search`, {
    ...axiosConfig,
    params: {
      q: query,
      ...options,
    },
  });

  return (body as any).data;
};

/**
 * Update barcode for a specific product
 * @param productId - Product ID
 * @param barcode - New barcode text
 * @param validateOnly - Only validate, don't save
 * @returns Promise with update result
 */
export const updateProductBarcode = async (
  productId: string,
  barcode: string,
  validateOnly: boolean = false
) => {
  // api interceptor returns response.data => { success, data }
  const body = await api.put(
    `/barcodes/product/${productId}`,
    {
      barcode,
      validateOnly,
    },
    axiosConfig
  );

  return (body as any).data;
};

/**
 * Delete barcode for a specific product
 * @param productId - Product ID
 * @returns Promise with deletion result
 */
export const deleteProductBarcode = async (productId: string) => {
  // api interceptor returns response.data => { success, message }
  const body = await api.delete(
    `${API_BASE_URL}/barcodes/product/${productId}`,
    axiosConfig
  );

  return body as any;
};

/**
 * Delete multiple barcodes
 * @param productIds - Array of product IDs
 * @returns Promise with bulk deletion results
 */
export const bulkDeleteBarcodes = async (productIds: string[]) => {
  // api interceptor returns response.data => { success, data }
  const body = await api.post(
    `/barcodes/bulk-delete`,
    {
      productIds,
    },
    axiosConfig
  );

  return (body as any).data;
};

/**
 * Get all barcodes with pagination and filtering
 * @param options - Query options
 * @returns Promise with paginated barcode results
 */
export const getAllBarcodes = async (
  options: {
    page?: number;
    limit?: number;
    search?: string;
    vendorId?: string;
    hasBarcode?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  } = {}
) => {
  // api interceptor returns response.data => { success, data }
  const body = await api.get(`${API_BASE_URL}/barcodes`, {
    ...axiosConfig,
    params: options,
  });

  return (body as any).data;
};
