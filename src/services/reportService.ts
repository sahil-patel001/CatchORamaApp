import axios from "axios";
import { SalesReport, ReportPeriod, CommissionReport } from "@/types";

const API_URL = `${import.meta.env.VITE_API_BASE_URL}/reports`;

/**
 * Fetches the sales report for the logged-in vendor.
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

  const response = await axios.get(`${API_URL}/sales`, {
    withCredentials: true,
    params,
  });
  return response.data.data;
};

/**
 * Fetches the sales report for a specific vendor (admin access).
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

  const response = await axios.get(`${API_URL}/sales`, {
    withCredentials: true,
    params,
  });
  return response.data.data;
};

/**
 * Fetches the commission report for all vendors (Super Admin only).
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

  const response = await axios.get(`${API_URL}/commission`, {
    withCredentials: true,
    params,
  });
  return response.data.data;
};
