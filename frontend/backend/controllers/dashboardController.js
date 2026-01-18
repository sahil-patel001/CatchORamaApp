import { asyncHandler } from "../middleware/errorHandler.js";
import User from "../models/User.js";
import Vendor from "../models/Vendor.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";

// @desc    Get admin dashboard statistics
// @route   GET /api/v1/dashboard/admin
// @access  Private (Super Admin only)
export const getAdminDashboard = asyncHandler(async (req, res, next) => {
  const {
    period = "30d",
    startDate: customStartDate,
    endDate: customEndDate,
  } = req.query;

  // Calculate date range
  const now = new Date();
  let startDate, endDate;

  // If custom date range is provided, use it
  if (customStartDate && customEndDate) {
    // Parse dates using native JavaScript Date (YYYY-MM-DD format)
    startDate = new Date(customStartDate + "T00:00:00.000Z");
    endDate = new Date(customEndDate + "T23:59:59.999Z");
  } else {
    // Use period-based date range
    endDate = now;
    switch (period) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "1y":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  // Get basic statistics - optimize with combined aggregation where possible
  const [
    totalVendors,
    totalProducts,
    totalUsers,
    orderStats,
    recentProducts,
    recentVendorsCount,
    topVendors,
    topProducts,
    monthlyStats,
    recentVendorsList,
  ] = await Promise.all([
    Vendor.countDocuments({ status: "active" }),
    Product.countDocuments({ status: "active" }),
    User.countDocuments({ isActive: true }),

    // Order statistics - optimized single aggregation
    Order.aggregate([
      {
        $facet: {
          totalStats: [
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: "$orderTotal" },
                avgOrderValue: { $avg: "$orderTotal" },
              },
            },
          ],
          recentStats: [
            {
              $match: {
                createdAt: { $gte: startDate, $lte: endDate },
              },
            },
            {
              $group: {
                _id: null,
                recentOrders: { $sum: 1 },
                recentRevenue: { $sum: "$orderTotal" },
              },
            },
          ],
        },
      },
      {
        $project: {
          totalOrders: { $arrayElemAt: ["$totalStats.totalOrders", 0] },
          totalRevenue: {
            $round: [{ $arrayElemAt: ["$totalStats.totalRevenue", 0] }, 2],
          },
          avgOrderValue: {
            $round: [{ $arrayElemAt: ["$totalStats.avgOrderValue", 0] }, 2],
          },
          recentOrders: {
            $ifNull: [{ $arrayElemAt: ["$recentStats.recentOrders", 0] }, 0],
          },
          recentRevenue: {
            $round: [
              {
                $ifNull: [
                  { $arrayElemAt: ["$recentStats.recentRevenue", 0] },
                  0,
                ],
              },
              2,
            ],
          },
        },
      },
    ]),

    // Recent products count
    Product.countDocuments({
      status: "active",
      createdAt: { $gte: startDate, $lte: endDate },
    }),

    // Recent vendors count (filtered by date range)
    Vendor.countDocuments({
      status: "active",
      createdAt: { $gte: startDate, $lte: endDate },
    }),

    // Top vendors by revenue - optimized with index hints and reduced lookups
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: "$vendorId",
          totalRevenue: { $sum: "$orderTotal" },
          totalOrders: { $sum: 1 },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "vendors",
          localField: "_id",
          foreignField: "_id",
          as: "vendor",
          pipeline: [
            {
              $project: {
                businessName: 1,
                contactEmail: 1,
                status: 1,
                userId: 1,
              },
            },
          ],
        },
      },
      { $unwind: "$vendor" },
      {
        $lookup: {
          from: "users",
          localField: "vendor.userId",
          foreignField: "_id",
          as: "user",
          pipeline: [
            {
              $project: {
                name: 1,
              },
            },
          ],
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 1,
          totalRevenue: { $round: ["$totalRevenue", 2] },
          totalOrders: 1,
          businessName: "$vendor.businessName",
          contactEmail: "$vendor.contactEmail",
          status: "$vendor.status",
          userName: "$user.name",
        },
      },
    ]),

    // Top products by sales
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          totalSold: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.total" },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $addFields: {
          totalRevenue: { $round: ["$totalRevenue", 2] },
        },
      },
    ]),

    // Monthly statistics for the last 12 months
    Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$orderTotal" },
        },
      },
      {
        $addFields: {
          totalRevenue: { $round: ["$totalRevenue", 2] },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),

    // Recent vendors list (for display purposes)
    Vendor.find({ status: "active" })
      .populate("user", "name email createdAt")
      .sort({ createdAt: -1 })
      .limit(5),
  ]);

  const stats = orderStats[0] || {
    totalOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    recentOrders: 0,
    recentRevenue: 0,
  };

  // If no top vendors from orders, get all vendors as fallback
  let finalTopVendors = topVendors;
  if (topVendors.length === 0) {
    const allVendors = await Vendor.find({ status: "active" })
      .populate("userId", "name email")
      .limit(10)
      .sort({ createdAt: -1 });

    finalTopVendors = allVendors.map((vendor) => ({
      _id: vendor._id,
      totalRevenue: 0,
      totalOrders: 0,
      businessName: vendor.businessName,
      contactEmail: vendor.contactEmail,
      status: vendor.status,
      userName: vendor.userId?.name || "Unknown",
    }));
  }

  // Helper function to format revenue to 2 decimal places
  const formatRevenue = (value) => Math.round((value || 0) * 100) / 100;

  // Format top vendors revenue
  const formattedTopVendors = finalTopVendors.map((vendor) => ({
    ...vendor,
    totalRevenue: formatRevenue(vendor.totalRevenue),
  }));

  // Format top products revenue
  const formattedTopProducts = topProducts.map((product) => ({
    ...product,
    totalRevenue: formatRevenue(product.totalRevenue),
  }));

  // Format monthly stats revenue
  const formattedMonthlyStats = monthlyStats.map((stat) => ({
    ...stat,
    totalRevenue: formatRevenue(stat.totalRevenue),
  }));

  res.status(200).json({
    success: true,
    data: {
      overview: {
        totalVendors,
        totalProducts,
        totalUsers,
        totalOrders: stats.totalOrders,
        totalRevenue: formatRevenue(stats.totalRevenue),
        avgOrderValue: formatRevenue(stats.avgOrderValue),
        recentOrders: stats.recentOrders,
        recentRevenue: formatRevenue(stats.recentRevenue),
        recentProducts: recentProducts,
        recentVendors: recentVendorsCount,
      },
      recentVendors: recentVendorsList,
      topVendors: formattedTopVendors,
      topProducts: formattedTopProducts,
      monthlyStats: formattedMonthlyStats,
      period,
    },
  });
});

// @desc    Get vendor dashboard statistics
// @route   GET /api/v1/dashboard/vendor
// @access  Private (Vendor only)
export const getVendorDashboard = asyncHandler(async (req, res, next) => {
  const {
    period = "30d",
    startDate: customStartDate,
    endDate: customEndDate,
  } = req.query;

  // Get vendor
  const vendor = await Vendor.findOne({ userId: req.user._id });
  if (!vendor) {
    return res.status(404).json({
      success: false,
      error: {
        message: "Vendor profile not found",
      },
    });
  }

  // Calculate date range for current and previous periods
  const now = new Date();
  let startDate, endDate, previousPeriodStartDate, previousPeriodEndDate;

  // If custom date range is provided, use it
  if (customStartDate && customEndDate) {
    try {
      console.log("Parsing custom dates:", customStartDate, customEndDate);
      // Parse dates using native JavaScript Date (YYYY-MM-DD format)
      startDate = new Date(customStartDate + "T00:00:00.000Z");
      endDate = new Date(customEndDate + "T23:59:59.999Z");
      console.log("Parsed dates:", startDate, endDate);

      // Calculate previous period for comparison (same duration before start date)
      const duration = endDate.getTime() - startDate.getTime();
      previousPeriodEndDate = new Date(startDate.getTime());
      previousPeriodStartDate = new Date(startDate.getTime() - duration);
      console.log(
        "Previous period dates:",
        previousPeriodStartDate,
        previousPeriodEndDate
      );
    } catch (error) {
      console.error("Error parsing custom dates:", error);
      throw error;
    }
  } else {
    // Use period-based date range
    endDate = now;
    switch (period) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousPeriodEndDate = new Date(startDate.getTime());
        previousPeriodStartDate = new Date(
          startDate.getTime() - 7 * 24 * 60 * 60 * 1000
        );
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousPeriodEndDate = new Date(startDate.getTime());
        previousPeriodStartDate = new Date(
          startDate.getTime() - 30 * 24 * 60 * 60 * 1000
        );
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        previousPeriodEndDate = new Date(startDate.getTime());
        previousPeriodStartDate = new Date(
          startDate.getTime() - 90 * 24 * 60 * 60 * 1000
        );
        break;
      case "1y":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        previousPeriodEndDate = new Date(startDate.getTime());
        previousPeriodStartDate = new Date(
          startDate.getTime() - 365 * 24 * 60 * 60 * 1000
        );
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousPeriodEndDate = new Date(startDate.getTime());
        previousPeriodStartDate = new Date(
          startDate.getTime() - 30 * 24 * 60 * 60 * 1000
        );
    }
  }

  let productStats,
    orderStats,
    previousPeriodStats,
    recentOrders,
    topProducts,
    leastSellingProducts,
    lowStockProducts,
    monthlyStats;

  console.log(
    "Starting database queries with date range:",
    startDate,
    "to",
    endDate
  );
  console.log(
    "Previous period range:",
    previousPeriodStartDate,
    "to",
    previousPeriodEndDate
  );
  [
    productStats,
    orderStats,
    previousPeriodStats,
    recentOrders,
    topProducts,
    leastSellingProducts,
    lowStockProducts,
    monthlyStats,
  ] = await Promise.all([
    // Product statistics
    Product.aggregate([
      { $match: { vendorId: vendor._id } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          activeProducts: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
          },
          outOfStockProducts: {
            $sum: { $cond: [{ $eq: ["$stock", 0] }, 1, 0] },
          },
          lowStockProducts: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ["$stock", 0] },
                    { $lte: ["$stock", "$inventory.lowStockThreshold"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          totalValue: { $sum: { $multiply: ["$price", "$stock"] } },
        },
      },
    ]),

    // Order statistics
    Order.aggregate([
      { $match: { vendorId: vendor._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$orderTotal" },
          avgOrderValue: { $avg: "$orderTotal" },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          processingOrders: {
            $sum: { $cond: [{ $eq: ["$status", "processing"] }, 1, 0] },
          },
          recentOrders: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ["$createdAt", startDate] },
                    { $lte: ["$createdAt", endDate] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          recentRevenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ["$createdAt", startDate] },
                    { $lte: ["$createdAt", endDate] },
                  ],
                },
                "$orderTotal",
                0,
              ],
            },
          },
        },
      },
      {
        $addFields: {
          totalRevenue: { $round: ["$totalRevenue", 2] },
          avgOrderValue: { $round: ["$avgOrderValue", 2] },
          recentRevenue: { $round: ["$recentRevenue", 2] },
        },
      },
    ]),

    // Previous period statistics for growth calculation
    Order.aggregate([
      {
        $match: {
          vendorId: vendor._id,
          createdAt: {
            $gte: previousPeriodStartDate,
            $lt: previousPeriodEndDate,
          },
        },
      },
      {
        $group: {
          _id: null,
          previousOrders: { $sum: 1 },
          previousRevenue: { $sum: "$orderTotal" },
          previousAvgOrderValue: { $avg: "$orderTotal" },
        },
      },
      {
        $addFields: {
          previousRevenue: { $round: ["$previousRevenue", 2] },
          previousAvgOrderValue: { $round: ["$previousAvgOrderValue", 2] },
        },
      },
    ]),

    // Recent orders
    Order.aggregate([
      { $match: { vendorId: vendor._id } },
      { $sort: { createdAt: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 1,
          orderNumber: 1,
          customer: 1,
          orderTotal: { $round: ["$orderTotal", 2] },
          status: 1,
          createdAt: 1,
        },
      },
    ]),

    // Top selling products
    Order.aggregate([
      { $match: { vendorId: vendor._id } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          totalSold: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.total" },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $addFields: {
          totalRevenue: { $round: ["$totalRevenue", 2] },
        },
      },
    ]),

    // Least selling products (includes products with zero sales)
    Product.aggregate([
      { $match: { vendorId: vendor._id, status: "active" } },
      {
        $lookup: {
          from: "orders",
          let: { productId: "$_id", vendorId: "$vendorId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$vendorId", "$$vendorId"] } } },
            { $unwind: "$items" },
            {
              $match: {
                $expr: { $eq: ["$items.productId", "$$productId"] },
              },
            },
            {
              $group: {
                _id: null,
                totalSold: { $sum: "$items.quantity" },
                totalRevenue: { $sum: "$items.total" },
              },
            },
          ],
          as: "salesData",
        },
      },
      {
        $addFields: {
          totalSold: {
            $ifNull: [{ $arrayElemAt: ["$salesData.totalSold", 0] }, 0],
          },
          totalRevenue: {
            $ifNull: [{ $arrayElemAt: ["$salesData.totalRevenue", 0] }, 0],
          },
        },
      },
      { $sort: { totalSold: 1, createdAt: -1 } }, // Sort by least sold, then by newest
      { $limit: 5 },
      {
        $project: {
          _id: 1,
          totalSold: 1,
          totalRevenue: { $round: ["$totalRevenue", 2] },
          product: {
            _id: "$_id",
            name: "$name",
            category: "$category",
            price: { $round: ["$price", 2] },
            stock: "$stock",
          },
        },
      },
    ]),

    // Low stock products
    Product.aggregate([
      {
        $match: {
          vendorId: vendor._id,
          $expr: { $lte: ["$stock", "$inventory.lowStockThreshold"] },
          stock: { $gt: 0 },
        },
      },
      { $limit: 10 },
      {
        $project: {
          _id: 1,
          name: 1,
          stock: 1,
          sku: "$inventory.sku",
          lowStockThreshold: "$inventory.lowStockThreshold",
        },
      },
    ]),

    // Monthly statistics for the last 12 months
    Order.aggregate([
      {
        $match: {
          vendorId: vendor._id,
          createdAt: {
            $gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$orderTotal" },
        },
      },
      {
        $addFields: {
          totalRevenue: { $round: ["$totalRevenue", 2] },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
  ]);

  const products = productStats[0] || {
    totalProducts: 0,
    activeProducts: 0,
    outOfStockProducts: 0,
    lowStockProducts: 0,
    totalValue: 0,
  };

  const orders = orderStats[0] || {
    totalOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    pendingOrders: 0,
    processingOrders: 0,
    recentOrders: 0,
    recentRevenue: 0,
  };

  const previousPeriod = previousPeriodStats[0] || {
    previousOrders: 0,
    previousRevenue: 0,
    previousAvgOrderValue: 0,
  };

  // Helper function to format revenue to 2 decimal places
  const formatRevenue = (value) => Math.round((value || 0) * 100) / 100;

  // Helper function to calculate growth rate
  const calculateGrowthRate = (current, previous) => {
    if (previous === 0) {
      return current > 0 ? 100 : 0; // 100% growth if previous was 0 and current > 0
    }
    return Math.round(((current - previous) / previous) * 100 * 100) / 100; // Round to 2 decimal places
  };

  // Calculate growth rates
  const revenueGrowthRate = calculateGrowthRate(
    orders.recentRevenue,
    previousPeriod.previousRevenue
  );
  const orderGrowthRate = calculateGrowthRate(
    orders.recentOrders,
    previousPeriod.previousOrders
  );
  const avgOrderValueGrowthRate = calculateGrowthRate(
    orders.avgOrderValue,
    previousPeriod.previousAvgOrderValue
  );

  // Calculate month-over-month growth from monthly stats
  let monthlyGrowthRate = 0;
  if (monthlyStats && monthlyStats.length >= 2) {
    const currentMonth = monthlyStats[monthlyStats.length - 1];
    const previousMonth = monthlyStats[monthlyStats.length - 2];
    monthlyGrowthRate = calculateGrowthRate(
      currentMonth.totalRevenue,
      previousMonth.totalRevenue
    );
  }

  res.status(200).json({
    success: true,
    data: {
      overview: {
        ...products,
        totalRevenue: formatRevenue(orders.totalRevenue),
        avgOrderValue: formatRevenue(orders.avgOrderValue),
        recentRevenue: formatRevenue(orders.recentRevenue),
        totalValue: formatRevenue(products.totalValue),
        // Keep other order fields as they are (counts, not revenue)
        totalOrders: orders.totalOrders,
        pendingOrders: orders.pendingOrders,
        processingOrders: orders.processingOrders,
        recentOrders: orders.recentOrders,
      },
      growthRates: {
        revenueGrowthRate,
        orderGrowthRate,
        avgOrderValueGrowthRate,
        monthlyGrowthRate,
        period: period,
        currentPeriod: {
          revenue: formatRevenue(orders.recentRevenue),
          orders: orders.recentOrders,
          avgOrderValue: formatRevenue(orders.avgOrderValue),
        },
        previousPeriod: {
          revenue: formatRevenue(previousPeriod.previousRevenue),
          orders: previousPeriod.previousOrders,
          avgOrderValue: formatRevenue(previousPeriod.previousAvgOrderValue),
        },
      },
      recentOrders,
      topProducts,
      leastSellingProducts,
      lowStockProducts,
      monthlyStats,
      period,
    },
  });
});
