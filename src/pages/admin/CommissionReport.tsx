import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCommissionReport } from "@/services/reportService";
import { fetchVendors } from "@/services/vendorService";
import {
  CommissionReport as CommissionReportType,
  ReportPeriod,
} from "@/types";
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
import {
  CalendarIcon,
  Download,
  DollarSign,
  TrendingUp,
  Users,
  ShoppingCart,
} from "lucide-react";
import { format } from "date-fns";
import {
  DateRangePicker,
  useDateRangePicker,
} from "@/components/ui/DateRangePicker";

export default function CommissionReport() {
  const { toast } = useToast();
  const [selectedVendorId, setSelectedVendorId] = useState<string>("all");
  const [selectedPaymentStatus, setSelectedPaymentStatus] =
    useState<string>("all");

  // Date range picker state
  const dateRangePicker = useDateRangePicker("30d");
  const { mode, presetPeriod, customDateRange, getEffectiveDateRange } =
    dateRangePicker;

  // Convert preset period to ReportPeriod type
  const getReportPeriod = (): ReportPeriod => {
    if (mode === "custom") return "monthly"; // fallback for custom dates
    switch (presetPeriod) {
      case "7d":
        return "weekly";
      case "30d":
        return "monthly";
      case "90d":
        return "quarterly";
      case "1y":
        return "yearly";
      default:
        return "monthly";
    }
  };

  const currentPeriod = getReportPeriod();
  const queryParams = getEffectiveDateRange();

  // Fetch vendors for dropdown
  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors", "all"],
    queryFn: () => fetchVendors("", 1, 100, "all"),
  });

  // Fetch commission report
  const {
    data: report,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "commissionReport",
      queryParams,
      selectedVendorId,
      selectedPaymentStatus,
    ],
    queryFn: async () => {
      try {
        const result = await getCommissionReport(
          mode === "custom" ? currentPeriod : currentPeriod,
          queryParams.startDate,
          queryParams.endDate,
          selectedVendorId,
          selectedPaymentStatus
        );

        // Validate the response structure
        if (!result || typeof result !== "object") {
          throw new Error("Invalid response format");
        }

        if (!result.vendors || !Array.isArray(result.vendors)) {
          throw new Error("Invalid vendors data");
        }

        if (!result.summary || typeof result.summary !== "object") {
          throw new Error("Invalid summary data");
        }

        return result;
      } catch (err) {
        console.error("Commission report fetch error:", err);
        throw err;
      }
    },
    retry: 2,
    retryDelay: 1000,
  });

  const resetFilters = () => {
    dateRangePicker.reset();
    setSelectedVendorId("all");
    setSelectedPaymentStatus("all");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatPercentage = (rate: number) => {
    return `${(rate * 100).toFixed(2)}%`;
  };

  const exportToCSV = () => {
    if (!report) return;

    const csvData = [
      [
        "Vendor Name",
        "Commission Rate",
        "Total Revenue",
        "Total Orders",
        "Avg Order Value",
        "Commission Owed",
        "Paid Amount",
        "Pending Amount",
        "Payment Completion Rate",
      ],
      ...report.vendors.map((vendor) => [
        vendor.vendorName,
        formatPercentage(vendor.commissionRate),
        vendor.totalRevenue.toString(),
        vendor.totalOrders.toString(),
        vendor.avgOrderValue.toFixed(2),
        vendor.commissionOwed.toFixed(2),
        vendor.paymentStatus?.paidAmount?.toFixed(2) || "0.00",
        vendor.paymentStatus?.pendingAmount?.toFixed(2) || "0.00",
        vendor.paymentCompletionRate?.toFixed(1) || "0.0",
      ]),
    ];

    const csvContent = csvData.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `commission-report-${report.period}-${format(
      new Date(),
      "yyyy-MM-dd"
    )}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bricolage font-bold tracking-tight">
              Commission Report
            </h1>
            <p className="text-muted-foreground">
              Comprehensive commission breakdown and payment tracking
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="text-destructive font-manrope">
                Error loading commission report:{" "}
                {error instanceof Error ? error.message : "Unknown error"}
              </div>
              <Button onClick={() => refetch()} variant="outline">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bricolage font-bold tracking-tight">
            Commission Report
          </h1>
          <p className="text-muted-foreground">
            Comprehensive commission breakdown and payment tracking
          </p>
        </div>
        {report && (
          <Button onClick={exportToCSV} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="font-bricolage">Report Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="lg:col-span-2">
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
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor" className="font-manrope">
                Vendor
              </Label>
              <Select
                value={selectedVendorId}
                onValueChange={setSelectedVendorId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor._id} value={vendor._id}>
                      {vendor.businessName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentStatus" className="font-manrope">
                Payment Status
              </Label>
              <Select
                value={selectedPaymentStatus}
                onValueChange={setSelectedPaymentStatus}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="disputed">Disputed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={resetFilters} variant="outline" size="sm">
              Reset Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : report ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="hover:shadow-md transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-8 h-8 text-emerald-600" />
                  <div>
                    <p className="text-sm font-manrope font-medium text-muted-foreground">
                      Total Commission
                    </p>
                    <p className="text-2xl font-bricolage font-bold text-emerald-600">
                      {formatCurrency(report.summary.totalCommission)}
                    </p>
                    {report.summary.totalPaidAmount !== undefined && (
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(report.summary.totalPaidAmount)} paid
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-8 h-8 text-orange-600" />
                  <div>
                    <p className="text-sm font-manrope font-medium text-muted-foreground">
                      Outstanding Amount
                    </p>
                    <p className="text-2xl font-bricolage font-bold text-orange-600">
                      {formatCurrency(report.summary.outstandingAmount || 0)}
                    </p>
                    {report.summary.paymentCompletionRate !== undefined && (
                      <p className="text-xs text-muted-foreground">
                        {report.summary.paymentCompletionRate.toFixed(1)}%
                        completion rate
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Users className="w-8 h-8 text-purple-600" />
                  <div>
                    <p className="text-sm font-manrope font-medium text-muted-foreground">
                      Active Vendors
                    </p>
                    <p className="text-2xl font-bricolage font-bold text-purple-600">
                      {report.summary.totalVendors}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <ShoppingCart className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-sm font-manrope font-medium text-muted-foreground">
                      Total Revenue
                    </p>
                    <p className="text-2xl font-bricolage font-bold text-blue-600">
                      {formatCurrency(report.summary.totalRevenue)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {report.summary.totalOrders.toLocaleString()} orders
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Vendor Commission Table */}
          <Card>
            <CardHeader>
              <CardTitle className="font-bricolage">
                Vendor Commission Breakdown
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Period: {report.period} |{" "}
                {format(new Date(report.dateRange.start), "MMM dd, yyyy")} -{" "}
                {format(new Date(report.dateRange.end), "MMM dd, yyyy")}
              </p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse min-w-[800px]">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-3 font-manrope font-medium text-muted-foreground min-w-[150px]">
                            Vendor
                          </th>
                          <th className="text-right p-3 font-manrope font-medium text-muted-foreground min-w-[120px]">
                            Commission Rate
                          </th>
                          <th className="text-right p-3 font-manrope font-medium text-muted-foreground min-w-[120px]">
                            Revenue
                          </th>
                          <th className="text-right p-3 font-manrope font-medium text-muted-foreground min-w-[80px]">
                            Orders
                          </th>
                          <th className="text-right p-3 font-manrope font-medium text-muted-foreground min-w-[120px]">
                            Commission Owed
                          </th>
                          <th className="text-right p-3 font-manrope font-medium text-muted-foreground min-w-[150px]">
                            Payment Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...Array(5)].map((_, i) => (
                          <tr key={i} className="border-b border-border">
                            <td className="p-3">
                              <Skeleton className="h-4 w-32" />
                            </td>
                            <td className="p-3 text-right">
                              <Skeleton className="h-6 w-16 ml-auto" />
                            </td>
                            <td className="p-3 text-right">
                              <Skeleton className="h-4 w-20 ml-auto" />
                            </td>
                            <td className="p-3 text-right">
                              <Skeleton className="h-4 w-12 ml-auto" />
                            </td>
                            <td className="p-3 text-right">
                              <Skeleton className="h-4 w-20 ml-auto" />
                            </td>
                            <td className="p-3 text-right">
                              <div className="space-y-1">
                                <Skeleton className="h-4 w-16 ml-auto" />
                                <Skeleton className="h-3 w-12 ml-auto" />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse min-w-[800px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-3 font-manrope font-medium text-muted-foreground min-w-[150px]">
                          Vendor
                        </th>
                        <th className="text-right p-3 font-manrope font-medium text-muted-foreground min-w-[120px]">
                          Commission Rate
                        </th>
                        <th className="text-right p-3 font-manrope font-medium text-muted-foreground min-w-[120px]">
                          Revenue
                        </th>
                        <th className="text-right p-3 font-manrope font-medium text-muted-foreground min-w-[80px]">
                          Orders
                        </th>
                        <th className="text-right p-3 font-manrope font-medium text-muted-foreground min-w-[120px]">
                          Commission Owed
                        </th>
                        <th className="text-right p-3 font-manrope font-medium text-muted-foreground min-w-[150px]">
                          Payment Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {report &&
                        report.vendors.map((vendor) => (
                          <tr
                            key={vendor._id}
                            className="border-b border-border transition-colors hover:bg-muted/50 cursor-pointer"
                          >
                            <td className="p-3">
                              <div className="font-manrope font-medium">
                                {vendor.vendorName}
                              </div>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Badge
                                  variant={
                                    vendor.commissionRate !== 0.05
                                      ? "default"
                                      : "secondary"
                                  }
                                  className={
                                    vendor.commissionRate !== 0.05
                                      ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                                      : ""
                                  }
                                >
                                  {formatPercentage(vendor.commissionRate)}
                                </Badge>
                                {vendor.commissionRate !== 0.05 && (
                                  <span className="text-xs text-blue-600 font-medium">
                                    Custom
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-right font-manrope font-medium">
                              {formatCurrency(vendor.totalRevenue)}
                            </td>
                            <td className="p-3 text-right font-manrope">
                              {vendor.totalOrders.toLocaleString()}
                            </td>
                            <td className="p-3 text-right font-manrope font-bold text-emerald-600">
                              {formatCurrency(vendor.commissionOwed)}
                            </td>
                            <td className="p-3 text-right">
                              {vendor.paymentStatus ? (
                                <div className="space-y-1">
                                  <div className="text-sm font-manrope">
                                    <span className="text-emerald-600 font-medium">
                                      {formatCurrency(
                                        vendor.paymentStatus.paidAmount
                                      )}
                                    </span>
                                    <span className="text-muted-foreground">
                                      {" "}
                                      paid
                                    </span>
                                  </div>
                                  {vendor.paymentStatus.pendingAmount > 0 && (
                                    <div className="text-xs text-orange-600 font-manrope">
                                      {formatCurrency(
                                        vendor.paymentStatus.pendingAmount
                                      )}{" "}
                                      pending
                                    </div>
                                  )}
                                  {vendor.paymentStatus.approvedAmount > 0 && (
                                    <div className="text-xs text-blue-600 font-manrope">
                                      {formatCurrency(
                                        vendor.paymentStatus.approvedAmount
                                      )}{" "}
                                      approved
                                    </div>
                                  )}
                                  {vendor.paymentStatus.disputedAmount > 0 && (
                                    <div className="text-xs text-destructive font-manrope">
                                      {formatCurrency(
                                        vendor.paymentStatus.disputedAmount
                                      )}{" "}
                                      disputed
                                    </div>
                                  )}
                                  {vendor.paymentCompletionRate !==
                                    undefined && (
                                    <div className="text-xs text-muted-foreground font-manrope">
                                      {vendor.paymentCompletionRate.toFixed(1)}%
                                      complete
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground font-manrope">
                                  No payment records
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-muted/30 font-bold">
                        <td className="p-3 font-manrope font-bold">Total</td>
                        <td className="p-3 text-right font-manrope">
                          {formatPercentage(report.summary.avgCommissionRate)}
                        </td>
                        <td className="p-3 text-right font-manrope">
                          {formatCurrency(report.summary.totalRevenue)}
                        </td>
                        <td className="p-3 text-right font-manrope">
                          {report.summary.totalOrders.toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-manrope text-emerald-600">
                          {formatCurrency(report.summary.totalCommission)}
                        </td>
                        <td className="p-3 text-right">
                          <div className="space-y-1">
                            {report.summary.totalPaidAmount !== undefined && (
                              <div className="text-emerald-600 font-manrope">
                                {formatCurrency(report.summary.totalPaidAmount)}{" "}
                                paid
                              </div>
                            )}
                            {report.summary.outstandingAmount !== undefined &&
                              report.summary.outstandingAmount > 0 && (
                                <div className="text-orange-600 font-manrope">
                                  {formatCurrency(
                                    report.summary.outstandingAmount
                                  )}{" "}
                                  outstanding
                                </div>
                              )}
                            {report.summary.paymentCompletionRate !==
                              undefined && (
                              <div className="text-sm text-muted-foreground font-manrope">
                                {report.summary.paymentCompletionRate.toFixed(
                                  1
                                )}
                                % complete
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {report && report.vendors.length === 0 && (
                <div className="text-center py-12">
                  <div className="space-y-4">
                    <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                      <DollarSign className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bricolage font-semibold">
                        No Commission Data
                      </h3>
                      <p className="text-muted-foreground font-manrope">
                        No commission data available for the selected period and
                        filters.
                      </p>
                    </div>
                    <Button onClick={resetFilters} variant="outline" size="sm">
                      Reset Filters
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
