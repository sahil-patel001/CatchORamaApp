import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle } from "lucide-react";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { Product, Category } from "@/types";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { useQuery } from "@tanstack/react-query";
import { getCategories } from "@/services/categoryService";
import { calculateCubicWeight } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

// Cubic weight threshold (should match backend config)
const CUBIC_WEIGHT_THRESHOLD = 32; // kg

interface EditProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onEdit: (product: Product, imageFile: File | null) => void;
  isLoading?: boolean;
}

export const EditProductModal = React.memo(
  ({
    open,
    onOpenChange,
    product,
    onEdit,
    isLoading = false,
  }: EditProductModalProps) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [formData, setFormData] = useState({
      name: "",
      price: "",
      discountPrice: "",
      stock: "",
      lowStockThreshold: "",
      category: "",
      description: "",
      length: "",
      breadth: "",
      height: "",
      weight: "",
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [hasFormChanged, setHasFormChanged] = useState(false);

    // Calculate cubic weight with memoization for performance
    const cubicWeight = useMemo(() => {
      const length = parseFloat(formData.length) || 0;
      const breadth = parseFloat(formData.breadth) || 0;
      const height = parseFloat(formData.height) || 0;
      return calculateCubicWeight(length, breadth, height);
    }, [formData.length, formData.breadth, formData.height]);

    // Check if cubic weight exceeds threshold
    const exceedsThreshold = useMemo(() => {
      return cubicWeight > 0 && cubicWeight > CUBIC_WEIGHT_THRESHOLD;
    }, [cubicWeight]);

    // Memoized input change handlers to prevent unnecessary re-renders
    const handleInputChange = useCallback(
      (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({ ...prev, [field]: e.target.value }));
        setHasFormChanged(true);
      },
      []
    );

    const handleSelectChange = useCallback(
      (field: string) => (value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setHasFormChanged(true);
      },
      []
    );

    const handleTextareaChange = useCallback(
      (field: string) => (value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setHasFormChanged(true);
      },
      []
    );

    // Fetch categories - for superadmin, filter by product's vendor
    const {
      data: categories,
      isLoading: categoriesLoading,
      error: categoriesError,
    } = useQuery<Category[]>({
      queryKey: ["categories", product?.vendorId],
      queryFn: () =>
        getCategories(
          user?.role === "superadmin" ? product?.vendorId : undefined
        ),
      enabled:
        !!product &&
        (user?.role === "vendor" ||
          (user?.role === "superadmin" && !!product?.vendorId)),
    });

    useEffect(() => {
      if (product && open) {
        // Only reset form data when modal is opened fresh (no pending changes)
        // or when the product changes
        if (!hasFormChanged) {
          setFormData({
            name: product.name,
            price: product.price.toString(),
            discountPrice: product.discountPrice
              ? product.discountPrice.toString()
              : "",
            stock: product.stock.toString(),
            lowStockThreshold:
              // Check both inventory.lowStockThreshold and direct lowStockThreshold for backward compatibility
              (
                product as Product & {
                  inventory?: { lowStockThreshold?: number };
                }
              )?.inventory?.lowStockThreshold?.toString() ||
              (
                product as Product & { lowStockThreshold?: number }
              )?.lowStockThreshold?.toString() ||
              "",
            category: product.category,
            description: product.description || "",
            length: product.length ? product.length.toString() : "",
            breadth: product.breadth ? product.breadth.toString() : "",
            height: product.height ? product.height.toString() : "",
            weight: product.weight ? product.weight.toString() : "",
          });
          setImageFile(null);
        }
      }
    }, [product, open, hasFormChanged]);

    // Reset form changed flag when modal is closed
    useEffect(() => {
      if (!open) {
        setHasFormChanged(false);
      }
    }, [open]);

    const handleSubmit = useCallback(
      (e: React.FormEvent) => {
        e.preventDefault();
        if (!product) return;

        const discountPrice = parseFloat(formData.discountPrice || "0");
        const fullPrice = parseFloat(formData.price || "0");
        if (fullPrice <= 0) {
            toast({
              title: "Price of product can not be zero!",
              description: "Please amend full price.",
              variant: "destructive",
            });
            return;
        }

        if (discountPrice >=  fullPrice) {
            toast({
            title: "Discount Price must be less than full price!",
            description: "Please amend discounted price.",
            variant: "destructive",
          });
          return;
        }

        // Check for required dimension fields
        if (
          !formData.length ||
          !formData.breadth ||
          !formData.height ||
          !formData.weight
        ) {
          toast({
            title: "Dimensions Required",
            description:
              "Please fill in all dimension fields (Length, Breadth, Height, Weight).",
            variant: "destructive",
          });
          return;
        }

        // Validate that category is not a placeholder value
        if (
          !formData.category ||
          ["loading", "error", "no-categories"].includes(formData.category)
        ) {
          toast({
            title: "Category Required",
            description: "Please select a valid category for the product.",
            variant: "destructive",
          });
          return;
        }

        const updatedProduct = {
          ...product,
          name: formData.name,
          price: parseFloat(formData.price),
          discountPrice: formData.discountPrice
            ? parseFloat(formData.discountPrice)
            : null,
          stock: parseInt(formData.stock),
          lowStockThreshold: formData.lowStockThreshold
            ? parseInt(formData.lowStockThreshold)
            : undefined,
          category: formData.category,
          description: formData.description,
          length: formData.length ? parseFloat(formData.length) : undefined,
          breadth: formData.breadth ? parseFloat(formData.breadth) : undefined,
          height: formData.height ? parseFloat(formData.height) : undefined,
          weight: formData.weight ? parseFloat(formData.weight) : undefined,
          cubicWeight: cubicWeight > 0 ? cubicWeight : undefined,
        };
        onEdit(updatedProduct, imageFile);
      },
      [product, formData, cubicWeight, imageFile, onEdit, toast]
    );

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update product information below.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto thin-scrollbar -mr-1 pr-4 modal-form-container">
            <form
              id="edit-product-form"
              onSubmit={handleSubmit}
              className="space-y-6 p-1"
            >
              <fieldset disabled={isLoading} className="space-y-6">
                <div className="grid gap-3">
                  <Label htmlFor="image">Product Image</Label>
                  <ImageUploader
                    onFileChange={(file) => {
                      setImageFile(file);
                      setHasFormChanged(true);
                    }}
                    existingImageUrl={
                      product?.images && product.images.length > 0
                        ? `${
                            import.meta.env.VITE_API_BASE_URL?.replace(
                              "/api/v1",
                              ""
                            ) || "http://localhost:5001"
                          }/${product.images[0].url}`
                        : null
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="name">
                    Product Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={handleInputChange("name")}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="price">
                    Price <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={handleInputChange("price")}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="discountPrice">
                    Discount Price (Optional)
                  </Label>
                  <Input
                    id="discountPrice"
                    type="number"
                    step="0.01"
                    value={formData.discountPrice}
                    onChange={handleInputChange("discountPrice")}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="stock">
                    Stock <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="stock"
                    type="number"
                    value={formData.stock}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        stock: e.target.value,
                      }));
                      setHasFormChanged(true);
                    }}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
                  <Input
                    id="lowStockThreshold"
                    type="number"
                    min="0"
                    max="10000"
                    value={formData.lowStockThreshold}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        lowStockThreshold: e.target.value,
                      }));
                      setHasFormChanged(true);
                    }}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    placeholder="e.g., 10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Get notified when stock falls below this quantity
                  </p>
                </div>
                <div className="grid gap-3">
                  <Label>Product Dimensions</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="length">
                        Length (cm) <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="length"
                        type="number"
                        step="0.01"
                        value={formData.length}
                        onChange={(e) => {
                          setFormData((prev) => ({
                            ...prev,
                            length: e.target.value,
                          }));
                          setHasFormChanged(true);
                        }}
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="breadth">
                        Breadth (cm) <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="breadth"
                        type="number"
                        step="0.01"
                        value={formData.breadth}
                        onChange={(e) => {
                          setFormData((prev) => ({
                            ...prev,
                            breadth: e.target.value,
                          }));
                          setHasFormChanged(true);
                        }}
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="height">
                        Height (cm) <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="height"
                        type="number"
                        step="0.01"
                        value={formData.height}
                        onChange={(e) => {
                          setFormData((prev) => ({
                            ...prev,
                            height: e.target.value,
                          }));
                          setHasFormChanged(true);
                        }}
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="weight">
                        Weight (kg) <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="weight"
                        type="number"
                        step="0.01"
                        value={formData.weight}
                        onChange={(e) => {
                          setFormData((prev) => ({
                            ...prev,
                            weight: e.target.value,
                          }));
                          setHasFormChanged(true);
                        }}
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="cubicWeight">Cubic Weight (Calculated)</Label>
                  <Input
                    id="cubicWeight"
                    type="text"
                    value={
                      cubicWeight > 0
                        ? `${cubicWeight} kg`
                        : "Enter dimensions to calculate"
                    }
                    readOnly
                    className="bg-muted cursor-not-allowed"
                    placeholder="Automatically calculated from dimensions"
                  />
                  <p className="text-xs text-muted-foreground">
                    Formula: (Length × Width × Height) ÷ 2500
                  </p>
                  {exceedsThreshold && (
                    <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
                      <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      <AlertDescription className="text-orange-800 dark:text-orange-200">
                        <strong>High Volume Product:</strong> This product has a
                        cubic weight of{" "}
                        <span className="font-semibold">
                          {cubicWeight.toFixed(2)}kg
                        </span>
                        , which exceeds our{" "}
                        <span className="font-semibold">
                          {CUBIC_WEIGHT_THRESHOLD}kg
                        </span>{" "}
                        threshold. This may result in higher shipping costs and
                        will be flagged for admin review.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category">
                    Category <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => {
                      setFormData((prev) => ({ ...prev, category: value }));
                      setHasFormChanged(true);
                    }}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          categoriesLoading
                            ? "Loading categories..."
                            : categoriesError
                            ? "Error loading categories"
                            : categories?.length === 0
                            ? "No categories available"
                            : "Select category"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {categoriesLoading ? (
                        <SelectItem value="loading" disabled>
                          Loading categories...
                        </SelectItem>
                      ) : categoriesError ? (
                        <SelectItem value="error" disabled>
                          Error loading categories
                        </SelectItem>
                      ) : categories?.length === 0 ? (
                        <SelectItem value="no-categories" disabled>
                          No categories available. Please create categories
                          first.
                        </SelectItem>
                      ) : (
                        categories?.map((category) => (
                          <SelectItem key={category._id} value={category.name}>
                            {category.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <RichTextEditor
                    value={formData.description}
                    onChange={(value) => {
                      setFormData((prev) => ({ ...prev, description: value }));
                      setHasFormChanged(true);
                    }}
                  />
                </div>
              </fieldset>
            </form>
          </div>
          <DialogFooter className="pt-6 mt-auto border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" form="edit-product-form" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Updating...
                </>
              ) : (
                "Update Product"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

EditProductModal.displayName = "EditProductModal";
