import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter, useSegments } from 'expo-router';
import * as authService from '../services/auth';
import { getToken, getUserData, clearAuthData, setLogoutCallback } from '../services/api';
import { User, LoginFormData } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginFormData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function useProtectedRoute(user: User | null, isLoading: boolean) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(tabs)' || segments[0] === 'product';
    
    if (!user && inAuthGroup) {
      // Redirect to login if not authenticated and trying to access protected routes
      router.replace('/login');
    } else if (user && segments[0] === 'login') {
      // Redirect to home if authenticated and on login page
      router.replace('/(tabs)');
    }
  }, [user, segments, isLoading]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Set up logout callback for API interceptor
  useEffect(() => {
    setLogoutCallback(() => {
      setUser(null);
      router.replace('/login');
    });
  }, [router]);

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await getToken();
      
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Try to get user data from secure storage first
      const storedUser = await getUserData();
      if (storedUser) {
        setUser(storedUser as User);
      }

      // Verify with server
      const result = await authService.getMe();
      if (result.success && result.user) {
        setUser(result.user);
      } else {
        // Token invalid, clear auth
        await clearAuthData();
        setUser(null);
      }
    } catch (error) {
      await clearAuthData();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const result = await authService.login(data);
      if (result.success && result.user) {
        setUser(result.user);
        return { success: true };
      }
      return { success: false, error: result.error };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
      router.replace('/login');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useProtectedRoute(user, isLoading);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}