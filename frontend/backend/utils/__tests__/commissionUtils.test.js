import { jest } from '@jest/globals';
import { CommissionCalculator, CommissionValidator } from '../commissionUtils.js';

// Mock dependencies
const mockOrder = {
  find: jest.fn(),
};

const mockVendor = {
  findById: jest.fn(),
};

// Mock the models
jest.unstable_mockModule('../models/Order.js', () => ({
  default: mockOrder,
}));

jest.unstable_mockModule('../models/Vendor.js', () => ({
  default: mockVendor,
}));

describe('CommissionCalculator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateCommission', () => {
    it('calculates commission correctly with valid inputs', () => {
      const revenue = 1000;
      const rate = 0.1; // 10%
      
      const result = CommissionCalculator.calculateCommission(revenue, rate);
      
      expect(result).toBe(100);
    });

    it('rounds to 2 decimal places', () => {
      const revenue = 1000.333;
      const rate = 0.1; // 10%
      
      const result = CommissionCalculator.calculateCommission(revenue, rate);
      
      expect(result).toBe(100.03);
    });

    it('handles zero revenue', () => {
      const revenue = 0;
      const rate = 0.1;
      
      const result = CommissionCalculator.calculateCommission(revenue, rate);
      
      expect(result).toBe(0);
    });

    it('handles zero commission rate', () => {
      const revenue = 1000;
      const rate = 0;
      
      const result = CommissionCalculator.calculateCommission(revenue, rate);
      
      expect(result).toBe(0);
    });

    it('throws error for negative revenue', () => {
      const revenue = -100;
      const rate = 0.1;
      
      expect(() => {
        CommissionCalculator.calculateCommission(revenue, rate);
      }).toThrow('Revenue cannot be negative');
    });

    it('throws error for invalid commission rate (negative)', () => {
      const revenue = 1000;
      const rate = -0.1;
      
      expect(() => {
        CommissionCalculator.calculateCommission(revenue, rate);
      }).toThrow('Commission rate must be between 0 and 1');
    });

    it('throws error for invalid commission rate (greater than 1)', () => {
      const revenue = 1000;
      const rate = 1.5;
      
      expect(() => {
        CommissionCalculator.calculateCommission(revenue, rate);
      }).toThrow('Commission rate must be between 0 and 1');
    });

    it('throws error for non-number revenue', () => {
      const revenue = 'not a number';
      const rate = 0.1;
      
      expect(() => {
        CommissionCalculator.calculateCommission(revenue, rate);
      }).toThrow('Revenue and rate must be numbers');
    });

    it('throws error for non-number rate', () => {
      const revenue = 1000;
      const rate = 'not a number';
      
      expect(() => {
        CommissionCalculator.calculateCommission(revenue, rate);
      }).toThrow('Revenue and rate must be numbers');
    });
  });

  describe('validateCommissionRate', () => {
    it('returns true for valid rates', () => {
      expect(CommissionCalculator.validateCommissionRate(0)).toBe(true);
      expect(CommissionCalculator.validateCommissionRate(0.1)).toBe(true);
      expect(CommissionCalculator.validateCommissionRate(0.5)).toBe(true);
      expect(CommissionCalculator.validateCommissionRate(1)).toBe(true);
    });

    it('returns false for invalid rates', () => {
      expect(CommissionCalculator.validateCommissionRate(-0.1)).toBe(false);
      expect(CommissionCalculator.validateCommissionRate(1.1)).toBe(false);
      expect(CommissionCalculator.validateCommissionRate('not a number')).toBe(false);
      expect(CommissionCalculator.validateCommissionRate(null)).toBe(false);
      expect(CommissionCalculator.validateCommissionRate(undefined)).toBe(false);
    });
  });

  describe('calculateVendorCommission', () => {
    const mockVendorData = {
      _id: 'vendor123',
      businessName: 'Test Vendor',
      commissionRate: 0.15,
    };

    const mockOrders = [
      { _id: 'order1', orderNumber: 'ORD001', orderTotal: 100, createdAt: new Date('2023-01-01') },
      { _id: 'order2', orderNumber: 'ORD002', orderTotal: 200, createdAt: new Date('2023-01-02') },
      { _id: 'order3', orderNumber: 'ORD003', orderTotal: 300, createdAt: new Date('2023-01-03') },
    ];

    beforeEach(() => {
      mockVendor.findById.mockResolvedValue(mockVendorData);
      mockOrder.find.mockResolvedValue(mockOrders);
    });

    it('calculates vendor commission correctly', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');

      const result = await CommissionCalculator.calculateVendorCommission(
        'vendor123',
        startDate,
        endDate
      );

      expect(result).toEqual({
        vendorId: 'vendor123',
        vendorName: 'Test Vendor',
        period: {
          startDate,
          endDate,
          duration: 31,
        },
        calculation: {
          totalRevenue: 600,
          commissionRate: 0.15,
          commissionAmount: 90,
          totalOrders: 3,
          avgOrderValue: 200,
        },
        orders: [
          { id: 'order1', orderNumber: 'ORD001', total: 100, createdAt: mockOrders[0].createdAt },
          { id: 'order2', orderNumber: 'ORD002', total: 200, createdAt: mockOrders[1].createdAt },
          { id: 'order3', orderNumber: 'ORD003', total: 300, createdAt: mockOrders[2].createdAt },
        ],
      });
    });

    it('handles no orders scenario', async () => {
      mockOrder.find.mockResolvedValue([]);

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');

      const result = await CommissionCalculator.calculateVendorCommission(
        'vendor123',
        startDate,
        endDate
      );

      expect(result.calculation.totalRevenue).toBe(0);
      expect(result.calculation.totalOrders).toBe(0);
      expect(result.calculation.avgOrderValue).toBe(0);
      expect(result.calculation.commissionAmount).toBe(0);
      expect(result.orders).toEqual([]);
    });

    it('throws error for missing vendor ID', async () => {
      await expect(
        CommissionCalculator.calculateVendorCommission(null, new Date(), new Date())
      ).rejects.toThrow('Vendor ID, start date, and end date are required');
    });

    it('throws error for missing start date', async () => {
      await expect(
        CommissionCalculator.calculateVendorCommission('vendor123', null, new Date())
      ).rejects.toThrow('Vendor ID, start date, and end date are required');
    });

    it('throws error for missing end date', async () => {
      await expect(
        CommissionCalculator.calculateVendorCommission('vendor123', new Date(), null)
      ).rejects.toThrow('Vendor ID, start date, and end date are required');
    });

    it('throws error when start date is after end date', async () => {
      const startDate = new Date('2023-01-31');
      const endDate = new Date('2023-01-01');

      await expect(
        CommissionCalculator.calculateVendorCommission('vendor123', startDate, endDate)
      ).rejects.toThrow('Start date must be before end date');
    });

    it('throws error when vendor is not found', async () => {
      mockVendor.findById.mockResolvedValue(null);

      await expect(
        CommissionCalculator.calculateVendorCommission('nonexistent', new Date(), new Date())
      ).rejects.toThrow('Vendor not found');
    });

    it('calls Order.find with correct parameters', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');

      await CommissionCalculator.calculateVendorCommission('vendor123', startDate, endDate);

      expect(mockOrder.find).toHaveBeenCalledWith({
        vendorId: 'vendor123',
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
        status: 'delivered',
        paymentStatus: 'paid',
      });
    });
  });
});

describe('CommissionValidator', () => {
  describe('validateCommissionData', () => {
    const validCommissionData = {
      vendorId: 'vendor123',
      period: {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31'),
      },
      calculation: {
        totalRevenue: 1000,
        commissionRate: 0.1,
        commissionAmount: 100,
      },
    };

    it('validates correct commission data', () => {
      const result = CommissionValidator.validateCommissionData(validCommissionData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('requires vendor ID', () => {
      const data = { ...validCommissionData };
      delete data.vendorId;

      const result = CommissionValidator.validateCommissionData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Vendor ID is required');
    });

    it('requires period start date', () => {
      const data = {
        ...validCommissionData,
        period: { endDate: new Date('2023-01-31') },
      };

      const result = CommissionValidator.validateCommissionData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Period start date is required');
    });

    it('requires period end date', () => {
      const data = {
        ...validCommissionData,
        period: { startDate: new Date('2023-01-01') },
      };

      const result = CommissionValidator.validateCommissionData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Period end date is required');
    });

    it('validates start date before end date', () => {
      const data = {
        ...validCommissionData,
        period: {
          startDate: new Date('2023-01-31'),
          endDate: new Date('2023-01-01'),
        },
      };

      const result = CommissionValidator.validateCommissionData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Start date must be before end date');
    });

    it('validates end date not in future', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const data = {
        ...validCommissionData,
        period: {
          startDate: new Date('2023-01-01'),
          endDate: futureDate,
        },
      };

      const result = CommissionValidator.validateCommissionData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('End date cannot be in the future');
    });

    it('validates total revenue is non-negative number', () => {
      const data = {
        ...validCommissionData,
        calculation: {
          ...validCommissionData.calculation,
          totalRevenue: -100,
        },
      };

      const result = CommissionValidator.validateCommissionData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Total revenue must be a non-negative number');
    });

    it('validates commission rate', () => {
      const data = {
        ...validCommissionData,
        calculation: {
          ...validCommissionData.calculation,
          commissionRate: 1.5,
        },
      };

      const result = CommissionValidator.validateCommissionData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Commission rate must be between 0 and 1');
    });

    it('validates commission amount is non-negative number', () => {
      const data = {
        ...validCommissionData,
        calculation: {
          ...validCommissionData.calculation,
          commissionAmount: -50,
        },
      };

      const result = CommissionValidator.validateCommissionData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Commission amount must be a non-negative number');
    });
  });

  describe('validatePaymentData', () => {
    const validPaymentData = {
      method: 'bank_transfer',
      transactionId: 'TXN123',
      amount: 100,
    };

    it('validates correct payment data', () => {
      const result = CommissionValidator.validatePaymentData(validPaymentData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('validates payment method', () => {
      const data = {
        ...validPaymentData,
        method: 'invalid_method',
      };

      const result = CommissionValidator.validatePaymentData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid payment method');
    });

    it('validates payment amount is positive', () => {
      const data = {
        ...validPaymentData,
        amount: -50,
      };

      const result = CommissionValidator.validatePaymentData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Payment amount must be positive');
    });

    it('validates transaction ID when method requires it', () => {
      const data = {
        ...validPaymentData,
        method: 'bank_transfer',
        transactionId: '',
      };

      const result = CommissionValidator.validatePaymentData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Transaction ID is required for this payment method');
    });
  });
});
