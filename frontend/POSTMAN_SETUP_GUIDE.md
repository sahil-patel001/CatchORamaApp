# Product Ecosystem API - Postman Collection Setup Guide

This guide will help you set up and use the Postman collection for the Product Ecosystem API.

## 📁 Files Included

1. **Product-Ecosystem-API-Collection.postman_collection.json** - Complete API collection with all endpoints
2. **Product-Ecosystem-Environment.postman_environment.json** - Environment variables for testing
3. **POSTMAN_SETUP_GUIDE.md** - This setup guide

## 🚀 Quick Setup

### Step 1: Import Collection and Environment

1. **Open Postman**
2. **Import Collection:**
   - Click "Import" button
   - Select `Product-Ecosystem-API-Collection.postman_collection.json`
   - Click "Import"

3. **Import Environment:**
   - Click "Import" button
   - Select `Product-Ecosystem-Environment.postman_environment.json`
   - Click "Import"

4. **Select Environment:**
   - In the top-right corner, select "Product Ecosystem Environment" from the environment dropdown

### Step 2: Configure Base URL

Update the `baseUrl` variable in your environment:
- **Development:** `http://localhost:5000`
- **Production:** `https://your-production-domain.com`

## 🔐 Authentication Setup

### Initial Login Flow

1. **Register a User** (if needed):
   - Go to `🔐 Authentication > Register User`
   - Update the request body with your details
   - Send the request

2. **Login:**
   - Go to `🔐 Authentication > Login`
   - Update email and password in request body
   - Send the request
   - **The auth token will be automatically saved to environment variables**

3. **All subsequent requests will use the saved token automatically**

### Manual Token Setup (Alternative)

If you have an existing token:
1. Go to Environment variables
2. Set `authToken` to your JWT token
3. Set `userId` to your user ID
4. Set `userRole` to your role (`vendor` or `superadmin`)

## 📋 Collection Structure

### 🔐 Authentication
- User registration and login
- Token refresh and logout
- Password management
- Google OAuth integration

### 👥 Users
- User profile management
- Admin user operations
- Notification preferences

### 🏢 Vendors
- Vendor CRUD operations
- Vendor settings and statistics
- Invoice prefix management

### 📦 Products
- Product inventory management
- Stock operations
- Category management
- Archive/unarchive functionality

### 🛒 Orders
- Order processing
- Status updates
- Tracking information

### 📊 Dashboard
- Admin and vendor dashboards
- Analytics and metrics

### 📂 Categories
- Product category management

### 📈 Reports
- Sales and commission reports

### 💰 Commissions
- Commission management
- Payment processing
- Bulk operations

### 🔔 Notifications
- Real-time notifications
- Bulk operations
- Cleanup functions

### 🏷️ Barcodes (Admin Only)
- Barcode generation and management
- Image generation
- Validation and analytics

### 🏥 System
- Health checks and status

## 🎯 Usage Tips

### Environment Variables

The collection uses several environment variables that are automatically populated:

| Variable | Description | Auto-populated |
|----------|-------------|----------------|
| `authToken` | JWT authentication token | ✅ After login |
| `userId` | Current user ID | ✅ After login |
| `userRole` | User role (vendor/superadmin) | ✅ After login |
| `vendorId` | Vendor ID for testing | ❌ Manual |
| `productId` | Product ID for testing | ❌ Manual |
| `orderId` | Order ID for testing | ❌ Manual |

### Setting Up Test Data

1. **Login** as a user
2. **Create test entities** in this order:
   - Categories
   - Vendors
   - Products
   - Orders

3. **Copy IDs** from responses and update environment variables:
   ```json
   {
     "vendorId": "60d5ecb74b24a1234567890",
     "productId": "60d5ecb74b24a1234567891",
     "orderId": "60d5ecb74b24a1234567892"
   }
   ```

### Role-Based Testing

#### Super Admin Access
- All endpoints available
- Can manage users, vendors, products, orders
- Access to admin dashboard and reports
- Barcode management functions

#### Vendor Access
- Limited to own vendor data
- Can manage own products and orders
- Access to vendor dashboard
- Cannot access admin functions

### Common Workflows

#### 1. Product Management Workflow
```
1. Login → 2. Create Category → 3. Create Vendor → 4. Create Product → 5. Update Stock
```

#### 2. Order Processing Workflow
```
1. Create Order → 2. Update Status → 3. Add Tracking → 4. Generate Commission
```

#### 3. Notification Workflow
```
1. Create Notification → 2. Mark as Read → 3. Bulk Operations → 4. Cleanup
```

## 🔧 Advanced Features

### Auto-Authentication
The collection includes pre-request scripts that automatically:
- Add Authorization headers
- Handle token refresh (if implemented)
- Set environment variables from responses

### Bulk Operations
Many endpoints support bulk operations:
- Bulk barcode generation
- Bulk notification operations
- Bulk commission generation

### Filtering and Pagination
Most GET endpoints support:
- `page` and `limit` parameters
- Search and filtering
- Date range filtering
- Status filtering

## 🐛 Troubleshooting

### Common Issues

#### 1. Authentication Errors (401)
- **Solution:** Login again to refresh your token
- Check if `authToken` is set in environment variables

#### 2. Forbidden Errors (403)
- **Solution:** Check if your role has permission for the endpoint
- Some endpoints are Super Admin only

#### 3. Validation Errors (400)
- **Solution:** Check request body format
- Ensure required fields are provided
- Validate data types and formats

#### 4. Not Found Errors (404)
- **Solution:** Verify IDs in environment variables
- Check if resources exist in the system

### Environment Variables Not Working
1. Ensure "Product Ecosystem Environment" is selected
2. Check variable names match exactly
3. Refresh Postman if variables aren't updating

### Requests Failing
1. Verify backend server is running on correct port
2. Check `baseUrl` in environment variables
3. Ensure CORS is configured for your origin

## 📊 Testing Checklist

### Basic Functionality
- [ ] User registration and login
- [ ] Token auto-save after login
- [ ] Profile management
- [ ] CRUD operations for main entities

### Admin Functions (Super Admin only)
- [ ] User management
- [ ] Vendor management
- [ ] Commission processing
- [ ] Barcode operations
- [ ] System reports

### Vendor Functions
- [ ] Vendor dashboard access
- [ ] Product management
- [ ] Order processing
- [ ] Commission viewing

### Advanced Features
- [ ] Bulk operations
- [ ] Notification system
- [ ] File uploads (if applicable)
- [ ] Filtering and search

## 📞 Support

For issues with the API collection:
1. Check this documentation first
2. Verify backend server is running
3. Check environment variables are set correctly
4. Review request/response logs in Postman

## 🔄 Updates

This collection is versioned and may receive updates. When updating:
1. Re-import the collection file
2. Check for new environment variables
3. Review any breaking changes in the API

---

**Happy Testing! 🚀**

*Last Updated: February 2024*
