import { asyncHandler } from "../middleware/errorHandler.js";
import Commission from "../models/Commission.js";
import Vendor from "../models/Vendor.js";
import Order from "../models/Order.js";
import moment from "moment";
import {
  CommissionCalculator,
  CommissionValidator,
  CommissionPeriodUtils,
  CommissionReportUtils,
} from "../utils/commissionUtils.js";
import {
  triggerCommissionUpdateNotification,
  triggerSystemAlert,
} from "../utils/notificationTriggers.js";

// @desc    Get all commissions with filtering and pagination
// @route   GET /api/v1/commissions
// @access  Private (Superadmin only)
export const getCommissions = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    status,
    vendorId,
    startDate,
    endDate,
    sortBy = "createdAt",
    sortOrder = "desc",
    search,
  } = req.query;

  // Build filter object
  const filter = {};
  if (status) filter.status = status;
  
  // Handle vendor filtering with search support
  if (vendorId) {
    filter.vendorId = vendorId;
  } else if (search && search.trim()) {
    // If search is provided and no explicit vendorId, search by vendor business name
    const matchingVendors = await Vendor.find({
      businessName: { $regex: search, $options: "i" },
    }).select("_id").lean();
    
    if (matchingVendors.length > 0) {
      filter.vendorId = { $in: matchingVendors.map(v => v._id) };
    } else {
      // No matching vendors found, return empty result
      filter.vendorId = { $in: [] };
    }
  }
  
  if (startDate || endDate) {
    filter["period.startDate"] = {};
    if (startDate) filter["period.startDate"].$gte = new Date(startDate);
    if (endDate) filter["period.endDate"] = { $lte: new Date(endDate) };
  }

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === "desc" ? -1 : 1;

  // Execute query with pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const commissions = await Commission.find(filter)
    .populate("vendor", "businessName")
    .populate("approvedBy", "name email")
    .populate("payment.paidBy", "name email")
    .populate("metadata.generatedBy", "name email")
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count for pagination
  const total = await Commission.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: {
      commissions,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit),
      },
    },
  });
});

// @desc    Get commission by ID
// @route   GET /api/v1/commissions/:id
// @access  Private (Superadmin only)
export const getCommission = asyncHandler(async (req, res, next) => {
  const commission = await Commission.findById(req.params.id)
    .populate("vendor", "businessName businessDetails")
    .populate("orders", "orderNumber orderTotal createdAt")
    .populate("approvedBy", "name email")
    .populate("payment.paidBy", "name email")
    .populate("metadata.generatedBy", "name email")
    .populate("metadata.lastModifiedBy", "name email");

  if (!commission) {
    return res.status(404).json({
      success: false,
      error: { message: "Commission not found" },
    });
  }

  res.status(200).json({
    success: true,
    data: commission,
  });
});

// @desc    Generate commission for vendor and period
// @route   POST /api/v1/commissions/generate
// @access  Private (Superadmin only)
export const generateCommission = asyncHandler(async (req, res, next) => {
  const {
    vendorId,
    startDate,
    endDate,
    periodType = "custom",
    commissionRate,
  } = req.body;

  // Validate required fields
  if (!vendorId || !startDate || !endDate) {
    return res.status(400).json({
      success: false,
      error: { message: "Vendor ID, start date, and end date are required" },
    });
  }

  // Validate commission rate if provided
  if (commissionRate !== undefined) {
    if (
      typeof commissionRate !== "number" ||
      commissionRate < 0 ||
      commissionRate > 1
    ) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Commission rate must be a number between 0 and 1",
        },
      });
    }
  }

  // Validate commission data using utility
  const validationResult = CommissionValidator.validateCommissionData({
    vendorId,
    period: { startDate, endDate },
  });

  if (!validationResult.isValid) {
    return res.status(400).json({
      success: false,
      error: { message: validationResult.errors.join(", ") },
    });
  }

  try {
    // Use utility function to calculate commission with optional rate override
    const calculationResult =
      await CommissionCalculator.calculateVendorCommission(
        vendorId,
        startDate,
        endDate,
        commissionRate // Pass the optional commission rate override
      );

    // Create commission record using the calculated data
    const commission = new Commission({
      vendorId,
      period: {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        type: periodType,
      },
      orderIds: calculationResult.orders.map((order) => order.id),
      calculation: calculationResult.calculation,
      status: "calculated",
      metadata: {
        generatedBy: req.user._id,
        generatedAt: new Date(),
      },
    });

    await commission.save();
    await commission.populate("vendor", "businessName");

    res.status(201).json({
      success: true,
      data: commission,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: { message: error.message },
    });
  }
});

// @desc    Approve commission
// @route   PUT /api/v1/commissions/:id/approve
// @access  Private (Superadmin only)
export const approveCommission = asyncHandler(async (req, res, next) => {
  const commission = await Commission.findById(req.params.id);

  if (!commission) {
    return res.status(404).json({
      success: false,
      error: { message: "Commission not found" },
    });
  }

  // Validate if commission can be approved using utility
  const validationResult = CommissionValidator.canModifyCommission(
    commission,
    "approve"
  );

  if (!validationResult.canModify) {
    return res.status(400).json({
      success: false,
      error: { message: validationResult.errors.join(", ") },
    });
  }

  // Extract metadata from request
  const metadata = {
    ipAddress: req.ip,
    userAgent: req.get("User-Agent"),
    source: "web",
  };

  await commission.approve(req.user._id, metadata);

  res.status(200).json({
    success: true,
    data: commission,
  });
});

// @desc    Mark commission as paid
// @route   PUT /api/v1/commissions/:id/pay
// @access  Private (Superadmin only)
export const markCommissionAsPaid = asyncHandler(async (req, res, next) => {
  const { method, transactionId, notes } = req.body;

  const commission = await Commission.findById(req.params.id);

  if (!commission) {
    return res.status(404).json({
      success: false,
      error: { message: "Commission not found" },
    });
  }

  // Validate if commission can be paid using utility
  const modifyValidation = CommissionValidator.canModifyCommission(
    commission,
    "pay"
  );

  if (!modifyValidation.canModify) {
    return res.status(400).json({
      success: false,
      error: { message: modifyValidation.errors.join(", ") },
    });
  }

  const paymentData = {
    method: method || "bank_transfer",
    transactionId,
    notes,
  };

  // Validate payment data using utility
  const paymentValidation =
    CommissionValidator.validatePaymentData(paymentData);

  if (!paymentValidation.isValid) {
    return res.status(400).json({
      success: false,
      error: { message: paymentValidation.errors.join(", ") },
    });
  }

  // Extract metadata from request
  const metadata = {
    ipAddress: req.ip,
    userAgent: req.get("User-Agent"),
    source: "web",
  };

  await commission.markAsPaid(paymentData, req.user._id, metadata);

  res.status(200).json({
    success: true,
    data: commission,
  });
});

// @desc    Dispute commission
// @route   PUT /api/v1/commissions/:id/dispute
// @access  Private (Superadmin only)
export const disputeCommission = asyncHandler(async (req, res, next) => {
  const { notes } = req.body;

  if (!notes) {
    return res.status(400).json({
      success: false,
      error: { message: "Dispute notes are required" },
    });
  }

  const commission = await Commission.findById(req.params.id);

  if (!commission) {
    return res.status(404).json({
      success: false,
      error: { message: "Commission not found" },
    });
  }

  await commission.dispute(notes, req.user._id);

  res.status(200).json({
    success: true,
    data: commission,
  });
});

// @desc    Update commission
// @route   PUT /api/v1/commissions/:id
// @access  Private (Superadmin only)
export const updateCommission = asyncHandler(async (req, res, next) => {
  const { notes, calculation } = req.body;

  const commission = await Commission.findById(req.params.id);

  if (!commission) {
    return res.status(404).json({
      success: false,
      error: { message: "Commission not found" },
    });
  }

  // Only allow updates if commission is not paid
  if (notes !== undefined) commission.notes = notes;
  if (calculation) {
    if (calculation.totalRevenue !== undefined) {
      if (calculation.totalRevenue < 0) {
        return res.status(400).json({
          success: false,
          error: { message: "Total revenue cannot be negative" },
        });
      }
      commission.calculation.totalRevenue = calculation.totalRevenue;
    }
    if (calculation.commissionRate !== undefined) {
      if (calculation.commissionRate < 0 || calculation.commissionRate > 100) {
        return res.status(400).json({
          success: false,
          error: { message: "Commission rate must be between 0 and 100" },
        });
      }
      commission.calculation.commissionRate = calculation.commissionRate;
    }
    // Recalculate commission amount if either value changed
    if (
      calculation.totalRevenue !== undefined ||
      calculation.commissionRate !== undefined
    ) {
      commission.calculation.commissionAmount =
        (commission.calculation.totalRevenue *
          commission.calculation.commissionRate) /
        100;
    }
  }
  if (calculation) {
    if (calculation.totalRevenue !== undefined) {
      commission.calculation.totalRevenue = calculation.totalRevenue;
    }
    if (calculation.commissionRate !== undefined) {
      commission.calculation.commissionRate = calculation.commissionRate;
    }
  }

  commission.metadata.lastModifiedBy = req.user._id;
  commission.metadata.lastModifiedAt = new Date();

  await commission.save();
  await commission.populate("vendorId", "businessName name userId");

  // Trigger commission update notification
  if (
    calculation &&
    (calculation.commissionRate !== undefined ||
      calculation.totalRevenue !== undefined)
  ) {
    try {
      await triggerCommissionUpdateNotification(commission, {
        updatedBy: req.user.name || req.user.email,
        updateReason:
          req.body.updateReason ||
          "Commission details updated by administrator",
        previousRate:
          calculation.commissionRate !== undefined
            ? null
            : commission.calculation.commissionRate,
        newRate:
          calculation.commissionRate || commission.calculation.commissionRate,
      });
    } catch (notificationError) {
      console.error(
        "Failed to send commission update notification:",
        notificationError
      );
      // Don't fail the commission update if notification fails
    }
  }

  res.status(200).json({
    success: true,
    data: commission,
  });
});

// @desc    Delete commission
// @route   DELETE /api/v1/commissions/:id
// @access  Private (Superadmin only)
export const deleteCommission = asyncHandler(async (req, res, next) => {
  const commission = await Commission.findById(req.params.id);

  if (!commission) {
    return res.status(404).json({
      success: false,
      error: { message: "Commission not found" },
    });
  }

  // Only allow deletion if commission is not paid
  if (commission.status === "paid") {
    return res.status(400).json({
      success: false,
      error: { message: "Cannot delete paid commission" },
    });
  }

  await commission.deleteOne();

  res.status(200).json({
    success: true,
    data: { message: "Commission deleted successfully" },
  });
});

// @desc    Get commission statistics
// @route   GET /api/v1/commissions/stats
// @access  Private (Superadmin only)
export const getCommissionStats = asyncHandler(async (req, res, next) => {
  const { vendorId, startDate, endDate } = req.query;

  const dateRange = {};
  if (startDate) dateRange.start = startDate;
  if (endDate) dateRange.end = endDate;

  const stats = await Commission.getStats(vendorId, dateRange);

  res.status(200).json({
    success: true,
    data: stats[0] || {
      totalCommissions: 0,
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
      statusCounts: {},
    },
  });
});

// @desc    Get commissions by vendor (for vendor access)
// @route   GET /api/v1/commissions/vendor
// @access  Private (Vendor only)
export const getVendorCommissions = asyncHandler(async (req, res, next) => {
  // Find vendor profile for the logged-in user
  const vendor = await Vendor.findOne({ userId: req.user._id });
  if (!vendor) {
    return res.status(404).json({
      success: false,
      error: { message: "Vendor profile not found" },
    });
  }

  const { page = 1, limit = 10, status, startDate, endDate } = req.query;

  // Build filter object
  const filter = { vendorId: vendor._id };
  if (status) filter.status = status;
  if (startDate || endDate) {
    if (startDate) {
      filter["period.startDate"] = filter["period.startDate"] || {};
      filter["period.startDate"].$gte = new Date(startDate);
    }
    if (endDate) {
      filter["period.endDate"] = filter["period.endDate"] || {};
      filter["period.endDate"].$lte = new Date(endDate);
    }
  }

  // Execute query with pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const commissions = await Commission.find(filter)
    .populate("approvedBy", "name")
    .populate("payment.paidBy", "name")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count for pagination
  const total = await Commission.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: {
      commissions,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit),
      },
    },
  });
});

// @desc    Bulk generate commissions for all vendors
// @route   POST /api/v1/commissions/bulk-generate
// @access  Private (Superadmin only)
export const bulkGenerateCommissions = asyncHandler(async (req, res, next) => {
  const {
    startDate,
    endDate,
    periodType = "monthly",
    commissionRate,
  } = req.body;

  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      error: { message: "Start date and end date are required" },
    });
  }

  // Validate commission rate if provided
  if (commissionRate !== undefined) {
    if (
      typeof commissionRate !== "number" ||
      commissionRate < 0 ||
      commissionRate > 1
    ) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Commission rate must be a number between 0 and 1",
        },
      });
    }
  }

  // Get all active vendors
  const vendors = await Vendor.find({ status: "active" });

  const results = {
    successful: [],
    failed: [],
  };

  // Generate commissions for each vendor
  for (const vendor of vendors) {
    try {
      // Use utility function to calculate commission with optional rate override
      const calculationResult =
        await CommissionCalculator.calculateVendorCommission(
          vendor._id,
          startDate,
          endDate,
          commissionRate // Pass the optional commission rate override
        );

      // Create commission record using the calculated data
      const commission = new Commission({
        vendorId: vendor._id,
        period: {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          type: periodType,
        },
        orderIds: calculationResult.orders.map((order) => order.id),
        calculation: calculationResult.calculation,
        status: "calculated",
        metadata: {
          generatedBy: req.user._id,
          generatedAt: new Date(),
        },
      });

      await commission.save();

      results.successful.push({
        vendorId: vendor._id,
        vendorName: vendor.businessName,
        commissionId: commission._id,
        amount: commission.calculation.commissionAmount,
      });
    } catch (error) {
      results.failed.push({
        vendorId: vendor._id,
        vendorName: vendor.businessName,
        error: error.message,
      });
    }
  }

  res.status(200).json({
    success: true,
    data: {
      message: `Generated ${results.successful.length} commissions successfully, ${results.failed.length} failed`,
      results,
    },
  });
});
