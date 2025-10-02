import { vi, describe, it, expect, beforeEach } from 'vitest';
import axios from 'axios';
import {
  getCommissions,
  approveCommission,
  markCommissionAsPaid,
  disputeCommission,
  generateCommission,
  bulkGenerateCommissions,
} from '../commissionService';
import type { Commission } from '@/types';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/commissions`;

describe('CommissionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCommissions', () => {
    const mockCommissions: Commission[] = [
      {
        _id: 'comm1',
        vendorId: 'vendor1',
        vendor: { businessName: 'Test Vendor', _id: 'vendor1' },
        period: {
          startDate: '2023-01-01',
          endDate: '2023-01-31',
          type: 'monthly',
        },
        calculation: {
          totalRevenue: 1000,
          commissionRate: 0.1,
          commissionAmount: 100,
          totalOrders: 5,
          avgOrderValue: 200,
        },
        status: 'pending',
        metadata: {
          generatedBy: 'admin1',
          generatedAt: '2023-01-01T00:00:00Z',
        },
        orderIds: [],
      },
    ];

    const mockResponse = {
      data: {
        success: true,
        data: {
          commissions: mockCommissions,
          pagination: { current: 1, total: 1, pages: 1, limit: 10 },
        },
      },
    };

    it('fetches commissions with default parameters', async () => {
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await getCommissions();

      expect(mockedAxios.get).toHaveBeenCalledWith(API_BASE_URL, {
        withCredentials: true,
        params: { page: 1, limit: 10 },
      });
      expect(result).toEqual({
        commissions: mockCommissions,
        pagination: { current: 1, total: 1, pages: 1, limit: 10 },
      });
    });

    it('fetches commissions with custom parameters', async () => {
      mockedAxios.get.mockResolvedValue(mockResponse);

      const params = {
        status: 'pending',
        vendorId: 'vendor1',
        startDate: '2023-01-01',
        endDate: '2023-01-31',
        page: 2,
        limit: 20,
      };

      await getCommissions(params);

      expect(mockedAxios.get).toHaveBeenCalledWith(API_BASE_URL, {
        withCredentials: true,
        params,
      });
    });

    it('handles API errors', async () => {
      const errorMessage = 'Network error';
      mockedAxios.get.mockRejectedValue(new Error(errorMessage));

      await expect(getCommissions()).rejects.toThrow(errorMessage);
    });

    it('handles malformed response data', async () => {
      mockedAxios.get.mockResolvedValue({ data: null });

      await expect(getCommissions()).rejects.toThrow('Failed to fetch commissions');
    });
  });

  describe('approveCommission', () => {
    const mockCommission: Commission = {
      _id: 'comm1',
      vendorId: 'vendor1',
      status: 'approved',
      period: {
        startDate: '2023-01-01',
        endDate: '2023-01-31',
        type: 'monthly',
      },
      calculation: {
        totalRevenue: 1000,
        commissionRate: 0.1,
        commissionAmount: 100,
        totalOrders: 5,
        avgOrderValue: 200,
      },
      metadata: {
        generatedBy: 'admin1',
        generatedAt: '2023-01-01T00:00:00Z',
      },
      orderIds: [],
    };

    it('approves commission successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { commission: mockCommission },
        },
      };
      mockedAxios.patch.mockResolvedValue(mockResponse);

      const result = await approveCommission('comm1');

      expect(mockedAxios.patch).toHaveBeenCalledWith(
        `${API_BASE_URL}/comm1/approve`,
        {},
        { withCredentials: true }
      );
      expect(result).toEqual(mockCommission);
    });

    it('handles approval errors', async () => {
      const errorResponse = {
        response: {
          data: {
            error: { message: 'Commission already approved' },
          },
        },
      };
      mockedAxios.patch.mockRejectedValue(errorResponse);

      await expect(approveCommission('comm1')).rejects.toThrow('Commission already approved');
    });
  });

  describe('markCommissionAsPaid', () => {
    const paymentData = {
      method: 'bank_transfer' as const,
      transactionId: 'TXN123',
      notes: 'Payment processed',
    };

    it('marks commission as paid successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { commission: { _id: 'comm1', status: 'paid' } },
        },
      };
      mockedAxios.patch.mockResolvedValue(mockResponse);

      const result = await markCommissionAsPaid('comm1', paymentData);

      expect(mockedAxios.patch).toHaveBeenCalledWith(
        `${API_BASE_URL}/comm1/pay`,
        paymentData,
        { withCredentials: true }
      );
      expect(result).toEqual({ _id: 'comm1', status: 'paid' });
    });

    it('validates payment data', async () => {
      const invalidPaymentData = {
        // Missing required fields
      };

      await expect(
        markCommissionAsPaid('comm1', invalidPaymentData as any)
      ).rejects.toThrow();
    });
  });

  describe('disputeCommission', () => {
    it('disputes commission successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { commission: { _id: 'comm1', status: 'disputed' } },
        },
      };
      mockedAxios.patch.mockResolvedValue(mockResponse);

      const notes = 'Commission calculation is incorrect';
      const result = await disputeCommission('comm1', notes);

      expect(mockedAxios.patch).toHaveBeenCalledWith(
        `${API_BASE_URL}/comm1/dispute`,
        { notes },
        { withCredentials: true }
      );
      expect(result).toEqual({ _id: 'comm1', status: 'disputed' });
    });

    it('requires dispute notes', async () => {
      await expect(disputeCommission('comm1', '')).rejects.toThrow(
        'Dispute notes are required'
      );
    });
  });

  describe('generateCommission', () => {
    const commissionData = {
      vendorId: 'vendor1',
      startDate: '2023-01-01',
      endDate: '2023-01-31',
    };

    it('generates commission successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { commission: { _id: 'newComm1', status: 'calculated' } },
        },
      };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await generateCommission(commissionData);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${API_BASE_URL}/generate`,
        commissionData,
        { withCredentials: true }
      );
      expect(result).toEqual({ _id: 'newComm1', status: 'calculated' });
    });

    it('validates required fields', async () => {
      const invalidData = {
        vendorId: 'vendor1',
        // Missing dates
      };

      await expect(generateCommission(invalidData as any)).rejects.toThrow();
    });

    it('handles generation errors', async () => {
      const errorResponse = {
        response: {
          data: {
            error: { message: 'Commission already exists for this period' },
          },
        },
      };
      mockedAxios.post.mockRejectedValue(errorResponse);

      await expect(generateCommission(commissionData)).rejects.toThrow(
        'Commission already exists for this period'
      );
    });
  });

  describe('bulkGenerateCommissions', () => {
    const bulkData = {
      startDate: '2023-01-01',
      endDate: '2023-01-31',
      periodType: 'monthly' as const,
    };

    it('bulk generates commissions successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            results: {
              successful: [{ vendorId: 'vendor1', commission: { _id: 'comm1' } }],
              failed: [{ vendorId: 'vendor2', error: 'Already exists' }],
            },
            summary: { total: 2, successful: 1, failed: 1 },
          },
        },
      };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await bulkGenerateCommissions(bulkData);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${API_BASE_URL}/bulk-generate`,
        bulkData,
        { withCredentials: true }
      );
      expect(result).toEqual({
        results: {
          successful: [{ vendorId: 'vendor1', commission: { _id: 'comm1' } }],
          failed: [{ vendorId: 'vendor2', error: 'Already exists' }],
        },
        summary: { total: 2, successful: 1, failed: 1 },
      });
    });

    it('validates bulk generation data', async () => {
      const invalidData = {
        // Missing required fields
        periodType: 'monthly' as const,
      };

      await expect(bulkGenerateCommissions(invalidData as any)).rejects.toThrow();
    });
  });

  describe('error handling', () => {
    it('handles network errors', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network Error'));

      await expect(getCommissions()).rejects.toThrow('Network Error');
    });

    it('handles server errors with custom messages', async () => {
      const errorResponse = {
        response: {
          data: {
            error: { message: 'Custom server error' },
          },
        },
      };
      mockedAxios.get.mockRejectedValue(errorResponse);

      await expect(getCommissions()).rejects.toThrow('Custom server error');
    });

    it('handles server errors without custom messages', async () => {
      const errorResponse = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
        },
      };
      mockedAxios.get.mockRejectedValue(errorResponse);

      await expect(getCommissions()).rejects.toThrow('Failed to fetch commissions');
    });

    it('handles malformed error responses', async () => {
      mockedAxios.get.mockRejectedValue({});

      await expect(getCommissions()).rejects.toThrow('Failed to fetch commissions');
    });
  });

  describe('request configuration', () => {
    it('always includes credentials in requests', async () => {
      const mockResponse = {
        data: { success: true, data: { commissions: [], pagination: {} } },
      };
      mockedAxios.get.mockResolvedValue(mockResponse);

      await getCommissions();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          withCredentials: true,
        })
      );
    });

    it('uses correct API base URL', async () => {
      const mockResponse = {
        data: { success: true, data: { commissions: [], pagination: {} } },
      };
      mockedAxios.get.mockResolvedValue(mockResponse);

      await getCommissions();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        API_BASE_URL,
        expect.any(Object)
      );
    });
  });
});
