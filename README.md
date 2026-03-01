# IUT Cafeteria Microservice System

## Overview
This project simulates a distributed cafeteria ordering system built for DevSprint 2026.

It includes:
- JWT Authentication
- Order Processing
- Admin Monitoring Dashboard
- Chaos Toggle for service failure simulation
- Metrics Tracking
- Containerized deployment

---

## 🐳 Run with Docker

Make sure Docker Desktop is installed and running.

From the project root:


---

## 🌐 Access the Application

Frontend:
http://localhost:5173

Backend API:
http://localhost:5000

---

## 🧱 Architecture

- Frontend: Vite + TailwindCSS
- Backend: Node.js + Express
- Reverse Proxy: Nginx (inside frontend container)
- Deployment: Docker Compose

---

## 👤 Features

### Student
- Login (JWT token)
- Place order
- Real-time order tracking
- 24-hour restriction rule

### Admin
- Service health dashboard
- Live metrics (orders, failures, latency)
- Chaos toggle (simulate service failure)
- Update stock
- Create student accounts
- Live activity logs

## System Architecture

The system is designed as a containerized microservice-based application.

Components:
- Frontend (Vite + Nginx)
- Backend API (Express)
- JWT Authentication
- Order Processing Module
- Stock Service Logic
- Chaos Simulation Module

Communication:
- Frontend communicates with backend via REST API.
- JWT token validates user sessions.
- Admin dashboard monitors system state.

## Tech Stack

Frontend:
- Vite
- TailwindCSS

Backend:
- Node.js
- Express

Deployment:
- Docker
- Docker Compose

Authentication:
- JWT

AI assistance
- ChatGPT
- GitHub Copilot

This project was developed with the assistance of AI-based tooling for debugging, architectural guidance, and optimization. All implementation, testing, and integration were performed and validated manually.
