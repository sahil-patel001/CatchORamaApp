import axios from 'axios';
import {
  archiveProduct,
  unarchiveProduct,
  getArchivedProducts,
  checkProductOrderLinkage,
} from '../productService';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock environment variable
const mockApiBaseUrl = 'http://localhost:5001/api/v1/products';
process.env.VITE_API_BASE_URL = 'http://localhost:5001/api/v1';

describe('ProductService - Archive Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('archiveProduct', () => {
    it('should archive a product successfully', async () => {
      const productId = '123';
      const mockResponse = {
        data: {
          success: true,
          message: 'Product archived successfully',
          data: {
            product: {
              _id: productId,
              name: 'Test Product',
              status: 'archived',
            },
          },
        },
      };

      mockedAxios.patch.mockResolvedValue(mockResponse);

      const result = await archiveProduct(productId);

      expect(mockedAxios.patch).toHaveBeenCalledWith(
        `${mockApiBaseUrl}/${productId}/archive`,
        {},
        { withCredentials: true }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle archive error', async () => {
      const productId = '123';
      const errorMessage = 'Archive failed';

      mockedAxios.patch.mockRejectedValue(new Error(errorMessage));

      await expect(archiveProduct(productId)).rejects.toThrow(errorMessage);
    });
  });

  describe('unarchiveProduct', () => {
    it('should unarchive a product successfully', async () => {
      const productId = '123';
      const mockResponse = {
        data: {
          success: true,
          message: 'Product unarchived successfully',
          data: {
            product: {
              _id: productId,
              name: 'Test Product',
              status: 'active',
            },
          },
        },
      };

      mockedAxios.patch.mockResolvedValue(mockResponse);

      const result = await unarchiveProduct(productId);

      expect(mockedAxios.patch).toHaveBeenCalledWith(
        `${mockApiBaseUrl}/${productId}/unarchive`,
        {},
        { withCredentials: true }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle unarchive error', async () => {
      const productId = '123';
      const errorMessage = 'Unarchive failed';

      mockedAxios.patch.mockRejectedValue(new Error(errorMessage));

      await expect(unarchiveProduct(productId)).rejects.toThrow(errorMessage);
    });
  });

  describe('getArchivedProducts', () => {
    it('should fetch archived products successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            products: [
              {
                _id: '1',
                name: 'Archived Product 1',
                status: 'archived',
              },
              {
                _id: '2',
                name: 'Archived Product 2',
                status: 'archived',
              },
            ],
            pagination: {
              page: 1,
              limit: 10,
              total: 2,
              pages: 1,
            },
          },
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await getArchivedProducts();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${mockApiBaseUrl}/archived`,
        {
          params: {},
          withCredentials: true,
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should fetch archived products with parameters', async () => {
      const params = {
        page: 2,
        limit: 5,
        search: 'test',
        category: 'electronics',
      };

      const mockResponse = {
        data: {
          success: true,
          data: {
            products: [],
            pagination: {
              page: 2,
              limit: 5,
              total: 0,
              pages: 0,
            },
          },
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await getArchivedProducts(params);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${mockApiBaseUrl}/archived`,
        {
          params,
          withCredentials: true,
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle fetch archived products error', async () => {
      const errorMessage = 'Failed to fetch archived products';

      mockedAxios.get.mockRejectedValue(new Error(errorMessage));

      await expect(getArchivedProducts()).rejects.toThrow(errorMessage);
    });
  });

  describe('checkProductOrderLinkage', () => {
    it('should check product order linkage successfully', async () => {
      const productId = '123';
      const mockResponse = {
        data: {
          success: true,
          data: {
            hasLinkedOrders: true,
            linkedOrdersCount: 3,
            linkedOrders: [
              {
                orderNumber: 'INV-000001',
                status: 'pending',
                createdAt: '2023-01-01T00:00:00Z',
              },
              {
                orderNumber: 'INV-000002',
                status: 'shipped',
                createdAt: '2023-01-02T00:00:00Z',
              },
            ],
          },
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await checkProductOrderLinkage(productId);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${mockApiBaseUrl}/${productId}/order-linkage`,
        { withCredentials: true }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should return no linked orders when product is not linked', async () => {
      const productId = '123';
      const mockResponse = {
        data: {
          success: true,
          data: {
            hasLinkedOrders: false,
            linkedOrdersCount: 0,
            linkedOrders: [],
          },
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await checkProductOrderLinkage(productId);

      expect(result.data.hasLinkedOrders).toBe(false);
      expect(result.data.linkedOrdersCount).toBe(0);
      expect(result.data.linkedOrders).toHaveLength(0);
    });

    it('should handle check order linkage error', async () => {
      const productId = '123';
      const errorMessage = 'Failed to check order linkage';

      mockedAxios.get.mockRejectedValue(new Error(errorMessage));

      await expect(checkProductOrderLinkage(productId)).rejects.toThrow(errorMessage);
    });
  });

  describe('API endpoint construction', () => {
    it('should use correct endpoints for all archive functions', async () => {
      const productId = 'test-id';
      
      // Mock successful responses
      mockedAxios.patch.mockResolvedValue({ data: {} });
      mockedAxios.get.mockResolvedValue({ data: {} });

      // Test all endpoints
      await archiveProduct(productId);
      expect(mockedAxios.patch).toHaveBeenCalledWith(
        `${mockApiBaseUrl}/${productId}/archive`,
        {},
        { withCredentials: true }
      );

      await unarchiveProduct(productId);
      expect(mockedAxios.patch).toHaveBeenCalledWith(
        `${mockApiBaseUrl}/${productId}/unarchive`,
        {},
        { withCredentials: true }
      );

      await getArchivedProducts();
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${mockApiBaseUrl}/archived`,
        { params: {}, withCredentials: true }
      );

      await checkProductOrderLinkage(productId);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${mockApiBaseUrl}/${productId}/order-linkage`,
        { withCredentials: true }
      );
    });
  });
});
