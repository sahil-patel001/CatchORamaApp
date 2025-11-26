import React, { useState } from "react";
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

interface AddVendorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (vendor: Vendor) => void;
}

export function AddVendorModal({
  open,
  onOpenChange,
  onAdd,
}: AddVendorModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    businessName: "",
    phone: "",
    address: "",
    abn: "",
    gstRegistered: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();
    const id = Date.now().toString();
    const newVendor: Vendor = {
      _id: id,
      id,
      userId: id,
      businessName: formData.businessName,
      phone: formData.phone,
      address: { full: formData.address },
      businessDetails: {
        taxId: formData.abn,
        gstRegistered: formData.gstRegistered,
      },
      status: "active",
      user: {
        _id: id,
        name: formData.name,
        email: formData.email,
        role: "vendor",
        createdAt: now,
      },
      stats: {
        products: 0,
        orders: 0,
        revenue: 0,
        totalRevenue: 0,
        avgOrderValue: 0,
      },
      createdAt: now,
      updatedAt: now,
    };
    onAdd(newVendor);
    toast({
      title: "Success",
      description: "Vendor added successfully",
    });
    setFormData({
      name: "",
      email: "",
      businessName: "",
      phone: "",
      address: "",
      abn: "",
      gstRegistered: false,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add New Vendor</DialogTitle>
          <DialogDescription>Enter the vendor details below.</DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto thin-scrollbar -mr-1 pr-4 modal-form-container">
          <form
            id="add-vendor-form"
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
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, address: e.target.value }))
                }
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
                  const numericValue = e.target.value.replace(/[^0-9]/g, '');
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
                GST Registered <span className="text-destructive"></span>
                <Checkbox
                  id="gstRegistered"
                  checked={formData.gstRegistered}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      gstRegistered: Boolean(checked),
                    }))
                  }
                  aria-label="GST Registered"
                />
              </Label>
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
          <Button type="submit" form="add-vendor-form">
            Add Vendor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
