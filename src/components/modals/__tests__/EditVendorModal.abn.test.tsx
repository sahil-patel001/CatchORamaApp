import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EditVendorModal } from '../EditVendorModal';
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
  Save: () => <div data-testid="save-icon" />,
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

describe('EditVendorModal - ABN Validation', () => {
  const mockOnEdit = vi.fn();
  const mockOnOpenChange = vi.fn();
  
  const mockVendor = {
    _id: '1',
    businessName: 'Test Vendor',
    user: { name: 'Test User', email: 'test@example.com' },
    businessDetails: { taxId: 'ABC123DEF456' }, // Alphanumeric stored value
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockVendorService.updateVendor.mockResolvedValue({
      ...mockVendor,
      businessDetails: { taxId: '123456' },
    } as any);
  });

  describe('ABN Input Validation in Edit Mode', () => {
    it('should display numeric-only version of stored alphanumeric ABN', async () => {
      renderWithProviders(
        <EditVendorModal
          open={true}
          onOpenChange={mockOnOpenChange}
          vendor={mockVendor as any}
          onEdit={mockOnEdit}
        />
      );

      const abnInput = screen.getByLabelText(/ABN/i);
      
      // Should display only numeric part of the stored alphanumeric ABN
      expect(abnInput).toHaveValue('123456');
    });

    it('should only allow numeric characters when editing ABN', async () => {
      renderWithProviders(
        <EditVendorModal
          open={true}
          onOpenChange={mockOnOpenChange}
          vendor={mockVendor as any}
          onEdit={mockOnEdit}
        />
      );

      const abnInput = screen.getByLabelText(/ABN/i);
      
      // Clear and test new alphanumeric input
      fireEvent.change(abnInput, { target: { value: 'XYZ789ABC123' } });
      expect(abnInput).toHaveValue('789123');

      // Test input with special characters
      fireEvent.change(abnInput, { target: { value: '98-76-54-321' } });
      expect(abnInput).toHaveValue('9876543321');
    });

    it('should handle vendor with no existing ABN', async () => {
      const vendorWithoutABN = {
        ...mockVendor,
        businessDetails: { taxId: '' }
      };

      renderWithProviders(
        <EditVendorModal
          open={true}
          onOpenChange={mockOnOpenChange}
          vendor={vendorWithoutABN as any}
          onEdit={mockOnEdit}
        />
      );

      const abnInput = screen.getByLabelText(/ABN/i);
      expect(abnInput).toHaveValue('');
    });

    it('should handle vendor with undefined businessDetails', async () => {
      const vendorWithoutBusinessDetails = {
        ...mockVendor,
        businessDetails: undefined
      };

      renderWithProviders(
        <EditVendorModal
          open={true}
          onOpenChange={mockOnOpenChange}
          vendor={vendorWithoutBusinessDetails as any}
          onEdit={mockOnEdit}
        />
      );

      const abnInput = screen.getByLabelText(/ABN/i);
      expect(abnInput).toHaveValue('');
    });

    it('should submit form with filtered numeric ABN', async () => {
      renderWithProviders(
        <EditVendorModal
          open={true}
          onOpenChange={mockOnOpenChange}
          vendor={mockVendor as any}
          onEdit={mockOnEdit}
        />
      );

      // Change ABN to alphanumeric
      const abnInput = screen.getByLabelText(/ABN/i);
      fireEvent.change(abnInput, { target: { value: 'NEW789XYZ456' } });
      expect(abnInput).toHaveValue('789456');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockVendorService.updateVendor).toHaveBeenCalledWith(
          '1',
          expect.objectContaining({
            businessDetails: expect.objectContaining({
              taxId: '789456' // Should be filtered to numeric only
            })
          })
        );
      });
    });

    it('should preserve other business details when updating ABN', async () => {
      const vendorWithFullBusinessDetails = {
        ...mockVendor,
        businessDetails: { 
          taxId: 'ABC123',
          gstRegistered: true,
          businessType: 'corporation',
          description: 'Test business'
        }
      };

      renderWithProviders(
        <EditVendorModal
          open={true}
          onOpenChange={mockOnOpenChange}
          vendor={vendorWithFullBusinessDetails as any}
          onEdit={mockOnEdit}
        />
      );

      // Change only ABN
      const abnInput = screen.getByLabelText(/ABN/i);
      fireEvent.change(abnInput, { target: { value: 'NEW789' } });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockVendorService.updateVendor).toHaveBeenCalledWith(
          '1',
          expect.objectContaining({
            businessDetails: expect.objectContaining({
              taxId: '789', // Should be filtered
              gstRegistered: true, // Should preserve other fields
              businessType: 'corporation',
              description: 'Test business'
            })
          })
        );
      });
    });
  });
});

