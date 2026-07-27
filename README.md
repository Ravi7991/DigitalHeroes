# 🚀 Digital Heroes - CRM & Lead Management System

A full-stack Lead Management CRM application designed for modern sales teams to capture, assign, track, and close leads efficiently with role-based access control (RBAC).

---

## 📦 Project Deliverables Summary

### 1. 🐙 Public GitHub Repository & Automated Tests
- **GitHub Repository**: [https://github.com/Ravi7991/DigitalHeroes](https://github.com/Ravi7991/DigitalHeroes)
- **Automated Test Suite**: 100% passing Vitest + Supertest integration tests in `backend/src/__tests__/api.test.ts`.
- **Run Tests Locally**:
  ```bash
  cd backend
  npm test
  ```

---

### 2. 🌐 Deployed Application & Role Credentials

The application is deployed on **Render** (via 1-click `render.yaml` Blueprint).

- **Frontend App URL**: [http://localhost:3000](http://localhost:3000) *(https://digital-heroes-frontend-f2rz.onrender.com)*
- **Backend API URL**: [http://localhost:5000](http://localhost:5000) *(https://digital-heroes-backend-z5zl.onrender.com)

#### 🔑 Role Credentials for Testing & Review
| Role | Email | Password | Permissions & Capabilities |
| :--- | :--- | :--- | :--- |
| **👑 Admin** | `admin@leadplatform.com` | `admin123` | Full access: View all leads, assign/reassign leads, delete leads, add notes, view activity logs. |
| **👤 Member** | `member@leadplatform.com` | `member123` | Restricted access: View leads, update status & add notes **only on leads assigned to them**. |

---

### 3. 📚 Complete API Documentation
Detailed API specs, request/response formats, authentication, and endpoint authorization matrix are documented in:
👉 **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)**

---

## 🛠️ Architecture & Tech Stack

- **Frontend**: Next.js 16 (App Router, Turbopack, Tailwind CSS, Lucide Icons)
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, SQLite database
- **Authentication**: JWT (JSON Web Tokens) with HTTP cookies / Bearer headers
- **Deployment**: Render Blueprint (`render.yaml`)

---

## ⚡ Local Setup Instructions

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Ravi7991/DigitalHeroes.git
   cd DigitalHeroes
   ```

2. **Start Backend**:
   ```bash
   cd backend
   npm install
   npx prisma generate
   npx prisma db push
   npx tsx prisma/seed.ts
   npm run dev
   ```
   *(Backend starts on `http://localhost:5000`)*

3. **Start Frontend**:
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```
   *(Frontend starts on `http://localhost:3000`)*
