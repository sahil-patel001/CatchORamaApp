import { useState, useCallback } from "react";
import * as barcodeService from "@/services/barcodeService";
import { useToast } from "@/hooks/use-toast";

export interface BarcodeOperationState {
  isLoading: boolean;
  status: "idle" | "processing" | "success" | "error";
  message: string;
  progress?: {
    current: number;
    total: number;
  };
}

export interface BarcodeOperationResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Hook for managing barcode operations with loading states and error handling
 * Provides consistent state management across barcode features
 */
export function useBarcodeOperations() {
  const { toast } = useToast();

  const [state, setState] = useState<BarcodeOperationState>({
    isLoading: false,
    status: "idle",
    message: "",
  });

  const updateState = useCallback((updates: Partial<BarcodeOperationState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetState = useCallback(() => {
    setState({
      isLoading: false,
      status: "idle",
      message: "",
      progress: undefined,
    });
  }, []);

  const showToast = useCallback(
    (
      title: string,
      description: string,
      variant: "default" | "destructive" = "default"
    ) => {
      toast({ title, description, variant });
    },
    [toast]
  );

  /**
   * Generate barcode for a single product
   */
  const generateSingleBarcode = useCallback(
    async (
      productId: string,
      options?: {
        generateImage?: boolean;
        imageFormat?: "dataURL" | "base64" | "buffer";
        imageOptions?: Record<string, any>;
      }
    ): Promise<BarcodeOperationResult> => {
      updateState({
        isLoading: true,
        status: "processing",
        message: "Generating barcode...",
      });

      try {
        const result = await barcodeService.generateProductBarcode({
          productId,
          ...options,
        });

        if (result.success) {
          updateState({
            isLoading: false,
            status: "success",
            message: "Barcode generated successfully",
          });

          showToast("Success", "Barcode generated successfully");

          // Reset after showing success
          setTimeout(resetState, 3000);

          return { success: true, data: result.data };
        } else {
          throw new Error(result.message || "Failed to generate barcode");
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to generate barcode";

        updateState({
          isLoading: false,
          status: "error",
          message: errorMessage,
        });

        showToast("Error", errorMessage, "destructive");

        // Reset after showing error
        setTimeout(resetState, 5000);

        return { success: false, error: errorMessage };
      }
    },
    [updateState, resetState, showToast]
  );

  /**
   * Generate barcodes for multiple products
   */
  const generateBulkBarcodes = useCallback(
    async (productIds: string[]): Promise<BarcodeOperationResult> => {
      if (productIds.length === 0) {
        showToast("Error", "No products selected", "destructive");
        return { success: false, error: "No products selected" };
      }

      updateState({
        isLoading: true,
        status: "processing",
        message: `Processing ${productIds.length} products...`,
        progress: { current: 0, total: productIds.length },
      });

      try {
        const result = await barcodeService.generateBulkBarcodes({
          productIds,
        });

        if (result.success) {
          const { successCount, errorCount } = result.data;

          updateState({
            isLoading: false,
            status: successCount > 0 ? "success" : "error",
            message: `Generated ${successCount} barcodes${
              errorCount > 0 ? ` (${errorCount} errors)` : ""
            }`,
            progress: { current: successCount, total: productIds.length },
          });

          // Reset after showing success
          setTimeout(resetState, 3000);

          return { success: true, data: result.data };
        } else {
          throw new Error(result.message || "Failed to generate barcodes");
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to generate barcodes";

        updateState({
          isLoading: false,
          status: "error",
          message: errorMessage,
        });

        showToast("Error", errorMessage, "destructive");

        // Reset after showing error
        setTimeout(resetState, 5000);

        return { success: false, error: errorMessage };
      }
    },
    [updateState, resetState, showToast]
  );

  /**
   * Validate a barcode
   */
  const validateBarcode = useCallback(
    async (barcode: string): Promise<BarcodeOperationResult> => {
      updateState({
        isLoading: true,
        status: "processing",
        message: "Validating barcode...",
      });

      try {
        const result = await barcodeService.validateBarcode({ barcode });

        if (result.success) {
          const isValid = result.data.isValid;

          updateState({
            isLoading: false,
            status: isValid ? "success" : "error",
            message: isValid ? "Barcode is valid" : "Barcode validation failed",
          });

          showToast(
            isValid ? "Valid Barcode" : "Invalid Barcode",
            isValid
              ? "Barcode passed all validations"
              : `Validation errors: ${result.data.errors.join(", ")}`,
            isValid ? "default" : "destructive"
          );

          // Reset after showing result
          setTimeout(resetState, 3000);

          return { success: true, data: result.data };
        } else {
          throw new Error(result.message || "Failed to validate barcode");
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to validate barcode";

        updateState({
          isLoading: false,
          status: "error",
          message: errorMessage,
        });

        showToast("Error", errorMessage, "destructive");

        // Reset after showing error
        setTimeout(resetState, 5000);

        return { success: false, error: errorMessage };
      }
    },
    [updateState, resetState, showToast]
  );

  /**
   * Generate barcode images for multiple products
   */
  const generateBulkBarcodeImages = useCallback(
    async (
      productIds: string[],
      options?: {
        format?: "dataURL" | "base64" | "buffer";
        imageOptions?: Record<string, any>;
        useCase?: string;
      }
    ): Promise<BarcodeOperationResult> => {
      if (productIds.length === 0) {
        showToast("Error", "No products selected", "destructive");
        return { success: false, error: "No products selected" };
      }

      updateState({
        isLoading: true,
        status: "processing",
        message: `Generating images for ${productIds.length} barcodes...`,
        progress: { current: 0, total: productIds.length },
      });

      try {
        const result = await barcodeService.generateBulkBarcodeImages(
          productIds,
          options
        );

        if (result.success) {
          const { successCount, errorCount } = result.data.summary;

          updateState({
            isLoading: false,
            status: successCount > 0 ? "success" : "error",
            message: `Generated ${successCount} barcode images${
              errorCount > 0 ? ` (${errorCount} errors)` : ""
            }`,
            progress: { current: successCount, total: productIds.length },
          });

          showToast(
            "Images Generated",
            `Successfully generated ${successCount} barcode images${
              errorCount > 0 ? ` (${errorCount} errors)` : ""
            }`,
            successCount > 0 ? "default" : "destructive"
          );

          // Reset after showing success
          setTimeout(resetState, 3000);

          return { success: true, data: result.data };
        } else {
          throw new Error(
            result.message || "Failed to generate barcode images"
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to generate barcode images";

        updateState({
          isLoading: false,
          status: "error",
          message: errorMessage,
        });

        showToast("Error", errorMessage, "destructive");

        // Reset after showing error
        setTimeout(resetState, 5000);

        return { success: false, error: errorMessage };
      }
    },
    [updateState, resetState, showToast]
  );

  return {
    state,
    generateSingleBarcode,
    generateBulkBarcodes,
    validateBarcode,
    generateBulkBarcodeImages,
    resetState,
  };
}
