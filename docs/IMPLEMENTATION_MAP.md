# Implementation Map — Spec-Driven Platform V28
# Current build state after each phase
# ---

## Project Info
- App Name:     Inventorize
- App Slug:     inventorize
- Phase:        Phase 8 — Iterative Buildout (Batches 1–12 complete + Billing Module pages)
- Last Updated: 2026-04-10 (Billing module pages + two Prisma migrations applied)

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
- [x] Phase 8: Iterative Buildout (Batches 1–12 complete)

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
- [x] prisma/schema.prisma (21 models, 8 enums, full relations + tenant-scoped indexes) ✦ Billing: SubscriptionPlan, Subscription, Payment, RefundRequest + securityVersion on User
- [x] prisma/migrations/20260403121528_init (initial migration — 17 tables, 8 enums)
- [x] prisma/migrations/20260409153237_add_billing_models (SubscriptionPlan, Subscription, Payment, RefundRequest tables + indexes)
- [x] prisma/migrations/20260409231805_add_security_version_to_user (securityVersion Int field on User model for session invalidation)
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
- [x] apps/web/src/middleware.ts (tenant resolution from URL path, auth guard, session cross-check) ✦ Batch 11: allow impersonating super_admin to access tenant routes
- [x] apps/web/src/server/auth/index.ts (Auth.js v5 Credentials provider, bcrypt, JWT + session callbacks) ✦ Batch 7: LOGIN AuditLog event via platformPrisma.$transaction ✦ Batch 8: block login for suspended tenant users ✦ Batch 11: impersonation JWT fields + trigger='update' handler
- [x] apps/web/src/instrumentation.ts ✦ Batch 7: Next.js register() hook — starts BullMQ workers on nodejs runtime init
- [x] apps/web/src/server/lib/email.ts ✦ Batch 7: nodemailer SMTP sender (MailHog dev / SMTP prod)
- [x] apps/web/src/server/workers/email-processor.ts ✦ Batch 7: low_stock_report HTML email + welcome email
- [x] apps/web/src/server/workers/low-stock-processor.ts ✦ Batch 7: all-tenants low-stock check, LowStockNotificationLog dedup, email job enqueue
- [x] apps/web/src/server/workers/startup.ts ✦ Batch 7: createLowStockCheckWorker + createEmailNotificationsWorker + registerScheduledJobs
- [x] apps/web/src/server/trpc/context.ts (tRPC context with session, userId, tenantId, roles, isImpersonating)
- [x] apps/web/src/server/trpc/trpc.ts (base procedures, rate limiting wired in) ✦ Batch 11: tenantMutationProcedure (chains blockIfImpersonating)
- [x] apps/web/src/server/trpc/router.ts (root router aggregating all sub-routers)
- [x] apps/web/src/server/trpc/middleware/rbac.ts (L3 RBAC role guard)
- [x] apps/web/src/server/trpc/middleware/tenant.ts (L1 tenant scope enforcement + blockIfImpersonating middleware)
- [x] apps/web/src/server/trpc/routers/ — 10 routers:
  - [x] product.router.ts (CRUD, list with cursor pagination, stock history) ✦ Batch 5: serialsByProductId query (paginated, status filter) ✦ Batch 8: duplicate productCode + barcodeValue enforcement (create + update) ✦ Batch 12: byId pricing fix — role-based Prisma select via pricingSelectForRole()
  - [x] supplier.router.ts (CRUD, list)
  - [x] purchase-order.router.ts (CRUD, status transitions, list, listReceivable) ✦ Batch 4: listReceivable for stock-in PO selector; byId includes stockIns ✦ Batch 5: listReceivable items include serialTrackingEnabled ✦ Batch 6: attachmentUrl in create; getAttachmentUrl presigned download ✦ Batch 9: deleteAttachment procedure (MinIO delete + null attachmentUrl)
  - [x] stock-in.router.ts (create with serial numbers, list) ✦ Batch 4: create propagates receivedQty to PurchaseOrderItem + auto-updates PO status ✦ Batch 6: getAttachmentUrl presigned download ✦ Batch 9: deleteAttachment procedure (MinIO delete + null attachmentUrl) ✦ CI fix: PrismaTx = Omit<typeof prisma, ...> annotation on $transaction callback
  - [x] stock-out.router.ts (create with slip number, list) ✦ Batch 5: serialsForProduct query; create validates serials + marks issued; list includes releasedByUser + item product details ✦ CI fix: PrismaTx = Omit<typeof prisma, ...> annotation on $transaction callback
  - [x] stock-adjustment.router.ts (create, list) ✦ Batch 8: serialNumberId input, serial validation, serial status update, serialNumberId in movement log ✦ Batch 9: in_stock status guard — rejects issued/adjusted serials ✦ CI fix: PrismaTx = Omit<typeof prisma, ...> annotation on $transaction callback
  - [x] user.router.ts (CRUD, role assignment, impersonation) ✦ Batch 8: welcome email enqueue via BullMQ on user creation ✦ Batch 12: setup token flow — password removed from create input; generates VerificationToken (identifier: setup:${email}, bcrypt hash); welcome email now sends /auth/setup link
  - [x] auth.router.ts (NEW Batch 12: public tRPC procedures — validateSetupToken + completeSetup; atomic $transaction: password set + VerificationToken delete)
  - [x] audit-log.router.ts (list with filters)
  - [x] report.router.ts (dashboard KPIs, low stock, movement history, valuation) ✦ Batch 6: inventorySnapshot + inventorySummary added ✦ Batch 10: logExport mutation (audit trail on CSV export) + movementCounts query (period-based stock-in/out counts) ✦ CI fix: removed unused requireRole/UserRole imports; added eslint-disable for ctx.tenantId!/userId! in logExport + movementCounts
  - [x] billing.router.ts (NEW — billing sub-router aggregator: plans.list/create/update, subscriptions.getCurrent/create, payments.list, refunds.list/request/listAll, xendit.createInvoice, refunds.review superAdminProcedure)
  - [x] platform.router.ts (superadmin: tenant CRUD, metrics, audit — separate Prisma instance) ✦ Batch 8: removed invalid isActive from tenant create ✦ Batch 9: atomic $transaction on createTenant, createTenantAdmin, updateTenantStatus (audit log rolls back on failure) ✦ Batch 10: platformMetrics returns per-tenant active user breakdown ✦ Batch 11: startImpersonation + stopImpersonation mutations with PLATFORM audit logs ✦ Batch 12: createTenantAdmin setup token flow — password removed from input; generates VerificationToken + setup URL in welcome email ✦ CI fix: removed dead toSlug function (no-unused-vars)
- [x] apps/web/src/app/ — Pages:
  - [x] layout.tsx (root layout with TRPCProvider + ImpersonationBanner)
  - [x] login/page.tsx
  - [x] page.tsx (redirect to login)
  - [x] api/health/route.ts (GET /api/health → 200)
  - [x] api/trpc/[trpc]/route.ts (tRPC API handler)
  - [x] [tenantSlug]/layout.tsx (tenant layout with sidebar nav)
  - [x] [tenantSlug]/dashboard/page.tsx ✦ Batch 1: recharts KPI charts (bar, line, pie, area) ✦ Batch 7: low-stock banner: item count, "need attention" headline, "View full report" link, "and X more" overflow ✦ Batch 10: Stock In (30d) + Stock Out (30d) KPI cards
  - [x] [tenantSlug]/products/page.tsx + [id]/page.tsx + [id]/history/page.tsx ✦ Batch 3: create/edit form (admin-only), real-time price preview, serial tracking toggle, Decimal conversion, deactivate/activate ✦ Batch 5: [id]/page.tsx has Serials tab (serialsByProductId, status filter, pagination, colored badges) ✦ Batch 7: [id]/history/page.tsx — movementType select, startDate/endDate date pickers, clear button, pagination, Notes column
  - [x] [tenantSlug]/suppliers/page.tsx ✦ Batch 2: create/edit form, activate/deactivate toggle
  - [x] [tenantSlug]/purchase-orders/page.tsx + [id]/page.tsx ✦ Batch 3: create form with dynamic line items, supplier dropdown, auto-fill cost, order total, supplier name in list ✦ Batch 4: [id]/page.tsx shows linked Receipts section ✦ Batch 6: file attachment upload on create; download button on detail ✦ Batch 9: [id]/page.tsx delete attachment button with confirm dialog
  - [x] [tenantSlug]/stock-in/page.tsx ✦ Batch 1: BarcodeScanner + create form ✦ Batch 4: PO dropdown selector, auto-populate remaining items ✦ Batch 5: serial entry panel ✦ Batch 6: delivery receipt upload; Receipt column with presigned download in list ✦ Batch 9: delete attachment button (✕) in receipt column with confirm dialog ✦ CI fix: NonNullable<typeof receivablePOs>[number] annotation on find/map callbacks
  - [x] [tenantSlug]/stock-out/page.tsx ✦ Batch 1: BarcodeScanner + create form ✦ Batch 5: SerialPicker (checkbox list of in_stock serials), PrintSlipModal (SO-XXXXX slip, window.print()), serialsValid gate
  - [x] [tenantSlug]/adjustments/page.tsx ✦ Batch 2: create form with reason enum, BarcodeScanner, delta preview ✦ Batch 8: SerialPicker for serial-tracked products, serial column, serialNumberId in payload
  - [x] [tenantSlug]/audit-logs/page.tsx ✦ Batch 2: entity type + date range filters, pagination, action badges
  - [x] [tenantSlug]/reports/page.tsx ✦ Batch 1: CSV export (movements + low stock) ✦ Batch 6: full rewrite — 5 tabs (stock movements, low stock, inventory snapshot, product history, audit trail); filters; CSV export per tab; admin-only audit trail tab ✦ Batch 10: logExport mutation called before every CSV download
  - [x] apps/web/src/app/api/upload/route.ts ✦ Batch 6: non-tRPC multipart upload handler (manual auth + tenant guard + MinIO) — entityType: po-attachment | delivery-receipt
  - [x] [tenantSlug]/users/page.tsx ✦ Batch 3: create form, inline edit, disable/enable toggle, role assignment, search, pagination ✦ Batch 12: password field removed from create form (setup link sent instead)
  - [x] platform/layout.tsx + tenants/page.tsx + audit-logs/page.tsx + metrics/page.tsx ✦ Batch 8: tenants/page.tsx full rewrite — create tenant + first admin onboarding, suspend/reactivate with dialog, search/filter, pagination ✦ Batch 10: metrics/page.tsx per-tenant active user breakdown table ✦ Batch 11: tenants/page.tsx "View as tenant" impersonate button per row ✦ Batch 12: admin password field removed from create-admin form (setup link explanation text added) ✦ CI fix: removed unnecessary as 'active'|'suspended'|'trial' assertion on statusFilter (already narrowed by !== '' guard)
  - [x] platform/plans/page.tsx (NEW — superadmin plan management: list all plans active/inactive, create/edit modal with name/description/price/currency/billingCycle)
  - [x] platform/refunds/page.tsx (NEW — superadmin refund review queue: paginated list with status filter, approve/reject modal)
  - [x] [tenantSlug]/billing/page.tsx (NEW — tenant billing hub: current subscription card, available plans grid (admin-only), payment history table with request-refund action, my refund requests table, refund request modal)
  - [x] auth/setup/page.tsx (NEW Batch 12: client component + Suspense boundary; reads token+email from searchParams; validateSetupToken query on mount; completeSetup mutation → signIn → redirect to /)
- [x] apps/web/src/server/lib/rate-limit.ts (LRU-based, 4 tiers: public/auth/api/upload)
- [x] apps/web/src/server/lib/sanitize.ts (DOMPurify — sanitize + sanitizePlainText)
- [x] apps/web/src/server/lib/setup-token.ts (NEW Batch 12: generateSetupToken / hashSetupToken / getSetupTokenExpiry)
- [x] apps/web/src/server/lib/pricing-select.ts (NEW Batch 12: pricingSelectForRole — admin/super_admin/purchasing_staff see all pricing; warehouse_staff sees sellingPrice only)
- [x] apps/web/src/lib/trpc.ts + trpc-provider.tsx (client-side tRPC hooks + SessionProvider for useSession().update())
- [x] apps/web/src/components/impersonation-banner.tsx ✦ Batch 11: amber sticky banner during impersonation with exit button
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
- [x] .github/workflows/ci.yml (governance gates, quality matrix: lint/typecheck/test/build, security audit) ✦ CI fix: added explicit pnpm --filter @inventorize/db db:generate step before Turbo run; packages/db/package.json gains postinstall: prisma generate for Docker build stage
- [x] MANIFEST.txt (complete file listing across all 8 Parts)
- [ ] SocratiCode initial index (deferred — requires Docker running + SocratiCode MCP active)

---

## Pending Implementation — V28 PRODUCT.md Changes (governance propagated, code not yet built)

### Billing Module — Prisma Schema + Migrations (COMPLETE)
- [x] SubscriptionPlan model — id, name, description, priceAmount (Decimal), currency, billingCycle (monthly/yearly), isActive, createdAt, updatedAt
- [x] Subscription model (tenant-scoped) — id, tenantId, planId, status (active/pending/inactive/cancelled), currentPeriodStart, currentPeriodEnd, xenditSubscriptionId, createdAt, updatedAt
- [x] Payment model (tenant-scoped) — id, tenantId, subscriptionId, xenditInvoiceId, amount, currency, status (pending/paid/failed/expired/refunded), paidAt, failedReason, createdAt
- [x] RefundRequest model (tenant-scoped) — id, tenantId, paymentId, requestedById, reviewedById, amount, currency, status (requested/approved/rejected/processed/failed), reason, reviewedAt, createdAt
- [x] Migration 20260409153237_add_billing_models applied
- [x] Migration 20260409231805_add_security_version_to_user applied (securityVersion Int on User)
- [ ] Seed: at least 3 SubscriptionPlan rows (Free, Professional, Enterprise)

### Billing Module — tRPC Routers (COMPLETE)
- [x] billing.router.ts — aggregator with sub-routers: plans (list/create/update), subscriptions (getCurrent/create), payments (list), refunds (list/request/listAll/review), xendit (createInvoice)

### Billing Module — Pages (PARTIALLY COMPLETE)
- [x] /platform/plans — manage subscription plans (super_admin)
- [x] /platform/refunds — review and approve refund requests (super_admin)
- [x] /[tenantSlug]/billing — current plan, payment history, request refund, my refund requests
- [ ] /register — public registration page (new tenant + first admin + plan selection)
- [ ] /reset-password — public password reset page

### Xendit Integration (PENDING)
- [ ] packages/jobs/src/queues/xendit-webhook-processor.ts — BullMQ queue definition + typed payload
- [ ] packages/jobs/src/workers/xendit-webhook-worker.ts — process webhook events (invoice.paid, invoice.expired, refund.completed, etc.)
- [ ] apps/web/src/app/api/webhooks/xendit/route.ts — POST handler: x-callback-token verification (constant-time), enqueue to BullMQ, return 200 immediately
- [ ] apps/web/src/server/lib/xendit.ts — Xendit API client (Basic Auth, create invoice, create refund, manage subscriptions)
- [ ] Worker startup: register xendit-webhook-processor worker in startup.ts

### Cloudflare Turnstile Integration (PENDING)
- [ ] apps/web/src/components/turnstile-widget.tsx — @marsidev/react-turnstile wrapper component
- [ ] apps/web/src/server/lib/turnstile.ts — server-side siteverify validation (POST to challenges.cloudflare.com)
- [ ] Wire Turnstile widget into /login, /register, /reset-password pages
- [ ] Wire server-side validation into auth tRPC procedures (login, register, password reset)
- [ ] CSP update in next.config.ts: add challenges.cloudflare.com to script-src + frame-src

### Deployment — Traefik + Komodo (PENDING compose updates)
- [ ] deploy/compose/stage/docker-compose.app.yml — add Traefik labels + proxy external network, remove host ports on app service
- [ ] deploy/compose/prod/docker-compose.app.yml — add Traefik labels + proxy external network, remove host ports on app service
- [ ] Verify .env.staging has TRAEFIK_NETWORK=proxy + APP_DOMAIN (already added in governance propagation)
- [ ] Verify .env.prod has TRAEFIK_NETWORK=proxy + APP_DOMAIN (already added in governance propagation)

### V28 Security Hardening (PENDING code changes)
- [ ] Session invalidation on role/tenant change — securityVersion field on User model, checked in Auth.js session callback
- [ ] SSRF prevention utility — validate outbound URLs against private IP blocklist before fetch
- [ ] Tiered rate limiting verification — ensure all tRPC procedures use appropriate tier (auth ≤10/min, api ≤100/min, public ≤300/min)
- [ ] CSRF verification on non-tRPC Route Handlers (upload, webhooks already use signature verification)

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
- [x] .specstory/specs/v28-master-prompt.md

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
