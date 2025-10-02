import React from "react";
import {
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { VendorDashboard } from "../VendorDashboard";
import * as dashboardService from "../../../services/dashboardService";
import { vi } from "vitest";

vi.mock("recharts", async () => {
  const OriginalModule = await vi.importActual("recharts");
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    LineChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="line-chart">{children}</div>
    ),
  };
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

const mockVendorData = {
  data: {
    overview: {
      pendingOrders: 5,
      totalRevenue: 15000,
      activeProducts: 20,
      recentOrders: 2,
      recentRevenue: 1200,
      totalProducts: 25,
    },
    salesData: [
      { date: "2023-01-01", sales: 100 },
      { date: "2023-01-02", sales: 150 },
    ],
    recentOrders: [
      {
        _id: "o1",
        orderId: "ORD-001",
        total: 100,
        status: "shipped",
        createdAt: new Date().toISOString(),
        customer: { name: "test" },
      },
    ],
    lowStockProducts: [
      { _id: "ls1", name: "Low Stock Product", stock: 3, sku: "LS-001" },
    ],
  },
};

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    <MemoryRouter>{children}</MemoryRouter>
  </QueryClientProvider>
);

describe.skip("VendorDashboard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render loading state initially", () => {
    vi.spyOn(dashboardService, "getVendorDashboardStats").mockReturnValue(
      new Promise(() => {})
    );
    render(<VendorDashboard />, { wrapper });
    expect(screen.getAllByTestId("skeleton")).toHaveLength(5);
  });

  it("should render the dashboard with data", async () => {
    vi.spyOn(dashboardService, "getVendorDashboardStats").mockResolvedValue(
      mockVendorData
    );
    render(<VendorDashboard />, { wrapper });

    expect(await screen.findByText("Pending Orders")).toBeInTheDocument();
    expect(await screen.findByText("5")).toBeInTheDocument();
    expect(await screen.findByText("Sales Growth")).toBeInTheDocument();
    expect(await screen.findByTestId("line-chart")).toBeInTheDocument();
  });

  it("should render error state", async () => {
    vi.spyOn(dashboardService, "getVendorDashboardStats").mockRejectedValue(
      new Error("Failed to fetch")
    );
    render(<VendorDashboard />, { wrapper });

    expect(
      await screen.findByText("Failed to load dashboard data")
    ).toBeInTheDocument();
  });
});
