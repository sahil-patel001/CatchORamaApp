import { asyncHandler } from "../middleware/errorHandler.js";
import Order from "../models/Order.js";
import Vendor from "../models/Vendor.js";
import Commission from "../models/Commission.js";
import moment from "moment";
import mongoose from "mongoose";

// @desc    Generate weekly sales report for a vendor
// @route   GET /api/v1/reports/sales
// @access  Private (Vendor, Superadmin)
export const getSalesReport = asyncHandler(async (req, res, next) => {
  let vendor;

  if (req.user.role === "vendor") {
    // For vendors, find their vendor profile
    vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: { message: "Vendor profile not found for the current user." },
      });
    }
  } else if (req.user.role === "superadmin") {
    // For superadmins, they can specify a vendorId in query params
    const { vendorId } = req.query;
    if (!vendorId) {
      return res.status(400).json({
        success: false,
        error: { message: "Vendor ID is required for superadmin access." },
      });
    }
    vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: { message: "Vendor not found." },
      });
    }
  }

  const {
    period = "weekly",
    startDate: customStartDate,
    endDate: customEndDate,
  } = req.query;
  let startDate, endDate;

  // If custom date range is provided, use it
  if (customStartDate && customEndDate) {
    // Parse dates in local timezone to avoid timezone shifts
    startDate = moment(customStartDate, "YYYY-MM-DD").startOf("day").toDate();
    endDate = moment(customEndDate, "YYYY-MM-DD").endOf("day").toDate();
  } else {
    // Use period-based date range
    endDate = moment().endOf("day").toDate();
    switch (period) {
      case "weekly":
        startDate = moment().subtract(7, "days").startOf("day").toDate();
        break;
      case "monthly":
        startDate = moment().subtract(1, "month").startOf("day").toDate();
        break;
      case "yearly":
        startDate = moment().subtract(1, "year").startOf("day").toDate();
        break;
      default:
        startDate = moment().subtract(7, "days").startOf("day").toDate();
    }
  }

  const salesData = await Order.aggregate([
    {
      $match: {
        vendorId: vendor._id,
        createdAt: { $gte: startDate, $lte: endDate },
        status: "delivered", // Consider only completed orders for sales
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        totalSales: { $sum: "$orderTotal" },
        orderCount: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const report = {
    vendorInfo: {
      businessName: vendor.businessName,
      abn: vendor.businessDetails?.taxId
        ? vendor.businessDetails.taxId.replace(/[^0-9]/g, "")
        : "N/A", // Filter to numeric only for invoice display
      gstRegistered: vendor.businessDetails?.gstRegistered || false, // Add this field to your Vendor model
    },
    salesData,
    summary: {
      totalRevenue: salesData.reduce((acc, day) => acc + day.totalSales, 0),
      totalOrders: salesData.reduce((acc, day) => acc + day.orderCount, 0),
      period: period,
      startDate,
      endDate,
    },
  };

  res.status(200).json({
    success: true,
    data: report,
  });
});

// @desc    Generate commission report for all vendors (Super Admin only)
// @route   GET /api/v1/reports/commission
// @access  Private (Superadmin only)
export const getCommissionReport = asyncHandler(async (req, res, next) => {
  const {
    period = "monthly",
    startDate,
    endDate,
    vendorId,
    paymentStatus,
  } = req.query;

  let dateFilter = {};
  let orderMatchFilter = {
    status: "delivered", // Only count delivered orders
    paymentStatus: "paid", // Only count paid orders
  };

  // Add vendor filter if specified
  if (vendorId && vendorId !== "all") {
    orderMatchFilter.vendorId = new mongoose.Types.ObjectId(vendorId);
  }

  if (startDate && endDate) {
    // Custom date range - parse dates in local timezone to avoid timezone shifts
    dateFilter = {
      createdAt: {
        $gte: moment(startDate, "YYYY-MM-DD").startOf("day").toDate(),
        $lte: moment(endDate, "YYYY-MM-DD").endOf("day").toDate(),
      },
    };
  } else {
    // Predefined periods
    let start;
    switch (period) {
      case "weekly":
        start = moment().subtract(7, "days").startOf("day").toDate();
        break;
      case "monthly":
        start = moment().subtract(1, "month").startOf("day").toDate();
        break;
      case "quarterly":
        start = moment().subtract(3, "months").startOf("day").toDate();
        break;
      case "yearly":
        start = moment().subtract(1, "year").startOf("day").toDate();
        break;
      default:
        start = moment().subtract(1, "month").startOf("day").toDate();
    }
    dateFilter = { createdAt: { $gte: start } };
  }

  // Aggregate commission data by vendor with payment status
  const commissionData = await Order.aggregate([
    {
      $match: {
        ...dateFilter,
        ...orderMatchFilter,
      },
    },
    {
      $lookup: {
        from: "vendors",
        localField: "vendorId",
        foreignField: "_id",
        as: "vendor",
      },
    },
    {
      $unwind: "$vendor",
    },
    {
      $group: {
        _id: "$vendorId",
        vendorName: { $first: "$vendor.businessName" },
        commissionRate: { $first: "$vendor.commissionRate" },
        totalRevenue: { $sum: "$orderTotal" },
        totalOrders: { $sum: 1 },
        avgOrderValue: { $avg: "$orderTotal" },
      },
    },
    {
      $addFields: {
        commissionOwed: { $multiply: ["$totalRevenue", "$commissionRate"] },
      },
    },
    {
      $sort: { commissionOwed: -1 },
    },
  ]);

  // Get commission payment status for each vendor
  for (const vendorData of commissionData) {
    const commissionQuery = {
      vendorId: vendorData._id,
      "period.startDate": {
        $gte:
          dateFilter.createdAt?.$gte ||
          moment().subtract(1, "month").startOf("day").toDate(),
      },
      "period.endDate": { $lte: dateFilter.createdAt?.$lte || new Date() },
    };

    // Add payment status filter if specified
    if (paymentStatus && paymentStatus !== "all") {
      commissionQuery.status = paymentStatus;
    }

    const commissionRecords = await Commission.find(commissionQuery).sort({
      createdAt: -1,
    });

    // Calculate payment status summary
    const paymentStatusSummary = {
      totalCommissionRecords: commissionRecords.length,
      paidAmount: 0,
      pendingAmount: 0,
      approvedAmount: 0,
      disputedAmount: 0,
      latestPaymentDate: null,
      oldestPendingDate: null,
    };

    commissionRecords.forEach((record) => {
      switch (record.status) {
        case "paid":
          paymentStatusSummary.paidAmount +=
            record.calculation.commissionAmount;
          if (
            !paymentStatusSummary.latestPaymentDate ||
            record.payment.paidAt > paymentStatusSummary.latestPaymentDate
          ) {
            paymentStatusSummary.latestPaymentDate = record.payment.paidAt;
          }
          break;
        case "approved":
          paymentStatusSummary.approvedAmount +=
            record.calculation.commissionAmount;
          if (
            !paymentStatusSummary.oldestPendingDate ||
            record.approvedAt < paymentStatusSummary.oldestPendingDate
          ) {
            paymentStatusSummary.oldestPendingDate = record.approvedAt;
          }
          break;
        case "disputed":
          paymentStatusSummary.disputedAmount +=
            record.calculation.commissionAmount;
          break;
        default:
          paymentStatusSummary.pendingAmount +=
            record.calculation.commissionAmount;
          if (
            !paymentStatusSummary.oldestPendingDate ||
            record.createdAt < paymentStatusSummary.oldestPendingDate
          ) {
            paymentStatusSummary.oldestPendingDate = record.createdAt;
          }
      }
    });

    // Add payment status to vendor data
    vendorData.paymentStatus = paymentStatusSummary;
    vendorData.paymentCompletionRate =
      vendorData.commissionOwed > 0
        ? (paymentStatusSummary.paidAmount / vendorData.commissionOwed) * 100
        : 0;
  }

  // Calculate totals including payment status
  const totals = commissionData.reduce(
    (acc, vendor) => ({
      totalRevenue: acc.totalRevenue + vendor.totalRevenue,
      totalCommission: acc.totalCommission + vendor.commissionOwed,
      totalOrders: acc.totalOrders + vendor.totalOrders,
      totalVendors: acc.totalVendors + 1,
      totalPaidAmount:
        acc.totalPaidAmount + (vendor.paymentStatus?.paidAmount || 0),
      totalPendingAmount:
        acc.totalPendingAmount + (vendor.paymentStatus?.pendingAmount || 0),
      totalApprovedAmount:
        acc.totalApprovedAmount + (vendor.paymentStatus?.approvedAmount || 0),
      totalDisputedAmount:
        acc.totalDisputedAmount + (vendor.paymentStatus?.disputedAmount || 0),
    }),
    {
      totalRevenue: 0,
      totalCommission: 0,
      totalOrders: 0,
      totalVendors: 0,
      totalPaidAmount: 0,
      totalPendingAmount: 0,
      totalApprovedAmount: 0,
      totalDisputedAmount: 0,
    }
  );

  const report = {
    period,
    dateRange: {
      start: startDate || dateFilter.createdAt.$gte,
      end: endDate || new Date(),
    },
    vendors: commissionData,
    summary: {
      ...totals,
      avgCommissionRate:
        totals.totalVendors > 0
          ? commissionData.reduce((acc, v) => acc + v.commissionRate, 0) /
            totals.totalVendors
          : 0,
      avgRevenuePerVendor:
        totals.totalVendors > 0 ? totals.totalRevenue / totals.totalVendors : 0,
      paymentCompletionRate:
        totals.totalCommission > 0
          ? (totals.totalPaidAmount / totals.totalCommission) * 100
          : 0,
      outstandingAmount: totals.totalCommission - totals.totalPaidAmount,
    },
  };

  res.status(200).json({
    success: true,
    data: report,
  });
});
