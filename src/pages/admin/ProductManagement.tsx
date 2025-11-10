import React, { useState } from "react";
import { DataTable } from "@/components/DataTable";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { AddProductModal } from "@/components/modals/AddProductModal";
import { ViewProductModal } from "@/components/modals/ViewProductModal";
import { EditProductModal } from "@/components/modals/EditProductModal";
import { BarcodeModal } from "@/components/modals/BarcodeModal";
import { StatusFilter } from "@/components/StatusFilter";
import { VendorFilter } from "@/components/ui/VendorFilter";
import {
  BarcodeButtonLoadingState,
  BarcodeOperationStatus,
} from "@/components/ui/BarcodeLoadingState";
import { useBarcodeOperations } from "@/hooks/useBarcodeOperations";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatDate,
  getStockStatus,
  getStockBadgeVariant,
  getLowStockThreshold,
} from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as productService from "@/services/productService";
import * as barcodeService from "@/services/barcodeService";
import { Product } from "@/types";
import { Printer, X, Loader2 } from "lucide-react";

// Product status options for filtering
const PRODUCT_STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "draft", label: "Draft" },
  { value: "out_of_stock", label: "Out of Stock" },
];

type ProductStatus = "all" | "active" | "inactive" | "draft" | "out_of_stock";

export function ProductManagement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["products"],
    queryFn: () => productService.getProducts(),
  });
  const products: Product[] = data?.products || [];
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [statusFilter, setStatusFilter] = useState<ProductStatus>("all");
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const { toast } = useToast();
  const { state: barcodeState, generateBulkBarcodes } = useBarcodeOperations();

  // Check if user is admin for barcode features
  const isAdmin = user?.role === "superadmin";

  const columns = [
    {
      key: "images",
      header: "Image",
      sortable: false, // Images are not sortable
      render: (_: unknown, product: Product) => (
        <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
          {product.images && product.images.length > 0 ? (
            <img
              src={`${
                import.meta.env.VITE_API_BASE_URL?.replace("/api/v1", "") ||
                "http://localhost:5001"
              }/${product.images[0].url}`}
              alt={product.images[0].alt || product.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <span className="text-xs text-gray-400">No image</span>
          )}
        </div>
      ),
    },
    {
      key: "name",
      header: "Product Name",
      sortable: true, // Essential for finding specific products
      render: (value: string) => (
        <span className="whitespace-nowrap font-medium">{value}</span>
      ),
    },
    {
      key: "vendor.businessName",
      header: "Vendor",
      sortable: true, // Important for organizing by vendor
      render: (_: unknown, row: Product) => (
        <span className="whitespace-nowrap">{row.vendor?.businessName}</span>
      ),
    },
    {
      key: "price",
      header: "Price",
      sortable: true, // Critical for price analysis and comparison
      render: (value: number, row: Product) => (
        <div className="flex flex-col whitespace-nowrap">
          <span
            className={
              row.discountPrice
                ? "line-through text-muted-foreground text-sm"
                : "font-semibold"
            }
          >
            ${value}
          </span>
          {row.discountPrice && (
            <span className="text-green-600 font-semibold">
              ${row.discountPrice}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "stock",
      header: "Stock",
      sortable: true, // Essential for inventory management
      render: (value: number, product: Product) => {
        const currentStock = Number(value);
        const lowStockThreshold = getLowStockThreshold(product);
        const stockStatus = getStockStatus(currentStock, lowStockThreshold);
        const badgeVariant = getStockBadgeVariant(stockStatus);

        return (
          <div className="flex flex-col gap-1">
            <Badge variant={badgeVariant}>{currentStock} units</Badge>
            {stockStatus === "low_stock" && (
              <span className="text-xs text-orange-600 font-medium">
                ⚠️ Low Stock
              </span>
            )}
            {stockStatus === "out_of_stock" && (
              <span className="text-xs text-red-600 font-medium">
                🚫 Out of Stock
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "category",
      header: "Category",
      sortable: true, // Useful for organizing products by category
      render: (value: string) => (
        <span className="whitespace-nowrap">{value}</span>
      ),
    },
    {
      key: "length",
      header: "Length",
      sortable: true, // Useful for shipping and dimension analysis
      render: (value: unknown) => (
        <span className="whitespace-nowrap">{value ? `${value} cm` : "-"}</span>
      ),
    },
    {
      key: "breadth",
      header: "Breadth",
      sortable: true, // Useful for shipping and dimension analysis
      render: (value: unknown) => (
        <span className="whitespace-nowrap">{value ? `${value} cm` : "-"}</span>
      ),
    },
    {
      key: "height",
      header: "Height",
      sortable: true, // Useful for shipping and dimension analysis
      render: (value: unknown) => (
        <span className="whitespace-nowrap">{value ? `${value} cm` : "-"}</span>
      ),
    },
    {
      key: "weight",
      header: "Weight",
      sortable: true, // Important for shipping cost calculations
      render: (value: unknown) => (
        <span className="whitespace-nowrap">{value ? `${value} kg` : "-"}</span>
      ),
    },
    {
      key: "inventory.lowStockThreshold",
      header: "Low Stock Threshold",
      sortable: false, // Configuration value, less useful to sort
      render: (_: unknown, row: Product) => (
        <span className="whitespace-nowrap">
          {row.inventory?.lowStockThreshold || "-"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true, // Important for product lifecycle management
      render: (_: unknown, row: Product) => {
        const status = (row as any).status;
        const statusColors = {
          active: "bg-green-100 text-green-800",
          inactive: "bg-red-100 text-red-800",
          draft: "bg-yellow-100 text-yellow-800",
          out_of_stock: "bg-gray-100 text-gray-800",
        };
        return (
          <Badge
            className={
              statusColors[status as keyof typeof statusColors] ||
              "bg-gray-100 text-gray-800"
            }
          >
            {status ? status.replace("_", " ").toUpperCase() : "UNKNOWN"}
          </Badge>
        );
      },
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: false, // Less frequently needed for business operations
      render: (value: string) => (
        <span className="text-muted-foreground">{formatDate(value)}</span>
      ),
    },
  ];

  const handleAdd = () => {
    setAddModalOpen(true);
  };

  const addMutation = useMutation({
    mutationFn: (vars: { product: Partial<Product>; imageFile: File | null }) =>
      productService.createProduct(vars.product, vars.imageFile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Success", description: "Product created successfully." });
      setAddModalOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create product",
        variant: "destructive",
      });
    },
  });
  const handleAddProduct = (
    product: Partial<Product>,
    imageFile: File | null
  ) => {
    addMutation.mutate({ product, imageFile });
  };

  const handleView = (product: Product) => {
    setSelectedProduct(product);
    setViewModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setEditModalOpen(true);
  };

  const editMutation = useMutation({
    mutationFn: (vars: {
      id: string;
      data: Partial<Product>;
      imageFile: File | null;
    }) => productService.updateProduct(vars.id, vars.data, vars.imageFile),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });

      // Show success message
      toast({ title: "Success", description: "Product updated successfully." });

      setEditModalOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update product",
        variant: "destructive",
      });
    },
  });
  const handleEditProduct = (
    updatedProduct: Partial<Product>,
    imageFile: File | null
  ) => {
    if (selectedProduct?._id) {
      editMutation.mutate({
        id: selectedProduct._id,
        data: updatedProduct,
        imageFile,
      });
    }
  };

  const handleDelete = (product: Product) => {
    setSelectedProduct(product);
    setDeleteDialogOpen(true);
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productService.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Success", description: "Product deleted successfully." });
      setDeleteDialogOpen(false);
      setSelectedProduct(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete product",
        variant: "destructive",
      });
    },
  });
  const confirmDelete = () => {
    if (selectedProduct?._id) {
      deleteMutation.mutate(selectedProduct._id);
    }
  };

  // Helper function to filter products
  const getFilteredProducts = React.useCallback(
    (statusVal: string, vendorVal: string) => {
      return products.filter((product: Product) => {
        const status = (product as any).status;
        const vendorName = product.vendor?.businessName;
        const statusMatch = statusVal === "all" || status === statusVal;
        const vendorMatch = vendorVal === "all" || vendorName === vendorVal;
        return statusMatch && vendorMatch;
      });
    },
    [products]
  );

  const handleStatusChange = (value: string) => {
    setStatusFilter(value as ProductStatus);
    // Clear selections that are no longer visible due to filter change
    if (selectedProducts.length > 0) {
      const newFilteredProducts = getFilteredProducts(value, vendorFilter);

      const filteredProductIds = new Set(
        newFilteredProducts.map((p) => p._id || p.id)
      );
      const visibleSelections = selectedProducts.filter((product) =>
        filteredProductIds.has(product._id || product.id)
      );

      if (visibleSelections.length !== selectedProducts.length) {
        setSelectedProducts(visibleSelections);
        if (visibleSelections.length === 0 && selectedProducts.length > 0) {
          toast({
            title: "Selections cleared",
            description:
              "Selected products are no longer visible with current filters",
            variant: "default",
          });
        }
      }
    }
  };

  const handleVendorChange = (value: string) => {
    setVendorFilter(value);
    // Clear selections that are no longer visible due to filter change
    if (selectedProducts.length > 0) {
      const newFilteredProducts = getFilteredProducts(statusFilter, value);

      const filteredProductIds = new Set(
        newFilteredProducts.map((p) => p._id || p.id)
      );
      const visibleSelections = selectedProducts.filter((product) =>
        filteredProductIds.has(product._id || product.id)
      );

      if (visibleSelections.length !== selectedProducts.length) {
        setSelectedProducts(visibleSelections);
        if (visibleSelections.length === 0 && selectedProducts.length > 0) {
          toast({
            title: "Selections cleared",
            description:
              "Selected products are no longer visible with current filters",
            variant: "default",
          });
        }
      }
    }
  };

  // Filter products by status and vendor
  const filteredProducts = React.useMemo(() => {
    return getFilteredProducts(statusFilter, vendorFilter);
  }, [getFilteredProducts, statusFilter, vendorFilter]);

  const handleSelectionChange = (selectedItems: Product[]) => {
    setSelectedProducts(selectedItems);
  };

  const handlePrintBarcode = async () => {
    // Extract product IDs from selected products
    const productIds = selectedProducts
      .map((product) => product._id || product.id)
      .filter(Boolean) as string[];

    // Generate barcodes using the hook
    const result = await generateBulkBarcodes(productIds);

    if (result.success) {
      // Open barcode print modal with selected products
      setBarcodeModalOpen(true);
    }
  };

  const handleClearSelection = () => {
    setSelectedProducts([]);
    toast({
      title: "Selection cleared",
      description: "All product selections have been cleared",
      variant: "default",
    });
  };

  const handleBarcodeSelectionChange = (products: Product[]) => {
    setSelectedProducts(products);
  };

  const handleBarcodeModalPrint = async (
    barcodeProducts: Array<{ product: Product; quantity: number }>
  ) => {
    setPdfGenerating(true);

    try {
      const {
        generateBarcodePDF,
        downloadPDF,
        generatePDFFilename,
        validatePDFGeneration,
      } = await import("@/lib/pdf-utils");

      // Validate input
      const validation = validatePDFGeneration(barcodeProducts);
      if (!validation.isValid) {
        toast({
          title: "Validation Error",
          description: validation.errors.join(", "),
          variant: "destructive",
        });
        return;
      }

      // Show warnings if any
      if (validation.warnings.length > 0) {
        toast({
          title: "Warning",
          description: validation.warnings.join(", "),
          variant: "default",
        });
      }

      // Calculate total barcodes
      const totalBarcodes = barcodeProducts.reduce(
        (total, item) => total + item.quantity,
        0
      );

      // Generate PDF
      const result = await generateBarcodePDF(barcodeProducts, {
        pageSize: "a4",
        orientation: "portrait",
        rows: 8,
        columns: 3,
        showProductInfo: true,
        showPrice: true,
        showVendor: false,
      });

      if (result.success && result.pdfBlob) {
        // Generate filename and download
        const filename = generatePDFFilename(barcodeProducts);
        downloadPDF(result.pdfBlob, filename);

        // Close the modal after successful generation
        setBarcodeModalOpen(false);
      } else {
        throw new Error(result.error || "Failed to generate PDF");
      }
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast({
        title: "PDF Generation Failed",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setPdfGenerating(false);
    }
  };

  // Count of visible selected products
  const visibleSelectedCount = React.useMemo(() => {
    const visibleProductIds = new Set(
      filteredProducts.map((p) => p._id || p.id)
    );
    return selectedProducts.filter((product) =>
      visibleProductIds.has(product._id || product.id)
    ).length;
  }, [filteredProducts, selectedProducts]);

  // Generate vendor options from products
  const vendorOptions = React.useMemo(() => {
    const uniqueVendors = Array.from(
      new Set(
        products.map((product) => product.vendor?.businessName).filter(Boolean)
      )
    ).sort();

    return [
      { value: "all", label: "All Vendors" },
      ...uniqueVendors.map((vendorName) => ({
        value: vendorName,
        label: vendorName,
      })),
    ];
  }, [products]);

  // Create filter component
  const filterComponent = (
    <div className="flex items-center gap-4">
      <StatusFilter
        value={statusFilter}
        onValueChange={handleStatusChange}
        options={PRODUCT_STATUS_OPTIONS}
        placeholder="Filter by status"
        label="Status"
      />
      <VendorFilter
        value={vendorFilter}
        onValueChange={handleVendorChange}
        options={vendorOptions}
        placeholder="All vendors"
        label="Vendor"
      />
    </div>
  );

  if (isLoading) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        Loading products...
      </div>
    );
  }
  if (isError) {
    return (
      <div className="py-10 text-center text-red-500">
        {error instanceof Error ? error.message : "Failed to load products"}
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Product Management
        </h1>
        <p className="text-muted-foreground">
          Manage all products across all vendors
        </p>
      </div>

      {/* Print Barcode Button - appears when products are selected (Admin only) */}
      {selectedProducts.length > 0 && (
        <div className="flex items-center justify-between bg-muted border rounded-lg p-4">
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium text-foreground">
              {selectedProducts.length} product
              {selectedProducts.length > 1 ? "s" : ""} selected
              {visibleSelectedCount !== selectedProducts.length && (
                <span className="text-muted-foreground font-normal">
                  {" "}
                  ({visibleSelectedCount} visible)
                </span>
              )}
            </div>
            <BarcodeOperationStatus
              isLoading={barcodeState.isLoading}
              status={barcodeState.status}
              message={barcodeState.message}
              progress={barcodeState.progress}
              className="text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrintBarcode}
              size="sm"
              disabled={barcodeState.isLoading}
            >
              <BarcodeButtonLoadingState
                isLoading={barcodeState.isLoading}
                loadingText="Generating..."
                defaultText="Print Barcode"
                icon="printer"
                size="sm"
              />
            </Button>
            <Button
              onClick={handleClearSelection}
              variant="ghost"
              size="sm"
              title="Clear all selections"
              disabled={barcodeState.isLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Selection Summary - appears when there are hidden selections */}
      {selectedProducts.length > 0 &&
        visibleSelectedCount < selectedProducts.length && (
          <div className="bg-secondary border rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-secondary-foreground">
              <span className="font-medium">
                Note: {selectedProducts.length - visibleSelectedCount} selected
                products are hidden by current filters
              </span>
              <Button
                onClick={() => {
                  setStatusFilter("all");
                  setVendorFilter("all");
                }}
                variant="link"
                size="sm"
                className="p-0 h-auto font-normal underline"
              >
                Show all products
              </Button>
            </div>
          </div>
        )}

      <DataTable
        data={filteredProducts}
        columns={columns}
        searchKey="name"
        searchPlaceholder="Search products..."
        addButtonText="Add Product"
        onAdd={handleAdd}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        filterComponent={filterComponent}
        enableSelection={isAdmin && !barcodeState.isLoading}
        selectedItems={selectedProducts}
        onSelectionChange={handleSelectionChange}
      />
      <AddProductModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onAdd={handleAddProduct}
      />
      <ViewProductModal
        open={viewModalOpen}
        onOpenChange={setViewModalOpen}
        product={selectedProduct}
      />
      <EditProductModal
        key={selectedProduct?._id}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        product={selectedProduct}
        onEdit={handleEditProduct}
        isLoading={editMutation.isPending}
      />
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Product"
        description={`Are you sure you want to delete ${selectedProduct?.name}? This action cannot be undone.`}
        onConfirm={confirmDelete}
      />
      <BarcodeModal
        open={barcodeModalOpen}
        onOpenChange={setBarcodeModalOpen}
        selectedProducts={selectedProducts}
        onPrintBarcode={handleBarcodeModalPrint}
        onSelectionChange={handleBarcodeSelectionChange}
        isLoading={pdfGenerating}
      />
    </div>
  );
}
