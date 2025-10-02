import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/DataTable";
import { ViewOrderModal } from "@/components/modals/ViewOrderModal";
import { StatusFilter } from "@/components/StatusFilter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Download } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Order } from "@/types";
import * as orderService from "@/services/orderService";
import { Skeleton } from "@/components/ui/skeleton";

interface ApiResponse {
  data: {
    orders: Order[];
  };
}

// Order status options for filtering
const ORDER_STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

type OrderStatus =
  | "all"
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export function OrderManagement() {
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus>("all");

  const {
    data: ordersData,
    isLoading,
    isError,
    error,
  } = useQuery<ApiResponse>({
    queryKey: ["orders"],
    queryFn: orderService.getOrders,
  });
  const orders = ordersData?.data?.orders || [];

  const getStatusBadge = (status: string) => {
    const variants = {
      processing: "default",
      shipped: "secondary",
      delivered: "default",
      pending: "secondary",
      cancelled: "destructive",
    } as const;
    return (
      <Badge variant={variants[status as keyof typeof variants] || "secondary"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const columns = [
    {
      key: "orderNumber",
      header: "Order ID",
      sortable: true, // Essential for finding specific orders quickly
    },
    {
      key: "customer",
      header: "Customer",
      sortable: false, // Less useful to sort by customer name
      render: (customer: { name: string }) => customer.name,
    },
    {
      key: "orderTotal",
      header: "Total Amount",
      sortable: true, // Important for revenue analysis and high-value orders
      render: (value: number) => `$${value.toFixed(2)}`,
    },
    {
      key: "createdAt",
      header: "Order Date",
      sortable: true, // Critical for time-based order management
      render: (value: string) => formatDate(value),
    },
    {
      key: "status",
      header: "Order Status",
      sortable: true, // Essential for order fulfillment workflow
      render: (value: string) => getStatusBadge(value),
    },
  ];

  const handleView = (order: Order) => {
    setSelectedOrder(order);
    setViewModalOpen(true);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value as OrderStatus);
  };

  // Filter orders based on status
  const filteredOrders = orders.filter((order) => {
    if (statusFilter === "all") return true;
    return order.status === statusFilter;
  });

  // Create filter component
  const filterComponent = (
    <StatusFilter
      value={statusFilter}
      onValueChange={handleStatusChange}
      options={ORDER_STATUS_OPTIONS}
      placeholder="Filter by status"
      label="Status"
    />
  );

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Order Management
          </h1>
          <p className="text-muted-foreground">
            View and manage your customer orders.
          </p>
        </div>
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <h3 className="text-red-800 font-medium">Error fetching orders</h3>
          <p className="text-red-600 text-sm mt-1">
            {error?.message || "An unknown error occurred"}
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Order Management
          </h1>
          <p className="text-muted-foreground">
            View and manage your customer orders.
          </p>
        </div>
        <Skeleton className="h-96 w-full" data-testid="skeleton" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Order Management</h1>
        <p className="text-muted-foreground">
          View and manage your customer orders.
        </p>
      </div>

      <DataTable
        data={filteredOrders.map((o) => ({ ...o, id: o._id }))}
        columns={columns as any}
        searchKey="orderNumber"
        searchPlaceholder="Search by order #"
        onView={(item) => handleView(item as unknown as Order)}
        filterComponent={filterComponent}
      />

      {selectedOrder && (
        <ViewOrderModal
          open={viewModalOpen}
          onOpenChange={setViewModalOpen}
          order={selectedOrder}
        />
      )}
    </div>
  );
}
