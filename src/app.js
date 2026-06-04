const express = require("express");
const path = require("path");
const requestLogger = require("./middleware/requestLogger");
const errorHandler = require("./middleware/errorHandler");
const orderRoutes = require("./routes/orderRoutes");

const app = express();

// Parse JSON bodies
app.use(express.json());

// Serve the frontend from /public
app.use(express.static(path.join(__dirname, "../public")));

// Log every incoming HTTP request
app.use(requestLogger);

// API routes
app.use("/api/orders", orderRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// Fallback: serve index.html for any unknown route
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Centralized error handler (must be last)
app.use(errorHandler);

module.exports = app;
