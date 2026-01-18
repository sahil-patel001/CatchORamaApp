import api, { setToken, setRefreshToken, setUserData, clearAuthData } from './api';
import { AuthResponse, User, LoginFormData } from '../types';

export const login = async (data: LoginFormData): Promise<{ success: boolean; user?: User; error?: string }> => {
  try {
    const response = await api.post<AuthResponse>('/auth/login', data);
    
    if (response.data.success && response.data.data) {
      const { user, token, refreshToken } = response.data.data;
      
      // Store tokens securely
      await setToken(token);
      await setRefreshToken(refreshToken);
      await setUserData(user);
      
      return { success: true, user };
    }
    
    return { 
      success: false, 
      error: response.data.error?.message || 'Login failed' 
    };
  } catch (error: any) {
    const message = error.response?.data?.error?.message || error.message || 'Login failed';
    return { success: false, error: message };
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