import axios from "axios";
import { Product } from "../types";
import api from "./api";

const API_BASE_URL = `/products`;

interface GetProductsParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  category?: string;
  minPrice?: number;
  maxPrice?: number;
}

export const getProducts = async (params: GetProductsParams = {}) => {
  const response = await api.get(API_BASE_URL, {
    params,
    withCredentials: true,
  });
  return response.data;
};

export const getProduct = async (id: string) => {
  const response = await api.get(`${API_BASE_URL}/${id}`, {
    withCredentials: true,
  });
  return response.data;
};

export const createProduct = async (
  productData: Partial<Product>,
  imageFile: File | null
) => {
  try {
    const formData = new FormData();
    Object.keys(productData).forEach((key) => {
      const value = productData[key as keyof typeof productData];
      if (value !== null && value !== undefined) {
        formData.append(key, String(value));
      }
    });

    if (imageFile) {
      formData.append("image", imageFile);
    }

    const response = await api.post(API_BASE_URL, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      withCredentials: true,
    });
    return response.data;
  } catch (error: unknown) {
    console.error("Failed to create product:", error);
    const errorMessage =
      error &&
      typeof error === "object" &&
      "response" in error &&
      error.response &&
      typeof error.response === "object" &&
      "data" in error.response &&
      error.response.data &&
      typeof error.response.data === "object" &&
      "error" in error.response.data &&
      error.response.data.error &&
      typeof error.response.data.error === "object" &&
      "message" in error.response.data.error &&
      typeof error.response.data.error.message === "string"
        ? error.response.data.error.message
        : "Failed to create product";
    throw new Error(errorMessage);
  }
};

export const updateProduct = async (
  id: string,
  productData: Partial<Product>,
  imageFile: File | null
) => {
  try {
    const formData = new FormData();
    Object.keys(productData).forEach((key) => {
      const value = productData[key as keyof typeof productData];
      if (
        value !== null &&
        value !== undefined &&
        key !== "_id" &&
        key !== "id"
      ) {
        formData.append(key, String(value));
      }
    });

    if (imageFile) {
      formData.append("image", imageFile);
    }

    const response = await api.put(`${API_BASE_URL}/${id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      withCredentials: true,
    });
    return response.data;
  } catch (error: unknown) {
    console.error("Failed to update product:", error);
    const errorMessage =
      error &&
      typeof error === "object" &&
      "response" in error &&
      error.response &&
      typeof error.response === "object" &&
      "data" in error.response &&
      error.response.data &&
      typeof error.response.data === "object" &&
      "error" in error.response.data &&
      error.response.data.error &&
      typeof error.response.data.error === "object" &&
      "message" in error.response.data.error &&
      typeof error.response.data.error.message === "string"
        ? error.response.data.error.message
        : "Failed to update product";
    throw new Error(errorMessage);
  }
};

export const deleteProduct = async (id: string) => {
  try {
    const response = await api.delete(`${API_BASE_URL}/${id}`, {
      withCredentials: true,
    });
    return response.data;
  } catch (error: unknown) {
    console.error("Failed to delete product:", error);
    const errorMessage =
      error &&
      typeof error === "object" &&
      "response" in error &&
      error.response &&
      typeof error.response === "object" &&
      "data" in error.response &&
      error.response.data &&
      typeof error.response.data === "object" &&
      "error" in error.response.data &&
      error.response.data.error &&
      typeof error.response.data.error === "object" &&
      "message" in error.response.data.error &&
      typeof error.response.data.error.message === "string"
        ? error.response.data.error.message
        : "Failed to delete product";
    throw new Error(errorMessage);
  }
};

export const updateProductStock = async (
  id: string,
  stockData: { quantity: number; type: "increment" | "decrement" }
) => {
  const response = await api.patch(`${API_BASE_URL}/${id}/stock`, stockData, {
    withCredentials: true,
  });
  return response.data;
};

export const searchProducts = async (query: string) => {
  const response = await api.get(`${API_BASE_URL}/search`, {
    params: { q: query },
    withCredentials: true,
  });
  return response.data;
};

export const getProductCategories = async () => {
  const response = await api.get(`${API_BASE_URL}/categories`, {
    withCredentials: true,
  });
  return response.data;
};

export const checkProductOrderLinkage = async (id: string) => {
  const response = await api.get(`${API_BASE_URL}/${id}/order-linkage`, {
    withCredentials: true,
  });
  return response.data;
};

export const archiveProduct = async (id: string) => {
  const response = await api.patch(
    `${API_BASE_URL}/${id}/archive`,
    {},
    {
      withCredentials: true,
    }
  );
  return response.data;
};

export const unarchiveProduct = async (id: string) => {
  const response = await api.patch(
    `${API_BASE_URL}/${id}/unarchive`,
    {},
    {
      withCredentials: true,
    }
  );
  return response.data;
};

export const getArchivedProducts = async (params: GetProductsParams = {}) => {
  const response = await api.get(`${API_BASE_URL}/archived`, {
    params,
    withCredentials: true,
  });
  return response.data;
};
