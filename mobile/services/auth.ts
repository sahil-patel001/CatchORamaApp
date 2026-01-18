import api, { setToken, setRefreshToken, setUserData, clearAuthData } from './api';
import { AuthResponse, User, LoginFormData } from '../types';

export const login = async (data: LoginFormData): Promise<{ success: boolean; user?: User; error?: string }> => {
  console.log('[Auth] Attempting login for:', data.email);
  
  try {
    const response = await api.post<AuthResponse>('/auth/login', data);
    console.log('[Auth] Login response success:', response.data.success);
    
    if (response.data.success && response.data.data) {
      const responseData = response.data.data;
      
      // Extract user data - handle both nested token and separate token cases
      const user: User = {
        id: responseData.user.id,
        name: responseData.user.name,
        email: responseData.user.email,
        role: responseData.user.role,
        vendorId: responseData.user.vendorId,
        businessName: responseData.user.businessName,
        createdAt: responseData.user.createdAt,
        lastLogin: responseData.user.lastLogin,
      };
      
      // Get tokens - they could be at root level of data
      const token = responseData.token;
      const refreshToken = responseData.refreshToken;
      
      if (!token || !refreshToken) {
        console.log('[Auth] Missing tokens in response');
        return { success: false, error: 'Invalid response from server' };
      }
      
      // Store tokens securely
      await setToken(token);
      await setRefreshToken(refreshToken);
      await setUserData(user);
      
      console.log('[Auth] Login successful for user:', user.email);
      return { success: true, user };
    }
    
    const errorMsg = response.data.error?.message || 'Login failed';
    console.log('[Auth] Login failed:', errorMsg);
    return { 
      success: false, 
      error: errorMsg
    };
  } catch (error: any) {
    console.log('[Auth] Login error:', error.message);
    
    // Handle network errors
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      return { success: false, error: 'Network error. Please check your internet connection.' };
    }
    
    // Handle API error responses
    if (error.response?.data?.error?.message) {
      return { success: false, error: error.response.data.error.message };
    }
    
    return { success: false, error: error.message || 'Login failed' };
  }
};

export const logout = async (): Promise<void> => {
  try {
    await api.post('/auth/logout');
  } catch (error) {
    // Ignore errors on logout
  } finally {
    await clearAuthData();
  }
};

export const getMe = async (): Promise<{ success: boolean; user?: User; error?: string }> => {
  try {
    const response = await api.get<AuthResponse>('/auth/me');
    
    if (response.data.success && response.data.data) {
      return { success: true, user: response.data.data.user };
    }
    
    return { success: false, error: 'Failed to get user data' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};