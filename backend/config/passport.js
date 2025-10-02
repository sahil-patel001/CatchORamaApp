import passport from "passport";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";

const cookieExtractor = (req) => {
  let token = null;
  if (req && req.cookies) {
    token = req.cookies["token"];
  }
  return token;
};

// Combined extractor that checks both Authorization header and cookies
const combinedExtractor = (req) => {
  // First try to extract from Authorization header
  let token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

  // If not found in header, try cookies
  if (!token) {
    token = cookieExtractor(req);
  }

  return token;
};

export const configurePassport = () => {
  // Local Strategy for login
  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          // Find user by email
          const user = await User.findOne({ email }).select("+password");

          if (!user) {
            return done(null, false, { message: "Invalid email or password" });
          }

          // Check password
          const isMatch = await bcrypt.compare(password, user.password);

          if (!isMatch) {
            return done(null, false, { message: "Invalid email or password" });
          }

          // Remove password from user object
          user.password = undefined;

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // JWT Strategy for protected routes
  passport.use(
    new JwtStrategy(
      {
        jwtFromRequest: combinedExtractor,
        secretOrKey: process.env.JWT_SECRET,
        algorithms: ["HS256"],
      },
      async (payload, done) => {
        try {
          const user = await User.findById(payload.id);

          if (!user) {
            return done(null, false);
          }

          return done(null, user);
        } catch (error) {
          return done(error, false);
        }
      }
    )
  );

  // Google OAuth Strategy - only configure if credentials are provided
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL:
            process.env.GOOGLE_CALLBACK_URL ||
            "http://localhost:5001/api/v1/auth/google/callback",
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            console.log("Google OAuth profile:", {
              id: profile.id,
              email: profile.emails[0]?.value,
              name: profile.displayName,
            });

            let user = await User.findOne({ googleId: profile.id });
            let isNewUser = false;

            if (!user) {
              // Check if user exists with same email
              user = await User.findOne({ email: profile.emails[0].value });
              if (user) {
                // Link Google account to existing user
                user.googleId = profile.id;
                await user.save();
              } else {
                // Create new user - password not required for OAuth users
                user = await User.create({
                  name: profile.displayName,
                  email: profile.emails[0].value,
                  googleId: profile.id,
                  role: "vendor", // Default role for Google signups
                });
                isNewUser = true;
              }
            }

            // If this is a new vendor user, create vendor profile
            if (isNewUser && user.role === "vendor") {
              const Vendor = (await import("../models/Vendor.js")).default;

              // Check if vendor profile already exists (safety check)
              const existingVendor = await Vendor.findOne({ userId: user._id });
              if (!existingVendor) {
                await Vendor.create({
                  userId: user._id,
                  businessName: `${user.name}'s Business`,
                  status: "active",
                });
                console.log(
                  "Created vendor profile for Google OAuth user:",
                  user.email
                );
              }
            }

            console.log("Google OAuth user processed:", {
              id: user._id,
              email: user.email,
              isNewUser,
            });
            return done(null, user);
          } catch (err) {
            console.error("Google OAuth error:", err);
            return done(err, null);
          }
        }
      )
    );
  } else {
    console.warn(
      "⚠️  Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables to enable Google authentication."
    );
  }

  // Serialize user for session (if using sessions)
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  // Deserialize user from session (if using sessions)
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};
