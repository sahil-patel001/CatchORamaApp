import dotenv from "dotenv";
import { connectDB, disconnectDB } from "../config/database.js";
import { seedUsers } from "./users.js";
import { seedVendors } from "./vendors.js";
import { seedCategories } from "./categories.js";
import { seedProducts } from "./products.js";
import { seedOrders } from "./orders.js";

// Load environment variables
dotenv.config();

const runSeeders = async () => {
  try {
    console.log("🌱 Starting database seeding...");

    // Connect to database
    await connectDB();

    // Check if we should clear existing data
    const shouldClearData = process.argv.includes("--fresh");

    if (shouldClearData) {
      console.log("🗑️  Clearing existing data...");
      const User = (await import("../models/User.js")).default;
      const Vendor = (await import("../models/Vendor.js")).default;
      const Category = (await import("../models/Category.js")).default;
      const Product = (await import("../models/Product.js")).default;
      const Order = (await import("../models/Order.js")).default;

      await Promise.all([
        Order.deleteMany({}),
        Product.deleteMany({}),
        Category.deleteMany({}),
        Vendor.deleteMany({}),
        User.deleteMany({}),
      ]);
      console.log("✅ Existing data cleared");
    }

    // Run seeders in order
    console.log("👥 Seeding users...");
    const users = await seedUsers();
    console.log(`✅ Created ${users.length} users`);

    console.log("🏪 Seeding vendors...");
    const vendors = await seedVendors(users);
    console.log(`✅ Created ${vendors.length} vendors`);

    console.log("🏷️ Seeding categories...");
    const categories = await seedCategories(vendors);
    console.log(`✅ Created ${categories.length} categories`);

    console.log("📦 Seeding products...");
    const products = await seedProducts(vendors);
    console.log(`✅ Created ${products.length} products`);

    console.log("🛒 Seeding orders...");
    const orders = await seedOrders(vendors, products);
    console.log(`✅ Created ${orders.length} orders`);

    console.log("🎉 Database seeding completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`   Users: ${users.length}`);
    console.log(`   Vendors: ${vendors.length}`);
    console.log(`   Categories: ${categories.length}`);
    console.log(`   Products: ${products.length}`);
    console.log(`   Orders: ${orders.length}`);

    console.log("\n🔐 Demo Credentials:");
    console.log("   Super Admin: admin@demo.com / admin123");
    console.log("   Vendor: vendor@demo.com / vendor123");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
};

// Run seeders
runSeeders();
