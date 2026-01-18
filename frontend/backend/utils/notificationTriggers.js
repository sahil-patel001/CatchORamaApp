import { notificationService } from "../services/notificationService.js";
import { notificationConfig } from "../config/notification.js";

/**
 * Notification Trigger Utilities
 * Contains helper functions to trigger notifications based on business events
 */

/**
 * Check if a product stock level requires low stock notification
 * @param {Object} product - Product object
 * @param {number} previousStock - Previous stock level (optional)
 * @returns {boolean} Whether notification should be triggered
 */
export const shouldTriggerLowStockNotification = (
  product,
  previousStock = null
) => {
  if (!notificationConfig.triggers.lowStock.enabled) {
    return false;
  }

  // Get threshold with fallback hierarchy: product inventory > product level > default
  const threshold =
    product.inventory?.lowStockThreshold || product.lowStockThreshold || 10;
  const currentStock = product.stock;

  // If we have previous stock, only trigger if we crossed the threshold
  if (previousStock !== null) {
    return previousStock > threshold && currentStock <= threshold;
  }

  // Otherwise, trigger if current stock is at or below threshold
  return currentStock <= threshold;
};

/**
 * Trigger low stock notification for vendor
 * @param {Object} product - Product object
 * @param {Object} vendor - Vendor object
 * @returns {Promise<Object>} Notification result
 */
export const triggerLowStockNotification = async (product, vendor) => {
  try {
    if (!notificationConfig.triggers.lowStock.enabled) {
      return { success: false, reason: "Low stock notifications disabled" };
    }

    // Check if product stock is below threshold
    const threshold =
      product.inventory?.lowStockThreshold || product.lowStockThreshold || 10; // Default threshold
    if (product.stock > threshold) {
      return { success: false, reason: "Product stock above threshold" };
    }

    const notification = await notificationService.createNotification({
      userId: vendor.userId, // Use vendor's user ID for notifications
      type: notificationConfig.types.LOW_STOCK,
      title: "Low Stock Alert",
      message: `Your product "${product.name}" is running low on stock. Current quantity: ${product.stock}, Threshold: ${threshold}`,
      metadata: {
        productId: product._id,
        productName: product.name,
        currentQuantity: product.stock,
        threshold: threshold,
        vendorId: vendor._id,
        vendorName: vendor.businessName || vendor.name,
        actionUrl: `/vendor/products/${product._id}`,
      },
      sendEmail: true,
      sendWebSocket: true,
    });

    return { success: true, notification };
  } catch (error) {
    console.error("Error triggering low stock notification:", error);
    throw error;
  }
};

/**
 * Trigger new order notification for vendor
 * @param {Object} order - Order object
 * @param {Object} vendor - Vendor object
 * @returns {Promise<Object>} Notification result
 */
export const triggerNewOrderNotification = async (order, vendor) => {
  try {
    if (!notificationConfig.triggers.newOrder.enabled) {
      return { success: false, reason: "New order notifications disabled" };
    }

    const notification = await notificationService.createNotification({
      userId: vendor.userId, // Use vendor's user ID for notifications
      type: notificationConfig.types.NEW_ORDER,
      title: "New Order Received",
      message: `You have received a new order #${
        order.orderNumber
      }. Total amount: $${order.orderTotal.toFixed(2)}`,
      metadata: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        totalAmount: order.orderTotal.toFixed(2),
        itemCount: order.items.length,
        vendorId: vendor._id,
        vendorName: vendor.businessName || vendor.name,
        customerName: order.customer.name,
        customerEmail: order.customer.email,
        actionUrl: `/vendor/orders/${order._id}`,
      },
      sendEmail: true,
      sendWebSocket: true,
    });

    return { success: true, notification };
  } catch (error) {
    console.error("Error triggering new order notification:", error);
    throw error;
  }
};

/**
 * Calculate cubic weight from product dimensions
 * @param {Object} product - Product object with dimensions
 * @returns {number} Cubic weight in kg
 */
export const calculateCubicWeight = (product) => {
  // If cubic weight is already calculated, use that value
  if (product.cubicWeight && product.cubicWeight > 0) {
    return product.cubicWeight;
  }

  // Check if we have all required dimensions
  if (!product.length || !product.breadth || !product.height) {
    return 0;
  }

  // Calculate cubic weight (dimensions in cm, result in kg)
  // Formula: (Length × Width × Height) ÷ 2500
  return (product.length * product.breadth * product.height) / 2500;
};

/**
 * Check if a product's cubic weight requires admin notification
 * @param {Object} product - Product object
 * @returns {boolean} Whether notification should be triggered
 */
export const shouldTriggerCubicVolumeAlert = (product) => {
  if (!notificationConfig.triggers.cubicVolume.enabled) {
    console.log("🔕 Cubic volume notifications are disabled");
    return false;
  }

  const cubicWeight = product.cubicWeight || calculateCubicWeight(product);
  const threshold = notificationConfig.triggers.cubicVolume.thresholdKg;

  console.log(
    `📏 Cubic weight check: ${cubicWeight}kg vs ${threshold}kg threshold`
  );
  console.log(
    `📦 Product: "${product.name}" - Should trigger: ${cubicWeight > threshold}`
  );

  return cubicWeight > threshold;
};

/**
 * Trigger cubic volume alert for admin
 * @param {Object} product - Product object
 * @param {Object} vendor - Vendor object
 * @returns {Promise<Object>} Notification result
 */
export const triggerCubicVolumeAlert = async (product, vendor) => {
  try {
    console.log(
      `🚨 Attempting to trigger cubic volume alert for product: "${product.name}"`
    );

    if (!notificationConfig.triggers.cubicVolume.enabled) {
      console.log("❌ Cubic volume notifications are disabled");
      return { success: false, reason: "Cubic volume notifications disabled" };
    }

    // Calculate cubic weight using helper function
    const cubicWeight = product.cubicWeight || calculateCubicWeight(product);
    const threshold = notificationConfig.triggers.cubicVolume.thresholdKg;

    console.log(`📊 Cubic weight: ${cubicWeight}kg, Threshold: ${threshold}kg`);

    if (cubicWeight <= threshold) {
      console.log(
        "❌ Cubic weight below threshold, not triggering notification"
      );
      return { success: false, reason: "Cubic weight below threshold" };
    }

    // Format dimensions string for display
    const dimensionsStr = `${product.length || 0}cm × ${
      product.breadth || 0
    }cm × ${product.height || 0}cm`;

    console.log(`✅ Triggering cubic volume alert - sending to super admins`);
    console.log(`📧 Vendor: ${vendor.businessName || vendor.name}`);
    console.log(
      `📦 Product: ${product.name} (${product.category || "No category"})`
    );

    // Send to all super admins
    const notification = await notificationService.sendToRole(
      notificationConfig.roles.SUPER_ADMIN,
      {
        type: notificationConfig.types.CUBIC_VOLUME_ALERT,
        title: "Cubic Volume Alert",
        message: `🚨 High Volume Product Alert: "${product.name}" by ${
          vendor.businessName || vendor.name
        } has a cubic weight of ${cubicWeight.toFixed(
          2
        )}kg (exceeds ${threshold}kg threshold). Dimensions: ${dimensionsStr}. Category: ${
          product.category || "Not specified"
        }.`,
        metadata: {
          productId: product._id,
          productName: product.name,
          productCategory: product.category || "Not specified",
          productPrice: product.price || 0,
          vendorId: vendor._id,
          vendorName: vendor.businessName || vendor.name,
          vendorEmail: vendor.email,
          vendorPhone: vendor.phone || "Not provided",
          cubicWeight: cubicWeight.toFixed(2),
          thresholdKg: threshold,
          dimensions: dimensionsStr,
          length: product.length || 0,
          breadth: product.breadth || 0,
          height: product.height || 0,
          createdAt: product.createdAt || new Date().toISOString(),
          actionUrl: `/admin/products/${product._id}`,
        },
        sendEmail: true,
        sendWebSocket: true,
      }
    );

    console.log(
      `🎉 Cubic volume alert sent successfully:`,
      notification
        ? `${notification.length} notifications created`
        : "Unknown result"
    );
    return { success: true, notifications: notification };
  } catch (error) {
    console.error("❌ Error triggering cubic volume alert:", error);
    throw error;
  }
};

/**
 * Trigger product archived notification
 * @param {Object} product - Product object
 * @param {Object} vendor - Vendor object
 * @param {string} reason - Reason for archiving
 * @returns {Promise<Object>} Notification result
 */
export const triggerProductArchivedNotification = async (
  product,
  vendor,
  reason = "Manual archive"
) => {
  try {
    const notification = await notificationService.createNotification({
      userId: vendor._id,
      type: notificationConfig.types.PRODUCT_ARCHIVED,
      title: "Product Archived",
      message: `Your product "${product.name}" has been archived. Reason: ${reason}`,
      metadata: {
        productId: product._id,
        productName: product.name,
        vendorId: vendor._id,
        reason: reason,
        archivedAt: new Date(),
        actionUrl: `/vendor/products/archived`,
      },
      sendEmail: true,
      sendWebSocket: true,
    });

    return { success: true, notification };
  } catch (error) {
    console.error("Error triggering product archived notification:", error);
    throw error;
  }
};

/**
 * Trigger vendor status change notification
 * @param {Object} vendor - Vendor object
 * @param {string} oldStatus - Previous status
 * @param {string} newStatus - New status
 * @returns {Promise<Object>} Notification result
 */
export const triggerVendorStatusChangeNotification = async (
  vendor,
  oldStatus,
  newStatus
) => {
  try {
    const statusMessages = {
      active:
        "Your vendor account has been activated and you can now start selling.",
      inactive:
        "Your vendor account has been deactivated. Please contact support for assistance.",
      pending:
        "Your vendor account is under review. We'll notify you once it's processed.",
      suspended:
        "Your vendor account has been suspended. Please contact support immediately.",
    };

    const message =
      statusMessages[newStatus] ||
      `Your vendor account status has been changed from ${oldStatus} to ${newStatus}.`;

    const notification = await notificationService.createNotification({
      userId: vendor._id,
      type: notificationConfig.types.VENDOR_STATUS_CHANGE,
      title: "Account Status Update",
      message: message,
      metadata: {
        vendorId: vendor._id,
        vendorName: vendor.businessName,
        oldStatus: oldStatus,
        newStatus: newStatus,
        changedAt: new Date(),
        actionUrl: `/vendor/settings`,
      },
      sendEmail: true,
      sendWebSocket: true,
    });

    return { success: true, notification };
  } catch (error) {
    console.error("Error triggering vendor status change notification:", error);
    throw error;
  }
};

/**
 * Trigger commission update notification
 * @param {Object} commission - Commission object
 * @param {Object} vendor - Vendor object
 * @param {string} action - Action performed (approved, paid, disputed)
 * @returns {Promise<Object>} Notification result
 */
export const triggerCommissionUpdateNotification = async (
  commission,
  vendor,
  action
) => {
  try {
    const actionMessages = {
      approved: `Your commission of $${commission.amount.toFixed(
        2
      )} has been approved and will be processed for payment.`,
      paid: `Your commission of $${commission.amount.toFixed(
        2
      )} has been paid and transferred to your account.`,
      disputed: `Your commission of $${commission.amount.toFixed(
        2
      )} is under dispute. Please contact support.`,
      generated: `A new commission of $${commission.amount.toFixed(
        2
      )} has been generated for your recent sales.`,
    };

    const message =
      actionMessages[action] ||
      `Your commission status has been updated to ${action}.`;

    const notification = await notificationService.createNotification({
      userId: vendor._id,
      type: notificationConfig.types.COMMISSION_UPDATE,
      title: "Commission Update",
      message: message,
      metadata: {
        commissionId: commission._id,
        vendorId: vendor._id,
        vendorName: vendor.businessName,
        amount: commission.amount,
        action: action,
        period: commission.period,
        actionUrl: `/vendor/commissions`,
      },
      sendEmail: true,
      sendWebSocket: true,
    });

    return { success: true, notification };
  } catch (error) {
    console.error("Error triggering commission update notification:", error);
    throw error;
  }
};

/**
 * Trigger system alert for admins
 * @param {string} title - Alert title
 * @param {string} message - Alert message
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Notification result
 */
export const triggerSystemAlert = async (title, message, metadata = {}) => {
  try {
    const notifications = await notificationService.sendToRole(
      notificationConfig.roles.SUPER_ADMIN,
      {
        type: notificationConfig.types.SYSTEM_ALERT,
        title: title,
        message: message,
        metadata: {
          ...metadata,
          alertedAt: new Date(),
          severity: metadata.severity || "medium",
        },
        sendEmail: metadata.sendEmail !== false, // Default to true
        sendWebSocket: metadata.sendWebSocket !== false, // Default to true
      }
    );

    return { success: true, notifications };
  } catch (error) {
    console.error("Error triggering system alert:", error);
    throw error;
  }
};

/**
 * Batch trigger notifications for multiple products/orders
 * @param {Array} items - Array of items to process
 * @param {Function} triggerFunction - Function to call for each item
 * @returns {Promise<Array>} Array of results
 */
export const batchTriggerNotifications = async (items, triggerFunction) => {
  try {
    const results = [];

    for (const item of items) {
      try {
        const result = await triggerFunction(item);
        results.push({ item: item._id, success: true, result });
      } catch (error) {
        results.push({ item: item._id, success: false, error: error.message });
      }
    }

    return results;
  } catch (error) {
    console.error("Error in batch trigger notifications:", error);
    throw error;
  }
};

/**
 * Check and trigger low stock notifications for all products
 * @returns {Promise<Array>} Array of triggered notifications
 */
export const checkAndTriggerLowStockAlerts = async () => {
  try {
    // Import models here to avoid circular dependency
    const Product = (await import("../models/Product.js")).default;
    const Vendor = (await import("../models/Vendor.js")).default;

    // Find products with low stock
    const lowStockProducts = await Product.find({
      $expr: {
        $lte: ["$quantity", "$lowQuantityThreshold"],
      },
      archived: { $ne: true },
      status: "active",
    }).populate("vendorId");

    const results = [];

    for (const product of lowStockProducts) {
      if (product.vendorId) {
        try {
          const result = await triggerLowStockNotification(
            product,
            product.vendorId
          );
          results.push({ productId: product._id, ...result });
        } catch (error) {
          results.push({
            productId: product._id,
            success: false,
            error: error.message,
          });
        }
      }
    }

    console.log(
      `🔔 Checked ${
        lowStockProducts.length
      } products for low stock, triggered ${
        results.filter((r) => r.success).length
      } notifications`
    );
    return results;
  } catch (error) {
    console.error("Error checking and triggering low stock alerts:", error);
    throw error;
  }
};

export default {
  shouldTriggerLowStockNotification,
  triggerLowStockNotification,
  triggerNewOrderNotification,
  calculateCubicWeight,
  shouldTriggerCubicVolumeAlert,
  triggerCubicVolumeAlert,
  triggerProductArchivedNotification,
  triggerVendorStatusChangeNotification,
  triggerCommissionUpdateNotification,
  triggerSystemAlert,
  batchTriggerNotifications,
  checkAndTriggerLowStockAlerts,
};
