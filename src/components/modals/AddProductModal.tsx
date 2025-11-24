import React, { useState, useMemo } from "react";
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
import { Product, Category, Vendor } from "@/types";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { useQuery } from "@tanstack/react-query";
import { getCategories } from "@/services/categoryService";
import { fetchVendors } from "@/services/vendorService";
import { calculateCubicWeight } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

// Cubic weight threshold (should match backend config)
const CUBIC_WEIGHT_THRESHOLD = 32; // kg

type NewProduct = Omit<
  Product,
  "_id" | "createdAt" | "vendorId" | "vendor" | "image"
>;

interface AddProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (product: NewProduct, imageFile: File | null) => void;
}

export function AddProductModal({
  open,
  onOpenChange,
  onAdd,
}: AddProductModalProps) {
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
    ...(user?.role === "superadmin" && { vendorId: "" }), // Only include vendorId for super admin
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

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

  // Fetch categories - for superadmin, only fetch when vendor is selected
  const {
    data: categories,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useQuery<Category[]>({
    queryKey: ["categories", formData.vendorId],
    queryFn: () =>
      getCategories(
        user?.role === "superadmin" ? formData.vendorId : undefined
      ),
    enabled:
      user?.role === "vendor" ||
      (user?.role === "superadmin" && !!formData.vendorId),
  });

  // Fetch vendors (only for super admin)
  const {
    data: vendors,
    isLoading: vendorsLoading,
    error: vendorsError,
  } = useQuery<Vendor[]>({
    queryKey: ["vendors"],
    queryFn: () => fetchVendors("", 1, 100), // Fetch all vendors for selection
    enabled: user?.role === "superadmin", // Only fetch for super admin
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.discountPrice && formData.discountPrice >= formData.price) {
        toast({
        title: "Discount Price must be less than full price!",
        description: "Please amend discounted price.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.category) {
      toast({
        title: "Category Required",
        description: "Please select a category for the product.",
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

    // For super admin, vendor selection is required
    if (user?.role === "superadmin" && !formData.vendorId) {
      toast({
        title: "Vendor Required",
        description: "Please select a vendor for the product.",
        variant: "destructive",
      });
      return;
    }

    const baseProduct = {
      id: Date.now().toString(),
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
      createdAt: new Date().toISOString(),
    };

    // Only include vendorId for super admin (vendors get it automatically from backend)
    const newProduct =
      user?.role === "superadmin" && formData.vendorId
        ? { ...baseProduct, vendorId: formData.vendorId }
        : baseProduct;

    onAdd(newProduct as NewProduct, imageFile);
    toast({
      title: "Success",
      description: "Product added successfully",
    });

    setFormData({
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
      ...(user?.role === "superadmin" && { vendorId: "" }), // Only include vendorId for super admin
    });
    setImageFile(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Add a new product to your catalog.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto thin-scrollbar -mr-1 pr-4 modal-form-container">
          <form
            id="add-product-form"
            onSubmit={handleSubmit}
            className="space-y-6 p-1"
          >
            <div className="grid gap-3">
              <Label htmlFor="image">Product Image</Label>
              <ImageUploader onFileChange={setImageFile} />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="name">
                Product Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="price">
                Price <span className="text-destructive">*</span>
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, price: e.target.value }))
                }
                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                required
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="discountPrice">Discount Price (Optional)</Label>
              <Input
                id="discountPrice"
                type="number"
                step="0.01"
                value={formData.discountPrice}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    discountPrice: e.target.value,
                  }))
                }
                onWheel={(e) => (e.target as HTMLInputElement).blur()}
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="stock">
                Stock <span className="text-destructive">*</span>
              </Label>
              <Input
                id="stock"
                type="number"
                value={formData.stock}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, stock: e.target.value }))
                }
                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                required
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
              <Input
                id="lowStockThreshold"
                type="number"
                min="0"
                max="10000"
                value={formData.lowStockThreshold}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    lowStockThreshold: e.target.value,
                  }))
                }
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
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        length: e.target.value,
                      }))
                    }
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
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        breadth: e.target.value,
                      }))
                    }
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
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        height: e.target.value,
                      }))
                    }
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
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        weight: e.target.value,
                      }))
                    }
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
                    threshold. This may result in higher shipping costs and will
                    be flagged for admin review.
                  </AlertDescription>
                </Alert>
              )}
            </div>
            {/* Vendor Selection - Only for Super Admin */}
            {user?.role === "superadmin" && (
              <div className="grid gap-3">
                <Label htmlFor="vendor">
                  Vendor <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.vendorId}
                  onValueChange={
                    (value) =>
                      setFormData((prev) => ({
                        ...prev,
                        vendorId: value,
                        category: "",
                      })) // Reset category when vendor changes
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        vendorsLoading
                          ? "Loading vendors..."
                          : vendorsError
                          ? "Error loading vendors"
                          : vendors?.length === 0
                          ? "No vendors available"
                          : "Select vendor"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {vendorsLoading && (
                      <SelectItem value="loading" disabled>
                        Loading vendors...
                      </SelectItem>
                    )}
                    {vendorsError && (
                      <SelectItem value="error" disabled>
                        Error loading vendors
                      </SelectItem>
                    )}
                    {vendors && vendors.length === 0 && (
                      <SelectItem value="empty" disabled>
                        No vendors available
                      </SelectItem>
                    )}
                    {vendors &&
                      vendors.length > 0 &&
                      vendors.map((vendor) => (
                        <SelectItem key={vendor._id} value={vendor._id}>
                          {vendor.businessName || vendor.user?.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-3">
              <Label htmlFor="category">
                Category <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, category: value }))
                }
                disabled={user?.role === "superadmin" && !formData.vendorId}
                required
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      user?.role === "superadmin" && !formData.vendorId
                        ? "Select vendor first"
                        : categoriesLoading
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
                  {categoriesLoading && (
                    <SelectItem value="loading" disabled>
                      Loading categories...
                    </SelectItem>
                  )}
                  {categoriesError && (
                    <SelectItem value="error" disabled>
                      Error loading categories
                    </SelectItem>
                  )}
                  {categories?.length === 0 &&
                    !categoriesLoading &&
                    !categoriesError && (
                      <SelectItem value="none" disabled>
                        No categories available. Please create categories first.
                      </SelectItem>
                    )}
                  {categories &&
                    categories.length > 0 &&
                    categories.map((category) => (
                      <SelectItem key={category._id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3">
              <Label htmlFor="description">Description</Label>
              <RichTextEditor
                value={formData.description}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, description: value }))
                }
              />
            </div>
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
          <Button type="submit" form="add-product-form">
            Add Product
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
