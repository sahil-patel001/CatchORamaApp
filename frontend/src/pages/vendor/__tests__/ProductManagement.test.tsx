import {
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as productService from "@/services/productService";
import { ProductManagement } from "../ProductManagement";
import React from "react";
import { vi } from "vitest";

// Mock dependencies
vi.mock("@/services/productService");
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { role: "vendor" } }),
}));
vi.mock("@/hooks/useBarcodeOperations", () => ({
  useBarcodeOperations: () => ({
    state: { isLoading: false, status: null, message: "", progress: 0 },
    generateBulkBarcodes: vi.fn(),
  }),
}));

const mockProducts = [
  {
    _id: "1",
    id: "1",
    name: "Test Product",
    price: 10,
    stock: 5,
    category: "test",
    vendorId: "v1",
    images: [],
    vendor: { businessName: "Test Vendor" },
    createdAt: new Date().toISOString(),
  },
];

const mockPagination = {
  page: 1,
  limit: 10,
  total: 1,
  pages: 1,
};

describe("ProductManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders products table with correct data shape", async () => {
    // Mock returns { products, pagination } as backend returns
    (productService.getProducts as unknown as jest.Mock).mockResolvedValue({
      products: mockProducts,
      pagination: mockPagination,
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <ProductManagement />
      </QueryClientProvider>
    );
    expect(screen.getByText(/product management/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("Test Product")).toBeInTheDocument()
    );
  });

  it("shows loading state", () => {
    (productService.getProducts as unknown as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves to keep loading
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <ProductManagement />
      </QueryClientProvider>
    );
    expect(screen.getByText(/loading products/i)).toBeInTheDocument();
  });

  it("shows error state", async () => {
    (productService.getProducts as unknown as jest.Mock).mockRejectedValue(
      new Error("Failed to fetch")
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <ProductManagement />
      </QueryClientProvider>
    );
    await waitFor(() =>
      expect(screen.getByText(/failed to load products/i)).toBeInTheDocument()
    );
  });

  it("handles undefined data gracefully and shows no results", async () => {
    // Simulate edge case where query returns undefined
    (productService.getProducts as unknown as jest.Mock).mockResolvedValue(
      undefined
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    
    // Suppress console.warn for this test
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    
    render(
      <QueryClientProvider client={queryClient}>
        <ProductManagement />
      </QueryClientProvider>
    );
    
    await waitFor(() =>
      expect(screen.getByText(/no results found/i)).toBeInTheDocument()
    );
    
    consoleWarn.mockRestore();
  });
});
