import {
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as categoryService from "@/services/categoryService";
import { CategoryManagement } from "../CategoryManagement";
import React from "react";
import { vi } from "vitest";

vi.mock("@/services/categoryService");

const mockCategories = [
  {
    _id: "1",
    name: "Test Category",
    description: "A test category",
    vendorId: "v1",
    createdAt: new Date().toISOString(),
  },
];

const mockCategoriesResponse = {
  categories: mockCategories,
  pagination: {
    page: 1,
    limit: 10,
    total: 1,
    pages: 1,
  },
};

describe("CategoryManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders categories table", async () => {
    (categoryService.getCategories as unknown as jest.Mock).mockResolvedValue(
      mockCategoriesResponse
    );
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <CategoryManagement />
      </QueryClientProvider>
    );
    expect(screen.getByText(/category management/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("Test Category")).toBeInTheDocument()
    );
  });

  it("calls getCategories with pagination parameters for vendor role", async () => {
    (categoryService.getCategories as unknown as jest.Mock).mockResolvedValue(
      mockCategoriesResponse
    );
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <CategoryManagement />
      </QueryClientProvider>
    );
    await waitFor(() =>
      expect(categoryService.getCategories).toHaveBeenCalledWith(undefined, 1, 10)
    );
  });

  it("shows loading state", () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <CategoryManagement />
      </QueryClientProvider>
    );
    expect(screen.getByText(/category management/i)).toBeInTheDocument();
  });

  it("shows error state", async () => {
    (categoryService.getCategories as unknown as jest.Mock).mockRejectedValue(
      new Error("Failed to fetch")
    );
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <CategoryManagement />
      </QueryClientProvider>
    );
    // Wait for loading skeleton to disappear
    await waitForElementToBeRemoved(() => screen.getByTestId("skeleton"));
    await waitFor(() =>
      expect(screen.getByText(/error fetching categories/i)).toBeInTheDocument()
    );
  });
});
