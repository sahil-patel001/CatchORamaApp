import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getAdminDashboardStats,
  getVendorDashboardStats,
} from "../dashboardService";

// Mock the api module
vi.mock("../api", () => ({
  default: {
    get: vi.fn(),
  },
}));

// Import the mocked api
import api from "../api";
const mockedApi = vi.mocked(api);

describe("Dashboard Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAdminDashboardStats", () => {
    // Simulates the response from the api interceptor (response.data from backend)
    const mockApiResponse = {
      success: true,
      data: {
        overview: {
          totalVendors: 10,
          totalProducts: 100,
          totalOrders: 50,
          totalRevenue: 10000,
        },
        topVendors: [],
        topProducts: [],
        monthlyStats: [],
        period: "30d",
      },
    };

    it("calls API with period parameter", async () => {
      mockedApi.get.mockResolvedValueOnce(mockApiResponse);

      await getAdminDashboardStats("7d");

      expect(mockedApi.get).toHaveBeenCalledWith(
        "/dashboard/admin",
        expect.objectContaining({
          params: { period: "7d" },
          withCredentials: true,
        })
      );
    });

    it("calls API with custom date range", async () => {
      mockedApi.get.mockResolvedValueOnce(mockApiResponse);

      await getAdminDashboardStats(undefined, "2024-01-01", "2024-01-31");

      expect(mockedApi.get).toHaveBeenCalledWith(
        "/dashboard/admin",
        expect.objectContaining({
          params: {
            startDate: "2024-01-01",
            endDate: "2024-01-31",
          },
          withCredentials: true,
        })
      );
    });

    it("defaults to 30d period when no parameters provided", async () => {
      mockedApi.get.mockResolvedValueOnce(mockApiResponse);

      await getAdminDashboardStats();

      expect(mockedApi.get).toHaveBeenCalledWith(
        "/dashboard/admin",
        expect.objectContaining({
          params: { period: "30d" },
          withCredentials: true,
        })
      );
    });

    it("prioritizes custom date range over period", async () => {
      mockedApi.get.mockResolvedValueOnce(mockApiResponse);

      await getAdminDashboardStats("7d", "2024-01-01", "2024-01-31");

      expect(mockedApi.get).toHaveBeenCalledWith(
        "/dashboard/admin",
        expect.objectContaining({
          params: {
            startDate: "2024-01-01",
            endDate: "2024-01-31",
          },
        })
      );
    });

    it("returns the inner data payload (not the full response)", async () => {
      mockedApi.get.mockResolvedValueOnce(mockApiResponse);

      const result = await getAdminDashboardStats("30d");

      // Service should return the inner `data` object, not the full { success, data } response
      expect(result).toEqual(mockApiResponse.data);
    });
  });

  describe("getVendorDashboardStats", () => {
    // Simulates the response from the api interceptor (response.data from backend)
    const mockApiResponse = {
      success: true,
      data: {
        overview: {
          totalProducts: 25,
          totalOrders: 15,
          totalRevenue: 5000,
        },
        growthRates: {
          revenueGrowthRate: 10,
          orderGrowthRate: 5,
        },
        recentOrders: [],
        topProducts: [],
        leastSellingProducts: [],
        lowStockProducts: [],
        monthlyStats: [],
        period: "30d",
      },
    };

    it("calls API with period parameter", async () => {
      mockedApi.get.mockResolvedValueOnce(mockApiResponse);

      await getVendorDashboardStats("90d");

      expect(mockedApi.get).toHaveBeenCalledWith(
        "/dashboard/vendor",
        expect.objectContaining({
          params: { period: "90d" },
          withCredentials: true,
        })
      );
    });

    it("calls API with custom date range", async () => {
      mockedApi.get.mockResolvedValueOnce(mockApiResponse);

      await getVendorDashboardStats(undefined, "2024-02-01", "2024-02-29");

      expect(mockedApi.get).toHaveBeenCalledWith(
        "/dashboard/vendor",
        expect.objectContaining({
          params: {
            startDate: "2024-02-01",
            endDate: "2024-02-29",
          },
          withCredentials: true,
        })
      );
    });

    it("returns the inner data payload (not the full response)", async () => {
      mockedApi.get.mockResolvedValueOnce(mockApiResponse);

      const result = await getVendorDashboardStats("30d");

      // Service should return the inner `data` object, not the full { success, data } response
      expect(result).toEqual(mockApiResponse.data);
    });
  });
});
