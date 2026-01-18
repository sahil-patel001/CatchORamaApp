import passport from "passport";
import jwt from "jsonwebtoken";
import { asyncHandler } from "./errorHandler.js";

// Protect routes - require authentication
export const protect = (req, res, next) => {
  passport.authenticate("jwt", { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      if (info?.name === "JsonWebTokenError") {
        return res.status(401).json({
          success: false,
          error: { message: "Invalid token" },
        });
      }
      if (info?.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          error: { message: "Token expired" },
        });
      }
      return res.status(401).json({
        success: false,
        error: { message: "Not authorized to access this route" },
      });
    }
    req.user = user;
    next();
  })(req, res, next);
};

// Role-based authorization
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Not authorized to access this route",
        },
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          message: `User role '${req.user.role}' is not authorized to access this route`,
        },
      });
    }

    next();
  };
};

// Check if user owns the resource (for vendors)
export const checkOwnership = (resourceField = "vendorId") => {
  return asyncHandler(async (req, res, next) => {
    // Super admin can access everything
    if (req.user.role === "superadmin") {
      return next();
    }

    // For vendors, check if they own the resource
    if (req.user.role === "vendor") {
      const resource =
        req.body[resourceField] ||
        req.params[resourceField] ||
        req.query[resourceField];

      if (resource && resource !== req.user.vendorId) {
        return res.status(403).json({
          success: false,
          error: {
            message: "Not authorized to access this resource",
          },
        });
      }
    }

    next();
  });
};

// Generate JWT token
export const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
    algorithm: "HS256",
  });
};

// Generate refresh token
export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || "30d",
    algorithm: "HS256",
  });
};

// Verify refresh token
export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new Error("Invalid refresh token");
  }
};
