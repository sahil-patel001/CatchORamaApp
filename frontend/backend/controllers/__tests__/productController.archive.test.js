import { jest } from '@jest/globals';
import {
  archiveProduct,
  unarchiveProduct,
  getArchivedProducts,
  checkProductOrderLinkage,
  deleteProduct,
} from '../productController.js';

// Mock the Product and Vendor models
const mockProduct = {
  findById: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  archive: jest.fn(),
  unarchive: jest.fn(),
  populate: jest.fn(),
  deleteOne: jest.fn(),
};

const mockVendor = {
  findOne: jest.fn(),
};

const mockOrder = {
  find: jest.fn(),
};

// Mock the models
jest.unstable_mockModule('../models/Product.js', () => ({
  default: mockProduct,
}));

jest.unstable_mockModule('../models/Vendor.js', () => ({
  default: mockVendor,
}));

// Mock dynamic import for Order model
const mockImport = jest.fn();
mockImport.mockResolvedValue({ default: mockOrder });
global.import = mockImport;

describe('ProductController - Archive Functions', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: { id: 'product123' },
      user: { _id: 'user123', role: 'vendor' },
      query: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('archiveProduct', () => {
    it('should archive a product successfully', async () => {
      const mockProductInstance = {
        _id: 'product123',
        name: 'Test Product',
        vendorId: 'vendor123',
        archive: jest.fn().mockResolvedValue(),
        populate: jest.fn().mockResolvedValue({
          _id: 'product123',
          name: 'Test Product',
          status: 'archived',
        }),
      };

      const mockVendorInstance = {
        _id: 'vendor123',
      };

      mockProduct.findById.mockResolvedValue(mockProductInstance);
      mockVendor.findOne.mockResolvedValue(mockVendorInstance);

      await archiveProduct(req, res, next);

      expect(mockProduct.findById).toHaveBeenCalledWith('product123');
      expect(mockVendor.findOne).toHaveBeenCalledWith({ userId: 'user123' });
      expect(mockProductInstance.archive).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          product: {
            _id: 'product123',
            name: 'Test Product',
            status: 'archived',
          },
        },
        message: 'Product archived successfully',
      });
    });

    it('should return 404 if product not found', async () => {
      mockProduct.findById.mockResolvedValue(null);

      await archiveProduct(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Product not found',
        },
      });
    });

    it('should return 403 if vendor not authorized', async () => {
      const mockProductInstance = {
        _id: 'product123',
        vendorId: 'different_vendor',
      };

      const mockVendorInstance = {
        _id: 'vendor123',
      };

      mockProduct.findById.mockResolvedValue(mockProductInstance);
      mockVendor.findOne.mockResolvedValue(mockVendorInstance);

      await archiveProduct(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Not authorized to archive this product',
        },
      });
    });

    it('should allow super admin to archive any product', async () => {
      req.user.role = 'superadmin';

      const mockProductInstance = {
        _id: 'product123',
        name: 'Test Product',
        vendorId: 'vendor123',
        archive: jest.fn().mockResolvedValue(),
        populate: jest.fn().mockResolvedValue({
          _id: 'product123',
          name: 'Test Product',
          status: 'archived',
        }),
      };

      mockProduct.findById.mockResolvedValue(mockProductInstance);

      await archiveProduct(req, res, next);

      expect(mockVendor.findOne).not.toHaveBeenCalled();
      expect(mockProductInstance.archive).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('unarchiveProduct', () => {
    it('should unarchive a product successfully', async () => {
      const mockProductInstance = {
        _id: 'product123',
        name: 'Test Product',
        vendorId: 'vendor123',
        unarchive: jest.fn().mockResolvedValue(),
        populate: jest.fn().mockResolvedValue({
          _id: 'product123',
          name: 'Test Product',
          status: 'active',
        }),
      };

      const mockVendorInstance = {
        _id: 'vendor123',
      };

      mockProduct.findById.mockResolvedValue(mockProductInstance);
      mockVendor.findOne.mockResolvedValue(mockVendorInstance);

      await unarchiveProduct(req, res, next);

      expect(mockProductInstance.unarchive).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          product: {
            _id: 'product123',
            name: 'Test Product',
            status: 'active',
          },
        },
        message: 'Product unarchived successfully',
      });
    });
  });

  describe('getArchivedProducts', () => {
    it('should get archived products for vendor', async () => {
      req.query = { page: 1, limit: 10 };

      const mockVendorInstance = {
        _id: 'vendor123',
      };

      const mockProducts = [
        { _id: 'product1', name: 'Archived Product 1', status: 'archived' },
        { _id: 'product2', name: 'Archived Product 2', status: 'archived' },
      ];

      mockVendor.findOne.mockResolvedValue(mockVendorInstance);
      
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockProducts),
      };

      mockProduct.find.mockReturnValue(mockQuery);
      mockProduct.countDocuments.mockResolvedValue(2);

      await getArchivedProducts(req, res, next);

      expect(mockProduct.find).toHaveBeenCalledWith({
        status: 'archived',
        vendorId: 'vendor123',
      });
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

    it('should get archived products for super admin (all vendors)', async () => {
      req.user.role = 'superadmin';
      req.query = { page: 1, limit: 10 };

      const mockProducts = [
        { _id: 'product1', name: 'Archived Product 1', status: 'archived' },
        { _id: 'product2', name: 'Archived Product 2', status: 'archived' },
      ];

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockProducts),
      };

      mockProduct.find.mockReturnValue(mockQuery);
      mockProduct.countDocuments.mockResolvedValue(2);

      await getArchivedProducts(req, res, next);

      expect(mockProduct.find).toHaveBeenCalledWith({
        status: 'archived',
      });
      expect(mockVendor.findOne).not.toHaveBeenCalled();
    });

    it('should handle search and category filters', async () => {
      req.query = {
        page: 1,
        limit: 10,
        search: 'test product',
        category: 'electronics',
      };

      const mockVendorInstance = {
        _id: 'vendor123',
      };

      mockVendor.findOne.mockResolvedValue(mockVendorInstance);

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };

      mockProduct.find.mockReturnValue(mockQuery);
      mockProduct.countDocuments.mockResolvedValue(0);

      await getArchivedProducts(req, res, next);

      expect(mockProduct.find).toHaveBeenCalledWith({
        status: 'archived',
        vendorId: 'vendor123',
        $or: [
          { name: { $regex: 'test product', $options: 'i' } },
          { description: { $regex: 'test product', $options: 'i' } },
          { category: { $regex: 'test product', $options: 'i' } },
        ],
        category: { $regex: 'electronics', $options: 'i' },
      });
    });
  });

  describe('checkProductOrderLinkage', () => {
    it('should return linked orders when product has orders', async () => {
      const mockProductInstance = {
        _id: 'product123',
        vendorId: 'vendor123',
      };

      const mockVendorInstance = {
        _id: 'vendor123',
      };

      const mockLinkedOrders = [
        { orderNumber: 'INV-000001', status: 'pending', createdAt: new Date() },
        { orderNumber: 'INV-000002', status: 'shipped', createdAt: new Date() },
      ];

      mockProduct.findById.mockResolvedValue(mockProductInstance);
      mockVendor.findOne.mockResolvedValue(mockVendorInstance);

      const mockOrderQuery = {
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockLinkedOrders),
      };

      mockOrder.find.mockReturnValue(mockOrderQuery);

      // Mock the dynamic import
      mockImport.mockResolvedValue({ default: mockOrder });

      await checkProductOrderLinkage(req, res, next);

      expect(mockOrder.find).toHaveBeenCalledWith({
        'items.productId': 'product123',
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          hasLinkedOrders: true,
          linkedOrdersCount: 2,
          linkedOrders: expect.arrayContaining([
            expect.objectContaining({
              orderNumber: 'INV-000001',
              status: 'pending',
            }),
            expect.objectContaining({
              orderNumber: 'INV-000002',
              status: 'shipped',
            }),
          ]),
        },
      });
    });

    it('should return no linked orders when product has no orders', async () => {
      const mockProductInstance = {
        _id: 'product123',
        vendorId: 'vendor123',
      };

      const mockVendorInstance = {
        _id: 'vendor123',
      };

      mockProduct.findById.mockResolvedValue(mockProductInstance);
      mockVendor.findOne.mockResolvedValue(mockVendorInstance);

      const mockOrderQuery = {
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };

      mockOrder.find.mockReturnValue(mockOrderQuery);
      mockImport.mockResolvedValue({ default: mockOrder });

      await checkProductOrderLinkage(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          hasLinkedOrders: false,
          linkedOrdersCount: 0,
          linkedOrders: [],
        },
      });
    });
  });

  describe('deleteProduct with order linkage check', () => {
    it('should prevent deletion when product has linked orders', async () => {
      const mockProductInstance = {
        _id: 'product123',
        vendorId: 'vendor123',
      };

      const mockVendorInstance = {
        _id: 'vendor123',
      };

      const mockLinkedOrders = [
        { orderNumber: 'INV-000001', status: 'pending' },
      ];

      mockProduct.findById.mockResolvedValue(mockProductInstance);
      mockVendor.findOne.mockResolvedValue(mockVendorInstance);
      mockOrder.find.mockResolvedValue(mockLinkedOrders);
      mockImport.mockResolvedValue({ default: mockOrder });

      await deleteProduct(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Cannot delete product that is linked to existing orders',
          code: 'PRODUCT_HAS_ORDERS',
          linkedOrdersCount: 1,
        },
      });
    });

    it('should allow deletion when product has no linked orders', async () => {
      const mockProductInstance = {
        _id: 'product123',
        vendorId: 'vendor123',
        deleteOne: jest.fn().mockResolvedValue(),
      };

      const mockVendorInstance = {
        _id: 'vendor123',
      };

      mockProduct.findById.mockResolvedValue(mockProductInstance);
      mockVendor.findOne.mockResolvedValue(mockVendorInstance);
      mockOrder.find.mockResolvedValue([]);
      mockImport.mockResolvedValue({ default: mockOrder });

      await deleteProduct(req, res, next);

      expect(mockProductInstance.deleteOne).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Product deleted successfully',
      });
    });
  });
});
