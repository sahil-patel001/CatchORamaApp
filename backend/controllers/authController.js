import passport from "passport";
import { asyncHandler } from "../middleware/errorHandler.js";
import {
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../middleware/auth.js";
import User from "../models/User.js";
import Vendor from "../models/Vendor.js";

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
export const register = asyncHandler(async (req, res, next) => {
  const { name, email, password, role, businessName } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      error: {
        message: "User with this email already exists",
      },
    });
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    role: role || "vendor",
  });

  // If user is a vendor, create vendor profile
  let vendor = null;
  if (user.role === "vendor") {
    vendor = await Vendor.create({
      userId: user._id,
      businessName: businessName || `${name}'s Business`,
    });
  }

  // Generate tokens
  const tokenPayload = user.getTokenPayload();
  const token = generateToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Save refresh token to user
  user.refreshToken = refreshToken;
  await user.save();

  // Prepare response data
  const userData = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };

  if (vendor) {
    userData.vendorId = vendor._id;
    userData.businessName = vendor.businessName;
  }

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.status(201).json({
    success: true,
    data: {
      user: userData,
      token,
      refreshToken,
    },
    message: "User registered successfully",
  });
});

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
export const login = asyncHandler(async (req, res, next) => {
  passport.authenticate(
    "local",
    { session: false },
    async (err, user, info) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            message: info?.message || "Invalid credentials",
          },
        });
      }

      // Update last login and refresh token
      const lastLogin = new Date();
      const tokenPayload = user.getTokenPayload();
      const token = generateToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      // Update user with lastLogin and refreshToken using updateOne to avoid validation issues
      await User.updateOne(
        { _id: user._id },
        {
          lastLogin: lastLogin,
          refreshToken: refreshToken,
        }
      );

      // Get vendor info if user is a vendor
      let vendor = null;
      if (user.role === "vendor") {
        vendor = await Vendor.findOne({ userId: user._id });
      }

      // Prepare response data
      const userData = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        lastLogin: lastLogin,
        token: token
      };

      if (vendor) {
        userData.vendorId = vendor._id;
        userData.businessName = vendor.businessName;
      }

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(200).json({
        success: true,
        data: {
          user: userData,
          token,
          refreshToken,
        },
        message: "Login successful",
      });
    }
  )(req, res, next);
});

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
export const logout = asyncHandler(async (req, res, next) => {
  // Clear refresh token from database using updateOne to avoid validation issues
  await User.updateOne({ _id: req.user._id }, { $unset: { refreshToken: 1 } });

  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  res.status(200).json({
    success: true,
    message: "Logout successful",
  });
});

// @desc    Get current user
// @route   GET /api/v1/auth/me
// @access  Private
export const getMe = asyncHandler(async (req, res, next) => {
  try {
    let userData = {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      createdAt: req.user.createdAt,
      lastLogin: req.user.lastLogin,
    };

    // Get vendor info if user is a vendor
    if (req.user.role === "vendor") {
      const vendor = await Vendor.findOne({ userId: req.user._id });
      if (vendor) {
        userData.vendorId = vendor._id;
        userData.businessName = vendor.businessName;
      }
      throw "invalid user!";
    }
    // else if (req.user.role = "superadmin") {}
    res.status(200).json({
      success: true,
      data: {
        user: userData,
      },
    });
  } catch(err) {
    return res.status(401).json({
      success: false,
      error: {
        message: err || "No active session!",
      },
    });
  }
});

// @desc    Refresh token
// @route   POST /api/v1/auth/refresh
// @access  Public
export const refreshToken = asyncHandler(async (req, res, next) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        message: "Refresh token is required",
      },
    });
  }

  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(token);

    // Find user and check if refresh token matches
    const user = await User.findById(decoded.id).select("+refreshToken");

    if (!user || user.refreshToken !== token) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Invalid refresh token",
        },
      });
    }

    // Generate new tokens
    const tokenPayload = user.getTokenPayload();
    const newToken = generateToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    // Update refresh token in database using updateOne to avoid validation issues
    await User.updateOne({ _id: user._id }, { refreshToken: newRefreshToken });

    res.status(200).json({
      success: true,
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
      },
      message: "Token refreshed successfully",
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        message: "Invalid refresh token",
      },
    });
  }
});

// @desc    Change password or create password for OAuth users
// @route   PUT /api/v1/auth/change-password
// @access  Private
export const changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await User.findById(req.user._id).select("+password");

  // Check if user has an existing password (not an OAuth-only user)
  const hasExistingPassword = user.password && user.password.length > 0;

  if (hasExistingPassword) {
    // User has existing password - require current password for change
    if (!currentPassword) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Current password is required",
        },
      });
    }

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Current password is incorrect",
        },
      });
    }
  } else {
    // OAuth user creating password for first time - no current password required
    if (currentPassword) {
      return res.status(400).json({
        success: false,
        error: {
          message:
            "You don't have a current password. Just provide the new password.",
        },
      });
    }
  }

  // Update password
  user.password = newPassword;
  await user.save();

  const message = hasExistingPassword
    ? "Password updated successfully"
    : "Password created successfully";

  res.status(200).json({
    success: true,
    message,
  });
});

// @desc    Check if user has password set
// @route   GET /api/v1/auth/password-status
// @access  Private
export const getPasswordStatus = asyncHandler(async (req, res, next) => {
  // Get user with password field
  const user = await User.findById(req.user._id).select("+password");

  const hasPassword = user.password && user.password.length > 0;

  res.status(200).json({
    success: true,
    data: {
      hasPassword,
      isOAuthUser: !!user.googleId,
    },
  });
});
