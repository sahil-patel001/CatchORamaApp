import express from "express";
import {
  register,
  login,
  logout,
  getMe,
  refreshToken,
  changePassword,
  getPasswordStatus,
} from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";
import { validateBody } from "../middleware/validation.js";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
} from "../validation/schemas.js";
import passport from "passport";

const router = express.Router();

// Public routes
router.post("/register", validateBody(registerSchema.shape.body), register);
router.post("/login", validateBody(loginSchema.shape.body), login);
router.post(
  "/refresh",
  validateBody(refreshTokenSchema.shape.body),
  refreshToken
);

// Google OAuth routes (must be public)
// Google OAuth: Start
router.get("/google", (req, res, next) => {
  // Check if Google OAuth is configured
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({
      success: false,
      error: {
        message: "Google OAuth is not configured on this server",
        code: "OAUTH_NOT_CONFIGURED",
      },
    });
  }

  passport.authenticate("google", { scope: ["profile", "email"] })(
    req,
    res,
    next
  );
});

// Google OAuth: Callback
router.get("/google/callback", (req, res, next) => {
  // Check if Google OAuth is configured
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    return res.redirect(`${frontendUrl}/login?error=oauth_not_configured`);
  }

  passport.authenticate(
    "google",
    { session: false },
    async (err, user, info) => {
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

      if (err) {
        console.error("Passport authentication error:", err);
        return res.redirect(`${frontendUrl}/login?error=oauth_error`);
      }

      if (!user) {
        console.error("No user returned from passport:", info);
        return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
      }

      try {
        console.log("OAuth user authenticated:", {
          id: user._id,
          email: user.email,
          name: user.name,
        });

        // Generate JWT and set cookie
        const { generateToken } = await import("../middleware/auth.js");
        const tokenPayload = user.getTokenPayload();
        const token = generateToken(tokenPayload);

        console.log("Generated token for user:", user.email);

        res.cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        // Update last login
        await user.updateOne({ lastLogin: new Date() });

        res.redirect(`${frontendUrl}/vendor/dashboard`);
      } catch (error) {
        console.error("Error in Google OAuth callback:", error);
        res.redirect(`${frontendUrl}/login?error=oauth_error`);
      }
    }
  )(req, res, next);
});

// Protected routes
router.use(protect); // All routes after this middleware are protected

router.get("/me", getMe);
router.get("/password-status", getPasswordStatus);
router.post("/logout", logout);
router.put(
  "/change-password",
  validateBody(changePasswordSchema.shape.body),
  changePassword
);

export default router;
