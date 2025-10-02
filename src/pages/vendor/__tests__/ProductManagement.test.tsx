import {
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as productService from "@/services/productService";
import { ProductManagement } from "../ProductManagement";
import React from "react";
import { vi } from "vitest";

vi.mock("@/services/productService");

const mockProducts = [
  {
    _id: "1",
    name: "Test Product",
    price: 10,
    stock: 5,
    category: "test",
    vendorId: "v1",
    images: [],
    createdAt: new Date().toISOString(),
  },
];

describe("ProductManagement", () => {
  it("renders products table", async () => {
    (productService.getProducts as unknown as jest.Mock).mockResolvedValue({
      data: { products: mockProducts },
    });
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ProductManagement />
      </QueryClientProvider>
    );
    expect(screen.getByText(/my products/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("Test Product")).toBeInTheDocument()
    );
  });

  it("shows loading state", () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ProductManagement />
      </QueryClientProvider>
    );
    expect(screen.getByText(/my products/i)).toBeInTheDocument();
  });

  it("shows error state", async () => {
    (productService.getProducts as unknown as jest.Mock).mockRejectedValue(
      new Error("Failed to fetch")
    );
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ProductManagement />
      </QueryClientProvider>
    );
    // Wait for loading skeleton to disappear
    await waitForElementToBeRemoved(() => screen.getByTestId("skeleton"));
    await waitFor(() =>
      expect(screen.getByText(/error fetching products/i)).toBeInTheDocument()
    );
  });
});
