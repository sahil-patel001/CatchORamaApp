import React from "react";
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
  User,
  Mail,
  Phone,
  Calendar,
  Store,
  MapPin,
  BarChart3,
  Package,
  ShoppingCart,
  DollarSign,
  Building,
  FileText,
  AlertCircle,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Vendor } from "@/types";

interface ViewVendorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: Vendor | null;
}

export function ViewVendorModal({
  open,
  onOpenChange,
  vendor,
}: ViewVendorModalProps) {
  if (!vendor) return null;

  const getStatusBadge = (status: Vendor["status"]) => {
    switch (status.toLowerCase()) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "inactive":
        return <Badge className="bg-red-100 text-red-800">Inactive</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-3xl font-bold">
                {vendor.businessName}
              </DialogTitle>
              <DialogDescription className="mt-1.5">
                Vendor Profile & Business Information
              </DialogDescription>
            </div>
            <div>{getStatusBadge(vendor.status)}</div>
          </div>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-8 flex-grow overflow-y-auto thin-scrollbar pr-4 py-4">
          {/* Left Column: Basic Info & Stats */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground flex items-center mb-3">
                <User className="w-5 h-5 mr-2 text-primary" />
                Contact Information
              </h3>
              <div className="grid gap-3 text-sm">
                {vendor.user && (
                  <>
                    <div className="flex items-center text-muted-foreground">
                      <User className="w-4 h-4 mr-2" />
                      {vendor.user.name}
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Mail className="w-4 h-4 mr-2" />
                      {vendor.user.email}
                    </div>
                  </>
                )}
                {vendor.phone && (
                  <div className="flex items-center text-muted-foreground">
                    <Phone className="w-4 h-4 mr-2" />
                    {vendor.phone}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold text-foreground flex items-center mb-3">
                <Building className="w-5 h-5 mr-2 text-primary" />
                Business Details
              </h3>
              <div className="grid gap-3 text-sm">
                <div className="flex items-center text-muted-foreground">
                  <Store className="w-4 h-4 mr-2" />
                  Trading as: {vendor.businessName}
                </div>
                {vendor.businessDetails?.taxId && (
                  <div className="flex items-center text-muted-foreground">
                    <FileText className="w-4 h-4 mr-2" />
                    ABN: {vendor.businessDetails.taxId.replace(/[^0-9]/g, '')}
                  </div>
                )}
                {vendor.businessDetails?.gstRegistered && (
                  <div className="flex items-center text-muted-foreground">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    GST Registered
                  </div>
                )}
                {vendor.address && (
                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="w-4 h-4 mr-2" />
                    {vendor.address.full ||
                      [
                        vendor.address.street,
                        vendor.address.city,
                        vendor.address.state,
                        vendor.address.zipCode,
                        vendor.address.country,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                  </div>
                )}
                {vendor.businessDetails?.businessType && (
                  <div className="flex items-center text-muted-foreground">
                    <Building className="w-4 h-4 mr-2" />
                    Business Type: {vendor.businessDetails.businessType}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Stats & Activity */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground flex items-center mb-3">
                <BarChart3 className="w-5 h-5 mr-2 text-primary" />
                Performance Statistics
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 flex flex-col items-center justify-center text-center">
                  <Package className="w-8 h-8 text-primary mb-2" />
                  <div className="text-2xl font-bold">
                    {vendor.stats?.products || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Products</div>
                </Card>
                <Card className="p-4 flex flex-col items-center justify-center text-center">
                  <ShoppingCart className="w-8 h-8 text-primary mb-2" />
                  <div className="text-2xl font-bold">
                    {vendor.stats?.orders || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Orders</div>
                </Card>
                <Card className="p-4 col-span-2 flex flex-col items-center justify-center text-center">
                  <DollarSign className="w-8 h-8 text-primary mb-2" />
                  <div className="text-2xl font-bold">
                    ${(vendor.stats?.revenue || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Revenue
                  </div>
                </Card>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold text-foreground flex items-center mb-3">
                <Calendar className="w-5 h-5 mr-2 text-primary" />
                Account Information
              </h3>
              <div className="grid gap-3 text-sm">
                <div className="flex items-center text-muted-foreground">
                  <Calendar className="w-4 h-4 mr-2" />
                  Member since {formatDate(vendor.createdAt)}
                </div>
                {vendor.user?.lastLogin && (
                  <div className="flex items-center text-muted-foreground">
                    <Calendar className="w-4 h-4 mr-2" />
                    Last login: {formatDate(vendor.user.lastLogin)}
                  </div>
                )}
                {vendor.verificationStatus && (
                  <div className="flex flex-col gap-2">
                    <div className="text-sm font-medium">
                      Verification Status:
                    </div>
                    <div className="flex gap-2">
                      {vendor.verificationStatus.email && (
                        <Badge variant="default">Email Verified</Badge>
                      )}
                      {vendor.verificationStatus.phone && (
                        <Badge variant="default">Phone Verified</Badge>
                      )}
                      {vendor.verificationStatus.business && (
                        <Badge variant="default">Business Verified</Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
