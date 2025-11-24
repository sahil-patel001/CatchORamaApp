import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import passport from "passport";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { Server } from "socket.io";

// Import configurations
import { connectDB } from "./config/database.js";
import { configurePassport } from "./config/passport.js";
import {
  notificationConfig,
  validateNotificationConfig,
} from "./config/notification.js";
import { initializeEnvironment } from "./config/environment.js";

// Import notification services
import { websocketService } from "./services/websocketService.js";

// Import performance utilities
import {
  requestTiming,
  startMemoryMonitoring,
  requestSizeLimit,
} from "./utils/performance.js";

// Import middleware
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";

// Import routes
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import vendorRoutes from "./routes/vendors.js";
import productRoutes from "./routes/products.js";
import orderRoutes from "./routes/orders.js";
import dashboardRoutes from "./routes/dashboard.js";
import categoryRoutes from "./routes/categories.js";
import reportRoutes from "./routes/reports.js";
import commissionRoutes from "./routes/commissions.js";
import barcodeRoutes from "./routes/barcodes.js";
import notificationRoutes from "./routes/notifications.js";
import { error } from "console";

// Load environment variables
dotenv.config({path: './.env'});

// Initialize and validate environment
const envValidation = initializeEnvironment();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT;
const API_VERSION = process.env.API_VERSION || "v1";

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: notificationConfig.websocket.corsOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
  pingTimeout: notificationConfig.websocket.pingTimeout,
  pingInterval: notificationConfig.websocket.pingInterval,
});

// Connect to MongoDB
connectDB();

// Configure Passport
configurePassport();

// Validate notification configuration
const configValidation = validateNotificationConfig();
if (!configValidation.isValid) {
  console.warn("⚠️  Notification configuration warnings:");
  configValidation.errors.forEach((error) => console.warn(`   - ${error}`));
  console.warn(
    "   Notification system may not function properly without proper configuration."
  );
}

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Rate limiting with different limits for different endpoints
const createRateLimiter = (windowMs, max, message = "Too many requests") =>
  rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use user ID for authenticated requests, IP for others
      return req.user?.id || req.ip;
    },
  });

// General rate limiter
const generalLimiter = createRateLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 1 * 60 * 1000, // 15 minutes
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 500 // 100 requests per window
);

// Stricter rate limiter for auth endpoints
const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  process.env.NODE_ENV === "production" ? 20 : 50, // 5 in production, 50 in development
  "Too many authentication attempts, please try again later."
);

// More lenient for dashboard (cached responses)
const dashboardLimiter = createRateLimiter(
  5 * 60 * 1000, // 5 minutes
  200 // 200 requests per window
);

app.use(generalLimiter);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || false;
    if (!allowedOrigins || allowedOrigins && allowedOrigins.length == 0) {
      throw new Error(`can not read value of ${process.env.ALLOWED_ORIGINS}!`);
    }

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(cors(corsOptions));
// Preflight handline
app.options("*", cors(corsOptions));

// Performance monitoring
app.use(requestTiming);

// Request size limiting
app.use(requestSizeLimit(10)); // 10MB limit

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Passport middleware
app.use(passport.initialize());

// Cookie parser middleware
app.use(cookieParser());

// Serve static files (uploaded images)
app.use("/uploads", express.static("uploads"));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Product Ecosystem API is running",
    timestamp: new Date().toISOString(),
    version: API_VERSION,
  });
});

// API routes with specific rate limiters
app.use(`/api/${API_VERSION}/auth`, authLimiter, authRoutes);
app.use(`/api/${API_VERSION}/users`, userRoutes);
app.use(`/api/${API_VERSION}/vendors`, vendorRoutes);
app.use(`/api/${API_VERSION}/products`, productRoutes);
app.use(`/api/${API_VERSION}/orders`, orderRoutes);
app.use(`/api/${API_VERSION}/dashboard`, dashboardLimiter, dashboardRoutes);
app.use(`/api/${API_VERSION}/categories`, categoryRoutes);
app.use(`/api/${API_VERSION}/reports`, reportRoutes);
app.use(`/api/${API_VERSION}/commissions`, commissionRoutes);
app.use(`/api/${API_VERSION}/barcodes`, barcodeRoutes);
app.use(`/api/${API_VERSION}/notifications`, notificationRoutes);

// 404 handler
app.use(notFound);

// Error handling middleware
app.use(errorHandler);

// Make io available globally for other modules
app.set("io", io);

// Initialize WebSocket service
if (notificationConfig.websocket.enabled) {
  websocketService.initialize(io);
}

// Start memory monitoring in production
if (process.env.NODE_ENV === "production") {
  startMemoryMonitoring();
}

// Start server
server.listen(PORT, () => {
  console.log(
    `🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`
  );
  console.log(
    `📊 API Documentation: http://localhost:${PORT}/api/${API_VERSION}`
  );
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);

  if (notificationConfig.websocket.enabled) {
    console.log(`🔗 WebSocket server running on port ${PORT}`);
  }

  if (notificationConfig.email.enabled) {
    console.log(
      `📧 Email notifications enabled via ${notificationConfig.email.service}`
    );
  }
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  process.exit(1);
});

export default app;
