import React, { useState, useEffect } from "react";
import type { Vendor } from "@/types";
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
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

interface EditVendorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: Vendor;
  onEdit: (vendor: Vendor) => void;
}

export function EditVendorModal({
  open,
  onOpenChange,
  vendor,
  onEdit,
}: EditVendorModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    businessName: "",
    abn: "",
    gstRegistered: false,
    commissionRate: 0.05, // Default 5%
  });

  useEffect(() => {
    if (vendor) {
      setFormData({
        name: vendor.user.name,
        email: vendor.user.email,
        businessName: vendor.businessName,
        abn: vendor.businessDetails?.taxId || "",
        gstRegistered: vendor.businessDetails?.gstRegistered || false,
        commissionRate: vendor.commissionRate || 0.05,
      });
    }
  }, [vendor]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedVendor = {
      ...vendor,
      user: {
        ...vendor.user,
        name: formData.name,
        email: formData.email,
      },
      businessName: formData.businessName,
      businessDetails: {
        ...vendor.businessDetails,
        taxId: formData.abn,
        gstRegistered: formData.gstRegistered,
      },
      commissionRate: formData.commissionRate,
    };
    onEdit(updatedVendor);
    toast({
      title: "Success",
      description: "Vendor updated successfully",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Vendor</DialogTitle>
          <DialogDescription>
            Update vendor information below.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto thin-scrollbar -mr-1 pr-4 modal-form-container">
          <form
            id="edit-vendor-form"
            onSubmit={handleSubmit}
            className="space-y-6 p-1"
          >
            <div className="grid gap-3">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
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
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                required
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="businessName">
                Business Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="businessName"
                value={formData.businessName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    businessName: e.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="abn">
                ABN <span className="text-destructive">*</span>
              </Label>
              <Input
                id="abn"
                value={formData.abn}
                onChange={(e) => {
                  // Only allow numeric characters for ABN display
                  const numericValue = e.target.value.replace(/[^0-9]/g, "");
                  setFormData((prev) => ({ ...prev, abn: numericValue }));
                }}
                placeholder="Enter numeric ABN (e.g., 12345678901)"
                maxLength={20}
                required
              />
            </div>
            <div className="flex items-center gap-3">
              <Label
                htmlFor="gstRegistered"
                className="flex items-center gap-2 cursor-pointer"
              >
                GST Registered <span className="text-destructive">*</span>
                <Checkbox
                  id="gstRegistered"
                  checked={formData.gstRegistered}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      gstRegistered: Boolean(checked),
                    }))
                  }
                  required
                  aria-label="GST Registered"
                />
              </Label>
            </div>
            <div className="grid gap-3">
              <Label htmlFor="commissionRate">
                Commission Rate (%) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="commissionRate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={(formData.commissionRate * 100).toFixed(2)}
                onChange={(e) => {
                  const percentage = parseFloat(e.target.value) || 0;
                  const rate = Math.min(Math.max(percentage / 100, 0), 1); // Convert to decimal and clamp between 0-1
                  setFormData((prev) => ({ ...prev, commissionRate: rate }));
                }}
                placeholder="Enter commission rate (e.g., 5.00 for 5%)"
                required
              />
              <p className="text-xs text-muted-foreground">
                Commission rate as a percentage (0-100%). This will be used to
                calculate commissions for this vendor.
              </p>
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
          <Button type="submit" form="edit-vendor-form">
            Update Vendor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
