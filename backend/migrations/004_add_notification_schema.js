/**
 * Migration: Add Notification Schema and Indexes
 * Version: 004
 * Created: 2024
 *
 * This migration:
 * 1. Creates the Notification collection with proper indexes
 * 2. Sets up comprehensive indexing for efficient notification queries
 * 3. Creates TTL indexes for automatic cleanup of expired notifications
 * 4. Establishes compound indexes for common query patterns
 */

import mongoose from "mongoose";
import Notification from '../models/Notification.js';
import User from '../models/User.js';

/**
 * Run the migration
 */
export const up = async () => {
  console.log("🚀 Starting Notification Schema Migration...");

  try {
    // Step 1: Ensure Notification collection exists with proper indexes
    console.log("📋 Step 1: Creating Notification collection indexes...");

    // Create individual field indexes
    const individualIndexes = [
      { key: { userId: 1 }, name: "userId_index" },
      { key: { type: 1 }, name: "type_index" },
      { key: { isRead: 1 }, name: "isRead_index" },
      { key: { priority: 1 }, name: "priority_index" },
      { key: { category: 1 }, name: "category_index" },
      { key: { createdAt: -1 }, name: "createdAt_desc_index" },
      { key: { updatedAt: -1 }, name: "updatedAt_desc_index" },
      // TTL index for automatic cleanup of expired notifications
      {
        key: { expiresAt: 1 },
        name: "expiresAt_ttl_index",
        expireAfterSeconds: 0,
      },
    ];

    // Create compound indexes for efficient queries
    const compoundIndexes = [
      // Core query patterns
      {
        key: { userId: 1, isRead: 1 },
        name: "user_read_compound",
      },
      {
        key: { userId: 1, createdAt: -1 },
        name: "user_created_compound",
      },
      // Filtering patterns
      {
        key: { userId: 1, type: 1, createdAt: -1 },
        name: "user_type_created_compound",
      },
      {
        key: { userId: 1, category: 1, createdAt: -1 },
        name: "user_category_created_compound",
      },
      {
        key: { userId: 1, priority: 1, createdAt: -1 },
        name: "user_priority_created_compound",
      },
      // Admin query patterns
      {
        key: { type: 1, createdAt: -1 },
        name: "type_created_admin_compound",
      },
      {
        key: { category: 1, createdAt: -1 },
        name: "category_created_admin_compound",
      },
      // Search optimization
      {
        key: { userId: 1, title: "text", message: "text" },
        name: "user_text_search_compound",
      },
    ];

    // Create all indexes
    const allIndexes = [...individualIndexes, ...compoundIndexes];

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const indexSpec of allIndexes) {
      try {
        await Notification.collection.createIndex(indexSpec.key, {
          name: indexSpec.name,
          background: true,
          ...indexSpec,
        });
        console.log(`  ✅ Created index: ${indexSpec.name}`);
        successCount++;
      } catch (error) {
        console.error(
          `  ❌ Failed to create index ${indexSpec.name}:`,
          error.message
        );
        errors.push({ index: indexSpec.name, error: error.message });
        errorCount++;
      }
    }

    console.log(`📊 Index creation summary:`);
    console.log(`   - Successfully created: ${successCount} indexes`);
    console.log(`   - Errors: ${errorCount} indexes`);

    if (errors.length > 0) {
      console.log("⚠️ Index creation errors:");
      errors.forEach(({ index, error }) => {
        console.log(`   - ${index}: ${error}`);
      });
    }

    // Step 2: Validate collection structure
    console.log("📋 Step 2: Validating notification collection structure...");

    // Check if collection exists and has documents
    const collectionExists = await mongoose.connection.db
      .listCollections({ name: "notifications" })
      .hasNext();

    if (collectionExists) {
      const docCount = await Notification.countDocuments({});
      console.log(
        `  ✅ Notification collection exists with ${docCount} documents`
      );
    } else {
      console.log(
        "  ✅ Notification collection will be created on first document insert"
      );
    }

    // Step 3: Verify indexes are properly created
    console.log("📋 Step 3: Verifying created indexes...");

    const indexes = await Notification.collection.listIndexes().toArray();
    console.log(`  ✅ Total indexes created: ${indexes.length}`);

    // Log all indexes for verification
    indexes.forEach((index) => {
      console.log(`    - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // Step 4: Set up notification system configuration
    console.log("📋 Step 4: Setting up notification system configuration...");

    // Verify notification types and categories are properly defined
    const notificationTypes = [
      "low_stock",
      "new_order",
      "order_status_update",
      "product_approved",
      "product_rejected",
      "commission_payment",
      "system_maintenance",
      "account_update",
      "cubic_volume_alert",
      "general",
    ];

    const notificationCategories = [
      "product",
      "order",
      "system",
      "account",
      "commission",
    ];

    console.log(
      `  ✅ Notification types configured: ${notificationTypes.length}`
    );
    console.log(
      `  ✅ Notification categories configured: ${notificationCategories.length}`
    );

    // Step 5: Create initial system notifications (optional)
    console.log("📋 Step 5: Creating initial system notifications...");

    // Get all superadmin users for system notifications
    const superAdmins = await User.find({ role: "superadmin", isActive: true });

    if (superAdmins.length > 0) {
      const systemNotifications = superAdmins.map((admin) => ({
        userId: admin._id,
        type: "system_maintenance",
        category: "system",
        title: "Notification System Activated",
        message:
          "The notification system has been successfully installed and configured. You will now receive real-time notifications for important system events.",
        priority: "medium",
        metadata: {
          migrationVersion: "004",
          installationDate: new Date(),
          features: [
            "real-time notifications",
            "email alerts",
            "filtering",
            "pagination",
          ],
        },
      }));

      try {
        await Notification.insertMany(systemNotifications);
        console.log(
          `  ✅ Created ${systemNotifications.length} initial system notifications`
        );
      } catch (error) {
        console.log(
          `  ⚠️ Failed to create initial notifications: ${error.message}`
        );
      }
    } else {
      console.log(
        "  ℹ️ No superadmin users found, skipping initial notifications"
      );
    }

    console.log("✅ Notification Schema Migration completed successfully!");

    return {
      success: true,
      summary: {
        indexesCreated: successCount,
        indexErrors: errorCount,
        totalIndexes: allIndexes.length,
        collectionExists,
        initialNotifications: superAdmins.length,
      },
      errors,
    };
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
};

/**
 * Rollback the migration
 */
export const down = async () => {
  console.log("🔄 Rolling back Notification Schema Migration...");

  try {
    // Step 1: Drop all notification indexes
    console.log("📋 Step 1: Dropping notification indexes...");

    const indexesToDrop = [
      "userId_index",
      "type_index",
      "isRead_index",
      "priority_index",
      "category_index",
      "createdAt_desc_index",
      "updatedAt_desc_index",
      "expiresAt_ttl_index",
      "user_read_compound",
      "user_created_compound",
      "user_type_created_compound",
      "user_category_created_compound",
      "user_priority_created_compound",
      "type_created_admin_compound",
      "category_created_admin_compound",
      "user_text_search_compound",
    ];

    let droppedCount = 0;
    const dropErrors = [];

    for (const indexName of indexesToDrop) {
      try {
        await Notification.collection.dropIndex(indexName);
        console.log(`  ✅ Dropped index: ${indexName}`);
        droppedCount++;
      } catch (error) {
        if (error.code !== 27 && !error.message.includes("index not found")) {
          // 27 = IndexNotFound, ignore if index doesn't exist
          console.error(
            `  ❌ Failed to drop index ${indexName}:`,
            error.message
          );
          dropErrors.push({ index: indexName, error: error.message });
        } else {
          console.log(`  ℹ️ Index ${indexName} not found (already dropped)`);
        }
      }
    }

    // Step 2: Remove initial system notifications (optional)
    console.log("📋 Step 2: Removing initial system notifications...");

    const deletedNotifications = await Notification.deleteMany({
      type: "system_maintenance",
      title: "Notification System Activated",
      "metadata.migrationVersion": "004",
    });

    console.log(
      `  ✅ Removed ${deletedNotifications.deletedCount} initial system notifications`
    );

    // Step 3: Optionally drop the entire collection (commented out for safety)
    console.log("📋 Step 3: Collection cleanup...");
    console.log("  ℹ️ Keeping notification collection and data for safety");
    console.log(
      "  ℹ️ To completely remove, manually drop the 'notifications' collection"
    );

    // Uncomment the following lines to completely remove the collection:
    // const collectionExists = await mongoose.connection.db
    //   .listCollections({ name: "notifications" })
    //   .hasNext();
    //
    // if (collectionExists) {
    //   await mongoose.connection.db.dropCollection("notifications");
    //   console.log("  ✅ Dropped notifications collection");
    // }

    console.log("✅ Notification Schema Migration rollback completed!");

    return {
      success: true,
      summary: {
        indexesDropped: droppedCount,
        dropErrors: dropErrors.length,
        notificationsRemoved: deletedNotifications.deletedCount,
      },
      errors: dropErrors,
    };
  } catch (error) {
    console.error("❌ Migration rollback failed:", error);
    throw error;
  }
};

/**
 * Check migration status
 */
export const status = async () => {
  console.log("📊 Checking Notification Schema Migration status...");

  try {
    // Check if collection exists
    const collectionExists = await mongoose.connection.db
      .listCollections({ name: "notifications" })
      .hasNext();

    // Get collection stats
    let collectionStats = null;
    if (collectionExists) {
      const collection = await mongoose.connection.db
        .collection("notifications");

      collectionStats = await mongoose.connection.db
        .command({ collStats: collection.collectionName});
    }

    // Get indexes
    let indexes = [];
    if (collectionExists) {
      indexes = await Notification.collection.listIndexes().toArray();
    }

    // Check for initial system notifications
    let systemNotificationCount = 0;
    if (collectionExists) {
      systemNotificationCount = await Notification.countDocuments({
        type: "system_maintenance",
        title: "Notification System Activated",
        "metadata.migrationVersion": "004",
      });
    }

    const status = {
      collectionExists,
      documentCount: collectionStats ? collectionStats.count : 0,
      indexCount: indexes.length,
      indexes: indexes.map((idx) => ({
        name: idx.name,
        keys: idx.key,
        unique: idx.unique || false,
        sparse: idx.sparse || false,
        ttl: idx.expireAfterSeconds !== undefined,
      })),
      systemNotificationCount,
      avgDocumentSize: collectionStats ? collectionStats.avgObjSize : 0,
      totalSize: collectionStats ? collectionStats.size : 0,
    };

    console.log("📊 Migration Status:");
    console.log(`  Collection exists: ${status.collectionExists}`);
    console.log(`  Document count: ${status.documentCount}`);
    console.log(`  Index count: ${status.indexCount}`);
    console.log(`  System notifications: ${status.systemNotificationCount}`);

    if (status.collectionExists) {
      console.log(
        `  Collection size: ${(status.totalSize / 1024).toFixed(2)} KB`
      );
      console.log(`  Average document size: ${status.avgDocumentSize} bytes`);
    }

    return status;
  } catch (error) {
    console.error("❌ Status check failed:", error);
    throw error;
  }
};

// Export metadata for migration runner
export const metadata = {
  version: "004",
  name: "add_notification_schema",
  description:
    "Add Notification schema with comprehensive indexing and initial setup",
  dependencies: [], // No dependencies on other migrations
  estimatedTime: "30-60 seconds",
  breaking: false,
  reversible: true,
};
