import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  level?: "page" | "component" | "critical";
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: "",
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Generate unique error ID for tracking
    const errorId = `error_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to error tracking service (if available)
    this.reportError(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // In a real app, you would send this to your error tracking service
    // e.g., Sentry, LogRocket, Bugsnag, etc.
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      level: this.props.level || "component",
    };

    // For now, just log to console in development
    if (process.env.NODE_ENV === "development") {
      console.group("🚨 Error Report");
      console.error("Error Details:", errorReport);
      console.groupEnd();
    }

    // In production, send to your error tracking service
    // Example: Sentry.captureException(error, { extra: errorReport });
  };

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: "",
      });
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  private renderErrorDetails = () => {
    const { error, errorInfo, errorId } = this.state;
    const { showDetails = process.env.NODE_ENV === "development" } = this.props;

    if (!showDetails || !error) return null;

    return (
      <div className="mt-4 space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Error ID:</strong> {errorId}
          </AlertDescription>
        </Alert>

        <details className="bg-muted p-4 rounded-lg">
          <summary className="cursor-pointer font-medium mb-2">
            Technical Details (Click to expand)
          </summary>
          <div className="space-y-2 text-sm">
            <div>
              <strong>Error Message:</strong>
              <pre className="mt-1 p-2 bg-background rounded text-xs overflow-auto">
                {error.message}
              </pre>
            </div>
            {error.stack && (
              <div>
                <strong>Stack Trace:</strong>
                <pre className="mt-1 p-2 bg-background rounded text-xs overflow-auto max-h-40">
                  {error.stack}
                </pre>
              </div>
            )}
            {errorInfo?.componentStack && (
              <div>
                <strong>Component Stack:</strong>
                <pre className="mt-1 p-2 bg-background rounded text-xs overflow-auto max-h-40">
                  {errorInfo.componentStack}
                </pre>
              </div>
            )}
          </div>
        </details>
      </div>
    );
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Determine error severity and appropriate UI
      const { level = "component" } = this.props;
      const canRetry = this.retryCount < this.maxRetries;

      return (
        <div className="flex items-center justify-center min-h-[200px] p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-lg">
                {level === "critical"
                  ? "Critical Error"
                  : "Something went wrong"}
              </CardTitle>
              <CardDescription>
                {level === "critical"
                  ? "A critical error occurred that requires immediate attention."
                  : level === "page"
                  ? "This page encountered an error and cannot be displayed."
                  : "This component encountered an error and cannot be displayed."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2">
                {canRetry && (
                  <Button
                    onClick={this.handleRetry}
                    variant="default"
                    className="w-full"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again ({this.maxRetries - this.retryCount} attempts
                    left)
                  </Button>
                )}

                {level === "page" && (
                  <Button
                    onClick={this.handleGoHome}
                    variant="outline"
                    className="w-full"
                  >
                    <Home className="mr-2 h-4 w-4" />
                    Go to Home
                  </Button>
                )}

                <Button
                  onClick={this.handleReload}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reload Page
                </Button>
              </div>

              {this.renderErrorDetails()}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, "children">
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${
    Component.displayName || Component.name
  })`;
  return WrappedComponent;
};

// Hook for programmatic error reporting
export const useErrorHandler = () => {
  const reportError = React.useCallback((error: Error, context?: string) => {
    console.error("Manual error report:", error, context);

    // In a real app, send to error tracking service
    if (process.env.NODE_ENV === "production") {
      // Example: Sentry.captureException(error, { tags: { context } });
    }
  }, []);

  return { reportError };
};

export default ErrorBoundary;
