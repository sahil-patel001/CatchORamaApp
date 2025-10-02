import { jest } from '@jest/globals';
import {
  getCommissions,
  approveCommission,
  markCommissionAsPaid,
  disputeCommission,
  generateCommission,
  bulkGenerateCommissions,
} from '../commissionController.js';

// Mock dependencies
const mockCommission = {
  find: jest.fn(),
  findById: jest.fn(),
  save: jest.fn(),
  generateForVendor: jest.fn(),
  aggregate: jest.fn(),
  updateOne: jest.fn(),
};

const mockVendor = {
  find: jest.fn(),
  findById: jest.fn(),
};

const mockCommissionHistory = {
  create: jest.fn(),
};

// Mock the models
jest.unstable_mockModule('../models/Commission.js', () => ({
  default: mockCommission,
}));

jest.unstable_mockModule('../models/Vendor.js', () => ({
  default: mockVendor,
}));

jest.unstable_mockModule('../models/CommissionHistory.js', () => ({
  default: mockCommissionHistory,
}));

describe('CommissionController', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      query: {},
      body: {},
      params: {},
      user: { _id: 'admin123', role: 'superadmin' },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('getCommissions', () => {
    const mockCommissions = [
      {
        _id: 'comm1',
        vendorId: 'vendor1',
        status: 'pending',
        calculation: { commissionAmount: 100 },
        populate: jest.fn().mockResolvedThis(),
      },
      {
        _id: 'comm2',
        vendorId: 'vendor2',
        status: 'paid',
        calculation: { commissionAmount: 200 },
        populate: jest.fn().mockResolvedThis(),
      },
    ];

    beforeEach(() => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockCommissions),
      };
      mockCommission.find.mockReturnValue(mockQuery);
      mockCommission.aggregate.mockResolvedValue([{ count: 2 }]);
    });

    it('fetches commissions with default pagination', async () => {
      await getCommissions(req, res, next);

      expect(mockCommission.find).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          commissions: mockCommissions,
          pagination: {
            current: 1,
            limit: 10,
            total: 2,
            pages: 1,
          },
        },
      });
    });

    it('filters by status when provided', async () => {
      req.query = { status: 'pending' };

      await getCommissions(req, res, next);

      expect(mockCommission.find).toHaveBeenCalledWith({ status: 'pending' });
    });

    it('filters by vendor when provided', async () => {
      req.query = { vendorId: 'vendor1' };

      await getCommissions(req, res, next);

      expect(mockCommission.find).toHaveBeenCalledWith({ vendorId: 'vendor1' });
    });

    it('filters by date range when provided', async () => {
      req.query = {
        startDate: '2023-01-01',
        endDate: '2023-01-31',
      };

      await getCommissions(req, res, next);

      expect(mockCommission.find).toHaveBeenCalledWith({
        'period.startDate': { $gte: new Date('2023-01-01') },
        'period.endDate': { $lte: new Date('2023-01-31') },
      });
    });

    it('handles pagination correctly', async () => {
      req.query = { page: '2', limit: '5' };

      await getCommissions(req, res, next);

      const mockQuery = mockCommission.find.mock.results[0].value;
      expect(mockQuery.skip).toHaveBeenCalledWith(5);
      expect(mockQuery.limit).toHaveBeenCalledWith(5);
    });
  });

  describe('approveCommission', () => {
    const mockCommission = {
      _id: 'comm1',
      status: 'calculated',
      save: jest.fn().mockResolvedThis(),
    };

    beforeEach(() => {
      mockCommission.findById.mockResolvedValue(mockCommission);
    });

    it('approves a commission successfully', async () => {
      req.params = { id: 'comm1' };

      await approveCommission(req, res, next);

      expect(mockCommission.findById).toHaveBeenCalledWith('comm1');
      expect(mockCommission.status).toBe('approved');
      expect(mockCommission.approvedBy).toBe('admin123');
      expect(mockCommission.approvedAt).toBeInstanceOf(Date);
      expect(mockCommission.save).toHaveBeenCalled();
      expect(mockCommissionHistory.create).toHaveBeenCalled();
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { commission: mockCommission },
      });
    });

    it('returns 404 when commission not found', async () => {
      req.params = { id: 'nonexistent' };
      mockCommission.findById.mockResolvedValue(null);

      await approveCommission(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Commission not found' },
      });
    });

    it('returns 400 when commission already approved', async () => {
      req.params = { id: 'comm1' };
      mockCommission.status = 'approved';

      await approveCommission(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Commission has already been approved or paid' },
      });
    });
  });

  describe('markCommissionAsPaid', () => {
    const mockCommission = {
      _id: 'comm1',
      status: 'approved',
      calculation: { commissionAmount: 100 },
      save: jest.fn().mockResolvedThis(),
    };

    beforeEach(() => {
      mockCommission.findById.mockResolvedValue(mockCommission);
    });

    it('marks commission as paid successfully', async () => {
      req.params = { id: 'comm1' };
      req.body = {
        method: 'bank_transfer',
        transactionId: 'TXN123',
        notes: 'Payment processed',
      };

      await markCommissionAsPaid(req, res, next);

      expect(mockCommission.status).toBe('paid');
      expect(mockCommission.payment).toEqual({
        method: 'bank_transfer',
        transactionId: 'TXN123',
        paidAt: expect.any(Date),
        paidBy: 'admin123',
        notes: 'Payment processed',
      });
      expect(mockCommission.save).toHaveBeenCalled();
      expect(mockCommissionHistory.create).toHaveBeenCalled();

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('validates payment amount matches commission amount', async () => {
      req.params = { id: 'comm1' };
      req.body = {
        method: 'bank_transfer',
        amount: 50, // Less than commission amount
      };

      await markCommissionAsPaid(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Payment amount must match commission amount' },
      });
    });

    it('returns 400 when commission already paid', async () => {
      req.params = { id: 'comm1' };
      mockCommission.status = 'paid';

      await markCommissionAsPaid(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Commission is not in a payable state' },
      });
    });
  });

  describe('disputeCommission', () => {
    const mockCommission = {
      _id: 'comm1',
      status: 'calculated',
      save: jest.fn().mockResolvedThis(),
    };

    beforeEach(() => {
      mockCommission.findById.mockResolvedValue(mockCommission);
    });

    it('disputes commission successfully', async () => {
      req.params = { id: 'comm1' };
      req.body = { notes: 'Commission calculation is incorrect' };

      await disputeCommission(req, res, next);

      expect(mockCommission.status).toBe('disputed');
      expect(mockCommission.disputedBy).toBe('admin123');
      expect(mockCommission.disputedAt).toBeInstanceOf(Date);
      expect(mockCommission.disputeReason).toBe('Commission calculation is incorrect');
      expect(mockCommission.save).toHaveBeenCalled();
      expect(mockCommissionHistory.create).toHaveBeenCalled();

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('requires dispute notes', async () => {
      req.params = { id: 'comm1' };
      req.body = {};

      await disputeCommission(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Dispute reason is required' },
      });
    });
  });

  describe('generateCommission', () => {
    const mockVendor = {
      _id: 'vendor1',
      businessName: 'Test Vendor',
      commissionRate: 0.1,
    };

    beforeEach(() => {
      mockVendor.findById.mockResolvedValue(mockVendor);
      mockCommission.generateForVendor.mockResolvedValue({
        _id: 'newComm1',
        vendorId: 'vendor1',
        status: 'calculated',
      });
    });

    it('generates commission for vendor successfully', async () => {
      req.body = {
        vendorId: 'vendor1',
        startDate: '2023-01-01',
        endDate: '2023-01-31',
      };

      await generateCommission(req, res, next);

      expect(mockVendor.findById).toHaveBeenCalledWith('vendor1');
      expect(mockCommission.generateForVendor).toHaveBeenCalledWith(
        'vendor1',
        '2023-01-01',
        '2023-01-31',
        'admin123'
      );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { commission: expect.any(Object) },
      });
    });

    it('validates required fields', async () => {
      req.body = {
        vendorId: 'vendor1',
        // Missing dates
      };

      await generateCommission(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Vendor ID, start date, and end date are required' },
      });
    });

    it('returns 404 when vendor not found', async () => {
      req.body = {
        vendorId: 'nonexistent',
        startDate: '2023-01-01',
        endDate: '2023-01-31',
      };
      mockVendor.findById.mockResolvedValue(null);

      await generateCommission(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Vendor not found' },
      });
    });
  });

  describe('bulkGenerateCommissions', () => {
    const mockVendors = [
      { _id: 'vendor1', businessName: 'Vendor 1' },
      { _id: 'vendor2', businessName: 'Vendor 2' },
    ];

    beforeEach(() => {
      mockVendor.find.mockResolvedValue(mockVendors);
      mockCommission.generateForVendor
        .mockResolvedValueOnce({ _id: 'comm1', vendorId: 'vendor1' })
        .mockRejectedValueOnce(new Error('Commission already exists'));
    });

    it('generates commissions for all vendors', async () => {
      req.body = {
        startDate: '2023-01-01',
        endDate: '2023-01-31',
        periodType: 'monthly',
      };

      await bulkGenerateCommissions(req, res, next);

      expect(mockVendor.find).toHaveBeenCalledWith({ status: 'active' });
      expect(mockCommission.generateForVendor).toHaveBeenCalledTimes(2);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          results: {
            successful: [expect.any(Object)],
            failed: [
              {
                vendorId: 'vendor2',
                vendorName: 'Vendor 2',
                error: 'Commission already exists',
              },
            ],
          },
          summary: {
            total: 2,
            successful: 1,
            failed: 1,
          },
        },
      });
    });

    it('validates required fields for bulk generation', async () => {
      req.body = {
        // Missing dates
        periodType: 'monthly',
      };

      await bulkGenerateCommissions(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Start date, end date, and period type are required' },
      });
    });

    it('handles case when no active vendors found', async () => {
      req.body = {
        startDate: '2023-01-01',
        endDate: '2023-01-31',
        periodType: 'monthly',
      };
      mockVendor.find.mockResolvedValue([]);

      await bulkGenerateCommissions(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'No active vendors found' },
      });
    });
  });

  describe('error handling', () => {
    it('handles database errors in getCommissions', async () => {
      const error = new Error('Database connection failed');
      mockCommission.find.mockImplementation(() => {
        throw error;
      });

      await getCommissions(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('handles save errors in approveCommission', async () => {
      const mockCommission = {
        _id: 'comm1',
        status: 'calculated',
        save: jest.fn().mockRejectedValue(new Error('Save failed')),
      };
      mockCommission.findById.mockResolvedValue(mockCommission);

      req.params = { id: 'comm1' };

      await approveCommission(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
