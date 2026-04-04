# Changelog AI — Spec-Driven Platform V26
# Format: ## YYYY-MM-DD — [Phase or Feature Name]
# Include agent attribution in every entry.
# ---

## 2026-04-04 — Phase 8 Batch 7 — Dashboard Banner, History Filters, Login Audit, Low-Stock Notifications
- Agent:               CLAUDE_CODE
- Why:                 Batch 7 — enhanced dashboard alert banner, product history date/type filters, login AuditLog events, BullMQ low-stock check + email notification workers
- Files added:         apps/web/src/instrumentation.ts (Next.js register() hook — starts workers on nodejs runtime init)
                       apps/web/src/server/lib/email.ts (nodemailer transporter singleton; sendEmail helper; MailHog dev / SMTP prod)
                       apps/web/src/server/workers/email-processor.ts (processEmailNotification — low_stock_report HTML+text template, welcome type)
                       apps/web/src/server/workers/low-stock-processor.ts (processLowStockCheck — all-tenants iteration, JS filter, LowStockNotificationLog dedup, email enqueue)
                       apps/web/src/server/workers/startup.ts (startWorkers — creates workers + registers scheduled jobs, idempotent started guard)
- Files modified:      apps/web/src/app/[tenantSlug]/dashboard/page.tsx (banner: item count, "need attention" headline, "View full report" link, "and X more" overflow, threshold label)
                       apps/web/src/app/[tenantSlug]/products/[id]/history/page.tsx (movementType select, startDate/endDate date inputs, clear filters button, pagination, Notes column, human-readable type labels)
                       apps/web/src/server/auth/index.ts (platformPrisma.$transaction: lastLoginAt update + AuditLog LOGIN event)
                       apps/web/package.json (added nodemailer@^7.0.7, @types/nodemailer, bullmq direct dep for Job<T> types)
- Files deleted:       none
- Schema/migrations:   none (LowStockNotificationLog already in schema from batch5)
- Errors encountered:  bullmq not in apps/web deps (Job<T> type not resolvable); lowStock[0] possibly undefined (noUncheckedIndexedAccess)
- Errors resolved:     Added bullmq as direct dep of apps/web; used non-null assertion lowStock[0]! with comment (array provably non-empty at that point)

## 2026-04-04 — Phase 8 Batch 6 — Reports Page + File Upload Attachments
- Agent:               CLAUDE_CODE
- Why:                 Batch 6 — 5-tab reports page with filters/CSV export + MinIO file attachments for POs and stock-in receipts
- Files added:         apps/web/src/app/api/upload/route.ts (non-tRPC multipart upload handler with manual auth, tenant guard, MinIO uploadFile)
- Files modified:      apps/web/src/app/[tenantSlug]/reports/page.tsx (rewrite: 5 tabs — stock movements, low stock, inventory snapshot, product history, admin audit trail; CSV export; role-gated audit tab)
                       apps/web/src/app/[tenantSlug]/purchase-orders/page.tsx (async form submit: upload file to /api/upload before mutation; attachmentUrl state)
                       apps/web/src/app/[tenantSlug]/purchase-orders/[id]/page.tsx (attachment download button: enabled:false query + refetch pattern → window.open)
                       apps/web/src/app/[tenantSlug]/stock-in/page.tsx (delivery receipt upload in form; fetchingAttachmentId state + useEffect for list download; Receipt column in list table)
                       apps/web/src/server/trpc/routers/purchase-order.router.ts (attachmentUrl field in create input/data; new getAttachmentUrl query)
                       apps/web/src/server/trpc/routers/stock-in.router.ts (new getAttachmentUrl query)
                       apps/web/src/server/trpc/routers/report.router.ts (inventorySnapshot + inventorySummary additions; removed unnecessary type assertions)
- Files deleted:       none
- Schema/migrations:   none (attachmentUrl already in PurchaseOrder and StockIn schema)
- Errors encountered:  reports/page.tsx: audit log field used wrong names action/entity (correct: actionType/entityType); upload/route.ts: session.user.tenantId not typed; unnecessary ! assertions flagged by ESLint
- Errors resolved:     Fixed field names; cast session.user via Record<string,unknown>; ran next lint --fix to auto-remove unnecessary assertions

## 2026-04-04 — Phase 8 Batch 5 — Serial Tracking + Printable Stock-Out Slip
- Agent:               CLAUDE_CODE
- Why:                 Batch 5 — serial number lifecycle end-to-end (stock-in entry, stock-out selection, product view) + printable SO slip
- Files added:         none
- Files modified:      apps/web/src/server/trpc/routers/stock-out.router.ts (added serialsForProduct query; updated list includes for releasedByUser + item product details; create validates serial count + ownership, marks serials issued in transaction)
                       apps/web/src/server/trpc/routers/product.router.ts (added serialsByProductId paginated query with status filter)
                       apps/web/src/server/trpc/routers/purchase-order.router.ts (listReceivable: added serialTrackingEnabled to items' product select)
                       apps/web/src/app/[tenantSlug]/stock-in/page.tsx (serial entry panel per item: chip display, scan/type input, Enter key, count progress, serialsValid gate on submit)
                       apps/web/src/app/[tenantSlug]/stock-out/page.tsx (SerialPicker sub-component with checkbox list of in_stock serials; PrintSlipModal with window.print(); SlipRecord interface; serialsValid gate)
                       apps/web/src/app/[tenantSlug]/products/[id]/page.tsx (SerialsTab sub-component with status filter + pagination; tab bar when serialTrackingEnabled; Serial tracked badge)
- Files deleted:       none
- Schema/migrations:   none (SerialNumber model + all relations already in schema)
- Errors encountered:  TypeScript: exactOptionalPropertyTypes: true caused { in: string[] | undefined } incompatible with Prisma where clause
- Errors resolved:     Extracted const ids = item.serialIds ?? []; and used id: { in: ids } — eliminates undefined from the type

## 2026-04-04 — Phase 8 Batch 4 — PO Detail + Stock-In PO Link
- Agent:               CLAUDE_CODE
- Why:                 Batch 4 — wire purchase order receiving flow end-to-end: PO detail shows linked receipts, stock-in auto-updates PO receivedQty and status, stock-in form has PO selector with auto-populated items
- Files added:         none
- Files modified:      apps/web/src/server/trpc/routers/purchase-order.router.ts (added listReceivable procedure; byId now includes stockIns relation)
                       apps/web/src/server/trpc/routers/stock-in.router.ts (create transaction now propagates receivedQty increments to PurchaseOrderItem and auto-updates PO status: ordered→partially_received→received)
                       apps/web/src/app/[tenantSlug]/stock-in/page.tsx (added PO dropdown with auto-populate remaining items, purchaseOrderId passed in mutation, Linked PO column in list)
                       apps/web/src/app/[tenantSlug]/purchase-orders/[id]/page.tsx (added Receipts section showing linked stock-in records)
- Files deleted:       none
- Schema/migrations:   none (PurchaseOrderItem.receivedQty and StockIn.purchaseOrderId already in schema)
- Errors encountered:  none
- Errors resolved:     none

## 2026-04-04 — Phase 8 Batch 3 — Admin Foundations
- Agent:               CLAUDE_CODE
- Why:                 Batch 3 of iterative buildout — implement core admin CRUD that was scaffolded read-only
- Files added:         none
- Files modified:      apps/web/src/app/[tenantSlug]/products/page.tsx (create/edit form, admin-only actions, Decimal conversion, role gating via useSession)
                       apps/web/src/app/[tenantSlug]/users/page.tsx (create + inline edit + disable/enable + role assignment + search + pagination — full rewrite from read-only)
                       apps/web/src/app/[tenantSlug]/purchase-orders/page.tsx (create form with dynamic line items, supplier dropdown, product selector, auto-fill supplierCostSnapshot, order total preview, supplier name in list)
- Files deleted:       none
- Schema/migrations:   none
- Errors encountered:  TypeScript: session.user.role not in type (no next-auth module augmentation); product list type excludes supplierCost for warehouse_staff branch
- Errors resolved:     Used (session?.user as { role?: string })?.role cast; accessed supplierCost via (product as Record<string, unknown>)['supplierCost']; used 'unknown' double-cast for startEdit parameter

## 2026-04-02 — Phase 0 Bootstrap
- Agent:               BOOTSTRAP
- Why:                 Initialize project structure with all governance files
- Files added:         .clinerules, .cline/memory/lessons.md, .cline/memory/agent-log.md, .claude/settings.json, .gitignore, .nvmrc, package.json, docs/DECISIONS_LOG.md, docs/CHANGELOG_AI.md, docs/IMPLEMENTATION_MAP.md, docs/PRODUCT.md, project.memory.md, .vscode/mcp.json, .specstory/config.json, .github/skills/spec-driven-core/SKILL.md, scripts/log-lesson.sh, .vscode/tasks.json, .cline/STATE.md
- Files modified:      none
- Files deleted:       none
- Schema/migrations:   none
- Errors encountered:  none
- Errors resolved:     none

## 2026-04-03 — Phase 2 Discovery Interview
- Agent:               CLAUDE_CODE
- Why:                 Lock all technical decisions before spec file generation
- Files added:         none
- Files modified:      docs/PRODUCT.md (Phase 2 interview answers incorporated — all sections completed)
- Files deleted:       none
- Schema/migrations:   none
- Errors encountered:  none
- Errors resolved:     none

## 2026-04-03 — Phase 2.7 Spec Stress-Test
- Agent:               CLAUDE_CODE
- Why:                 Catch PRODUCT.md gaps before Phase 3 to prevent Cline halting during Phase 4
- Files added:         none
- Files modified:      docs/PRODUCT.md (7 additive edits — 5 gaps resolved)
- Files deleted:       none
- Schema/migrations:   none
- Errors encountered:  5 gaps found: missing dashboard flow, undefined impersonation enforcement,
                       undefined first-login mechanism, undefined slug collision handling,
                       undefined printableSlipNumber format
- Errors resolved:     All 5 gaps resolved with user input before Phase 3 proceeded

## 2026-04-03 — Phase 3 Spec File Generation
- Agent:               CLAUDE_CODE
- Why:                 Generate all spec files and environment configuration from confirmed PRODUCT.md
- Files added:         inputs.yml, inputs.schema.json, .env.dev, .env.staging, .env.prod, .env.example, CREDENTIALS.md (updated)
- Files modified:      docs/DECISIONS_LOG.md (port strategy, docker publish, Phase 2.7 results, first admin, first-login, slug collision, slip number decisions locked), docs/CHANGELOG_AI.md (this entry), docs/IMPLEMENTATION_MAP.md
- Files deleted:       none
- Schema/migrations:   none
- Errors encountered:  none
- Errors resolved:     none

## 2026-04-03 — Phase 4 Part 2: packages/shared + packages/api-client
- Agent:               CLAUDE_CODE
- Why:                 Generate shared TypeScript types, Zod schemas, enums, and typed tRPC api-client
- Files added:         packages/shared/package.json, packages/shared/tsconfig.json, packages/shared/src/enums/index.ts, packages/shared/src/types/index.ts, packages/shared/src/schemas/index.ts, packages/api-client/package.json, packages/api-client/tsconfig.json, packages/api-client/src/index.ts
- Files modified:      pnpm-lock.yaml
- Files deleted:       none
- Schema/migrations:   none
- Errors encountered:  tRPC httpBatchLink type incompatibility with exactOptionalPropertyTypes
- Errors resolved:     Used conditional spread + type assertion for httpBatchLink options

## 2026-04-03 — Phase 4 Part 3: packages/db (Prisma ORM)
- Agent:               CLAUDE_CODE
- Why:                 Generate full ORM schema with all 17 entities, tenant-guard middleware, audit helper, RLS helper, and seed script
- Files added:         packages/db/package.json, packages/db/tsconfig.json, packages/db/prisma/schema.prisma, packages/db/prisma/seed.ts, packages/db/src/index.ts, packages/db/src/context.ts, packages/db/src/audit.ts, packages/db/src/rls.ts, packages/db/src/middleware/tenant-guard.ts, .npmrc
- Files modified:      package.json (removed ignoredBuiltDependencies from pnpm config), pnpm-lock.yaml
- Files deleted:       none
- Schema/migrations:   prisma/schema.prisma — 17 models, 8 enums, all relations, tenant-scoped indexes
- Errors encountered:  pnpm 10 blocked Prisma postinstall via build script approval; approve-builds interactive mode added to ignoredBuiltDependencies instead of allowed
- Errors resolved:     Removed ignoredBuiltDependencies from package.json; onlyBuiltDependencies in package.json + .npmrc resolves approval; ran npx prisma generate directly

## 2026-04-03 — Phase 4 Part 4: packages/ui + packages/jobs + packages/storage
- Agent:               CLAUDE_CODE
- Why:                 Scaffold UI component library, job queue system, and file storage package
- Files added:         packages/ui/ (package.json, tsconfig.json, 16 shadcn/ui components, cn() utility, globals.css), packages/jobs/ (package.json, tsconfig.json, connection.ts, queue definitions, worker factories, scheduler, tenant-prefixed cache helpers), packages/storage/ (package.json, tsconfig.json, S3 client, MIME validation, upload/download/delete operations)
- Files modified:      pnpm-lock.yaml
- Files deleted:       none
- Schema/migrations:   none
- Errors encountered:  exactOptionalPropertyTypes conflict with DropdownMenu checked prop; HTMLTableCellElement missing (no DOM lib); mixed ?? and || operators
- Errors resolved:     Added default value for checked prop; added DOM lib to ui tsconfig; parenthesized mixed operators

## 2026-04-03 — Phase 4 Part 1: Root Config Files
- Agent:               CLAUDE_CODE
- Why:                 Generate monorepo root config files — foundation for all subsequent Parts
- Files added:         pnpm-workspace.yaml, turbo.json, tsconfig.base.json, .editorconfig, .prettierrc, .eslintrc.js, pnpm-lock.yaml
- Files modified:      package.json (replaced placeholder scripts with Turborepo-delegating scripts, added devDependencies), .nvmrc (20 → 22), .gitignore (added skills node_modules entry, removed STATE.md entry per CLAUDE.md)
- Files deleted:       none
- Schema/migrations:   none
- Errors encountered:  none
- Errors resolved:     none

## 2026-04-03 — Docker Hub Pipeline (between Parts 3–4)
- Agent:               CLAUDE_CODE
- Why:                 Enable Docker Hub image publishing pipeline per inputs.yml docker.publish: true
- Files added:         .github/workflows/docker-publish.yml, apps/web/.dockerignore, apps/web/Dockerfile, deploy/compose/push.sh
- Files modified:      docs/DECISIONS_LOG.md (Docker image publishing decision updated), inputs.yml (docker section updated)
- Files deleted:       none
- Schema/migrations:   none
- Errors encountered:  none
- Errors resolved:     none

## 2026-04-03 — Phase 4 Part 5: Next.js Web App Scaffold
- Agent:               CLAUDE_CODE
- Why:                 Scaffold full Next.js 15 App Router web app with tRPC, Auth.js v5, multi-tenant routing
- Files added:         apps/web/ (package.json, tsconfig.json, next.config.ts, Dockerfile, .dockerignore, postcss.config.js, tailwind.config.ts, src/env.ts, src/middleware.ts, src/server/auth/index.ts, src/server/trpc/context.ts, src/server/trpc/trpc.ts, src/server/trpc/router.ts, src/server/lib/rate-limit.ts, src/server/lib/sanitize.ts, src/server/trpc/middleware/rbac.ts, src/server/trpc/routers/ (9 tenant-scoped + 1 platform), src/app/ (layout, login, health, 8 tenant-scoped pages), src/components/providers.tsx, src/lib/trpc.ts)
- Files modified:      pnpm-lock.yaml
- Files deleted:       none
- Schema/migrations:   none
- Errors encountered:  ~80 TypeScript errors (tRPC middleware type narrowing, Auth.js session cast, Prisma enum case, exactOptionalPropertyTypes, TS2742 declaration emit); 16 ESLint errors; 7 typecheck regressions from lint fix
- Errors resolved:     Non-null assertions with eslint-disable for tRPC ctx narrowing gap; unknown intermediate casts for Auth.js; lowercase enum values; explicit field construction for updates; declaration:false in tsconfig; eslint-disable + ! pattern for ESLint/tsc disagreement

## 2026-04-03 — Phase 4 Part 7: tools/ + deploy/compose/ + SocratiCode artifacts
- Agent:               CLAUDE_CODE
- Why:                 Generate Docker Compose infrastructure (all 3 envs), validation tools, COMMANDS.md, and SocratiCode artifacts
- Files added:         deploy/compose/dev/ (docker-compose.db.yml, .cache.yml, .storage.yml, .infra.yml, .app.yml, .pgadmin.yml, pgadmin-servers.json), deploy/compose/stage/ (docker-compose.db.yml, .cache.yml, .storage.yml, .app.yml, .pgadmin.yml, pgadmin-servers.json), deploy/compose/prod/ (docker-compose.db.yml, .cache.yml, .storage.yml, .app.yml, .pgadmin.yml, pgadmin-servers.json), deploy/compose/start.sh, tools/validate-inputs.mjs, tools/check-env.mjs, tools/check-product-sync.mjs, tools/hydration-lint.mjs, COMMANDS.md, .socraticodecontextartifacts.json
- Files modified:      docs/CHANGELOG_AI.md, docs/IMPLEMENTATION_MAP.md
- Files deleted:       none
- Schema/migrations:   none
- Errors encountered:  none
- Errors resolved:     none

## 2026-04-03 — Phase 4 Part 8: CI + Governance + MANIFEST.txt
- Agent:               CLAUDE_CODE
- Why:                 Generate CI workflow, MANIFEST.txt, and finalize Phase 4 scaffold
- Files added:         .github/workflows/ci.yml, MANIFEST.txt
- Files modified:      docs/CHANGELOG_AI.md, docs/IMPLEMENTATION_MAP.md, .cline/STATE.md
- Files deleted:       none
- Schema/migrations:   none
- Errors encountered:  none
- Errors resolved:     none

## 2026-04-03 — Phase 5: Validation
- Agent:               CLAUDE_CODE
- Why:                 Run all 9 validation commands and fix failures to confirm scaffold integrity
- Files added:         none
- Files modified:      package.json (pnpm.overrides for @types/react ^19.2.14), apps/web/src/app/login/page.tsx (Suspense boundary for useSearchParams), ~50 files across apps/web/src/ and packages/ (removed invalid .js extension imports)
- Files deleted:       none
- Schema/migrations:   none
- Errors encountered:  (1) pnpm build failed — .js extension imports invalid for Next.js webpack bundler; (2) pnpm typecheck failed — duplicate @types/react v18 vs v19 from lucide-react peer dep; (3) pnpm build failed — useSearchParams() requires Suspense boundary in Next.js 15
- Errors resolved:     (1) Removed all .js extensions from imports across apps/web and packages/; (2) Added pnpm overrides to force @types/react@^19.2.14; (3) Wrapped login page in Suspense with LoginForm inner component

## 2026-04-03 — Phase 8 Batch 1: Dashboard + Barcode + CSV + Low Stock
- Agent:               CLAUDE_CODE
- Why:                 Implement first batch of Phase 8 iterative features — dashboard visualizations, barcode scanning, CSV export, low stock alerts
- Files added:         apps/web/src/lib/csv-export.ts, apps/web/src/components/barcode-scanner.tsx
- Files modified:      apps/web/src/app/[tenantSlug]/dashboard/page.tsx (recharts KPI charts — bar, line, pie, area), apps/web/src/app/[tenantSlug]/stock-in/page.tsx (BarcodeScanner + create form), apps/web/src/app/[tenantSlug]/stock-out/page.tsx (BarcodeScanner + create form), apps/web/src/app/[tenantSlug]/reports/page.tsx (CSV export for movements + low stock), apps/web/package.json (added recharts, html5-qrcode)
- Files deleted:       none
- Schema/migrations:   none
- Errors encountered:  none
- Errors resolved:     none

## 2026-04-03 — Phase 8 Batch 2: Supplier CRUD + Adjustment Form + Audit Filtering
- Agent:               CLAUDE_CODE
- Why:                 Implement second batch — supplier create/edit/deactivate forms, stock adjustment form with barcode scanner and reason enum, audit log filtering by entity type and date range
- Files added:         none
- Files modified:      apps/web/src/app/[tenantSlug]/suppliers/page.tsx (added create/edit form with all fields, inline edit via startEdit(), activate/deactivate toggle per row), apps/web/src/app/[tenantSlug]/adjustments/page.tsx (added create form with reason dropdown, BarcodeScanner product search, pending items table with delta input and result preview, negative stock warning), apps/web/src/app/[tenantSlug]/audit-logs/page.tsx (added filter bar: entity type dropdown, start/end date pickers, clear button, entry count with filtered indicator, pagination controls, color-coded action badges)
- Files deleted:       none
- Schema/migrations:   none
- Errors encountered:  none
- Errors resolved:     none

## 2026-04-03 — Phase 6: Docker Startup + Visual QA
- Agent:               CLAUDE_CODE
- Why:                 Start all Docker backing services, run Prisma migration + seed, start app, verify Visual QA
- Files added:         packages/db/prisma/migrations/20260403121528_init/ (migration.sql)
- Files modified:      .env.dev (added STORAGE_PORT=44877, fixed PGADMIN_EMAIL to admin@inventorize.dev), deploy/compose/dev/docker-compose.storage.yml (fixed STORAGE_PORT interpolation), deploy/compose/dev/docker-compose.pgadmin.yml (removed cross-file depends_on), deploy/compose/dev/docker-compose.app.yml (removed cross-file depends_on), apps/web/src/middleware.ts (rewrote to use getToken() from next-auth/jwt — Edge Runtime compatible, no Prisma dependency), apps/web/src/server/auth/index.ts (added trustHost: true for dev)
- Files deleted:       none
- Schema/migrations:   20260403121528_init — 17 tables, 8 enums, all indexes, initial migration
- Errors encountered:  (1) docker-compose.storage.yml bash parameter expansion invalid in compose; (2) docker-compose.pgadmin.yml cross-file depends_on invalid; (3) pgAdmin rejected .local TLD email; (4) middleware.ts imports Prisma via auth() wrapper — crashes in Edge Runtime; (5) Auth.js UntrustedHost error on localhost; (6) Prisma engine binary not copied to standalone output
- Errors resolved:     (1) Added STORAGE_PORT env var, replaced interpolation; (2) Removed cross-file depends_on, rely on start.sh ordering; (3) Changed PGADMIN_EMAIL to admin@inventorize.dev + recreated pgadmin volume; (4) Rewrote middleware to use getToken() from next-auth/jwt (Edge-compatible); (5) Added trustHost: true to NextAuth config; (6) Copied libquery_engine + schema.prisma to standalone path
