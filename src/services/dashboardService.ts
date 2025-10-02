import axios from "axios";

const API_BASE_URL = `${
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api/v1"
}/dashboard`;

// Utility to add the authorization token to requests
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

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

  const response = await axios.get(`${API_BASE_URL}/admin`, {
    params,
    headers: getAuthHeaders(),
    withCredentials: true,
  });
  return response.data;
};

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

  const response = await axios.get(`${API_BASE_URL}/vendor`, {
    params,
    headers: getAuthHeaders(),
    withCredentials: true,
  });
  return response.data;
};
