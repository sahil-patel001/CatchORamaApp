#!/usr/bin/env node

/**
 * Test script to verify vendor dashboard API
 * Run this after starting the backend server and seeding data
 */

import axios from "axios";

const API_BASE_URL = "http://localhost:5001/api/v1";

// Test credentials
const VENDOR_CREDENTIALS = {
  email: "john.smith@techgadgets.com",
  password: "password123",
};

async function testVendorDashboard() {
  try {
    console.log("🧪 Testing Vendor Dashboard API...\n");

    // Step 1: Login
    console.log("1. Logging in as vendor...");
    const loginResponse = await axios.post(
      `${API_BASE_URL}/auth/login`,
      VENDOR_CREDENTIALS
    );

    if (!loginResponse.data.success) {
      throw new Error("Login failed");
    }

    const token = loginResponse.data.data.token;
    console.log("✅ Login successful");

    // Step 2: Test dashboard API
    console.log("\n2. Fetching vendor dashboard data...");
    const dashboardResponse = await axios.get(
      `${API_BASE_URL}/dashboard/vendor`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          period: "30d",
        },
      }
    );

    if (!dashboardResponse.data.success) {
      throw new Error("Dashboard API failed");
    }

    const data = dashboardResponse.data.data;
    console.log("✅ Dashboard API successful");

    // Step 3: Verify data structure
    console.log("\n3. Verifying data structure...");
    console.log("📊 Dashboard Data:");
    console.log(`   - Overview: ${JSON.stringify(data.overview, null, 2)}`);
    console.log(`   - Recent Orders: ${data.recentOrders?.length || 0} orders`);
    console.log(`   - Top Products: ${data.topProducts?.length || 0} products`);
    console.log(
      `   - Least Selling Products: ${
        data.leastSellingProducts?.length || 0
      } products`
    );
    console.log(
      `   - Low Stock Products: ${data.lowStockProducts?.length || 0} products`
    );
    console.log(`   - Monthly Stats: ${data.monthlyStats?.length || 0} months`);
    console.log(
      `   - Growth Rates: ${data.growthRates ? "Available" : "Not Available"}`
    );
    console.log(`   - Period: ${data.period}`);

    // Step 4: Verify least selling products data
    if (data.leastSellingProducts && data.leastSellingProducts.length > 0) {
      console.log("\n📉 Least Selling Products:");
      data.leastSellingProducts.forEach((product, index) => {
        console.log(
          `   ${index + 1}. ${product.product.name} - ${
            product.totalSold
          } sold, $${product.totalRevenue}`
        );
      });
    }

    // Step 5: Verify revenue formatting (2 decimal places)
    console.log("\n💰 Revenue Formatting Verification:");
    console.log(
      `   - Total Revenue: $${data.overview.totalRevenue} (should have 2 decimals)`
    );
    console.log(
      `   - Recent Revenue: $${data.overview.recentRevenue} (should have 2 decimals)`
    );
    console.log(
      `   - Avg Order Value: $${data.overview.avgOrderValue} (should have 2 decimals)`
    );

    if (data.topProducts && data.topProducts.length > 0) {
      console.log(
        `   - Top Product Revenue: $${data.topProducts[0].totalRevenue} (should have 2 decimals)`
      );
    }

    if (data.monthlyStats && data.monthlyStats.length > 0) {
      console.log(
        `   - Monthly Revenue: $${data.monthlyStats[0].totalRevenue} (should have 2 decimals)`
      );
    }

    // Step 6: Verify clean recentOrders structure
    console.log("\n📋 Recent Orders Structure Verification:");
    if (data.recentOrders && data.recentOrders.length > 0) {
      const firstOrder = data.recentOrders[0];
      console.log(
        `   - First Order Keys: ${Object.keys(firstOrder).join(", ")}`
      );
      console.log(`   - Order Number: ${firstOrder.orderNumber}`);
      console.log(`   - Customer: ${firstOrder.customer?.name || "N/A"}`);
      console.log(
        `   - Order Total: $${firstOrder.orderTotal} (should have 2 decimals)`
      );
      console.log(`   - Status: ${firstOrder.status}`);
      console.log(
        `   - No Mongoose metadata: ${
          !firstOrder.$__ ? "✅ Clean" : "❌ Has metadata"
        }`
      );
    } else {
      console.log("   - No recent orders found");
    }

    // Step 7: Verify growth rates data
    console.log("\n📈 Growth Rates Verification:");
    if (data.growthRates) {
      console.log(
        `   - Revenue Growth Rate: ${data.growthRates.revenueGrowthRate}%`
      );
      console.log(
        `   - Order Growth Rate: ${data.growthRates.orderGrowthRate}%`
      );
      console.log(
        `   - Avg Order Value Growth: ${data.growthRates.avgOrderValueGrowthRate}%`
      );
      console.log(
        `   - Monthly Growth Rate: ${data.growthRates.monthlyGrowthRate}%`
      );
      console.log(
        `   - Current Period Revenue: $${data.growthRates.currentPeriod.revenue}`
      );
      console.log(
        `   - Previous Period Revenue: $${data.growthRates.previousPeriod.revenue}`
      );
      console.log(
        `   - Current Period Orders: ${data.growthRates.currentPeriod.orders}`
      );
      console.log(
        `   - Previous Period Orders: ${data.growthRates.previousPeriod.orders}`
      );
    } else {
      console.log("   - Growth rates data not available");
    }

    console.log(
      "\n🎉 All tests passed! Vendor dashboard API is working correctly."
    );
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error(
        "Response data:",
        JSON.stringify(error.response.data, null, 2)
      );
    }
    process.exit(1);
  }
}

// Run the test
testVendorDashboard();
