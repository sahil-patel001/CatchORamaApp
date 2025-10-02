import React, { useMemo } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole: UserRole;
}

const loadingFallback = (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

export const ProtectedRoute = React.memo(
  ({ children, allowedRole }: ProtectedRouteProps) => {
    const { user, isLoading } = useAuth();

    const redirectPath = useMemo(() => {
      if (!user) {
        return "/login";
      }

      return user.role === "superadmin"
        ? "/admin/dashboard"
        : "/vendor/dashboard";
    }, [user]);

    if (isLoading) {
      return loadingFallback;
    }

    if (!user) {
      return <Navigate to={redirectPath} replace />;
    }

    if (user.role !== allowedRole) {
      return <Navigate to={redirectPath} replace />;
    }

    return <>{children}</>;
  }
);

ProtectedRoute.displayName = "ProtectedRoute";
