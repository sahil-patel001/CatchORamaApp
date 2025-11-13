import axios from 'axios';
import { logout } from './authService';
import { useAuth } from '@/contexts/AuthContext';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL + "/api/v1",
  headers: {
    'Content-Type': 'application/json',
    withCredentials: true,                
  },
});

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
      try {
        const { logout } = useAuth();
        logout();
      }
      finally {
        // Handle unauthorized - redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error.response?.data || error);
  }
);

export default api;