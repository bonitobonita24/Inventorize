# Inventorize

Track your inventory, anytime, anywhere.

Multi-tenant SaaS platform for small/mid-size companies to manage inventory with barcode scanning, serial number tracking, purchase orders, stock movement history, and full audit logging — all from a browser.

## Features

- **Multi-tenant isolation** — subdirectory routing (`/[tenant-slug]/...`), PostgreSQL RLS, Prisma query guardrails
- **Barcode scanning** — scan products in/out using device camera (html5-qrcode)
- **Serial number tracking** — per-unit lifecycle: stock-in creates serials, stock-out marks as issued, adjustments tracked
- **Purchase orders** — create POs with line items, receive against PO, auto-update PO status (ordered/partially received/received)
- **Stock movements** — immutable movement log with before/after quantities on every stock-in, stock-out, and adjustment
- **Low-stock alerts** — configurable thresholds per product, daily BullMQ job sends email notifications
- **Reports & CSV export** — stock movements, low stock, inventory snapshot, product history, admin audit trail
- **File attachments** — delivery receipts and PO documents stored in MinIO (S3-compatible)
- **Platform admin** — onboard/suspend/reactivate tenants, cross-tenant metrics, read-only tenant impersonation
- **Role-based access** — super_admin, admin, warehouse_staff, purchasing_staff with granular permissions
- **Printable stock-out slips** — SO-XXXXX sequential numbering per tenant

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router) + Tailwind CSS + shadcn/ui |
| API | tRPC v11 |
| ORM | Prisma |
| Auth | Auth.js v5 (JWT strategy, PostgreSQL sessions) |
| Database | PostgreSQL 16 + PgBouncer |
| Cache / Queue | Valkey 7 (Redis-compatible) + BullMQ |
| File Storage | MinIO (dev) / Amazon S3 (prod) |
| Email | MailHog (dev) / SMTP (prod) |
| Monorepo | Turborepo + pnpm workspaces |

## Prerequisites

- Node.js >= 22 (use [nvm](https://github.com/nvm-sh/nvm): `nvm install 22`)
- pnpm >= 10 (`npm install -g pnpm`)
- Docker Desktop (for backing services)
- WSL2 on Windows (develop inside `/home/user/`, not `/mnt/c/`)

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url> && cd Inventorize
pnpm install

# 2. Set up environment
cp .env.example .env.dev
# Fill in real values (or use Phase 3 to auto-generate credentials)

# 3. Start all services
bash deploy/compose/start.sh dev up -d

# 4. Run migrations and seed
pnpm db:migrate
pnpm db:seed

# 5. Open the app
# http://localhost:44884
```

**First login:**

| Field | Value |
|-------|-------|
| Username | `webmaster` |
| Password | See `CREDENTIALS.md` (gitignored) |
| Role | super_admin |

Change the webmaster password immediately in production.

## Running the App

```bash
# Start all services
bash deploy/compose/start.sh dev up -d

# Stop all services (volumes preserved)
bash deploy/compose/start.sh dev down

# Full reset (destroys all data)
bash deploy/compose/start.sh dev down --volumes
bash deploy/compose/start.sh dev up -d
pnpm db:migrate && pnpm db:seed
```

## Development Commands

All commands run from project root in WSL2 terminal.

```bash
# Dev server (Next.js + tRPC)
pnpm dev

# Code quality
pnpm lint              # ESLint
pnpm typecheck         # TypeScript (tsc --noEmit)
pnpm test              # Unit + integration tests
pnpm format            # Prettier
pnpm build             # Full production build

# Database
pnpm db:migrate        # Run pending Prisma migrations
pnpm db:generate       # Regenerate Prisma client
pnpm db:seed           # Seed webmaster account + demo data
pnpm db:studio         # Open Prisma Studio (http://localhost:44894)

# Governance tools
pnpm tools:validate-inputs      # Validate inputs.yml schema
pnpm tools:check-env            # Check required env vars
pnpm tools:check-product-sync   # Validate PRODUCT.md <-> inputs.yml
pnpm tools:hydration-lint       # Check SSR hydration mismatches
```

## Docker Image Pipeline

```bash
# Build + test + push dev image
bash deploy/compose/push.sh dev

# Promote to staging (re-tag, no rebuild)
bash deploy/compose/push.sh staging

# Promote to production (re-tag, no rebuild)
bash deploy/compose/push.sh prod
```

Tags: `:dev-latest`, `:staging-latest`, `:latest` (prod), plus immutable `:sha-{hash}` per commit.

Rollback: change image tag in compose file to a previous `sha-{hash}`, then `docker compose up -d`.

## Service URLs (Dev)

| Service | URL | Auth |
|---------|-----|------|
| App | http://localhost:44884 | Login page |
| pgAdmin | http://localhost:44881 | See `.env.dev` |
| MinIO Console | http://localhost:44878 | See `.env.dev` |
| MailHog | http://localhost:44880 | None |
| Prisma Studio | http://localhost:44894 | None |

Run `cat .env.dev | grep _PORT` to see all assigned ports.

## Architecture

```
apps/
  web/                    Next.js 15 app (App Router + tRPC + Auth.js)
packages/
  shared/                 TypeScript types, Zod schemas, enums
  db/                     Prisma schema, migrations, seed, tenant-guard (L6)
  ui/                     shadcn/ui components
  jobs/                   BullMQ workers (low-stock notifications)
  storage/                MinIO/S3 file upload client
  api-client/             Typed tRPC client
deploy/
  compose/dev|stage|prod/ Docker Compose per environment
docs/
  PRODUCT.md              Feature specification (single source of truth)
  CHANGELOG_AI.md         Agent-attributed change log
  DECISIONS_LOG.md        Locked architectural decisions
  IMPLEMENTATION_MAP.md   Current build state
```

**Security layers (all active in multi-tenant mode):**

| Layer | What |
|-------|------|
| L1 | tRPC tenant scoping — every query filtered by `tenantId` from session |
| L2 | PostgreSQL RLS — row-level security policies per tenant |
| L3 | RBAC middleware — role checked before any resolver runs |
| L4 | PgBouncer pool limits — per-tenant connection isolation |
| L5 | Immutable AuditLog — every mutation logged |
| L6 | Prisma query guardrails — `$allOperations` auto-injects `tenantId` |

## Git Workflow

```bash
# Feature branch
git checkout -b feat/my-feature

# Conventional commits
git commit -m "feat(products): add bulk import"

# Squash-merge to main
git checkout main && git merge --squash feat/my-feature
git commit -m "feat(products): add bulk import"
git branch -D feat/my-feature
```

## Adding Features

1. Edit `docs/PRODUCT.md` — describe the change
2. Say "Feature Update" in your AI agent (Claude Code / Cline)
3. Verify: `pnpm tools:check-product-sync && pnpm typecheck && pnpm test`

See `COMMANDS.md` for the full command reference.

## Deployment

**Staging/Production** use pre-built Docker Hub images — no source code on servers.

```bash
# On server: pull and start
docker compose -f docker-compose.app.yml pull
docker compose -f docker-compose.app.yml up -d
```

Environment isolation via `COMPOSE_PROJECT_NAME`:
- `inventorize_staging_postgres` (separate container, volume, network)
- `inventorize_prod_postgres` (completely independent)

See `docs/DECISIONS_LOG.md` for full infrastructure decisions.

## License

Proprietary. All rights reserved.
