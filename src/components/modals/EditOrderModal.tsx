import React, { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface EditOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  onEdit: (order: any) => void;
}

export function EditOrderModal({
  open,
  onOpenChange,
  order,
  onEdit,
}: EditOrderModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    customer: "",
    status: "",
    trackingLink: "",
  });

  useEffect(() => {
    if (order) {
      setFormData({
        customer: order.customer,
        status: order.status,
        trackingLink: order.trackingLink || "",
      });
    }
  }, [order]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedOrder = {
      ...order,
      customer: formData.customer,
      status: formData.status,
      trackingLink: formData.trackingLink,
    };
    onEdit(updatedOrder);
    toast({
      title: "Success",
      description: "Order updated successfully",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Order</DialogTitle>
          <DialogDescription>Update order information below.</DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto thin-scrollbar -mr-1 pr-4 modal-form-container">
          <form
            id="edit-order-form"
            onSubmit={handleSubmit}
            className="space-y-6 p-1"
          >
            <div className="grid gap-3">
              <Label htmlFor="customer">Customer Name</Label>
              <Input
                id="customer"
                value={formData.customer}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, customer: e.target.value }))
                }
                required
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3">
              <Label htmlFor="trackingLink">Tracking Link</Label>
              <Input
                id="trackingLink"
                type="url"
                value={formData.trackingLink}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    trackingLink: e.target.value,
                  }))
                }
                placeholder="https://tracking.example.com/..."
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
          <Button type="submit" form="edit-order-form">
            Update Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
