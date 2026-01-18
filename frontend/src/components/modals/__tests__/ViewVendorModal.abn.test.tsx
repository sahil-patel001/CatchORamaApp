import React from 'react';
import { render, screen } from '@testing-library/react';
import { ViewVendorModal } from '../ViewVendorModal';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Building: () => <div data-testid="building-icon" />,
  Store: () => <div data-testid="store-icon" />,
  FileText: () => <div data-testid="file-icon" />,
  AlertCircle: () => <div data-testid="alert-icon" />,
  MapPin: () => <div data-testid="map-icon" />,
  Mail: () => <div data-testid="mail-icon" />,
  Phone: () => <div data-testid="phone-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Badge: () => <div data-testid="badge-icon" />,
  X: () => <div data-testid="x-icon" />,
}));

describe('ViewVendorModal - ABN Display Logic', () => {
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ABN Display Filtering', () => {
    it('should display only numeric characters from alphanumeric ABN', () => {
      const vendor = {
        _id: '1',
        businessName: 'Test Vendor',
        user: { name: 'Test User', email: 'test@example.com' },
        businessDetails: { taxId: 'ABC123DEF456' }, // Alphanumeric
        status: 'active',
      };

      render(
        <ViewVendorModal
          open={true}
          onOpenChange={mockOnOpenChange}
          vendor={vendor as any}
        />
      );

      // Should display only numeric part
      expect(screen.getByText('123456')).toBeInTheDocument();
      expect(screen.queryByText('ABC123DEF456')).not.toBeInTheDocument();
    });

    it('should display pure numeric ABN as-is', () => {
      const vendor = {
        _id: '1',
        businessName: 'Test Vendor',
        user: { name: 'Test User', email: 'test@example.com' },
        businessDetails: { taxId: '12345678901' }, // Pure numeric
        status: 'active',
      };

      render(
        <ViewVendorModal
          open={true}
          onOpenChange={mockOnOpenChange}
          vendor={vendor as any}
        />
      );

      expect(screen.getByText('12345678901')).toBeInTheDocument();
    });

    it('should handle ABN with special characters and spaces', () => {
      const vendor = {
        _id: '1',
        businessName: 'Test Vendor',
        user: { name: 'Test User', email: 'test@example.com' },
        businessDetails: { taxId: '12-34 56!@# 789' }, // Mixed characters
        status: 'active',
      };

      render(
        <ViewVendorModal
          open={true}
          onOpenChange={mockOnOpenChange}
          vendor={vendor as any}
        />
      );

      // Should display only numeric part
      expect(screen.getByText('1234656789')).toBeInTheDocument();
      expect(screen.queryByText('12-34 56!@# 789')).not.toBeInTheDocument();
    });

    it('should handle empty ABN gracefully', () => {
      const vendor = {
        _id: '1',
        businessName: 'Test Vendor',
        user: { name: 'Test User', email: 'test@example.com' },
        businessDetails: { taxId: '' }, // Empty
        status: 'active',
      };

      render(
        <ViewVendorModal
          open={true}
          onOpenChange={mockOnOpenChange}
          vendor={vendor as any}
        />
      );

      // Should display empty string (filtered result)
      expect(screen.getByText(/^$/)).toBeInTheDocument(); // Empty text
    });

    it('should not display ABN section when taxId is undefined', () => {
      const vendor = {
        _id: '1',
        businessName: 'Test Vendor',
        user: { name: 'Test User', email: 'test@example.com' },
        businessDetails: { taxId: undefined }, // Undefined
        status: 'active',
      };

      render(
        <ViewVendorModal
          open={true}
          onOpenChange={mockOnOpenChange}
          vendor={vendor as any}
        />
      );

      // ABN section should not be rendered
      expect(screen.queryByText(/ABN:/)).not.toBeInTheDocument();
    });

    it('should not display ABN section when businessDetails is undefined', () => {
      const vendor = {
        _id: '1',
        businessName: 'Test Vendor',
        user: { name: 'Test User', email: 'test@example.com' },
        businessDetails: undefined, // Undefined business details
        status: 'active',
      };

      render(
        <ViewVendorModal
          open={true}
          onOpenChange={mockOnOpenChange}
          vendor={vendor as any}
        />
      );

      // ABN section should not be rendered
      expect(screen.queryByText(/ABN:/)).not.toBeInTheDocument();
    });

    it('should handle ABN with only letters (should show empty)', () => {
      const vendor = {
        _id: '1',
        businessName: 'Test Vendor',
        user: { name: 'Test User', email: 'test@example.com' },
        businessDetails: { taxId: 'ABCDEFGHIJK' }, // Only letters
        status: 'active',
      };

      render(
        <ViewVendorModal
          open={true}
          onOpenChange={mockOnOpenChange}
          vendor={vendor as any}
        />
      );

      // Should display empty result (no numeric characters)
      expect(screen.getByText(/^$/)).toBeInTheDocument(); // Empty text
    });

    it('should display ABN label correctly', () => {
      const vendor = {
        _id: '1',
        businessName: 'Test Vendor',
        user: { name: 'Test User', email: 'test@example.com' },
        businessDetails: { taxId: '123456789' },
        status: 'active',
      };

      render(
        <ViewVendorModal
          open={true}
          onOpenChange={mockOnOpenChange}
          vendor={vendor as any}
        />
      );

      // Should show ABN label (not Tax ID)
      expect(screen.getByText(/ABN:/)).toBeInTheDocument();
      expect(screen.queryByText(/Tax ID:/)).not.toBeInTheDocument();
    });
  });
});
