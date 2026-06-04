const Order = require("../models/Order");
const { sendSuccess, sendError } = require("../utils/response");
const logger = require("../utils/logger");

// POST /orders
const createOrder = async (req, res) => {
  try {
    const { customerName, productName, status } = req.body;
    const order = await Order.create({ customerName, productName, status });
    logger.success(`Order created: ${order._id}`);
    sendSuccess(res, order, "Order created successfully", 201);
  } catch (error) {
    // Handle Mongoose validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return sendError(res, messages.join(", "), 400);
    }
    logger.error(`createOrder: ${error.message}`);
    sendError(res, "Failed to create order");
  }
};

// GET /orders
const getOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    sendSuccess(res, orders, "Orders fetched successfully");
  } catch (error) {
    logger.error(`getOrders: ${error.message}`);
    sendError(res, "Failed to fetch orders");
  }
};

// PUT /orders/:id
const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { customerName, productName, status } = req.body;

    const order = await Order.findByIdAndUpdate(
      id,
      { customerName, productName, status },
      { new: true, runValidators: true }
    );

    if (!order) {
      return sendError(res, "Order not found", 404);
    }

    logger.success(`Order updated: ${order._id}`);
    sendSuccess(res, order, "Order updated successfully");
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return sendError(res, messages.join(", "), 400);
    }
    if (error.name === "CastError") {
      return sendError(res, "Invalid order ID", 400);
    }
    logger.error(`updateOrder: ${error.message}`);
    sendError(res, "Failed to update order");
  }
};

// DELETE /orders/:id
const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findByIdAndDelete(id);

    if (!order) {
      return sendError(res, "Order not found", 404);
    }

    logger.success(`Order deleted: ${id}`);
    sendSuccess(res, { id }, "Order deleted successfully");
  } catch (error) {
    if (error.name === "CastError") {
      return sendError(res, "Invalid order ID", 400);
    }
    logger.error(`deleteOrder: ${error.message}`);
    sendError(res, "Failed to delete order");
  }
};

module.exports = { createOrder, getOrders, updateOrder, deleteOrder };
