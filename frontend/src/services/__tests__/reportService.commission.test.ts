import { vi, describe, it, expect, beforeEach } from "vitest";
import axios from "axios";
import { getCommissionReport } from "../reportService";
import type { CommissionReport, ReportPeriod } from "@/types";

// Mock axios
vi.mock("axios");
const mockedAxios = axios as any;

const API_URL = `/reports`;

describe("ReportService - Commission Report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCommissionReport: CommissionReport = {
    period: "monthly",
    dateRange: {
      start: "2023-01-01",
      end: "2023-01-31",
    },
    vendors: [
      {
        _id: "vendor1",
        vendorName: "Test Vendor 1",
        commissionRate: 0.1,
        totalRevenue: 1000,
        totalOrders: 5,
        avgOrderValue: 200,
        commissionOwed: 100,
        paymentStatus: {
          totalCommissionRecords: 2,
          paidAmount: 50,
          pendingAmount: 50,
          approvedAmount: 0,
          disputedAmount: 0,
          latestPaymentDate: "2023-01-15",
          oldestPendingDate: "2023-01-01",
        },
        paymentCompletionRate: 50,
      },
      {
        _id: "vendor2",
        vendorName: "Test Vendor 2",
        commissionRate: 0.15,
        totalRevenue: 2000,
        totalOrders: 10,
        avgOrderValue: 200,
        commissionOwed: 300,
        paymentStatus: {
          totalCommissionRecords: 1,
          paidAmount: 300,
          pendingAmount: 0,
          approvedAmount: 0,
          disputedAmount: 0,
          latestPaymentDate: "2023-01-20",
          oldestPendingDate: null,
        },
        paymentCompletionRate: 100,
      },
    ],
    summary: {
      totalRevenue: 3000,
      totalCommission: 400,
      totalOrders: 15,
      totalVendors: 2,
      avgCommissionRate: 0.125,
      avgRevenuePerVendor: 1500,
      totalPaidAmount: 350,
      totalPendingAmount: 50,
      totalApprovedAmount: 0,
      totalDisputedAmount: 0,
      paymentCompletionRate: 87.5,
      outstandingAmount: 50,
    },
  };

  const mockResponse = {
    data: {
      success: true,
      data: mockCommissionReport,
    },
  };

  describe("getCommissionReport", () => {
    it("fetches commission report with default parameters", async () => {
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await getCommissionReport();

      expect(mockedAxios.get).toHaveBeenCalledWith(`${API_URL}/commission`, {
        withCredentials: true,
        params: { period: "monthly" },
      });
      expect(result).toEqual(mockCommissionReport);
    });

    it("fetches commission report with custom period", async () => {
      mockedAxios.get.mockResolvedValue(mockResponse);

      const period: ReportPeriod = "weekly";
      await getCommissionReport(period);

      expect(mockedAxios.get).toHaveBeenCalledWith(`${API_URL}/commission`, {
        withCredentials: true,
        params: { period: "weekly" },
      });
    });

    it("fetches commission report with custom date range", async () => {
      mockedAxios.get.mockResolvedValue(mockResponse);

      const startDate = "2023-01-01";
      const endDate = "2023-01-31";
      await getCommissionReport("monthly", startDate, endDate);

      expect(mockedAxios.get).toHaveBeenCalledWith(`${API_URL}/commission`, {
        withCredentials: true,
        params: {
          period: "monthly",
          startDate: "2023-01-01",
          endDate: "2023-01-31",
        },
      });
    });

    it("fetches commission report with vendor filter", async () => {
      mockedAxios.get.mockResolvedValue(mockResponse);

      const vendorId = "vendor1";
      await getCommissionReport("monthly", undefined, undefined, vendorId);

      expect(mockedAxios.get).toHaveBeenCalledWith(`${API_URL}/commission`, {
        withCredentials: true,
        params: {
          period: "monthly",
          vendorId: "vendor1",
        },
      });
    });

    it("fetches commission report with payment status filter", async () => {
      mockedAxios.get.mockResolvedValue(mockResponse);

      const paymentStatus = "paid";
      await getCommissionReport(
        "monthly",
        undefined,
        undefined,
        undefined,
        paymentStatus
      );

      expect(mockedAxios.get).toHaveBeenCalledWith(`${API_URL}/commission`, {
        withCredentials: true,
        params: {
          period: "monthly",
          paymentStatus: "paid",
        },
      });
    });

    it("fetches commission report with all filters", async () => {
      mockedAxios.get.mockResolvedValue(mockResponse);

      await getCommissionReport(
        "quarterly",
        "2023-01-01",
        "2023-03-31",
        "vendor1",
        "pending"
      );

      expect(mockedAxios.get).toHaveBeenCalledWith(`${API_URL}/commission`, {
        withCredentials: true,
        params: {
          period: "quarterly",
          startDate: "2023-01-01",
          endDate: "2023-03-31",
          vendorId: "vendor1",
          paymentStatus: "pending",
        },
      });
    });

    it('excludes "all" values from parameters', async () => {
      mockedAxios.get.mockResolvedValue(mockResponse);

      await getCommissionReport("monthly", undefined, undefined, "all", "all");

      expect(mockedAxios.get).toHaveBeenCalledWith(`${API_URL}/commission`, {
        withCredentials: true,
        params: { period: "monthly" },
      });
    });

    it("handles missing optional parameters gracefully", async () => {
      mockedAxios.get.mockResolvedValue(mockResponse);

      await getCommissionReport("yearly", "2023-01-01");

      expect(mockedAxios.get).toHaveBeenCalledWith(`${API_URL}/commission`, {
        withCredentials: true,
        params: {
          period: "yearly",
          startDate: "2023-01-01",
        },
      });
    });

    it("validates report data structure", async () => {
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await getCommissionReport();

      expect(result).toHaveProperty("period");
      expect(result).toHaveProperty("dateRange");
      expect(result).toHaveProperty("vendors");
      expect(result).toHaveProperty("summary");
      expect(Array.isArray(result.vendors)).toBe(true);
      expect(typeof result.summary).toBe("object");
    });

    it("validates vendor data structure", async () => {
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await getCommissionReport();
      const vendor = result.vendors[0];

      expect(vendor).toHaveProperty("_id");
      expect(vendor).toHaveProperty("vendorName");
      expect(vendor).toHaveProperty("commissionRate");
      expect(vendor).toHaveProperty("totalRevenue");
      expect(vendor).toHaveProperty("totalOrders");
      expect(vendor).toHaveProperty("commissionOwed");
      expect(vendor).toHaveProperty("paymentStatus");
      expect(vendor).toHaveProperty("paymentCompletionRate");
    });

    it("validates payment status structure", async () => {
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await getCommissionReport();
      const paymentStatus = result.vendors[0].paymentStatus;

      expect(paymentStatus).toHaveProperty("totalCommissionRecords");
      expect(paymentStatus).toHaveProperty("paidAmount");
      expect(paymentStatus).toHaveProperty("pendingAmount");
      expect(paymentStatus).toHaveProperty("approvedAmount");
      expect(paymentStatus).toHaveProperty("disputedAmount");
    });

    it("validates summary structure", async () => {
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await getCommissionReport();
      const summary = result.summary;

      expect(summary).toHaveProperty("totalRevenue");
      expect(summary).toHaveProperty("totalCommission");
      expect(summary).toHaveProperty("totalOrders");
      expect(summary).toHaveProperty("totalVendors");
      expect(summary).toHaveProperty("avgCommissionRate");
      expect(summary).toHaveProperty("avgRevenuePerVendor");
      expect(summary).toHaveProperty("paymentCompletionRate");
      expect(summary).toHaveProperty("outstandingAmount");
    });

    it("handles API errors gracefully", async () => {
      const errorMessage = "Failed to generate report";
      mockedAxios.get.mockRejectedValue(new Error(errorMessage));

      await expect(getCommissionReport()).rejects.toThrow(errorMessage);
    });

    it("handles server errors with custom messages", async () => {
      const errorResponse = {
        response: {
          data: {
            error: { message: "Custom server error" },
          },
        },
      };
      mockedAxios.get.mockRejectedValue(errorResponse);

      await expect(getCommissionReport()).rejects.toThrow(
        "Custom server error"
      );
    });

    it("handles malformed response data", async () => {
      mockedAxios.get.mockResolvedValue({ data: null });

      await expect(getCommissionReport()).rejects.toThrow();
    });

    it("handles empty vendor data", async () => {
      const emptyResponse = {
        data: {
          success: true,
          data: {
            ...mockCommissionReport,
            vendors: [],
            summary: {
              ...mockCommissionReport.summary,
              totalVendors: 0,
            },
          },
        },
      };
      mockedAxios.get.mockResolvedValue(emptyResponse);

      const result = await getCommissionReport();

      expect(result.vendors).toEqual([]);
      expect(result.summary.totalVendors).toBe(0);
    });

    it("includes credentials in all requests", async () => {
      mockedAxios.get.mockResolvedValue(mockResponse);

      await getCommissionReport();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          withCredentials: true,
        })
      );
    });

    it("uses correct API endpoint", async () => {
      mockedAxios.get.mockResolvedValue(mockResponse);

      await getCommissionReport();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${API_URL}/commission`,
        expect.any(Object)
      );
    });

    it("handles different period types correctly", async () => {
      mockedAxios.get.mockResolvedValue(mockResponse);

      const periods: ReportPeriod[] = [
        "weekly",
        "monthly",
        "quarterly",
        "yearly",
      ];

      for (const period of periods) {
        await getCommissionReport(period);
        expect(mockedAxios.get).toHaveBeenCalledWith(
          `${API_URL}/commission`,
          expect.objectContaining({
            params: expect.objectContaining({ period }),
          })
        );
      }
    });

    it("validates numeric values in response", async () => {
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await getCommissionReport();
      const vendor = result.vendors[0];
      const summary = result.summary;

      // Vendor numeric validations
      expect(typeof vendor.commissionRate).toBe("number");
      expect(typeof vendor.totalRevenue).toBe("number");
      expect(typeof vendor.totalOrders).toBe("number");
      expect(typeof vendor.commissionOwed).toBe("number");
      expect(typeof vendor.paymentCompletionRate).toBe("number");

      // Summary numeric validations
      expect(typeof summary.totalRevenue).toBe("number");
      expect(typeof summary.totalCommission).toBe("number");
      expect(typeof summary.totalOrders).toBe("number");
      expect(typeof summary.totalVendors).toBe("number");
      expect(typeof summary.paymentCompletionRate).toBe("number");
    });
  });
});
