import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a category name"],
      trim: true,
      // Removed global unique constraint - uniqueness is enforced per vendor via compound index below
    },
    description: {
      type: String,
      trim: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
  },
  { timestamps: true }
);

// To enforce uniqueness per vendor, a compound index is better
categorySchema.index({ name: 1, vendorId: 1 }, { unique: true });

const Category = mongoose.model("Category", categorySchema);

export default Category;
