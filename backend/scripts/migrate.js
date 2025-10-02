/**
 * Database Migration Runner
 *
 * This script handles database migrations for schema changes.
 * Usage:
 *   node scripts/migrate.js up [migration_name]    - Run migration(s)
 *   node scripts/migrate.js down [migration_name]  - Rollback migration(s)
 *   node scripts/migrate.js status                 - Check migration status
 *   node scripts/migrate.js list                   - List available migrations
 */

import mongoose from "mongoose";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection
const connectDB = async () => {
  try {
    const mongoURI =
      process.env.MONGODB_URI || "mongodb://localhost:27017/product-ecosystem";
    await mongoose.connect(mongoURI);
    console.log("📦 Connected to MongoDB");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
};

// Migration tracking collection
const MigrationSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  appliedAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["applied", "rolled_back"],
    default: "applied",
  },
  version: String,
  description: String,
  executionTime: Number, // milliseconds
});

const Migration = mongoose.model("Migration", MigrationSchema);

// Get list of migration files
const getMigrationFiles = async () => {
  const migrationsDir = path.join(__dirname, "../migrations");

  try {
    const files = await fs.readdir(migrationsDir);
    return files
      .filter((file) => file.endsWith(".js"))
      .sort() // Sort to ensure proper order
      .map((file) => ({
        name: file.replace(".js", ""),
        filename: file,
        path: path.join(migrationsDir, file),
      }));
  } catch (error) {
    console.error("❌ Error reading migrations directory:", error);
    return [];
  }
};

// Load migration module
const loadMigration = async (migrationPath) => {
  try {
    const migration = await import(migrationPath);
    return migration.default || migration;
  } catch (error) {
    console.error(`❌ Error loading migration ${migrationPath}:`, error);
    throw error;
  }
};

// Check if migration has been applied
const isMigrationApplied = async (migrationName) => {
  const migration = await Migration.findOne({
    name: migrationName,
    status: "applied",
  });
  return !!migration;
};

// Record migration as applied
const recordMigration = async (
  migrationName,
  executionTime,
  description = ""
) => {
  await Migration.findOneAndUpdate(
    { name: migrationName },
    {
      name: migrationName,
      appliedAt: new Date(),
      status: "applied",
      description,
      executionTime,
    },
    { upsert: true }
  );
};

// Record migration as rolled back
const recordRollback = async (migrationName, executionTime) => {
  await Migration.findOneAndUpdate(
    { name: migrationName },
    {
      status: "rolled_back",
      appliedAt: new Date(),
      executionTime,
    }
  );
};

// Run migration up
const runMigrationUp = async (migrationFile) => {
  console.log(`\n🚀 Running migration: ${migrationFile.name}`);

  const isApplied = await isMigrationApplied(migrationFile.name);
  if (isApplied) {
    console.log(
      `⏭️ Migration ${migrationFile.name} already applied, skipping...`
    );
    return { skipped: true };
  }

  const startTime = Date.now();

  try {
    const migration = await loadMigration(migrationFile.path);

    if (typeof migration.up !== "function") {
      throw new Error(
        `Migration ${migrationFile.name} does not export an 'up' function`
      );
    }

    const result = await migration.up();
    const executionTime = Date.now() - startTime;

    await recordMigration(
      migrationFile.name,
      executionTime,
      `Migration applied successfully`
    );

    console.log(
      `✅ Migration ${migrationFile.name} completed in ${executionTime}ms`
    );

    return {
      success: true,
      executionTime,
      result,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(
      `❌ Migration ${migrationFile.name} failed after ${executionTime}ms:`,
      error
    );
    throw error;
  }
};

// Run migration down
const runMigrationDown = async (migrationFile) => {
  console.log(`\n🔄 Rolling back migration: ${migrationFile.name}`);

  const isApplied = await isMigrationApplied(migrationFile.name);
  if (!isApplied) {
    console.log(
      `⏭️ Migration ${migrationFile.name} not applied, skipping rollback...`
    );
    return { skipped: true };
  }

  const startTime = Date.now();

  try {
    const migration = await loadMigration(migrationFile.path);

    if (typeof migration.down !== "function") {
      throw new Error(
        `Migration ${migrationFile.name} does not export a 'down' function`
      );
    }

    const result = await migration.down();
    const executionTime = Date.now() - startTime;

    await recordRollback(migrationFile.name, executionTime);

    console.log(
      `✅ Migration ${migrationFile.name} rolled back in ${executionTime}ms`
    );

    return {
      success: true,
      executionTime,
      result,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(
      `❌ Migration rollback ${migrationFile.name} failed after ${executionTime}ms:`,
      error
    );
    throw error;
  }
};

// Get migration status
const getMigrationStatus = async (migrationFile) => {
  try {
    const migration = await loadMigration(migrationFile.path);

    if (typeof migration.status === "function") {
      return await migration.status();
    }

    // Fallback to database check
    const isApplied = await isMigrationApplied(migrationFile.name);
    return { migrationApplied: isApplied };
  } catch (error) {
    console.error(`❌ Error checking status for ${migrationFile.name}:`, error);
    return { error: error.message };
  }
};

// List all migrations
const listMigrations = async () => {
  console.log("\n📋 Available Migrations:");
  console.log("=".repeat(50));

  const migrationFiles = await getMigrationFiles();

  if (migrationFiles.length === 0) {
    console.log("No migrations found.");
    return;
  }

  for (const migrationFile of migrationFiles) {
    const isApplied = await isMigrationApplied(migrationFile.name);
    const migrationRecord = await Migration.findOne({
      name: migrationFile.name,
    });

    const status = isApplied ? "✅ Applied" : "⏸️ Pending";
    const appliedAt = migrationRecord?.appliedAt
      ? ` (${migrationRecord.appliedAt.toISOString()})`
      : "";

    console.log(`${status} ${migrationFile.name}${appliedAt}`);

    if (migrationRecord?.executionTime) {
      console.log(`   ⏱️ Execution time: ${migrationRecord.executionTime}ms`);
    }
  }
};

// Show status of all migrations
const showStatus = async () => {
  console.log("\n📊 Migration Status:");
  console.log("=".repeat(50));

  const migrationFiles = await getMigrationFiles();

  if (migrationFiles.length === 0) {
    console.log("No migrations found.");
    return;
  }

  for (const migrationFile of migrationFiles) {
    console.log(`\n🔍 ${migrationFile.name}:`);

    try {
      const status = await getMigrationStatus(migrationFile);
      console.log(JSON.stringify(status, null, 2));
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
};

// Main function
const main = async () => {
  const command = process.argv[2];
  const migrationName = process.argv[3];

  if (!command || !["up", "down", "status", "list"].includes(command)) {
    console.log(`
Usage: node scripts/migrate.js <command> [migration_name]

Commands:
  up [migration_name]    - Run migration(s)
  down [migration_name]  - Rollback migration(s)
  status                 - Show detailed migration status
  list                   - List all migrations with their status

Examples:
  node scripts/migrate.js up                        - Run all pending migrations
  node scripts/migrate.js up 001_add_barcode_schema - Run specific migration
  node scripts/migrate.js down 001_add_barcode_schema - Rollback specific migration
  node scripts/migrate.js status                    - Show migration status
  node scripts/migrate.js list                      - List all migrations
    `);
    process.exit(1);
  }

  await connectDB();

  try {
    const migrationFiles = await getMigrationFiles();

    switch (command) {
      case "list":
        await listMigrations();
        break;

      case "status":
        await showStatus();
        break;

      case "up":
        if (migrationName) {
          // Run specific migration
          const migrationFile = migrationFiles.find(
            (m) => m.name === migrationName
          );
          if (!migrationFile) {
            console.error(`❌ Migration ${migrationName} not found`);
            process.exit(1);
          }
          await runMigrationUp(migrationFile);
        } else {
          // Run all pending migrations
          console.log(`🚀 Running all pending migrations...`);
          let appliedCount = 0;
          let skippedCount = 0;

          for (const migrationFile of migrationFiles) {
            const result = await runMigrationUp(migrationFile);
            if (result.skipped) {
              skippedCount++;
            } else if (result.success) {
              appliedCount++;
            }
          }

          console.log(`\n🎉 Migration batch completed:`);
          console.log(`   - Applied: ${appliedCount}`);
          console.log(`   - Skipped: ${skippedCount}`);
        }
        break;

      case "down":
        if (!migrationName) {
          console.error("❌ Migration name is required for rollback");
          console.log("Usage: node scripts/migrate.js down <migration_name>");
          process.exit(1);
        }

        const migrationFile = migrationFiles.find(
          (m) => m.name === migrationName
        );
        if (!migrationFile) {
          console.error(`❌ Migration ${migrationName} not found`);
          process.exit(1);
        }

        await runMigrationDown(migrationFile);
        break;
    }
  } catch (error) {
    console.error("💥 Migration operation failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n📦 Disconnected from MongoDB");
  }
};

// Handle uncaught errors
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

// Run the script
main().catch(console.error);
