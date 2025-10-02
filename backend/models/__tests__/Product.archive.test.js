import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Product from '../Product.js';
import Vendor from '../Vendor.js';

describe('Product Model - Archive Methods', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Product.deleteMany({});
    await Vendor.deleteMany({});
  });

  describe('archive method', () => {
    it('should archive a product successfully', async () => {
      // Create a vendor first
      const vendor = new Vendor({
        businessName: 'Test Vendor',
        email: 'test@vendor.com',
        phone: '1234567890',
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country',
        },
      });
      await vendor.save();

      // Create a product
      const product = new Product({
        vendorId: vendor._id,
        name: 'Test Product',
        description: 'Test Description',
        price: 100,
        stock: 10,
        category: 'Electronics',
        status: 'active',
      });
      await product.save();

      // Archive the product
      await product.archive();

      expect(product.status).toBe('archived');
      
      // Verify it's saved in the database
      const savedProduct = await Product.findById(product._id);
      expect(savedProduct.status).toBe('archived');
    });

    it('should maintain other product properties when archiving', async () => {
      const vendor = new Vendor({
        businessName: 'Test Vendor',
        email: 'test@vendor.com',
        phone: '1234567890',
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country',
        },
      });
      await vendor.save();

      const originalData = {
        vendorId: vendor._id,
        name: 'Test Product',
        description: 'Test Description',
        price: 100,
        stock: 10,
        category: 'Electronics',
        status: 'active',
      };

      const product = new Product(originalData);
      await product.save();

      await product.archive();

      expect(product.name).toBe(originalData.name);
      expect(product.description).toBe(originalData.description);
      expect(product.price).toBe(originalData.price);
      expect(product.stock).toBe(originalData.stock);
      expect(product.category).toBe(originalData.category);
      expect(product.status).toBe('archived');
    });
  });

  describe('unarchive method', () => {
    it('should unarchive a product successfully', async () => {
      const vendor = new Vendor({
        businessName: 'Test Vendor',
        email: 'test@vendor.com',
        phone: '1234567890',
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country',
        },
      });
      await vendor.save();

      const product = new Product({
        vendorId: vendor._id,
        name: 'Test Product',
        description: 'Test Description',
        price: 100,
        stock: 10,
        category: 'Electronics',
        status: 'archived',
      });
      await product.save();

      // Unarchive the product
      await product.unarchive();

      expect(product.status).toBe('active');
      
      // Verify it's saved in the database
      const savedProduct = await Product.findById(product._id);
      expect(savedProduct.status).toBe('active');
    });

    it('should maintain other product properties when unarchiving', async () => {
      const vendor = new Vendor({
        businessName: 'Test Vendor',
        email: 'test@vendor.com',
        phone: '1234567890',
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country',
        },
      });
      await vendor.save();

      const originalData = {
        vendorId: vendor._id,
        name: 'Test Product',
        description: 'Test Description',
        price: 100,
        stock: 10,
        category: 'Electronics',
        status: 'archived',
      };

      const product = new Product(originalData);
      await product.save();

      await product.unarchive();

      expect(product.name).toBe(originalData.name);
      expect(product.description).toBe(originalData.description);
      expect(product.price).toBe(originalData.price);
      expect(product.stock).toBe(originalData.stock);
      expect(product.category).toBe(originalData.category);
      expect(product.status).toBe('active');
    });
  });

  describe('status enum validation', () => {
    it('should accept archived status', async () => {
      const vendor = new Vendor({
        businessName: 'Test Vendor',
        email: 'test@vendor.com',
        phone: '1234567890',
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country',
        },
      });
      await vendor.save();

      const product = new Product({
        vendorId: vendor._id,
        name: 'Test Product',
        description: 'Test Description',
        price: 100,
        stock: 10,
        category: 'Electronics',
        status: 'archived',
      });

      await expect(product.save()).resolves.toBeDefined();
      expect(product.status).toBe('archived');
    });

    it('should reject invalid status', async () => {
      const vendor = new Vendor({
        businessName: 'Test Vendor',
        email: 'test@vendor.com',
        phone: '1234567890',
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country',
        },
      });
      await vendor.save();

      const product = new Product({
        vendorId: vendor._id,
        name: 'Test Product',
        description: 'Test Description',
        price: 100,
        stock: 10,
        category: 'Electronics',
        status: 'invalid_status',
      });

      await expect(product.save()).rejects.toThrow();
    });
  });

  describe('search method with archived products', () => {
    beforeEach(async () => {
      const vendor = new Vendor({
        businessName: 'Test Vendor',
        email: 'test@vendor.com',
        phone: '1234567890',
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country',
        },
      });
      await vendor.save();

      // Create active product
      const activeProduct = new Product({
        vendorId: vendor._id,
        name: 'Active Product',
        description: 'Active product description',
        price: 100,
        stock: 10,
        category: 'Electronics',
        status: 'active',
      });
      await activeProduct.save();

      // Create archived product
      const archivedProduct = new Product({
        vendorId: vendor._id,
        name: 'Archived Product',
        description: 'Archived product description',
        price: 200,
        stock: 5,
        category: 'Electronics',
        status: 'archived',
      });
      await archivedProduct.save();
    });

    it('should exclude archived products by default', async () => {
      const results = await Product.search('Product');
      
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Active Product');
      expect(results[0].status).toBe('active');
    });

    it('should include archived products when includeArchived is true', async () => {
      const results = await Product.search('Product', { includeArchived: true });
      
      expect(results).toHaveLength(2);
      const names = results.map(p => p.name).sort();
      expect(names).toEqual(['Active Product', 'Archived Product']);
    });
  });

  describe('findByVendor with archived products', () => {
    let vendorId;

    beforeEach(async () => {
      const vendor = new Vendor({
        businessName: 'Test Vendor',
        email: 'test@vendor.com',
        phone: '1234567890',
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country',
        },
      });
      await vendor.save();
      vendorId = vendor._id;

      // Create active product
      const activeProduct = new Product({
        vendorId,
        name: 'Active Product',
        description: 'Active product description',
        price: 100,
        stock: 10,
        category: 'Electronics',
        status: 'active',
      });
      await activeProduct.save();

      // Create archived product
      const archivedProduct = new Product({
        vendorId,
        name: 'Archived Product',
        description: 'Archived product description',
        price: 200,
        stock: 5,
        category: 'Electronics',
        status: 'archived',
      });
      await archivedProduct.save();
    });

    it('should find products by vendor including archived when status is specified', async () => {
      const archivedProducts = await Product.findByVendor(vendorId, { status: 'archived' });
      
      expect(archivedProducts).toHaveLength(1);
      expect(archivedProducts[0].name).toBe('Archived Product');
      expect(archivedProducts[0].status).toBe('archived');
    });

    it('should find active products by vendor when status is active', async () => {
      const activeProducts = await Product.findByVendor(vendorId, { status: 'active' });
      
      expect(activeProducts).toHaveLength(1);
      expect(activeProducts[0].name).toBe('Active Product');
      expect(activeProducts[0].status).toBe('active');
    });

    it('should find all products by vendor when no status filter', async () => {
      const allProducts = await Product.findByVendor(vendorId);
      
      expect(allProducts).toHaveLength(2);
    });
  });
});
