export type UserRole = "superadmin" | "vendor";

export interface User {
  _id: string;
  id: string;
  email: string;
  name: string;
  role: UserRole;
  googleId?: string;
  createdAt: string;
}

export interface Vendor {
  _id: string;
  id: string;
  userId: string;
  businessName: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    full?: string;
  };
  businessDetails?: {
    description?: string;
    businessType?: string;
    taxId?: string;
    gstRegistered?: boolean;
  };
  status: "active" | "inactive" | "pending";
  verificationStatus?: {
    email: boolean;
    phone: boolean;
    business: boolean;
  };
  commissionRate?: number; // Commission rate as decimal (0-1), defaults to 0.05 (5%)
  vendorPrefix?: string; // Vendor prefix for barcodes and invoices (e.g., "VD01", "VD02")
  user?: {
    _id: string;
    name: string;
    email: string;
    role: UserRole;
    createdAt: string;
    lastLogin?: string;
  };
  stats?: {
    products: number;
    orders: number;
    revenue: number;
    totalRevenue: number;
    avgOrderValue: number;
  };
  createdAt: string;
  updatedAt?: string;
}

export interface Product {
  _id: string;
  id: string;
  vendorId: string;
  name: string;
  price: number;
  discountPrice?: number | null;
  image?: string; // Legacy field - keeping for backward compatibility
  images?: Array<{
    url: string;
    alt?: string;
    isPrimary?: boolean;
  }>;
  description?: string;
  stock: number;
  category: string;
  customFields?: Record<string, string | number | boolean>;
  vendor: {
    businessName: string;
  };
  length?: number;
  breadth?: number;
  height?: number;
  weight?: number;
  cubicWeight?: number;
  lowStockThreshold?: number; // For backward compatibility
  inventory?: {
    sku?: string;
    barcode?: string;
    trackInventory?: boolean;
    lowStockThreshold?: number;
  };
  createdAt: string;
}

export interface Order {
  _id: string;
  id: string;
  vendorId: string;
  customer: {
    name: string;
    email: string;
  };
  orderNumber: string;
  orderTotal: number;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  trackingLink?: string;
  items: OrderItem[];
  createdAt: string;
}

export interface OrderItem {
  productId: Pick<Product, "_id" | "name" | "category">;
  quantity: number;
  price: number;
}

export interface DashboardStats {
  totalVendors?: number;
  totalProducts?: number;
  totalOrders?: number;
  monthlyRevenue?: number;
}

export interface SalesData {
  month: string;
  amount: number;
}

export interface VendorProductStat {
  _id: string;
  id: string;
  name: string;
  totalSold: number;
  revenue: number;
  totalRevenue: number;
  trend: string;
  product: Product;
}

export interface RecentOrder {
  _id: string;
  customer: {
    name: string;
    email: string;
  };
  product: string;
  amount: string;
  status: string;
  orderNumber: string;
  createdAt: string;
  orderTotal: number;
}

export interface LowStockProduct {
  _id: string;
  sku: string;
  name: string;
  stock: number;
  inventory: {
    sku: string;
  };
}

export interface VendorDashboardData {
  pendingOrders: number;
  orderChange: number;
  monthlyRevenue: number;
  revenueChange: number;
  growthRate: number;
  growthChange: number;
  salesGrowthData: SalesData[];
  topSellingProducts: VendorProductStat[];
  leastSellingProducts: VendorProductStat[];
  recentOrders: RecentOrder[];
  lowStockProducts: LowStockProduct[];
}

export interface GrowthRates {
  revenueGrowthRate: number;
  orderGrowthRate: number;
  avgOrderValueGrowthRate: number;
  monthlyGrowthRate: number;
  period: string;
  currentPeriod: {
    revenue: number;
    orders: number;
    avgOrderValue: number;
  };
  previousPeriod: {
    revenue: number;
    orders: number;
    avgOrderValue: number;
  };
}

export interface Category {
  _id: string;
  name: string;
  description?: string;
  vendorId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Sales Report Types
export interface VendorInfo {
  businessName: string;
  abn: string;
  gstRegistered: boolean;
}

export interface SalesEntry {
  _id: string;
  totalSales: number;
  orderCount: number;
}

export interface ReportSummary {
  totalRevenue: number;
  totalOrders: number;
  period: string;
  startDate: string;
  endDate: string;
}

export interface SalesReport {
  vendorInfo: VendorInfo;
  salesData: SalesEntry[];
  summary: ReportSummary;
}

export type ReportPeriod = "weekly" | "monthly" | "yearly" | "quarterly";

export interface CommissionVendorData {
  _id: string;
  vendorName: string;
  commissionRate: number;
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  commissionOwed: number;
  paymentStatus?: {
    totalCommissionRecords: number;
    paidAmount: number;
    pendingAmount: number;
    approvedAmount: number;
    disputedAmount: number;
    latestPaymentDate?: string;
    oldestPendingDate?: string;
  };
  paymentCompletionRate?: number;
}

export interface CommissionSummary {
  totalRevenue: number;
  totalCommission: number;
  totalOrders: number;
  totalVendors: number;
  avgCommissionRate: number;
  avgRevenuePerVendor: number;
  totalPaidAmount?: number;
  totalPendingAmount?: number;
  totalApprovedAmount?: number;
  totalDisputedAmount?: number;
  paymentCompletionRate?: number;
  outstandingAmount?: number;
}

export interface CommissionReport {
  period: string;
  dateRange: {
    start: string;
    end: string;
  };
  vendors: CommissionVendorData[];
  summary: CommissionSummary;
}

export interface CommissionPayment {
  method?: "bank_transfer" | "paypal" | "stripe" | "check" | "other";
  transactionId?: string;
  paidAt?: string;
  paidBy?: string;
  notes?: string;
}

export interface CommissionMetadata {
  generatedBy: string;
  generatedAt: string;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
}

export interface Commission {
  _id: string;
  vendorId: string;
  period: {
    startDate: string;
    endDate: string;
    type: "weekly" | "monthly" | "quarterly" | "yearly" | "custom";
  };
  orderIds: string[];
  calculation: {
    totalRevenue: number;
    commissionRate: number;
    commissionAmount: number;
    totalOrders: number;
    avgOrderValue: number;
  };
  status:
    | "pending"
    | "calculated"
    | "approved"
    | "paid"
    | "disputed"
    | "cancelled";
  payment?: CommissionPayment;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
  metadata: CommissionMetadata;
  createdAt: string;
  updatedAt: string;
  vendor?: {
    _id: string;
    businessName: string;
  };
  isPaid?: boolean;
  isOverdue?: boolean;
  periodDuration?: number;
}

export interface CommissionHistoryEntry {
  _id: string;
  commissionId: string;
  action:
    | "created"
    | "calculated"
    | "approved"
    | "paid"
    | "disputed"
    | "updated"
    | "cancelled"
    | "regenerated"
    | "status_changed"
    | "payment_updated"
    | "notes_updated";
  performedBy: string;
  previousValues: Record<string, any>;
  newValues: Record<string, any>;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    source: "web" | "api" | "system" | "bulk";
    sessionId?: string;
  };
  notes?: string;
  timestamp: string;
  user?: {
    _id: string;
    name: string;
    email: string;
  };
}

export interface CommissionStats {
  totalCommissions: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  statusCounts: Record<string, number>;
}

// Notification Types
export type NotificationType =
  | "low_stock"
  | "new_order"
  | "order_status_update"
  | "product_approved"
  | "product_rejected"
  | "commission_payment"
  | "system_maintenance"
  | "account_update"
  | "cubic_volume_alert"
  | "general";

export type NotificationPriority = "low" | "medium" | "high" | "urgent";

export type NotificationCategory =
  | "product"
  | "order"
  | "system"
  | "account"
  | "commission";

export interface Notification {
  _id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: Record<string, any>;
  priority?: NotificationPriority;
  category?: NotificationCategory;
  actionUrl?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt?: string;
}
