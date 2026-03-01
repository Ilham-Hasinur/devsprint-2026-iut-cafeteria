import './style.css'

// =============================
// CONFIG
// =============================

const API_BASE = "http://localhost:5000"

// =============================
// DOM REFERENCES
// =============================

const html = document.documentElement

const landingView = document.getElementById("landingView")
const appView = document.getElementById("appView")
const enterApp = document.getElementById("enterApp")
const themeToggle = document.getElementById("themeToggle")

const navLogin = document.getElementById("navLogin")
const navStudent = document.getElementById("navStudent")
const navAdmin = document.getElementById("navAdmin")

const loginSection = document.getElementById("loginSection")
const studentSection = document.getElementById("studentSection")
const adminSection = document.getElementById("adminSection")

const loginBtn = document.getElementById("loginBtn")
const logoutBtn = document.getElementById("logoutBtn")
const studentIdInput = document.getElementById("studentId")
const studentPasswordInput = document.getElementById("studentPassword")

const newStudentUsername = document.getElementById("newStudentUsername")
const newStudentPassword = document.getElementById("newStudentPassword")
const createStudentBtn = document.getElementById("createStudentBtn")

const orderBtn = document.getElementById("orderBtn")
const stockDisplay = document.getElementById("stockSetA")

const metricOrders = document.getElementById("metricOrders")
const metricFailures = document.getElementById("metricFailures")
const metricLatency = document.getElementById("metricLatency")
const adminOrdersContainer = document.getElementById("adminOrdersContainer")
const adminOrdersList = document.getElementById("adminOrdersList")

const orderStatus = document.getElementById("orderStatus")
const statusPending = document.getElementById("statusPending")
const statusStock = document.getElementById("statusStock")
const statusKitchen = document.getElementById("statusKitchen")
const statusReady = document.getElementById("statusReady")

const adminStockInput = document.getElementById("adminStockInput")
const updateStockBtn = document.getElementById("updateStockBtn")
const chaosToggle = document.getElementById("chaosToggle")
const studentOrdersList = document.getElementById("studentOrdersList")
const serviceCards = document.querySelectorAll(".service-card")

// =============================
// ACTIVITY LOG
// =============================

function addLog(message, type = "info") {

  const logContainer = document.getElementById("activityLog")
  if (!logContainer) return

  const entry = document.createElement("div")

  const time = new Date().toLocaleTimeString()

  let color = "text-gray-400"

  if (type === "success") color = "text-green-500"
  if (type === "error") color = "text-red-500"
  if (type === "warning") color = "text-yellow-500"

  entry.className = `${color}`
  entry.textContent = `[${time}] ${message}`

  logContainer.prepend(entry)
}


// =============================
// POLLING CONTROL
// =============================

let adminPollingInterval = null
let studentPollingInterval = null

// =============================
// THEME
// =============================

if (localStorage.getItem("theme") === "dark") {
  html.classList.add("dark")
}

themeToggle?.addEventListener("click", () => {
  html.classList.toggle("dark")
  localStorage.setItem(
    "theme",
    html.classList.contains("dark") ? "dark" : "light"
  )
})

// =============================
// LANDING
// =============================

enterApp?.addEventListener("click", () => {
  landingView.classList.add("opacity-0")
  setTimeout(() => {
    landingView.classList.add("hidden")
    appView.classList.remove("hidden")
  }, 700)
})

// =============================
// AUTH HELPERS
// =============================

function isAuthenticated() {
  return localStorage.getItem("token") !== null
}

function getUserRole() {
  return localStorage.getItem("role")
}

function logout() {
  localStorage.removeItem("token")
  localStorage.removeItem("role")
  logoutBtn.classList.add("hidden")
  hideAllSections()
  loginSection.classList.remove("hidden")
}

// =============================
// NAVIGATION
// =============================

function hideAllSections() {
  stopAdminPolling()
  stopStudentPolling()

  loginSection.classList.add("hidden")
  studentSection.classList.add("hidden")
  adminSection.classList.add("hidden")
}

navLogin?.addEventListener("click", () => {
  hideAllSections()
  loginSection.classList.remove("hidden")
})

navStudent?.addEventListener("click", () => {
  if (!isAuthenticated()) return alert("Login required")

  hideAllSections()
  studentSection.classList.remove("hidden")

  loadStock()
  loadStudentOrders()
  startStudentPolling()
})

navAdmin?.addEventListener("click", () => {
  if (!isAuthenticated()) return alert("Login required")
  if (getUserRole() !== "admin") return alert("Admin only")

  hideAllSections()
  adminSection.classList.remove("hidden")

  startAdminPolling()
  loadServices() // 👈 ADD THIS
})

// =============================
// LOGIN
// =============================

loginBtn?.addEventListener("click", async () => {

  const username = studentIdInput.value
  const password = studentPasswordInput.value

  if (!username || !password) {
    alert("Enter credentials")
    return
  }

  try {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    })

    const data = await res.json()

    if (!res.ok) {
      alert(data.message)
      return
    }

    localStorage.setItem("token", data.token)
    localStorage.setItem("role", data.role)

    logoutBtn.classList.remove("hidden")
    hideAllSections()

    if (data.role === "admin") {
      adminSection.classList.remove("hidden")
      loadAdminMetrics()
    } else {
      studentSection.classList.remove("hidden")
      loadStock()
    }

  } catch {
    alert("Server not reachable")
  }

})

logoutBtn?.addEventListener("click", logout)

// =============================
// STOCK
// =============================

async function loadStock() {
  try {
    const res = await fetch(`${API_BASE}/api/stock`)
    const data = await res.json()

    const stock = data.setA
    stockDisplay.textContent = stock

    // Reset styles
    stockDisplay.classList.remove("text-red-600", "text-yellow-500")

    if (stock === 0) {
      stockDisplay.classList.add("text-red-600")
      orderBtn.disabled = true
      orderBtn.classList.add("opacity-50", "cursor-not-allowed")
      orderBtn.textContent = "Out of Stock"
    }
    else {
      orderBtn.disabled = false
      orderBtn.classList.remove("opacity-50", "cursor-not-allowed")
      orderBtn.textContent = "Place Order"

      if (stock <= 3) {
        stockDisplay.classList.add("text-yellow-500")
      }
    }

  } catch {
    console.log("Stock fetch failed")
  }
}

async function loadStudentOrders() {
  const token = localStorage.getItem("token")
  if (!token) return

  try {
    const res = await fetch(`${API_BASE}/api/orders`, {
      headers: {
        "Authorization": "Bearer " + token
      }
    })

    const data = await res.json()

    if (!res.ok) return

    renderStudentOrders(data)

  } catch {
    console.log("Failed to load student orders")
  }
}

function renderStudentOrders(orders) {

  if (!studentOrdersList) return

  studentOrdersList.innerHTML = ""

  if (orders.length === 0) {
    studentOrdersList.innerHTML =
      `<p class="text-gray-500">No orders yet</p>`
    return
  }

  orders.slice().reverse().forEach(order => {

    const div = document.createElement("div")

    div.className =
      "p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"

    let statusColor = "text-gray-500"

    if (order.status === "Ready")
      statusColor = "text-green-600"

    if (order.status === "Cancelled")
      statusColor = "text-red-600"

    div.innerHTML = `
      <p class="font-medium">Order #${order.id}</p>
      <p class="text-sm ${statusColor}">Status: ${order.status}</p>
    `

    studentOrdersList.appendChild(div)
  })

  if (orders.length > 0) {
    const latestOrder = orders[orders.length - 1]
    updateTimelineFromStatus(latestOrder.status)
  }

  enforce24HourCooldown(orders)
}

// =============================
// 24 HOUR COOLDOWN CHECK
// =============================

function enforce24HourCooldown(orders) {

  if (!orders || orders.length === 0) return

  const latest = orders
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)[0]

  const now = Date.now()
  const diff = now - latest.createdAt
  const hours24 = 24 * 60 * 60 * 1000

  if (diff < hours24) {

    const remaining = hours24 - diff

    const hours = Math.floor(remaining / (1000 * 60 * 60))
    const minutes = Math.floor(
      (remaining % (1000 * 60 * 60)) / (1000 * 60)
    )

    orderBtn.disabled = true
    orderBtn.classList.add("opacity-50", "cursor-not-allowed")
    orderBtn.textContent = `Available in ${hours}h ${minutes}m`

  } else {

    orderBtn.disabled = false
    orderBtn.classList.remove("opacity-50", "cursor-not-allowed")
    orderBtn.textContent = "Place Order"
  }
}

function updateTimelineFromStatus(status) {

  resetStatuses()
  orderStatus.classList.remove("hidden")

  if (status === "Pending") {
    activate(statusPending)
  }

  if (status === "Stock Verified") {
    activate(statusPending)
    activate(statusStock)
  }

  if (status === "In Kitchen") {
    activate(statusPending)
    activate(statusStock)
    activate(statusKitchen)
  }

  if (status === "Ready") {
    activate(statusPending)
    activate(statusStock)
    activate(statusKitchen)
    activate(statusReady)
  }

  if (status === "Cancelled") {
    resetStatuses()
  }
}

async function loadServices() {

  const token = localStorage.getItem("token")

  const res = await fetch(`${API_BASE}/api/admin/services`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  })

  const services = await res.json()

  serviceCards.forEach(card => {

    card.addEventListener("click", async () => {

      const serviceName = card.dataset.service
      const token = localStorage.getItem("token")

      await fetch(`${API_BASE}/api/admin/services/toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ serviceName })
      })

      loadServices()
      loadAdminMetrics()
    })
  })
}

async function updateStockAdmin() {
  const token = localStorage.getItem("token")
  const newStock = parseInt(adminStockInput.value)

  if (isNaN(newStock)) {
    alert("Enter valid number")
    return
  }

  try {
    const res = await fetch(`${API_BASE}/api/admin/stock`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ setA: newStock })
    })

    const data = await res.json()

    if (!res.ok) {
      alert(data.message)
      return
    }

      alert("Stock updated")
      addLog(`Stock updated to ${newStock}`, "success")
      loadStock()

  } catch {
    alert("Server not reachable")
  }
}

updateStockBtn?.addEventListener("click", updateStockAdmin)

async function triggerChaos() {

  const token = localStorage.getItem("token")

  try {
    const res = await fetch(`${API_BASE}/api/admin/chaos`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })

    const data = await res.json()
    

    if (!res.ok) {
      alert(data.message)
      return
    }

    animateChaos(data.services)

    loadAdminMetrics()
    loadAdminOrders()

  } catch {
    alert("Chaos failed")
  }
}

chaosBtn?.addEventListener("click", triggerChaos)

// =============================
// ORDER
// =============================

orderBtn?.addEventListener("click", async () => {

  const token = localStorage.getItem("token")
  if (!token) return alert("Login required")

  // Immediately lock button to prevent multi-click
  orderBtn.disabled = true
  orderBtn.classList.add("opacity-50", "cursor-not-allowed")
  orderBtn.textContent = "Processing..."

  try {
    const res = await fetch(`${API_BASE}/api/order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    })

    const data = await res.json()

    if (!res.ok) {

      // Unlock button because order failed
      orderBtn.disabled = false
      orderBtn.classList.remove("opacity-50", "cursor-not-allowed")
      orderBtn.textContent = "Place Order"

      addLog(`Order failed: ${data.message}`, "error")
      alert(data.message)
      return
    }

    // 🔥 Run timeline animation
    runOrderTimeline()

    // 🔄 Refresh data
    loadStudentOrders()
    loadStock()
    loadAdminMetrics()

    // 📜 Log activity
    addLog("Order placed successfully", "success")

  } catch {
    // Unlock button on network error
    orderBtn.disabled = false
    orderBtn.classList.remove("opacity-50", "cursor-not-allowed")
    orderBtn.textContent = "Place Order"

    addLog("Order request failed — server unreachable", "error")
    alert("Server not reachable")
  }
})

// =============================
// ORDER TIMELINE
// =============================

function resetStatuses() {
  statusPending.className = "text-gray-500"
  statusStock.className = "text-gray-500"
  statusKitchen.className = "text-gray-500"
  statusReady.className = "text-gray-500"
}

function activate(el) {
  el.className = "text-green-600 font-semibold"
}

function runOrderTimeline() {
  resetStatuses()
  orderStatus.classList.remove("hidden")

  activate(statusPending)
  setTimeout(() => activate(statusStock), 1000)
  setTimeout(() => activate(statusKitchen), 2000)
  setTimeout(() => activate(statusReady), 4000)
}

// =============================
// ADMIN METRICS
// =============================

async function loadAdminMetrics() {

  try {
    const res = await fetch(`${API_BASE}/api/admin/metrics`, {
      headers: {
        "Authorization": "Bearer " + localStorage.getItem("token")
      }
    })

    const data = await res.json()

    if (!res.ok) {
      console.log(data.message)
      return
    }

    // Backend already sends avgLatency
    metricOrders.textContent = data.totalOrders
    metricFailures.textContent = data.failures
    metricLatency.textContent = data.avgLatency

  } catch {
    console.log("Metrics fetch failed")
  }
}

async function loadAdminOrders() {

  try {
    const res = await fetch(`${API_BASE}/api/admin/orders`, {
      headers: {
        "Authorization": "Bearer " + localStorage.getItem("token")
      }
    })

    const orders = await res.json()

    if (!res.ok) return

    renderAdminOrders(orders)

  } catch {
    console.log("Admin orders fetch failed")
  }
}


// =============================
// ADMIN ORDERS RENDER
// =============================

function renderAdminOrders(orders) {

  if (!adminOrdersList) return

  adminOrdersList.innerHTML = ""

  if (!orders || orders.length === 0) {
    adminOrdersList.innerHTML =
      `<div class="text-gray-500">No orders yet</div>`
    return
  }

  // Newest first
  const sorted = [...orders].sort(
    (a, b) => b.createdAt - a.createdAt
  )

  sorted.forEach(order => {

    const div = document.createElement("div")

    let statusColor = "text-gray-500"

    if (order.status === "Ready")
      statusColor = "text-green-600"

    if (order.status === "In Kitchen")
      statusColor = "text-yellow-500"

    if (order.status === "Stock Verified")
      statusColor = "text-blue-500"

    if (order.status === "Cancelled")
      statusColor = "text-red-600"

    const time = new Date(order.createdAt)
      .toLocaleTimeString()

    div.className =
      "p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"

    div.innerHTML = `
      <div class="text-sm text-gray-400">Order ID: ${order.id}</div>
      <div class="text-sm">User ID: ${order.userId}</div>
      <div class="${statusColor} font-semibold">
        Status: ${order.status}
      </div>
      <div class="text-xs text-gray-400">
        Created: ${time}
      </div>
    `

    // Add cancel button if allowed
    if (order.status !== "Ready" && order.status !== "Cancelled") {

      const btn = document.createElement("button")

      btn.textContent = "Cancel"
      btn.className =
        "mt-3 px-3 py-1 text-xs rounded bg-red-600 hover:bg-red-700 text-white"

      btn.onclick = () => cancelAdminOrder(order.id)

      div.appendChild(btn)
    }

    adminOrdersList.appendChild(div)
  })
}

function animateChaos(servicesState) {

  const serviceCards = document.querySelectorAll(".service-card")

  serviceCards.forEach(card => {

    const name = card.dataset.service
    const statusText = card.querySelector(".service-status")

    const isHealthy = servicesState[name]

    card.classList.add("animate-pulse")
    setTimeout(() => {
      card.classList.remove("animate-pulse")
    }, 800)

    if (isHealthy) {
      statusText.textContent = "Healthy"
      statusText.className = "service-status text-green-600"
      addLog(`${name} recovered`, "success")
    } else {
      statusText.textContent = "Down"
      statusText.className = "service-status text-red-600"
      addLog(`${name} service DOWN`, "error")
    }
  })
}

async function cancelAdminOrder(orderId) {

  const token = localStorage.getItem("token")
  if (!token) return alert("Login required")

  try {
    const res = await fetch(`${API_BASE}/api/admin/orders/${orderId}/cancel`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })

    const data = await res.json()

    if (!res.ok) {
      alert(data.message)
      return
    }

    loadAdminOrders()
    loadAdminMetrics()
    loadStock()

  } catch {
    alert("Cancel failed")
  }
}

window.cancelOrder = async function(orderId) {

  const token = localStorage.getItem("token")

  try {
    const res = await fetch(`${API_BASE}/api/admin/orders/${orderId}/cancel`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })

    const data = await res.json()

    if (!res.ok) {
      alert(data.message)
      return
    }

    loadAdminOrders()
    loadAdminMetrics()
    loadStock()

  } catch {
    alert("Cancel failed")
  }
}

async function createStudentAdmin() {

  const token = localStorage.getItem("token")

  const username = newStudentUsername.value
  const password = newStudentPassword.value

  if (!username || !password) {
    alert("Enter student credentials")
    return
  }

  try {
    const res = await fetch(`${API_BASE}/api/admin/create-student`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ username, password })
    })

    const data = await res.json()

    if (!res.ok) {
      alert(data.message)
      return
    }

    alert("Student created successfully")

    newStudentUsername.value = ""
    newStudentPassword.value = ""

  } catch {
    alert("Server not reachable")
  }
}

createStudentBtn?.addEventListener("click", createStudentAdmin)


function startStudentPolling() {
  if (studentPollingInterval) return

  studentPollingInterval = setInterval(() => {
    loadStudentOrders()
    loadStock()
  }, 5000)
}

function stopStudentPolling() {
  if (studentPollingInterval) {
    clearInterval(studentPollingInterval)
    studentPollingInterval = null
  }
}



// =============================
// ADMIN AUTO REFRESH (POLLING)
// =============================

function startAdminPolling() {
  if (adminPollingInterval) return

  adminPollingInterval = setInterval(() => {
    loadAdminMetrics()
    loadAdminOrders()
  }, 5000)
}

function stopAdminPolling() {

  if (adminPollingInterval !== null) {
    clearInterval(adminPollingInterval)
    adminPollingInterval = null
    console.log("Admin polling stopped")
  }

}

// =============================
// AUTO RESTORE SESSION
// =============================

if (isAuthenticated()) {
  logoutBtn.classList.remove("hidden")
  hideAllSections()

  if (getUserRole() === "admin") {
  adminSection.classList.remove("hidden")
  startAdminPolling()
} else {
    studentSection.classList.remove("hidden")
    loadStock()
    loadStudentOrders()
    startStudentPolling()
  }
}