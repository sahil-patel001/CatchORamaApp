# Product Ecosystem Backend API

A comprehensive Node.js backend for the Product Ecosystem Management Platform built with Express.js, MongoDB, and modern authentication.

## 🚀 Features

- **Authentication & Authorization**: JWT-based auth with role-based access control
- **User Management**: Super Admin and Vendor roles
- **Vendor Management**: Complete vendor profile and business management
- **Product Management**: Full CRUD operations with inventory tracking
- **Order Management**: Order processing with status tracking
- **Dashboard Analytics**: Real-time statistics and reporting
- **Data Validation**: Zod schemas for request/response validation
- **Security**: Helmet, CORS, rate limiting, and password hashing
- **Database**: MongoDB with Mongoose ODM

## 🛠️ Technology Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: Passport.js with JWT
- **Validation**: Zod
- **Security**: Helmet, bcryptjs, CORS
- **Development**: Nodemon

## 📋 Prerequisites

- Node.js 20.0.0 or higher
- MongoDB 5.0 or higher
- npm or yarn package manager

## 🔧 Installation

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   NODE_ENV=development
   PORT=5001
   MONGODB_URI=mongodb://localhost:27017/product-ecosystem
   JWT_SECRET=your-super-secret-jwt-key
   # ... other variables
   ```

4. **Start MongoDB** (make sure MongoDB is running on your system)

5. **Seed the database** (optional):
   ```bash
   npm run seed
   ```

6. **Start the server**:
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

## 🌐 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/refresh` - Refresh JWT token
- `PUT /api/v1/auth/change-password` - Change password

### Users
- `GET /api/v1/users` - Get all users (Admin only)
- `GET /api/v1/users/:id` - Get user by ID
- `PUT /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user (Admin only)
- `GET /api/v1/users/profile` - Get current user profile
- `PUT /api/v1/users/profile` - Update current user profile

### Vendors
- `GET /api/v1/vendors` - Get all vendors
- `GET /api/v1/vendors/:id` - Get vendor by ID
- `POST /api/v1/vendors` - Create vendor (Admin only)
- `PUT /api/v1/vendors/:id` - Update vendor
- `DELETE /api/v1/vendors/:id` - Delete vendor (Admin only)
- `GET /api/v1/vendors/:id/stats` - Get vendor statistics

### Products
- `GET /api/v1/products` - Get all products
- `GET /api/v1/products/:id` - Get product by ID
- `POST /api/v1/products` - Create product
- `PUT /api/v1/products/:id` - Update product
- `DELETE /api/v1/products/:id` - Delete product
- `PATCH /api/v1/products/:id/stock` - Update product stock
- `GET /api/v1/products/categories` - Get product categories
- `GET /api/v1/products/search` - Search products

### Orders
- `GET /api/v1/orders` - Get all orders
- `GET /api/v1/orders/:id` - Get order by ID
- `POST /api/v1/orders` - Create order
- `PUT /api/v1/orders/:id` - Update order
- `DELETE /api/v1/orders/:id` - Delete order
- `PATCH /api/v1/orders/:id/status` - Update order status
- `PATCH /api/v1/orders/:id/tracking` - Add tracking info

### Dashboard
- `GET /api/v1/dashboard/admin` - Admin dashboard stats
- `GET /api/v1/dashboard/vendor` - Vendor dashboard stats

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Demo Credentials

After seeding the database, you can use these demo credentials:

**Super Admin:**
- Email: `admin@demo.com`
- Password: `admin123`

**Vendor:**
- Email: `vendor@demo.com`
- Password: `vendor123`

## 📊 Database Schema

### User Model
- `name`: String (required)
- `email`: String (required, unique)
- `password`: String (required, hashed)
- `role`: Enum ['superadmin', 'vendor']
- `isActive`: Boolean
- `lastLogin`: Date

### Vendor Model
- `userId`: ObjectId (ref: User)
- `businessName`: String (required)
- `phone`: String
- `address`: Object
- `businessDetails`: Object
- `status`: Enum ['active', 'inactive', 'suspended', 'pending']

### Product Model
- `vendorId`: ObjectId (ref: Vendor)
- `name`: String (required)
- `description`: String
- `price`: Number (required)
- `discountPrice`: Number
- `stock`: Number (required)
- `category`: String (required)
- `status`: Enum ['active', 'inactive', 'draft', 'out_of_stock']

### Order Model
- `orderNumber`: String (unique, auto-generated)
- `vendorId`: ObjectId (ref: Vendor)
- `customer`: Object (name, email, phone)
- `items`: Array of OrderItems
- `orderTotal`: Number
- `status`: Enum ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
- `trackingInfo`: Object

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Check API health
curl http://localhost:5000/health
```

## 📝 Development

### Project Structure
```
backend/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── middleware/      # Custom middleware
├── models/          # Mongoose models
├── routes/          # Express routes
├── seeders/         # Database seeders
├── validation/      # Zod validation schemas
├── server.js        # Main server file
└── package.json     # Dependencies
```

### Adding New Features

1. Create model in `models/`
2. Add validation schema in `validation/schemas.js`
3. Create controller in `controllers/`
4. Define routes in `routes/`
5. Add route to `server.js`

## 🔒 Security Features

- Password hashing with bcrypt
- JWT token authentication
- Rate limiting
- CORS protection
- Helmet security headers
- Input validation with Zod
- Role-based access control

## 🚀 Deployment

1. Set `NODE_ENV=production` in environment
2. Update MongoDB URI for production
3. Set strong JWT secrets
4. Configure CORS for production domains
5. Set up process manager (PM2)

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📞 Support

For support, email support@productecosystem.com or create an issue in the repository.
