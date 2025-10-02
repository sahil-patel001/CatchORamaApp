import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import {
  getAdminDashboardStats,
  getVendorDashboardStats,
} from "../dashboardService";

// Mock axios
vi.mock("axios");
const mockedAxios = vi.mocked(axios);

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
});

describe("Dashboard Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue("mock-token");
  });

  describe("getAdminDashboardStats", () => {
    const mockResponse = {
      data: {
        success: true,
        data: {
          overview: {
            totalVendors: 10,
            totalProducts: 100,
            totalOrders: 50,
            totalRevenue: 10000,
          },
        },
      },
    };

    it("calls API with period parameter", async () => {
      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      await getAdminDashboardStats("7d");

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining("/dashboard/admin"),
        expect.objectContaining({
          params: { period: "7d" },
          headers: { Authorization: "Bearer mock-token" },
          withCredentials: true,
        })
      );
    });

    it("calls API with custom date range", async () => {
      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      await getAdminDashboardStats(undefined, "2024-01-01", "2024-01-31");

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining("/dashboard/admin"),
        expect.objectContaining({
          params: {
            startDate: "2024-01-01",
            endDate: "2024-01-31",
          },
          headers: { Authorization: "Bearer mock-token" },
          withCredentials: true,
        })
      );
    });

    it("defaults to 30d period when no parameters provided", async () => {
      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      await getAdminDashboardStats();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining("/dashboard/admin"),
        expect.objectContaining({
          params: { period: "30d" },
          headers: { Authorization: "Bearer mock-token" },
          withCredentials: true,
        })
      );
    });

    it("prioritizes custom date range over period", async () => {
      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      await getAdminDashboardStats("7d", "2024-01-01", "2024-01-31");

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining("/dashboard/admin"),
        expect.objectContaining({
          params: {
            startDate: "2024-01-01",
            endDate: "2024-01-31",
          },
        })
      );
    });

    it("returns the response data", async () => {
      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await getAdminDashboardStats("30d");

      expect(result).toEqual(mockResponse.data);
    });

    it("includes authorization headers when token is available", async () => {
      mockedAxios.get.mockResolvedValueOnce(mockResponse);
      mockLocalStorage.getItem.mockReturnValue("test-token");

      await getAdminDashboardStats("30d");

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { Authorization: "Bearer test-token" },
        })
      );
    });

    it("works without authorization headers when no token", async () => {
      mockedAxios.get.mockResolvedValueOnce(mockResponse);
      mockLocalStorage.getItem.mockReturnValue(null);

      await getAdminDashboardStats("30d");

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {},
        })
      );
    });
  });

  describe("getVendorDashboardStats", () => {
    const mockResponse = {
      data: {
        success: true,
        data: {
          overview: {
            totalProducts: 25,
            totalOrders: 15,
            totalRevenue: 5000,
          },
        },
      },
    };

    it("calls API with period parameter", async () => {
      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      await getVendorDashboardStats("90d");

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining("/dashboard/vendor"),
        expect.objectContaining({
          params: { period: "90d" },
          headers: { Authorization: "Bearer mock-token" },
          withCredentials: true,
        })
      );
    });

    it("calls API with custom date range", async () => {
      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      await getVendorDashboardStats(undefined, "2024-02-01", "2024-02-29");

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining("/dashboard/vendor"),
        expect.objectContaining({
          params: {
            startDate: "2024-02-01",
            endDate: "2024-02-29",
          },
          headers: { Authorization: "Bearer mock-token" },
          withCredentials: true,
        })
      );
    });

    it("returns the response data", async () => {
      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await getVendorDashboardStats("30d");

      expect(result).toEqual(mockResponse.data);
    });
  });
});
