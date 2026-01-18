import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL + "/api/v1",
  headers: {
    'Content-Type': 'application/json',
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

// Response interceptor
// Note: 401 handling is done in AuthContext via checkAuth/refresh flow
// This interceptor unwraps axios response to return response.data directly
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // Return the response data if available, otherwise the full error
    return Promise.reject(error.response?.data || error);
  }
);

export default api;