import { useState, useEffect, useCallback } from "react";
import { DataTable } from "@/components/DataTable";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ViewSalesModal } from "@/components/modals/ViewSalesModal";
import { Button } from "@/components/ui/button";

import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getSalesReport } from "@/services/reportService";
import { SalesReport, ReportPeriod } from "@/types";

import { Download, TrendingUp, ShoppingCart, DollarSign } from "lucide-react";
import { useTheme } from "next-themes";
import { formatDate } from "@/lib/utils";
import {
  DateRangePicker,
  useDateRangePicker,
} from "@/components/ui/DateRangePicker";

interface TransformedSalesData {
  id: string | number;
  date: string;
  revenue: number;
  orders: number;
  growth?: string;
  [key: string]: unknown;
}

function useThemeKey() {
  const { resolvedTheme } = useTheme();
  const [themeKey, setThemeKey] = useState(
    resolvedTheme ||
      (document.documentElement.classList.contains("dark") ? "dark" : "light")
  );

  useEffect(() => {
    setThemeKey(
      resolvedTheme ||
        (document.documentElement.classList.contains("dark") ? "dark" : "light")
    );
    const observer = new MutationObserver(() => {
      setThemeKey(
        document.documentElement.classList.contains("dark") ? "dark" : "light"
      );
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, [resolvedTheme]);
  return themeKey;
}

export function SalesManagement() {
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [selectedSales, setSelectedSales] =
    useState<TransformedSalesData | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const theme = useThemeKey();

  // Helper function to format date for API without timezone issues
  const formatDateForAPI = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Date range picker state - using preset periods for sales reports
  const dateRangePicker = useDateRangePicker("7d");
  const { mode, presetPeriod, customDateRange } = dateRangePicker;

  // Convert preset period to ReportPeriod type
  const getReportPeriod = (): ReportPeriod => {
    if (mode === "custom") return "weekly"; // fallback for custom dates
    switch (presetPeriod) {
      case "7d":
        return "weekly";
      case "30d":
        return "monthly";
      case "1y":
        return "yearly";
      default:
        return "weekly";
    }
  };

  const currentPeriod = getReportPeriod();
  // Debug: print theme value
  // console.log('Chart theme:', theme, 'HTML classes:', document.documentElement.className);

  // Memoized fetch function to prevent infinite loops
  const fetchSalesReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch sales report from API
      let report: SalesReport;
      if (mode === "custom" && customDateRange?.from && customDateRange?.to) {
        // Use custom date range - format dates in local timezone to avoid timezone shifts
        const startDate = formatDateForAPI(customDateRange.from);
        const endDate = formatDateForAPI(customDateRange.to);
        // For custom date ranges, use "weekly" as the period type but pass the custom dates
        report = await getSalesReport("weekly", startDate, endDate);
      } else {
        // Use preset period
        report = await getSalesReport(currentPeriod);
      }
      setSalesReport(report);
    } catch (err) {
      console.error("Error fetching sales report:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch sales report"
      );
      toast({
        title: "Error",
        description: "Failed to load sales report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [
    currentPeriod,
    mode,
    customDateRange?.from,
    customDateRange?.to,
    presetPeriod,
  ]);

  // Fetch sales report data
  useEffect(() => {
    fetchSalesReport();
  }, [fetchSalesReport]);

  // Transform API data for table display
  const salesTableData: TransformedSalesData[] =
    salesReport?.salesData.map((item, index) => {
      const previousItem = index > 0 ? salesReport.salesData[index - 1] : null;
      const growth = previousItem
        ? (
            ((item.totalSales - previousItem.totalSales) /
              previousItem.totalSales) *
            100
          ).toFixed(1)
        : "0";

      return {
        id: item._id,
        date: formatDate(item._id),
        revenue: item.totalSales,
        orders: item.orderCount,
        growth,
      };
    }) || [];

  // Transform data for chart display
  const chartData =
    salesReport?.salesData.map((item) => ({
      date: formatDate(item._id),
      revenue: item.totalSales,
      orders: item.orderCount,
    })) || [];

  const columns = [
    {
      key: "date",
      header: "Date",
    },
    {
      key: "revenue",
      header: "Revenue",
      render: (value: number) => `$${value.toFixed(2)}`,
    },
    {
      key: "orders",
      header: "Orders",
      render: (value: number) => value.toString(),
    },
    {
      key: "growth",
      header: "Growth",
      render: (value: string) => (
        <span
          className={Number(value) >= 0 ? "text-green-600" : "text-red-600"}
        >
          {Number(value) >= 0 ? "+" : ""}
          {value}%
        </span>
      ),
    },
  ];

  const handleView = (item: TransformedSalesData) => {
    setSelectedSales(item);
    setShowViewModal(true);
  };

  // This function is no longer needed as we handle period changes through DateRangePicker

  const handleExport = () => {
    if (!salesReport || salesTableData.length === 0) {
      toast({
        title: "Error",
        description: "No sales data available to export",
        variant: "destructive",
      });
      return;
    }

    try {
      const { vendorInfo, summary } = salesReport;
      const formattedCurrentDate = formatDate(new Date());

      // Create comprehensive CSV content
      const csvLines = [
        "# Sales Report",
        `# Generated on: ${formattedCurrentDate}`,
        `# Business Name: ${vendorInfo.businessName}`,
        `# ABN: ${vendorInfo.abn.replace(/[^0-9]/g, "")}`,
        `# GST Registered: ${vendorInfo.gstRegistered ? "Yes" : "No"}`,
        `# Report Period: ${summary.period}`,
        `# Total Revenue: $${summary.totalRevenue.toFixed(2)}`,
        `# Total Orders: ${summary.totalOrders}`,
        "",
        "Date,Revenue,Orders,Growth",
      ];

      // Add data rows
      console.log("Exporting sales data:", salesTableData);
      salesTableData.forEach((row) => {
        csvLines.push(
          `"${row.date}","$${row.revenue.toFixed(2)}","${row.orders}","${
            row.growth
          }%"`
        );
      });

      // Create CSV content
      const csvContent = csvLines.join("\n");
      console.log("CSV content preview:", csvContent.substring(0, 500));

      // Create and download file using Blob
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");

      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute(
          "download",
          `sales_report_${currentPeriod}_${formattedCurrentDate.replace(
            /\//g,
            "-"
          )}.csv`
        );
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      toast({
        title: "Success",
        description:
          "Sales report exported successfully with business information",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Error",
        description: "Failed to export sales report. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Calculate summary statistics from API data
  const totalRevenue = salesReport?.summary.totalRevenue || 0;
  const totalOrders = salesReport?.summary.totalOrders || 0;
  const averageDaily =
    salesTableData.length > 0 ? totalRevenue / salesTableData.length : 0;
  const bestDay =
    salesTableData.length > 0
      ? Math.max(...salesTableData.map((item) => item.revenue))
      : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Analytics</h1>
          <p className="text-muted-foreground">
            Track your sales performance and revenue trends
          </p>
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Analytics</h1>
          <p className="text-muted-foreground">
            Track your sales performance and revenue trends
          </p>
        </div>
        <div className="flex items-center space-x-4">
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
              { value: "1y", label: "Yearly" },
            ]}
            className="w-auto"
          />
          <Button
            onClick={handleExport}
            className="flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export Report</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {salesReport?.summary.period} period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              {salesReport?.summary.period} period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Daily</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${averageDaily.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Per day average</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Day</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${bestDay.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Highest revenue day</p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
          <CardDescription>
            {currentPeriod.charAt(0).toUpperCase() + currentPeriod.slice(1)}{" "}
            revenue trend
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300} key={theme}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                stroke={theme === "dark" ? "#ccc" : "#222"}
                tick={{
                  fontSize: 12,
                  fill: theme === "dark" ? "#ccc" : "#222",
                }}
              />
              <YAxis
                stroke={theme === "dark" ? "#ccc" : "#222"}
                tick={{
                  fontSize: 12,
                  fill: theme === "dark" ? "#ccc" : "#222",
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: theme === "dark" ? "#1e1e1e" : "#ffffff",
                  border: theme === "dark" ? "none" : "1px solid #e2e8f0",
                  borderRadius: 8,
                  color: theme === "dark" ? "#fff" : "#000",
                  boxShadow:
                    theme === "dark"
                      ? "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                      : "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                }}
                itemStyle={{
                  color: theme === "dark" ? "#fff" : "#000",
                }}
                formatter={(value) => [
                  `$${Number(value).toFixed(2)}`,
                  "Revenue",
                ]}
              />
              <Bar dataKey="revenue" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Breakdown</CardTitle>
          <CardDescription>Detailed {currentPeriod} sales data</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={salesTableData}
            columns={columns}
            searchKey="date"
            searchPlaceholder="Search by date..."
            onView={handleView}
          />
        </CardContent>
      </Card>

      {/* View Modal */}
      <ViewSalesModal
        open={showViewModal}
        onOpenChange={setShowViewModal}
        salesData={selectedSales}
        vendorInfo={salesReport?.vendorInfo}
      />
    </div>
  );
}
