import mongoose from "mongoose";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();

async function testReadFilter() {
  try {
    // Connect to database
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error("MongoDB URI is not defined in environment variables");
    }

    await mongoose.connect(mongoURI);
    console.log("Connected to MongoDB");

    // Find the admin user
    const adminUser = await User.findOne({ email: "admin@demo.com" });
    if (!adminUser) {
      console.error("Admin user not found");
      return;
    }

    console.log("Testing read filter functionality...");

    // Test 1: Get all notifications
    console.log("\n1. All notifications:");
    const allResult = await Notification.findWithPagination(adminUser._id, {
      page: 1,
      limit: 5,
    });
    console.log(`Found ${allResult.notifications.length} notifications`);
    allResult.notifications.forEach((n) => {
      console.log(`  - ${n.title} (read: ${n.isRead})`);
    });

    // Test 2: Get only read notifications
    console.log("\n2. Read only notifications:");
    const readResult = await Notification.findWithPagination(adminUser._id, {
      page: 1,
      limit: 5,
      isRead: true,
    });
    console.log(`Found ${readResult.notifications.length} read notifications`);
    readResult.notifications.forEach((n) => {
      console.log(`  - ${n.title} (read: ${n.isRead})`);
    });

    // Test 3: Get only unread notifications
    console.log("\n3. Unread only notifications:");
    const unreadResult = await Notification.findWithPagination(adminUser._id, {
      page: 1,
      limit: 5,
      isRead: false,
    });
    console.log(
      `Found ${unreadResult.notifications.length} unread notifications`
    );
    unreadResult.notifications.forEach((n) => {
      console.log(`  - ${n.title} (read: ${n.isRead})`);
    });

    // Test 4: Direct MongoDB query for read notifications
    console.log("\n4. Direct MongoDB query for read notifications:");
    const directRead = await Notification.find({
      userId: adminUser._id,
      isRead: true,
    }).limit(5);
    console.log(`Direct query found ${directRead.length} read notifications`);
    directRead.forEach((n) => {
      console.log(`  - ${n.title} (read: ${n.isRead})`);
    });
  } catch (error) {
    console.error("❌ Error testing read filter:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n📦 Database connection closed");
  }
}

testReadFilter();
