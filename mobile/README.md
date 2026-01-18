# CatchORama Admin Mobile App

A React Native (Expo SDK 51) mobile application for inventory management. Built for Vendors and Superadmins to manage product inventory securely.

## Features

- **Secure Authentication**: JWT-based login with tokens stored in Expo SecureStore
- **Product List**: View products with infinite scroll and pull-to-refresh
- **Add Product**: Create new products with image upload
- **Edit Product**: Update existing product details
- **Role-Based Access**: Superadmins can assign vendors; Vendors manage their own products
- **Network Handling**: Automatic detection and alerts for connectivity issues
- **Auto-Logout**: Automatic redirect to login on token expiry (401 responses)

## Tech Stack

- **Framework**: React Native (Expo SDK 51)
- **Language**: TypeScript
- **Navigation**: Expo Router (file-based routing)
- **HTTP Client**: Axios with interceptors
- **Form Management**: React Hook Form + Zod
- **Secure Storage**: expo-secure-store
- **Network Detection**: @react-native-community/netinfo

## Project Structure

```
/mobile
├── app/                      # Expo Router screens
│   ├── _layout.tsx          # Root layout with AuthProvider
│   ├── index.tsx            # Entry redirect
│   ├── login.tsx            # Login screen
│   ├── (tabs)/              # Protected tab navigation
│   │   ├── _layout.tsx      # Tab bar configuration
│   │   ├── index.tsx        # Product List (Home)
│   │   └── add.tsx          # Add Product
│   └── product/
│       └── [id].tsx         # Edit Product (dynamic route)
├── assets/                   # App icons and images
├── components/               # Reusable UI components
├── context/
│   └── AuthContext.tsx      # Authentication state management
├── hooks/
│   └── useNetworkStatus.ts  # Network connectivity hook
├── services/
│   ├── api.ts               # Axios instance with interceptors
│   ├── auth.ts              # Authentication API calls
│   └── products.ts          # Product CRUD operations
├── types/
│   └── index.ts             # TypeScript type definitions
├── app.json                  # Expo configuration
├── package.json              # Dependencies
└── tsconfig.json            # TypeScript configuration
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your mobile device (for testing)

### Installation

1. Navigate to the mobile directory:
   ```bash
   cd mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Start the development server:
   ```bash
   npx expo start
   ```

4. Scan the QR code with:
   - **iOS**: Camera app or Expo Go
   - **Android**: Expo Go app

### Environment Configuration

The app is configured to connect to the production API:
- **API URL**: `https://api.catchorama.com/api/v1`

To change the API URL, modify the `.env` file:
```
EXPO_PUBLIC_API_URL=https://your-api-url.com/api/v1
```

## API Endpoints Used

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | User authentication |
| POST | `/auth/logout` | User logout |
| GET | `/auth/me` | Get current user |
| POST | `/auth/refresh` | Refresh JWT token |
| GET | `/products` | List products (paginated) |
| GET | `/products/:id` | Get single product |
| POST | `/products` | Create product (multipart/form-data) |
| PUT | `/products/:id` | Update product (multipart/form-data) |
| GET | `/products/categories` | Get product categories |

## User Roles

### Vendor
- Can view, create, and edit their own products
- Cannot assign products to other vendors

### Superadmin
- Can view all products across vendors
- Can create products and assign to any vendor (requires `vendorId` field)
- Can edit any product

## Form Validation

The app uses Zod schemas for validation:

- **Required fields**: Name, Price, Stock, Category
- **Price validation**: Must be positive number
- **Discount price**: Must be less than regular price
- **Stock**: Must be 0 or greater

## Error Handling

- **Network errors**: Automatic detection with user-friendly alerts
- **API errors (400)**: Displays specific error messages from backend
- **Server errors (500)**: Shows generic "Something went wrong" message
- **Token expiry (401)**: Automatic logout and redirect to login

## Building for Production

### iOS
```bash
eas build --platform ios
```

### Android
```bash
eas build --platform android
```

## Demo Credentials

Use your existing CatchORama credentials to log in, or contact the administrator for access.

## Support

For issues or feature requests, please contact the development team.