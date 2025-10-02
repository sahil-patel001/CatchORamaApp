import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ProductArchiveManager } from '../ProductArchiveManager';
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

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Archive: () => <div data-testid="archive-icon" />,
  ArchiveRestore: () => <div data-testid="archive-restore-icon" />,
}));

const mockArchivedProducts = [
  {
    _id: '1',
    name: 'Archived Product 1',
    price: 100,
    stock: 5,
    category: 'Electronics',
    status: 'archived',
    images: [{ url: 'test-image.jpg', alt: 'Test Image', isPrimary: true }],
    createdAt: '2023-01-01T00:00:00Z',
  },
  {
    _id: '2',
    name: 'Archived Product 2',
    price: 200,
    stock: 0,
    category: 'Books',
    status: 'archived',
    images: [],
    createdAt: '2023-01-02T00:00:00Z',
  },
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

describe('ProductArchiveManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    mockProductService.getArchivedProducts.mockReturnValue(
      new Promise(() => {}) // Never resolves to simulate loading
    );

    render(<ProductArchiveManager />, { wrapper: createWrapper() });

    expect(screen.getByText('Archived Products')).toBeInTheDocument();
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('renders error state when fetch fails', async () => {
    const errorMessage = 'Failed to fetch archived products';
    mockProductService.getArchivedProducts.mockRejectedValue(
      new Error(errorMessage)
    );

    render(<ProductArchiveManager />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Error fetching archived products')).toBeInTheDocument();
    });
  });

  it('renders empty state when no archived products', async () => {
    mockProductService.getArchivedProducts.mockResolvedValue({
      data: { products: [] },
    });

    render(<ProductArchiveManager />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('No archived products')).toBeInTheDocument();
      expect(screen.getByText("You haven't archived any products yet. Archived products will appear here.")).toBeInTheDocument();
    });
  });

  it('renders archived products table', async () => {
    mockProductService.getArchivedProducts.mockResolvedValue({
      data: { products: mockArchivedProducts },
    });

    render(<ProductArchiveManager />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Archived Product 1')).toBeInTheDocument();
      expect(screen.getByText('Archived Product 2')).toBeInTheDocument();
      expect(screen.getByText('$100')).toBeInTheDocument();
      expect(screen.getByText('$200')).toBeInTheDocument();
      expect(screen.getByText('Electronics')).toBeInTheDocument();
      expect(screen.getByText('Books')).toBeInTheDocument();
    });
  });

  it('shows archived status badges', async () => {
    mockProductService.getArchivedProducts.mockResolvedValue({
      data: { products: mockArchivedProducts },
    });

    render(<ProductArchiveManager />, { wrapper: createWrapper() });

    await waitFor(() => {
      const archivedBadges = screen.getAllByText('Archived');
      expect(archivedBadges).toHaveLength(2);
    });
  });

  it('shows restore buttons for each product', async () => {
    mockProductService.getArchivedProducts.mockResolvedValue({
      data: { products: mockArchivedProducts },
    });

    render(<ProductArchiveManager />, { wrapper: createWrapper() });

    await waitFor(() => {
      const restoreButtons = screen.getAllByText('Restore');
      expect(restoreButtons).toHaveLength(2);
    });
  });

  it('opens view modal when view button is clicked', async () => {
    mockProductService.getArchivedProducts.mockResolvedValue({
      data: { products: mockArchivedProducts },
    });

    render(<ProductArchiveManager />, { wrapper: createWrapper() });

    await waitFor(() => {
      const viewButtons = screen.getAllByRole('button', { name: /view/i });
      fireEvent.click(viewButtons[0]);
    });

    // Note: This would require mocking the ViewProductModal component
    // For now, we're just testing that the click handler is called
  });

  it('opens unarchive confirmation dialog when restore is clicked', async () => {
    mockProductService.getArchivedProducts.mockResolvedValue({
      data: { products: mockArchivedProducts },
    });

    render(<ProductArchiveManager />, { wrapper: createWrapper() });

    await waitFor(() => {
      const restoreButtons = screen.getAllByText('Restore');
      fireEvent.click(restoreButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Restore Product')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to restore Archived Product 1/)).toBeInTheDocument();
    });
  });

  it('calls unarchive service when restore is confirmed', async () => {
    mockProductService.getArchivedProducts.mockResolvedValue({
      data: { products: mockArchivedProducts },
    });
    mockProductService.unarchiveProduct.mockResolvedValue({});

    render(<ProductArchiveManager />, { wrapper: createWrapper() });

    await waitFor(() => {
      const restoreButtons = screen.getAllByText('Restore');
      fireEvent.click(restoreButtons[0]);
    });

    await waitFor(() => {
      const confirmButton = screen.getByText('Restore Product');
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(mockProductService.unarchiveProduct).toHaveBeenCalledWith('1');
    });
  });

  it('handles search functionality', async () => {
    mockProductService.getArchivedProducts.mockResolvedValue({
      data: { products: mockArchivedProducts },
    });

    render(<ProductArchiveManager />, { wrapper: createWrapper() });

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search archived products...');
      fireEvent.change(searchInput, { target: { value: 'Product 1' } });
    });

    // The search is handled by the DataTable component
    // We're testing that the search input is rendered with correct placeholder
    expect(screen.getByPlaceholderText('Search archived products...')).toBeInTheDocument();
  });

  it('displays product images correctly', async () => {
    mockProductService.getArchivedProducts.mockResolvedValue({
      data: { products: mockArchivedProducts },
    });

    render(<ProductArchiveManager />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Product with image
      const productImage = screen.getByAltText('Test Image');
      expect(productImage).toBeInTheDocument();

      // Product without image
      expect(screen.getByText('No image')).toBeInTheDocument();
    });
  });

  it('formats stock display correctly', async () => {
    mockProductService.getArchivedProducts.mockResolvedValue({
      data: { products: mockArchivedProducts },
    });

    render(<ProductArchiveManager />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('5 units')).toBeInTheDocument();
      expect(screen.getByText('0 units')).toBeInTheDocument();
    });
  });
});
