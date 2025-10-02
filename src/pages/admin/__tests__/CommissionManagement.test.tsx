import React from "react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import CommissionManagement from "../CommissionManagement";
import * as commissionService from "../../../services/commissionService";
import * as vendorService from "../../../services/vendorService";
import type { Commission } from "@/types";

// Mock the services
vi.mock("../../../services/commissionService");
vi.mock("../../../services/vendorService");
const mockCommissionService = commissionService as any;
const mockVendorService = vendorService as any;

// Mock the toast hook
vi.mock("../../../hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  XCircle: () => <div data-testid="x-circle-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  DollarSign: () => <div data-testid="dollar-sign-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  User: () => <div data-testid="user-icon" />,
  MoreHorizontal: () => <div data-testid="more-horizontal-icon" />,
  Download: () => <div data-testid="download-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  RefreshCw: () => <div data-testid="refresh-cw-icon" />,
}));

// Mock date-fns
vi.mock("date-fns", () => ({
  format: vi.fn((date, formatString) => {
    if (date instanceof Date) {
      return date.toLocaleDateString();
    }
    if (typeof date === "string") {
      return new Date(date).toLocaleDateString();
    }
    return "1/1/2023";
  }),
}));

const mockCommissions: Commission[] = [
  {
    _id: "comm1",
    vendorId: "vendor1",
    vendor: { businessName: "Test Vendor 1", _id: "vendor1" },
    period: {
      startDate: "2023-01-01",
      endDate: "2023-01-31",
      type: "monthly",
    },
    calculation: {
      totalRevenue: 1000,
      commissionRate: 0.1,
      commissionAmount: 100,
      totalOrders: 5,
      avgOrderValue: 200,
    },
    status: "calculated",
    metadata: {
      generatedBy: "admin1",
      generatedAt: "2023-01-01T00:00:00Z",
    },
    orderIds: [],
  },
  {
    _id: "comm2",
    vendorId: "vendor2",
    vendor: { businessName: "Test Vendor 2", _id: "vendor2" },
    period: {
      startDate: "2023-01-01",
      endDate: "2023-01-31",
      type: "monthly",
    },
    calculation: {
      totalRevenue: 2000,
      commissionRate: 0.15,
      commissionAmount: 300,
      totalOrders: 10,
      avgOrderValue: 200,
    },
    status: "approved",
    metadata: {
      generatedBy: "admin1",
      generatedAt: "2023-01-01T00:00:00Z",
    },
    orderIds: [],
  },
];

const mockVendors = [
  { _id: "vendor1", businessName: "Test Vendor 1" },
  { _id: "vendor2", businessName: "Test Vendor 2" },
];

const mockCommissionResponse = {
  commissions: mockCommissions,
  pagination: {
    current: 1,
    total: 2,
    pages: 1,
    limit: 10,
  },
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe("CommissionManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCommissionService.getCommissions.mockResolvedValue(
      mockCommissionResponse
    );
    mockVendorService.fetchVendors.mockResolvedValue(mockVendors);
  });

  it("renders commission management page title", () => {
    render(<CommissionManagement />, { wrapper: createWrapper() });

    expect(screen.getByText("Commission Management")).toBeInTheDocument();
  });

  it("renders filter controls", () => {
    render(<CommissionManagement />, { wrapper: createWrapper() });

    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Vendor")).toBeInTheDocument();
    expect(screen.getByText("Start Date")).toBeInTheDocument();
    expect(screen.getByText("End Date")).toBeInTheDocument();
  });

  it("loads and displays commission data", async () => {
    render(<CommissionManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Test Vendor 1")).toBeInTheDocument();
      expect(screen.getByText("Test Vendor 2")).toBeInTheDocument();
    });

    expect(mockCommissionService.getCommissions).toHaveBeenCalledWith({
      status: undefined,
      vendorId: undefined,
      startDate: undefined,
      endDate: undefined,
      page: 1,
      limit: 10,
    });
  });

  it("displays commission status badges correctly", async () => {
    render(<CommissionManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Calculated")).toBeInTheDocument();
      expect(screen.getByText("Approved")).toBeInTheDocument();
    });
  });

  it("handles status filter changes", async () => {
    render(<CommissionManagement />, { wrapper: createWrapper() });

    const statusSelect = screen.getByDisplayValue("All Status");
    fireEvent.click(statusSelect);

    const pendingOption = screen.getByText("Pending");
    fireEvent.click(pendingOption);

    await waitFor(() => {
      expect(mockCommissionService.getCommissions).toHaveBeenCalledWith({
        status: "pending",
        vendorId: undefined,
        startDate: undefined,
        endDate: undefined,
        page: 1,
        limit: 10,
      });
    });
  });

  it("handles vendor filter changes", async () => {
    render(<CommissionManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      const vendorSelect = screen.getByDisplayValue("All Vendors");
      fireEvent.click(vendorSelect);
    });

    const vendor1Option = screen.getByText("Test Vendor 1");
    fireEvent.click(vendor1Option);

    await waitFor(() => {
      expect(mockCommissionService.getCommissions).toHaveBeenCalledWith({
        status: undefined,
        vendorId: "vendor1",
        startDate: undefined,
        endDate: undefined,
        page: 1,
        limit: 10,
      });
    });
  });

  it("handles date range filter changes", async () => {
    render(<CommissionManagement />, { wrapper: createWrapper() });

    const startDateInput = screen.getByLabelText("Start Date");
    const endDateInput = screen.getByLabelText("End Date");

    fireEvent.change(startDateInput, { target: { value: "2023-01-01" } });
    fireEvent.change(endDateInput, { target: { value: "2023-01-31" } });

    await waitFor(() => {
      expect(mockCommissionService.getCommissions).toHaveBeenCalledWith({
        status: undefined,
        vendorId: undefined,
        startDate: "2023-01-01",
        endDate: "2023-01-31",
        page: 1,
        limit: 10,
      });
    });
  });

  it("displays action buttons for calculated commissions", async () => {
    render(<CommissionManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      const actionButtons = screen.getAllByTestId("more-horizontal-icon");
      expect(actionButtons).toHaveLength(2); // One for each commission row
    });
  });

  it("opens approve modal and handles approval", async () => {
    mockCommissionService.approveCommission.mockResolvedValue(
      mockCommissions[0]
    );

    render(<CommissionManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      const actionButtons = screen.getAllByTestId("more-horizontal-icon");
      fireEvent.click(actionButtons[0]);
    });

    const approveButton = screen.getByText("Approve");
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(mockCommissionService.approveCommission).toHaveBeenCalledWith(
        "comm1"
      );
    });
  });

  it("opens payment modal and handles payment", async () => {
    mockCommissionService.markCommissionAsPaid.mockResolvedValue(
      mockCommissions[1]
    );

    render(<CommissionManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      const actionButtons = screen.getAllByTestId("more-horizontal-icon");
      fireEvent.click(actionButtons[1]);
    });

    const payButton = screen.getByText("Mark as Paid");
    fireEvent.click(payButton);

    // Payment modal should open
    await waitFor(() => {
      expect(screen.getByText("Mark Commission as Paid")).toBeInTheDocument();
    });

    // Fill out payment form
    const transactionIdInput = screen.getByLabelText("Transaction ID");
    fireEvent.change(transactionIdInput, { target: { value: "TXN123" } });

    const notesInput = screen.getByLabelText("Notes");
    fireEvent.change(notesInput, { target: { value: "Payment processed" } });

    const submitButton = screen.getByText("Mark as Paid");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCommissionService.markCommissionAsPaid).toHaveBeenCalledWith(
        "comm2",
        {
          method: "bank_transfer",
          transactionId: "TXN123",
          notes: "Payment processed",
        }
      );
    });
  });

  it("opens dispute modal and handles dispute", async () => {
    mockCommissionService.disputeCommission.mockResolvedValue(
      mockCommissions[0]
    );

    render(<CommissionManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      const actionButtons = screen.getAllByTestId("more-horizontal-icon");
      fireEvent.click(actionButtons[0]);
    });

    const disputeButton = screen.getByText("Dispute");
    fireEvent.click(disputeButton);

    // Dispute modal should open
    await waitFor(() => {
      expect(screen.getByText("Dispute Commission")).toBeInTheDocument();
    });

    // Fill out dispute form
    const reasonInput = screen.getByLabelText("Dispute Reason *");
    fireEvent.change(reasonInput, { target: { value: "Calculation error" } });

    const submitButton = screen.getByText("Dispute Commission");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCommissionService.disputeCommission).toHaveBeenCalledWith(
        "comm1",
        "Calculation error"
      );
    });
  });

  it("opens generate commission modal", async () => {
    render(<CommissionManagement />, { wrapper: createWrapper() });

    const generateButton = screen.getByText("Generate Commission");
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(
        screen.getByText("Generate Commission for Vendor")
      ).toBeInTheDocument();
    });
  });

  it("handles individual commission generation", async () => {
    const mockGeneratedCommission = { _id: "newComm1", status: "calculated" };
    mockCommissionService.generateCommission.mockResolvedValue(
      mockGeneratedCommission
    );

    render(<CommissionManagement />, { wrapper: createWrapper() });

    const generateButton = screen.getByText("Generate Commission");
    fireEvent.click(generateButton);

    await waitFor(() => {
      const vendorSelect = screen.getByDisplayValue("Select vendor");
      fireEvent.click(vendorSelect);
    });

    const vendor1Option = screen.getByText("Test Vendor 1");
    fireEvent.click(vendor1Option);

    // Fill in dates
    const startDateInput = screen.getByLabelText("Start Date");
    const endDateInput = screen.getByLabelText("End Date");
    fireEvent.change(startDateInput, { target: { value: "2023-02-01" } });
    fireEvent.change(endDateInput, { target: { value: "2023-02-28" } });

    const submitButton = screen.getByText("Generate Commission");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCommissionService.generateCommission).toHaveBeenCalledWith({
        vendorId: "vendor1",
        startDate: "2023-02-01",
        endDate: "2023-02-28",
        periodType: "monthly",
      });
    });
  });

  it("generates commission with custom commission rate", async () => {
    render(<CommissionManagement />, { wrapper: createWrapper() });

    const generateButton = screen.getByText("Generate Commission");
    fireEvent.click(generateButton);

    await waitFor(() => {
      const vendorSelect = screen.getByDisplayValue("Select vendor");
      fireEvent.click(vendorSelect);
    });

    const vendor1Option = screen.getByText("Test Vendor 1");
    fireEvent.click(vendor1Option);

    // Fill in dates
    const startDateInput = screen.getByLabelText("Start Date");
    const endDateInput = screen.getByLabelText("End Date");
    fireEvent.change(startDateInput, { target: { value: "2023-02-01" } });
    fireEvent.change(endDateInput, { target: { value: "2023-02-28" } });

    // Enable custom commission rate
    const customRateCheckbox = screen.getByLabelText(
      "Override commission rate"
    );
    fireEvent.click(customRateCheckbox);

    // Set custom commission rate
    const commissionRateInput = screen.getByLabelText("Commission Rate (%)");
    fireEvent.change(commissionRateInput, { target: { value: "7.5" } });

    const submitButton = screen.getByText("Generate Commission");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCommissionService.generateCommission).toHaveBeenCalledWith({
        vendorId: "vendor1",
        startDate: "2023-02-01",
        endDate: "2023-02-28",
        periodType: "monthly",
        commissionRate: 0.075, // 7.5% converted to decimal
      });
    });
  });

  it("opens bulk generate modal", async () => {
    render(<CommissionManagement />, { wrapper: createWrapper() });

    const bulkGenerateButton = screen.getByText("Bulk Generate");
    fireEvent.click(bulkGenerateButton);

    await waitFor(() => {
      expect(screen.getByText("Bulk Generate Commissions")).toBeInTheDocument();
    });
  });

  it("handles bulk commission generation", async () => {
    const mockBulkResult = {
      results: {
        successful: [{ vendorId: "vendor1", commission: { _id: "comm1" } }],
        failed: [],
      },
      summary: { total: 1, successful: 1, failed: 0 },
    };
    mockCommissionService.bulkGenerateCommissions.mockResolvedValue(
      mockBulkResult
    );

    render(<CommissionManagement />, { wrapper: createWrapper() });

    const bulkGenerateButton = screen.getByText("Bulk Generate");
    fireEvent.click(bulkGenerateButton);

    await waitFor(() => {
      const periodSelect = screen.getByDisplayValue("Monthly");
      fireEvent.click(periodSelect);
    });

    // Fill in dates
    const startDateInput = screen.getAllByLabelText("Start Date")[1]; // Second instance in bulk modal
    const endDateInput = screen.getAllByLabelText("End Date")[1]; // Second instance in bulk modal
    fireEvent.change(startDateInput, { target: { value: "2023-02-01" } });
    fireEvent.change(endDateInput, { target: { value: "2023-02-28" } });

    const submitButton = screen.getByText("Generate for All Vendors");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        mockCommissionService.bulkGenerateCommissions
      ).toHaveBeenCalledWith({
        startDate: "2023-02-01",
        endDate: "2023-02-28",
        periodType: "monthly",
      });
    });
  });

  it("bulk generates commissions with custom commission rate", async () => {
    mockCommissionService.bulkGenerateCommissions.mockResolvedValue({
      message: "Generated 2 commissions successfully, 0 failed",
      results: {
        successful: [
          {
            vendorId: "vendor1",
            vendorName: "Test Vendor 1",
            commissionId: "comm1",
            amount: 150,
          },
          {
            vendorId: "vendor2",
            vendorName: "Test Vendor 2",
            commissionId: "comm2",
            amount: 200,
          },
        ],
        failed: [],
      },
    });

    render(<CommissionManagement />, { wrapper: createWrapper() });

    const bulkGenerateButton = screen.getByText("Bulk Generate");
    fireEvent.click(bulkGenerateButton);

    // Fill in dates
    const startDateInput = screen.getAllByLabelText("Start Date")[1]; // Second instance in bulk modal
    const endDateInput = screen.getAllByLabelText("End Date")[1]; // Second instance in bulk modal
    fireEvent.change(startDateInput, { target: { value: "2023-02-01" } });
    fireEvent.change(endDateInput, { target: { value: "2023-02-28" } });

    // Enable custom commission rate
    const customRateCheckbox = screen.getByLabelText(
      "Override commission rate for all vendors"
    );
    fireEvent.click(customRateCheckbox);

    // Set custom commission rate
    const commissionRateInput = screen.getByLabelText("Commission Rate (%)");
    fireEvent.change(commissionRateInput, { target: { value: "10" } });

    const submitButton = screen.getByText("Generate for All Vendors");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        mockCommissionService.bulkGenerateCommissions
      ).toHaveBeenCalledWith({
        startDate: "2023-02-01",
        endDate: "2023-02-28",
        periodType: "monthly",
        commissionRate: 0.1, // 10% converted to decimal
      });
    });
  });

  it("handles pagination", async () => {
    const paginatedResponse = {
      ...mockCommissionResponse,
      pagination: {
        current: 1,
        total: 25,
        pages: 3,
        limit: 10,
      },
    };
    mockCommissionService.getCommissions.mockResolvedValue(paginatedResponse);

    render(<CommissionManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText("Showing 1 to 2 of 25 commissions")
      ).toBeInTheDocument();
    });

    // Should show next button
    const nextButton = screen.getByText("Next");
    expect(nextButton).toBeInTheDocument();
  });

  it("displays loading state initially", () => {
    mockCommissionService.getCommissions.mockReturnValue(
      new Promise(() => {}) // Never resolves to simulate loading
    );

    render(<CommissionManagement />, { wrapper: createWrapper() });

    expect(screen.getByText("Loading commissions...")).toBeInTheDocument();
  });

  it("displays error state when data fetch fails", async () => {
    const errorMessage = "Failed to load commissions";
    mockCommissionService.getCommissions.mockRejectedValue(
      new Error(errorMessage)
    );

    render(<CommissionManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/Error loading commissions/)).toBeInTheDocument();
    });
  });

  it("displays empty state when no commissions", async () => {
    const emptyResponse = {
      commissions: [],
      pagination: {
        current: 1,
        total: 0,
        pages: 0,
        limit: 10,
      },
    };
    mockCommissionService.getCommissions.mockResolvedValue(emptyResponse);

    render(<CommissionManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("No commissions found")).toBeInTheDocument();
    });
  });

  it("resets filters when clear filters button is clicked", async () => {
    render(<CommissionManagement />, { wrapper: createWrapper() });

    // Set some filters first
    const statusSelect = screen.getByDisplayValue("All Status");
    fireEvent.click(statusSelect);
    fireEvent.click(screen.getByText("Pending"));

    await waitFor(() => {
      const clearButton = screen.getByText("Clear Filters");
      fireEvent.click(clearButton);
    });

    await waitFor(() => {
      expect(mockCommissionService.getCommissions).toHaveBeenCalledWith({
        status: undefined,
        vendorId: undefined,
        startDate: undefined,
        endDate: undefined,
        page: 1,
        limit: 10,
      });
    });
  });

  it("formats commission amounts correctly", async () => {
    render(<CommissionManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("$100.00")).toBeInTheDocument();
      expect(screen.getByText("$300.00")).toBeInTheDocument();
    });
  });

  it("formats commission rates correctly", async () => {
    render(<CommissionManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("10.0%")).toBeInTheDocument();
      expect(screen.getByText("15.0%")).toBeInTheDocument();
    });
  });
});
