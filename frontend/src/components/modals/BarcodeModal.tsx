import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Product } from "@/types";
import { Printer, X, Plus, Minus, Trash2 } from "lucide-react";

interface BarcodeProduct {
  product: Product;
  quantity: number;
}

interface BarcodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProducts: Product[];
  onPrintBarcode: (products: BarcodeProduct[]) => Promise<void>;
  onSelectionChange?: (products: Product[]) => void; // New callback for syncing selection
  isLoading?: boolean;
}

export function BarcodeModal({
  open,
  onOpenChange,
  selectedProducts,
  onPrintBarcode,
  onSelectionChange,
  isLoading = false,
}: BarcodeModalProps) {
  const { toast } = useToast();

  // Initialize barcode products with quantity 1 for each selected product
  const [barcodeProducts, setBarcodeProducts] = useState<BarcodeProduct[]>([]);

  // Update barcode products when selected products change or modal opens
  useEffect(() => {
    if (open && selectedProducts.length > 0) {
      setBarcodeProducts((prevProducts) => {
        // If modal is just opening, initialize with selected products
        if (prevProducts.length === 0) {
          return selectedProducts.map((product) => ({
            product,
            quantity: 1,
          }));
        }

        // If modal is already open, merge new selections with existing ones
        const existingProductIds = new Set(
          prevProducts.map((item) => item.product._id || item.product.id)
        );

        const newProducts = selectedProducts
          .filter(
            (product) => !existingProductIds.has(product._id || product.id)
          )
          .map((product) => ({
            product,
            quantity: 1,
          }));

        return [...prevProducts, ...newProducts];
      });
    } else if (!open) {
      // When modal closes, clear the internal state
      setBarcodeProducts([]);
    }
  }, [selectedProducts, open]);

  // Calculate total barcodes
  const totalBarcodes = useMemo(() => {
    return barcodeProducts.reduce((total, item) => total + item.quantity, 0);
  }, [barcodeProducts]);

  // Calculate total pages (24 barcodes per page in 8x3 layout)
  const totalPages = useMemo(() => {
    return Math.ceil(totalBarcodes / 24);
  }, [totalBarcodes]);

  const handleQuantityChange = (productId: string, newQuantity: string) => {
    // Handle empty string
    if (newQuantity === "") {
      setBarcodeProducts((prev) =>
        prev.map((item) =>
          (item.product._id || item.product.id) === productId
            ? { ...item, quantity: 0 }
            : item
        )
      );
      return;
    }

    // Only allow valid numbers (no leading zeros except for just "0")
    if (!/^\d+$/.test(newQuantity)) return;

    // Remove leading zeros
    const cleanedValue = newQuantity.replace(/^0+/, "") || "0";
    const quantity = parseInt(cleanedValue);

    if (quantity < 0 || quantity > 999) return;

    setBarcodeProducts((prev) =>
      prev.map((item) =>
        (item.product._id || item.product.id) === productId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const handleQuantityIncrement = (productId: string) => {
    setBarcodeProducts((prev) =>
      prev.map((item) =>
        (item.product._id || item.product.id) === productId
          ? { ...item, quantity: Math.min(item.quantity + 1, 999) }
          : item
      )
    );
  };

  const handleQuantityDecrement = (productId: string) => {
    setBarcodeProducts((prev) =>
      prev.map((item) =>
        (item.product._id || item.product.id) === productId
          ? { ...item, quantity: Math.max(item.quantity - 1, 0) }
          : item
      )
    );
  };

  const handleRemoveProduct = (productId: string) => {
    setBarcodeProducts((prev) => {
      const updatedProducts = prev.filter(
        (item) => (item.product._id || item.product.id) !== productId
      );

      // Notify parent component about the selection change
      if (onSelectionChange) {
        const updatedSelectedProducts = updatedProducts.map(
          (item) => item.product
        );
        onSelectionChange(updatedSelectedProducts);
      }

      return updatedProducts;
    });

    toast({
      title: "Product removed",
      description: "Product has been removed from the barcode print list",
      variant: "default",
    });
  };

  const handlePrint = async () => {
    // Filter out products with 0 quantity
    const validProducts = barcodeProducts.filter((item) => item.quantity > 0);

    if (validProducts.length === 0) {
      toast({
        title: "No products to print",
        description: "Please set quantity for at least one product",
        variant: "destructive",
      });
      return;
    }

    try {
      await onPrintBarcode(validProducts);
    } catch (error) {
      console.error("Failed to print barcodes:", error);
      toast({
        title: "Print failed",
        description: "Failed to generate barcode PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  const renderProductImage = (product: Product) => {
    const imageUrl = product.images?.[0]?.url || product.image;

    if (imageUrl) {
      const fullImageUrl = `${
        import.meta.env.VITE_API_BASE_URL?.replace("/api/v1", "") ||
        "http://localhost:5001"
      }/${imageUrl}`;

      return (
        <img
          src={fullImageUrl}
          alt={product.images?.[0]?.alt || product.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      );
    }

    return (
      <div className="flex items-center justify-center text-xs text-gray-400">
        No image
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Print Barcodes
          </DialogTitle>
          <DialogDescription>
            Set quantities for each product and generate barcode PDF for
            printing. Each page contains 24 barcodes in an 8×3 layout.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 position-relative overflow-hidden ">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* Product List */}
            <div className="lg:col-span-2 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Selected Products</h3>
                <Badge variant="outline">
                  {barcodeProducts.length} product
                  {barcodeProducts.length !== 1 ? "s" : ""}
                </Badge>
              </div>

              <ScrollArea className="flex-1 pr-4 overflow-auto max-h-[80vh]">
                <div className="space-y-4">
                  {barcodeProducts.map((item) => {
                    const productId = item.product._id || item.product.id;

                    return (
                      <div
                        key={productId}
                        className="border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-start gap-3">
                          {/* Product Image */}
                          <div className="w-16 h-16 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                            {renderProductImage(item.product)}
                          </div>

                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm leading-tight mb-1 truncate">
                              {item.product.name}
                            </h4>
                            <p className="text-sm text-muted-foreground mb-1">
                              {item.product.vendor?.businessName}
                            </p>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-semibold">
                                $
                                {item.product.discountPrice ||
                                  item.product.price}
                              </span>
                              {item.product.discountPrice && (
                                <span className="text-muted-foreground line-through text-xs">
                                  ${item.product.price}
                                </span>
                              )}
                              <Badge variant="secondary" className="text-xs">
                                {item.product.category}
                              </Badge>
                            </div>
                          </div>

                          {/* Remove Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveProduct(productId)}
                            disabled={isLoading}
                            className="flex-shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-3">
                          <Label
                            htmlFor={`quantity-${productId}`}
                            className="text-sm font-medium"
                          >
                            Quantity:
                          </Label>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuantityDecrement(productId)}
                              disabled={isLoading || item.quantity <= 0}
                              className="h-8 w-8 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              id={`quantity-${productId}`}
                              type="number"
                              min="0"
                              max="999"
                              value={item.quantity || ""}
                              placeholder="0"
                              onChange={(e) =>
                                handleQuantityChange(productId, e.target.value)
                              }
                              onFocus={(e) => e.target.select()}
                              disabled={isLoading}
                              className="w-20 text-center h-8"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuantityIncrement(productId)}
                              disabled={isLoading || item.quantity >= 999}
                              className="h-8 w-8 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            = {item.quantity} barcode
                            {item.quantity !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Print Summary */}
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold mb-4">Print Summary</h3>

              <div className="space-y-4 flex-1">
                <div className="bg-muted rounded-lg p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">
                        Total Products:
                      </span>
                      <Badge variant="secondary">
                        {barcodeProducts.length}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">
                        Total Barcodes:
                      </span>
                      <Badge variant="default">{totalBarcodes}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Total Pages:</span>
                      <Badge variant="outline">{totalPages}</Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="text-sm text-muted-foreground space-y-2">
                  <p className="font-medium">PDF Layout:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• A4 page size</li>
                    <li>• 8 rows × 3 columns (24 barcodes per page)</li>
                    <li>• Includes product name and price</li>
                    <li>• Scannable barcode format</li>
                  </ul>
                </div>

                {totalBarcodes > 24 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> Your barcodes will be split across{" "}
                      {totalPages} pages.
                    </p>
                  </div>
                )}

                {totalBarcodes === 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      <strong>Warning:</strong> No barcodes will be generated.
                      Please set quantity for at least one product.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handlePrint}
            disabled={isLoading || totalBarcodes === 0}
            className="min-w-[120px]"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Printer className="h-4 w-4 mr-2" />
                Generate PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
