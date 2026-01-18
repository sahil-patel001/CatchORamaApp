/**
 * Performance monitoring utilities
 */

// Request timing middleware
export const requestTiming = (req, res, next) => {
  const start = Date.now();

  // Override res.end to measure response time
  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = Date.now() - start;

    // Only set header if headers haven't been sent yet
    if (!res.headersSent) {
      try {
        res.set("X-Response-Time", `${duration}ms`);
      } catch (error) {
        // Silently ignore header setting errors
      }
    }

    // Log slow requests in development
    if (process.env.NODE_ENV === "development" && duration > 1000) {
      console.warn(
        `⚠️  Slow request: ${req.method} ${req.originalUrl} - ${duration}ms`
      );
    }

    // Log very slow requests in production
    if (process.env.NODE_ENV === "production" && duration > 5000) {
      console.warn(
        `🐌 Very slow request: ${req.method} ${req.originalUrl} - ${duration}ms`
      );
    }

    originalEnd.apply(this, args);
  };

  next();
};

// Memory usage monitoring
export const memoryUsage = () => {
  const usage = process.memoryUsage();
  return {
    rss: Math.round((usage.rss / 1024 / 1024) * 100) / 100, // MB
    heapTotal: Math.round((usage.heapTotal / 1024 / 1024) * 100) / 100, // MB
    heapUsed: Math.round((usage.heapUsed / 1024 / 1024) * 100) / 100, // MB
    external: Math.round((usage.external / 1024 / 1024) * 100) / 100, // MB
  };
};

// Database query performance wrapper
export const withQueryTiming = (queryName) => {
  return async (queryFunction) => {
    const start = Date.now();
    try {
      const result = await queryFunction();
      const duration = Date.now() - start;

      // Log slow queries
      if (duration > 100) {
        console.warn(`🐢 Slow query [${queryName}]: ${duration}ms`);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.error(
        `❌ Query error [${queryName}] after ${duration}ms:`,
        error.message
      );
      throw error;
    }
  };
};

// Async operation performance wrapper
export const withTiming = (operationName) => {
  return async (operation) => {
    const start = Date.now();
    try {
      const result = await operation();
      const duration = Date.now() - start;

      if (process.env.NODE_ENV === "development") {
        console.log(`⏱️  ${operationName}: ${duration}ms`);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.error(
        `❌ ${operationName} failed after ${duration}ms:`,
        error.message
      );
      throw error;
    }
  };
};

// Health check utilities
export const getSystemHealth = () => {
  const uptime = process.uptime();
  const memory = memoryUsage();

  return {
    uptime: {
      seconds: Math.floor(uptime),
      human: `${Math.floor(uptime / 3600)}h ${Math.floor(
        (uptime % 3600) / 60
      )}m ${Math.floor(uptime % 60)}s`,
    },
    memory,
    nodeVersion: process.version,
    platform: process.platform,
    pid: process.pid,
  };
};

// Periodic memory monitoring (optional)
export const startMemoryMonitoring = (intervalMs = 60000) => {
  if (process.env.NODE_ENV === "production") {
    setInterval(() => {
      const memory = memoryUsage();

      // Alert on high memory usage
      if (memory.heapUsed > 500) {
        // 500MB
        console.warn(`⚠️  High memory usage: ${memory.heapUsed}MB heap used`);
      }
    }, intervalMs);
  }
};

// Request size monitoring
export const requestSizeLimit = (maxSizeMB = 10) => {
  return (req, res, next) => {
    const contentLength = parseInt(req.get("content-length") || "0");
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    if (contentLength > maxSizeBytes) {
      return res.status(413).json({
        success: false,
        error: {
          message: `Request too large. Maximum size allowed is ${maxSizeMB}MB`,
        },
      });
    }

    next();
  };
};
