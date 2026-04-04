# Implementation Map — Spec-Driven Platform V26
# Current build state after each phase
# ---

## Project Info
- App Name:     Inventorize
- App Slug:     inventorize
- Phase:        Phase 8 — Iterative Buildout (Batches 1–8 complete)
- Last Updated: 2026-04-04

---

## Phase Status
- [x] Phase 0: Bootstrap
- [ ] Phase 1: Dev Environment Setup (optional)
- [x] Phase 2: Requirements & Architecture
- [x] Phase 3: Config Generation
- [x] Phase 4: Part-by-Part Scaffold (Parts 1–5+7+8 complete, 6 skipped — no mobile)
- [x] Phase 5: Validation (all 9 commands pass)
- [x] Phase 6: Docker Startup
- [x] Phase 7: Feature Updates (via Phase 8 batches)
- [ ] Phase 8: Iterative Buildout (Batches 1–8 of N complete)

---

## Scaffold Status (Phase 4 Parts)

### Part 1: Root Config Files — COMPLETE
- [x] pnpm-workspace.yaml
- [x] turbo.json
- [x] tsconfig.base.json
- [x] .editorconfig
- [x] .prettierrc
- [x] .eslintrc.js
- [x] .nvmrc (Node 22)
- [x] .gitignore (final)

### Part 2: packages/shared + packages/api-client — COMPLETE
- [x] packages/shared/package.json + tsconfig.json
- [x] packages/shared/src/enums/index.ts (7 enums: UserRole, TenantStatus, POStatus, SerialNumberStatus, MovementType, NotificationStatus, AdjustmentReason)
- [x] packages/shared/src/types/index.ts (17 entity interfaces + AppSession + Pagination)
- [x] packages/shared/src/schemas/index.ts (Zod schemas: create/update/filter for all entities)
- [x] packages/api-client/package.json + tsconfig.json
- [x] packages/api-client/src/index.ts (typed tRPC client factory + re-exports)

### Part 3: packages/db (Prisma) — COMPLETE
- [x] packages/db/package.json + tsconfig.json
- [x] prisma/schema.prisma (17 models, 8 enums, full relations + tenant-scoped indexes)
- [x] prisma/migrations/20260403121528_init (initial migration — 17 tables, 8 enums)
- [x] prisma/seed.ts (webmaster + demo tenant + demo users/suppliers/products)
- [x] src/index.ts (Prisma singleton + platformPrisma + AsyncLocalStorage tenant context)
- [x] src/context.ts (TenantContext + withTenantContext + currentTenantId/currentUserId)
- [x] src/audit.ts (L5 immutable AuditLog write helper)
- [x] src/middleware/tenant-guard.ts (L6 Prisma $allOperations extension)
- [x] src/rls.ts (L2 PostgreSQL RLS helper + rlsStatements + TENANT_SCOPED_TABLES)

### Part 4: packages/ui + packages/jobs + packages/storage — COMPLETE
- [x] packages/ui/package.json + tsconfig.json (DOM lib, peer deps for React + Tailwind)
- [x] packages/ui/src/lib/utils.ts (cn() utility — clsx + tailwind-merge)
- [x] packages/ui/src/styles/globals.css (Tailwind + CSS custom properties for light/dark)
- [x] packages/ui/src/components/ (16 components: button, input, label, card, table, badge, dialog, select, dropdown-menu, toast, separator, avatar, checkbox, switch, tabs, tooltip, skeleton, alert-dialog)
- [x] packages/jobs/package.json + tsconfig.json (BullMQ + ioredis)
- [x] packages/jobs/src/connection.ts (Redis singleton with env var validation)
- [x] packages/jobs/src/queues/ (low-stock-check cron daily, email-notifications event-driven, typed payloads with tenantId+userId)
- [x] packages/jobs/src/workers/ (worker factories for low-stock-check + email-notifications)
- [x] packages/jobs/src/scheduler.ts (registers daily cron for low-stock-check at 00:00 UTC)
- [x] packages/jobs/src/cache/index.ts (tenant-prefixed Valkey cache: get/set/del + JSON variants)
- [x] packages/storage/package.json + tsconfig.json (@aws-sdk/client-s3 + presigner)
- [x] packages/storage/src/client.ts (S3Client singleton, forcePathStyle for MinIO)
- [x] packages/storage/src/validation.ts (MIME whitelist: PDF/JPEG/PNG, SVG/HTML blocked, 10MB limit, randomized filenames)
- [x] packages/storage/src/operations.ts (uploadFile, getDownloadUrl, deleteFile, fileExists — all tenant-scoped via path prefix check)

### Part 5: apps/web (Next.js) — COMPLETE
- [x] apps/web/package.json + tsconfig.json
- [x] apps/web/next.config.ts (standalone output, 6 HTTP security headers, CSP)
- [x] apps/web/Dockerfile (multi-stage: deps → build → runner, standalone output)
- [x] apps/web/.dockerignore
- [x] apps/web/postcss.config.js + tailwind.config.ts
- [x] apps/web/src/env.ts (Zod-validated env vars at startup)
- [x] apps/web/src/middleware.ts (tenant resolution from URL path, auth guard, session cross-check)
- [x] apps/web/src/server/auth/index.ts (Auth.js v5 Credentials provider, bcrypt, JWT + session callbacks) ✦ Batch 7: LOGIN AuditLog event via platformPrisma.$transaction ✦ Batch 8: block login for suspended tenant users
- [x] apps/web/src/instrumentation.ts ✦ Batch 7: Next.js register() hook — starts BullMQ workers on nodejs runtime init
- [x] apps/web/src/server/lib/email.ts ✦ Batch 7: nodemailer SMTP sender (MailHog dev / SMTP prod)
- [x] apps/web/src/server/workers/email-processor.ts ✦ Batch 7: low_stock_report HTML email + welcome email
- [x] apps/web/src/server/workers/low-stock-processor.ts ✦ Batch 7: all-tenants low-stock check, LowStockNotificationLog dedup, email job enqueue
- [x] apps/web/src/server/workers/startup.ts ✦ Batch 7: createLowStockCheckWorker + createEmailNotificationsWorker + registerScheduledJobs
- [x] apps/web/src/server/trpc/context.ts (tRPC context with session, userId, tenantId, roles)
- [x] apps/web/src/server/trpc/trpc.ts (base procedures, rate limiting wired in)
- [x] apps/web/src/server/trpc/router.ts (root router aggregating all sub-routers)
- [x] apps/web/src/server/trpc/middleware/rbac.ts (L3 RBAC role guard)
- [x] apps/web/src/server/trpc/middleware/tenant.ts (L1 tenant scope enforcement)
- [x] apps/web/src/server/trpc/routers/ — 10 routers:
  - [x] product.router.ts (CRUD, list with cursor pagination, stock history) ✦ Batch 5: serialsByProductId query (paginated, status filter) ✦ Batch 8: duplicate productCode + barcodeValue enforcement (create + update)
  - [x] supplier.router.ts (CRUD, list)
  - [x] purchase-order.router.ts (CRUD, status transitions, list, listReceivable) ✦ Batch 4: listReceivable for stock-in PO selector; byId includes stockIns ✦ Batch 5: listReceivable items include serialTrackingEnabled ✦ Batch 6: attachmentUrl in create; getAttachmentUrl presigned download
  - [x] stock-in.router.ts (create with serial numbers, list) ✦ Batch 4: create propagates receivedQty to PurchaseOrderItem + auto-updates PO status ✦ Batch 6: getAttachmentUrl presigned download
  - [x] stock-out.router.ts (create with slip number, list) ✦ Batch 5: serialsForProduct query; create validates serials + marks issued; list includes releasedByUser + item product details
  - [x] stock-adjustment.router.ts (create, list) ✦ Batch 8: serialNumberId input, serial validation, serial status update, serialNumberId in movement log
  - [x] user.router.ts (CRUD, role assignment, impersonation) ✦ Batch 8: welcome email enqueue via BullMQ on user creation
  - [x] audit-log.router.ts (list with filters)
  - [x] report.router.ts (dashboard KPIs, low stock, movement history, valuation) ✦ Batch 6: inventorySnapshot + inventorySummary added
  - [x] platform.router.ts (superadmin: tenant CRUD, metrics, audit — separate Prisma instance) ✦ Batch 8: removed invalid isActive from tenant create
- [x] apps/web/src/app/ — Pages:
  - [x] layout.tsx (root layout with TRPCProvider)
  - [x] login/page.tsx
  - [x] page.tsx (redirect to login)
  - [x] api/health/route.ts (GET /api/health → 200)
  - [x] api/trpc/[trpc]/route.ts (tRPC API handler)
  - [x] [tenantSlug]/layout.tsx (tenant layout with sidebar nav)
  - [x] [tenantSlug]/dashboard/page.tsx ✦ Batch 1: recharts KPI charts (bar, line, pie, area) ✦ Batch 7: low-stock banner: item count, "need attention" headline, "View full report" link, "and X more" overflow
  - [x] [tenantSlug]/products/page.tsx + [id]/page.tsx + [id]/history/page.tsx ✦ Batch 3: create/edit form (admin-only), real-time price preview, serial tracking toggle, Decimal conversion, deactivate/activate ✦ Batch 5: [id]/page.tsx has Serials tab (serialsByProductId, status filter, pagination, colored badges) ✦ Batch 7: [id]/history/page.tsx — movementType select, startDate/endDate date pickers, clear button, pagination, Notes column
  - [x] [tenantSlug]/suppliers/page.tsx ✦ Batch 2: create/edit form, activate/deactivate toggle
  - [x] [tenantSlug]/purchase-orders/page.tsx + [id]/page.tsx ✦ Batch 3: create form with dynamic line items, supplier dropdown, auto-fill cost, order total, supplier name in list ✦ Batch 4: [id]/page.tsx shows linked Receipts section ✦ Batch 6: file attachment upload on create; download button on detail
  - [x] [tenantSlug]/stock-in/page.tsx ✦ Batch 1: BarcodeScanner + create form ✦ Batch 4: PO dropdown selector, auto-populate remaining items ✦ Batch 5: serial entry panel ✦ Batch 6: delivery receipt upload; Receipt column with presigned download in list
  - [x] [tenantSlug]/stock-out/page.tsx ✦ Batch 1: BarcodeScanner + create form ✦ Batch 5: SerialPicker (checkbox list of in_stock serials), PrintSlipModal (SO-XXXXX slip, window.print()), serialsValid gate
  - [x] [tenantSlug]/adjustments/page.tsx ✦ Batch 2: create form with reason enum, BarcodeScanner, delta preview ✦ Batch 8: SerialPicker for serial-tracked products, serial column, serialNumberId in payload
  - [x] [tenantSlug]/audit-logs/page.tsx ✦ Batch 2: entity type + date range filters, pagination, action badges
  - [x] [tenantSlug]/reports/page.tsx ✦ Batch 1: CSV export (movements + low stock) ✦ Batch 6: full rewrite — 5 tabs (stock movements, low stock, inventory snapshot, product history, audit trail); filters; CSV export per tab; admin-only audit trail tab
  - [x] apps/web/src/app/api/upload/route.ts ✦ Batch 6: non-tRPC multipart upload handler (manual auth + tenant guard + MinIO) — entityType: po-attachment | delivery-receipt
  - [x] [tenantSlug]/users/page.tsx ✦ Batch 3: create form, inline edit, disable/enable toggle, role assignment, search, pagination
  - [x] platform/layout.tsx + tenants/page.tsx + audit-logs/page.tsx + metrics/page.tsx ✦ Batch 8: tenants/page.tsx full rewrite — create tenant + first admin onboarding, suspend/reactivate with dialog, search/filter, pagination
- [x] apps/web/src/server/lib/rate-limit.ts (LRU-based, 4 tiers: public/auth/api/upload)
- [x] apps/web/src/server/lib/sanitize.ts (DOMPurify — sanitize + sanitizePlainText)
- [x] apps/web/src/lib/trpc.ts + trpc-provider.tsx (client-side tRPC hooks)
- [x] apps/web/src/lib/csv-export.ts ✦ Batch 1: downloadCsv() utility for client-side CSV generation
- [x] apps/web/src/components/barcode-scanner.tsx ✦ Batch 1: html5-qrcode camera scanner + manual input

### Docker Hub Pipeline — COMPLETE (generated alongside Parts 3–5)
- [x] .github/workflows/docker-publish.yml (build + push on merge to main)
- [x] deploy/compose/push.sh (manual promotion: dev → staging → prod)

### Part 6: apps/mobile — SKIPPED (no mobile declared in inputs.yml)

### Part 7: deploy/compose + tools — COMPLETE
- [x] deploy/compose/dev/ (docker-compose.db.yml, .cache.yml, .storage.yml, .infra.yml, .app.yml, .pgadmin.yml, pgadmin-servers.json)
- [x] deploy/compose/stage/ (docker-compose.db.yml, .cache.yml, .storage.yml, .app.yml, .pgadmin.yml, pgadmin-servers.json — no build: key, Docker Hub pull only)
- [x] deploy/compose/prod/ (docker-compose.db.yml, .cache.yml, .storage.yml, .app.yml, .pgadmin.yml, pgadmin-servers.json — no build: key, Docker Hub pull only)
- [x] deploy/compose/start.sh (env-aware startup — db first, --build for dev app)
- [x] tools/validate-inputs.mjs (checks required top-level keys + ports.dev.base)
- [x] tools/check-env.mjs (validates 29 required vars in .env.dev, rejects placeholders)
- [x] tools/check-product-sync.mjs (PRODUCT.md ↔ inputs.yml sync + private tag leakage)
- [x] tools/hydration-lint.mjs (SSR mismatch pattern scanner for apps/)
- [x] COMMANDS.md (master dev command reference — Docker, DB, testing, pipeline, credentials)
- [x] .socraticodecontextartifacts.json (4 artifacts: schema, map, decisions, product)

### Part 8: CI + Governance — COMPLETE
- [x] .github/workflows/ci.yml (governance gates, quality matrix: lint/typecheck/test/build, security audit)
- [x] MANIFEST.txt (complete file listing across all 8 Parts)
- [ ] SocratiCode initial index (deferred — requires Docker running + SocratiCode MCP active)

---

## Generated Files Summary

### Root Config
- [x] pnpm-workspace.yaml
- [x] turbo.json
- [x] tsconfig.base.json
- [x] .editorconfig
- [x] .prettierrc
- [x] .eslintrc.js
- [x] .nvmrc
- [x] package.json
- [x] .npmrc

### Governance Docs
- [x] CLAUDE.md
- [x] .clinerules
- [x] docs/DECISIONS_LOG.md
- [x] docs/CHANGELOG_AI.md
- [x] docs/PRODUCT.md (complete — Phase 2 + 2.7 gaps resolved)
- [x] docs/IMPLEMENTATION_MAP.md (this file)

### Phase 3 Generated Files
- [x] inputs.yml
- [x] inputs.schema.json
- [x] .env.dev
- [x] .env.staging
- [x] .env.prod
- [x] .env.example
- [x] CREDENTIALS.md (gitignored — all credentials for all environments)

### Memory & Logs
- [x] .cline/memory/lessons.md
- [x] .cline/memory/agent-log.md
- [x] .cline/STATE.md

### MCP & SpecStory
- [x] .vscode/mcp.json
- [x] .specstory/config.json
- [x] .specstory/specs/v26-master-prompt.md

### Skills
- [x] .github/skills/spec-driven-core/SKILL.md
- [x] scripts/log-lesson.sh

### Deploy
- [x] .github/workflows/docker-publish.yml
- [x] deploy/compose/push.sh
- [x] deploy/compose/dev/ (6 compose files + pgadmin-servers.json)
- [x] deploy/compose/stage/ (5 compose files + pgadmin-servers.json)
- [x] deploy/compose/prod/ (5 compose files + pgadmin-servers.json)
- [x] deploy/compose/start.sh

### Tools
- [x] tools/validate-inputs.mjs
- [x] tools/check-env.mjs
- [x] tools/check-product-sync.mjs
- [x] tools/hydration-lint.mjs

### Other
- [x] COMMANDS.md
- [x] .socraticodecontextartifacts.json
