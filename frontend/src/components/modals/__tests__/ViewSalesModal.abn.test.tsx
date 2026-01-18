import React from 'react';
import { render, screen } from '@testing-library/react';
import { ViewSalesModal } from '../ViewSalesModal';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Building2: () => <div data-testid="building-icon" />,
  TrendingUp: () => <div data-testid="trending-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  DollarSign: () => <div data-testid="dollar-icon" />,
  ShoppingCart: () => <div data-testid="cart-icon" />,
  X: () => <div data-testid="x-icon" />,
}));

describe('ViewSalesModal - ABN Display Logic', () => {
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ABN Display Filtering in Sales Reports', () => {
    it('should display only numeric characters from alphanumeric ABN', () => {
      const vendorInfo = {
        businessName: 'Test Vendor',
        abn: 'ABC123DEF456', // Alphanumeric
        gstRegistered: true,
      };

      render(
        <ViewSalesModal
          open={true}
          onOpenChange={mockOnOpenChange}
          salesData={null}
          vendorInfo={vendorInfo}
        />
      );

      // Should display only numeric part
      expect(screen.getByText('123456')).toBeInTheDocument();
      expect(screen.queryByText('ABC123DEF456')).not.toBeInTheDocument();
    });

    it('should display pure numeric ABN as-is', () => {
      const vendorInfo = {
        businessName: 'Test Vendor',
        abn: '12345678901', // Pure numeric
        gstRegistered: true,
      };

      render(
        <ViewSalesModal
          open={true}
          onOpenChange={mockOnOpenChange}
          salesData={null}
          vendorInfo={vendorInfo}
        />
      );

      expect(screen.getByText('12345678901')).toBeInTheDocument();
    });

    it('should handle ABN with special characters and spaces', () => {
      const vendorInfo = {
        businessName: 'Test Vendor',
        abn: '12-34 56!@# 789', // Mixed characters
        gstRegistered: false,
      };

      render(
        <ViewSalesModal
          open={true}
          onOpenChange={mockOnOpenChange}
          salesData={null}
          vendorInfo={vendorInfo}
        />
      );

      // Should display only numeric part
      expect(screen.getByText('1234556789')).toBeInTheDocument();
      expect(screen.queryByText('12-34 56!@# 789')).not.toBeInTheDocument();
    });

    it('should handle empty ABN gracefully', () => {
      const vendorInfo = {
        businessName: 'Test Vendor',
        abn: '', // Empty
        gstRegistered: true,
      };

      render(
        <ViewSalesModal
          open={true}
          onOpenChange={mockOnOpenChange}
          salesData={null}
          vendorInfo={vendorInfo}
        />
      );

      // Should show ABN label but with empty filtered result
      expect(screen.getByText(/ABN:/)).toBeInTheDocument();
    });

    it('should handle ABN with only letters (should show empty)', () => {
      const vendorInfo = {
        businessName: 'Test Vendor',
        abn: 'ABCDEFGHIJK', // Only letters
        gstRegistered: false,
      };

      render(
        <ViewSalesModal
          open={true}
          onOpenChange={mockOnOpenChange}
          salesData={null}
          vendorInfo={vendorInfo}
        />
      );

      // Should show ABN label but with empty filtered result
      expect(screen.getByText(/ABN:/)).toBeInTheDocument();
      // The filtered result should be empty, so just letters shouldn't appear
      expect(screen.queryByText('ABCDEFGHIJK')).not.toBeInTheDocument();
    });

    it('should display GST status correctly alongside filtered ABN', () => {
      const vendorInfo = {
        businessName: 'Test Vendor',
        abn: 'XYZ999ABC888', // Mixed - should filter to 999888
        gstRegistered: true,
      };

      render(
        <ViewSalesModal
          open={true}
          onOpenChange={mockOnOpenChange}
          salesData={null}
          vendorInfo={vendorInfo}
        />
      );

      // Should display filtered ABN
      expect(screen.getByText('999888')).toBeInTheDocument();
      
      // Should display GST status
      expect(screen.getByText('GST Registered')).toBeInTheDocument();
    });

    it('should display business name correctly alongside filtered ABN', () => {
      const vendorInfo = {
        businessName: 'Amazing Test Corporation',
        abn: '111AAA222BBB333', // Should filter to 111222333
        gstRegistered: false,
      };

      render(
        <ViewSalesModal
          open={true}
          onOpenChange={mockOnOpenChange}
          salesData={null}
          vendorInfo={vendorInfo}
        />
      );

      // Should display business name
      expect(screen.getByText('Amazing Test Corporation')).toBeInTheDocument();
      
      // Should display filtered ABN
      expect(screen.getByText('111222333')).toBeInTheDocument();
      
      // Should not display original unfiltered ABN
      expect(screen.queryByText('111AAA222BBB333')).not.toBeInTheDocument();
    });

    it('should handle complex alphanumeric ABN with multiple character types', () => {
      const vendorInfo = {
        businessName: 'Test Corp',
        abn: 'A1B2C3-D4E5F6 G7H8I9!@#', // Should filter to 123456789
        gstRegistered: true,
      };

      render(
        <ViewSalesModal
          open={true}
          onOpenChange={mockOnOpenChange}
          salesData={null}
          vendorInfo={vendorInfo}
        />
      );

      expect(screen.getByText('123456789')).toBeInTheDocument();
      expect(screen.queryByText('A1B2C3-D4E5F6 G7H8I9!@#')).not.toBeInTheDocument();
    });
  });
});

