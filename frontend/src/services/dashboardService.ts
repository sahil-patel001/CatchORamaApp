import api from "./api";

const API_BASE_URL = `/dashboard`;

/**
 * Fetches admin dashboard statistics.
 * Returns the inner `data` payload from the backend response:
 * { overview, topVendors, topProducts, monthlyStats, recentVendors, period }
 */
export const getAdminDashboardStats = async (
  period?: string,
  startDate?: string,
  endDate?: string
) => {
  const params: Record<string, string> = {};

  if (startDate && endDate) {
    params.startDate = startDate;
    params.endDate = endDate;
  } else if (period) {
    params.period = period;
  } else {
    params.period = "30d"; // default fallback
  }

  // api interceptor returns response.data, so `body` is { success, data }
  const body = await api.get(`${API_BASE_URL}/admin`, {
    params,
    withCredentials: true,
  });
  // Return the inner data payload for direct consumption by pages
  return (body as any).data;
};

/**
 * Fetches vendor dashboard statistics.
 * Returns the inner `data` payload from the backend response:
 * { overview, growthRates, recentOrders, topProducts, leastSellingProducts, lowStockProducts, monthlyStats, period }
 */
export const getVendorDashboardStats = async (
  period?: string,
  startDate?: string,
  endDate?: string
) => {
  const params: Record<string, string> = {};

  if (startDate && endDate) {
    params.startDate = startDate;
    params.endDate = endDate;
  } else if (period) {
    params.period = period;
  } else {
    params.period = "30d"; // default fallback
  }

  // api interceptor returns response.data, so `body` is { success, data }
  const body = await api.get(`${API_BASE_URL}/vendor`, {
    params,
    withCredentials: true,
  });
  // Return the inner data payload for direct consumption by pages
  return (body as any).data;
};
