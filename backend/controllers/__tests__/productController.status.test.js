import { jest } from '@jest/globals';
import { getProducts } from '../productController.js';

// Mock the Product and Vendor models
const mockProduct = {
  find: jest.fn(),
  countDocuments: jest.fn(),
};

const mockVendor = {
  findOne: jest.fn(),
};

// Mock mongoose
const mockMongoose = {
  Types: {
    ObjectId: jest.fn(),
  },
};

// Mock the models
jest.unstable_mockModule('../../models/Product.js', () => ({
  default: mockProduct,
}));

jest.unstable_mockModule('../../models/Vendor.js', () => ({
  default: mockVendor,
}));

jest.unstable_mockModule('mongoose', () => ({
  default: mockMongoose,
}));

describe('ProductController - Status Filter', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      query: {
        page: 1,
        limit: 10,
        sort: '-createdAt',
      },
      user: { _id: 'user123', role: 'superadmin' },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('Status Filter - Active Products', () => {
    it('should filter products by active status', async () => {
      const mockProducts = [
        { _id: '1', name: 'Active Product 1', status: 'active', stock: 10 },
        { _id: '2', name: 'Active Product 2', status: 'active', stock: 5 },
      ];

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockProducts),
      };

      mockProduct.find.mockReturnValue(mockQuery);
      mockProduct.countDocuments.mockResolvedValue(2);

      req.query.status = 'active';

      await getProducts(req, res, next);

      // Verify that Product.find was called with status: 'active'
      expect(mockProduct.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
        })
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          products: mockProducts,
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            pages: 1,
          },
        },
      });
    });
  });

  describe('Status Filter - Inactive Products', () => {
    it('should filter products by inactive status', async () => {
      const mockProducts = [
        { _id: '3', name: 'Inactive Product 1', status: 'inactive', stock: 0 },
        { _id: '4', name: 'Inactive Product 2', status: 'inactive', stock: 3 },
      ];

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockProducts),
      };

      mockProduct.find.mockReturnValue(mockQuery);
      mockProduct.countDocuments.mockResolvedValue(2);

      req.query.status = 'inactive';

      await getProducts(req, res, next);

      // Verify that Product.find was called with status: 'inactive'
      expect(mockProduct.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'inactive',
        })
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          products: mockProducts,
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            pages: 1,
          },
        },
      });
    });
  });

  describe('Status Filter - Draft Products', () => {
    it('should filter products by draft status', async () => {
      const mockProducts = [
        { _id: '5', name: 'Draft Product 1', status: 'draft', stock: 0 },
        { _id: '6', name: 'Draft Product 2', status: 'draft', stock: 10 },
      ];

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockProducts),
      };

      mockProduct.find.mockReturnValue(mockQuery);
      mockProduct.countDocuments.mockResolvedValue(2);

      req.query.status = 'draft';

      await getProducts(req, res, next);

      // Verify that Product.find was called with status: 'draft'
      expect(mockProduct.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'draft',
        })
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          products: mockProducts,
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            pages: 1,
          },
        },
      });
    });
  });

  describe('Status Filter - Out of Stock Products', () => {
    it('should filter products by out_of_stock status using stock query', async () => {
      const mockProducts = [
        { _id: '7', name: 'Out of Stock Product 1', status: 'active', stock: 0 },
        { _id: '8', name: 'Out of Stock Product 2', status: 'out_of_stock', stock: 0 },
      ];

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockProducts),
      };

      mockProduct.find.mockReturnValue(mockQuery);
      mockProduct.countDocuments.mockResolvedValue(2);

      req.query.status = 'out_of_stock';

      await getProducts(req, res, next);

      // Verify that Product.find was called with stock: { $lte: 0 }
      expect(mockProduct.find).toHaveBeenCalledWith(
        expect.objectContaining({
          stock: { $lte: 0 },
        })
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          products: mockProducts,
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            pages: 1,
          },
        },
      });
    });
  });

  describe('Status Filter - All Products (Default)', () => {
    it('should return all non-archived products when status is "all"', async () => {
      const mockProducts = [
        { _id: '1', name: 'Active Product', status: 'active', stock: 10 },
        { _id: '2', name: 'Inactive Product', status: 'inactive', stock: 5 },
        { _id: '3', name: 'Draft Product', status: 'draft', stock: 0 },
      ];

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockProducts),
      };

      mockProduct.find.mockReturnValue(mockQuery);
      mockProduct.countDocuments.mockResolvedValue(3);

      req.query.status = 'all';

      await getProducts(req, res, next);

      // Verify that Product.find was called with default query (excluding archived)
      expect(mockProduct.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: { $ne: 'archived' },
        })
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          products: mockProducts,
          pagination: {
            page: 1,
            limit: 10,
            total: 3,
            pages: 1,
          },
        },
      });
    });

    it('should return all non-archived products when status is not provided', async () => {
      const mockProducts = [
        { _id: '1', name: 'Active Product', status: 'active', stock: 10 },
        { _id: '2', name: 'Inactive Product', status: 'inactive', stock: 5 },
      ];

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockProducts),
      };

      mockProduct.find.mockReturnValue(mockQuery);
      mockProduct.countDocuments.mockResolvedValue(2);

      // No status filter provided
      delete req.query.status;

      await getProducts(req, res, next);

      // Verify that Product.find was called with default query (excluding archived)
      expect(mockProduct.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: { $ne: 'archived' },
        })
      );

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Status Filter - Combined with Search', () => {
    it('should filter by status and search term together', async () => {
      const mockProducts = [
        { _id: '1', name: 'Active Apple Product', status: 'active', stock: 10 },
      ];

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockProducts),
      };

      mockProduct.find.mockReturnValue(mockQuery);
      mockProduct.countDocuments.mockResolvedValue(1);

      req.query.status = 'active';
      req.query.search = 'apple';

      await getProducts(req, res, next);

      // Verify that Product.find was called with both status and search filters
      expect(mockProduct.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
          $or: expect.arrayContaining([
            expect.objectContaining({ name: expect.any(Object) }),
            expect.objectContaining({ description: expect.any(Object) }),
            expect.objectContaining({ category: expect.any(Object) }),
          ]),
        })
      );

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Status Filter - Vendor Role', () => {
    it('should filter by status for vendor users', async () => {
      const mockProducts = [
        { _id: '1', name: 'Vendor Active Product', status: 'active', stock: 10 },
      ];

      const mockVendorInstance = {
        _id: 'vendor123',
      };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockProducts),
        select: jest.fn().mockReturnThis(),
      };

      mockVendor.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockVendorInstance),
      });

      mockProduct.find.mockReturnValue(mockQuery);
      mockProduct.countDocuments.mockResolvedValue(1);

      req.user.role = 'vendor';
      req.query.status = 'active';

      await getProducts(req, res, next);

      // Verify that Product.find was called with both vendorId and status
      expect(mockProduct.find).toHaveBeenCalledWith(
        expect.objectContaining({
          vendorId: 'vendor123',
          status: 'active',
        })
      );

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Status Filter - Archived Products Excluded', () => {
    it('should always exclude archived products unless explicitly requested', async () => {
      const mockProducts = [
        { _id: '1', name: 'Active Product', status: 'active', stock: 10 },
      ];

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockProducts),
      };

      mockProduct.find.mockReturnValue(mockQuery);
      mockProduct.countDocuments.mockResolvedValue(1);

      req.query.status = 'active';

      await getProducts(req, res, next);

      // Verify that archived products are not included
      const findCall = mockProduct.find.mock.calls[0][0];
      expect(findCall.status).toBe('active');
      // The status filter should override the default $ne: 'archived'

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});

