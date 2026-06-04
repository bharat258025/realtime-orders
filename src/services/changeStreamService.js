const Order = require("../models/Order");
const logger = require("../utils/logger");

/**
 * Transforms a raw MongoDB Change Stream event into a clean,
 * client-friendly payload that the frontend can directly consume.
 */
const buildPayload = (changeEvent) => {
  const { operationType, documentKey, fullDocument, updateDescription } = changeEvent;

  const base = {
    operation: operationType,              // insert | update | delete
    orderId: documentKey._id.toString(),
    timestamp: new Date().toISOString(),
  };

  if (operationType === "insert" && fullDocument) {
    return {
      ...base,
      customerName: fullDocument.customerName,
      productName: fullDocument.productName,
      status: fullDocument.status,
      createdAt: fullDocument.createdAt,
      updatedAt: fullDocument.updatedAt,
    };
  }

  if (operationType === "update") {
    return {
      ...base,
      updatedFields: updateDescription?.updatedFields || {},
    };
  }

  // delete only carries the document key
  return base;
};

/**
 * Opens a Change Stream on the Order collection.
 * Any insert/update/delete is captured here and broadcast
 * to all Socket.IO clients — controllers never emit directly.
 *
 * @param {import("socket.io").Server} io - The Socket.IO server instance
 */
const startChangeStream = (io) => {
  // Watch all operations: insert, update, delete
  const pipeline = [
    { $match: { operationType: { $in: ["insert", "update", "delete"] } } },
  ];

  // fullDocument: 'updateLookup' fetches the updated doc for update events
  const changeStream = Order.watch(pipeline, { fullDocument: "updateLookup" });

  changeStream.on("change", (changeEvent) => {
    const payload = buildPayload(changeEvent);
    logger.change(`${payload.operation.toUpperCase()} on order ${payload.orderId}`);

    // Emit to every connected client
    io.emit("orderChange", payload);
  });

  changeStream.on("error", (error) => {
    logger.error(`Change Stream error: ${error.message}`);
    // Attempt to restart after a delay
    setTimeout(() => startChangeStream(io), 5000);
  });

  changeStream.on("close", () => {
    logger.warn("Change Stream closed unexpectedly — restarting in 5s");
    setTimeout(() => startChangeStream(io), 5000);
  });

  logger.info("MongoDB Change Stream watching Order collection");
};

module.exports = { startChangeStream };
