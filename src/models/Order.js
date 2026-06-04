const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
      minlength: [2, "Customer name must be at least 2 characters"],
    },
    productName: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      minlength: [2, "Product name must be at least 2 characters"],
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "shipped", "delivered"],
        message: "Status must be pending, shipped, or delivered",
      },
      default: "pending",
    },
  },
  {
    // Mongoose adds createdAt and updatedAt automatically
    timestamps: true,
  }
);

module.exports = mongoose.model("Order", orderSchema);
