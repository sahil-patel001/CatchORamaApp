import React from "react";
import { ClipLoader } from "react-spinners";
import { useLoading } from "@/contexts/LoadingContext";
import { cn } from "@/lib/utils";

interface ContentLoaderProps {
  children: React.ReactNode;
  className?: string;
  loadingText?: string;
}

/**
 * ContentLoader - Shows loading spinner in the content area only
 * Keeps sidebar and header visible while content loads
 */
export function ContentLoader({
  children,
  className,
  loadingText = "Loading...",
}: ContentLoaderProps) {
  const { isPageLoading } = useLoading();

  if (isPageLoading) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center min-h-[400px] space-y-4",
          className
        )}
      >
        <ClipLoader
          color="hsl(var(--primary))"
          size={60}
          aria-label="Loading content"
        />
        <p className="text-sm text-muted-foreground font-medium">
          {loadingText}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Inline content loader for smaller sections
 */
interface InlineContentLoaderProps {
  isLoading: boolean;
  children: React.ReactNode;
  size?: number;
  loadingText?: string;
  className?: string;
}

export function InlineContentLoader({
  isLoading,
  children,
  size = 40,
  loadingText = "Loading...",
  className,
}: InlineContentLoaderProps) {
  if (isLoading) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-8 space-y-3",
          className
        )}
      >
        <ClipLoader
          color="hsl(var(--primary))"
          size={size}
          aria-label="Loading content"
        />
        <p className="text-xs text-muted-foreground">{loadingText}</p>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Card content loader for loading states within cards
 */
interface CardContentLoaderProps {
  isLoading: boolean;
  children: React.ReactNode;
  size?: number;
  className?: string;
}

export function CardContentLoader({
  isLoading,
  children,
  size = 30,
  className,
}: CardContentLoaderProps) {
  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-6", className)}>
        <ClipLoader
          color="hsl(var(--primary))"
          size={size}
          aria-label="Loading"
        />
      </div>
    );
  }

  return <>{children}</>;
}
