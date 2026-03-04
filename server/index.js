import express from "express"
import cors from "cors"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import { Low } from "lowdb"
import { JSONFile } from "lowdb/node"
import { registerStockRoutes } from "./services/stock.js"
import express from "express"
import cors from "cors"

// =============================
// CONFIG
// =============================

const app = express()

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}))

app.use(express.json())



// Use Render's assigned port in production
const PORT = process.env.PORT || 5000

// Use environment variable for secret (secure for deployment)
const SECRET = process.env.JWT_SECRET || "super-secret-key"

// =============================
// MIDDLEWARE
// =============================

app.use(cors())
app.use(express.json())

// =============================
// LOGIN RATE LIMITER
// =============================

const loginAttempts = {}
const MAX_ATTEMPTS = 5
const WINDOW_MS = 60 * 1000


// ---------- DATABASE ----------

const adapter = new JSONFile("db.json")

const defaultData = {
  users: [],
  orders: [],
  metrics: {
    totalOrders: 0,
    failures: 0,
    totalLatency: 0
  },
  stock: {
    setA: 5
  },
  services: {
    identity: true,
    gateway: true,
    stock: true,
    kitchen: true,
    notification: true
  }
}

const db = new Low(adapter, defaultData)

await db.read()

registerStockRoutes(app, db)

// =============================
// SERVICE ROUTES
// =============================

app.get("/api/admin/services", authMiddleware, adminOnly, async (req, res) => {
  await db.read()
  res.json(db.data.services)
})

app.post("/api/admin/services/toggle", authMiddleware, adminOnly, async (req, res) => {

  const { serviceName } = req.body

  if (!serviceName || !(serviceName in db.data.services)) {
    return res.status(400).json({ message: "Invalid service name" })
  }

  await db.read()

  db.data.services[serviceName] = !db.data.services[serviceName]

  await db.write()

  // CHECK SERVICE HEALTH
if (!db.data.services.gateway) {
  db.data.metrics.failures++
  await db.write()
  return res.status(503).json({ message: "Gateway service down" })
}

if (!db.data.services.stock) {
  db.data.metrics.failures++
  await db.write()
  return res.status(503).json({ message: "Stock service down" })
}

if (!db.data.services.kitchen) {
  db.data.metrics.failures++
  await db.write()
  return res.status(503).json({ message: "Kitchen service down" })
}

  res.json({
    message: `${serviceName} toggled`,
    services: db.data.services
  })
})

if (!db.data.users.length) {

  db.data.users.push(
    {
      id: 1,
      username: "admin",
      password: await bcrypt.hash("admin123", 10),
      role: "admin"
    },
    {
      id: 2,
      username: "hossainaljaber",
      password: await bcrypt.hash("pass123", 10),
      role: "student"
    },
    {
      id: 3,
      username: "sabrinamaimon",
      password: await bcrypt.hash("pass345", 10),
      role: "student"
    },
    {
      id: 4,
      username: "john_doe",
      password: await bcrypt.hash("pass567", 10),
      role: "student"
    },
    {
      id: 5,
      username: "ilhamhasinur",
      password: await bcrypt.hash("pass789", 10),
      role: "student"
    },
    {
      id: 6,
      username: "jane_doe",
      password: await bcrypt.hash("pass912", 10),
      role: "student"
    }
  )

}

await db.write()

// =============================
// AUTH MIDDLEWARE
// =============================

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader)
    return res.status(401).json({ message: "No token provided" })

  const token = authHeader.split(" ")[1]

  try {
    const decoded = jwt.verify(token, SECRET)
    req.user = decoded
    next()
  } catch {
    return res.status(403).json({ message: "Invalid token" })
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Admin only" })

  next()
}

// =============================
// ROUTES
// =============================

// Health check
app.get("/", (req, res) => {
  res.send("🚀 IUT Cafeteria API Running")
})

// -----------------------------
// LOGIN
// -----------------------------

app.post("/api/login", async (req, res) => {

  const { username, password } = req.body

  if (!username || !password)
    return res.status(400).json({ message: "Missing credentials" })

  const now = Date.now()

  // Initialize if first attempt
  if (!loginAttempts[username]) {
    loginAttempts[username] = []
  }

  // Remove expired attempts
  loginAttempts[username] =
    loginAttempts[username].filter(
      ts => now - ts < WINDOW_MS
    )

  if (loginAttempts[username].length >= MAX_ATTEMPTS) {
    return res.status(429).json({
      message: "Too many login attempts. Try again later."
    })
  }

  await db.read()

  const user = db.data.users.find(u => u.username === username)

  if (!user) {
    loginAttempts[username].push(now)
    return res.status(400).json({ message: "User not found" })
  }

  const valid = await bcrypt.compare(password, user.password)

  if (!valid) {
    loginAttempts[username].push(now)
    return res.status(400).json({ message: "Incorrect password" })
  }

  // Reset attempts on success
  loginAttempts[username] = []

  const token = jwt.sign(
    { id: user.id, role: user.role },
    SECRET,
    { expiresIn: "2h" }
  )

  res.json({
    token,
    role: user.role
  })
})

// -----------------------------
// ADMIN CREATE STUDENT
// -----------------------------

app.post("/api/admin/create-student", authMiddleware, adminOnly, async (req, res) => {

  const { username, password } = req.body

  if (!username || !password)
    return res.status(400).json({ message: "Missing credentials" })

  await db.read()

  const existing = db.data.users.find(u => u.username === username)

  if (existing)
    return res.status(400).json({ message: "User already exists" })

  const hashed = await bcrypt.hash(password, 10)

  const newStudent = {
    id: Date.now(),
    username,
    password: hashed,
    role: "student"
  }

  db.data.users.push(newStudent)

  await db.write()

  res.json({ message: "Student created successfully" })
})

// -----------------------------
// PLACE ORDER
// -----------------------------

app.post("/api/order", authMiddleware, async (req, res) => {
  await db.read()

  // 24 Hour Order Restriction
const now = Date.now()

const lastOrder = db.data.orders
  .filter(o => o.userId === req.user.id)
  .sort((a, b) => b.createdAt - a.createdAt)[0]

if (lastOrder) {
  const diff = now - lastOrder.createdAt
  const hours24 = 24 * 60 * 60 * 1000

  if (diff < hours24) {
    return res.status(403).json({
      message: "You can only place one order every 24 hours"
    })
  }
}

  if (db.data.stock.setA <= 0) {
    db.data.metrics.failures++
    await db.write()
    return res.status(400).json({ message: "Out of stock" })
  }

  const newOrder = {
    id: Date.now(),
    userId: req.user.id,
    status: "Pending",
    createdAt: Date.now()
  }

  db.data.stock.setA--
  db.data.orders.push(newOrder)
  db.data.metrics.totalOrders++

  await db.write()

  // 🔥 Order lifecycle simulation
  simulateOrderLifecycle(newOrder.id)

  res.json({ message: "Order placed", orderId: newOrder.id })
})

// -----------------------------
// ADMIN METRICS
// -----------------------------

app.get("/api/admin/metrics", authMiddleware, adminOnly, async (req, res) => {
  await db.read()

  const { totalOrders, failures, totalLatency } = db.data.metrics

  const avgLatency =
    totalOrders === 0
      ? 0
      : Math.round(totalLatency / totalOrders)

  res.json({
    totalOrders,
    failures,
    avgLatency
  })
})

// =============================
// ADMIN ORDERS ROUTE
// =============================

app.get("/api/admin/orders", authMiddleware, adminOnly, async (req, res) => {
  await db.read()
  res.json(db.data.orders)
})

// =============================
// ORDERS ROUTES
// =============================

app.get("/api/orders", authMiddleware, async (req, res) => {
  await db.read()

  const userOrders = db.data.orders.filter(
    o => o.userId === req.user.id
  )

  res.json(userOrders)
})

// =============================
// ADMIN CANCEL ORDER
// =============================

app.post("/api/admin/orders/:id/cancel", authMiddleware, adminOnly, async (req, res) => {

  await db.read()

  const order = db.data.orders.find(o => o.id == req.params.id)

  if (!order) {
    return res.status(404).json({ message: "Order not found" })
  }

  if (order.status === "Ready") {
    return res.status(400).json({ message: "Cannot cancel completed order" })
  }

  if (order.status === "Cancelled") {
    return res.status(400).json({ message: "Order already cancelled" })
  }

  order.status = "Cancelled"

  // Restore stock
  db.data.stock.setA++

  // Increase failure metric
  db.data.metrics.failures++

  await db.write()

  res.json({ message: "Order cancelled successfully" })
})

// -----------------------------
// ADMIN CHAOS SIMULATION
// -----------------------------

app.post("/api/admin/chaos", authMiddleware, adminOnly, async (req, res) => {

  await db.read()

  const updatedServices = {}

  Object.keys(db.data.services).forEach(service => {

    // 50% chance service fails
    const isHealthy = Math.random() >= 0.5

    db.data.services[service] = isHealthy
    updatedServices[service] = isHealthy

    if (!isHealthy) {
      db.data.metrics.failures++
    }
  })

  await db.write()

  res.json({
    message: "Chaos executed",
    services: updatedServices
  })
})

// -----------------------------
// STOCK
// -----------------------------

app.get("/api/stock", async (req, res) => {
  await db.read()
  res.json(db.data.stock)
})

// -----------------------------
// ADMIN UPDATE STOCK
// -----------------------------

app.post("/api/admin/stock", authMiddleware, adminOnly, async (req, res) => {

  const { setA } = req.body

  if (typeof setA !== "number" || setA < 0) {
    return res.status(400).json({ message: "Invalid stock value" })
  }

  await db.read()

  db.data.stock.setA = setA

  await db.write()

  res.json({ message: "Stock updated successfully" })
})

// =============================
// ORDER LIFECYCLE ENGINE
// =============================

async function simulateOrderLifecycle(orderId) {

  const updateStatus = async (status) => {
    await db.read()
    const order = db.data.orders.find(o => o.id === orderId)
    if (!order) return

    order.status = status

    // If final stage → calculate latency
    if (status === "Ready") {
      const latency = Date.now() - order.createdAt
      db.data.metrics.totalLatency += latency
    }

    await db.write()
  }

  setTimeout(() => updateStatus("Stock Verified"), 3000)
  setTimeout(() => updateStatus("In Kitchen"), 6000)
  setTimeout(() => updateStatus("Ready"), 9000)
}

// =============================
// START SERVER
// =============================

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`)
})