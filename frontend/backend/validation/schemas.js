import { z } from "zod";

// Common schemas
export const mongoIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId");

export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 10)),
  sort: z.string().optional(),
  search: z.string().optional(),
});

// Auth schemas
export const registerSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(50, "Name must be less than 50 characters"),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .max(128, "Password must be less than 128 characters"),
    role: z.enum(["superadmin", "vendor"]).optional().default("vendor"),
    businessName: z
      .string()
      .min(2, "Business name must be at least 2 characters")
      .max(100, "Business name must be less than 100 characters")
      .optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, "Refresh token is required"),
  }),
});

// User schemas
export const updateUserSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(50, "Name must be less than 50 characters")
      .optional(),
    email: z.string().email("Invalid email address").optional(),
    role: z.enum(["superadmin", "vendor"]).optional(),
  }),
  params: z.object({
    id: mongoIdSchema,
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().optional(), // Optional for OAuth users creating password
    newPassword: z
      .string()
      .min(6, "New password must be at least 6 characters")
      .max(128, "New password must be less than 128 characters"),
  }),
});

// Vendor schemas
export const createVendorSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(50, "Name must be less than 50 characters"),
    email: z.string().email("Invalid email address"),
    businessName: z
      .string()
      .min(2, "Business name must be at least 2 characters")
      .max(100, "Business name must be less than 100 characters"),
    phone: z.string().optional(),
    address: z.string().optional(),
    businessDetails: z
      .object({
        description: z.string().optional(),
        website: z.string().url("Invalid website URL").optional(),
        taxId: z
          .string()
          .max(20, "Tax ID must be less than 20 characters")
          .regex(
            /^[A-Za-z0-9]*$/,
            "Tax ID must contain only alphanumeric characters"
          )
          .optional(),
        gstRegistered: z.boolean().optional(),
        businessType: z
          .enum(["individual", "partnership", "corporation", "llc", "other"])
          .optional(),
      })
      .optional(),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .max(128, "Password must be less than 128 characters")
      .optional(),
  }),
});

export const updateVendorSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(50, "Name must be less than 50 characters")
      .optional(),
    email: z.string().email("Invalid email address").optional(),
    businessName: z
      .string()
      .min(2, "Business name must be at least 2 characters")
      .max(100, "Business name must be less than 100 characters")
      .optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    businessDetails: z
      .object({
        description: z.string().optional(),
        website: z.string().url("Invalid website URL").optional(),
        taxId: z
          .string()
          .max(20, "Tax ID must be less than 20 characters")
          .regex(
            /^[A-Za-z0-9]*$/,
            "Tax ID must contain only alphanumeric characters"
          )
          .optional(),
        gstRegistered: z.boolean().optional(),
        businessType: z
          .enum(["individual", "partnership", "corporation", "llc", "other"])
          .optional(),
      })
      .optional(),
  }),
  params: z.object({
    id: mongoIdSchema,
  }),
});

// Product schemas
export const createProductSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, "Product name must be at least 2 characters")
      .max(200, "Product name must be less than 200 characters"),
    price: z.union([
      z.number().positive("Price must be positive"),
      z.string().transform((val, ctx) => {
        const parsed = parseFloat(val);
        if (isNaN(parsed) || parsed <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Price must be a positive number",
          });
          return z.NEVER;
        }
        return parsed;
      }),
    ]),
    discountPrice: z
      .union([
        z.number().positive("Discount price must be positive"),
        z.string().transform((val, ctx) => {
          if (val === "" || val === null || val === undefined) {
            return undefined;
          }
          const parsed = parseFloat(val);
          if (isNaN(parsed) || parsed <= 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Discount price must be a positive number",
            });
            return z.NEVER;
          }
          return parsed;
        }),
      ])
      .optional(),
    stock: z.union([
      z.number().int().min(0, "Stock cannot be negative"),
      z.string().transform((val, ctx) => {
        const parsed = parseInt(val, 10);
        if (isNaN(parsed) || parsed < 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Stock must be a non-negative integer",
          });
          return z.NEVER;
        }
        return parsed;
      }),
    ]),
    category: z
      .string()
      .min(2, "Category must be at least 2 characters")
      .max(50, "Category must be less than 50 characters"),
    description: z
      .string()
      .max(1000, "Description must be less than 1000 characters")
      .optional(),
    lowStockThreshold: z
      .union([
        z
          .number()
          .int()
          .min(0, "Low stock threshold cannot be negative")
          .max(10000, "Low stock threshold cannot exceed 10,000"),
        z.string().transform((val, ctx) => {
          if (val === "" || val === null || val === undefined) {
            return undefined;
          }
          const parsed = parseInt(val, 10);
          if (isNaN(parsed) || parsed < 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Low stock threshold must be a non-negative integer",
            });
            return z.NEVER;
          }
          if (parsed > 10000) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Low stock threshold cannot exceed 10,000",
            });
            return z.NEVER;
          }
          return parsed;
        }),
      ])
      .optional(),
    length: z
      .union([
        z.number().positive("Length must be positive"),
        z.string().transform((val, ctx) => {
          if (val === "" || val === null || val === undefined) {
            return undefined;
          }
          const parsed = parseFloat(val);
          if (isNaN(parsed) || parsed <= 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Length must be a positive number",
            });
            return z.NEVER;
          }
          return parsed;
        }),
      ])
      .optional(),
    breadth: z
      .union([
        z.number().positive("Breadth must be positive"),
        z.string().transform((val, ctx) => {
          if (val === "" || val === null || val === undefined) {
            return undefined;
          }
          const parsed = parseFloat(val);
          if (isNaN(parsed) || parsed <= 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Breadth must be a positive number",
            });
            return z.NEVER;
          }
          return parsed;
        }),
      ])
      .optional(),
    height: z
      .union([
        z.number().positive("Height must be positive"),
        z.string().transform((val, ctx) => {
          if (val === "" || val === null || val === undefined) {
            return undefined;
          }
          const parsed = parseFloat(val);
          if (isNaN(parsed) || parsed <= 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Height must be a positive number",
            });
            return z.NEVER;
          }
          return parsed;
        }),
      ])
      .optional(),
    weight: z
      .union([
        z.number().positive("Weight must be positive"),
        z.string().transform((val, ctx) => {
          if (val === "" || val === null || val === undefined) {
            return undefined;
          }
          const parsed = parseFloat(val);
          if (isNaN(parsed) || parsed <= 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Weight must be a positive number",
            });
            return z.NEVER;
          }
          return parsed;
        }),
      ])
      .optional(),
    vendorId: z
      .string()
      .min(2, "").optional(),
    image: z.string().url("Invalid image URL").optional(),
    customFields: z.record(z.any()).optional(),
  }),
});

export const updateProductSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .min(2, "Product name must be at least 2 characters")
        .max(200, "Product name must be less than 200 characters")
        .optional(),
      price: z
        .union([
          z.number().positive("Price must be positive"),
          z.string().transform((val, ctx) => {
            const parsed = parseFloat(val);
            if (isNaN(parsed) || parsed <= 0) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Price must be a positive number",
              });
              return z.NEVER;
            }
            return parsed;
          }),
        ])
        .optional(),
      discountPrice: z
        .union([
          z.number().positive("Discount price must be positive"),
          z.string().transform((val, ctx) => {
            if (val === "" || val === null || val === undefined) {
              return undefined;
            }
            const parsed = parseFloat(val);
            if (isNaN(parsed) || parsed <= 0) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Discount price must be a positive number",
              });
              return z.NEVER;
            }
            return parsed;
          }),
        ])
        .optional(),
      stock: z
        .union([
          z.number().int().min(0, "Stock cannot be negative"),
          z.string().transform((val, ctx) => {
            const parsed = parseInt(val, 10);
            if (isNaN(parsed) || parsed < 0) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Stock must be a non-negative integer",
              });
              return z.NEVER;
            }
            return parsed;
          }),
        ])
        .optional(),
      category: z
        .string()
        .min(2, "Category must be at least 2 characters")
        .max(50, "Category must be less than 50 characters")
        .optional(),
      description: z
        .string()
        .max(1000, "Description must be less than 1000 characters")
        .optional(),
      lowStockThreshold: z
        .union([
          z
            .number()
            .int()
            .min(0, "Low stock threshold cannot be negative")
            .max(10000, "Low stock threshold cannot exceed 10,000"),
          z.string().transform((val, ctx) => {
            if (val === "" || val === null || val === undefined) {
              return undefined;
            }
            const parsed = parseInt(val, 10);
            if (isNaN(parsed) || parsed < 0) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Low stock threshold must be a non-negative integer",
              });
              return z.NEVER;
            }
            if (parsed > 10000) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Low stock threshold cannot exceed 10,000",
              });
              return z.NEVER;
            }
            return parsed;
          }),
        ])
        .optional(),
      length: z
        .union([
          z.number().positive("Length must be positive"),
          z.string().transform((val, ctx) => {
            if (val === "" || val === null || val === undefined) {
              return undefined;
            }
            const parsed = parseFloat(val);
            if (isNaN(parsed) || parsed <= 0) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Length must be a positive number",
              });
              return z.NEVER;
            }
            return parsed;
          }),
        ])
        .optional(),
      breadth: z
        .union([
          z.number().positive("Breadth must be positive"),
          z.string().transform((val, ctx) => {
            if (val === "" || val === null || val === undefined) {
              return undefined;
            }
            const parsed = parseFloat(val);
            if (isNaN(parsed) || parsed <= 0) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Breadth must be a positive number",
              });
              return z.NEVER;
            }
            return parsed;
          }),
        ])
        .optional(),
      height: z
        .union([
          z.number().positive("Height must be positive"),
          z.string().transform((val, ctx) => {
            if (val === "" || val === null || val === undefined) {
              return undefined;
            }
            const parsed = parseFloat(val);
            if (isNaN(parsed) || parsed <= 0) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Height must be a positive number",
              });
              return z.NEVER;
            }
            return parsed;
          }),
        ])
        .optional(),
      weight: z
        .union([
          z.number().positive("Weight must be positive"),
          z.string().transform((val, ctx) => {
            if (val === "" || val === null || val === undefined) {
              return undefined;
            }
            const parsed = parseFloat(val);
            if (isNaN(parsed) || parsed <= 0) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Weight must be a positive number",
              });
              return z.NEVER;
            }
            return parsed;
          }),
        ])
        .optional(),
      image: z.string().url("Invalid image URL").optional(),
      customFields: z.record(z.any()).optional(),
    })
    .refine(
      (data) => {
        // Validate that discount price is less than regular price when both are provided
        if (
          data.price !== undefined &&
          data.discountPrice !== undefined &&
          data.discountPrice !== null
        ) {
          return data.discountPrice < data.price;
        }
        return true;
      },
      {
        message: "Discount price must be less than regular price",
        path: ["discountPrice"],
      }
    ),
  params: z.object({
    id: mongoIdSchema,
  }),
});

// Order schemas
export const orderItemSchema = z.object({
  productId: mongoIdSchema,
  quantity: z.number().int().positive("Quantity must be positive"),
  price: z.number().positive("Price must be positive"),
});

export const createOrderSchema = z.object({
  body: z.object({
    customer: z
      .string()
      .min(2, "Customer name must be at least 2 characters")
      .max(100, "Customer name must be less than 100 characters"),
    customerEmail: z.string().email("Invalid customer email").optional(),
    items: z.array(orderItemSchema).min(1, "Order must have at least one item"),
    status: z
      .enum(["pending", "processing", "shipped", "delivered", "cancelled"])
      .optional()
      .default("pending"),
    trackingLink: z.string().url("Invalid tracking URL").optional(),
  }),
});

export const updateOrderSchema = z.object({
  body: z.object({
    customer: z
      .string()
      .min(2, "Customer name must be at least 2 characters")
      .max(100, "Customer name must be less than 100 characters")
      .optional(),
    customerEmail: z.string().email("Invalid customer email").optional(),
    items: z
      .array(orderItemSchema)
      .min(1, "Order must have at least one item")
      .optional(),
    status: z
      .enum(["pending", "processing", "shipped", "delivered", "cancelled"])
      .optional(),
    trackingLink: z.string().url("Invalid tracking URL").optional(),
  }),
  params: z.object({
    id: mongoIdSchema,
  }),
});

// Generic ID param schema
export const idParamSchema = z.object({
  params: z.object({
    id: mongoIdSchema,
  }),
});

// Schema for validateParams middleware (just the ID)
export const idParamOnlySchema = z.object({
  id: mongoIdSchema,
});

// Query schemas
export const vendorQuerySchema = z.object({
  query: paginationSchema.extend({
    businessName: z.string().optional(),
    email: z.string().optional(),
    status: z.enum(["all", "active", "inactive", "pending"]).optional(),
  }),
});

export const productQuerySchema = z.object({
  query: paginationSchema.extend({
    name: z.string().optional(),
    category: z.string().optional(),
    minPrice: z
      .string()
      .optional()
      .transform((val) => (val ? parseFloat(val) : undefined)),
    maxPrice: z
      .string()
      .optional()
      .transform((val) => (val ? parseFloat(val) : undefined)),
    inStock: z
      .string()
      .optional()
      .transform((val) => val === "true"),
    status: z
      .enum(["all", "active", "inactive", "draft", "out_of_stock"])
      .optional(),
    vendorId: z.string().optional(),
  }),
});

export const orderQuerySchema = z.object({
  query: paginationSchema.extend({
    status: z
      .enum(["pending", "processing", "shipped", "delivered", "cancelled"])
      .optional(),
    customer: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

// Category schemas
export const createCategorySchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, "Category name must be at least 2 characters")
      .max(50, "Category name must be less than 50 characters"),
    description: z
      .string()
      .max(500, "Description must be less than 500 characters")
      .optional(),
    vendorId: mongoIdSchema.optional(), // Only for superadmin
  }),
});

export const updateCategorySchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, "Category name must be at least 2 characters")
      .max(50, "Category name must be less than 50 characters")
      .optional(),
    description: z
      .string()
      .max(500, "Description must be less than 500 characters")
      .optional(),
  }),
  params: z.object({
    id: mongoIdSchema,
  }),
});

// Notification schemas
export const createNotificationSchema = z.object({
  body: z.object({
    userId: mongoIdSchema,
    type: z.enum([
      "low_stock",
      "new_order",
      "order_status_update",
      "product_approved",
      "product_rejected",
      "commission_payment",
      "system_maintenance",
      "account_update",
      "cubic_volume_alert",
      "general",
    ]),
    title: z
      .string()
      .min(1, "Title is required")
      .max(200, "Title must be less than 200 characters"),
    message: z
      .string()
      .min(1, "Message is required")
      .max(1000, "Message must be less than 1000 characters"),
    metadata: z.record(z.any()).optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
    category: z.enum(["product", "order", "system", "account", "commission"]),
    actionUrl: z
      .string()
      .max(500, "Action URL must be less than 500 characters")
      .optional(),
    expiresAt: z.string().datetime().optional(),
  }),
});

export const updateNotificationSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(200, "Title must be less than 200 characters")
      .optional(),
    message: z
      .string()
      .min(1, "Message is required")
      .max(1000, "Message must be less than 1000 characters")
      .optional(),
    metadata: z.record(z.any()).optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
    actionUrl: z
      .string()
      .max(500, "Action URL must be less than 500 characters")
      .optional(),
    expiresAt: z.string().datetime().optional(),
  }),
  params: z.object({
    id: mongoIdSchema,
  }),
});

export const notificationQuerySchema = z.object({
  query: paginationSchema.extend({
    type: z
      .enum([
        "low_stock",
        "new_order",
        "order_status_update",
        "product_approved",
        "product_rejected",
        "commission_payment",
        "system_maintenance",
        "account_update",
        "cubic_volume_alert",
        "general",
      ])
      .optional(),
    category: z
      .enum(["product", "order", "system", "account", "commission"])
      .optional(),
    isRead: z
      .string()
      .optional()
      .transform((val) => {
        if (val === "true") return true;
        if (val === "false") return false;
        return undefined;
      }),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
    sortBy: z
      .enum(["createdAt", "updatedAt", "title", "priority", "type"])
      .optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
    search: z
      .string()
      .min(1, "Search query must be at least 1 character")
      .max(100, "Search query must be less than 100 characters")
      .optional(),
    startDate: z
      .string()
      .datetime({ message: "Start date must be a valid ISO 8601 date" })
      .optional(),
    endDate: z
      .string()
      .datetime({ message: "End date must be a valid ISO 8601 date" })
      .optional(),
  }),
});

// Schema for validateQuery middleware (just the query parameters)
export const notificationQueryOnlySchema = paginationSchema.extend({
  type: z
    .enum([
      "low_stock",
      "new_order",
      "order_status_update",
      "product_approved",
      "product_rejected",
      "commission_payment",
      "system_maintenance",
      "account_update",
      "cubic_volume_alert",
      "general",
    ])
    .optional(),
  category: z
    .enum(["product", "order", "system", "account", "commission"])
    .optional(),
  isRead: z
    .string()
    .optional()
    .transform((val) => {
      if (val === "true") return true;
      if (val === "false") return false;
      return undefined;
    }),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  sortBy: z
    .enum(["createdAt", "updatedAt", "title", "priority", "type"])
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  search: z
    .string()
    .min(1, "Search query must be at least 1 character")
    .max(100, "Search query must be less than 100 characters")
    .optional(),
  startDate: z
    .string()
    .datetime({ message: "Start date must be a valid ISO 8601 date" })
    .optional(),
  endDate: z
    .string()
    .datetime({ message: "End date must be a valid ISO 8601 date" })
    .optional(),
});

export const bulkNotificationSchema = z.object({
  body: z.object({
    action: z.enum(["mark_read", "mark_unread", "delete"]),
    notificationIds: z.array(mongoIdSchema).optional(),
    filters: z
      .object({
        type: z
          .enum([
            "low_stock",
            "new_order",
            "order_status_update",
            "product_approved",
            "product_rejected",
            "commission_payment",
            "system_maintenance",
            "account_update",
            "cubic_volume_alert",
            "general",
          ])
          .optional(),
        category: z
          .enum(["product", "order", "system", "account", "commission"])
          .optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        isRead: z.boolean().optional(),
      })
      .optional(),
  }),
});
