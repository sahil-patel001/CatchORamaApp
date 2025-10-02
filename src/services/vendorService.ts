import axios from "axios";
import { Vendor } from "@/types";

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/vendors`;

// Get the current user's vendor profile
export async function getVendorProfile(): Promise<Vendor> {
  try {
    const response = await axios.get(
      `${import.meta.env.VITE_API_BASE_URL}/auth/me`,
      {
        withCredentials: true,
      }
    );

    // If the user has a vendor profile, fetch it
    if (response.data.data.user.role === "vendor") {
      const vendorResponse = await axios.get(`${API_BASE_URL}/profile`, {
        withCredentials: true,
      });
      return vendorResponse.data.data.vendor;
    }

    throw new Error("User is not a vendor");
  } catch (error) {
    console.error("Error fetching vendor profile:", error);
    throw error;
  }
}

export async function fetchVendors(
  query?: string,
  page: number = 1,
  limit: number = 10,
  status: string = "all"
): Promise<Vendor[]> {
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

    const response = await axios.get(API_BASE_URL, {
      params,
      withCredentials: true,
    });

    // Backend returns { success: true, data: { vendors: [...] } }
    return response.data.data?.vendors || [];
  } catch (error: unknown) {
    console.error("Failed to fetch vendors:", error);
    throw new Error(
      (error as any).response?.data?.error?.message || "Failed to fetch vendors"
    );
  }
}

export async function fetchVendorById(id: string): Promise<Vendor> {
  try {
    const response = await axios.get(`${API_BASE_URL}/${id}`, {
      withCredentials: true,
    });
    return response.data.data?.vendor;
  } catch (error: unknown) {
    console.error("Failed to fetch vendor:", error);
    throw new Error(
      (error as any).response?.data?.error?.message || "Failed to fetch vendor"
    );
  }
}

export async function addVendor(data: Partial<Vendor>): Promise<Vendor> {
  try {
    const response = await axios.post(API_BASE_URL, data, {
      withCredentials: true,
    });
    return response.data.data?.vendor;
  } catch (error: unknown) {
    console.error("Failed to add vendor:", error);
    throw new Error(
      (error as any).response?.data?.error?.message || "Failed to add vendor"
    );
  }
}

export async function updateVendor(
  id: string,
  data: Partial<Vendor>
): Promise<Vendor> {
  try {
    const response = await axios.put(`${API_BASE_URL}/${id}`, data, {
      withCredentials: true,
    });
    return response.data.data?.vendor;
  } catch (error: unknown) {
    console.error("Failed to update vendor:", error);
    throw new Error(
      (error as any).response?.data?.error?.message || "Failed to update vendor"
    );
  }
}

export async function deleteVendor(id: string): Promise<void> {
  try {
    await axios.delete(`${API_BASE_URL}/${id}`, {
      withCredentials: true,
    });
  } catch (error: unknown) {
    console.error("Failed to delete vendor:", error);
    throw new Error(
      (error as any).response?.data?.error?.message || "Failed to delete vendor"
    );
  }
}

export async function getVendorPrefix(id: string): Promise<string> {
  try {
    const response = await axios.get(`${API_BASE_URL}/${id}/invoice-prefix`, {
      withCredentials: true,
    });
    return response.data.data?.vendorPrefix || "VD01";
  } catch (error: unknown) {
    console.error("Failed to fetch vendor prefix:", error);
    throw new Error(
      (error as any).response?.data?.error?.message ||
        "Failed to fetch vendor prefix"
    );
  }
}

export async function setVendorPrefix(
  id: string,
  prefix: string
): Promise<string> {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/${id}/invoice-prefix`,
      { prefix },
      {
        withCredentials: true,
      }
    );
    return response.data.data?.vendorPrefix;
  } catch (error: unknown) {
    console.error("Failed to set vendor prefix:", error);
    throw new Error(
      (error as any).response?.data?.error?.message ||
        "Failed to set vendor prefix"
    );
  }
}
