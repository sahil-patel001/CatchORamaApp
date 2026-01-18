import api from './api';
import { Product, ProductListResponse, ProductResponse, ProductFormData } from '../types';
import * as FileSystem from 'expo-file-system';

interface GetProductsParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
  vendorId?: string;
}

export const getProducts = async (params: GetProductsParams = {}): Promise<ProductListResponse> => {
  const response = await api.get<ProductListResponse>('/products', { params });
  return response.data;
};

export const getProduct = async (id: string): Promise<ProductResponse> => {
  const response = await api.get<ProductResponse>(`/products/${id}`);
  return response.data;
};

export const createProduct = async (
  data: ProductFormData,
  imageUri?: string
): Promise<ProductResponse> => {
  const formData = new FormData();
  
  // Add all form fields
  formData.append('name', data.name);
  formData.append('price', data.price);
  formData.append('stock', data.stock);
  formData.append('category', data.category);
  
  if (data.discountPrice) formData.append('discountPrice', data.discountPrice);
  if (data.description) formData.append('description', data.description);
  if (data.length) formData.append('length', data.length);
  if (data.breadth) formData.append('breadth', data.breadth);
  if (data.height) formData.append('height', data.height);
  if (data.weight) formData.append('weight', data.weight);
  if (data.lowStockThreshold) formData.append('lowStockThreshold', data.lowStockThreshold);
  if (data.vendorId) formData.append('vendorId', data.vendorId);
  
  // Add image if provided
  if (imageUri) {
    const filename = imageUri.split('/').pop() || 'image.jpg';
    const match = /\.([\w]+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    formData.append('image', {
      uri: imageUri,
      name: filename,
      type,
    } as any);
  }
  
  const response = await api.post<ProductResponse>('/products', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

export const updateProduct = async (
  id: string,
  data: Partial<ProductFormData>,
  imageUri?: string
): Promise<ProductResponse> => {
  const formData = new FormData();
  
  // Add all form fields that are provided
  if (data.name) formData.append('name', data.name);
  if (data.price) formData.append('price', data.price);
  if (data.stock) formData.append('stock', data.stock);
  if (data.category) formData.append('category', data.category);
  if (data.discountPrice !== undefined) formData.append('discountPrice', data.discountPrice || '');
  if (data.description !== undefined) formData.append('description', data.description || '');
  if (data.length) formData.append('length', data.length);
  if (data.breadth) formData.append('breadth', data.breadth);
  if (data.height) formData.append('height', data.height);
  if (data.weight) formData.append('weight', data.weight);
  if (data.lowStockThreshold) formData.append('lowStockThreshold', data.lowStockThreshold);
  
  // Add image if provided
  if (imageUri) {
    const filename = imageUri.split('/').pop() || 'image.jpg';
    const match = /\.([\w]+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    formData.append('image', {
      uri: imageUri,
      name: filename,
      type,
    } as any);
  }
  
  const response = await api.put<ProductResponse>(`/products/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

export const getCategories = async (): Promise<{ categories: string[] }> => {
  const response = await api.get<{ success: boolean; data: { categories: string[] } }>('/products/categories');
  return response.data.data;
};