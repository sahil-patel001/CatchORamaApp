import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ProductManagement } from '../ProductManagement';
import * as productService from '../../../services/productService';

// Mock the product service
jest.mock('../../../services/productService');
const mockProductService = productService as jest.Mocked<typeof productService>;

// Mock the toast hook
jest.mock('../../../hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Mock the utils
jest.mock('../../../lib/utils', () => ({
  formatDate: (date: string) => new Date(date).toLocaleDateString(),
  getStockStatus: (stock: number, threshold: number) => 
    stock === 0 ? 'out_of_stock' : stock <= threshold ? 'low_stock' : 'in_stock',
  getStockBadgeVariant: (status: string) => 'default',
  getLowStockThreshold: (product: any) => product.inventory?.lowStockThreshold || 10,
}));

const mockProducts = [
  {
    _id: '1',
    name: 'Test Product 1',
    price: 100,
    stock: 5,
    category: 'Electronics',
    status: 'active',
    images: [{ url: 'test-image.jpg', alt: 'Test Image', isPrimary: true }],
    createdAt: '2023-01-01T00:00:00Z',
    inventory: { lowStockThreshold: 10 },
  },
  {
    _id: '2',
    name: 'Test Product 2',
    price: 200,
    stock: 15,
    category: 'Books',
    status: 'active',
    images: [],
    createdAt: '2023-01-02T00:00:00Z',
    inventory: { lowStockThreshold: 5 },
  },
];

const mockOrderLinkageResponse = {
  data: {
    hasLinkedOrders: true,
    linkedOrdersCount: 3,
    linkedOrders: [
      { orderNumber: 'INV-000001', status: 'pending' },
      { orderNumber: 'INV-000002', status: 'shipped' },
      { orderNumber: 'INV-000003', status: 'delivered' },
    ],
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
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('ProductManagement - Delete/Archive Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProductService.getProducts.mockResolvedValue({
      data: { products: mockProducts },
    });
  });

  it('shows delete confirmation dialog when product has no linked orders', async () => {
    mockProductService.checkProductOrderLinkage.mockResolvedValue({
      data: {
        hasLinkedOrders: false,
        linkedOrdersCount: 0,
        linkedOrders: [],
      },
    });

    render(<ProductManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Delete Product')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete Test Product 1/)).toBeInTheDocument();
    });
  });

  it('shows order linkage warning dialog when product has linked orders', async () => {
    mockProductService.checkProductOrderLinkage.mockResolvedValue(mockOrderLinkageResponse);

    render(<ProductManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Cannot Delete Product')).toBeInTheDocument();
      expect(screen.getByText(/This product cannot be deleted because it is linked to/)).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // linked orders count
      expect(screen.getByText('existing orders')).toBeInTheDocument();
    });
  });

  it('displays linked order details in warning dialog', async () => {
    mockProductService.checkProductOrderLinkage.mockResolvedValue(mockOrderLinkageResponse);

    render(<ProductManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Recent orders:')).toBeInTheDocument();
      expect(screen.getByText('INV-000001')).toBeInTheDocument();
      expect(screen.getByText('INV-000002')).toBeInTheDocument();
      expect(screen.getByText('INV-000003')).toBeInTheDocument();
      expect(screen.getByText('pending')).toBeInTheDocument();
      expect(screen.getByText('shipped')).toBeInTheDocument();
      expect(screen.getByText('delivered')).toBeInTheDocument();
    });
  });

  it('shows archive option in order linkage dialog', async () => {
    mockProductService.checkProductOrderLinkage.mockResolvedValue(mockOrderLinkageResponse);

    render(<ProductManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Archive Product')).toBeInTheDocument();
      expect(screen.getByText(/To remove this product, you can archive it instead/)).toBeInTheDocument();
    });
  });

  it('calls archive service when archive is confirmed', async () => {
    mockProductService.checkProductOrderLinkage.mockResolvedValue(mockOrderLinkageResponse);
    mockProductService.archiveProduct.mockResolvedValue({});

    render(<ProductManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);
    });

    await waitFor(() => {
      const archiveButton = screen.getByText('Archive Product');
      fireEvent.click(archiveButton);
    });

    await waitFor(() => {
      expect(mockProductService.archiveProduct).toHaveBeenCalledWith('1');
    });
  });

  it('calls delete service when delete is confirmed for unlinked product', async () => {
    mockProductService.checkProductOrderLinkage.mockResolvedValue({
      data: {
        hasLinkedOrders: false,
        linkedOrdersCount: 0,
        linkedOrders: [],
      },
    });
    mockProductService.deleteProduct.mockResolvedValue({});

    render(<ProductManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);
    });

    await waitFor(() => {
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(mockProductService.deleteProduct).toHaveBeenCalledWith('1');
    });
  });

  it('handles order linkage check error gracefully', async () => {
    const mockToast = jest.fn();
    jest.mocked(require('../../../hooks/use-toast').useToast).mockReturnValue({
      toast: mockToast,
    });

    mockProductService.checkProductOrderLinkage.mockRejectedValue(
      new Error('Network error')
    );

    render(<ProductManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Network error',
        variant: 'destructive',
      });
    });
  });

  it('handles archive error gracefully', async () => {
    const mockToast = jest.fn();
    jest.mocked(require('../../../hooks/use-toast').useToast).mockReturnValue({
      toast: mockToast,
    });

    mockProductService.checkProductOrderLinkage.mockResolvedValue(mockOrderLinkageResponse);
    mockProductService.archiveProduct.mockRejectedValue(
      new Error('Archive failed')
    );

    render(<ProductManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);
    });

    await waitFor(() => {
      const archiveButton = screen.getByText('Archive Product');
      fireEvent.click(archiveButton);
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Archive failed',
        variant: 'destructive',
      });
    });
  });

  it('closes dialogs when cancel is clicked', async () => {
    mockProductService.checkProductOrderLinkage.mockResolvedValue(mockOrderLinkageResponse);

    render(<ProductManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);
    });

    await waitFor(() => {
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
    });

    await waitFor(() => {
      expect(screen.queryByText('Cannot Delete Product')).not.toBeInTheDocument();
    });
  });

  it('shows success message after successful archive', async () => {
    const mockToast = jest.fn();
    jest.mocked(require('../../../hooks/use-toast').useToast).mockReturnValue({
      toast: mockToast,
    });

    mockProductService.checkProductOrderLinkage.mockResolvedValue(mockOrderLinkageResponse);
    mockProductService.archiveProduct.mockResolvedValue({});

    render(<ProductManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);
    });

    await waitFor(() => {
      const archiveButton = screen.getByText('Archive Product');
      fireEvent.click(archiveButton);
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Product archived successfully.',
      });
    });
  });
});
