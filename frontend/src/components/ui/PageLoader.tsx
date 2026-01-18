import React, { useMemo } from "react";
import {
  Loader2,
  Shield,
  Package,
  BarChart3,
  Settings,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";

interface PageLoaderProps {
  type?: "dashboard" | "table" | "form" | "minimal" | "admin" | "vendor";
  title?: string;
  subtitle?: string;
  className?: string;
}

const iconMap = {
  admin: Shield,
  vendor: Package,
  dashboard: BarChart3,
  form: Settings,
  table: FileText,
  minimal: Loader2,
} as const;

const loadingTextMap = {
  admin: "Loading admin panel...",
  vendor: "Loading vendor dashboard...",
  dashboard: "Loading dashboard...",
  form: "Loading form...",
  table: "Loading data...",
  minimal: "Loading...",
} as const;

/**
 * Full-page loader with animated icon and skeleton content
 */
export const PageLoader = React.memo(
  ({ type = "minimal", title, subtitle, className }: PageLoaderProps) => {
    const IconComponent = useMemo(() => iconMap[type] || Loader2, [type]);
    const loadingText = useMemo(
      () => title || loadingTextMap[type] || loadingTextMap.minimal,
      [title, type]
    );

    return (
      <div
        className={cn(
          "min-h-screen flex items-center justify-center bg-background",
          className
        )}
      >
        <div className="flex flex-col items-center space-y-6 max-w-md mx-auto px-4">
          {/* Animated Icon */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 pulse-ring" />
            <div className="relative bg-primary/10 p-6 rounded-full fade-in">
              <IconComponent className="h-8 w-8 text-primary animate-spin" />
            </div>
          </div>

          {/* Loading Text */}
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              {loadingText}
            </h3>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>

          {/* Progress Bar */}
          <div className="w-full max-w-xs">
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full loading-progress" />
            </div>
          </div>
        </div>
      </div>
    );
  }
);

PageLoader.displayName = "PageLoader";

/**
 * Inline loader for components within pages
 */
export function InlineLoader({
  size = "md",
  text = "Loading...",
  className,
}: {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <div
      className={cn("flex items-center justify-center gap-2 py-4", className)}
    >
      <Loader2 className={cn(sizeClasses[size], "animate-spin text-primary")} />
      <span className="text-sm text-muted-foreground">{text}</span>
    </div>
  );
}

/**
 * Dashboard-specific skeleton loader
 */
export function DashboardSkeleton({
  userRole,
}: {
  userRole?: "admin" | "vendor";
}) {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-6 border rounded-lg space-y-3 fade-in">
            <Skeleton className="h-4 w-20 shimmer" />
            <Skeleton className="h-8 w-16 shimmer" />
            <Skeleton className="h-3 w-24 shimmer" />
          </div>
        ))}
      </div>

      {/* Charts/Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 border rounded-lg space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="p-6 border rounded-lg space-y-4">
          <Skeleton className="h-6 w-40" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Table skeleton loader
 */
export function TableSkeleton({
  rows = 5,
  cols = 4,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="space-y-4">
      {/* Table Header */}
      <div className="flex space-x-4 border-b pb-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>

      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4 py-3">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Form skeleton loader
 */
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="space-y-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-20" />
      </div>
    </div>
  );
}
