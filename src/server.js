require("dotenv").config();
const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");
const { initSocket } = require("./sockets/socket");
const { startChangeStream } = require("./services/changeStreamService");
const logger = require("./utils/logger");

const PORT = process.env.PORT || 3000;

const bootstrap = async () => {
  // 1. Connect to MongoDB (required before Change Streams)
  await connectDB();

  // 2. Create HTTP server from Express app
  const httpServer = http.createServer(app);

  // 3. Initialize Socket.IO and get the io instance
  const io = initSocket(httpServer);

  // 4. Start watching the Order collection for changes
  //    Pass io so the service can broadcast events to clients
  startChangeStream(io);

  // 5. Start listening
  httpServer.listen(PORT, () => {
    logger.success(`Server running on http://localhost:${PORT}`);
    logger.info(`Frontend: http://localhost:${PORT}`);
    logger.info(`API Base: http://localhost:${PORT}/api/orders`);
  });
};

bootstrap().catch((err) => {
  logger.error(`Startup failed: ${err.message}`);
  process.exit(1);
});
