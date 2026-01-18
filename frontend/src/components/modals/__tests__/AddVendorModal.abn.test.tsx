import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AddVendorModal } from '../AddVendorModal';
import * as vendorService from '../../../services/vendorService';

// Mock the vendor service
vi.mock('../../../services/vendorService');
const mockVendorService = vendorService as any;

// Mock the toast hook
vi.mock('../../../hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Building2: () => <div data-testid="building-icon" />,
  Mail: () => <div data-testid="mail-icon" />,
  Phone: () => <div data-testid="phone-icon" />,
  MapPin: () => <div data-testid="map-icon" />,
  FileText: () => <div data-testid="file-icon" />,
  X: () => <div data-testid="x-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
}));

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('AddVendorModal - ABN Validation', () => {
  const mockOnAdd = vi.fn();
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockVendorService.createVendor.mockResolvedValue({
      _id: '1',
      businessName: 'Test Vendor',
      user: { name: 'Test User', email: 'test@example.com' },
      businessDetails: { taxId: '12345678901' },
    } as any);
  });

  describe('ABN Input Validation', () => {
    it('should only allow numeric characters in ABN field', async () => {
      renderWithProviders(
        <AddVendorModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onAdd={mockOnAdd}
        />
      );

      const abnInput = screen.getByLabelText(/ABN/i);
      
      // Test alphanumeric input - should filter to numeric only
      fireEvent.change(abnInput, { target: { value: 'ABC123DEF456' } });
      expect(abnInput).toHaveValue('123456');

      // Test input with special characters - should filter to numeric only
      fireEvent.change(abnInput, { target: { value: '123!@#456$%^789' } });
      expect(abnInput).toHaveValue('123456789');

      // Test input with spaces and dashes - should filter to numeric only
      fireEvent.change(abnInput, { target: { value: '12 34-56 78-901' } });
      expect(abnInput).toHaveValue('12345678901');
    });

    it('should enforce maxLength of 20 characters', async () => {
      renderWithProviders(
        <AddVendorModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onAdd={mockOnAdd}
        />
      );

      const abnInput = screen.getByLabelText(/ABN/i);
      
      // Test input longer than 20 characters
      const longInput = '123456789012345678901234567890';
      fireEvent.change(abnInput, { target: { value: longInput } });
      
      // Should be truncated to 20 characters
      expect(abnInput.getAttribute('maxLength')).toBe('20');
    });

    it('should show helpful placeholder text', async () => {
      renderWithProviders(
        <AddVendorModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onAdd={mockOnAdd}
        />
      );

      const abnInput = screen.getByLabelText(/ABN/i);
      expect(abnInput).toHaveAttribute('placeholder', 'Enter numeric ABN (e.g., 12345678901)');
    });

    it('should allow pure numeric input', async () => {
      renderWithProviders(
        <AddVendorModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onAdd={mockOnAdd}
        />
      );

      const abnInput = screen.getByLabelText(/ABN/i);
      
      // Test pure numeric input
      fireEvent.change(abnInput, { target: { value: '12345678901' } });
      expect(abnInput).toHaveValue('12345678901');
    });

    it('should allow empty input (optional field)', async () => {
      renderWithProviders(
        <AddVendorModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onAdd={mockOnAdd}
        />
      );

      const abnInput = screen.getByLabelText(/ABN/i);
      
      // Test empty input
      fireEvent.change(abnInput, { target: { value: '' } });
      expect(abnInput).toHaveValue('');
    });

    it('should submit form with filtered numeric ABN', async () => {
      renderWithProviders(
        <AddVendorModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onAdd={mockOnAdd}
        />
      );

      // Fill required fields
      fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'Test User' } });
      fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByLabelText(/Business Name/i), { target: { value: 'Test Business' } });
      fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });
      
      // Enter alphanumeric ABN
      const abnInput = screen.getByLabelText(/ABN/i);
      fireEvent.change(abnInput, { target: { value: 'ABC123DEF456' } });
      expect(abnInput).toHaveValue('123456');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /add vendor/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockVendorService.createVendor).toHaveBeenCalledWith(
          expect.objectContaining({
            businessDetails: expect.objectContaining({
              taxId: '123456' // Should be filtered to numeric only
            })
          })
        );
      });
    });
  });
});

