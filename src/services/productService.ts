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

/**
 * Fetches paginated products.
 * Returns { products, pagination } directly.
 */
export const getProducts = async (params: GetProductsParams = {}) => {
  // api interceptor returns response.data => { success, data: { products, pagination } }
  const body = await api.get(API_BASE_URL, {
    params,
    withCredentials: true,
  });
  return (body as any).data; // { products, pagination }
};

/**
 * Fetches a single product by ID.
 * Returns { product } directly.
 */
export const getProduct = async (id: string) => {
  const body = await api.get(`${API_BASE_URL}/${id}`, {
    withCredentials: true,
  });
  return (body as any).data; // { product }
};

/**
 * Creates a new product.
 * Returns { product } on success.
 */
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

    const body = await api.post(API_BASE_URL, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      withCredentials: true,
    });
    return (body as any).data; // { product }
  } catch (error: unknown) {
    console.error("Failed to create product:", error);
    const errorMessage =
      error &&
      typeof error === "object" &&
      "error" in error &&
      (error as any).error &&
      typeof (error as any).error === "object" &&
      "message" in (error as any).error &&
      typeof (error as any).error.message === "string"
        ? (error as any).error.message
        : "Failed to create product";
    throw new Error(errorMessage);
  }
};

/**
 * Updates an existing product.
 * Returns { product } on success.
 */
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

    const body = await api.put(`${API_BASE_URL}/${id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      withCredentials: true,
    });
    return (body as any).data; // { product }
  } catch (error: unknown) {
    console.error("Failed to update product:", error);
    const errorMessage =
      error &&
      typeof error === "object" &&
      "error" in error &&
      (error as any).error &&
      typeof (error as any).error === "object" &&
      "message" in (error as any).error &&
      typeof (error as any).error.message === "string"
        ? (error as any).error.message
        : "Failed to update product";
    throw new Error(errorMessage);
  }
};

/**
 * Deletes a product.
 * Returns { success, message } on success.
 */
export const deleteProduct = async (id: string) => {
  try {
    const body = await api.delete(`${API_BASE_URL}/${id}`, {
      withCredentials: true,
    });
    return body; // { success, message }
  } catch (error: unknown) {
    console.error("Failed to delete product:", error);
    const errorMessage =
      error &&
      typeof error === "object" &&
      "error" in error &&
      (error as any).error &&
      typeof (error as any).error === "object" &&
      "message" in (error as any).error &&
      typeof (error as any).error.message === "string"
        ? (error as any).error.message
        : "Failed to delete product";
    throw new Error(errorMessage);
  }
};

/**
 * Updates product stock.
 * Returns { product } on success.
 */
export const updateProductStock = async (
  id: string,
  stockData: { quantity: number; type: "increment" | "decrement" }
) => {
  const body = await api.patch(`${API_BASE_URL}/${id}/stock`, stockData, {
    withCredentials: true,
  });
  return (body as any).data; // { product }
};

/**
 * Searches products by query.
 * Returns { products, count } on success.
 */
export const searchProducts = async (query: string) => {
  const body = await api.get(`${API_BASE_URL}/search`, {
    params: { q: query },
    withCredentials: true,
  });
  return (body as any).data; // { products, count }
};

/**
 * Fetches distinct product categories.
 * Returns { categories } on success.
 */
export const getProductCategories = async () => {
  const body = await api.get(`${API_BASE_URL}/categories`, {
    withCredentials: true,
  });
  return (body as any).data; // { categories }
};

/**
 * Checks if a product is linked to any orders.
 * Returns { hasLinkedOrders, linkedOrdersCount, linkedOrders } on success.
 */
export const checkProductOrderLinkage = async (id: string) => {
  const body = await api.get(`${API_BASE_URL}/${id}/order-linkage`, {
    withCredentials: true,
  });
  return (body as any).data;
};

/**
 * Archives a product.
 * Returns { product } on success.
 */
export const archiveProduct = async (id: string) => {
  const body = await api.patch(
    `${API_BASE_URL}/${id}/archive`,
    {},
    {
      withCredentials: true,
    }
  );
  return (body as any).data; // { product }
};

/**
 * Unarchives a product.
 * Returns { product } on success.
 */
export const unarchiveProduct = async (id: string) => {
  const body = await api.patch(
    `${API_BASE_URL}/${id}/unarchive`,
    {},
    {
      withCredentials: true,
    }
  );
  return (body as any).data; // { product }
};

/**
 * Fetches archived products with pagination.
 * Returns { products, pagination } on success.
 */
export const getArchivedProducts = async (params: GetProductsParams = {}) => {
  const body = await api.get(`${API_BASE_URL}/archived`, {
    params,
    withCredentials: true,
  });
  return (body as any).data; // { products, pagination }
};
