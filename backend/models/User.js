import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name must be less than 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true, // This creates an index automatically
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    password: {
      type: String,
      required: function () {
        // Password is only required if user doesn't have a googleId (OAuth user)
        return !this.googleId;
      },
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Don't include password in queries by default
    },
    role: {
      type: String,
      enum: ["superadmin", "vendor"],
      default: "vendor",
    },
    googleId: {
      type: String,
      sparse: true, // Allow multiple null values
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    notificationPreferences: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      lowStock: { type: Boolean, default: true },
      newOrder: { type: Boolean, default: true },
      systemAlerts: { type: Boolean, default: true },
      commissionUpdates: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for vendor information
userSchema.virtual("vendor", {
  ref: "Vendor",
  localField: "_id",
  foreignField: "userId",
  justOne: true,
});

// Index for performance (email already has unique index)
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Pre-save middleware to hash password
userSchema.pre("save", async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) return next();

  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(
      parseInt(process.env.BCRYPT_ROUNDS) || 12
    );
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Instance method to generate auth token payload
userSchema.methods.getTokenPayload = function () {
  return {
    id: this._id,
    email: this.email,
    role: this.role,
    name: this.name,
  };
};

// Static method to find user by email with password
userSchema.statics.findByEmailWithPassword = function (email) {
  return this.findOne({ email, isActive: true }).select("+password");
};

// Static method to find active users
userSchema.statics.findActive = function (filter = {}) {
  return this.find({ ...filter, isActive: true });
};

// Pre-remove middleware to clean up related data
userSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function (next) {
    try {
      // Remove associated vendor if exists
      await mongoose.model("Vendor").deleteOne({ userId: this._id });
      next();
    } catch (error) {
      next(error);
    }
  }
);

const User = mongoose.model("User", userSchema);

export default User;
