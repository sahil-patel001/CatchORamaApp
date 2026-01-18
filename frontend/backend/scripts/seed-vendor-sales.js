import mongoose from "mongoose";
import dotenv from "dotenv";
import Order from "../models/Order.js";
import Vendor from "../models/Vendor.js";
import User from "../models/User.js";
import Product from "../models/Product.js";

dotenv.config();

// Generate realistic sales data for different time periods
const generateSalesData = () => {
  const salesData = [];
  const now = new Date();

  // Generate data for the last 2 years to test yearly filter
  for (let i = 0; i < 730; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // Skip some days randomly to make it more realistic
    if (Math.random() < 0.15) continue; // 15% chance to skip a day

    // Generate 1-8 orders per day with varying amounts
    const ordersPerDay = Math.floor(Math.random() * 8) + 1;

    for (let j = 0; j < ordersPerDay; j++) {
      const orderTime = new Date(date);
      orderTime.setHours(
        Math.floor(Math.random() * 12) + 8, // 8 AM to 8 PM
        Math.floor(Math.random() * 60),
        Math.floor(Math.random() * 60)
      );

      // Generate realistic order amounts
      const baseAmount = 50 + Math.random() * 400; // $50 - $450
      const orderTotal = Math.round(baseAmount * 100) / 100;

      salesData.push({
        date: orderTime,
        orderTotal,
        status: "delivered", // Only delivered orders count for sales
      });
    }
  }

  return salesData.sort((a, b) => a.date - b.date);
};

async function seedVendorSales() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find the vendor user
    const vendorUser = await User.findOne({ email: "vendor@demo.com" });
    if (!vendorUser) {
      console.error(
        "❌ Vendor user not found. Please create vendor@demo.com first."
      );
      return;
    }

    // Find the vendor profile
    const vendor = await Vendor.findOne({ userId: vendorUser._id });
    if (!vendor) {
      console.error("❌ Vendor profile not found for vendor@demo.com");
      return;
    }

    console.log(`🏪 Found vendor: ${vendor.businessName} (${vendor._id})`);

    // Check if vendor has products
    let products = await Product.find({ vendorId: vendor._id });

    if (products.length === 0) {
      console.log("📦 Creating sample products for vendor...");

      const sampleProducts = [
        {
          vendorId: vendor._id,
          name: "Wireless Bluetooth Headphones",
          description:
            "High-quality wireless headphones with noise cancellation",
          price: 299.99,
          discountPrice: 249.99,
          stock: 50,
          category: "Electronics",
          sku: "WBH-001",
          images: ["https://example.com/headphones.jpg"],
          specifications: {
            brand: "TechSound",
            model: "WS-300",
            color: "Black",
          },
          isActive: true,
        },
        {
          vendorId: vendor._id,
          name: "Smart Watch Series 5",
          description: "Advanced smartwatch with health monitoring",
          price: 399.99,
          stock: 25,
          category: "Electronics",
          sku: "SWS5-002",
          images: ["https://example.com/smartwatch.jpg"],
          specifications: {
            brand: "SmartTech",
            model: "ST-500",
            color: "Silver",
          },
          isActive: true,
        },
        {
          vendorId: vendor._id,
          name: "USB-C Cable Set",
          description: "High-speed USB-C cables - pack of 3",
          price: 29.99,
          stock: 100,
          category: "Accessories",
          sku: "USBC-003",
          images: ["https://example.com/cables.jpg"],
          specifications: {
            length: "1m, 2m, 3m",
            type: "USB-C to USB-C",
          },
          isActive: true,
        },
      ];

      products = await Product.insertMany(sampleProducts);
      console.log(`✅ Created ${products.length} sample products`);
    }

    // Remove existing orders for this vendor to avoid duplicates
    const existingOrdersCount = await Order.countDocuments({
      vendorId: vendor._id,
    });
    if (existingOrdersCount > 0) {
      await Order.deleteMany({ vendorId: vendor._id });
      console.log(`🗑️  Removed ${existingOrdersCount} existing orders`);
    }

    // Generate sales data
    console.log("📊 Generating sales data...");
    const salesData = generateSalesData();

    // Create orders from sales data
    const customerNames = [
      "John Smith",
      "Sarah Johnson",
      "Mike Wilson",
      "Emily Davis",
      "David Brown",
      "Lisa Anderson",
      "Chris Taylor",
      "Amanda White",
      "Ryan Martinez",
      "Jessica Garcia",
    ];

    const orders = salesData.map((sale, index) => {
      const randomProduct =
        products[Math.floor(Math.random() * products.length)];
      const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 items
      const itemPrice = sale.orderTotal / quantity;
      const itemTotal = itemPrice * quantity;
      const subtotal = itemTotal;
      const taxRate = 0.1; // 10% tax
      const taxAmount = subtotal * taxRate;
      const shippingAmount = sale.orderTotal > 100 ? 0 : 10; // Free shipping over $100
      const customerName =
        customerNames[Math.floor(Math.random() * customerNames.length)];

      return {
        vendorId: vendor._id,
        orderNumber: `ORD-${Date.now()}-${index.toString().padStart(4, "0")}`,
        customer: {
          name: customerName,
          email: `${customerName.toLowerCase().replace(" ", ".")}@example.com`,
          phone: `+61${Math.floor(Math.random() * 900000000) + 100000000}`,
        },
        items: [
          {
            productId: randomProduct._id,
            name: randomProduct.name,
            quantity: quantity,
            price: itemPrice,
            total: itemTotal,
          },
        ],
        subtotal: subtotal,
        tax: {
          amount: taxAmount,
          rate: taxRate,
        },
        shipping: {
          amount: shippingAmount,
          method: "Standard",
        },
        orderTotal: subtotal + taxAmount + shippingAmount,
        status: sale.status,
        shippingAddress: {
          street: "123 Customer St",
          city: "Sydney",
          state: "NSW",
          postalCode: "2000",
          country: "Australia",
        },
        createdAt: sale.date,
        updatedAt: sale.date,
      };
    });

    // Insert orders in batches to avoid memory issues
    const batchSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < orders.length; i += batchSize) {
      const batch = orders.slice(i, i + batchSize);
      await Order.insertMany(batch);
      insertedCount += batch.length;
      console.log(`📝 Inserted ${insertedCount}/${orders.length} orders...`);
    }

    console.log(
      `✅ Successfully created ${orders.length} orders for vendor ${vendor.businessName}`
    );

    // Show summary statistics
    const totalRevenue = orders.reduce(
      (sum, order) => sum + order.orderTotal,
      0
    );
    const avgOrderValue = totalRevenue / orders.length;

    console.log("\n📈 Sales Data Summary:");
    console.log(`   Total Orders: ${orders.length}`);
    console.log(`   Total Revenue: $${totalRevenue.toFixed(2)}`);
    console.log(`   Average Order Value: $${avgOrderValue.toFixed(2)}`);
    console.log(
      `   Date Range: ${orders[0].createdAt.toDateString()} to ${orders[
        orders.length - 1
      ].createdAt.toDateString()}`
    );

    // Show data for different periods
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const lastYear = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    const weeklyOrders = orders.filter((o) => o.createdAt >= lastWeek);
    const monthlyOrders = orders.filter((o) => o.createdAt >= lastMonth);
    const yearlyOrders = orders.filter((o) => o.createdAt >= lastYear);

    console.log("\n📊 Period Breakdown:");
    console.log(
      `   Last 7 days: ${weeklyOrders.length} orders, $${weeklyOrders
        .reduce((sum, o) => sum + o.orderTotal, 0)
        .toFixed(2)}`
    );
    console.log(
      `   Last 30 days: ${monthlyOrders.length} orders, $${monthlyOrders
        .reduce((sum, o) => sum + o.orderTotal, 0)
        .toFixed(2)}`
    );
    console.log(
      `   Last 1 year: ${yearlyOrders.length} orders, $${yearlyOrders
        .reduce((sum, o) => sum + o.orderTotal, 0)
        .toFixed(2)}`
    );

    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
    console.log("\n🎉 Sales data seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding sales data:", error);
    process.exit(1);
  }
}

seedVendorSales();
