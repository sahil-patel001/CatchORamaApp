import api from './api';
import {
  Product,
  ProductListResponse,
  ProductResponse,
  ProductFormData,
  DeleteProductResponse,
} from '../types';
import { resolveImageUrl } from './images';

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value);

const guessImageMimeType = (filename: string): string => {
  const match = /\.([\w]+)$/.exec(filename.toLowerCase());
  const ext = match?.[1];
  if (!ext) return 'image/jpeg';
  if (ext === 'jpg') return 'image/jpeg';
  if (ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'heic') return 'image/heic';
  if (ext === 'heif') return 'image/heif';
  return `image/${ext}`;
};

const appendIfDefined = (formData: FormData, key: string, value: unknown) => {
  if (value === undefined || value === null) return;

  // Allow binary payloads to be appended directly.
  const isBlob =
    typeof Blob !== 'undefined' && value instanceof Blob;
  const isFile =
    typeof File !== 'undefined' && value instanceof File;
  if (isBlob || isFile) {
    formData.append(key, value as any);
    return;
  }

  // Convert primitives to strings; stringify objects/arrays to preserve structure.
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    formData.append(key, String(value));
    return;
  }

  if (typeof value === 'object') {
    formData.append(key, JSON.stringify(value));
    return;
  }

  formData.append(key, String(value));
};

const normalizeProductImages = (product: any): any => {
  if (!product || typeof product !== 'object') return product;

  // If backend returns `image` instead of `images`, normalize it.
  if (!Array.isArray(product.images) && typeof product.image === 'string') {
    const resolved = resolveImageUrl(product.image) ?? product.image;
    product.images = [{ url: resolved, isPrimary: true }];
    return product;
  }

  if (!Array.isArray(product.images)) return product;

  product.images = product.images
    .map((img: any, idx: number) => {
      if (typeof img === 'string') {
        const resolved = resolveImageUrl(img) ?? img;
        return { url: resolved, isPrimary: idx === 0 };
      }

      if (!img || typeof img !== 'object') return img;

      const rawUrl =
        (typeof img.url === 'string' && img.url) ||
        (typeof img.path === 'string' && img.path) ||
        (typeof img.uri === 'string' && img.uri) ||
        '';

      const resolved = resolveImageUrl(rawUrl) ?? rawUrl;
      return { ...img, url: resolved };
    })
    .filter(Boolean);

  return product;
};

const normalizeProductResponse = <T extends { data?: any }>(payload: T): T => {
  // Clone the response payload (and `payload.data`) before normalizing so callers
  // don’t observe mutations from this function.
  if (!payload || typeof payload !== 'object') return payload;

  const cloned: any = { ...(payload as any) };
  if (cloned.data && typeof cloned.data === 'object' && !Array.isArray(cloned.data)) {
    cloned.data = { ...cloned.data };
  }

  // list response: { data: { products: [...] } }
  if (cloned.data?.products && Array.isArray(cloned.data.products)) {
    cloned.data.products = cloned.data.products.map((p: any) =>
      normalizeProductImages(p && typeof p === 'object' ? { ...p } : p)
    );
  }

  // single response: { data: { product: {...} } }
  if (cloned.data?.product && typeof cloned.data.product === 'object') {
    cloned.data.product = normalizeProductImages({ ...cloned.data.product });
  }

  return cloned;
};

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
  return normalizeProductResponse(response.data);
};

export const getProduct = async (id: string): Promise<ProductResponse> => {
  const response = await api.get<ProductResponse>(`/products/${id}`);
  return normalizeProductResponse(response.data);
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
  
  appendIfDefined(formData, 'discountPrice', data.discountPrice);
  appendIfDefined(formData, 'description', data.description);
  appendIfDefined(formData, 'lowStockThreshold', data.lowStockThreshold);
  appendIfDefined(formData, 'length', data.length);
  appendIfDefined(formData, 'breadth', data.breadth);
  appendIfDefined(formData, 'height', data.height);
  appendIfDefined(formData, 'weight', data.weight);
  // Avoid sending empty vendorId which backend will reject.
  if (typeof data.vendorId === 'string') {
    const trimmed = data.vendorId.trim();
    if (trimmed.length > 0) formData.append('vendorId', trimmed);
  }
  appendIfDefined(formData, 'customFields', data.customFields);
  
  // Add image if provided
  if (imageUri) {
    if (isHttpUrl(imageUri)) {
      // Backend supports `image` as URL string too.
      formData.append('image', imageUri);
    } else {
      const filename = imageUri.split('/').pop() || 'image.jpg';
      const type = guessImageMimeType(filename);

      formData.append('image', {
        uri: imageUri,
        name: filename,
        type,
      } as any);
    }
  }
  
  const response = await api.post<ProductResponse>('/products', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return normalizeProductResponse(response.data);
};

export const updateProduct = async (
  id: string,
  data: Partial<ProductFormData>,
  imageUri?: string
): Promise<ProductResponse> => {
  const formData = new FormData();
  
  // Add all form fields that are provided
  appendIfDefined(formData, 'name', data.name);
  appendIfDefined(formData, 'price', data.price);
  appendIfDefined(formData, 'stock', data.stock);
  appendIfDefined(formData, 'category', data.category);

  // Keep explicit clearing behavior for optional string fields.
  if (data.discountPrice !== undefined) formData.append('discountPrice', data.discountPrice ?? '');
  if (data.description !== undefined) formData.append('description', data.description ?? '');
  if (data.customFields !== undefined) formData.append('customFields', data.customFields ?? '');

  appendIfDefined(formData, 'lowStockThreshold', data.lowStockThreshold);
  appendIfDefined(formData, 'length', data.length);
  appendIfDefined(formData, 'breadth', data.breadth);
  appendIfDefined(formData, 'height', data.height);
  appendIfDefined(formData, 'weight', data.weight);
  
  // Add image if provided
  if (imageUri) {
    if (isHttpUrl(imageUri)) {
      formData.append('image', imageUri);
    } else {
      const filename = imageUri.split('/').pop() || 'image.jpg';
      const type = guessImageMimeType(filename);

      formData.append('image', {
        uri: imageUri,
        name: filename,
        type,
      } as any);
    }
  }
  
  const response = await api.put<ProductResponse>(`/products/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return normalizeProductResponse(response.data);
};

export const deleteProduct = async (id: string): Promise<DeleteProductResponse> => {
  const response = await api.delete<DeleteProductResponse>(`/products/${id}`);
  return response.data;
};

export const getCategories = async (): Promise<{ categories: string[] }> => {
  // Backend returns full category objects from `/categories`; map to names for UI dropdown.
  const response = await api.get<{
    success: boolean;
    data: Array<{ _id: string; name: string }>;
    pagination?: { page: number; limit: number; total: number; pages: number };
  }>('/categories');

  const names = (response.data.data || [])
    .map((c) => c?.name)
    .filter((name): name is string => typeof name === 'string' && name.trim().length > 0);

  // Ensure uniqueness + stable order
  const categories = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));

  return { categories };
};