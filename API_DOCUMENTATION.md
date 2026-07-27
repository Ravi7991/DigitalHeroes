# 📚 Digital Heroes CRM - API Documentation

## Overview
This document provides complete specification for the REST API of the **Digital Heroes CRM & Lead Management System**. 

The backend is built with **Node.js, Express, TypeScript, Prisma ORM, and SQLite**.

---

## 🔐 Authentication & Roles

### Authentication Mechanism
- **JWT (JSON Web Token)**: Sent via `Authorization` header (`Bearer <token>`) or set in an HTTP-only cookie (`token`).
- **Token Duration**: 7 days.

### User Roles & Permissions
| Action / Endpoint | Public / Unauth | Member Role | Admin Role |
| :--- | :---: | :---: | :---: |
| **Public Lead Capture (`POST /leads`)** | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **View Leads List (`GET /leads`)** | ❌ Blocked | ✅ Allowed | ✅ Allowed |
| **View Lead Details (`GET /leads/:id`)** | ❌ Blocked | ✅ Allowed | ✅ Allowed |
| **Update Lead Status** | ❌ Blocked | ✅ If Assigned | ✅ Allowed |
| **Add Notes (`POST /leads/:id/notes`)** | ❌ Blocked | ✅ If Assigned | ✅ Allowed |
| **Reassign Lead (`PATCH /leads/:id`)** | ❌ Blocked | ❌ Blocked | ✅ Allowed |
| **Delete Lead (`DELETE /leads/:id`)** | ❌ Blocked | ❌ Blocked | ✅ Allowed |

---

## 🔑 Test Credentials for Deployment & Local

| Role | Email | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@leadplatform.com` | `admin123` | Full control: assign leads, delete leads, update any lead, view audit logs. |
| **Member** | `member@leadplatform.com` | `member123` | Assigned work: update status & add notes on assigned leads. |

---

## 🚀 API Endpoints Reference

### 1. Health Check
`GET /health`
- **Auth Required**: No
- **Response** `200 OK`:
```json
{
  "status": "ok",
  "time": "2026-07-27T12:00:00.000Z"
}
```

---

### 2. User Login
`POST /auth/login`
- **Auth Required**: No
- **Request Body**:
```json
{
  "email": "admin@leadplatform.com",
  "password": "admin123"
}
```
- **Response** `200 OK`:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "id": "user-uuid",
    "email": "admin@leadplatform.com",
    "name": "Ravikant Prajapati",
    "role": "ADMIN"
  }
}
```

---

### 3. Public Lead Capture Form
`POST /leads`
- **Auth Required**: No
- **Request Body**:
```json
{
  "name": "Jane Doe",
  "email": "jane@company.com",
  "phone": "+1-555-0199",
  "company": "Acme Corp",
  "value": 5000
}
```
- **Response** `201 Created`:
```json
{
  "id": "lead-uuid",
  "name": "Jane Doe",
  "email": "jane@company.com",
  "phone": "+1-555-0199",
  "company": "Acme Corp",
  "value": 5000,
  "status": "NEW",
  "assignedToId": null,
  "createdAt": "2026-07-27T12:00:00.000Z",
  "updatedAt": "2026-07-27T12:00:00.000Z"
}
```

---

### 4. Fetch Paginated & Filtered Leads
`GET /leads`
- **Auth Required**: Yes (`ADMIN` or `MEMBER`)
- **Query Parameters**:
  - `page`: Page number (default: `1`)
  - `limit`: Items per page (default: `10`)
  - `status`: Filter by status (`NEW`, `CONTACTED`, `QUALIFIED`, `PROPOSAL_SENT`, `CLOSED_WON`, `CLOSED_LOST`)
  - `assignedToId`: Filter leads assigned to a specific user ID
- **Response** `200 OK`:
```json
{
  "leads": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalPages": 3,
    "totalCount": 25
  }
}
```

---

### 5. Fetch Lead Details
`GET /leads/:id`
- **Auth Required**: Yes (`ADMIN` or `MEMBER`)
- **Response** `200 OK`:
Includes full lead information along with assigned user details, notes timeline, and activity audit logs.

---

### 6. Update Lead (Status, Details, Assignment)
`PATCH /leads/:id`
- **Auth Required**: Yes (`ADMIN` or `MEMBER`)
- **Permissions**: Members can only update status of leads assigned to them. Only Admins can change `assignedToId`.
- **Request Body**:
```json
{
  "status": "QUALIFIED",
  "assignedToId": "user-uuid"
}
```
- **Response** `200 OK`: Updated lead object.

---

### 7. Add Note to Lead
`POST /leads/:id/notes`
- **Auth Required**: Yes (`ADMIN` or `MEMBER` assigned to lead)
- **Request Body**:
```json
{
  "content": "Had a discovery call with the lead today."
}
```
- **Response** `201 Created`: Note object with user details.

---

### 8. Delete Lead
`DELETE /leads/:id`
- **Auth Required**: Yes (**ADMIN Only**)
- **Response** `204 No Content`.

---

## 🧪 Testing Suite
To execute the automated unit and integration tests:
```bash
cd backend
npm test
```
- **Framework**: Vitest + Supertest
- **Coverage**: End-to-end REST API flows, Authentication, Authorization checks, Activity Logging, Notes, and Lead Lifecycle rules.
