import { SalesReport, ReportPeriod, CommissionReport } from "@/types";
import api from "./api";

const API_URL = `/reports`;

/**
 * Fetches the sales report for the logged-in vendor.
 * Returns the inner `data` object from the backend response.
 * @param period - The time period for the report ('weekly', 'monthly', 'yearly').
 * @param startDate - Custom start date (optional)
 * @param endDate - Custom end date (optional)
 */
export const getSalesReport = async (
  period: ReportPeriod = "weekly",
  startDate?: string,
  endDate?: string
): Promise<SalesReport> => {
  const params: Record<string, string> = {};

  // If custom date range is provided, use it instead of period
  if (startDate && endDate) {
    params.startDate = startDate;
    params.endDate = endDate;
  } else {
    // Only use period if no custom dates are provided
    params.period = period;
  }

  // api interceptor returns response.data => { success, data: SalesReport }
  const body = await api.get(`${API_URL}/sales`, {
    withCredentials: true,
    params,
  });
  return (body as any).data;
};

/**
 * Fetches the sales report for a specific vendor (admin access).
 * Returns the inner `data` object from the backend response.
 * @param vendorId - The vendor's ID
 * @param period - The time period for the report ('weekly', 'monthly', 'yearly').
 * @param startDate - Custom start date (optional)
 * @param endDate - Custom end date (optional)
 */
export const getVendorSalesReportAsAdmin = async (
  vendorId: string,
  period: ReportPeriod = "weekly",
  startDate?: string,
  endDate?: string
): Promise<SalesReport> => {
  const params: Record<string, string> = { vendorId };

  // If custom date range is provided, use it instead of period
  if (startDate && endDate) {
    params.startDate = startDate;
    params.endDate = endDate;
  } else {
    // Only use period if no custom dates are provided
    params.period = period;
  }

  // api interceptor returns response.data => { success, data: SalesReport }
  const body = await api.get(`${API_URL}/sales`, {
    withCredentials: true,
    params,
  });
  return (body as any).data;
};

/**
 * Fetches the commission report for all vendors (Super Admin only).
 * Returns the inner `data` object from the backend response.
 * @param period - The time period for the report ('weekly', 'monthly', 'quarterly', 'yearly').
 * @param startDate - Custom start date (optional)
 * @param endDate - Custom end date (optional)
 * @param vendorId - Filter by specific vendor (optional)
 * @param paymentStatus - Filter by payment status (optional)
 */
export const getCommissionReport = async (
  period: ReportPeriod = "monthly",
  startDate?: string,
  endDate?: string,
  vendorId?: string,
  paymentStatus?: string
): Promise<CommissionReport> => {
  const params: Record<string, string> = { period };
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  if (vendorId && vendorId !== "all") params.vendorId = vendorId;
  if (paymentStatus && paymentStatus !== "all")
    params.paymentStatus = paymentStatus;

  // api interceptor returns response.data => { success, data: CommissionReport }
  const body = await api.get(`${API_URL}/commission`, {
    withCredentials: true,
    params,
  });
  return (body as any).data;
};
