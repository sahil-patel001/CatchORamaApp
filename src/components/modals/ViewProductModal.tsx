import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DollarSign,
  Package,
  Sparkles,
  Info,
  Ruler,
  Weight,
} from "lucide-react";
import { Product } from "@/types";
import { formatDate } from "@/lib/utils";

interface ViewProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

export function ViewProductModal({
  open,
  onOpenChange,
  product,
}: ViewProductModalProps) {
  if (!product) return null;

  const getStockBadge = (stock: number) => {
    if (stock === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    }
    if (stock < 10) {
      return <Badge variant="secondary">Low Stock ({stock} left)</Badge>;
    }
    return <Badge variant="default">In Stock ({stock})</Badge>;
  };

  const discountPercentage = product.discountPrice
    ? Math.round(
        ((product.price - product.discountPrice) / product.price) * 100
      )
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold">
            {product.name}
          </DialogTitle>
          <DialogDescription>Detailed view of your product.</DialogDescription>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-8 flex-grow overflow-y-auto thin-scrollbar pr-4 py-4">
          {/* Left Column: Image */}
          <div className="flex items-center justify-center bg-muted/30 rounded-lg overflow-hidden h-96">
            {product.images && product.images.length > 0 ? (
              <img
                src={`${
                  import.meta.env.VITE_API_BASE_URL?.replace("/api/v1", "") ||
                  "http://localhost:5001"
                }/${product.images[0].url}`}
                alt={product.images[0].alt || product.name}
                className="w-full h-full object-contain transition-transform duration-300 hover:scale-105"
              />
            ) : (
              <div className="text-muted-foreground text-center">
                <Package className="w-16 h-16 mx-auto" />
                <p>No Image</p>
              </div>
            )}
          </div>

          {/* Right Column: Details */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground flex items-center mb-2">
                <DollarSign className="w-5 h-5 mr-2 text-primary" />
                Pricing
              </h3>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold text-primary">
                  ${(product.discountPrice || product.price).toFixed(2)}
                </span>
                {product.discountPrice && (
                  <span className="text-xl text-muted-foreground line-through">
                    ${product.price.toFixed(2)}
                  </span>
                )}
              </div>
              {discountPercentage > 0 && (
                <p className="text-sm text-green-600 font-medium mt-1">
                  You save $
                  {(product.price - product.discountPrice!).toFixed(2)} (
                  {discountPercentage}%)
                </p>
              )}
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold text-foreground flex items-center mb-3">
                <Info className="w-5 h-5 mr-2 text-primary" />
                Details
              </h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div className="font-medium text-muted-foreground">Stock</div>
                <div>{getStockBadge(product.stock)}</div>

                <div className="font-medium text-muted-foreground">
                  Category
                </div>
                <div>
                  <Badge variant="outline">
                    {product.category.charAt(0).toUpperCase() +
                      product.category.slice(1) || "N/A"}
                  </Badge>
                </div>

                <div className="font-medium text-muted-foreground">
                  Date Added
                </div>
                <div>{formatDate(product.createdAt)}</div>

                {(product.height || product.weight) && (
                  <>
                    {product.height && (
                      <>
                        <div className="font-medium text-muted-foreground flex items-center">
                          <Ruler className="w-4 h-4 mr-1" />
                          Height
                        </div>
                        <div>{product.height} cm</div>
                      </>
                    )}
                    {product.weight && (
                      <>
                        <div className="font-medium text-muted-foreground flex items-center">
                          <Weight className="w-4 h-4 mr-1" />
                          Weight
                        </div>
                        <div>{product.weight} kg</div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            <Separator />

            {product.description && (
              <div>
                <h3 className="text-lg font-semibold text-foreground flex items-center mb-2">
                  <Sparkles className="w-5 h-5 mr-2 text-primary" />
                  Description
                </h3>
                <div
                  className="prose prose-sm dark:prose-invert text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
