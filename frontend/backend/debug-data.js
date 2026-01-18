import mongoose from "mongoose";
import dotenv from "dotenv";
import Order from "./models/Order.js";
import Vendor from "./models/Vendor.js";
import User from "./models/User.js";

dotenv.config();

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const orderCount = await Order.countDocuments();
    console.log("📦 Total orders in database:", orderCount);

    const vendorCount = await Vendor.countDocuments();
    console.log("🏪 Total vendors in database:", vendorCount);

    const userCount = await User.countDocuments();
    console.log("👥 Total users in database:", userCount);

    // Check if vendor user exists
    const vendorUser = await User.findOne({ email: "vendor@demo.com" });
    console.log("🔍 Vendor user exists:", !!vendorUser);

    if (vendorUser) {
      console.log("👤 Vendor user details:", {
        id: vendorUser._id,
        name: vendorUser.name,
        email: vendorUser.email,
        role: vendorUser.role,
      });

      const vendor = await Vendor.findOne({ userId: vendorUser._id });
      console.log("🏪 Vendor profile exists:", !!vendor);

      if (vendor) {
        console.log("🏢 Vendor details:", {
          id: vendor._id,
          businessName: vendor.businessName,
          abn: vendor.businessDetails?.taxId,
          gstRegistered: vendor.businessDetails?.gstRegistered,
        });

        const vendorOrders = await Order.find({ vendorId: vendor._id });
        console.log("📋 Orders for this vendor:", vendorOrders.length);

        const deliveredOrders = await Order.find({
          vendorId: vendor._id,
          status: "delivered",
        });
        console.log(
          "✅ Delivered orders for this vendor:",
          deliveredOrders.length
        );

        if (deliveredOrders.length > 0) {
          console.log("📄 Sample delivered orders:");
          deliveredOrders.slice(0, 3).forEach((order, index) => {
            console.log(
              `   ${index + 1}. ${
                order.orderNumber
              } - $${order.orderTotal.toFixed(
                2
              )} - ${order.createdAt.toDateString()}`
            );
          });
        }

        // Check recent orders (last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const recentDeliveredOrders = await Order.find({
          vendorId: vendor._id,
          status: "delivered",
          createdAt: { $gte: thirtyDaysAgo },
        });
        console.log(
          "📅 Recent delivered orders (last 30 days):",
          recentDeliveredOrders.length
        );
      }
    }

    // Check all vendors and their order counts
    console.log("\n📊 All vendors and their order counts:");
    const allVendors = await Vendor.find().populate("user", "name email");
    for (const v of allVendors) {
      const orderCount = await Order.countDocuments({ vendorId: v._id });
      const deliveredCount = await Order.countDocuments({
        vendorId: v._id,
        status: "delivered",
      });
      console.log(
        `   ${v.businessName} (${v.user.email}): ${orderCount} total, ${deliveredCount} delivered`
      );
    }

    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

checkData();
