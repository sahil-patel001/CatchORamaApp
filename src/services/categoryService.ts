import axios from "axios";
import api from "./api";
import { Category } from "@/types";

const API_URL = `/categories`;

export const getCategories = async (vendorId?: string): Promise<Category[]> => {
  const url = vendorId ? `${API_URL}?vendorId=${vendorId}` : API_URL;
  const response = await api.get(url, {
    withCredentials: true,
  });
  return response.data.data;
};

export const createCategory = async (
  categoryData: Omit<Category, "_id">
): Promise<Category> => {
  const response = await api.post(API_URL, categoryData, {
    withCredentials: true,
  });
  return response.data.data;
};

export const updateCategory = async (
  id: string,
  categoryData: Partial<Omit<Category, "_id">>
): Promise<Category> => {
  const response = await api.put(`${API_URL}/${id}`, categoryData, {
    withCredentials: true,
  });
  return response.data.data;
};

export const deleteCategory = async (id: string): Promise<void> => {
  await api.delete(`${API_URL}/${id}`, {
    withCredentials: true,
  });
};
