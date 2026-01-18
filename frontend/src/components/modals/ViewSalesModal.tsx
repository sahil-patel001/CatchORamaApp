import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DollarSign, ShoppingCart, TrendingUp, Building2 } from "lucide-react";
import { VendorInfo } from "@/types";

interface TransformedSalesData {
  id: string | number;
  date: string;
  revenue: number;
  orders: number;
  growth?: string;
  [key: string]: unknown;
}

interface ViewSalesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salesData: TransformedSalesData | null;
  vendorInfo?: VendorInfo;
}

export function ViewSalesModal({
  open,
  onOpenChange,
  salesData,
  vendorInfo,
}: ViewSalesModalProps) {
  if (!salesData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            Sales Details
          </DialogTitle>
          <DialogDescription>
            Detailed view of your sales for{" "}
            <span className="font-semibold">{salesData.date}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-6 flex-grow overflow-y-auto thin-scrollbar pr-2 py-4">
          {/* Left: Business Info */}
          {vendorInfo && (
            <Card>
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5 text-primary" />
                  Business Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Business Name:</span>
                  <span className="ml-2 font-medium">
                    {vendorInfo.businessName}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">ABN:</span>
                  <span className="ml-2 font-medium">{vendorInfo.abn.replace(/[^0-9]/g, '')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">GST:</span>
                  <Badge
                    variant={vendorInfo.gstRegistered ? "default" : "secondary"}
                    className="ml-2"
                  >
                    {vendorInfo.gstRegistered
                      ? "GST Registered"
                      : "Not GST Registered"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
          {/* Right: Sales Info */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="h-5 w-5 text-primary" />
                Sales Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Revenue:</span>
                <span className="ml-2 text-xl font-bold text-primary">
                  ${salesData.revenue.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Orders:</span>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{salesData.orders}</span>
              </div>
              {salesData.growth && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Growth:</span>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <Badge
                    variant={
                      Number(salesData.growth) >= 0 ? "default" : "destructive"
                    }
                  >
                    {Number(salesData.growth) >= 0 ? "+" : ""}
                    {salesData.growth}%
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
