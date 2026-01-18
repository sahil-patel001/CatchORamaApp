# CatchORama Admin Mobile App

A React Native (Expo SDK 51) mobile application for inventory management. Built for Vendors and Superadmins to manage product inventory securely.

## Features

- **Secure Authentication**: JWT-based login with tokens stored in Expo SecureStore
- **Product List**: View products with infinite scroll and pull-to-refresh
- **Add Product**: Create new products with image upload
- **Edit Product**: Update existing product details
- **Role-Based Access**: Superadmins can assign vendors; Vendors manage their own products
- **Network Handling**: Automatic detection and alerts for connectivity issues
- **Auto-Logout**: Automatic redirect to login on token expiry

## Tech Stack

- **Framework**: React Native (Expo SDK 51)
- **Language**: TypeScript
- **Navigation**: Expo Router (file-based routing)
- **HTTP Client**: Axios with interceptors
- **Form Management**: React Hook Form + Zod
- **Secure Storage**: expo-secure-store
- **Network Detection**: @react-native-community/netinfo

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo Go app on your mobile device

### Installation

```bash
# Navigate to mobile directory
cd mobile

# Install dependencies
npm install
# or
yarn install

# Start development server
npx expo start
```

### Running the App

1. Start the development server: `npx expo start`
2. Scan the QR code with:
   - **iOS**: Camera app or Expo Go
   - **Android**: Expo Go app

## Project Structure

```
mobile/
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

## API Configuration

The app connects to the production API:
- **Base URL**: `https://api.catchorama.com/api/v1`

## User Roles

### Vendor
- View, create, and edit their own products
- Cannot assign products to other vendors

### Superadmin
- View all products across vendors
- Create products and assign to any vendor
- Edit any product

## Building for Production

```bash
# iOS
eas build --platform ios

# Android
eas build --platform android
```

## License

Private - CatchORama
