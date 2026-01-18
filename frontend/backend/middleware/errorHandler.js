import { ZodError } from "zod";

export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error("Error:", err);

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    const message = "Resource not found";
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const fields = Object.keys(err.keyValue);
    let message;

    // Handle compound unique constraint violations
    if (
      fields.includes("name") &&
      fields.includes("vendorId") &&
      fields.includes("category")
    ) {
      message =
        "A product with this name already exists in this category. Please choose a different name.";
    } else if (fields.includes("seo.slug") && fields.includes("vendorId")) {
      message =
        "A product with this name already exists. Please choose a different name.";
    } else if (fields.includes("name") && fields.includes("vendorId")) {
      message = "A product with this name already exists for this vendor";
    } else if (fields.includes("email")) {
      message = "An account with this email address already exists";
    } else if (fields.includes("barcode")) {
      message = "This barcode is already assigned to another product";
    } else {
      const field = fields[0];
      message = `${
        field.charAt(0).toUpperCase() + field.slice(1)
      } already exists`;
    }

    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
    error = { message, statusCode: 400 };
  }

  // Zod validation error
  if (err instanceof ZodError) {
    const message = err.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join(", ");
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    const message = "Invalid token";
    error = { message, statusCode: 401 };
  }

  if (err.name === "TokenExpiredError") {
    const message = "Token expired";
    error = { message, statusCode: 401 };
  }

  // Default error response
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
  });
};

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
