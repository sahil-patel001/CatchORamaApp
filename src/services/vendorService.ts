import { Vendor } from "@/types";
import api from "./api";

const API_BASE_URL = `/vendors`;

// Get the current user's vendor profile
export async function getVendorProfile(): Promise<Vendor> {
  try {
    // api interceptor returns response.data => { success, data: { user } }
    const body = await api.get(
      `/auth/me`,
      {
        withCredentials: true,
      }
    );

    // If the user has a vendor profile, fetch it
    if ((body as any).data.user.role === "vendor") {
      const vendorBody = await api.get(`${API_BASE_URL}/profile`, {
        withCredentials: true,
      });
      return (vendorBody as any).data.vendor;
    }

    throw new Error("User is not a vendor");
  } catch (error) {
    console.error("Error fetching vendor profile:", error);
    throw error;
  }
}

interface VendorsResponse {
  vendors: Vendor[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export async function fetchVendors(
  query?: string,
  page: number = 1,
  limit: number = 10,
  status: string = "all"
): Promise<VendorsResponse> {
  try {
    const params: any = {
      page,
      limit,
      search: query || "",
    };

    // Only add status parameter if it's not "all"
    if (status && status !== "all") {
      params.status = status;
    }

    // api interceptor returns response.data => { success, data: { vendors: [...], pagination } }
    const body = await api.get(API_BASE_URL, {
      params,
      withCredentials: true,
    });

    return {
      vendors: (body as any).data?.vendors || [],
      pagination: (body as any).data?.pagination,
    };
  } catch (error: unknown) {
    console.error("Failed to fetch vendors:", error);
    throw new Error(
      (error as any).error?.message || "Failed to fetch vendors"
    );
  }
}

export async function fetchVendorById(id: string): Promise<Vendor> {
  try {
    // api interceptor returns response.data => { success, data: { vendor } }
    const body = await api.get(`${API_BASE_URL}/${id}`, {
      withCredentials: true,
    });
    return (body as any).data?.vendor;
  } catch (error: unknown) {
    console.error("Failed to fetch vendor:", error);
    throw new Error(
      (error as any).error?.message || "Failed to fetch vendor"
    );
  }
}

export async function addVendor(data: Partial<Vendor>): Promise<Vendor> {
  try {
    // api interceptor returns response.data => { success, data: { vendor } }
    const body = await api.post(API_BASE_URL, data, {
      withCredentials: true,
    });
    return (body as any).data?.vendor;
  } catch (error: unknown) {
    console.error("Failed to add vendor:", error);
    throw new Error(
      (error as any).error?.message || "Failed to add vendor"
    );
  }
}

export async function updateVendor(
  id: string,
  data: Partial<Vendor>
): Promise<Vendor> {
  try {
    // api interceptor returns response.data => { success, data: { vendor } }
    const body = await api.put(`${API_BASE_URL}/${id}`, data, {
      withCredentials: true,
    });
    return (body as any).data?.vendor;
  } catch (error: unknown) {
    console.error("Failed to update vendor:", error);
    throw new Error(
      (error as any).error?.message || "Failed to update vendor"
    );
  }
}

export async function deleteVendor(id: string): Promise<void> {
  try {
    await api.delete(`${API_BASE_URL}/${id}`, {
      withCredentials: true,
    });
  } catch (error: unknown) {
    console.error("Failed to delete vendor:", error);
    throw new Error(
      (error as any).error?.message || "Failed to delete vendor"
    );
  }
}

export async function getVendorPrefix(id: string): Promise<string> {
  try {
    // api interceptor returns response.data => { success, data: { vendorPrefix } }
    const body = await api.get(`${API_BASE_URL}/${id}/invoice-prefix`, {
      withCredentials: true,
    });
    return (body as any).data?.vendorPrefix || "VD01";
  } catch (error: unknown) {
    console.error("Failed to fetch vendor prefix:", error);
    throw new Error(
      (error as any).error?.message ||
        "Failed to fetch vendor prefix"
    );
  }
}

export async function setVendorPrefix(
  id: string,
  prefix: string
): Promise<string> {
  try {
    // api interceptor returns response.data => { success, data: { vendorPrefix } }
    const body = await api.put(
      `${API_BASE_URL}/${id}/invoice-prefix`,
      { prefix },
      {
        withCredentials: true,
      }
    );
    return (body as any).data?.vendorPrefix;
  } catch (error: unknown) {
    console.error("Failed to set vendor prefix:", error);
    throw new Error(
      (error as any).error?.message ||
        "Failed to set vendor prefix"
    );
  }
}
