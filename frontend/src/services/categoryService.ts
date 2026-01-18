import api from "./api";
import { Category } from "@/types";

const API_URL = `/categories`;

interface CategoriesResponse {
  categories: Category[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/**
 * Fetches all categories with pagination support.
 * Returns categories and pagination info.
 */
export const getCategories = async (
  vendorId?: string,
  page: number = 1,
  limit: number = 10,
  search?: string
): Promise<CategoriesResponse> => {
  const params = new URLSearchParams();
  
  if (typeof vendorId === "string" && vendorId.trim() !== "") {
    params.append("vendorId", vendorId);
  }
  
  params.append("page", page.toString());
  params.append("limit", limit.toString());
  
  if (search && search.trim() !== "") {
    params.append("search", search);
  }

  const url = `${API_URL}?${params.toString()}`;
  
  const body = await api.get(url, {
    withCredentials: true,
  });
  
  // Backend returns { success, data: Category[], pagination: {...} }
  return {
    categories: (body as any).data,
    pagination: (body as any).pagination,
  };
};

/**
 * Creates a new category.
 * Returns the created Category.
 */
export const createCategory = async (
  categoryData: Omit<Category, "_id">
): Promise<Category> => {
  const body = await api.post(API_URL, categoryData, {
    withCredentials: true,
  });
  return (body as any).data; // Category
};

/**
 * Updates an existing category.
 * Returns the updated Category.
 */
export const updateCategory = async (
  id: string,
  categoryData: Partial<Omit<Category, "_id">>
): Promise<Category> => {
  const body = await api.put(`${API_URL}/${id}`, categoryData, {
    withCredentials: true,
  });
  return (body as any).data; // Category
};

/**
 * Deletes a category.
 */
export const deleteCategory = async (id: string): Promise<void> => {
  await api.delete(`${API_URL}/${id}`, {
    withCredentials: true,
  });
};
