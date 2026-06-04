# Order Stream — Real-Time DB Update System

A production-ready backend service that pushes MongoDB database changes to connected clients in real time using **Change Streams** and **Socket.IO** — without any polling.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│   Browser (Socket.IO client) │  curl / Postman / REST client   │
└────────────────┬─────────────────────────┬──────────────────────┘
                 │ WebSocket (Socket.IO)   │ HTTP REST API
┌────────────────▼─────────────────────────▼──────────────────────┐
│                    NODE.JS / EXPRESS SERVER                      │
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────────────────────┐   │
│  │   REST API        │    │        Socket.IO Server          │   │
│  │  POST /orders     │    │  - connection / disconnect       │   │
│  │  GET  /orders     │    │  - emits "orderChange" events    │   │
│  │  PUT  /orders/:id │    └──────────────┬───────────────────┘   │
│  │  DEL  /orders/:id │                   │ io.emit()             │
│  └────────┬──────────┘                   │                       │
│           │ mongoose CRUD         ┌──────▼──────────────────┐   │
│           │                       │  Change Stream Service   │   │
│           │                       │  - watches Order model   │   │
│           │                       │  - transforms payload    │   │
│           │                       │  - broadcasts to clients │   │
└───────────┼───────────────────────┼──────────────────────────┘   
            │                       │                               
┌───────────▼───────────────────────▼──────────────────────────────┐
│                    MONGODB ATLAS (Replica Set)                    │
│                                                                  │
│   orders collection ──► oplog ──► Change Stream events          │
└──────────────────────────────────────────────────────────────────┘
```

**Key design decision:** Controllers never call `io.emit()` directly. All client notifications flow exclusively through the Change Stream. This means even direct database writes (from Atlas UI, scripts, migrations) will automatically notify clients — the system is source-agnostic.

---

## Why Change Streams Instead of Polling?

| Concern | Polling | Change Streams |
|---|---|---|
| Latency | Up to poll interval (e.g. 5s) | Milliseconds |
| Server load | Constant DB queries even when idle | Event-driven, zero idle cost |
| DB load | N queries/sec regardless of changes | Only fires on actual changes |
| Scalability | Degrades with client count | Decoupled — clients don't query DB |
| Missed events | Possible if change between polls | Guaranteed delivery via oplog cursor |
| Architecture | Controllers must emit manually | Single source of truth |

Change Streams tap directly into MongoDB's **oplog** (operation log), the same replication mechanism used internally. They provide a reliable, ordered stream of every write operation.

---

## How Real-Time Updates Work (Step by Step)

```
1. Client opens browser → Socket.IO handshake → persistent WebSocket connection

2. User calls  POST /api/orders  with { customerName, productName, status }

3. Express controller runs  Order.create(...)  — a standard Mongoose insert

4. MongoDB writes the document to disk AND appends to the oplog

5. Change Stream cursor (opened at server startup) detects the oplog entry

6. changeStreamService.js fires its "change" event handler:
      - reads operationType: "insert"
      - reads fullDocument (the new order)
      - builds a clean payload object

7. io.emit("orderChange", payload) broadcasts to ALL connected clients

8. Each client's socket.on("orderChange") handler fires
      - new event card is prepended to the live feed
      - counters update
      - no page refresh needed
```

---

## Project Structure

```
realtime-orders/
├── public/
│   └── index.html              # Browser client — Socket.IO + live feed UI
├── src/
│   ├── config/
│   │   └── db.js               # Mongoose connection
│   ├── controllers/
│   │   └── orderController.js  # CRUD handlers — no socket.emit here
│   ├── middleware/
│   │   ├── errorHandler.js     # Centralized Express error handler
│   │   └── requestLogger.js    # HTTP request logging
│   ├── models/
│   │   └── Order.js            # Mongoose schema & model
│   ├── routes/
│   │   └── orderRoutes.js      # Express router
│   ├── services/
│   │   └── changeStreamService.js  # Core: watches DB, emits to clients
│   ├── sockets/
│   │   └── socket.js           # Socket.IO init & connection lifecycle
│   ├── utils/
│   │   ├── logger.js           # Color-coded console logger
│   │   └── response.js         # Standardised JSON response helpers
│   ├── app.js                  # Express app setup
│   └── server.js               # Entry point: DB → HTTP → Socket → Stream
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## Prerequisites

- Node.js v18+
- A **MongoDB Atlas** account (free tier works fine)
  - Change Streams require a **replica set** — Atlas provides this automatically
  - A local standalone `mongod` will NOT work

---

## MongoDB Atlas Setup

1. Go to [https://cloud.mongodb.com](https://cloud.mongodb.com) and create a free cluster (M0)
2. Under **Security → Database Access**, create a user with read/write permissions
3. Under **Security → Network Access**, add your IP (or `0.0.0.0/0` for development)
4. Click **Connect → Drivers** and copy the connection string:
   ```
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/ordersdb?retryWrites=true&w=majority
   ```

---

## Setup & Installation

```bash
# 1. Clone or download the project
git clone <repo-url>
cd realtime-orders

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env and paste your MongoDB Atlas URI

# 4. Start the server
npm run dev        # development (nodemon)
npm start          # production
```

Open `http://localhost:3000` in your browser — the live dashboard will connect automatically.

---

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `PORT` | HTTP server port | `3000` |
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://...` |

---

## REST API Reference

All endpoints return `{ success, message, data }`.

### Create Order
```http
POST /api/orders
Content-Type: application/json

{
  "customerName": "Alice Johnson",
  "productName": "Wireless Headphones",
  "status": "pending"
}
```
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "_id": "665f1a2b3c4d5e6f7a8b9c0d",
    "customerName": "Alice Johnson",
    "productName": "Wireless Headphones",
    "status": "pending",
    "createdAt": "2024-06-05T10:30:00.000Z",
    "updatedAt": "2024-06-05T10:30:00.000Z"
  }
}
```

### Get All Orders
```http
GET /api/orders
```

### Update Order
```http
PUT /api/orders/:id
Content-Type: application/json

{ "status": "shipped" }
```

### Delete Order
```http
DELETE /api/orders/:id
```

---

## Socket.IO Events

### Client listens for: `orderChange`

**Insert event:**
```json
{
  "operation": "insert",
  "orderId": "665f1a2b3c4d5e6f7a8b9c0d",
  "customerName": "Alice Johnson",
  "productName": "Wireless Headphones",
  "status": "pending",
  "createdAt": "2024-06-05T10:30:00.000Z",
  "timestamp": "2024-06-05T10:30:00.123Z"
}
```

**Update event:**
```json
{
  "operation": "update",
  "orderId": "665f1a2b3c4d5e6f7a8b9c0d",
  "updatedFields": { "status": "shipped" },
  "timestamp": "2024-06-05T10:35:00.456Z"
}
```

**Delete event:**
```json
{
  "operation": "delete",
  "orderId": "665f1a2b3c4d5e6f7a8b9c0d",
  "timestamp": "2024-06-05T10:40:00.789Z"
}
```

---

## Testing the System

### 1. Open the live dashboard
Navigate to `http://localhost:3000` — you should see "Connected" in the top right.

### 2. Trigger events via the UI
Use the sidebar form to create orders and watch them appear in the feed instantly.

### 3. Trigger events via curl

```bash
# Create an order
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customerName":"Bob Smith","productName":"Laptop","status":"pending"}'

# Update status (use the _id from the create response)
curl -X PUT http://localhost:3000/api/orders/<id> \
  -H "Content-Type: application/json" \
  -d '{"status":"shipped"}'

# Delete an order
curl -X DELETE http://localhost:3000/api/orders/<id>
```

### 4. Multi-tab test
Open `http://localhost:3000` in two browser tabs. Trigger a change in one — both update simultaneously.

### 5. Direct Atlas write test
Write directly to the collection in the Atlas UI. The dashboard will still receive the event — proving the system is truly change-stream-driven, not controller-driven.

---

## Scalability Discussion

### Current design (single server)
Works well for moderate load. The Change Stream opens one cursor against MongoDB and fans out to all Socket.IO clients on that process.

### Scaling horizontally (multiple Node.js instances)
When running behind a load balancer, each Node.js instance opens its own Change Stream cursor. Socket.IO needs a shared **adapter** so that an event on instance A reaches clients connected to instance B:

```
Multiple Node.js instances
         │
         ▼
  Redis Pub/Sub (Socket.IO Redis Adapter)
         │
    ┌────┴────┐
  Node 1    Node 2    Node 3
  (CS ✓)   (CS ✓)   (CS ✓)   ← each watches the same Change Stream
```

```bash
# Add to production setup:
npm install @socket.io/redis-adapter ioredis
```

### Further improvements
- **Resume tokens** — persist the Change Stream resume token to Redis/disk so the stream can pick up exactly where it left off after a server restart, with no missed events
- **Room-based broadcasting** — emit only to clients subscribed to a specific order or customer, instead of broadcasting to all
- **Authentication** — JWT validation in the Socket.IO `connection` middleware
- **Message queuing** — route Change Stream events through Kafka/RabbitMQ for guaranteed delivery and replay
- **Rate limiting** — per-client event throttling to prevent flooding slow consumers

---

## Interview Notes

**Q: Why not just emit from the controller?**
The controller only knows about HTTP-triggered changes. Direct DB writes (admin tools, migrations, other services) would be invisible. Change Streams make the notification layer independent of *how* the data changed.

**Q: What if the server restarts mid-stream?**
MongoDB Change Streams support **resume tokens**. Store the last seen token on shutdown, and pass `{ resumeAfter: token }` when reopening the stream. This guarantees zero missed events.

**Q: Why Atlas and not local MongoDB?**
Change Streams require a replica set (they read from the oplog). Atlas provides a 3-node replica set even on the free tier. For local development you can run `mongod --replSet rs0` and initiate it with `rs.initiate()`.

**Q: How does this scale to 10,000 concurrent clients?**
Socket.IO handles WebSocket connections efficiently. The bottleneck is single-process Node.js. Add horizontal scaling with sticky sessions and the Socket.IO Redis adapter. The Change Stream itself scales independently of client count.
