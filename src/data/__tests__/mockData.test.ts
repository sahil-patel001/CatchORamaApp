import { 
  mockVendorSalesReport, 
  mockVendorDashboardStats, 
  mockVendorMonthlyStats 
} from '../mockData';
import { SalesReport } from '@/types';

describe('Mock Data Structure', () => {
  describe('mockVendorSalesReport', () => {
    it('should have correct structure for SalesReport', () => {
      expect(mockVendorSalesReport).toHaveProperty('vendorInfo');
      expect(mockVendorSalesReport).toHaveProperty('salesData');
      expect(mockVendorSalesReport).toHaveProperty('summary');
      
      // Check vendorInfo structure
      expect(mockVendorSalesReport.vendorInfo).toHaveProperty('businessName');
      expect(mockVendorSalesReport.vendorInfo).toHaveProperty('abn');
      expect(mockVendorSalesReport.vendorInfo).toHaveProperty('gstRegistered');
      
      // Check salesData structure
      expect(Array.isArray(mockVendorSalesReport.salesData)).toBe(true);
      expect(mockVendorSalesReport.salesData.length).toBeGreaterThan(0);
      
      const firstSalesEntry = mockVendorSalesReport.salesData[0];
      expect(firstSalesEntry).toHaveProperty('_id');
      expect(firstSalesEntry).toHaveProperty('totalSales');
      expect(firstSalesEntry).toHaveProperty('orderCount');
      expect(typeof firstSalesEntry.totalSales).toBe('number');
      expect(typeof firstSalesEntry.orderCount).toBe('number');
      
      // Check summary structure
      expect(mockVendorSalesReport.summary).toHaveProperty('totalRevenue');
      expect(mockVendorSalesReport.summary).toHaveProperty('totalOrders');
      expect(mockVendorSalesReport.summary).toHaveProperty('period');
      expect(mockVendorSalesReport.summary).toHaveProperty('startDate');
      expect(mockVendorSalesReport.summary).toHaveProperty('endDate');
    });
    
    it('should have realistic data values', () => {
      expect(mockVendorSalesReport.summary.totalRevenue).toBeGreaterThan(0);
      expect(mockVendorSalesReport.summary.totalOrders).toBeGreaterThan(0);
      expect(mockVendorSalesReport.salesData.every(entry => entry.totalSales > 0)).toBe(true);
      expect(mockVendorSalesReport.salesData.every(entry => entry.orderCount > 0)).toBe(true);
    });
  });

  describe('mockVendorDashboardStats', () => {
    it('should have correct structure for dashboard stats', () => {
      expect(mockVendorDashboardStats).toHaveProperty('overview');
      expect(mockVendorDashboardStats).toHaveProperty('monthlyStats');
      expect(mockVendorDashboardStats).toHaveProperty('recentOrders');
      expect(mockVendorDashboardStats).toHaveProperty('lowStockProducts');
      
      // Check overview structure
      const overview = mockVendorDashboardStats.overview;
      expect(overview).toHaveProperty('pendingOrders');
      expect(overview).toHaveProperty('totalRevenue');
      expect(overview).toHaveProperty('activeProducts');
      expect(overview).toHaveProperty('recentOrders');
      expect(overview).toHaveProperty('recentRevenue');
      expect(overview).toHaveProperty('totalProducts');
      
      // Check monthlyStats structure
      expect(Array.isArray(mockVendorDashboardStats.monthlyStats)).toBe(true);
      const firstMonthStat = mockVendorDashboardStats.monthlyStats[0];
      expect(firstMonthStat).toHaveProperty('_id');
      expect(firstMonthStat._id).toHaveProperty('year');
      expect(firstMonthStat._id).toHaveProperty('month');
      expect(firstMonthStat).toHaveProperty('totalOrders');
      expect(firstMonthStat).toHaveProperty('totalRevenue');
      
      // Check recentOrders structure
      expect(Array.isArray(mockVendorDashboardStats.recentOrders)).toBe(true);
      const firstOrder = mockVendorDashboardStats.recentOrders[0];
      expect(firstOrder).toHaveProperty('_id');
      expect(firstOrder).toHaveProperty('orderId');
      expect(firstOrder).toHaveProperty('total');
      expect(firstOrder).toHaveProperty('status');
      expect(firstOrder).toHaveProperty('createdAt');
      expect(firstOrder).toHaveProperty('customer');
      expect(firstOrder.customer).toHaveProperty('name');
      
      // Check lowStockProducts structure
      expect(Array.isArray(mockVendorDashboardStats.lowStockProducts)).toBe(true);
      const firstProduct = mockVendorDashboardStats.lowStockProducts[0];
      expect(firstProduct).toHaveProperty('_id');
      expect(firstProduct).toHaveProperty('name');
      expect(firstProduct).toHaveProperty('stock');
      expect(firstProduct).toHaveProperty('sku');
    });
  });

  describe('mockVendorMonthlyStats', () => {
    it('should have 12 months of data', () => {
      expect(mockVendorMonthlyStats).toHaveLength(12);
      
      // Check that we have all months from 1 to 12
      const months = mockVendorMonthlyStats.map(stat => stat._id.month);
      expect(months).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });
    
    it('should have consistent year data', () => {
      const years = mockVendorMonthlyStats.map(stat => stat._id.year);
      const uniqueYears = [...new Set(years)];
      expect(uniqueYears).toHaveLength(1); // All should be the same year
      expect(uniqueYears[0]).toBe(2024);
    });
  });
});
