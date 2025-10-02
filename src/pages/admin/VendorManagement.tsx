import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DataTable } from "@/components/DataTable";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { AddVendorModal } from "@/components/modals/AddVendorModal";
import { ViewVendorModal } from "@/components/modals/ViewVendorModal";
import { EditVendorModal } from "@/components/modals/EditVendorModal";
import { ManageInvoicePrefixModal } from "@/components/modals/ManageInvoicePrefixModal";
import { StatusFilter, VENDOR_STATUS_OPTIONS } from "@/components/StatusFilter";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import {
  fetchVendors,
  deleteVendor,
  addVendor,
  updateVendor,
} from "@/services/vendorService";
import { Vendor } from "@/types";
import { FileText } from "lucide-react";

type VendorStatus = "all" | "active" | "inactive" | "pending";

type Column = {
  key: string;
  header: string;
  render: (_: unknown, row: Vendor) => React.ReactNode;
};

export function VendorManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [vendorPrefixModalOpen, setVendorPrefixModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [statusFilter, setStatusFilter] = useState<VendorStatus>("all");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await fetchVendors();
        setVendors(data);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to load vendors";
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  // Fetch vendors using React Query with status filter
  const {
    data: vendorsData = [],
    isLoading,
    isError,
    error: queryError,
  } = useQuery({
    queryKey: ["vendors", statusFilter],
    queryFn: () => fetchVendors("", 1, 10, statusFilter),
  });

  // Create vendor mutation
  const createVendorMutation = useMutation({
    mutationFn: addVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast({
        title: "Success",
        description: "Vendor created successfully",
      });
      setAddModalOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create vendor",
        variant: "destructive",
      });
    },
  });

  // Update vendor mutation
  const updateVendorMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Vendor> }) =>
      updateVendor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast({
        title: "Success",
        description: "Vendor updated successfully",
      });
      setEditModalOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update vendor",
        variant: "destructive",
      });
    },
  });

  // Delete vendor mutation
  const deleteVendorMutation = useMutation({
    mutationFn: deleteVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast({
        title: "Success",
        description: "Vendor deleted successfully",
      });
      setDeleteDialogOpen(false);
      setSelectedVendor(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete vendor",
        variant: "destructive",
      });
    },
  });

  const columns: Column[] = [
    {
      key: "user.name",
      header: "Name",
      sortable: true, // Important for finding specific vendors quickly
      render: (_: unknown, row: Vendor) => (
        <span className="whitespace-nowrap">{row.user?.name}</span>
      ),
    },
    {
      key: "businessName",
      header: "Business Name",
      sortable: true, // Essential for vendor management and identification
      render: (_: unknown, row: Vendor) => (
        <span className="whitespace-nowrap">{row.businessName}</span>
      ),
    },
    {
      key: "user.email",
      header: "Email",
      sortable: false, // Contact info, less useful to sort
      render: (_: unknown, row: Vendor) => (
        <span className="whitespace-nowrap">{row.user?.email}</span>
      ),
    },
    {
      key: "stats.products",
      header: "Products",
      sortable: true, // Important for identifying most active vendors
      render: (_: unknown, row: Vendor) => row.stats?.products || 0,
    },
    {
      key: "stats.orders",
      header: "Orders",
      sortable: true, // Critical for performance analysis
      render: (_: unknown, row: Vendor) => row.stats?.orders || 0,
    },
    {
      key: "stats.revenue",
      header: "Revenue",
      sortable: true, // Essential for business performance analysis
      render: (_: unknown, row: Vendor) =>
        `$${(row.stats?.revenue || 0).toLocaleString()}`,
    },
    {
      key: "commissionRate",
      header: "Commission Rate",
      sortable: false, // Configuration value, less useful to sort
      render: (_: unknown, row: Vendor) => {
        const rate = row.commissionRate || 0.05;
        const isCustom = rate !== 0.05;
        return (
          <div className="flex items-center gap-2">
            <Badge
              variant={isCustom ? "default" : "secondary"}
              className={
                isCustom ? "bg-blue-100 text-blue-800 hover:bg-blue-200" : ""
              }
            >
              {(rate * 100).toFixed(1)}%
            </Badge>
            {isCustom && (
              <span className="text-xs text-blue-600 font-medium">Custom</span>
            )}
          </div>
        );
      },
    },
    {
      key: "createdAt",
      header: "Date Joined",
      sortable: false, // Less frequently needed for business operations
      render: (_: unknown, row: Vendor) => formatDate(row.createdAt),
    },
    {
      key: "status",
      header: "Status",
      sortable: true, // Important for vendor lifecycle management
      render: (_: unknown, row: Vendor) => (
        <Badge
          className={`${
            row.status === "active"
              ? "bg-green-100 text-green-800"
              : row.status === "inactive"
              ? "bg-red-100 text-red-800"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
        </Badge>
      ),
    },
  ];

  const handleAdd = () => {
    setAddModalOpen(true);
  };

  const handleAddVendor = (vendor: Vendor) => {
    setVendors((prev) => [...prev, vendor]);
  };

  const handleView = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setViewModalOpen(true);
  };

  const handleEdit = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setEditModalOpen(true);
  };

  const handleEditVendor = (updatedVendor: Vendor) => {
    if (updatedVendor._id) {
      // Prepare the data for the API call
      const updateData = {
        name: updatedVendor.user?.name,
        email: updatedVendor.user?.email,
        businessName: updatedVendor.businessName,
        businessDetails: updatedVendor.businessDetails,
        commissionRate: updatedVendor.commissionRate,
      };

      updateVendorMutation.mutate({
        id: updatedVendor._id,
        data: updateData,
      });
    }
  };

  const handleDelete = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedVendor) {
      setVendors(vendors.filter((v) => v._id !== selectedVendor._id));
      toast({
        title: "Vendor Deleted",
        description: `${selectedVendor.businessName} has been deleted`,
      });
    }
    setDeleteDialogOpen(false);
    setSelectedVendor(null);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value as VendorStatus);
  };

  const handleManageVendorPrefix = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setVendorPrefixModalOpen(true);
  };

  const handleVendorPrefixSuccess = () => {
    // Refresh vendor data to show updated prefix
    queryClient.invalidateQueries({ queryKey: ["vendors"] });
  };

  const filteredVendors = vendors.filter((vendor) => {
    if (statusFilter === "all") return true;
    return vendor.status === statusFilter;
  });

  // Create filter component
  const filterComponent = (
    <StatusFilter
      value={statusFilter}
      onValueChange={handleStatusChange}
      options={VENDOR_STATUS_OPTIONS}
      placeholder="Filter by status"
      label="Status"
    />
  );

  // Define extra actions for the DataTable
  const extraActions = [
    {
      label: "Manage Vendor Prefix",
      icon: <FileText className="h-4 w-4" />,
      onClick: handleManageVendorPrefix,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Vendor Management</h1>
        <p className="text-muted-foreground">
          Manage all vendors and their business information
        </p>
      </div>

      {loading ? (
        <div className="py-10 text-center text-muted-foreground">
          Loading vendors...
        </div>
      ) : error ? (
        <div className="py-10 text-center text-red-500">{error}</div>
      ) : (
        <DataTable
          data={filteredVendors}
          columns={columns}
          searchKey="businessName"
          searchPlaceholder="Search vendors..."
          addButtonText="Add Vendor"
          onAdd={handleAdd}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          extraActions={extraActions}
          filterComponent={filterComponent}
        />
      )}

      <AddVendorModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onAdd={handleAddVendor}
      />

      <ViewVendorModal
        open={viewModalOpen}
        onOpenChange={setViewModalOpen}
        vendor={selectedVendor}
      />

      <EditVendorModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        vendor={selectedVendor}
        onEdit={handleEditVendor}
      />

      <ManageInvoicePrefixModal
        open={vendorPrefixModalOpen}
        onOpenChange={setVendorPrefixModalOpen}
        vendor={selectedVendor}
        onSuccess={handleVendorPrefixSuccess}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Vendor"
        description={`Are you sure you want to delete ${selectedVendor?.businessName}? This action cannot be undone.`}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
