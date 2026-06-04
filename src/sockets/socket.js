const { Server } = require("socket.io");
const logger = require("../utils/logger");

let io;

/**
 * Initializes Socket.IO on the given HTTP server.
 * Handles connection lifecycle and returns the io instance
 * so it can be passed to the Change Stream service.
 *
 * @param {import("http").Server} httpServer
 * @returns {import("socket.io").Server}
 */
const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "*", // Tighten this to your domain in production
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    logger.socket(`Client connected    — id: ${socket.id} | total: ${io.engine.clientsCount}`);

    socket.on("disconnect", (reason) => {
      logger.socket(`Client disconnected — id: ${socket.id} | reason: ${reason}`);
    });

    socket.on("error", (err) => {
      logger.error(`Socket error on ${socket.id}: ${err.message}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error("Socket.IO not initialized. Call initSocket first.");
  return io;
};

module.exports = { initSocket, getIO };
