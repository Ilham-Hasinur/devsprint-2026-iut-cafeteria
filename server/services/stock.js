// server/services/stock.js

import jwt from "jsonwebtoken"

const SECRET = "super-secret-key"

export function registerStockRoutes(app, db) {

  // =============================
  // GET CURRENT STOCK
  // =============================
  app.get("/stock/current", async (req, res) => {
    await db.read()
    res.json(db.data.stock)
  })

  // =============================
  // DEDUCT STOCK (Internal Use)
  // =============================
  app.post("/stock/deduct", async (req, res) => {
    const { item, quantity } = req.body

    await db.read()

    if (!db.data.stock[item] || db.data.stock[item] < quantity) {
      return res.status(400).json({ message: "Insufficient stock" })
    }

    db.data.stock[item] -= quantity
    await db.write()

    res.json({ message: "Stock deducted" })
  })

  // =============================
  // STOCK HEALTH CHECK
  // =============================
  app.get("/stock/health", (req, res) => {
    res.json({ status: "Stock Service Healthy" })
  })

  // =============================
  // ADMIN UPDATE STOCK
  // =============================
  app.post("/api/admin/stock", async (req, res) => {

    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ message: "No token provided" })
    }

    const token = authHeader.split(" ")[1]

    let decoded
    try {
      decoded = jwt.verify(token, SECRET)
    } catch {
      return res.status(403).json({ message: "Invalid token" })
    }

    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Admin only" })
    }

    const { setA } = req.body

    if (typeof setA !== "number" || setA < 0) {
      return res.status(400).json({ message: "Invalid stock value" })
    }

    await db.read()

    db.data.stock.setA = setA

    await db.write()

    res.json({ message: "Stock updated successfully" })
  })
}