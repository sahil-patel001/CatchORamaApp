import React, { useMemo } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { LoadingProvider } from "@/contexts/LoadingContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RouteLoader } from "@/components/RouteLoader";
import { Login } from "@/pages/Login";
import { Layout } from "@/components/Layout";
import { AdminDashboard } from "@/pages/admin/AdminDashboard";
import { VendorDashboard } from "@/pages/vendor/VendorDashboard";
import { VendorManagement } from "@/pages/admin/VendorManagement";
import { ProductManagement as AdminProductManagement } from "@/pages/admin/ProductManagement";
import { Settings as AdminSettings } from "@/pages/admin/Settings";
import CommissionReport from "@/pages/admin/CommissionReport";
import CommissionManagement from "@/pages/admin/CommissionManagement";
import { ProductManagement as VendorProductManagement } from "@/pages/vendor/ProductManagement";
import { OrderManagement } from "@/pages/vendor/OrderManagement";
import { SalesManagement } from "@/pages/vendor/SalesManagement";
import { Settings as VendorSettings } from "@/pages/vendor/Settings";
import { CategoryManagement } from "@/pages/vendor/CategoryManagement";
import { ArchiveManagement } from "@/pages/vendor/ArchiveManagement";
import { NotificationManagement } from "@/pages/NotificationManagement";
import NotFound from "./pages/NotFound";
import ErrorBoundary from "@/components/ErrorBoundary";

// Create QueryClient with optimized configuration
const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
        retry: (failureCount, error: any) => {
          // Don't retry on 4xx errors except 408, 429
          if (error?.response?.status >= 400 && error?.response?.status < 500) {
            return (
              error?.response?.status === 408 || error?.response?.status === 429
            );
          }
          return failureCount < 3;
        },
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 1,
      },
    },
  });

const AppRoutes = React.memo(() => {
  const { user, isLoading } = useAuth();

  // Memoize loading component to prevent unnecessary re-renders
  const loadingComponent = useMemo(
    () => (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    ),
    []
  );

  // Memoize redirect path to prevent recalculation
  const redirectPath = useMemo(() => {
    return user?.role === "superadmin"
      ? "/admin/dashboard"
      : "/vendor/dashboard";
  }, [user?.role]);

  if (isLoading) {
    return loadingComponent;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to={redirectPath} replace /> : <Login />}
      />

      {/* Redirect root to appropriate dashboard or login */}
      <Route
        path="/"
        element={
          user ? (
            <Navigate to={redirectPath} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Super Admin Routes */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRole="superadmin">
            <RouteLoader>
              <Layout userRole="superadmin" title="System Management">
                <AdminDashboard />
              </Layout>
            </RouteLoader>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/vendors"
        element={
          <ProtectedRoute allowedRole="superadmin">
            <RouteLoader>
              <Layout userRole="superadmin" title="Vendor Management">
                <VendorManagement />
              </Layout>
            </RouteLoader>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/products"
        element={
          <ProtectedRoute allowedRole="superadmin">
            <RouteLoader>
              <Layout userRole="superadmin" title="Product Management">
                <AdminProductManagement />
              </Layout>
            </RouteLoader>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute allowedRole="superadmin">
            <RouteLoader>
              <Layout userRole="superadmin" title="Settings">
                <AdminSettings />
              </Layout>
            </RouteLoader>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/commission"
        element={
          <ProtectedRoute allowedRole="superadmin">
            <RouteLoader>
              <Layout userRole="superadmin" title="Commission Report">
                <CommissionReport />
              </Layout>
            </RouteLoader>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/commission-management"
        element={
          <ProtectedRoute allowedRole="superadmin">
            <RouteLoader>
              <Layout userRole="superadmin" title="Commission Management">
                <CommissionManagement />
              </Layout>
            </RouteLoader>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/notifications"
        element={
          <ProtectedRoute allowedRole="superadmin">
            <RouteLoader>
              <Layout userRole="superadmin" title="Notifications">
                <NotificationManagement />
              </Layout>
            </RouteLoader>
          </ProtectedRoute>
        }
      />

      {/* Vendor Routes */}
      <Route
        path="/vendor/dashboard"
        element={
          <ProtectedRoute allowedRole="vendor">
            <RouteLoader>
              <Layout userRole="vendor" title="Inventory Management">
                <VendorDashboard />
              </Layout>
            </RouteLoader>
          </ProtectedRoute>
        }
      />

      <Route
        path="/vendor/products"
        element={
          <ProtectedRoute allowedRole="vendor">
            <RouteLoader>
              <Layout userRole="vendor" title="Product Management">
                <VendorProductManagement />
              </Layout>
            </RouteLoader>
          </ProtectedRoute>
        }
      />

      <Route
        path="/vendor/categories"
        element={
          <ProtectedRoute allowedRole="vendor">
            <RouteLoader>
              <Layout userRole="vendor" title="Category Management">
                <CategoryManagement />
              </Layout>
            </RouteLoader>
          </ProtectedRoute>
        }
      />

      <Route
        path="/vendor/orders"
        element={
          <ProtectedRoute allowedRole="vendor">
            <RouteLoader>
              <Layout userRole="vendor" title="Order Management">
                <OrderManagement />
              </Layout>
            </RouteLoader>
          </ProtectedRoute>
        }
      />

      <Route
        path="/vendor/sales"
        element={
          <ProtectedRoute allowedRole="vendor">
            <RouteLoader>
              <Layout userRole="vendor" title="Sales Analytics">
                <SalesManagement />
              </Layout>
            </RouteLoader>
          </ProtectedRoute>
        }
      />

      <Route
        path="/vendor/settings"
        element={
          <ProtectedRoute allowedRole="vendor">
            <RouteLoader>
              <Layout userRole="vendor" title="Settings">
                <VendorSettings />
              </Layout>
            </RouteLoader>
          </ProtectedRoute>
        }
      />

      <Route
        path="/vendor/archive"
        element={
          <ProtectedRoute allowedRole="vendor">
            <RouteLoader>
              <Layout userRole="vendor" title="Archive Management">
                <ArchiveManagement />
              </Layout>
            </RouteLoader>
          </ProtectedRoute>
        }
      />

      <Route
        path="/vendor/notifications"
        element={
          <ProtectedRoute allowedRole="vendor">
            <RouteLoader>
              <Layout userRole="vendor" title="Notifications">
                <NotificationManagement />
              </Layout>
            </RouteLoader>
          </ProtectedRoute>
        }
      />

      {/* Catch-all route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
});

AppRoutes.displayName = "AppRoutes";

const App = () => {
  // Memoize QueryClient to prevent recreation on re-renders
  const queryClient = useMemo(() => createQueryClient(), []);

  return (
    <ErrorBoundary
      level="critical"
      showDetails={process.env.NODE_ENV === "development"}
    >
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary level="page">
          <ThemeProvider defaultTheme="system" storageKey="admin-ui-theme">
            <AuthProvider>
              <NotificationProvider>
                <LoadingProvider>
                  <TooltipProvider>
                    <Toaster />
                    <Sonner />
                    <BrowserRouter>
                      <ErrorBoundary level="page">
                        <AppRoutes />
                      </ErrorBoundary>
                    </BrowserRouter>
                  </TooltipProvider>
                </LoadingProvider>
              </NotificationProvider>
            </AuthProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
