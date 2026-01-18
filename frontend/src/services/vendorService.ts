import { Vendor } from "@/types";
import api from "./api";

const API_BASE_URL = `/vendors`;

// Get the current user's vendor profile
export async function getVendorProfile(): Promise<Vendor> {
  try {
    // Directly fetch vendor profile - the backend will handle auth and role checking
    const vendorBody = await api.get(`${API_BASE_URL}/profile`, {
      withCredentials: true,
    });
    return (vendorBody as any).data.vendor;
  } catch (error: any) {
    console.error("Error fetching vendor profile:", error);
    
    // Provide more specific error messages
    if (error.response?.status === 401) {
      throw new Error("Authentication required. Please log in again.");
    } else if (error.response?.status === 403) {
      throw new Error("Access denied. Only vendors can access this profile.");
    } else if (error.response?.status === 404) {
      throw new Error("Vendor profile not found. Please contact support.");
    }
    
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

// Update current user's vendor profile
export async function updateVendorProfile(data: {
  businessName?: string;
  email?: string;
  phone?: string;
  address?: string;
}): Promise<Vendor> {
  try {
    // First get the vendor profile to get the ID
    const profile = await getVendorProfile();
    
    // Then update using the vendor ID
    const updateData: any = {};
    if (data.businessName) updateData.businessName = data.businessName;
    if (data.email) updateData.email = data.email;
    if (data.phone) updateData.phone = data.phone;
    if (data.address) updateData.address = data.address;

    const body = await api.put(`${API_BASE_URL}/${profile._id}`, updateData, {
      withCredentials: true,
    });
    return (body as any).data?.vendor;
  } catch (error: any) {
    console.error("Failed to update vendor profile:", error);
    
    if (error.response?.status === 401) {
      throw new Error("Authentication required. Please log in again.");
    } else if (error.response?.status === 403) {
      throw new Error("You don't have permission to update this profile.");
    } else if (error.response?.status === 404) {
      throw new Error("Vendor profile not found.");
    }
    
    throw new Error(
      error.response?.data?.error?.message || "Failed to update vendor profile"
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
