import axios from "axios";
import { Commission, CommissionStats, CommissionHistoryEntry } from "@/types";
import api from "./api";

const API_URL = `/commissions`;

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface CommissionFilters extends PaginationParams {
  status?: string;
  vendorId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    current: number;
    pages: number;
    total: number;
    limit: number;
  };
}

/**
 * Fetches all commissions with filtering and pagination
 */
export const getCommissions = async (
  filters: CommissionFilters = {}
): Promise<PaginatedResponse<Commission>> => {
  const response = await api.get(API_URL, {
    withCredentials: true,
    params: filters,
  });

  // Backend returns { data: { commissions: [...], pagination: {...} } }
  // We need to map it to { data: [...], pagination: {...} }
  const backendData = response.data;
  return {
    data: backendData.commissions || [],
    pagination: backendData.pagination,
  };
};

/**
 * Fetches a single commission by ID
 */
export const getCommission = async (id: string): Promise<Commission> => {
  const response = await api.get(`${API_URL}/${id}`, {
    withCredentials: true,
  });
  return response.data.data;
};

/**
 * Generates a commission for a vendor and period
 */
export const generateCommission = async (data: {
  vendorId: string;
  startDate: string;
  endDate: string;
  periodType?: "weekly" | "monthly" | "quarterly" | "yearly" | "custom";
  commissionRate?: number; // Optional commission rate override (0-1)
}): Promise<Commission> => {
  const response = await api.post(`${API_URL}/generate`, data, {
    withCredentials: true,
  });
  return response.data.data;
};

/**
 * Bulk generates commissions for all vendors
 */
export const bulkGenerateCommissions = async (data: {
  startDate: string;
  endDate: string;
  periodType?: "weekly" | "monthly" | "quarterly" | "yearly";
  commissionRate?: number; // Optional commission rate override (0-1) applied to all vendors
}): Promise<{
  message: string;
  results: {
    successful: Array<{
      vendorId: string;
      vendorName: string;
      commissionId: string;
      amount: number;
    }>;
    failed: Array<{
      vendorId: string;
      vendorName: string;
      error: string;
    }>;
  };
}> => {
  const response = await api.post(`${API_URL}/bulk-generate`, data, {
    withCredentials: true,
  });
  return response.data.data;
};

/**
 * Approves a commission
 */
export const approveCommission = async (id: string): Promise<Commission> => {
  const response = await api.put(
    `${API_URL}/${id}/approve`,
    {},
    {
      withCredentials: true,
    }
  );
  return response.data.data;
};

/**
 * Marks a commission as paid
 */
export const markCommissionAsPaid = async (
  id: string,
  paymentData: {
    method?: "bank_transfer" | "paypal" | "stripe" | "check" | "other";
    transactionId?: string;
    notes?: string;
  }
): Promise<Commission> => {
  const response = await api.put(`${API_URL}/${id}/pay`, paymentData, {
    withCredentials: true,
  });
  return response.data.data;
};

/**
 * Disputes a commission
 */
export const disputeCommission = async (
  id: string,
  notes: string
): Promise<Commission> => {
  const response = await api.put(
    `${API_URL}/${id}/dispute`,
    { notes },
    {
      withCredentials: true,
    }
  );
  return response.data.data;
};

/**
 * Updates a commission
 */
export const updateCommission = async (
  id: string,
  updates: {
    notes?: string;
    calculation?: {
      totalRevenue?: number;
      commissionRate?: number;
    };
  }
): Promise<Commission> => {
  const response = await api.put(`${API_URL}/${id}`, updates, {
    withCredentials: true,
  });
  return response.data.data;
};

/**
 * Deletes a commission
 */
export const deleteCommission = async (
  id: string
): Promise<{ message: string }> => {
  const response = await api.delete(`${API_URL}/${id}`, {
    withCredentials: true,
  });
  return response.data.data;
};

/**
 * Gets commission statistics
 */
export const getCommissionStats = async (filters?: {
  vendorId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<CommissionStats> => {
  const response = await api.get(`${API_URL}/stats`, {
    withCredentials: true,
    params: filters,
  });
  return response.data.data;
};

/**
 * Gets commissions for the logged-in vendor
 */
export const getVendorCommissions = async (
  filters: PaginationParams & {
    status?: string;
    startDate?: string;
    endDate?: string;
  } = {}
): Promise<PaginatedResponse<Commission>> => {
  const response = await api.get(`${API_URL}/vendor`, {
    withCredentials: true,
    params: filters,
  });
  return response.data.data;
};

/**
 * Gets commission history for a specific commission
 */
export const getCommissionHistory = async (
  commissionId: string,
  options?: {
    action?: string;
    performedBy?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
): Promise<CommissionHistoryEntry[]> => {
  // Note: This would need to be implemented in the backend as a separate endpoint
  // For now, this is a placeholder implementation
  const response = await api.get(`${API_URL}/${commissionId}/history`, {
    withCredentials: true,
    params: options,
  });
  return response.data.data;
};

/**
 * Exports commissions to CSV
 */
export const exportCommissions = async (
  filters: CommissionFilters = {},
  format: "csv" | "json" = "csv"
): Promise<Blob> => {
  const response = await api.get(`${API_URL}/export`, {
    withCredentials: true,
    params: { ...filters, format },
    responseType: "blob",
  });
  return response.data;
};

/**
 * Downloads commission export file
 */
export const downloadCommissionExport = async (
  filters: CommissionFilters = {},
  format: "csv" | "json" = "csv",
  filename?: string
) => {
  try {
    const blob = await exportCommissions(filters, format);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download =
      filename ||
      `commissions-export-${new Date().toISOString().split("T")[0]}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading commission export:", error);
    throw error;
  }
};

/**
 * Utility function to format commission status with color
 */
export const getCommissionStatusColor = (status: Commission["status"]) => {
  switch (status) {
    case "paid":
      return "text-green-600 bg-green-100";
    case "approved":
      return "text-blue-600 bg-blue-100";
    case "calculated":
      return "text-yellow-600 bg-yellow-100";
    case "disputed":
      return "text-red-600 bg-red-100";
    case "cancelled":
      return "text-gray-600 bg-gray-100";
    default:
      return "text-gray-600 bg-gray-100";
  }
};

/**
 * Utility function to format commission status text
 */
export const getCommissionStatusText = (status: Commission["status"]) => {
  switch (status) {
    case "pending":
      return "Pending";
    case "calculated":
      return "Calculated";
    case "approved":
      return "Approved";
    case "paid":
      return "Paid";
    case "disputed":
      return "Disputed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
};

/**
 * Utility function to format payment method text
 */
export const getPaymentMethodText = (method?: string) => {
  switch (method) {
    case "bank_transfer":
      return "Bank Transfer";
    case "paypal":
      return "PayPal";
    case "stripe":
      return "Stripe";
    case "check":
      return "Check";
    case "other":
      return "Other";
    default:
      return "Not specified";
  }
};
