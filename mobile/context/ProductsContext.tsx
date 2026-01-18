import React, { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';

type ProductsContextType = {
  productsChangeCounter: number;
  markProductsChanged: () => void;
};

const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [productsChangeCounter, setProductsChangeCounter] = useState(0);

  const markProductsChanged = useCallback(() => {
    setProductsChangeCounter((v) => v + 1);
  }, []);

  const value = useMemo(
    () => ({ productsChangeCounter, markProductsChanged }),
    [productsChangeCounter, markProductsChanged]
  );

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

export function useProducts() {
  const ctx = useContext(ProductsContext);
  if (!ctx) {
    throw new Error('useProducts must be used within a ProductsProvider');
  }
  return ctx;
}

