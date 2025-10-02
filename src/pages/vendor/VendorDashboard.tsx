import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { getVendorDashboardStats } from "@/services/dashboardService";
import { Skeleton } from "@/components/ui/skeleton";
import { VendorProductStat, RecentOrder, LowStockProduct } from "@/types";
import { formatDate } from "@/lib/utils";
import { useTheme } from "next-themes";
import {
  DateRangePicker,
  useDateRangePicker,
} from "@/components/ui/DateRangePicker";
import { title } from "process";

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

export function VendorDashboard() {
  const navigate = useNavigate();
  const theme = useThemeKey();

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
      "vendorDashboardStats",
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
        return await getVendorDashboardStats(undefined, startDate, endDate);
      } else {
        // Use preset period
        return await getVendorDashboardStats(presetPeriod || "30d");
      }
    },
    retry: false, // Don't retry on failure, use dummy data instead
  });

  const stats = statsData?.data;

  const navigateTo = (path: string) => {
    navigate(path);
  };

  // Function to get dynamic period description
  const getPeriodDescription = () => {
    if (mode === "custom" && customDateRange?.from && customDateRange?.to) {
      return "for custom date range";
    }

    const descriptionMap: { [key: string]: string } = {
      "7d": "this week",
      "30d": "this month",
      "90d": "this quarter",
      "1y": "this year",
    };

    return descriptionMap[presetPeriod] || "this week";
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      processing: "secondary",
      shipped: "default",
      delivered: "default",
      pending: "secondary",
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || "secondary"}>
        {status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back! Here's what's happening with your store.
            </p>
          </div>
          <Skeleton className="h-10 w-[180px]" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
          {[...Array(2)].map((_, i) => (
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

  const statCards = [
    {
      // title: getRevenueTitle(),
      title: "Total Revenue",
      value: `$${stats?.overview.totalRevenue?.toLocaleString() ?? "0"}`,
      change: `$${
        stats?.overview.recentRevenue?.toLocaleString() ?? 0
      } revenue`,
      changeType:
        (stats?.overview.recentRevenue ?? 0) >= 0 ? "positive" : "negative",
      icon: DollarSign,
      path: "/vendor/sales",
    },
    // {
    //   title: "Pending Orders",
    //   value: stats?.overview.pendingOrders ?? 0,
    //   changeType:
    //     (stats?.overview.recentOrders ?? 0) >= 0 ? "positive" : "negative",
    //   icon: ShoppingCart,
    //   path: "/vendor/orders",
    // },
    {
      title: "Total Orders",
      value: stats?.overview.totalOrders ?? 0,
      change: `${stats?.overview.recentOrders ?? 0} ${
        stats?.overview.recentOrders > 1 ? "orders" : "order"
      }`,
      changeType:
        (stats?.overview.recentRevenue ?? 0) >= 0 ? "positive" : "negative",
      icon: ShoppingCart,
      path: "/vendor/orders",
    },
    {
      title: "Total Products",
      value: stats?.overview.totalProducts ?? 0,
      change: `${stats?.overview.recentProducts ?? 0} ${
        stats?.overview.recentProducts > 1 ? "products" : "product"
      } added`,
      changeType:
        (stats?.overview.recentRevenue ?? 0) >= 0 ? "positive" : "negative",
      icon: Package,
      path: "/vendor/products",
    },
  ];

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

  const growthRates = stats?.growthRates;
  const monthlyStats = stats?.monthlyStats ?? [];
  const hasMonthlyStats = monthlyStats.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your store.
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat, i) => (
          <Card
            key={i}
            className="hover:shadow-md transition-all duration-200 cursor-pointer hover:border-primary/50"
            onClick={() => stat.path && navigateTo(stat.path)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.change && (
                <p className="text-xs text-muted-foreground">
                  <span
                    className={
                      stat.changeType === "positive"
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {stat.change}
                  </span>{" "}
                  {getCurrentPeriodLabel()}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Growth Metrics */}
      {growthRates ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Growth Metrics
            </CardTitle>
            <CardDescription>
              Performance comparison vs previous{" "}
              {getCurrentPeriodLabel()
                .replace("in the ", "")
                .replace("for ", "")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Revenue Growth
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-2xl font-bold ${
                      growthRates.revenueGrowthRate >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {growthRates.revenueGrowthRate >= 0 ? "+" : ""}
                    {growthRates.revenueGrowthRate}%
                  </span>
                  {growthRates.revenueGrowthRate >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  ${growthRates.currentPeriod.revenue.toLocaleString()} vs $
                  {growthRates.previousPeriod.revenue.toLocaleString()}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Order Growth
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-2xl font-bold ${
                      growthRates.orderGrowthRate >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {growthRates.orderGrowthRate >= 0 ? "+" : ""}
                    {growthRates.orderGrowthRate}%
                  </span>
                  {growthRates.orderGrowthRate >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {growthRates.currentPeriod.orders} vs{" "}
                  {growthRates.previousPeriod.orders} orders
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Avg Order Value
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-2xl font-bold ${
                      growthRates.avgOrderValueGrowthRate >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {growthRates.avgOrderValueGrowthRate >= 0 ? "+" : ""}
                    {growthRates.avgOrderValueGrowthRate}%
                  </span>
                  {growthRates.avgOrderValueGrowthRate >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  ${growthRates.currentPeriod.avgOrderValue.toLocaleString()} vs
                  ${growthRates.previousPeriod.avgOrderValue.toLocaleString()}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Monthly Growth
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-2xl font-bold ${
                      growthRates.monthlyGrowthRate >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {growthRates.monthlyGrowthRate >= 0 ? "+" : ""}
                    {growthRates.monthlyGrowthRate}%
                  </span>
                  {growthRates.monthlyGrowthRate >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Month-over-month comparison
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
          <TrendingUp className="h-6 w-6 mb-2" />
          <p>No growth metrics available for the selected period</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Sales Growth Chart */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Sales Growth</CardTitle>
            <CardDescription>
              Your sales performance over the last 12 months.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasMonthlyStats ? (
              <ResponsiveContainer width="100%" height={350} key={theme}>
                <LineChart
                  data={monthlyStats}
                  margin={{ top: 20, right: 30, left: 15, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="4 4" stroke="#2e2e2e" />
                  <XAxis
                    dataKey="_id.month"
                    stroke={theme === "dark" ? "#ccc" : "#222"}
                    tick={{
                      fontSize: 12,
                      fill: theme === "dark" ? "#ccc" : "#222",
                    }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(tick) => {
                      const monthMap = {
                        1: "Jan",
                        2: "Feb",
                        3: "Mar",
                        4: "Apr",
                        5: "May",
                        6: "Jun",
                        7: "Jul",
                        8: "Aug",
                        9: "Sep",
                        10: "Oct",
                        11: "Nov",
                        12: "Dec",
                      };
                      return monthMap[tick] || tick;
                    }}
                  />
                  <YAxis
                    stroke={theme === "dark" ? "#ccc" : "#222"}
                    tick={{
                      fontSize: 12,
                      fill: theme === "dark" ? "#ccc" : "#222",
                    }}
                    axisLine={false}
                    tickLine={false}
                    label={{
                      value: "Total Revenue ($)",
                      angle: -90,
                      position: "insideLeft",
                      dy: 40,
                      offset: -5,
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
                    labelFormatter={(label) => {
                      const monthMap = {
                        1: "Jan",
                        2: "Feb",
                        3: "Mar",
                        4: "Apr",
                        5: "May",
                        6: "Jun",
                        7: "Jul",
                        8: "Aug",
                        9: "Sep",
                        10: "Oct",
                        11: "Nov",
                        12: "Dec",
                      };
                      return `Month: ${monthMap[label] || label}`;
                    }}
                    itemStyle={{
                      color: theme === "dark" ? "#fff" : "#000",
                    }}
                    formatter={(value) => [
                      `$${Number(value).toLocaleString()}`,
                      "Total Revenue",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalRevenue"
                    stroke="#8884d8"
                    strokeWidth={3}
                    dot={{
                      stroke: theme === "dark" ? "#ccc" : "#222",
                      fill: theme === "dark" ? "#ccc" : "#222",
                      strokeWidth: 2,
                      r: 4,
                    }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <TrendingUp className="h-6 w-6 mb-2" />
                <p>No sales growth data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Top 5 Best Selling Products
            </CardTitle>
            <CardDescription>
              Highest performing products {getPeriodDescription()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.topProducts && stats?.topProducts.length > 0 ? (
                stats?.topProducts?.map(
                  (p: VendorProductStat, index: number) => (
                    <div
                      key={p._id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600 text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {p.product.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {p.totalSold} units sold
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          ${p.totalRevenue.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )
                )
              ) : (
                <div className="flex flex-col items-center justify-center mt-5 text-muted-foreground">
                  <TrendingUp className="text-muted-foreground w-6 h-6 mb-2" />
                  <p>No best selling products found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              Top 5 Least Selling Products
            </CardTitle>
            <CardDescription>Products that need attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.leastSellingProducts &&
              stats.leastSellingProducts.length > 0 ? (
                stats.leastSellingProducts.map(
                  (p: VendorProductStat, index: number) => (
                    <div
                      key={p._id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {p.product.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {p.totalSold} units sold
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          ${p.totalRevenue.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )
                )
              ) : (
                <div className="flex flex-col items-center justify-center mt-5 text-muted-foreground">
                  <TrendingDown className="text-muted-foreground w-6 h-6 mb-2" />
                  <p>No underperforming products found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>
              The latest orders from your customers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.recentOrders && stats?.recentOrders.length > 0 ? (
                stats.recentOrders.slice(0, 5).map((order: RecentOrder) => (
                  <div
                    key={order._id}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {order.customer?.name || `Order #${order.orderNumber}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        ${order.orderTotal.toLocaleString()}
                      </p>
                      {getStatusBadge(order.status)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center mt-5 text-muted-foreground">
                  <ShoppingCart className="text-muted-foreground w-6 h-6 mb-2" />
                  <p>No orders found for this period</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card>
          <CardHeader>
            <CardTitle>Low Stock Products</CardTitle>
            <CardDescription>
              Products that are running low on stock.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.lowStockProducts && stats?.lowStockProducts.length > 0 ? (
                stats?.lowStockProducts?.map((product: LowStockProduct) => (
                  <div
                    key={product.sku}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        SKU: {product.sku}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-red-600">
                        {product.stock} left
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center mt-5 text-muted-foreground">
                  <Package className="text-muted-foreground w-6 h-6 mb-2" />
                  <p>No low stock alerts right now</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
