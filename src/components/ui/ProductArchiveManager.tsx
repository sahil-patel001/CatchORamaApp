import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DataTable } from "@/components/DataTable";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ViewProductModal } from "@/components/modals/ViewProductModal";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import * as productService from "@/services/productService";
import { Product } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { Archive, ArchiveRestore } from "lucide-react";

export function ProductArchiveManager() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [unarchiveDialogOpen, setUnarchiveDialogOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const {
    data: archivedProductsData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["archived-products"],
    queryFn: () => productService.getArchivedProducts(),
  });
  const archivedProducts = archivedProductsData?.data?.products || [];

  const unarchiveMutation = useMutation({
    mutationFn: productService.unarchiveProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["archived-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: "Success",
        description: "Product restored successfully.",
      });
      setUnarchiveDialogOpen(false);
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
      render: (value: unknown) => (
        <span className="font-medium">{String(value)}</span>
      ),
    },
    {
      key: "price",
      header: "Price",
      render: (value: unknown) => `$${Number(value).toLocaleString()}`,
    },
    {
      key: "stock",
      header: "Stock",
      render: (value: unknown) => (
        <Badge variant="secondary">{Number(value)} units</Badge>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (value: unknown) => {
        const category = String(value);
        if (!category || category.toLowerCase() === "n/a") return "N/A";
        return category.charAt(0).toUpperCase() + category.slice(1);
      },
    },
    {
      key: "status",
      header: "Status",
      render: () => (
        <Badge variant="outline" className="text-orange-600 border-orange-600">
          <Archive className="w-3 h-3 mr-1" />
          Archived
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      render: (value: unknown) => formatDate(String(value)),
    },
    {
      key: "actions",
      header: "Actions",
      render: (_: unknown, product: Product) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleUnarchive(product)}
          className="text-green-600 hover:text-green-700 hover:bg-green-50"
        >
          <ArchiveRestore className="w-4 h-4 mr-1" />
          Restore
        </Button>
      ),
    },
  ];

  const handleView = (product: Product) => {
    setSelectedProduct(product);
    setViewModalOpen(true);
  };

  const handleUnarchive = (product: Product) => {
    setSelectedProduct(product);
    setUnarchiveDialogOpen(true);
  };

  const confirmUnarchive = () => {
    if (selectedProduct?._id) {
      unarchiveMutation.mutate(selectedProduct._id);
    }
  };

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Archived Products
          </h1>
          <p className="text-muted-foreground">
            View and manage your archived products
          </p>
        </div>
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <h3 className="text-red-800 font-medium">
            Error fetching archived products
          </h3>
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
            Archived Products
          </h1>
          <p className="text-muted-foreground">
            View and manage your archived products
          </p>
        </div>
        <Skeleton className="h-96 w-full" data-testid="skeleton" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Archived Products</h1>
        <p className="text-muted-foreground">
          View and manage your archived products. These products are hidden from
          your active catalog but preserved for order history.
        </p>
      </div>

      <DataTable
        data={archivedProducts as any[]}
        columns={columns as any[]}
        searchKey="name"
        searchPlaceholder="Search archived products..."
        onView={handleView as any}
        hideAddButton={true}
        hideEditButton={true}
        hideDeleteButton={true}
      />

      {selectedProduct && (
        <ViewProductModal
          open={viewModalOpen}
          onOpenChange={setViewModalOpen}
          product={selectedProduct}
        />
      )}

      <ConfirmDialog
        open={unarchiveDialogOpen}
        onOpenChange={setUnarchiveDialogOpen}
        title="Restore Product"
        description={`Are you sure you want to restore ${selectedProduct?.name}? This will make it visible in your active product catalog again.`}
        confirmText="Restore Product"
        cancelText="Cancel"
        onConfirm={confirmUnarchive}
      />
    </div>
  );
}
