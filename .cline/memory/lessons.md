# Lessons Memory — Spec-Driven Platform V26
# Entry format: ## YYYY-MM-DD — [ICON] [Title]
# Types: 🔴 gotcha | 🟡 fix | 🟤 decision | ⚖️ trade-off | 🟢 change
# READ ORDER: 🔴 first → 🟤 second → rest by relevance
# ---

## BOOTSTRAP — 🔴 WSL2 + Docker Desktop known pitfalls
- Type:      🔴 gotcha
- Phase:     Phase 0 Bootstrap / Phase 1 dev environment open
- Files:     .env.dev, docker-compose.*.yml, .nvmrc
- Concepts:  wsl2, docker-desktop, pnpm, nvm, permissions
- Narrative: Real failures on WSL2 + Docker Desktop. All fixes baked into Bootstrap template.
  (1) Never use corepack enable — use npm install -g pnpm. corepack symlinks fail in some WSL2 setups.
  (2) pnpm install must run from WSL2 terminal — not Windows PowerShell or CMD.
  (3) Docker Desktop must be running before any docker compose command. Check with: docker ps.
  (4) Port conflicts: dev services use non-standard random ports (Rule 22). If conflict occurs,
      regenerate ports in inputs.yml → run Phase 7 → restart services.
  (5) nvm must be sourced in .bashrc — add: [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  (6) WSL2 file permissions: always develop inside WSL2 filesystem (/home/user/) not /mnt/c/.
      Working in /mnt/c/ causes severe pnpm and docker performance issues.

## 2026-04-04 — 🟡 BullMQ Job<T> type not resolvable in apps/web without direct dep
- Type:      🟡 fix
- Phase:     Phase 8 Batch 7
- Files:     apps/web/package.json, apps/web/src/server/workers/*.ts
- Concepts:  bullmq, typescript, monorepo, peer deps
- Narrative: Importing `Job` from 'bullmq' in apps/web worker files failed typecheck with
  TS2307 "Cannot find module 'bullmq'". bullmq is a dep of @inventorize/jobs but is not
  automatically available to apps/web in the pnpm workspace (no hoisting by default).
  Fix: add bullmq as a direct dependency of apps/web with `pnpm add bullmq` inside apps/web.

## 2026-04-04 — 🟡 noUncheckedIndexedAccess fires on provably non-empty array access
- Type:      🟡 fix
- Phase:     Phase 8 Batch 7
- Files:     apps/web/src/server/workers/low-stock-processor.ts
- Concepts:  typescript, noUncheckedIndexedAccess, array access
- Narrative: Accessing lowStock[0].id after an early `continue` guard for lowStock.length === 0
  still triggers TS2532 "Object is possibly undefined" because tsconfig has
  noUncheckedIndexedAccess: true and tsc cannot narrow through the length guard.
  Fix: use the non-null assertion lowStock[0]! with a comment explaining the invariant.
  Alternative: use `lowStock.at(0)` which returns T | undefined and requires explicit
  null-check, but adds noise. Non-null assertion with comment is clearer here.
# ---
