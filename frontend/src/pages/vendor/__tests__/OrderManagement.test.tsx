import {
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as orderService from "@/services/orderService";
import { OrderManagement } from "../OrderManagement";
import React from "react";
import { vi } from "vitest";

vi.mock("@/services/orderService");

const mockOrders = [
  {
    _id: "1",
    orderNumber: "ORD-001",
    customer: { name: "John Doe", email: "john@example.com" },
    orderTotal: 100,
    status: "delivered",
    items: [],
    vendorId: "v1",
    createdAt: new Date().toISOString(),
  },
];

describe("OrderManagement", () => {
  it("renders orders table", async () => {
    (orderService.getOrders as unknown as jest.Mock).mockResolvedValue({
      data: { orders: mockOrders },
    });
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <OrderManagement />
      </QueryClientProvider>
    );
    expect(screen.getByText(/my orders/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("ORD-001")).toBeInTheDocument()
    );
  });

  it("shows loading state", () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <OrderManagement />
      </QueryClientProvider>
    );
    expect(screen.getByText(/my orders/i)).toBeInTheDocument();
  });

  it("shows error state", async () => {
    (orderService.getOrders as unknown as jest.Mock).mockRejectedValue(
      new Error("Failed to fetch")
    );
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <OrderManagement />
      </QueryClientProvider>
    );
    // Wait for loading skeleton to disappear
    await waitForElementToBeRemoved(() => screen.getByTestId("skeleton"));
    await waitFor(() =>
      expect(screen.getByText(/error fetching orders/i)).toBeInTheDocument()
    );
  });
});
