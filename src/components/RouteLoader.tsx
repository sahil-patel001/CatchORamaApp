import React, { useEffect, Suspense, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useLoading } from "@/contexts/LoadingContext";

interface RouteLoaderProps {
  children: React.ReactNode;
  minLoadingTime?: number; // Minimum time to show loader (in ms)
}

/**
 * RouteLoader - Handles loading states for route transitions
 * Triggers loading state that will be shown in the content area via ContentLoader
 */
export const RouteLoader = React.memo(
  ({ children, minLoadingTime = 300 }: RouteLoaderProps) => {
    const location = useLocation();
    const { isPageLoading, stopPageLoading } = useLoading();

    const pathname = location.pathname;

    // Auto-stop loading after component mounts with minimum time
    useEffect(() => {
      if (isPageLoading) {
        const timer = setTimeout(() => {
          stopPageLoading();
        }, minLoadingTime);

        return () => clearTimeout(timer);
      }
    }, [pathname, stopPageLoading, isPageLoading, minLoadingTime]);

    return <Suspense fallback={<div />}>{children}</Suspense>;
  }
);

/**
 * Hook to trigger page loading manually
 */
export function useRouteLoading() {
  const { startPageLoading, stopPageLoading, isPageLoading } = useLoading();

  const triggerPageLoading = (duration = 500) => {
    startPageLoading();
    setTimeout(() => {
      stopPageLoading();
    }, duration);
  };

  return {
    triggerPageLoading,
    startPageLoading,
    stopPageLoading,
    isPageLoading,
  };
}
