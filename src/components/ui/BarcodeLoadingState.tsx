import React from "react";
import { Loader2, Printer, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BarcodeLoadingStateProps {
  isLoading: boolean;
  loadingText?: string;
  icon?: "printer" | "barcode" | "loader";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const iconMap = {
  printer: Printer,
  barcode: BarChart3,
  loader: Loader2,
};

const sizeMap = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

/**
 * BarcodeLoadingState component - Shows loading state for barcode operations
 * Provides consistent loading UI across barcode features
 */
export function BarcodeLoadingState({
  isLoading,
  loadingText = "Processing...",
  icon = "loader",
  size = "sm",
  className,
}: BarcodeLoadingStateProps) {
  if (!isLoading) return null;

  const IconComponent = iconMap[icon];
  const iconSize = sizeMap[size];

  return (
    <div
      className={cn("flex items-center gap-2 text-muted-foreground", className)}
    >
      <IconComponent
        className={cn(iconSize, icon === "loader" && "animate-spin")}
      />
      <span className="text-sm">{loadingText}</span>
    </div>
  );
}

/**
 * BarcodeButtonLoadingState - Loading state specifically for buttons
 */
interface BarcodeButtonLoadingStateProps {
  isLoading: boolean;
  loadingText?: string;
  defaultText?: string;
  icon?: "printer" | "barcode";
  size?: "sm" | "md" | "lg";
}

export function BarcodeButtonLoadingState({
  isLoading,
  loadingText = "Processing...",
  defaultText = "Process",
  icon = "printer",
  size = "sm",
}: BarcodeButtonLoadingStateProps) {
  const IconComponent = isLoading ? Loader2 : iconMap[icon];
  const iconSize = sizeMap[size];

  return (
    <>
      <IconComponent
        className={cn(iconSize, "mr-2", isLoading && "animate-spin")}
      />
      {isLoading ? loadingText : defaultText}
    </>
  );
}

/**
 * BarcodeOperationStatus - Shows status of barcode operations with progress
 */
interface BarcodeOperationStatusProps {
  isLoading: boolean;
  progress?: {
    current: number;
    total: number;
  };
  status?: "idle" | "processing" | "success" | "error";
  message?: string;
  className?: string;
}

export function BarcodeOperationStatus({
  isLoading,
  progress,
  status = "idle",
  message,
  className,
}: BarcodeOperationStatusProps) {
  const getStatusIcon = () => {
    switch (status) {
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "success":
        return <BarChart3 className="h-4 w-4 text-green-500" />;
      case "error":
        return <BarChart3 className="h-4 w-4 text-red-500" />;
      default:
        return <Printer className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    if (message) return message;

    switch (status) {
      case "processing":
        return progress
          ? `Processing ${progress.current} of ${progress.total} barcodes...`
          : "Processing barcodes...";
      case "success":
        return progress
          ? `Successfully processed ${progress.total} barcodes`
          : "Barcodes processed successfully";
      case "error":
        return "Error processing barcodes";
      default:
        return "Ready to process barcodes";
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "processing":
        return "text-blue-600";
      case "success":
        return "text-green-600";
      case "error":
        return "text-red-600";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {getStatusIcon()}
      <span className={cn("text-sm font-medium", getStatusColor())}>
        {getStatusText()}
      </span>
      {progress && status === "processing" && (
        <div className="flex-1 max-w-32">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Hook for managing barcode operation loading states
 */
export function useBarcodeLoading() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [progress, setProgress] = React.useState<{
    current: number;
    total: number;
  } | null>(null);
  const [status, setStatus] = React.useState<
    "idle" | "processing" | "success" | "error"
  >("idle");
  const [message, setMessage] = React.useState<string>("");

  const startLoading = (total?: number, initialMessage?: string) => {
    setIsLoading(true);
    setStatus("processing");
    setMessage(initialMessage || "");
    if (total) {
      setProgress({ current: 0, total });
    }
  };

  const updateProgress = (current: number, message?: string) => {
    if (progress) {
      setProgress({ ...progress, current });
    }
    if (message) {
      setMessage(message);
    }
  };

  const finishLoading = (success: boolean, finalMessage?: string) => {
    setIsLoading(false);
    setStatus(success ? "success" : "error");
    setMessage(finalMessage || "");

    // Reset after a delay
    setTimeout(() => {
      setStatus("idle");
      setMessage("");
      setProgress(null);
    }, 3000);
  };

  const reset = () => {
    setIsLoading(false);
    setStatus("idle");
    setMessage("");
    setProgress(null);
  };

  return {
    isLoading,
    progress,
    status,
    message,
    startLoading,
    updateProgress,
    finishLoading,
    reset,
  };
}
