# Karbon ⚡

> **Ultra-Premium Real-Time Collaborative Project Management SaaS (MERN Stack)**  
> Engineered with Linear- and Supabase-grade Obsidian aesthetics, zero-latency drag-and-drop Kanban, multiplayer Socket.IO collaboration, multi-tenant RBAC isolation, and Stripe subscription monetization.

---

## 💎 Features

- **Linear-Grade Obsidian & Zinc Aesthetics**: Dark-mode-first luxury UI (`#09090b` canvas, `#111215` elevated panels, `backdrop-blur-xl`, with subtle glowing borders and Framer Motion spring physics).
- **High-Performance Kanban Drag-and-Drop**: Built on `@dnd-kit` with $O(1)$ fractional ranking (Lexorank-style) and WIP limit alerts.
- **Multiplayer Real-Time Engine**: Socket.IO room isolation (`workspace:<id>`, `board:<id>`, `task:<id>`), live presence avatar stacks with green pulse indicators, and active typing status.
- **Task Detail Slide-Over Drawer**: Rich metadata grid, subtask checklists with percentage progress bars, priority swatches, and threaded discussion comments.
- **Keyboard-First Productivity**: Global Command Palette (`Ctrl+K` / `Cmd+K`), quick task creator (`c`), fuzzy search across tasks and projects.
- **Deep Analytics & Insights**: Dark-theme charts powered by Recharts (completion velocity, priority spreads, status breakdowns, and team member workload).
- **Multi-Tenant Architecture & RBAC**: Strict workspace boundary isolation on every query, supporting Owner, Admin, Member, and Viewer roles.
- **SaaS Subscription Monetization**: Tiered plans (**Free**, **Pro** at $16/seat, **Enterprise** at $39/seat) with usage quotas and Stripe checkout integration.

---

## 🛠️ Technology Stack

```
Frontend (Client)                     Backend (Server)
• React 18 (Vite SPA)                 • Node.js 20+ LTS (ES Modules)
• Tailwind CSS + Framer Motion        • Express.js Modular Architecture
• @dnd-kit (Accessible DnD)           • MongoDB Atlas + Mongoose ODM
• TanStack Query v5 + Zustand         • Socket.IO 4+ Real-Time Engine
• Recharts Data Visualizations        • In-Memory MongoDB Auto-Fallback
• Sonner Toasts & Lucide Icons        • Argon2 / Bcrypt & JWT Auth
```

---

## 🚀 Quick Start

### 1. Installation
Install all dependencies in root, server, and client:
```bash
npm run install:all
```

### 2. Running Locally
Run both backend API and frontend Vite servers concurrently:
```bash
# Starts Server (port 5000) and Client (port 5173 / 5174)
npm run dev
```

Or run them individually:
```bash
# Backend (Server)
npm run dev:server

# Frontend (Client)
npm run dev:client
```
