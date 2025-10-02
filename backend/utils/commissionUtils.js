import moment from "moment";
import Order from "../models/Order.js";
import Vendor from "../models/Vendor.js";
import Commission from "../models/Commission.js";

/**
 * Commission calculation utilities
 */
export class CommissionCalculator {
  /**
   * Calculate commission amount based on revenue and rate
   * @param {number} revenue - Total revenue amount
   * @param {number} rate - Commission rate (0-1)
   * @returns {number} Commission amount
   */
  static calculateCommission(revenue, rate) {
    if (typeof revenue !== "number" || typeof rate !== "number") {
      throw new Error("Revenue and rate must be numbers");
    }

    if (revenue < 0) {
      throw new Error("Revenue cannot be negative");
    }

    if (rate < 0 || rate > 1) {
      throw new Error("Commission rate must be between 0 and 1");
    }

    return Math.round(revenue * rate * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate commission for a specific vendor and date range
   * @param {string} vendorId - Vendor ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {number} [commissionRateOverride] - Optional commission rate override (0-1)
   * @returns {Object} Commission calculation details
   */
  static async calculateVendorCommission(
    vendorId,
    startDate,
    endDate,
    commissionRateOverride
  ) {
    // Validate inputs
    if (!vendorId || !startDate || !endDate) {
      throw new Error("Vendor ID, start date, and end date are required");
    }

    if (new Date(startDate) >= new Date(endDate)) {
      throw new Error("Start date must be before end date");
    }

    // Get vendor information
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      throw new Error("Vendor not found");
    }

    // Use override rate if provided, otherwise use vendor's default rate
    const commissionRate =
      commissionRateOverride !== undefined
        ? commissionRateOverride
        : vendor.commissionRate;

    // Validate the commission rate
    if (!this.validateCommissionRate(commissionRate)) {
      throw new Error("Invalid commission rate. Must be between 0 and 1.");
    }

    // Get orders for the period
    const orders = await Order.find({
      vendorId,
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
      status: "delivered",
      paymentStatus: "paid",
    });

    // Calculate totals
    const totalRevenue = orders.reduce(
      (sum, order) => sum + order.orderTotal,
      0
    );
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const commissionAmount = this.calculateCommission(
      totalRevenue,
      commissionRate
    );

    return {
      vendorId,
      vendorName: vendor.businessName,
      period: {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        duration: moment(endDate).diff(moment(startDate), "days") + 1,
      },
      calculation: {
        totalRevenue,
        commissionRate, // Use the actual rate used (either override or vendor's default)
        commissionAmount,
        totalOrders,
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      },
      orders: orders.map((order) => ({
        id: order._id,
        orderNumber: order.orderNumber,
        total: order.orderTotal,
        createdAt: order.createdAt,
      })),
    };
  }

  /**
   * Validate commission rate
   * @param {number} rate - Commission rate to validate
   * @returns {boolean} True if valid
   */
  static validateCommissionRate(rate) {
    return typeof rate === "number" && rate >= 0 && rate <= 1;
  }

  /**
   * Calculate commission breakdown by period
   * @param {Array} orders - Array of orders
   * @param {number} commissionRate - Commission rate
   * @param {string} periodType - Period type (daily, weekly, monthly)
   * @returns {Array} Commission breakdown by period
   */
  static calculatePeriodBreakdown(
    orders,
    commissionRate,
    periodType = "daily"
  ) {
    const breakdown = {};

    orders.forEach((order) => {
      let periodKey;
      const orderDate = moment(order.createdAt);

      switch (periodType) {
        case "daily":
          periodKey = orderDate.format("YYYY-MM-DD");
          break;
        case "weekly":
          periodKey = orderDate.startOf("week").format("YYYY-MM-DD");
          break;
        case "monthly":
          periodKey = orderDate.format("YYYY-MM");
          break;
        default:
          periodKey = orderDate.format("YYYY-MM-DD");
      }

      if (!breakdown[periodKey]) {
        breakdown[periodKey] = {
          period: periodKey,
          revenue: 0,
          orders: 0,
          commission: 0,
        };
      }

      breakdown[periodKey].revenue += order.orderTotal;
      breakdown[periodKey].orders += 1;
      breakdown[periodKey].commission = this.calculateCommission(
        breakdown[periodKey].revenue,
        commissionRate
      );
    });

    return Object.values(breakdown).sort((a, b) =>
      a.period.localeCompare(b.period)
    );
  }
}

/**
 * Commission validation utilities
 */
export class CommissionValidator {
  /**
   * Validate commission data before creation
   * @param {Object} commissionData - Commission data to validate
   * @returns {Object} Validation result
   */
  static validateCommissionData(commissionData) {
    const errors = [];

    // Required fields
    if (!commissionData.vendorId) {
      errors.push("Vendor ID is required");
    }

    if (!commissionData.period?.startDate) {
      errors.push("Period start date is required");
    }

    if (!commissionData.period?.endDate) {
      errors.push("Period end date is required");
    }

    // Date validation
    if (commissionData.period?.startDate && commissionData.period?.endDate) {
      const startDate = new Date(commissionData.period.startDate);
      const endDate = new Date(commissionData.period.endDate);

      if (startDate >= endDate) {
        errors.push("Start date must be before end date");
      }

      if (endDate > new Date()) {
        errors.push("End date cannot be in the future");
      }
    }

    // Calculation validation
    if (commissionData.calculation) {
      if (
        typeof commissionData.calculation.totalRevenue !== "number" ||
        commissionData.calculation.totalRevenue < 0
      ) {
        errors.push("Total revenue must be a non-negative number");
      }

      if (
        !CommissionCalculator.validateCommissionRate(
          commissionData.calculation.commissionRate
        )
      ) {
        errors.push("Commission rate must be between 0 and 1");
      }

      if (
        typeof commissionData.calculation.commissionAmount !== "number" ||
        commissionData.calculation.commissionAmount < 0
      ) {
        errors.push("Commission amount must be a non-negative number");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate payment data
   * @param {Object} paymentData - Payment data to validate
   * @returns {Object} Validation result
   */
  static validatePaymentData(paymentData) {
    const errors = [];

    const validMethods = [
      "bank_transfer",
      "paypal",
      "stripe",
      "check",
      "other",
    ];

    if (paymentData.method && !validMethods.includes(paymentData.method)) {
      errors.push(`Payment method must be one of: ${validMethods.join(", ")}`);
    }

    if (
      paymentData.transactionId &&
      typeof paymentData.transactionId !== "string"
    ) {
      errors.push("Transaction ID must be a string");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if commission can be modified
   * @param {Object} commission - Commission object
   * @param {string} action - Action to perform
   * @returns {Object} Validation result
   */
  static canModifyCommission(commission, action) {
    const errors = [];

    switch (action) {
      case "approve":
        if (commission.status !== "calculated") {
          errors.push(
            "Commission can only be approved if status is 'calculated'"
          );
        }
        break;

      case "pay":
        if (!["calculated", "approved"].includes(commission.status)) {
          errors.push(
            "Commission can only be paid if status is 'calculated' or 'approved'"
          );
        }
        break;

      case "dispute":
        if (commission.status === "paid") {
          errors.push("Cannot dispute a paid commission");
        }
        break;

      case "update":
        if (commission.status === "paid") {
          errors.push("Cannot update a paid commission");
        }
        break;

      case "delete":
        if (commission.status === "paid") {
          errors.push("Cannot delete a paid commission");
        }
        break;

      default:
        errors.push(`Unknown action: ${action}`);
    }

    return {
      canModify: errors.length === 0,
      errors,
    };
  }
}

/**
 * Commission period utilities
 */
export class CommissionPeriodUtils {
  /**
   * Generate standard periods for commission calculation
   * @param {string} type - Period type (weekly, monthly, quarterly, yearly)
   * @param {Date} referenceDate - Reference date (defaults to current date)
   * @returns {Object} Period with start and end dates
   */
  static generatePeriod(type, referenceDate = new Date()) {
    const ref = moment(referenceDate);

    switch (type) {
      case "weekly":
        return {
          startDate: ref.clone().startOf("week").toDate(),
          endDate: ref.clone().endOf("week").toDate(),
          type: "weekly",
        };

      case "monthly":
        return {
          startDate: ref.clone().startOf("month").toDate(),
          endDate: ref.clone().endOf("month").toDate(),
          type: "monthly",
        };

      case "quarterly":
        return {
          startDate: ref.clone().startOf("quarter").toDate(),
          endDate: ref.clone().endOf("quarter").toDate(),
          type: "quarterly",
        };

      case "yearly":
        return {
          startDate: ref.clone().startOf("year").toDate(),
          endDate: ref.clone().endOf("year").toDate(),
          type: "yearly",
        };

      default:
        throw new Error(`Invalid period type: ${type}`);
    }
  }

  /**
   * Check if two periods overlap
   * @param {Object} period1 - First period
   * @param {Object} period2 - Second period
   * @returns {boolean} True if periods overlap
   */
  static periodsOverlap(period1, period2) {
    const start1 = moment(period1.startDate);
    const end1 = moment(period1.endDate);
    const start2 = moment(period2.startDate);
    const end2 = moment(period2.endDate);

    return start1.isBefore(end2) && start2.isBefore(end1);
  }

  /**
   * Get previous period
   * @param {Object} period - Current period
   * @returns {Object} Previous period
   */
  static getPreviousPeriod(period) {
    const duration =
      moment(period.endDate).diff(moment(period.startDate), "days") + 1;
    const startDate = moment(period.startDate)
      .subtract(duration, "days")
      .toDate();
    const endDate = moment(period.startDate).subtract(1, "day").toDate();

    return {
      startDate,
      endDate,
      type: period.type || "custom",
    };
  }

  /**
   * Get next period
   * @param {Object} period - Current period
   * @returns {Object} Next period
   */
  static getNextPeriod(period) {
    const duration =
      moment(period.endDate).diff(moment(period.startDate), "days") + 1;
    const startDate = moment(period.endDate).add(1, "day").toDate();
    const endDate = moment(startDate)
      .add(duration - 1, "days")
      .toDate();

    return {
      startDate,
      endDate,
      type: period.type || "custom",
    };
  }
}

/**
 * Commission reporting utilities
 */
export class CommissionReportUtils {
  /**
   * Generate commission summary for multiple vendors
   * @param {Array} commissions - Array of commission objects
   * @returns {Object} Summary statistics
   */
  static generateSummary(commissions) {
    const summary = {
      totalCommissions: commissions.length,
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
      approvedAmount: 0,
      disputedAmount: 0,
      statusBreakdown: {},
      vendorCount: new Set(),
    };

    commissions.forEach((commission) => {
      summary.totalAmount += commission.calculation.commissionAmount;
      summary.vendorCount.add(commission.vendorId.toString());

      // Status breakdown
      if (!summary.statusBreakdown[commission.status]) {
        summary.statusBreakdown[commission.status] = 0;
      }
      summary.statusBreakdown[commission.status]++;

      // Amount breakdown by status
      switch (commission.status) {
        case "paid":
          summary.paidAmount += commission.calculation.commissionAmount;
          break;
        case "approved":
          summary.approvedAmount += commission.calculation.commissionAmount;
          break;
        case "disputed":
          summary.disputedAmount += commission.calculation.commissionAmount;
          break;
        default:
          summary.pendingAmount += commission.calculation.commissionAmount;
      }
    });

    summary.vendorCount = summary.vendorCount.size;
    summary.avgCommissionAmount =
      summary.totalCommissions > 0
        ? summary.totalAmount / summary.totalCommissions
        : 0;
    summary.paymentCompletionRate =
      summary.totalAmount > 0
        ? (summary.paidAmount / summary.totalAmount) * 100
        : 0;

    // Round amounts to 2 decimal places
    Object.keys(summary).forEach((key) => {
      if (key.includes("Amount") || key.includes("Rate")) {
        summary[key] = Math.round(summary[key] * 100) / 100;
      }
    });

    return summary;
  }

  /**
   * Format commission data for export
   * @param {Array} commissions - Array of commission objects
   * @param {string} format - Export format (csv, json)
   * @returns {string|Object} Formatted data
   */
  static formatForExport(commissions, format = "csv") {
    const data = commissions.map((commission) => ({
      vendorId: commission.vendorId,
      vendorName: commission.vendor?.businessName || "N/A",
      periodStart: commission.period.startDate,
      periodEnd: commission.period.endDate,
      totalRevenue: commission.calculation.totalRevenue,
      commissionRate: commission.calculation.commissionRate,
      commissionAmount: commission.calculation.commissionAmount,
      totalOrders: commission.calculation.totalOrders,
      status: commission.status,
      createdAt: commission.createdAt,
      paidAt: commission.payment?.paidAt || null,
      paymentMethod: commission.payment?.method || null,
    }));

    if (format === "json") {
      return data;
    }

    if (format === "csv") {
      const headers = Object.keys(data[0] || {});
      const csvRows = [
        headers.join(","),
        ...data.map((row) =>
          headers
            .map((header) => {
              const value = row[header];
              // Escape commas and quotes in CSV
              if (
                typeof value === "string" &&
                (value.includes(",") || value.includes('"'))
              ) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value || "";
            })
            .join(",")
        ),
      ];
      return csvRows.join("\n");
    }

    throw new Error(`Unsupported export format: ${format}`);
  }
}
