import { Vendor, Product, Order, User } from "@/types";

// NOTE: The following mock data exports are no longer used in the main application
// since real backend data is now available. They are kept for test compatibility.
// Consider removing these in future cleanup: mockVendors, mockProducts, mockOrders,
// mockSalesData, mockTopSellingProducts, mockLeastSellingProducts

export const mockVendors: (Vendor & {
  user: User;
  stats: { products: number; orders: number; revenue: number };
})[] = [
  {
    id: "1",
    userId: "1",
    businessName: "Tech Gadgets Store",
    createdAt: "2024-01-15T10:00:00Z",
    user: {
      id: "1",
      email: "tech@example.com",
      name: "John Smith",
      role: "vendor",
      createdAt: "2024-01-15T10:00:00Z",
    },
    stats: {
      products: 25,
      orders: 150,
      revenue: 45000,
    },
  },
  {
    id: "2",
    userId: "2",
    businessName: "Fashion Hub",
    createdAt: "2024-02-01T10:00:00Z",
    user: {
      id: "2",
      email: "fashion@example.com",
      name: "Sarah Johnson",
      role: "vendor",
      createdAt: "2024-02-01T10:00:00Z",
    },
    stats: {
      products: 40,
      orders: 200,
      revenue: 32000,
    },
  },
  {
    id: "3",
    userId: "3",
    businessName: "Home & Garden",
    createdAt: "2024-03-10T10:00:00Z",
    user: {
      id: "3",
      email: "home@example.com",
      name: "Mike Wilson",
      role: "vendor",
      createdAt: "2024-03-10T10:00:00Z",
    },
    stats: {
      products: 30,
      orders: 80,
      revenue: 28000,
    },
  },
];

export const mockProducts: (Product & {
  vendor: { businessName: string };
  status: "active" | "inactive" | "draft" | "out_of_stock";
})[] = [
  {
    id: "1",
    vendorId: "1",
    name: "Wireless Bluetooth Headphones",
    price: 299.99,
    discountPrice: 249.99,
    stock: 50,
    category: "Electronics",
    status: "active",
    createdAt: "2024-01-20T10:00:00Z",
    vendor: { businessName: "Tech Gadgets Store" },
  },
  {
    id: "2",
    vendorId: "1",
    name: "Smart Watch Series 5",
    price: 399.99,
    stock: 25,
    category: "Electronics",
    status: "active",
    createdAt: "2024-02-01T10:00:00Z",
    vendor: { businessName: "Tech Gadgets Store" },
  },
  {
    id: "3",
    vendorId: "2",
    name: "Summer Dress Collection",
    price: 89.99,
    discountPrice: 69.99,
    stock: 100,
    category: "Fashion",
    status: "draft",
    createdAt: "2024-02-15T10:00:00Z",
    vendor: { businessName: "Fashion Hub" },
  },
  {
    id: "4",
    vendorId: "3",
    name: "Garden Tool Set",
    price: 149.99,
    stock: 30,
    category: "Home & Garden",
    status: "inactive",
    createdAt: "2024-03-01T10:00:00Z",
    vendor: { businessName: "Home & Garden" },
  },
];

export const mockOrders: (Order & {
  vendor: { businessName: string };
  customer: string;
})[] = [
  {
    id: "1",
    vendorId: "1",
    orderTotal: 299.99,
    status: "delivered",
    trackingLink: "https://track.example.com/123",
    items: [{ productId: "1", quantity: 1, price: 299.99 }],
    createdAt: "2024-05-01T10:00:00Z",
    vendor: { businessName: "Tech Gadgets Store" },
    customer: "Alice Brown",
  },
  {
    id: "2",
    vendorId: "2",
    orderTotal: 159.98,
    status: "shipped",
    trackingLink: "https://track.example.com/124",
    items: [{ productId: "3", quantity: 2, price: 79.99 }],
    createdAt: "2024-05-15T10:00:00Z",
    vendor: { businessName: "Fashion Hub" },
    customer: "Bob Davis",
  },
  {
    id: "3",
    vendorId: "1",
    orderTotal: 399.99,
    status: "processing",
    items: [{ productId: "2", quantity: 1, price: 399.99 }],
    createdAt: "2024-06-01T10:00:00Z",
    vendor: { businessName: "Tech Gadgets Store" },
    customer: "Charlie Wilson",
  },
];

export const mockSalesData = [
  { month: "Jan", amount: 12000 },
  { month: "Feb", amount: 15000 },
  { month: "Mar", amount: 18000 },
  { month: "Apr", amount: 22000 },
  { month: "May", amount: 19000 },
  { month: "Jun", amount: 25000 },
];

// Comprehensive mock data for vendor sales analytics
export const mockVendorSalesReport = {
  vendorInfo: {
    businessName: "Tech Gadgets Store",
    abn: "12345678901",
    gstRegistered: true,
  },
  salesData: [
    {
      _id: "2024-01-01",
      totalSales: 2450.75,
      orderCount: 12,
    },
    {
      _id: "2024-01-02",
      totalSales: 3200.5,
      orderCount: 18,
    },
    {
      _id: "2024-01-03",
      totalSales: 1890.25,
      orderCount: 9,
    },
    {
      _id: "2024-01-04",
      totalSales: 4150.0,
      orderCount: 22,
    },
    {
      _id: "2024-01-05",
      totalSales: 2980.75,
      orderCount: 15,
    },
    {
      _id: "2024-01-06",
      totalSales: 3750.25,
      orderCount: 19,
    },
    {
      _id: "2024-01-07",
      totalSales: 2100.5,
      orderCount: 11,
    },
    {
      _id: "2024-01-08",
      totalSales: 3890.0,
      orderCount: 21,
    },
    {
      _id: "2024-01-09",
      totalSales: 2650.75,
      orderCount: 14,
    },
    {
      _id: "2024-01-10",
      totalSales: 4200.25,
      orderCount: 24,
    },
    {
      _id: "2024-01-11",
      totalSales: 3100.5,
      orderCount: 16,
    },
    {
      _id: "2024-01-12",
      totalSales: 2750.0,
      orderCount: 13,
    },
    {
      _id: "2024-01-13",
      totalSales: 3950.75,
      orderCount: 20,
    },
    {
      _id: "2024-01-14",
      totalSales: 2300.25,
      orderCount: 10,
    },
  ],
  summary: {
    totalRevenue: 43413.5,
    totalOrders: 224,
    period: "weekly",
    startDate: "2024-01-01",
    endDate: "2024-01-14",
  },
};

// Mock monthly statistics for vendor dashboard
export const mockVendorMonthlyStats = [
  {
    _id: { year: 2024, month: 1 },
    totalOrders: 45,
    totalRevenue: 12450.75,
  },
  {
    _id: { year: 2024, month: 2 },
    totalOrders: 52,
    totalRevenue: 15200.5,
  },
  {
    _id: { year: 2024, month: 3 },
    totalOrders: 38,
    totalRevenue: 9890.25,
  },
  {
    _id: { year: 2024, month: 4 },
    totalOrders: 61,
    totalRevenue: 18150.0,
  },
  {
    _id: { year: 2024, month: 5 },
    totalOrders: 47,
    totalRevenue: 13980.75,
  },
  {
    _id: { year: 2024, month: 6 },
    totalOrders: 55,
    totalRevenue: 16750.25,
  },
  {
    _id: { year: 2024, month: 7 },
    totalOrders: 42,
    totalRevenue: 11100.5,
  },
  {
    _id: { year: 2024, month: 8 },
    totalOrders: 58,
    totalRevenue: 17890.0,
  },
  {
    _id: { year: 2024, month: 9 },
    totalOrders: 49,
    totalRevenue: 14650.75,
  },
  {
    _id: { year: 2024, month: 10 },
    totalOrders: 63,
    totalRevenue: 19200.25,
  },
  {
    _id: { year: 2024, month: 11 },
    totalOrders: 51,
    totalRevenue: 15100.5,
  },
  {
    _id: { year: 2024, month: 12 },
    totalOrders: 57,
    totalRevenue: 16750.0,
  },
];

// Mock vendor dashboard overview stats
export const mockVendorDashboardStats = {
  overview: {
    pendingOrders: 8,
    totalRevenue: 181163.5,
    activeProducts: 24,
    recentOrders: 12,
    recentRevenue: 4250.75,
    totalProducts: 28,
  },
  monthlyStats: mockVendorMonthlyStats,
  recentOrders: [
    {
      _id: "order1",
      orderId: "ORD-2024-001",
      total: 299.99,
      status: "processing",
      createdAt: new Date("2024-01-15T10:30:00Z").toISOString(),
      customer: { name: "John Smith" },
    },
    {
      _id: "order2",
      orderId: "ORD-2024-002",
      total: 159.5,
      status: "shipped",
      createdAt: new Date("2024-01-15T14:20:00Z").toISOString(),
      customer: { name: "Sarah Johnson" },
    },
    {
      _id: "order3",
      orderId: "ORD-2024-003",
      total: 89.99,
      status: "delivered",
      createdAt: new Date("2024-01-14T16:45:00Z").toISOString(),
      customer: { name: "Mike Wilson" },
    },
    {
      _id: "order4",
      orderId: "ORD-2024-004",
      total: 449.99,
      status: "processing",
      createdAt: new Date("2024-01-14T09:15:00Z").toISOString(),
      customer: { name: "Emily Davis" },
    },
    {
      _id: "order5",
      orderId: "ORD-2024-005",
      total: 199.75,
      status: "shipped",
      createdAt: new Date("2024-01-13T11:30:00Z").toISOString(),
      customer: { name: "David Brown" },
    },
  ],
  lowStockProducts: [
    {
      _id: "prod1",
      name: "Wireless Bluetooth Headphones",
      stock: 3,
      sku: "WBH-001",
    },
    {
      _id: "prod2",
      name: "Smart Watch Series 5",
      stock: 2,
      sku: "SWS5-002",
    },
    {
      _id: "prod3",
      name: "USB-C Cable Set",
      stock: 5,
      sku: "USBC-003",
    },
    {
      _id: "prod4",
      name: "Wireless Mouse",
      stock: 1,
      sku: "WM-004",
    },
  ],
};

// New mock data for top selling products
export const mockTopSellingProducts = [
  {
    id: "1",
    name: "Wireless Bluetooth Headphones",
    totalSold: 245,
    revenue: 61250,
    trend: "+15%",
  },
  {
    id: "2",
    name: "Smart Watch Series 5",
    totalSold: 189,
    revenue: 75560,
    trend: "+8%",
  },
  {
    id: "3",
    name: "Summer Dress Collection",
    totalSold: 156,
    revenue: 10920,
    trend: "+22%",
  },
  {
    id: "4",
    name: "Gaming Keyboard Pro",
    totalSold: 134,
    revenue: 20100,
    trend: "+5%",
  },
  {
    id: "5",
    name: "USB-C Cable Set",
    totalSold: 98,
    revenue: 2940,
    trend: "+12%",
  },
];

export const mockLeastSellingProducts = [
  {
    id: "10",
    name: "Vintage Clock",
    totalSold: 8,
    revenue: 240,
    trend: "-5%",
  },
  {
    id: "11",
    name: "Ceramic Vase",
    totalSold: 12,
    revenue: 600,
    trend: "-8%",
  },
  {
    id: "12",
    name: "Wooden Picture Frame",
    totalSold: 15,
    revenue: 450,
    trend: "-3%",
  },
  {
    id: "13",
    name: "Desk Organizer",
    totalSold: 18,
    revenue: 540,
    trend: "-12%",
  },
  {
    id: "14",
    name: "Book Stand",
    totalSold: 23,
    revenue: 690,
    trend: "-2%",
  },
];
