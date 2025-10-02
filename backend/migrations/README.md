# Database Migrations

This directory contains database migration scripts for the Product Ecosystem Management Platform.

## Overview

Migrations are used to manage database schema changes in a controlled and reversible way. Each migration is a JavaScript module that exports `up`, `down`, and optionally `status` functions.

## Migration Files

### 001_add_barcode_schema.js
- **Purpose**: Adds the new Barcode collection and updates Product model with barcode references
- **Changes**:
  - Creates Barcode collection with proper indexes
  - Adds `barcodeData` field to Product documents
  - Migrates existing barcode data to new structure
  - Creates performance indexes for barcode queries

### 002_optimize_barcode_indexes.js
- **Purpose**: Optimizes barcode search and lookup performance with specialized indexes
- **Changes**:
  - Creates optimized compound indexes for barcode queries
  - Adds specialized indexes for analytics and reporting
  - Implements partial indexes for better performance

### 003_rename_invoice_prefix_to_vendor_prefix.js
- **Purpose**: Renames invoice prefix field to vendor prefix across the system
- **Changes**:
  - Updates Vendor model field names
  - Migrates existing data to new field structure
  - Updates related references and validations

### 004_add_notification_schema.js
- **Purpose**: Adds the Notification system with comprehensive schema and indexing
- **Changes**:
  - Creates Notification collection with proper indexes
  - Sets up compound indexes for efficient notification queries
  - Implements TTL indexes for automatic cleanup of expired notifications
  - Creates initial system notifications for administrators
  - Establishes text search indexes for notification content

## Running Migrations

### Using npm scripts (recommended):

```bash
# Run all pending migrations
npm run migrate

# Check migration status
npm run migrate:status

# List all migrations
npm run migrate:list

# Rollback a specific migration
npm run migrate:down 001_add_barcode_schema
```

### Using the migration script directly:

```bash
# Run all pending migrations
node scripts/migrate.js up

# Run a specific migration
node scripts/migrate.js up 001_add_barcode_schema

# Rollback a specific migration
node scripts/migrate.js down 001_add_barcode_schema

# Check detailed status
node scripts/migrate.js status

# List all migrations
node scripts/migrate.js list
```

## Migration Structure

Each migration file should export the following functions:

```javascript
/**
 * Apply the migration
 */
export const up = async () => {
  // Migration logic here
  // Should be idempotent (safe to run multiple times)
};

/**
 * Rollback the migration
 */
export const down = async () => {
  // Rollback logic here
  // Should reverse the changes made in up()
};

/**
 * Check migration status (optional)
 */
export const status = async () => {
  // Return status information
  return {
    migrationApplied: boolean,
    // ... other status info
  };
};
```

## Best Practices

1. **Naming Convention**: Use numbered prefixes (001_, 002_, etc.) to ensure proper ordering
2. **Idempotent Operations**: Migrations should be safe to run multiple times
3. **Atomic Operations**: Each migration should be a complete unit of work
4. **Backup Data**: Always backup your database before running migrations in production
5. **Test Migrations**: Test both `up` and `down` operations in a development environment
6. **Documentation**: Include clear descriptions of what each migration does

## Migration Tracking

The system automatically tracks applied migrations in the `migrations` collection:

```javascript
{
  name: "001_add_barcode_schema",
  appliedAt: ISODate("2024-01-15T10:30:00.000Z"),
  status: "applied", // or "rolled_back"
  executionTime: 1250, // milliseconds
  description: "Migration applied successfully"
}
```

## Environment Variables

Make sure your database connection is properly configured:

```bash
MONGODB_URI=mongodb://localhost:27017/product-ecosystem
```

## Troubleshooting

### Migration Fails Midway
- Check the error message and fix the underlying issue
- The migration system tracks partial completions
- You may need to manually clean up partial changes before re-running

### Rollback Issues
- Ensure the `down` function properly reverses all changes
- Some operations (like dropping collections) may not be reversible
- Always test rollbacks in a development environment first

### Index Creation Failures
- Existing indexes with the same name may cause conflicts
- The migration handles common index conflicts gracefully
- Check MongoDB logs for detailed error information

## Production Considerations

1. **Backup First**: Always backup your database before running migrations in production
2. **Maintenance Window**: Schedule migrations during low-traffic periods
3. **Monitor Performance**: Large migrations may impact database performance
4. **Staged Deployment**: Test migrations in staging environment first
5. **Rollback Plan**: Have a tested rollback plan ready

## Support

For issues with migrations:
1. Check the migration logs for detailed error information
2. Verify your database connection and permissions
3. Ensure all required dependencies are installed
4. Test the migration in a development environment first
