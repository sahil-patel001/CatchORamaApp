import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Package,
  TrendingUp,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getAdminDashboardStats } from "@/services/dashboardService";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Product, Vendor, Order } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DateRangePicker,
  useDateRangePicker,
} from "@/components/ui/DateRangePicker";

interface TopVendor extends Vendor {
  totalRevenue: number;
  totalOrders: number;
  businessName: string;
  contactEmail?: string;
  userName: string;
}

interface TopProduct extends Product {
  totalSold: number;
  totalRevenue: number;
  product: Product;
}

export function AdminDashboard() {
  const navigate = useNavigate();

  // Helper function to format date for API without timezone issues
  const formatDateForAPI = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Date range picker state - using preset periods for dashboard (Weekly as default per user preference)
  const dateRangePicker = useDateRangePicker("7d");
  const { mode, presetPeriod, customDateRange } = dateRangePicker;

  const {
    data: statsData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [
      "adminDashboardStats",
      mode,
      presetPeriod,
      customDateRange?.from ? formatDateForAPI(customDateRange.from) : null,
      customDateRange?.to ? formatDateForAPI(customDateRange.to) : null,
    ],
    queryFn: async () => {
      if (mode === "custom" && customDateRange?.from && customDateRange?.to) {
        // Use custom date range - format dates in local timezone to avoid timezone shifts
        const startDate = formatDateForAPI(customDateRange.from);
        const endDate = formatDateForAPI(customDateRange.to);
        return await getAdminDashboardStats(undefined, startDate, endDate);
      } else {
        // Use preset period
        return await getAdminDashboardStats(presetPeriod || "30d");
      }
    },
  });

  const stats = statsData?.data;

  const navigateTo = (path: string) => {
    navigate(path);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bricolage font-bold tracking-tight">
            Dashboard Overview
          </h2>
          <Skeleton className="h-10 w-[180px]" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-background rounded-lg border-2 border-dashed border-destructive/50">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <h3 className="mt-4 text-lg font-semibold text-destructive">
          Failed to load dashboard data
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {error instanceof Error
            ? error.message
            : "An unexpected error occurred."}
        </p>
      </div>
    );
  }

  const periodLabels: { [key: string]: string } = {
    "7d": "in the last 7 days",
    "30d": "in the last 30 days",
    "90d": "in the last 90 days",
    "1y": "in the last year",
  };

  const getCurrentPeriodLabel = () => {
    if (mode === "custom" && customDateRange?.from && customDateRange?.to) {
      return "for custom date range";
    }
    return periodLabels[presetPeriod] || periodLabels["7d"];
  };

  // Function to get dynamic revenue title based on selected filter
  const getRevenueTitle = () => {
    if (mode === "custom" && customDateRange?.from && customDateRange?.to) {
      return "Custom Period Revenue";
    }

    const titleMap: { [key: string]: string } = {
      "7d": "Weekly Revenue",
      "30d": "Monthly Revenue",
      "90d": "Quarterly Revenue",
      "1y": "Yearly Revenue",
    };

    return titleMap[presetPeriod] || "Weekly Revenue";
  };

  // Function to get dynamic section titles based on selected filter
  const getSectionTitle = (baseTitle: string) => {
    if (mode === "custom" && customDateRange?.from && customDateRange?.to) {
      return `${baseTitle} (Custom Period)`;
    }

    const periodMap: { [key: string]: string } = {
      "7d": "Weekly",
      "30d": "Monthly",
      "90d": "Quarterly",
      "1y": "Yearly",
    };

    const period = periodMap[presetPeriod] || "Weekly";
    return `${baseTitle} (${period})`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bricolage font-bold tracking-tight">
            Dashboard Overview
          </h2>
          <p className="text-muted-foreground">
            Monitor your platform's performance and key metrics
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
              { value: "90d", label: "Quarterly" },
              { value: "1y", label: "Yearly" },
            ]}
            className="w-auto"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card
          className="hover:shadow-md transition-all duration-200 cursor-pointer hover:border-primary/50"
          onClick={() => navigateTo("/admin/vendors")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-manrope font-medium">
              Total Vendors
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bricolage font-bold">
              {stats?.overview.totalVendors ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              <span
                className={
                  (stats?.overview.recentVendors ?? 0) >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }
              >
                {stats?.overview.recentVendors ?? 0} new vendors
              </span>{" "}
              {getCurrentPeriodLabel()}
            </p>
          </CardContent>
        </Card>

        <Card
          className="hover:shadow-md transition-all duration-200 cursor-pointer hover:border-primary/50"
          onClick={() => navigateTo("/admin/products")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-manrope font-medium">
              Total Products
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bricolage font-bold">
              {stats?.overview.totalProducts?.toLocaleString() ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              <span
                className={
                  (stats?.overview?.recentProducts ?? 0) >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }
              >
                {stats?.overview?.recentProducts?.toLocaleString() ?? 0} new
                products
              </span>{" "}
              {getCurrentPeriodLabel()}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/50 cursor-not-allowed">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-manrope font-medium">
              Total Sales
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bricolage font-bold">
              {stats?.overview.totalOrders?.toLocaleString() ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              <span
                className={
                  (stats?.overview?.recentOrders ?? 0) >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }
              >
                {stats?.overview?.recentOrders ?? 0} orders
              </span>{" "}
              {getCurrentPeriodLabel()}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/50 cursor-not-allowed">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-manrope font-medium">
              {getRevenueTitle()}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bricolage font-bold">
              ${stats?.overview.totalRevenue?.toLocaleString() ?? "0"}
            </div>
            <p className="text-xs text-muted-foreground">
              <span
                className={
                  (stats?.overview.recentRevenue ?? 0) >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }
              >
                ${stats?.overview.recentRevenue?.toLocaleString() ?? "0"}{" "}
                revenue
              </span>{" "}
              {getCurrentPeriodLabel()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Vendors and Products */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-bricolage">
              {getSectionTitle("Top 10 Vendors by Sales")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.topVendors && stats.topVendors.length > 0 ? (
              <div className="space-y-4">
                {stats.topVendors.map((vendor: TopVendor) => (
                  <div
                    key={vendor._id}
                    className="flex items-center justify-between"
                  >
                    <div className="font-manrope">
                      <p className="font-medium">{vendor.businessName}</p>
                      <p className="text-sm text-muted-foreground">
                        {vendor.contactEmail || vendor.userName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        ${vendor.totalRevenue.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {vendor.totalOrders} orders
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                <Users className="h-6 w-6 mb-2" />
                <p>No vendor performance data found</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-bricolage">
              {getSectionTitle("Top 10 Products by Sales")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.topProducts && stats.topProducts.length > 0 ? (
              <div className="space-y-4">
                {stats.topProducts.map((p: TopProduct) => (
                  <div
                    key={p._id}
                    className="flex items-center justify-between"
                  >
                    <div className="font-manrope">
                      <p className="font-medium">{p.product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {p.product.category}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        ${p.totalRevenue.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.totalSold} sold
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                <Package className="h-6 w-6 mb-2" />
                <p>No product performance data found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
