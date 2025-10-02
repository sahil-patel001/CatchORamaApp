import React from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/utils";
import { Order } from "@/types";
import { generateInvoice } from "@/lib/invoiceGenerator";
import {
  User,
  Truck,
  Package,
  FileText,
  Clock,
  CircleDollarSign,
  Mail,
} from "lucide-react";

interface ViewOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
}

export function ViewOrderModal({
  open,
  onOpenChange,
  order,
}: ViewOrderModalProps) {
  if (!order) return null;

  const handleDownloadInvoice = () => {
    if (order) {
      generateInvoice(order);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "secondary",
      processing: "default",
      shipped: "default",
      delivered: "default",
      cancelled: "destructive",
    } as const;
    const statusText = status.charAt(0).toUpperCase() + status.slice(1);
    return (
      <Badge variant={variants[status as keyof typeof variants] || "secondary"}>
        {statusText}
      </Badge>
    );
  };

  const shippingCost = 5.0; // Mock data, replace with actual data if available
  const tax = order.orderTotal * 0.1; // Mock 10% tax, replace if available

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-4">
            <span className="text-2xl font-bold">
              Order #{order.orderNumber}
            </span>
            {getStatusBadge(order.status)}
          </DialogTitle>
          <div className="text-sm text-muted-foreground flex items-center gap-2 pt-1">
            <Clock className="h-4 w-4" />
            <span>{formatDate(order.createdAt)}</span>
          </div>
        </DialogHeader>
        <div className="grid md:grid-cols-3 gap-6 flex-grow overflow-y-auto thin-scrollbar pr-2 py-4">
          {/* Left Column */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-5 w-5" />
                  Order Summary
                </CardTitle>
                <span className="text-sm text-muted-foreground">
                  {order.items.length} item(s)
                </span>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center">
                          {/* Placeholder for product image */}
                          <Package className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-semibold">
                            {item.productId.name || "Product"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Qty: {item.quantity || 1}
                          </p>
                        </div>
                      </div>
                      <p className="font-medium">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                  <Separator />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>${order.orderTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>${shippingCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax (GST)</span>
                      <span>${tax.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-base">
                      <span>Total</span>
                      <span>
                        ${(order.orderTotal + shippingCost + tax).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5" />
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{order.customer.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`mailto:${order.customer.email}`}
                    className="text-primary hover:underline"
                  >
                    {order.customer.email}
                  </a>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Truck className="h-5 w-5" />
                  Shipping
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  Shipping details not yet available.
                </p>
                {order.trackingLink && (
                  <Button variant="outline" size="sm" asChild className="mt-2">
                    <a
                      href={order.trackingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Track Package
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={handleDownloadInvoice}>
            <FileText className="h-4 w-4 mr-2" />
            Download Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
