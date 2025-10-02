# Frontend-Backend Integration Guide

This guide explains how to connect your React frontend to the newly created Node.js backend API.

## 🚀 Quick Start

### 1. Start Both Applications

**Option A: Start them separately**
```bash
# Terminal 1 - Start Backend
cd backend
npm install
npm run dev

# Terminal 2 - Start Frontend  
npm run dev
```

**Option B: Start both together**
```bash
# Install all dependencies
npm run install:all

# Start both frontend and backend
npm run dev:full
```

### 2. Verify Backend is Running

Visit `http://localhost:5001/health` - you should see:
```json
{
  "status": "OK",
  "message": "Product Ecosystem API is running",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "v1"
}
```

## 🔧 Frontend Configuration

### 1. Create API Configuration

Create `src/config/api.js`:
```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';

export const apiConfig = {
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
};

export default API_BASE_URL;
```

### 2. Create Environment Variables

Create `.env.local` in your frontend root:
```env
VITE_API_URL=http://localhost:5001/api/v1
```

### 3. Create API Service Layer

Create `src/services/api.js`:
```javascript
import axios from 'axios';
import { apiConfig } from '../config/api.js';

// Create axios instance
const api = axios.create(apiConfig);

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);

export default api;
```

## 🔄 Replace Mock Data with API Calls

### 1. Authentication Service

Create `src/services/authService.js`:
```javascript
import api from './api.js';

export const authService = {
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    if (response.success) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response;
  },

  async register(userData) {
    const response = await api.post('/auth/register', userData);
    if (response.success) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response;
  },

  async logout() {
    await api.post('/auth/logout');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data.user;
  }
};
```

### 2. Update AuthContext

Update `src/contexts/AuthContext.tsx`:
```typescript
import { authService } from '@/services/authService';

// Replace the mock login function with:
const login = async (email: string, password: string): Promise<boolean> => {
  setIsLoading(true);
  
  try {
    const response = await authService.login(email, password);
    setUser(response.data.user);
    setIsLoading(false);
    return true;
  } catch (error) {
    console.error('Login error:', error);
    setIsLoading(false);
    return false;
  }
};

// Update logout function:
const logout = async () => {
  try {
    await authService.logout();
  } catch (error) {
    console.error('Logout error:', error);
  }
  setUser(null);
};
```

### 3. Vendor Service

Create `src/services/vendorService.js`:
```javascript
import api from './api.js';

export const vendorService = {
  async getVendors(params = {}) {
    const response = await api.get('/vendors', { params });
    return response.data;
  },

  async getVendor(id) {
    const response = await api.get(`/vendors/${id}`);
    return response.data.vendor;
  },

  async createVendor(vendorData) {
    const response = await api.post('/vendors', vendorData);
    return response.data.vendor;
  },

  async updateVendor(id, vendorData) {
    const response = await api.put(`/vendors/${id}`, vendorData);
    return response.data.vendor;
  },

  async deleteVendor(id) {
    await api.delete(`/vendors/${id}`);
  },

  async getVendorStats(id) {
    const response = await api.get(`/vendors/${id}/stats`);
    return response.data.stats;
  }
};
```

### 4. Product Service

Create `src/services/productService.js`:
```javascript
import api from './api.js';

export const productService = {
  async getProducts(params = {}) {
    const response = await api.get('/products', { params });
    return response.data;
  },

  async getProduct(id) {
    const response = await api.get(`/products/${id}`);
    return response.data.product;
  },

  async createProduct(productData) {
    const response = await api.post('/products', productData);
    return response.data.product;
  },

  async updateProduct(id, productData) {
    const response = await api.put(`/products/${id}`, productData);
    return response.data.product;
  },

  async deleteProduct(id) {
    await api.delete(`/products/${id}`);
  },

  async updateStock(id, stockData) {
    const response = await api.patch(`/products/${id}/stock`, stockData);
    return response.data.product;
  },

  async getCategories() {
    const response = await api.get('/products/categories');
    return response.data.categories;
  }
};
```

### 5. Order Service

Create `src/services/orderService.js`:
```javascript
import api from './api.js';

export const orderService = {
  async getOrders(params = {}) {
    const response = await api.get('/orders', { params });
    return response.data;
  },

  async getOrder(id) {
    const response = await api.get(`/orders/${id}`);
    return response.data.order;
  },

  async createOrder(orderData) {
    const response = await api.post('/orders', orderData);
    return response.data.order;
  },

  async updateOrder(id, orderData) {
    const response = await api.put(`/orders/${id}`, orderData);
    return response.data.order;
  },

  async updateOrderStatus(id, statusData) {
    const response = await api.patch(`/orders/${id}/status`, statusData);
    return response.data.order;
  },

  async addTracking(id, trackingData) {
    const response = await api.patch(`/orders/${id}/tracking`, trackingData);
    return response.data.order;
  },

  async deleteOrder(id) {
    await api.delete(`/orders/${id}`);
  }
};
```

### 6. Dashboard Service

Create `src/services/dashboardService.js`:
```javascript
import api from './api.js';

export const dashboardService = {
  async getAdminDashboard(period = '30d') {
    const response = await api.get('/dashboard/admin', { 
      params: { period } 
    });
    return response.data;
  },

  async getVendorDashboard(period = '30d') {
    const response = await api.get('/dashboard/vendor', { 
      params: { period } 
    });
    return response.data;
  }
};
```

## 🔄 Update Components to Use Real Data

### 1. Update VendorManagement Component

Replace mock data usage in `src/pages/admin/VendorManagement.tsx`:

```typescript
import { vendorService } from '@/services/vendorService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function VendorManagement() {
  const queryClient = useQueryClient();
  
  // Replace useState with useQuery
  const { data: vendorsData, isLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => vendorService.getVendors()
  });

  // Add mutation for creating vendors
  const createVendorMutation = useMutation({
    mutationFn: vendorService.createVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast({ title: "Vendor created successfully" });
    }
  });

  // Update handlers to use real API calls
  const handleAddVendor = (vendorData) => {
    createVendorMutation.mutate(vendorData);
  };

  // ... rest of component
}
```

### 2. Update Dashboard Components

Replace mock data in dashboard components with real API calls using React Query.

## 🎯 Testing the Integration

### 1. Test Authentication
1. Start both frontend and backend
2. Go to `/login`
3. Use demo credentials: `admin@demo.com` / `admin123`
4. Verify successful login and redirect

### 2. Test Data Operations
1. Navigate to vendor management
2. Try creating, editing, and deleting vendors
3. Check product management functionality
4. Test order creation and status updates

### 3. Test Dashboard
1. Verify admin dashboard shows real statistics
2. Check vendor dashboard displays correct data
3. Ensure charts and analytics work with real data

## 🐛 Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure backend CORS is configured for frontend URL
2. **401 Unauthorized**: Check if JWT token is being sent correctly
3. **Connection Refused**: Verify backend is running on port 5000
4. **Data Not Loading**: Check browser console for API errors

### Debug Steps

1. Check browser Network tab for API calls
2. Verify backend logs for errors
3. Test API endpoints directly with Postman
4. Check environment variables are loaded correctly

## 🚀 Production Deployment

### Environment Variables

**Frontend (.env.production):**
```env
VITE_API_URL=https://your-api-domain.com/api/v1
```

**Backend (.env):**
```env
NODE_ENV=production
MONGODB_URI=mongodb://your-production-db
JWT_SECRET=your-production-secret
FRONTEND_URL=https://your-frontend-domain.com
```

### Build Commands

```bash
# Build frontend
npm run build

# Start backend in production
cd backend
npm start
```

## 📚 Next Steps

1. **Add Error Boundaries**: Implement React error boundaries for better error handling
2. **Add Loading States**: Implement proper loading states throughout the app
3. **Add Offline Support**: Consider adding service workers for offline functionality
4. **Add Real-time Updates**: Implement WebSocket connections for real-time data
5. **Add File Upload**: Implement image upload for products
6. **Add Email Notifications**: Set up email notifications for orders
7. **Add Analytics**: Implement detailed analytics and reporting

## 🔐 Security Considerations

1. **Token Storage**: Consider using httpOnly cookies instead of localStorage
2. **API Rate Limiting**: Backend already includes rate limiting
3. **Input Validation**: Both frontend and backend validate all inputs
4. **HTTPS**: Always use HTTPS in production
5. **Environment Variables**: Never commit sensitive data to version control

Your frontend is now fully connected to a real, production-ready backend API! 🎉
