import React, { createContext, useContext, useState, useCallback } from "react";

interface LoadingContextType {
  isPageLoading: boolean;
  startPageLoading: () => void;
  stopPageLoading: () => void;
  setPageLoading: (loading: boolean) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
};

interface LoadingProviderProps {
  children: React.ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({
  children,
}) => {
  const [isPageLoading, setIsPageLoading] = useState(false);

  const startPageLoading = useCallback(() => {
    setIsPageLoading(true);
  }, []);

  const stopPageLoading = useCallback(() => {
    setIsPageLoading(false);
  }, []);

  const setPageLoading = useCallback((loading: boolean) => {
    setIsPageLoading(loading);
  }, []);

  const value: LoadingContextType = {
    isPageLoading,
    startPageLoading,
    stopPageLoading,
    setPageLoading,
  };

  return (
    <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>
  );
};
