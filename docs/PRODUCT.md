# Product Specification — Spec-Driven Platform V26
# This is the ONLY file a human edits directly.
# All feature descriptions, architecture decisions, and workflows live here.
# Agents propagate changes to all other files.
# ---

## App Identity

- **Name:** [App Name]
- **Slug:** [app-slug]
- **Description:** [Brief description of what this app does]
- **Type:** [web app / mobile app / API / admin panel / full-stack SaaS]

---

## Tech Stack (Phase 3 generates inputs.yml from this)

### Runtime & Language
- Node.js version: 20
- TypeScript: strict mode enabled

### Framework
- Primary: Next.js (App Router)
- Mobile: Expo (if needed)

### Database & ORM
- PostgreSQL via Prisma ORM

### Authentication
- Auth.js v5

### API Layer
- tRPC

### UI
- shadcn/ui components
- Tailwind CSS

### Queue & Cache
- Valkey (Redis-compatible)
- BullMQ

### File Storage
- MinIO (S3-compatible)

### Deployment
- Docker Compose (dev/staging/prod)
- Docker Hub for container registry

---

## Core Entities

### Tenant
- id: UUID
- name: string
- slug: string (unique)
- isActive: boolean
- createdAt: datetime
- updatedAt: datetime

### User
- id: UUID
- email: string (unique)
- username: string (unique)
- passwordHash: string
- role: enum (super_admin, admin, member, viewer)
- tenantId: UUID (FK)
- isEmailVerified: boolean
- createdAt: datetime
- updatedAt: datetime

### AuditLog
- id: UUID
- userId: UUID (FK)
- tenantId: UUID (FK)
- action: string
- entityType: string
- entityId: string
- metadata: JSON
- createdAt: datetime

---

## Roles & Permissions

| Role        | Description                          |
|-------------|--------------------------------------|
| super_admin | Full platform access, all tenants     |
| admin       | Full tenant access                   |
| member      | Standard access within tenant         |
| viewer      | Read-only access                      |

---

## Tenancy

- **Mode:** [single / multi]
- **Strategy:** shared schema with tenant_id column

---

## Features

### Authentication
- Email/password login
- Session management via Auth.js v5
- Password reset flow

### Dashboard
- [Describe main dashboard features]

### Core Module
- [Describe core business logic]

---

## API Endpoints

### Auth
- POST /api/auth/login
- POST /api/auth/logout
- POST /api/auth/forgot-password
- POST /api/auth/reset-password

### Users
- GET /api/users
- GET /api/users/:id
- POST /api/users
- PATCH /api/users/:id
- DELETE /api/users/:id

### [Other modules]
- [List API endpoints]

---

## Non-Functional Requirements

- **Performance:** [targets]
- **Security:** [requirements]
- **Compliance:** [GDPR/DICT/PCI if needed]
- **Uptime:** [SLA targets]

---

## Out of Scope (Phase 1)

- [Features not included in initial release]
