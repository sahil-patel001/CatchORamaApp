# Product Ecosystem Platform

A comprehensive product management and e-commerce platform built with React, TypeScript, and modern web technologies. This platform provides complete vendor management, product catalog, order processing, and commission tracking capabilities.

## 🚀 Features

### 🏢 Multi-Role System
- **Super Admin**: Complete platform oversight, vendor management, commission tracking
- **Vendor**: Product management, order processing, sales analytics
- **Role-based authentication** with protected routes

### 📦 Product Management
- Complete CRUD operations for products
- **Image upload and management**
- **Barcode generation and scanning**
- **Category management**
- **Inventory tracking** with low stock alerts
- **Bulk operations** (archive, delete, restore)
- **Cubic weight calculation** for shipping
- **Product search and filtering**

### 🛒 Order Management
- Order creation and processing
- **Status tracking** (pending, processing, shipped, delivered)
- **Order history and analytics**
- **Commission calculation** per order
- **Vendor-specific order management**

### 💰 Commission System
- **Automated commission calculation**
- **Commission history tracking**
- **Detailed commission reports**
- **Vendor payout management**

### 🔔 Smart Notifications
- **Real-time notifications** for low stock
- **Order status updates**
- **Commission alerts**
- **System-wide announcements**

### 📊 Analytics & Reporting
- **Sales analytics** with interactive charts
- **Product performance metrics**
- **Commission reports**
- **Revenue tracking**
- **Export capabilities** (PDF, CSV)

### 🎨 Modern UI/UX
- **Responsive design** for all devices
- **Dark/Light theme** support
- **Accessibility compliant** (WCAG 2.2)
- **Loading states** and error handling
- **Toast notifications**
- **Modal-based workflows**

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **TailwindCSS** for styling
- **shadcn/ui** component library
- **Radix UI** primitives
- **React Router** for navigation
- **TanStack Query** for data fetching
- **React Hook Form** for form management
- **Recharts** for data visualization

### Backend Integration
- **Axios** for API communication
- **RESTful API** architecture
- **JWT authentication**
- **File upload** support
- **Real-time updates**

### Development Tools
- **TypeScript** for type safety
- **ESLint** for code quality
- **Vitest** for testing
- **React Testing Library**
- **Responsive design** utilities

## 📋 Prerequisites

- **Node.js** >= 20.0.0
- **npm** or **yarn**
- **Git**

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd product-ecosystem-platform
```

### 2. Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install backend dependencies (if running locally)
npm run backend:install
```

### 3. Environment Setup
Create a `.env` file in the root directory:
```env
VITE_API_BASE_URL=http://localhost:5001/api/v1
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

### 4. Start Development Server
```bash
# Frontend only
npm run dev

# Full stack (frontend + backend)
npm run dev:full
```

The application will be available at `http://localhost:8080` (or next available port).

## 📁 Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── modals/          # Modal components
│   └── ui/              # Base UI components (shadcn/ui)
├── contexts/            # React contexts (Auth, Loading, Notifications)
├── hooks/               # Custom React hooks
├── lib/                 # Utility functions
├── pages/               # Route components
│   ├── admin/           # Admin-specific pages
│   └── vendor/          # Vendor-specific pages
├── services/            # API service functions
├── types/               # TypeScript type definitions
└── data/                # Static data and configurations
```

## 🔐 Authentication

The platform supports multiple authentication methods:
- **Email/Password** login
- **Google OAuth** integration
- **JWT-based** session management
- **Role-based** access control

## 🎯 Key Features Breakdown

### Product Management
- ✅ **CRUD Operations**: Create, read, update, delete products
- ✅ **Image Management**: Upload, preview, and manage product images
- ✅ **Barcode Integration**: Generate and scan barcodes
- ✅ **Inventory Tracking**: Real-time stock management
- ✅ **Category Organization**: Hierarchical product categorization
- ✅ **Bulk Operations**: Mass update, archive, and restore
- ✅ **Search & Filter**: Advanced product discovery

### Order Processing
- ✅ **Order Creation**: Simple order placement workflow
- ✅ **Status Management**: Track orders through lifecycle
- ✅ **Commission Calculation**: Automatic vendor commission
- ✅ **History Tracking**: Complete order audit trail

### Vendor Management
- ✅ **Vendor Registration**: Complete vendor onboarding
- ✅ **Profile Management**: Vendor information and settings
- ✅ **Commission Tracking**: Earnings and payout management
- ✅ **Performance Analytics**: Sales metrics and insights

## 🧪 Testing

Run the test suite:
```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 🏗️ Building for Production

```bash
# Build the application
npm run build

# Preview the production build
npm run preview
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run server:dev` - Start backend development server
- `npm run dev:full` - Start both frontend and backend
- `npm run seed` - Seed database with sample data

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:
1. Check the [Issues](../../issues) page
2. Create a new issue with detailed description
3. Include steps to reproduce the problem

## 🔄 Recent Updates

- ✅ **Enhanced Product Management**: Improved form validation and error handling
- ✅ **Loading States**: Added loading indicators for better UX
- ✅ **Toast Notifications**: Proper success/error messaging
- ✅ **Form State Management**: Persistent form data during errors
- ✅ **Accessibility Improvements**: WCAG 2.2 compliance
- ✅ **Performance Optimizations**: Reduced bundle size and improved loading times

---

Built with ❤️ using modern web technologies for scalable e-commerce solutions.