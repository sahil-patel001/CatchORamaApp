import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
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

  useEffect(() => {
    // On mount, check if user is authenticated via cookie
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        const res = await authService.getMe();
        if (res.success && res.data?.user) {
          setUser(res.data.user);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await authService.login(email, password);
      if (res.success && res.data?.user) {
        setUser(res.data.user);
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('refreshToken', res.data.refreshToken);
        setIsLoading(false);
        return { success: true };
      } else {
        setUser(null);
        setIsLoading(false);
        return { success: false, error: res.message || "Login failed" };
      }
    } catch (err: unknown) {
      setUser(null);
      setIsLoading(false);
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
  }, []);

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
        if (res.success && res.data?.user) {
          setUser(res.data.user);
          setIsLoading(false);
          return { success: true };
        } else {
          setUser(null);
          setIsLoading(false);
          return { success: false, error: res.message || "Signup failed" };
        }
      } catch (err: unknown) {
        setUser(null);
        setIsLoading(false);
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
    []
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authService.logout();
    } catch {
      // Ignore errors on logout
    }
    setUser(null);
    setIsLoading(false);
  }, []);

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
  const contextValue = useMemo(
    () => ({
      user,
      login,
      signup,
      logout,
      changePassword,
      getPasswordStatus,
      isLoading,
    }),
    [user, login, signup, logout, changePassword, getPasswordStatus, isLoading]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
