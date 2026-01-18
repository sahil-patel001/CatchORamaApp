# 🔔 Notification System Documentation

## Overview

The Product Ecosystem platform features a comprehensive notification system that keeps users informed about important events, alerts, and updates. This document outlines all notification types, their triggers, recipients, and delivery mechanisms.

## 📊 System Architecture

### Delivery Channels
- **Database Storage**: All notifications are stored in MongoDB for history and retrieval
- **WebSocket (Real-time)**: Live notifications pushed to connected users
- **Email**: Email notifications for important alerts
- **Frontend UI**: In-app notification center and toast messages

### User Roles
- **Super Admin**: System administrators with full access
- **Vendor**: Individual sellers managing their products and orders

---

## 🎯 Notification Types & Recipients

### 1. Super Admin Notifications

#### 🚨 Cubic Volume Alerts
- **Trigger**: When a product's cubic weight exceeds the configured threshold (32kg)
- **Recipients**: All Super Admin users
- **When**: 
  - Product creation with high cubic weight
  - Product update that results in high cubic weight
- **Formula**: `(Length × Width × Height in cm) ÷ 2500`
- **Delivery**: Database + WebSocket + Email
- **Example**: 
  ```
  Title: "Cubic Volume Alert"
  Message: "🚨 High Volume Product Alert: 'Gaming Chair' by TechCorp has a cubic weight of 96.00kg (exceeds 32kg threshold)"
  ```

#### ⚠️ System Alerts
- **Trigger**: System-wide notifications and administrative alerts
- **Recipients**: All Super Admin users
- **When**:
  - System maintenance notifications
  - Critical system errors
  - Administrative announcements
- **Delivery**: Database + WebSocket + Email
- **Example**:
  ```
  Title: "System Maintenance"
  Message: "Scheduled maintenance will begin at 2:00 AM UTC"
  ```

### 2. Vendor Notifications

#### 📦 Low Stock Alerts
- **Trigger**: When product stock falls below the configured threshold
- **Recipients**: Individual vendor (product owner)
- **When**:
  - Stock level drops below `lowStockThreshold` (default: 10)
  - Only triggers when crossing the threshold (not for every stock change)
- **Delivery**: Database + WebSocket + Email
- **Example**:
  ```
  Title: "Low Stock Alert"
  Message: "Your product 'Wireless Headphones' is running low on stock. Current quantity: 5, Threshold: 10"
  ```

#### 🛒 New Order Notifications
- **Trigger**: When a customer places an order containing vendor's products
- **Recipients**: Individual vendor (order recipient)
- **When**: New order is successfully created
- **Delivery**: Database + WebSocket + Email
- **Example**:
  ```
  Title: "New Order Received"
  Message: "You have received a new order #ORD-2024-001. Total amount: $299.99"
  ```

#### 💰 Commission Update Notifications
- **Trigger**: When commission status changes
- **Recipients**: Individual vendor (commission owner)
- **When**:
  - Commission approved
  - Commission paid
  - Commission disputed
  - New commission generated
- **Delivery**: Database + WebSocket + Email
- **Example**:
  ```
  Title: "Commission Update"
  Message: "Your commission of $45.50 has been approved and will be processed for payment."
  ```

#### 👤 Vendor Status Change Notifications
- **Trigger**: When vendor account status is modified by admin
- **Recipients**: Individual vendor (account owner)
- **When**:
  - Account activated
  - Account deactivated
  - Account suspended
  - Account under review
- **Delivery**: Database + WebSocket + Email
- **Example**:
  ```
  Title: "Account Status Update"
  Message: "Your vendor account has been activated and you can now start selling."
  ```

#### 📋 Product Archived Notifications
- **Trigger**: When admin archives a vendor's product
- **Recipients**: Individual vendor (product owner)
- **When**: Product is archived by administrator
- **Delivery**: Database + WebSocket + Email
- **Example**:
  ```
  Title: "Product Archived"
  Message: "Your product 'Vintage Watch' has been archived. Reason: Policy violation"
  ```

---

## ⚙️ Configuration

### Environment Variables

```bash
# General Settings
NOTIFICATIONS_ENABLED=true
WEBSOCKET_NOTIFICATIONS_ENABLED=true
EMAIL_SERVICE=nodemailer  # or sendgrid, aws-ses

# Cubic Volume Settings
CUBIC_VOLUME_NOTIFICATIONS_ENABLED=true
CUBIC_VOLUME_THRESHOLD_KG=32

# Low Stock Settings
LOW_STOCK_NOTIFICATIONS_ENABLED=true

# New Order Settings
NEW_ORDER_NOTIFICATIONS_ENABLED=true

# Email Configuration (NodeMailer)
NODEMAILER_HOST=smtp.gmail.com
NODEMAILER_PORT=587
NODEMAILER_USER=your-email@gmail.com
NODEMAILER_PASS=your-app-password
NODEMAILER_FROM_NAME=Product Ecosystem

# WebSocket Configuration
WEBSOCKET_PORT=5001
WEBSOCKET_CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Notification Thresholds

| Setting | Default Value | Description |
|---------|---------------|-------------|
| Cubic Weight Threshold | 32kg | Products exceeding this weight trigger alerts |
| Low Stock Threshold | 10 units | Default threshold for low stock alerts |
| Notification Retention | 90 days | How long notifications are kept in database |

---

## 🔧 Technical Implementation

### Database Schema

```javascript
{
  userId: ObjectId,           // Recipient user ID
  type: String,              // Notification type (enum)
  title: String,             // Notification title
  message: String,           // Notification message
  isRead: Boolean,           // Read status
  metadata: Object,          // Additional data
  priority: String,          // low, medium, high, urgent
  category: String,          // product, order, system, account, commission
  actionUrl: String,         // Optional action link
  createdAt: Date,
  expiresAt: Date           // Optional expiration
}
```

### Notification Types (Enum)

```javascript
{
  LOW_STOCK: "low_stock",
  NEW_ORDER: "new_order", 
  CUBIC_VOLUME_ALERT: "cubic_volume_alert",
  SYSTEM_ALERT: "system_alert",
  COMMISSION_UPDATE: "commission_update",
  PRODUCT_ARCHIVED: "product_archived",
  VENDOR_STATUS_CHANGE: "vendor_status_change"
}
```

---

## 🚀 Usage Examples

### Triggering Notifications

#### Cubic Volume Alert
```javascript
import { triggerCubicVolumeAlert } from './utils/notificationTriggers.js';

// Automatically triggered when product exceeds threshold
await triggerCubicVolumeAlert(product, vendor);
```

#### Low Stock Alert
```javascript
import { triggerLowStockNotification } from './utils/notificationTriggers.js';

// Triggered when stock drops below threshold
if (shouldTriggerLowStockNotification(product)) {
  await triggerLowStockNotification(product, vendor);
}
```

#### System Alert
```javascript
import { triggerSystemAlert } from './utils/notificationTriggers.js';

// Send alert to all super admins
await triggerSystemAlert(
  "System Maintenance", 
  "Scheduled maintenance starting in 1 hour",
  { severity: "high" }
);
```

### Frontend Integration

#### React Hook Usage
```javascript
import { useNotifications } from '@/hooks/useNotifications';

function NotificationCenter() {
  const { notifications, unreadCount, markAsRead } = useNotifications();
  
  return (
    <div>
      <Badge>{unreadCount}</Badge>
      {notifications.map(notification => (
        <NotificationItem 
          key={notification._id}
          notification={notification}
          onRead={() => markAsRead(notification._id)}
        />
      ))}
    </div>
  );
}
```

---

## 🔍 Monitoring & Debugging

### Checking Notification Status

```bash
# Run comprehensive notification test
cd backend
node -e "
const { notificationService } = require('./services/notificationService.js');
// Test notification delivery
"
```

### Common Issues

1. **Notifications not received**
   - Check if user exists with correct role
   - Verify WebSocket connection
   - Check email service configuration

2. **Email delivery failing**
   - Verify SMTP credentials
   - Check EMAIL_SERVICE environment variable
   - Ensure nodemailer configuration is correct

3. **WebSocket not working**
   - Check WEBSOCKET_NOTIFICATIONS_ENABLED=true
   - Verify WebSocket server initialization
   - Check frontend WebSocket connection

### Logs to Monitor

```bash
# Backend logs show notification flow
🔍 Looking for users with role: super_admin
👥 Found 1 super admin users: [ 'admin@demo.com' ]
📤 Creating 1 notifications for role: super_admin
✅ Successfully created notifications for role: super_admin
```

---

## 📋 Notification Flow Diagrams

### Cubic Volume Alert Flow
```
Product Created/Updated
         ↓
Calculate Cubic Weight ((L×W×H)÷2500)
         ↓
Weight > 32kg? → NO → End
         ↓ YES
Find Super Admin Users
         ↓
Create Notification in DB
         ↓
Send via WebSocket + Email
         ↓
Show in Frontend UI
```

### Low Stock Alert Flow
```
Product Stock Updated
         ↓
Stock ≤ Threshold? → NO → End
         ↓ YES
Find Product Owner (Vendor)
         ↓
Create Notification in DB
         ↓
Send via WebSocket + Email
         ↓
Show in Vendor Dashboard
```

---

## 🎯 Best Practices

### For Developers

1. **Always handle notification errors gracefully**
   ```javascript
   try {
     await triggerNotification(data);
   } catch (error) {
     console.error('Notification failed:', error);
     // Don't fail the main operation
   }
   ```

2. **Use appropriate priority levels**
   - `urgent`: Critical system issues
   - `high`: Important business events (cubic volume, low stock)
   - `medium`: Regular updates (new orders, commission updates)
   - `low`: Informational messages

3. **Include meaningful metadata**
   ```javascript
   metadata: {
     productId: product._id,
     actionUrl: `/admin/products/${product._id}`,
     timestamp: new Date().toISOString()
   }
   ```

### For Administrators

1. **Configure email service** for reliable delivery
2. **Monitor notification logs** for delivery issues
3. **Set appropriate thresholds** based on business needs
4. **Regularly clean up** old notifications

---

## 🔄 Future Enhancements

- [ ] SMS notifications for critical alerts
- [ ] Push notifications for mobile apps
- [ ] Notification preferences per user
- [ ] Batch digest notifications
- [ ] Advanced filtering and search
- [ ] Notification analytics dashboard

---

## 🆘 Support

For notification system issues:
1. Check the logs in `/backend/logs/`
2. Verify configuration in `/backend/config/notification.js`
3. Test with the notification debugging tools
4. Contact the development team with specific error messages

---

**Last Updated**: September 2024  
**Version**: 1.0  
**Maintainer**: Product Ecosystem Team
