import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DataTable } from "@/components/DataTable";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { AddProductModal } from "@/components/modals/AddProductModal";
import { ViewProductModal } from "@/components/modals/ViewProductModal";
import { EditProductModal } from "@/components/modals/EditProductModal";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import * as productService from "@/services/productService";
import { Product } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatDate,
  getStockStatus,
  getStockBadgeVariant,
  getLowStockThreshold,
} from "@/lib/utils";

export function ProductManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderLinkageDialogOpen, setOrderLinkageDialogOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [orderLinkageData, setOrderLinkageData] = useState<any>(null);

  const {
    data: productsData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["products"],
    queryFn: () => productService.getProducts(),
  });
  const products = productsData?.data?.products || [];

  const createMutation = useMutation({
    mutationFn: (vars: { product: Partial<Product>; imageFile: File | null }) =>
      productService.createProduct(vars.product, vars.imageFile),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });

      // Show success message
      toast({ title: "Success", description: "Product created successfully." });

      setAddModalOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
      imageFile,
    }: {
      id: string;
      data: Partial<Product>;
      imageFile: File | null;
    }) => productService.updateProduct(id, data, imageFile),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });

      // Show success message
      toast({ title: "Success", description: "Product updated successfully." });

      setEditModalOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const checkOrderLinkageMutation = useMutation({
    mutationFn: productService.checkProductOrderLinkage,
    onSuccess: (data) => {
      setOrderLinkageData(data.data);
      if (data.data.hasLinkedOrders) {
        setOrderLinkageDialogOpen(true);
      } else {
        setDeleteDialogOpen(true);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: productService.deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Success", description: "Product deleted successfully." });
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: productService.archiveProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: "Success",
        description: "Product archived successfully.",
      });
      setOrderLinkageDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const columns = [
    {
      key: "images",
      header: "Image",
      sortable: false, // No business value in sorting images
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
      sortable: true, // Essential for finding products quickly
      render: (value: unknown) => (
        <span className="font-medium">{String(value)}</span>
      ),
    },
    {
      key: "price",
      header: "Price",
      sortable: true, // Essential for pricing strategy and competitive analysis
      render: (value: unknown) => `$${Number(value).toLocaleString()}`,
    },
    {
      key: "stock",
      header: "Stock",
      sortable: true, // Critical for inventory management and restocking decisions
      render: (value: unknown, product: Product) => {
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
      sortable: false, // Better handled by filtering, not sorting
      render: (value: unknown) => {
        const category = String(value);
        if (!category || category.toLowerCase() === "n/a") return "N/A";
        return category.charAt(0).toUpperCase() + category.slice(1);
      },
    },
    {
      key: "length",
      header: "Length",
      sortable: false, // Rarely needed for business operations
      render: (value: unknown) => (value ? `${value} cm` : "-"),
    },
    {
      key: "breadth",
      header: "Breadth",
      sortable: false, // Rarely needed for business operations
      render: (value: unknown) => (value ? `${value} cm` : "-"),
    },
    {
      key: "height",
      header: "Height",
      sortable: false, // Rarely needed for business operations
      render: (value: unknown) => (value ? `${value} cm` : "-"),
    },
    {
      key: "weight",
      header: "Weight",
      sortable: false, // Rarely needed for business operations
      render: (value: unknown) => (value ? `${value} kg` : "-"),
    },
    {
      key: "inventory.lowStockThreshold",
      header: "Low Stock Threshold",
      sortable: false, // Configuration value, not business-critical to sort
      render: (_: unknown, row: Product) => (
        <span className="whitespace-nowrap">
          {(row as any).inventory?.lowStockThreshold || "-"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true, // Important for product lifecycle management
      render: (_: unknown, row: Product) => {
        // Determine status based on stock levels if not provided by backend
        let status = (row as any).status;

        if (!status) {
          const currentStock = Number(row.stock);
          const lowStockThreshold = getLowStockThreshold(row);
          const stockStatus = getStockStatus(currentStock, lowStockThreshold);

          if (stockStatus === "out_of_stock") {
            status = "out_of_stock";
          } else {
            status = "active"; // Default to active for in-stock products
          }
        }

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
            {status ? status.replace("_", " ").toUpperCase() : "ACTIVE"}
          </Badge>
        );
      },
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: false, // Less frequently needed for business operations
      render: (value: unknown) => formatDate(String(value)),
    },
  ];

  const handleAdd = () => setAddModalOpen(true);
  const handleAddProduct = (
    product: Partial<Product>,
    imageFile: File | null
  ) => createMutation.mutate({ product, imageFile });

  const handleView = (product: Product) => {
    setSelectedProduct(product);
    setViewModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setEditModalOpen(true);
  };

  const handleEditProduct = (
    updatedProduct: Partial<Product>,
    imageFile: File | null
  ) => {
    if (selectedProduct?._id) {
      updateMutation.mutate({
        id: selectedProduct._id,
        data: updatedProduct,
        imageFile,
      });
    }
  };

  const handleDelete = (product: Product) => {
    setSelectedProduct(product);
    // Check for order linkage first
    if (product._id) {
      checkOrderLinkageMutation.mutate(product._id);
    }
  };

  const confirmDelete = () => {
    if (selectedProduct?._id) {
      deleteMutation.mutate(selectedProduct._id);
    }
  };

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Product Management
          </h1>
          <p className="text-muted-foreground">
            Manage your product catalog and inventory
          </p>
        </div>
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <h3 className="text-red-800 font-medium">Error fetching products</h3>
          <p className="text-red-600 text-sm mt-1">
            {error?.message || "An unknown error occurred"}
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Product Management
          </h1>
          <p className="text-muted-foreground">
            Manage your product catalog and inventory
          </p>
        </div>
        <Skeleton className="h-96 w-full" data-testid="skeleton" />
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
          Manage your product catalog and inventory
        </p>
      </div>

      <DataTable
        data={products as any[]}
        columns={columns as any[]}
        searchKey="name"
        searchPlaceholder="Search your products..."
        addButtonText="Add Product"
        onAdd={handleAdd}
        onView={handleView as any}
        onEdit={handleEdit as any}
        onDelete={handleDelete as any}
      />

      <AddProductModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onAdd={handleAddProduct}
      />

      {selectedProduct && (
        <ViewProductModal
          open={viewModalOpen}
          onOpenChange={setViewModalOpen}
          product={selectedProduct}
        />
      )}
      {selectedProduct && (
        <EditProductModal
          key={selectedProduct._id}
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          product={selectedProduct}
          onEdit={handleEditProduct}
          isLoading={updateMutation.isPending}
        />
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Product"
        description={`Are you sure you want to delete ${selectedProduct?.name}? This action cannot be undone.`}
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        open={orderLinkageDialogOpen}
        onOpenChange={setOrderLinkageDialogOpen}
        title="Cannot Delete Product"
        description={
          orderLinkageData ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                This product cannot be deleted because it is linked to{" "}
                <span className="font-semibold text-foreground">
                  {orderLinkageData.linkedOrdersCount}
                </span>{" "}
                existing order
                {orderLinkageData.linkedOrdersCount > 1 ? "s" : ""}.
              </p>
              {orderLinkageData.linkedOrders &&
                orderLinkageData.linkedOrders.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Recent orders:</p>
                    <div className="space-y-1">
                      {orderLinkageData.linkedOrders.map(
                        (order: any, index: number) => (
                          <div
                            key={index}
                            className="text-xs bg-muted p-2 rounded"
                          >
                            <span className="font-mono">
                              {order.orderNumber}
                            </span>{" "}
                            - {order.status}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              <p className="text-sm text-muted-foreground">
                To remove this product, you can archive it instead. This will
                hide it from your active products while preserving order
                history.
              </p>
            </div>
          ) : (
            "This product cannot be deleted because it is linked to existing orders."
          )
        }
        confirmText="Archive Product"
        cancelText="Cancel"
        onConfirm={() => {
          if (selectedProduct?._id) {
            archiveMutation.mutate(selectedProduct._id);
          }
        }}
      />
    </div>
  );
}
