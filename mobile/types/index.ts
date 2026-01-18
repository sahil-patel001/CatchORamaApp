// User types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'vendor';
  vendorId?: string;
  businessName?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: User;
    token: string;
    refreshToken: string;
  };
  message?: string;
  error?: {
    message: string;
  };
}

// Product types
export interface ProductImage {
  url: string;
  alt?: string;
  isPrimary?: boolean;
}

export interface Product {
  _id: string;
  vendorId: string;
  name: string;
  description?: string;
  price: number;
  discountPrice?: number;
  stock: number;
  category: string;
  subcategory?: string;
  images: ProductImage[];
  status: 'active' | 'inactive' | 'draft' | 'out_of_stock' | 'archived';
  length?: number;
  breadth?: number;
  height?: number;
  weight?: number;
  inventory?: {
    sku?: string;
    lowStockThreshold?: number;
    trackInventory?: boolean;
  };
  vendor?: {
    businessName: string;
    vendorPrefix?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ProductListResponse {
  success: boolean;
  data: {
    products: Product[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface ProductResponse {
  success: boolean;
  data: {
    product: Product;
  };
  message?: string;
  warnings?: Array<{
    type: string;
    message: string;
  }>;
}

// Form types
export interface ProductFormData {
  name: string;
  price: string;
  discountPrice?: string;
  stock: string;
  category: string;
  description?: string;
  length?: string;
  breadth?: string;
  height?: string;
  weight?: string;
  lowStockThreshold?: string;
  vendorId?: string;
  /**
   * JSON string for arbitrary custom fields.
   * Sent as multipart field `customFields` on create/update.
   */
  customFields?: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

// API Error
export interface ApiError {
  success: false;
  error: {
    message: string;
    code?: string;
  };
}