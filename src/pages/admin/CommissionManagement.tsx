import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCommissions,
  approveCommission,
  markCommissionAsPaid,
  disputeCommission,
  updateCommission,
  deleteCommission,
  getCommissionStatusColor,
  getCommissionStatusText,
  getPaymentMethodText,
  generateCommission,
  bulkGenerateCommissions,
} from "@/services/commissionService";
import { fetchVendors } from "@/services/vendorService";
import { Commission, Vendor } from "@/types";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  DollarSign,
  Calendar,
  User,
  MoreHorizontal,
  Download,
  Plus,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { formatDate } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DateRangePicker,
  useDateRangePicker,
} from "@/components/ui/DateRangePicker";
import { useAuth } from "@/contexts/AuthContext";

export default function CommissionManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Filter states
  const [status, setStatus] = useState<string>("all");
  const [vendorId, setVendorId] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // Date range picker state - using preset periods with weekly as default per user preference
  const dateRangePicker = useDateRangePicker("7d");
  const { mode, presetPeriod, customDateRange } = dateRangePicker;

  // Modal states
  const [selectedCommission, setSelectedCommission] =
    useState<Commission | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [bulkGenerateModalOpen, setBulkGenerateModalOpen] = useState(false);

  // Form states
  const [paymentMethod, setPaymentMethod] = useState<
    "bank_transfer" | "paypal" | "stripe" | "check" | "other"
  >("bank_transfer");
  const [transactionId, setTransactionId] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [disputeNotes, setDisputeNotes] = useState("");
  const [generateVendorId, setGenerateVendorId] = useState("");
  const [periodType, setPeriodType] = useState<
    "weekly" | "monthly" | "quarterly" | "yearly"
  >("monthly");
  const [customCommissionRate, setCustomCommissionRate] = useState<string>(""); // Percentage as string for input
  const [useCustomRate, setUseCustomRate] = useState(false);

  // Date range pickers for generate commission modals
  const generateDateRangePicker = useDateRangePicker("7d");
  const bulkGenerateDateRangePicker = useDateRangePicker("7d");

  // Get effective date range from the date picker
  const getEffectiveDateRange = () => {
    if (mode === "preset") {
      // Convert preset to actual dates for API compatibility
      const now = new Date();
      const end = new Date(now);
      const start = new Date(now);

      switch (presetPeriod) {
        case "7d":
          start.setDate(now.getDate() - 7);
          break;
        case "30d":
          start.setDate(now.getDate() - 30);
          break;
        case "90d":
          start.setDate(now.getDate() - 90);
          break;
        case "1y":
          start.setFullYear(now.getFullYear() - 1);
          break;
        default:
          start.setDate(now.getDate() - 7);
      }

      return {
        startDate: format(start, "yyyy-MM-dd"),
        endDate: format(end, "yyyy-MM-dd"),
      };
    }
    if (mode === "custom" && customDateRange?.from && customDateRange?.to) {
      return {
        startDate: format(customDateRange.from, "yyyy-MM-dd"),
        endDate: format(customDateRange.to, "yyyy-MM-dd"),
      };
    }
    // Default fallback - last 7 days
    const now = new Date();
    const end = new Date(now);
    const start = new Date(now);
    start.setDate(now.getDate() - 7);

    return {
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
    };
  };

  const effectiveDateRange = getEffectiveDateRange();

  // Fetch commissions
  const {
    data: commissionsData,
    isLoading: commissionsLoading,
    error: commissionsError,
  } = useQuery({
    queryKey: [
      "commissions",
      status,
      vendorId,
      effectiveDateRange,
      page,
      limit,
    ],
    queryFn: async () => {
      const params = {
        status: status === "all" ? undefined : status,
        vendorId: vendorId === "all" ? undefined : vendorId,
        // Temporarily remove date filtering to debug
        // ...effectiveDateRange,
        page,
        limit,
      };
      console.log("Fetching commissions with params:", params);
      const result = await getCommissions(params);
      console.log("Commission API response:", result);
      return result;
    },
  });

  // Fetch vendors for dropdown - increased limit to get all vendors
  const { data: vendorsData } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => fetchVendors("", 1, 1000, "active"),
  });

  // Mutations
  const approveMutation = useMutation({
    mutationFn: approveCommission,
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Commission approved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description:
          error.response?.data?.error?.message ||
          "Failed to approve commission",
        variant: "destructive",
      });
    },
  });

  const payMutation = useMutation({
    mutationFn: ({ id, paymentData }: { id: string; paymentData: any }) =>
      markCommissionAsPaid(id, paymentData),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Commission marked as paid successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      setPaymentModalOpen(false);
      resetPaymentForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description:
          error.response?.data?.error?.message ||
          "Failed to mark commission as paid",
        variant: "destructive",
      });
    },
  });

  const disputeMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      disputeCommission(id, notes),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Commission disputed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      setDisputeModalOpen(false);
      setDisputeNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description:
          error.response?.data?.error?.message ||
          "Failed to dispute commission",
        variant: "destructive",
      });
    },
  });

  const generateMutation = useMutation({
    mutationFn: generateCommission,
    onSuccess: (data) => {
      console.log("Commission generated successfully:", data);
      toast({
        title: "Success",
        description: "Commission generated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      setGenerateModalOpen(false);
      resetGenerateForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description:
          error.response?.data?.error?.message ||
          "Failed to generate commission",
        variant: "destructive",
      });
    },
  });

  const bulkGenerateMutation = useMutation({
    mutationFn: bulkGenerateCommissions,
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `${data.results.successful.length} commissions generated, ${data.results.failed.length} failed`,
      });
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      setBulkGenerateModalOpen(false);
      resetGenerateForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description:
          error.response?.data?.error?.message ||
          "Failed to bulk generate commissions",
        variant: "destructive",
      });
    },
  });

  const resetPaymentForm = () => {
    setPaymentMethod("bank_transfer");
    setTransactionId("");
    setPaymentNotes("");
    setSelectedCommission(null);
  };

  const resetGenerateForm = () => {
    setGenerateVendorId("");
    setPeriodType("monthly");
    setCustomCommissionRate("");
    setUseCustomRate(false);
    generateDateRangePicker.reset();
    bulkGenerateDateRangePicker.reset();
  };

  const handleApprove = (commission: Commission) => {
    approveMutation.mutate(commission._id);
  };

  const handlePayment = () => {
    if (!selectedCommission) return;

    payMutation.mutate({
      id: selectedCommission._id,
      paymentData: {
        method: paymentMethod,
        transactionId: transactionId || undefined,
        notes: paymentNotes || undefined,
      },
    });
  };

  const handleDispute = () => {
    if (!selectedCommission || !disputeNotes.trim()) return;

    disputeMutation.mutate({
      id: selectedCommission._id,
      notes: disputeNotes,
    });
  };

  const handleGenerate = () => {
    const dateRange = generateDateRangePicker.getEffectiveDateRange();
    if (!generateVendorId) return;

    // Always convert to actual dates for the API
    let startDate: string;
    let endDate: string;

    if (dateRange.startDate && dateRange.endDate) {
      startDate = dateRange.startDate;
      endDate = dateRange.endDate;
    } else if (dateRange.period) {
      // Convert preset period to actual dates
      const now = new Date();
      const end = new Date(now);
      const start = new Date(now);

      switch (dateRange.period) {
        case "7d":
          start.setDate(now.getDate() - 7);
          break;
        case "30d":
          start.setDate(now.getDate() - 30);
          break;
        case "90d":
          start.setDate(now.getDate() - 90);
          break;
        case "1y":
          start.setFullYear(now.getFullYear() - 1);
          break;
        default:
          start.setDate(now.getDate() - 7);
      }

      startDate = format(start, "yyyy-MM-dd");
      endDate = format(end, "yyyy-MM-dd");
    } else {
      return; // No valid date range
    }

    const generateData: any = {
      vendorId: generateVendorId,
      startDate,
      endDate,
      periodType,
    };

    // Add commission rate override if custom rate is enabled and valid
    if (useCustomRate && customCommissionRate) {
      const rate = parseFloat(customCommissionRate) / 100; // Convert percentage to decimal
      if (rate >= 0 && rate <= 100) {
        generateData.commissionRate = rate;
      }
    }

    console.log("Generating commission with data:", generateData);
    generateMutation.mutate(generateData);
  };

  const handleBulkGenerate = () => {
    const dateRange = bulkGenerateDateRangePicker.getEffectiveDateRange();

    // Always convert to actual dates for the API
    let startDate: string;
    let endDate: string;

    if (dateRange.startDate && dateRange.endDate) {
      startDate = dateRange.startDate;
      endDate = dateRange.endDate;
    } else if (dateRange.period) {
      // Convert preset period to actual dates
      const now = new Date();
      const end = new Date(now);
      const start = new Date(now);

      switch (dateRange.period) {
        case "7d":
          start.setDate(now.getDate() - 7);
          break;
        case "30d":
          start.setDate(now.getDate() - 30);
          break;
        case "90d":
          start.setDate(now.getDate() - 90);
          break;
        case "1y":
          start.setFullYear(now.getFullYear() - 1);
          break;
        default:
          start.setDate(now.getDate() - 7);
      }

      startDate = format(start, "yyyy-MM-dd");
      endDate = format(end, "yyyy-MM-dd");
    } else {
      return; // No valid date range
    }

    const bulkGenerateData: any = {
      startDate,
      endDate,
      periodType,
    };

    // Add commission rate override if custom rate is enabled and valid
    if (useCustomRate && customCommissionRate) {
      const rate = parseFloat(customCommissionRate) / 100; // Convert percentage to decimal
      if (rate >= 0 && rate <= 100) {
        bulkGenerateData.commissionRate = rate;
      }
    }

    bulkGenerateMutation.mutate(bulkGenerateData);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Commission table columns with business-focused sorting
  const commissionColumns = [
    {
      key: "vendor.businessName",
      header: "Vendor",
      sortable: true, // Essential for finding specific vendors
      render: (_: unknown, commission: Commission) => {
        return (
          <div>
            <div className="font-medium">
              {commission.vendor?.businessName || "Unknown"}
            </div>
            <div className="text-sm text-gray-500">
              {commission.calculation.totalOrders} orders
            </div>
          </div>
        );
      },
    },
    {
      key: "period.startDate",
      header: "Period",
      sortable: true, // Important for time-based commission management
      render: (_: unknown, commission: Commission) => {
        return (
          <div>
            <div className="text-sm">
              {format(new Date(commission.period.startDate), "MMM dd, yyyy")} -{" "}
              {format(new Date(commission.period.endDate), "MMM dd, yyyy")}
            </div>
            <div className="text-xs text-gray-500 capitalize">
              {commission.period.type}
            </div>
          </div>
        );
      },
    },
    {
      key: "calculation.commissionAmount",
      header: "Amount",
      sortable: true, // Critical for financial analysis
      render: (_: unknown, commission: Commission) => {
        return (
          <div className="text-right">
            <div className="font-medium">
              {formatCurrency(commission.calculation.commissionAmount)}
            </div>
            <div className="text-sm text-gray-500">
              {(commission.calculation.commissionRate * 100).toFixed(1)}% of{" "}
              {formatCurrency(commission.calculation.totalRevenue)}
            </div>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      sortable: true, // Important for commission workflow management
      render: (_: unknown, commission: Commission) => {
        const { color, bgColor } = getCommissionStatusColor(commission.status);
        return (
          <div className="text-center">
            <Badge className={`${bgColor} ${color}`}>
              {getCommissionStatusText(commission.status)}
            </Badge>
          </div>
        );
      },
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: false, // Less frequently needed for business operations
      render: (_: unknown, commission: Commission) => {
        return (
          <div className="text-center text-sm text-gray-500">
            {formatDate(commission.createdAt)}
          </div>
        );
      },
    },
  ];

  const commissions = commissionsData?.data || [];
  const pagination = commissionsData?.pagination;
  const vendors = vendorsData || [];

  // Debug: Log commission data and any errors
  console.log("Current user:", user);
  console.log("User role:", user?.role);
  console.log("Commissions data:", commissionsData);
  console.log("Commissions array:", commissions);
  console.log("Commissions count:", commissions.length);
  console.log("Commission error:", commissionsError);

  // Show error message if user doesn't have permission
  if (commissionsError && user?.role !== "superadmin") {
    console.error(
      "Access denied: Commission management requires superadmin role"
    );
  }

  if (commissionsError) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Commission Management</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              Error loading commissions:{" "}
              {commissionsError instanceof Error
                ? commissionsError.message
                : "Unknown error"}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Commission Management</h1>
        <div className="flex gap-2">
          <Dialog open={generateModalOpen} onOpenChange={setGenerateModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Generate Commission
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Commission</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="vendor">Vendor</Label>
                  <Select
                    value={generateVendorId}
                    onValueChange={setGenerateVendorId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map((vendor: Vendor) => (
                        <SelectItem key={vendor._id} value={vendor._id}>
                          {vendor.businessName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <DateRangePicker
                    mode={generateDateRangePicker.mode}
                    onModeChange={generateDateRangePicker.setMode}
                    presetPeriod={generateDateRangePicker.presetPeriod}
                    onPresetPeriodChange={
                      generateDateRangePicker.setPresetPeriod
                    }
                    date={generateDateRangePicker.customDateRange}
                    onDateChange={generateDateRangePicker.setCustomDateRange}
                    presetPeriods={[
                      { value: "7d", label: "Weekly" },
                      { value: "30d", label: "Monthly" },
                      { value: "90d", label: "Quarterly" },
                      { value: "1y", label: "Yearly" },
                    ]}
                    className="w-auto"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="periodType">Period Type</Label>
                  <Select
                    value={periodType}
                    onValueChange={(value) =>
                      setPeriodType(
                        value as "weekly" | "monthly" | "quarterly" | "yearly"
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="useCustomRate"
                      checked={useCustomRate}
                      onCheckedChange={setUseCustomRate}
                    />
                    <Label
                      htmlFor="useCustomRate"
                      className="text-sm font-medium"
                    >
                      Override commission rate
                    </Label>
                  </div>
                  {useCustomRate && (
                    <div className="space-y-2">
                      <Label htmlFor="customCommissionRate">
                        Commission Rate (%)
                      </Label>
                      <Input
                        id="customCommissionRate"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={customCommissionRate}
                        onChange={(e) =>
                          setCustomCommissionRate(e.target.value)
                        }
                        placeholder="Enter commission rate (e.g., 5.00 for 5%)"
                      />
                      <p className="text-xs text-muted-foreground">
                        This will override the vendor's default commission rate
                        for this generation only.
                      </p>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending || !generateVendorId}
                  className="w-full"
                >
                  {generateMutation.isPending
                    ? "Generating..."
                    : "Generate Commission"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog
            open={bulkGenerateModalOpen}
            onOpenChange={setBulkGenerateModalOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <RefreshCw className="w-4 h-4 mr-2" />
                Bulk Generate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Generate Commissions</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <DateRangePicker
                    mode={bulkGenerateDateRangePicker.mode}
                    onModeChange={bulkGenerateDateRangePicker.setMode}
                    presetPeriod={bulkGenerateDateRangePicker.presetPeriod}
                    onPresetPeriodChange={
                      bulkGenerateDateRangePicker.setPresetPeriod
                    }
                    date={bulkGenerateDateRangePicker.customDateRange}
                    onDateChange={
                      bulkGenerateDateRangePicker.setCustomDateRange
                    }
                    presetPeriods={[
                      { value: "7d", label: "Weekly" },
                      { value: "30d", label: "Monthly" },
                      { value: "90d", label: "Quarterly" },
                      { value: "1y", label: "Yearly" },
                    ]}
                    className="w-auto"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bulkPeriodType">Period Type</Label>
                  <Select
                    value={periodType}
                    onValueChange={(value) =>
                      setPeriodType(
                        value as "weekly" | "monthly" | "quarterly" | "yearly"
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="bulkUseCustomRate"
                      checked={useCustomRate}
                      onCheckedChange={setUseCustomRate}
                    />
                    <Label
                      htmlFor="bulkUseCustomRate"
                      className="text-sm font-medium"
                    >
                      Override commission rate for all vendors
                    </Label>
                  </div>
                  {useCustomRate && (
                    <div className="space-y-2">
                      <Label htmlFor="bulkCustomCommissionRate">
                        Commission Rate (%)
                      </Label>
                      <Input
                        id="bulkCustomCommissionRate"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={customCommissionRate}
                        onChange={(e) =>
                          setCustomCommissionRate(e.target.value)
                        }
                        placeholder="Enter commission rate (e.g., 5.00 for 5%)"
                      />
                      <p className="text-xs text-muted-foreground">
                        This will override all vendors' default commission rates
                        for this bulk generation.
                      </p>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleBulkGenerate}
                  disabled={bulkGenerateMutation.isPending}
                  className="w-full"
                >
                  {bulkGenerateMutation.isPending
                    ? "Generating..."
                    : "Generate for All Vendors"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="statusFilter">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="calculated">Calculated</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="disputed">Disputed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendorFilter">Vendor</Label>
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All vendors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {vendors.map((vendor: Vendor) => (
                    <SelectItem key={vendor._id} value={vendor._id}>
                      {vendor.businessName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <DateRangePicker
                mode={dateRangePicker.mode}
                onModeChange={dateRangePicker.setMode}
                presetPeriod={dateRangePicker.presetPeriod}
                onPresetPeriodChange={dateRangePicker.setPresetPeriod}
                date={dateRangePicker.customDateRange}
                onDateChange={dateRangePicker.setCustomDateRange}
                presetPeriods={[
                  { value: "7d", label: "Weekly" },
                  { value: "30d", label: "Monthly" },
                  { value: "90d", label: "Quarterly" },
                  { value: "1y", label: "Yearly" },
                ]}
                className="w-auto"
              />
            </div>

            <Button
              variant="outline"
              onClick={() => {
                setStatus("all");
                setVendorId("all");
                dateRangePicker.reset();
                setPage(1);
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Commission Table */}
      <Card>
        <CardHeader>
          <CardTitle>Commissions</CardTitle>
        </CardHeader>
        <CardContent>
          {commissionsLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : commissions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No commissions found matching your criteria.
            </div>
          ) : (
            <DataTable
              data={commissions.map((c) => ({ ...c, id: c._id }))}
              columns={commissionColumns}
              searchKey="vendor.businessName"
              searchPlaceholder="Search by vendor..."
              hideAddButton={true}
            />
          )}

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-500">
                Showing {(pagination.current - 1) * pagination.limit + 1} to{" "}
                {Math.min(
                  pagination.current * pagination.limit,
                  pagination.total
                )}{" "}
                of {pagination.total} commissions
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.current <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.current >= pagination.pages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Commission as Paid</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedCommission && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium">Commission Details</div>
                <div className="text-lg font-bold">
                  {formatCurrency(
                    selectedCommission.calculation.commissionAmount
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {selectedCommission.vendor?.businessName}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select
                value={paymentMethod}
                onValueChange={(value) =>
                  setPaymentMethod(
                    value as
                      | "bank_transfer"
                      | "paypal"
                      | "stripe"
                      | "check"
                      | "other"
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transactionId">Transaction ID (Optional)</Label>
              <Input
                id="transactionId"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="Enter transaction ID"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentNotes">Notes (Optional)</Label>
              <Textarea
                id="paymentNotes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Add any payment notes..."
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handlePayment}
                disabled={payMutation.isPending}
                className="flex-1"
              >
                {payMutation.isPending ? "Processing..." : "Mark as Paid"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setPaymentModalOpen(false);
                  resetPaymentForm();
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dispute Modal */}
      <Dialog open={disputeModalOpen} onOpenChange={setDisputeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispute Commission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedCommission && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-sm font-medium text-red-800">
                  Commission Details
                </div>
                <div className="text-lg font-bold text-red-900">
                  {formatCurrency(
                    selectedCommission.calculation.commissionAmount
                  )}
                </div>
                <div className="text-sm text-red-700">
                  {selectedCommission.vendor?.businessName}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="disputeNotes">Dispute Reason *</Label>
              <Textarea
                id="disputeNotes"
                value={disputeNotes}
                onChange={(e) => setDisputeNotes(e.target.value)}
                placeholder="Please provide a reason for disputing this commission..."
                rows={4}
                required
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleDispute}
                disabled={disputeMutation.isPending || !disputeNotes.trim()}
                variant="destructive"
                className="flex-1"
              >
                {disputeMutation.isPending
                  ? "Processing..."
                  : "Dispute Commission"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setDisputeModalOpen(false);
                  setDisputeNotes("");
                  setSelectedCommission(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
