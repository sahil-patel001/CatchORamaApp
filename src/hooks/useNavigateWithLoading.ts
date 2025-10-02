import { useNavigate } from "react-router-dom";
import { useLoading } from "@/contexts/LoadingContext";

/**
 * Hook that provides navigation with automatic loading states
 * Triggers loading when navigating to prevent jarring page transitions
 */
export function useNavigateWithLoading() {
  const navigate = useNavigate();
  const { startPageLoading } = useLoading();

  const navigateWithLoading = (
    to: string,
    options?: { replace?: boolean; state?: any }
  ) => {
    // Start loading before navigation
    startPageLoading();

    // Navigate after a small delay to ensure loading state is visible
    setTimeout(() => {
      navigate(to, options);
    }, 50);
  };

  return {
    navigate: navigateWithLoading,
    navigateImmediate: navigate, // For cases where loading is not desired
  };
}
