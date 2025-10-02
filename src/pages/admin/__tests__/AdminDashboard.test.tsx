import React from "react";
import {
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminDashboard } from "../AdminDashboard";
import * as dashboardService from "../../../services/dashboardService";
import { vi } from "vitest";

vi.mock("recharts", async () => {
  const OriginalModule = await vi.importActual("recharts");
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    BarChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="bar-chart">{children}</div>
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

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    <MemoryRouter>{children}</MemoryRouter>
  </QueryClientProvider>
);

const mockAdminData = {
  data: {
    overview: {
      totalVendors: 10,
      totalProducts: 100,
      totalOrders: 50,
      totalRevenue: 50000,
      recentVendors: 2,
      recentProducts: 5,
      recentOrders: 10,
      recentRevenue: 5000,
    },
    topVendors: [
      {
        _id: "1",
        businessName: "Vendor A",
        totalRevenue: 10000,
        totalOrders: 20,
        userName: "vendora",
      },
    ],
    topProducts: [
      {
        _id: "p1",
        product: { _id: "p1", name: "Product A", category: "Category A" },
        totalSold: 50,
        totalRevenue: 2000,
      },
    ],
    recentOrders: [
      {
        _id: "o1",
        orderId: "ORD-001",
        total: 100,
        status: "delivered",
        createdAt: new Date().toISOString(),
      },
    ],
  },
};

describe.skip("AdminDashboard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render loading state initially", () => {
    vi.spyOn(dashboardService, "getAdminDashboardStats").mockReturnValue(
      new Promise(() => {})
    );
    render(<AdminDashboard />, { wrapper });
    expect(screen.getAllByTestId("skeleton")).toHaveLength(7);
  });

  it("should render the dashboard with data", async () => {
    vi.spyOn(dashboardService, "getAdminDashboardStats").mockResolvedValue(
      mockAdminData
    );
    render(<AdminDashboard />, { wrapper });

    expect(await screen.findByText("Total Vendors")).toBeInTheDocument();
    expect(await screen.findByText("10")).toBeInTheDocument();
    expect(
      await screen.findByText("Top 10 Vendors by Sales")
    ).toBeInTheDocument();
    expect(await screen.findByTestId("bar-chart")).toBeInTheDocument();
  });

  it("should render error state", async () => {
    vi.spyOn(dashboardService, "getAdminDashboardStats").mockRejectedValue(
      new Error("Failed to fetch")
    );
    render(<AdminDashboard />, { wrapper });

    expect(
      await screen.findByText("Failed to load dashboard data")
    ).toBeInTheDocument();
  });
});
