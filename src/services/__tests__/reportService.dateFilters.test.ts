import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { getSalesReport, getVendorSalesReportAsAdmin } from "../reportService";

// Mock axios
vi.mock("axios");
const mockedAxios = vi.mocked(axios);

describe("Report Service - Date Filters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSalesReport", () => {
    const mockSalesReport = {
      data: {
        data: {
          vendorInfo: {
            businessName: "Test Vendor",
            abn: "12345678901",
            gstRegistered: true,
          },
          salesData: [
            {
              _id: "2024-01-01",
              totalSales: 1000,
              orderCount: 5,
            },
          ],
          summary: {
            totalRevenue: 1000,
            totalOrders: 5,
            period: "weekly",
          },
        },
      },
    };

    it("calls API with period only", async () => {
      mockedAxios.get.mockResolvedValueOnce(mockSalesReport);

      await getSalesReport("weekly");

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining("/reports/sales"),
        expect.objectContaining({
          params: { period: "weekly" },
          withCredentials: true,
        })
      );
    });

    it("calls API with custom date range", async () => {
      mockedAxios.get.mockResolvedValueOnce(mockSalesReport);

      await getSalesReport("monthly", "2024-01-01", "2024-01-31");

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining("/reports/sales"),
        expect.objectContaining({
          params: {
            period: "monthly",
            startDate: "2024-01-01",
            endDate: "2024-01-31",
          },
          withCredentials: true,
        })
      );
    });

    it("includes only start date when end date is not provided", async () => {
      mockedAxios.get.mockResolvedValueOnce(mockSalesReport);

      await getSalesReport("yearly", "2024-01-01");

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining("/reports/sales"),
        expect.objectContaining({
          params: {
            period: "yearly",
            startDate: "2024-01-01",
          },
        })
      );
    });

    it("includes only end date when start date is not provided", async () => {
      mockedAxios.get.mockResolvedValueOnce(mockSalesReport);

      await getSalesReport("monthly", undefined, "2024-01-31");

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining("/reports/sales"),
        expect.objectContaining({
          params: {
            period: "monthly",
            endDate: "2024-01-31",
          },
        })
      );
    });

    it("returns the sales report data", async () => {
      mockedAxios.get.mockResolvedValueOnce(mockSalesReport);

      const result = await getSalesReport("weekly");

      expect(result).toEqual(mockSalesReport.data.data);
    });
  });

  describe("getVendorSalesReportAsAdmin", () => {
    const mockSalesReport = {
      data: {
        data: {
          vendorInfo: {
            businessName: "Admin Test Vendor",
            abn: "98765432109",
            gstRegistered: false,
          },
          salesData: [],
          summary: {
            totalRevenue: 0,
            totalOrders: 0,
            period: "monthly",
          },
        },
      },
    };

    it("calls API with vendor ID and period", async () => {
      mockedAxios.get.mockResolvedValueOnce(mockSalesReport);

      await getVendorSalesReportAsAdmin("vendor123", "monthly");

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining("/reports/sales"),
        expect.objectContaining({
          params: {
            vendorId: "vendor123",
            period: "monthly",
          },
          withCredentials: true,
        })
      );
    });

    it("calls API with vendor ID and custom date range", async () => {
      mockedAxios.get.mockResolvedValueOnce(mockSalesReport);

      await getVendorSalesReportAsAdmin(
        "vendor456",
        "weekly",
        "2024-02-01",
        "2024-02-07"
      );

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining("/reports/sales"),
        expect.objectContaining({
          params: {
            vendorId: "vendor456",
            period: "weekly",
            startDate: "2024-02-01",
            endDate: "2024-02-07",
          },
          withCredentials: true,
        })
      );
    });

    it("defaults to weekly period", async () => {
      mockedAxios.get.mockResolvedValueOnce(mockSalesReport);

      await getVendorSalesReportAsAdmin("vendor789");

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining("/reports/sales"),
        expect.objectContaining({
          params: {
            vendorId: "vendor789",
            period: "weekly",
          },
        })
      );
    });

    it("returns the sales report data", async () => {
      mockedAxios.get.mockResolvedValueOnce(mockSalesReport);

      const result = await getVendorSalesReportAsAdmin("vendor123", "yearly");

      expect(result).toEqual(mockSalesReport.data.data);
    });
  });

  describe("Error handling", () => {
    it("throws error when API call fails", async () => {
      const mockError = new Error("Network error");
      mockedAxios.get.mockRejectedValueOnce(mockError);

      await expect(getSalesReport("weekly")).rejects.toThrow("Network error");
    });

    it("throws error when admin sales report API call fails", async () => {
      const mockError = new Error("Unauthorized");
      mockedAxios.get.mockRejectedValueOnce(mockError);

      await expect(
        getVendorSalesReportAsAdmin("vendor123", "monthly")
      ).rejects.toThrow("Unauthorized");
    });
  });
});
