import api from "./api";

const API_BASE_URL = `/orders`;

/**
 * Fetches all orders with pagination.
 * Returns { orders, pagination } directly.
 */
export const getOrders = async (
  page: number = 1,
  limit: number = 10,
  search?: string,
  status?: string
) => {
  const params = new URLSearchParams();
  
  params.append("page", page.toString());
  params.append("limit", limit.toString());
  
  if (search && search.trim() !== "") {
    params.append("search", search);
  }
  
  if (status && status !== "all") {
    params.append("status", status);
  }

  const url = `${API_BASE_URL}?${params.toString()}`;
  
  // api interceptor returns response.data => { success, data: { orders, pagination } }
  const body = await api.get(url, {
    withCredentials: true,
  });
  return (body as any).data; // { orders, pagination }
};
