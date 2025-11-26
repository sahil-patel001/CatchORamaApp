import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { User } from "@/types";
import * as authService from "@/services/authService";

interface AuthContextType {
  user: User | null;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  signup: (
    name: string,
    email: string,
    password: string,
    role?: string,
    businessName?: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<{ success: boolean; error?: string } | void>;
  changePassword: (
    currentPassword: string | undefined,
    newPassword: string
  ) => Promise<{ success: boolean; error?: string }>;
  getPasswordStatus: () => Promise<{
    hasPassword: boolean;
    isOAuthUser: boolean;
  } | null>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isAuthChecked = useRef(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper to parse JWT payload
  const parseJwt = (token: string | null) => {
    if (!token) return {};
    try {
      return JSON.parse(atob(token.split(".")[1]));
    } catch {
      return {};
    }
  };

  // Stop the token refresh timer
  const stopTokenRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  // Reset auth context (clear user, tokens, timer)
  const resetAuthContext = useCallback(() => {
    setUser(null);
    setIsLoading(false);
    stopTokenRefreshTimer();
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  }, [stopTokenRefreshTimer]);

  // Refresh function - defined early so startTokenRefreshTimer can reference it
  const refreshTokens = useCallback(async (): Promise<{ success: boolean; error?: string } | void> => {
    const storedRefreshToken = localStorage.getItem("refreshToken");
    if (!storedRefreshToken) {
      resetAuthContext();
      return { success: false, error: "No refresh token available" };
    }

    try {
      const res = await authService.getRefresh();
      if (res.success && res.data?.user && res.data?.token && res.data?.refreshToken) {
        setUser(res.data.user);
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('refreshToken', res.data.refreshToken);
        setIsLoading(false);
        // Schedule next refresh
        const decoded = parseJwt(res.data.token);
        if (decoded.exp) {
          const expiresIn = decoded.exp * 1000 - Date.now() - 60000; // refresh 1 min early
          if (expiresIn > 0) {
            refreshTimerRef.current = setTimeout(() => refreshTokens(), expiresIn);
          }
        }
        return { success: true };
      } else {
        resetAuthContext();
        return { success: false, error: res.message || "Session expired!" };
      }
    } catch {
      resetAuthContext();
      return { success: false, error: "Failed to refresh session" };
    }
  }, [resetAuthContext]);

  // Start the token refresh timer based on current token expiry
  const startTokenRefreshTimer = useCallback(() => {
    stopTokenRefreshTimer();
    const token = localStorage.getItem("token");
    const decoded = parseJwt(token);
    if (decoded.exp) {
      const expiresIn = decoded.exp * 1000 - Date.now() - 60000; // refresh 1 min early
      if (expiresIn > 0) {
        refreshTimerRef.current = setTimeout(() => refreshTokens(), expiresIn);
      }
    }
  }, [stopTokenRefreshTimer, refreshTokens]);

  // Set auth context with guards for missing/invalid tokens
  const setAuthContext = useCallback((data: { user: User; token: string; refreshToken: string }) => {
    if (!data.user || !data.token || !data.refreshToken) {
      console.warn("setAuthContext called with incomplete data");
      return;
    }
    setUser(data.user);
    localStorage.setItem('token', data.token);
    localStorage.setItem('refreshToken', data.refreshToken);
    setIsLoading(false);
    startTokenRefreshTimer();
  }, [startTokenRefreshTimer]);

  // Check auth on mount - try /auth/me, if it fails try refresh once before logging out
  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem("token");
    const storedRefreshToken = localStorage.getItem("refreshToken");

    // No tokens at all - not authenticated
    if (!token && !storedRefreshToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    isAuthChecked.current = true;

    try {
      const res = await authService.getMe();
      if (res.success && res.data?.user) {
        setUser(res.data.user);
        setIsLoading(false);
        startTokenRefreshTimer();
        return;
      }
      throw new Error("Invalid session");
    } catch {
      // /auth/me failed - try refresh if we have a refresh token
      if (storedRefreshToken) {
        const refreshResult = await refreshTokens();
        if (refreshResult?.success) {
          return; // Successfully refreshed
        }
      }
      // Refresh failed or no refresh token - clear auth
      resetAuthContext();
    }
  }, [startTokenRefreshTimer, refreshTokens, resetAuthContext]);

  useEffect(() => {
    // On mount, check if user is authenticated
    if (isAuthChecked.current) return;
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await authService.login(email, password);
      if (res.success && res.data?.user && res.data?.token && res.data?.refreshToken) {
        setAuthContext(res.data);
        return { success: true };
      } else {
        resetAuthContext();
        return { success: false, error: res.message || "Login failed" };
      }
    } catch (err: unknown) {
      resetAuthContext();
      let errorMsg = "Login failed";
      if (
        err &&
        typeof err === "object" &&
        "response" in err &&
        err.response &&
        typeof err.response === "object" &&
        "data" in err.response &&
        err.response.data &&
        typeof err.response.data === "object" &&
        "error" in err.response.data &&
        err.response.data.error &&
        typeof err.response.data.error === "object" &&
        "message" in err.response.data.error
      ) {
        errorMsg =
          (err.response.data.error as { message?: string }).message || errorMsg;
      }
      return { success: false, error: errorMsg };
    }
  }, [setAuthContext, resetAuthContext]);

  const signup = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      role: string = "vendor",
      businessName?: string
    ) => {
      setIsLoading(true);
      try {
        const res = await authService.signup(
          name,
          email,
          password,
          role,
          businessName
        );
        if (res.success && res.data?.user && res.data?.token && res.data?.refreshToken) {
          setAuthContext(res.data);
          return { success: true };
        } else {
          resetAuthContext();
          return { success: false, error: res.message || "Signup failed" };
        }
      } catch (err: unknown) {
        resetAuthContext();
        let errorMsg = "Signup failed";
        if (
          err &&
          typeof err === "object" &&
          "response" in err &&
          err.response &&
          typeof err.response === "object" &&
          "data" in err.response &&
          err.response.data &&
          typeof err.response.data === "object" &&
          "error" in err.response.data &&
          err.response.data.error &&
          typeof err.response.data.error === "object" &&
          "message" in err.response.data.error
        ) {
          errorMsg =
            (err.response.data.error as { message?: string }).message ||
            errorMsg;
        }
        return { success: false, error: errorMsg };
      }
    },
    [setAuthContext, resetAuthContext]
  );
  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authService.logout();
    } catch {
      // Ignore errors on logout
    } finally {
      resetAuthContext();
    }
  }, [resetAuthContext]);

  // Expose refresh function (uses refreshTokens internally)
  const refresh = refreshTokens;

  const changePassword = useCallback(
    async (currentPassword: string | undefined, newPassword: string) => {
      setIsLoading(true);
      try {
        await authService.changePassword(currentPassword, newPassword);
        setIsLoading(false);
        return { success: true };
      } catch (err: unknown) {
        setIsLoading(false);
        let errorMsg = "Password change failed";
        if (
          err &&
          typeof err === "object" &&
          "response" in err &&
          err.response &&
          typeof err.response === "object" &&
          "data" in err.response &&
          err.response.data &&
          typeof err.response.data === "object" &&
          "error" in err.response.data &&
          err.response.data.error &&
          typeof err.response.data.error === "object" &&
          "message" in err.response.data.error
        ) {
          errorMsg =
            (err.response.data.error as { message?: string }).message ||
            errorMsg;
        }
        return { success: false, error: errorMsg };
      }
    },
    []
  );

  const getPasswordStatus = useCallback(async () => {
    try {
      const res = await authService.getPasswordStatus();
      if (res.success) {
        return {
          hasPassword: res.data.hasPassword,
          isOAuthUser: res.data.isOAuthUser,
        };
      }
      return null;
    } catch (error) {
      console.error("Failed to get password status:", error);
      return null;
    }
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue:any = useMemo(
    () => ({
      user,
      login,
      signup,
      logout,
      refresh,
      changePassword,
      getPasswordStatus,
      isLoading
    }),
    [user, login, signup, logout, refresh, changePassword, getPasswordStatus, isLoading]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  return context;
}
