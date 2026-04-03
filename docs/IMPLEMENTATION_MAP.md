# Implementation Map — Spec-Driven Platform V26
# Current build state after each phase
# ---

## Project Info
- App Name:     Inventorize
- App Slug:     inventorize
- Phase:        Phase 4 Part 4 complete — ready for Part 5
- Last Updated: 2026-04-03

---

## Phase Status
- [x] Phase 0: Bootstrap
- [ ] Phase 1: Dev Environment Setup (optional)
- [x] Phase 2: Requirements & Architecture
- [x] Phase 3: Config Generation
- [ ] Phase 4: Part-by-Part Scaffold
- [ ] Phase 5: Validation
- [ ] Phase 6: Docker Startup
- [ ] Phase 7: Feature Updates

---

## Scaffold Status (Phase 4 Parts)

### Part 1: Root Config Files
- [x] pnpm-workspace.yaml
- [x] turbo.json
- [x] tsconfig.base.json
- [x] .editorconfig
- [x] .prettierrc
- [x] .eslintrc.js

### Part 2: packages/shared + packages/api-client
- [x] packages/shared/package.json + tsconfig.json
- [x] packages/shared/src/enums/index.ts (7 enums: UserRole, TenantStatus, POStatus, SerialNumberStatus, MovementType, NotificationStatus, AdjustmentReason)
- [x] packages/shared/src/types/index.ts (17 entity interfaces + AppSession + Pagination)
- [x] packages/shared/src/schemas/index.ts (Zod schemas: create/update/filter for all entities)
- [x] packages/api-client/package.json + tsconfig.json
- [x] packages/api-client/src/index.ts (typed tRPC client factory + re-exports)

### Part 3: packages/db (Prisma)
- [x] packages/db/package.json + tsconfig.json
- [x] prisma/schema.prisma (17 models, 8 enums, full relations + tenant-scoped indexes)
- [ ] prisma/migrations/ (deferred — requires running database for migrate dev)
- [x] prisma/seed.ts (webmaster + demo tenant + demo users/suppliers/products)
- [x] src/index.ts (Prisma singleton + platformPrisma + AsyncLocalStorage tenant context)
- [x] src/context.ts (TenantContext + withTenantContext + currentTenantId/currentUserId)
- [x] src/audit.ts (L5 immutable AuditLog write helper)
- [x] src/middleware/tenant-guard.ts (L6 Prisma $allOperations extension)
- [x] src/rls.ts (L2 PostgreSQL RLS helper + rlsStatements + TENANT_SCOPED_TABLES)

### Part 4: packages/ui + packages/jobs + packages/storage
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

### Part 5: apps/[web]
- [ ] Next.js app scaffold

### Part 6: apps/[mobile]
- [ ] Expo app scaffold (skip if no mobile)

### Part 7: deploy/compose + tools
- [ ] deploy/compose/dev/
- [ ] deploy/compose/stage/
- [ ] deploy/compose/prod/
- [ ] tools/

### Part 8: CI + Governance
- [ ] .github/workflows/
- [ ] MANIFEST.txt
- [ ] SocratiCode artifacts

---

## Generated Files

### Root Config
- [x] pnpm-workspace.yaml
- [x] turbo.json
- [x] tsconfig.base.json
- [x] .editorconfig
- [x] .prettierrc
- [x] .eslintrc.js
- [x] .nvmrc
- [x] package.json

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
- [x] CREDENTIALS.md (updated with Phase 3 credentials)

### Memory & Logs
- [x] .cline/memory/lessons.md
- [x] .cline/memory/agent-log.md
- [ ] .cline/STATE.md (Phase 0)

### MCP & SpecStory
- [ ] .vscode/mcp.json
- [ ] .specstory/config.json
- [ ] .specstory/specs/v26-master-prompt.md

### Skills
- [ ] .github/skills/spec-driven-core/SKILL.md
- [ ] scripts/log-lesson.sh

### Deploy
- [ ] deploy/compose/dev/docker-compose.db.yml
- [ ] deploy/compose/dev/docker-compose.app.yml
- [ ] deploy/compose/dev/docker-compose.storage.yml
- [ ] deploy/compose/dev/docker-compose.cache.yml
- [ ] deploy/compose/dev/docker-compose.infra.yml
- [ ] deploy/compose/stage/
- [ ] deploy/compose/prod/
- [ ] deploy/compose/start.sh
