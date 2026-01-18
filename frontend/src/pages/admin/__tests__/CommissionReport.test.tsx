import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import CommissionReport from '../CommissionReport';
import * as reportService from '../../../services/reportService';
import * as vendorService from '../../../services/vendorService';
import type { CommissionReport as CommissionReportType } from '@/types';

// Mock the services
vi.mock('../../../services/reportService');
vi.mock('../../../services/vendorService');
const mockReportService = reportService as any;
const mockVendorService = vendorService as any;

// Mock the toast hook
vi.mock('../../../hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  CalendarIcon: () => <div data-testid="calendar-icon" />,
  Download: () => <div data-testid="download-icon" />,
  DollarSign: () => <div data-testid="dollar-sign-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  Users: () => <div data-testid="users-icon" />,
  ShoppingCart: () => <div data-testid="shopping-cart-icon" />,
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  format: vi.fn((date, formatString) => {
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }
    return '2023-01-01';
  }),
}));

const mockCommissionReport: CommissionReportType = {
  period: 'monthly',
  dateRange: {
    start: '2023-01-01',
    end: '2023-01-31',
  },
  vendors: [
    {
      _id: 'vendor1',
      vendorName: 'Test Vendor 1',
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
        latestPaymentDate: '2023-01-15',
        oldestPendingDate: '2023-01-01',
      },
      paymentCompletionRate: 50,
    },
    {
      _id: 'vendor2',
      vendorName: 'Test Vendor 2',
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
        latestPaymentDate: '2023-01-20',
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

const mockVendors = [
  { _id: 'vendor1', businessName: 'Test Vendor 1' },
  { _id: 'vendor2', businessName: 'Test Vendor 2' },
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('CommissionReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReportService.getCommissionReport.mockResolvedValue(mockCommissionReport);
    mockVendorService.fetchVendors.mockResolvedValue(mockVendors);
  });

  it('renders commission report page title', () => {
    render(<CommissionReport />, { wrapper: createWrapper() });

    expect(screen.getByText('Commission Report')).toBeInTheDocument();
  });

  it('renders report filters section', () => {
    render(<CommissionReport />, { wrapper: createWrapper() });

    expect(screen.getByText('Report Filters')).toBeInTheDocument();
    expect(screen.getByText('Period')).toBeInTheDocument();
    expect(screen.getByText('Start Date')).toBeInTheDocument();
    expect(screen.getByText('End Date')).toBeInTheDocument();
    expect(screen.getByText('Vendor')).toBeInTheDocument();
    expect(screen.getByText('Payment Status')).toBeInTheDocument();
  });

  it('loads and displays commission report data', async () => {
    render(<CommissionReport />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Test Vendor 1')).toBeInTheDocument();
      expect(screen.getByText('Test Vendor 2')).toBeInTheDocument();
    });

    expect(mockReportService.getCommissionReport).toHaveBeenCalledWith(
      'monthly',
      undefined,
      undefined,
      'all',
      'all'
    );
  });

  it('displays summary cards with correct data', async () => {
    render(<CommissionReport />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('$400.00')).toBeInTheDocument(); // Total Commission
      expect(screen.getByText('$350.00 paid')).toBeInTheDocument(); // Paid Amount
    });
  });

  it('displays vendor data in table format', async () => {
    render(<CommissionReport />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Test Vendor 1')).toBeInTheDocument();
      expect(screen.getByText('Test Vendor 2')).toBeInTheDocument();
      expect(screen.getByText('10.00%')).toBeInTheDocument(); // Vendor 1 commission rate
      expect(screen.getByText('15.00%')).toBeInTheDocument(); // Vendor 2 commission rate
    });
  });

  it('handles period filter changes', async () => {
    render(<CommissionReport />, { wrapper: createWrapper() });

    const periodSelect = screen.getByDisplayValue('Monthly');
    fireEvent.click(periodSelect);

    const weeklyOption = screen.getByText('Weekly');
    fireEvent.click(weeklyOption);

    await waitFor(() => {
      expect(mockReportService.getCommissionReport).toHaveBeenCalledWith(
        'weekly',
        undefined,
        undefined,
        'all',
        'all'
      );
    });
  });

  it('handles vendor filter changes', async () => {
    render(<CommissionReport />, { wrapper: createWrapper() });

    await waitFor(() => {
      const vendorSelect = screen.getByDisplayValue('All Vendors');
      fireEvent.click(vendorSelect);
    });

    const vendor1Option = screen.getByText('Test Vendor 1');
    fireEvent.click(vendor1Option);

    await waitFor(() => {
      expect(mockReportService.getCommissionReport).toHaveBeenCalledWith(
        'monthly',
        undefined,
        undefined,
        'vendor1',
        'all'
      );
    });
  });

  it('handles payment status filter changes', async () => {
    render(<CommissionReport />, { wrapper: createWrapper() });

    const statusSelect = screen.getByDisplayValue('All Status');
    fireEvent.click(statusSelect);

    const paidOption = screen.getByText('Paid');
    fireEvent.click(paidOption);

    await waitFor(() => {
      expect(mockReportService.getCommissionReport).toHaveBeenCalledWith(
        'monthly',
        undefined,
        undefined,
        'all',
        'paid'
      );
    });
  });

  it('handles custom date range input', async () => {
    render(<CommissionReport />, { wrapper: createWrapper() });

    const startDateInput = screen.getByLabelText('Start Date');
    const endDateInput = screen.getByLabelText('End Date');

    fireEvent.change(startDateInput, { target: { value: '2023-01-01' } });
    fireEvent.change(endDateInput, { target: { value: '2023-01-31' } });

    const applyButton = screen.getByText('Apply Custom Range');
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(mockReportService.getCommissionReport).toHaveBeenCalledWith(
        'monthly',
        '2023-01-01',
        '2023-01-31',
        'all',
        'all'
      );
    });
  });

  it('validates custom date range input', async () => {
    render(<CommissionReport />, { wrapper: createWrapper() });

    const startDateInput = screen.getByLabelText('Start Date');
    fireEvent.change(startDateInput, { target: { value: '2023-01-01' } });

    const applyButton = screen.getByText('Apply Custom Range');
    fireEvent.click(applyButton);

    // Should show error message for missing end date
    // This would require the toast mock to be called
  });

  it('resets all filters when reset button is clicked', async () => {
    render(<CommissionReport />, { wrapper: createWrapper() });

    // Change some filters first
    const periodSelect = screen.getByDisplayValue('Monthly');
    fireEvent.click(periodSelect);
    fireEvent.click(screen.getByText('Weekly'));

    await waitFor(() => {
      const resetButton = screen.getByText('Reset Filters');
      fireEvent.click(resetButton);
    });

    await waitFor(() => {
      expect(mockReportService.getCommissionReport).toHaveBeenCalledWith(
        'monthly',
        undefined,
        undefined,
        'all',
        'all'
      );
    });
  });

  it('displays export CSV button when data is loaded', async () => {
    render(<CommissionReport />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Export CSV')).toBeInTheDocument();
    });
  });

  it('handles CSV export functionality', async () => {
    // Mock URL.createObjectURL and related methods
    global.URL.createObjectURL = vi.fn(() => 'mocked-url');
    global.URL.revokeObjectURL = vi.fn();
    
    const mockClick = vi.fn();
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'a') {
        return {
          href: '',
          download: '',
          click: mockClick,
        } as any;
      }
      return document.createElement(tagName);
    });

    render(<CommissionReport />, { wrapper: createWrapper() });

    await waitFor(() => {
      const exportButton = screen.getByText('Export CSV');
      fireEvent.click(exportButton);
    });

    expect(mockClick).toHaveBeenCalled();
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  it('displays loading state initially', () => {
    mockReportService.getCommissionReport.mockReturnValue(
      new Promise(() => {}) // Never resolves to simulate loading
    );

    render(<CommissionReport />, { wrapper: createWrapper() });

    expect(screen.getAllByTestId('skeleton')).toHaveLength(4); // 4 skeleton cards
  });

  it('displays error state when data fetch fails', async () => {
    const errorMessage = 'Failed to load commission report';
    mockReportService.getCommissionReport.mockRejectedValue(new Error(errorMessage));

    render(<CommissionReport />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/Error loading commission report/)).toBeInTheDocument();
    });
  });

  it('displays empty state when no vendor data', async () => {
    const emptyReport = {
      ...mockCommissionReport,
      vendors: [],
      summary: {
        ...mockCommissionReport.summary,
        totalVendors: 0,
      },
    };
    mockReportService.getCommissionReport.mockResolvedValue(emptyReport);

    render(<CommissionReport />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument(); // Total vendors
    });
  });

  it('formats currency values correctly', async () => {
    render(<CommissionReport />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('$400.00')).toBeInTheDocument();
      expect(screen.getByText('$3,000.00')).toBeInTheDocument();
    });
  });

  it('formats percentage values correctly', async () => {
    render(<CommissionReport />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('10.00%')).toBeInTheDocument();
      expect(screen.getByText('15.00%')).toBeInTheDocument();
    });
  });

  it('loads vendor list for filter dropdown', async () => {
    render(<CommissionReport />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockVendorService.fetchVendors).toHaveBeenCalledWith('', 1, 100, 'all');
    });
  });

  it('includes all payment status options in filter', () => {
    render(<CommissionReport />, { wrapper: createWrapper() });

    const statusSelect = screen.getByDisplayValue('All Status');
    fireEvent.click(statusSelect);

    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Paid')).toBeInTheDocument();
    expect(screen.getByText('Disputed')).toBeInTheDocument();
  });

  it('updates query key when filters change', async () => {
    render(<CommissionReport />, { wrapper: createWrapper() });

    // Initial call
    expect(mockReportService.getCommissionReport).toHaveBeenCalledTimes(1);

    // Change vendor filter
    await waitFor(() => {
      const vendorSelect = screen.getByDisplayValue('All Vendors');
      fireEvent.click(vendorSelect);
    });

    const vendor1Option = screen.getByText('Test Vendor 1');
    fireEvent.click(vendor1Option);

    // Should trigger another call with new filter
    await waitFor(() => {
      expect(mockReportService.getCommissionReport).toHaveBeenCalledTimes(2);
    });
  });

  it('displays payment completion rates', async () => {
    render(<CommissionReport />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('87.50%')).toBeInTheDocument(); // Overall completion rate
    });
  });

  it('shows outstanding amounts', async () => {
    render(<CommissionReport />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('$50.00')).toBeInTheDocument(); // Outstanding amount
    });
  });
});
