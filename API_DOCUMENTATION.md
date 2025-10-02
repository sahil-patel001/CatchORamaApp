# Product Ecosystem API Documentation

## Overview

This document provides comprehensive documentation for the Product Ecosystem Management Platform API. The API is built with Node.js, Express.js, and MongoDB, providing RESTful endpoints for managing users, vendors, products, and orders.

## Base URL

```
Development: http://localhost:5001/api/v1
Production: https://your-domain.com/api/v1
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Response Format

All API responses follow this standard format:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Error description"
  }
}
```

## Authentication Endpoints

### Register User
**POST** `/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "vendor", // optional, defaults to "vendor"
  "businessName": "John's Store" // required for vendors
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "vendor",
      "vendorId": "vendor_id",
      "businessName": "John's Store"
    },
    "token": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

### Login
**POST** `/auth/login`

Authenticate user and get access token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

### Get Current User
**GET** `/auth/me`

Get current authenticated user information.

**Headers:** `Authorization: Bearer <token>`

### Logout
**POST** `/auth/logout`

Logout current user and invalidate refresh token.

**Headers:** `Authorization: Bearer <token>`

### Refresh Token
**POST** `/auth/refresh`

Get new access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "refresh_token"
}
```

## User Management Endpoints

### Get All Users
**GET** `/users`

Get list of all users (Super Admin only).

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `search` (string): Search by name or email
- `role` (string): Filter by role
- `sort` (string): Sort field (default: -createdAt)

### Get User Profile
**GET** `/users/profile`

Get current user's profile information.

### Update User Profile
**PUT** `/users/profile`

Update current user's profile.

**Request Body:**
```json
{
  "name": "Updated Name",
  "email": "updated@example.com"
}
```

## Vendor Management Endpoints

### Get All Vendors
**GET** `/vendors`

Get list of all vendors.

**Query Parameters:**
- `page`, `limit`, `search`, `sort` (same as users)
- `businessName` (string): Filter by business name

### Get Vendor Details
**GET** `/vendors/:id`

Get detailed information about a specific vendor.

### Create Vendor
**POST** `/vendors`

Create a new vendor (Super Admin only).

**Request Body:**
```json
{
  "name": "Vendor Name",
  "email": "vendor@example.com",
  "businessName": "Business Name",
  "phone": "+1-555-0123",
  "address": "123 Business St, City, State 12345",
  "password": "password123" // optional
}
```

### Update Vendor
**PUT** `/vendors/:id`

Update vendor information.

### Get Vendor Statistics
**GET** `/vendors/:id/stats`

Get detailed statistics for a vendor including sales, orders, and products.

## Product Management Endpoints

### Get All Products
**GET** `/products`

Get list of products with filtering and pagination.

**Query Parameters:**
- `page`, `limit`, `search`, `sort` (standard pagination)
- `category` (string): Filter by category
- `minPrice`, `maxPrice` (number): Price range filter
- `inStock` (boolean): Filter by stock availability

### Get Product Details
**GET** `/products/:id`

Get detailed information about a specific product.

### Create Product
**POST** `/products`

Create a new product.

**Request Body:**
```json
{
  "name": "Product Name",
  "description": "Product description",
  "price": 99.99,
  "discountPrice": 79.99, // optional
  "stock": 100,
  "category": "Electronics",
  "image": "https://example.com/image.jpg", // optional
  "customFields": {} // optional
}
```

### Update Product
**PUT** `/products/:id`

Update product information.

### Update Product Stock
**PATCH** `/products/:id/stock`

Update product stock quantity.

**Request Body:**
```json
{
  "stock": 50,
  "operation": "set" // "set", "add", or "subtract"
}
```

### Get Product Categories
**GET** `/products/categories`

Get list of all product categories.

### Search Products
**GET** `/products/search`

Search products by name, description, or category.

**Query Parameters:**
- `q` (string): Search term (required)
- `category` (string): Filter by category
- `limit` (number): Max results (default: 10)

## Order Management Endpoints

### Get All Orders
**GET** `/orders`

Get list of orders with filtering.

**Query Parameters:**
- `page`, `limit`, `search`, `sort` (standard pagination)
- `status` (string): Filter by order status
- `customer` (string): Filter by customer name
- `startDate`, `endDate` (string): Date range filter

### Get Order Details
**GET** `/orders/:id`

Get detailed information about a specific order.

### Create Order
**POST** `/orders`

Create a new order.

**Request Body:**
```json
{
  "customer": "Customer Name",
  "customerEmail": "customer@example.com", // optional
  "items": [
    {
      "productId": "product_id",
      "quantity": 2,
      "price": 99.99
    }
  ],
  "status": "pending" // optional
}
```

### Update Order Status
**PATCH** `/orders/:id/status`

Update order status.

**Request Body:**
```json
{
  "status": "shipped",
  "note": "Order shipped via FedEx" // optional
}
```

### Add Tracking Information
**PATCH** `/orders/:id/tracking`

Add tracking information to an order.

**Request Body:**
```json
{
  "trackingNumber": "1234567890",
  "trackingLink": "https://track.fedex.com/1234567890",
  "carrier": "FedEx"
}
```

## Dashboard Endpoints

### Admin Dashboard
**GET** `/dashboard/admin`

Get comprehensive statistics for super admin dashboard.

**Query Parameters:**
- `period` (string): Time period (7d, 30d, 90d, 1y)

**Response includes:**
- Total vendors, products, users, orders
- Revenue statistics
- Top vendors and products
- Monthly trends

### Vendor Dashboard
**GET** `/dashboard/vendor`

Get statistics for vendor dashboard.

**Query Parameters:**
- `period` (string): Time period (7d, 30d, 90d, 1y)

**Response includes:**
- Product and order statistics
- Recent orders
- Top selling products
- Low stock alerts
- Monthly sales trends

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 422 | Validation Error - Invalid data format |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

## Rate Limiting

The API implements rate limiting to prevent abuse:
- **Window**: 15 minutes
- **Max Requests**: 100 per IP address
- **Headers**: Rate limit info included in response headers

## Data Validation

All endpoints use Zod schemas for request validation. Invalid data will return a 400 error with detailed validation messages.

## Demo Data

After running the seeder, you can use these demo accounts:

**Super Admin:**
- Email: `admin@demo.com`
- Password: `admin123`

**Demo Vendor:**
- Email: `vendor@demo.com`
- Password: `vendor123`

## Postman Collection

A Postman collection with all endpoints and example requests is available in the repository.

## Support

For API support, please contact the development team or create an issue in the repository.
