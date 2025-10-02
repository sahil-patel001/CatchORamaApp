import axios from "axios";
import { Category } from "@/types";

const API_URL = `${import.meta.env.VITE_API_BASE_URL}/categories`;

export const getCategories = async (vendorId?: string): Promise<Category[]> => {
  const url = vendorId ? `${API_URL}?vendorId=${vendorId}` : API_URL;
  const response = await axios.get(url, {
    withCredentials: true,
  });
  return response.data.data;
};

export const createCategory = async (
  categoryData: Omit<Category, "_id">
): Promise<Category> => {
  const response = await axios.post(API_URL, categoryData, {
    withCredentials: true,
  });
  return response.data.data;
};

export const updateCategory = async (
  id: string,
  categoryData: Partial<Omit<Category, "_id">>
): Promise<Category> => {
  const response = await axios.put(`${API_URL}/${id}`, categoryData, {
    withCredentials: true,
  });
  return response.data.data;
};

export const deleteCategory = async (id: string): Promise<void> => {
  await axios.delete(`${API_URL}/${id}`, {
    withCredentials: true,
  });
};
