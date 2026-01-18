import { jest } from '@jest/globals';
import { getCommissionReport } from '../reportController.js';

// Mock dependencies
const mockOrder = {
  aggregate: jest.fn(),
};

const mockCommission = {
  find: jest.fn(),
};

const mockMoment = {
  subtract: jest.fn().mockReturnThis(),
  startOf: jest.fn().mockReturnThis(),
  toDate: jest.fn().mockReturnValue(new Date('2023-01-01')),
};

// Mock the models
jest.unstable_mockModule('../models/Order.js', () => ({
  default: mockOrder,
}));

jest.unstable_mockModule('../models/Commission.js', () => ({
  default: mockCommission,
}));

jest.unstable_mockModule('moment', () => ({
  default: jest.fn(() => mockMoment),
}));

jest.unstable_mockModule('mongoose', () => ({
  default: {
    Types: {
      ObjectId: jest.fn((id) => id),
    },
  },
}));

describe('getCommissionReport', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      query: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  const mockCommissionData = [
    {
      _id: 'vendor1',
      vendorName: 'Vendor 1',
      commissionRate: 0.1,
      totalRevenue: 1000,
      totalOrders: 5,
      avgOrderValue: 200,
      commissionOwed: 100,
    },
    {
      _id: 'vendor2',
      vendorName: 'Vendor 2',
      commissionRate: 0.15,
      totalRevenue: 2000,
      totalOrders: 10,
      avgOrderValue: 200,
      commissionOwed: 300,
    },
  ];

  const mockCommissionRecords = [
    {
      status: 'paid',
      calculation: { commissionAmount: 50 },
      payment: { paidAt: new Date('2023-01-15') },
    },
    {
      status: 'pending',
      calculation: { commissionAmount: 50 },
      createdAt: new Date('2023-01-01'),
    },
  ];

  beforeEach(() => {
    mockOrder.aggregate.mockResolvedValue(mockCommissionData);
    mockCommission.find.mockResolvedValue(mockCommissionRecords);
  });

  it('generates commission report with default monthly period', async () => {
    req.query = {};

    await getCommissionReport(req, res, next);

    expect(mockOrder.aggregate).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        period: 'monthly',
        vendors: expect.any(Array),
        summary: expect.objectContaining({
          totalRevenue: 3000,
          totalCommission: 400,
          totalOrders: 15,
          totalVendors: 2,
        }),
      }),
    });
  });

  it('generates commission report with custom date range', async () => {
    req.query = {
      startDate: '2023-01-01',
      endDate: '2023-01-31',
    };

    await getCommissionReport(req, res, next);

    expect(mockOrder.aggregate).toHaveBeenCalledWith([
      {
        $match: expect.objectContaining({
          createdAt: {
            $gte: new Date('2023-01-01'),
            $lte: new Date('2023-01-31'),
          },
        }),
      },
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
    ]);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('filters by vendor when vendorId is provided', async () => {
    req.query = {
      vendorId: 'vendor1',
    };

    await getCommissionReport(req, res, next);

    expect(mockOrder.aggregate).toHaveBeenCalledWith([
      {
        $match: expect.objectContaining({
          vendorId: 'vendor1',
        }),
      },
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
    ]);
  });

  it('filters by payment status when provided', async () => {
    req.query = {
      paymentStatus: 'paid',
    };

    await getCommissionReport(req, res, next);

    expect(mockCommission.find).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'paid',
      })
    );
  });

  it('does not filter by vendor when vendorId is "all"', async () => {
    req.query = {
      vendorId: 'all',
    };

    await getCommissionReport(req, res, next);

    const aggregateCall = mockOrder.aggregate.mock.calls[0][0];
    expect(aggregateCall[0].$match).not.toHaveProperty('vendorId');
  });

  it('handles weekly period correctly', async () => {
    req.query = {
      period: 'weekly',
    };

    await getCommissionReport(req, res, next);

    expect(mockMoment.subtract).toHaveBeenCalledWith(7, 'days');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('handles quarterly period correctly', async () => {
    req.query = {
      period: 'quarterly',
    };

    await getCommissionReport(req, res, next);

    expect(mockMoment.subtract).toHaveBeenCalledWith(3, 'months');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('handles yearly period correctly', async () => {
    req.query = {
      period: 'yearly',
    };

    await getCommissionReport(req, res, next);

    expect(mockMoment.subtract).toHaveBeenCalledWith(1, 'year');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('calculates payment status summary correctly', async () => {
    await getCommissionReport(req, res, next);

    const responseData = res.json.mock.calls[0][0].data;
    const vendor1 = responseData.vendors.find(v => v._id === 'vendor1');
    
    expect(vendor1.paymentStatus).toEqual({
      totalCommissionRecords: 2,
      paidAmount: 50,
      pendingAmount: 50,
      approvedAmount: 0,
      disputedAmount: 0,
      latestPaymentDate: new Date('2023-01-15'),
      oldestPendingDate: new Date('2023-01-01'),
    });
  });

  it('calculates payment completion rate correctly', async () => {
    await getCommissionReport(req, res, next);

    const responseData = res.json.mock.calls[0][0].data;
    const vendor1 = responseData.vendors.find(v => v._id === 'vendor1');
    
    expect(vendor1.paymentCompletionRate).toBe(50); // 50/100 * 100
  });

  it('includes summary totals with payment status', async () => {
    await getCommissionReport(req, res, next);

    const responseData = res.json.mock.calls[0][0].data;
    
    expect(responseData.summary).toEqual({
      totalRevenue: 3000,
      totalCommission: 400,
      totalOrders: 15,
      totalVendors: 2,
      avgCommissionRate: 0.125, // (0.1 + 0.15) / 2
      avgRevenuePerVendor: 1500, // 3000 / 2
      totalPaidAmount: 100, // 50 * 2 vendors
      totalPendingAmount: 100, // 50 * 2 vendors
      totalApprovedAmount: 0,
      totalDisputedAmount: 0,
      paymentCompletionRate: 25, // 100/400 * 100
      outstandingAmount: 300, // 400 - 100
    });
  });

  it('handles database errors gracefully', async () => {
    const error = new Error('Database connection failed');
    mockOrder.aggregate.mockRejectedValue(error);

    await getCommissionReport(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('handles empty commission data', async () => {
    mockOrder.aggregate.mockResolvedValue([]);

    await getCommissionReport(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        vendors: [],
        summary: expect.objectContaining({
          totalRevenue: 0,
          totalCommission: 0,
          totalOrders: 0,
          totalVendors: 0,
        }),
      }),
    });
  });

  it('handles commission records with disputed status', async () => {
    const disputedRecords = [
      {
        status: 'disputed',
        calculation: { commissionAmount: 75 },
        createdAt: new Date('2023-01-01'),
      },
    ];
    
    mockCommission.find.mockResolvedValue(disputedRecords);

    await getCommissionReport(req, res, next);

    const responseData = res.json.mock.calls[0][0].data;
    const vendor1 = responseData.vendors.find(v => v._id === 'vendor1');
    
    expect(vendor1.paymentStatus.disputedAmount).toBe(75);
  });

  it('handles commission records with approved status', async () => {
    const approvedRecords = [
      {
        status: 'approved',
        calculation: { commissionAmount: 60 },
        approvedAt: new Date('2023-01-10'),
      },
    ];
    
    mockCommission.find.mockResolvedValue(approvedRecords);

    await getCommissionReport(req, res, next);

    const responseData = res.json.mock.calls[0][0].data;
    const vendor1 = responseData.vendors.find(v => v._id === 'vendor1');
    
    expect(vendor1.paymentStatus.approvedAmount).toBe(60);
    expect(vendor1.paymentStatus.oldestPendingDate).toEqual(new Date('2023-01-10'));
  });

  it('includes date range in response for custom period', async () => {
    req.query = {
      startDate: '2023-01-01',
      endDate: '2023-01-31',
    };

    await getCommissionReport(req, res, next);

    const responseData = res.json.mock.calls[0][0].data;
    
    expect(responseData.dateRange).toEqual({
      start: '2023-01-01',
      end: '2023-01-31',
    });
  });

  it('uses default date range when no custom dates provided', async () => {
    req.query = { period: 'monthly' };

    await getCommissionReport(req, res, next);

    const responseData = res.json.mock.calls[0][0].data;
    
    expect(responseData.dateRange.start).toEqual(new Date('2023-01-01'));
    expect(responseData.dateRange.end).toBeInstanceOf(Date);
  });
});
