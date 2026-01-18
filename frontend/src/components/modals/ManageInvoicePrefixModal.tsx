import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getVendorPrefix, setVendorPrefix } from "@/services/vendorService";
import { Vendor } from "@/types";

interface ManageVendorPrefixModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: Vendor | null;
  onSuccess?: () => void;
}

export function ManageInvoicePrefixModal({
  open,
  onOpenChange,
  vendor,
  onSuccess,
}: ManageVendorPrefixModalProps) {
  const { toast } = useToast();
  const [prefix, setPrefix] = useState("");
  const [originalPrefix, setOriginalPrefix] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingPrefix, setFetchingPrefix] = useState(false);

  // Fetch current prefix when modal opens
  useEffect(() => {
    if (open && vendor) {
      const fetchPrefix = async () => {
        try {
          setFetchingPrefix(true);
          const currentPrefix = await getVendorPrefix(vendor._id);
          setPrefix(currentPrefix);
          setOriginalPrefix(currentPrefix);
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to fetch current vendor prefix",
            variant: "destructive",
          });
        } finally {
          setFetchingPrefix(false);
        }
      };
      fetchPrefix();
    }
  }, [open, vendor, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor) return;

    // Validate prefix format
    if (
      !prefix ||
      typeof prefix !== "string" ||
      !/^[A-Za-z0-9]{2,10}$/.test(prefix)
    ) {
      toast({
        title: "Invalid Prefix",
        description:
          "Prefix must be alphanumeric, 2-10 characters (e.g., VD01, VD02)",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      await setVendorPrefix(vendor._id, prefix);
      toast({
        title: "Success",
        description: "Vendor prefix updated successfully",
      });
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update vendor prefix",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = prefix !== originalPrefix;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Vendor Prefix</DialogTitle>
        </DialogHeader>

        {vendor && (
          <div className="flex-grow overflow-y-auto thin-scrollbar -mr-1 pr-4 modal-form-container">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  <strong>Vendor:</strong>{" "}
                  {vendor.businessName || vendor.userId?.name}
                </div>
                <div className="text-sm text-muted-foreground">
                  <strong>Email:</strong> {vendor.userId?.email}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="prefix">
                    Vendor Prefix <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="prefix"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                    placeholder="e.g., VD01, VD02, ABC1"
                    maxLength={10}
                    disabled={fetchingPrefix || loading}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Alphanumeric characters only, 2-10 characters. This will be
                    used for barcodes and invoices: {prefix}-ProductName-Price$
                  </p>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || fetchingPrefix || !hasChanges}
                  >
                    {loading ? "Updating..." : "Update Prefix"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
