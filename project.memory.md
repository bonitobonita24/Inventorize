# Project Memory — Spec-Driven Platform V28

## Agent Stack
1. **Claude Code** → Planning only. Write/update PRODUCT.md.
2. **Cline** → Building everything. Phase 4 Part-by-Part, Phase 5-8 on human trigger.
3. **Copilot** → Inline autocomplete. Fallback for errors.
4. **SpecStory** → Passive change capture. Auto-saves all sessions.
5. **SocratiCode** → Semantic codebase search MCP server.
6. **code-review-graph** → Structural blast-radius MCP server.

## Rules Summary (V28)

### Phase Execution
- Phase 0: Bootstrap (one-time setup)
- Phase 1: Dev environment (optional if already set up)
- Phase 2: Requirements & Architecture
- Phase 3: Config Generation
- Phase 4: Part-by-Part scaffold (8 Parts, one per session)
- Phase 5: Validation (9 checks, all must pass)
- Phase 6: Docker startup + Visual QA
- Phase 7: Feature Updates

### Key Rules
- Rule 17: Search before reading
- Rule 18: Structured lessons.md entries
- Rule 20: Strip <private> tags from PRODUCT.md
- Rule 23: Git branching — feat/{slug}, scaffold/part-{N}, squash-merge
- Rule 24: Fresh context per Phase 4 Part
- Rule 25: Two-stage code review
- Rule 29: No fuzzy reasoning
- Rule 30: Context7 live docs for libraries

### V28 Additions
- CSRF protection: tRPC + SameSite inherently resistant; Route Handlers must validate manually
- SSRF prevention: reject private IP ranges on server-side outbound fetches
- Session invalidation on role/tenant change via securityVersion field
- Tiered global rate limiting: auth ≤10/min, API ≤100/min, public ≤300/min

### Security Layers (multi-tenant)
- L1: tRPC tenantId scoping
- L2: PostgreSQL RLS
- L3: RBAC middleware
- L4: PgBouncer pool limits
- L5: AuditLog on every mutation
- L6: Prisma query guardrails

### Integrations
- Payment gateway: Xendit (subscription billing, webhooks, refunds, multi-currency PHP/USD/IDR)
- Bot protection: Cloudflare Turnstile (managed mode, free tier, test keys for dev/staging)
- Deployment: Komodo (auto-update staging, manual prod) + Traefik (reverse proxy, HTTPS)

## File Ownership
- docs/PRODUCT.md: HUMAN (only file humans edit)
- CREDENTIALS.md: AGENT/GITIGNORE
- All other files: AGENT

## Dev Environment
- MODE A: WSL2 native (only supported)
- No devcontainer
- Docker Desktop provides socket to WSL2

## Ports (Phase 3 generates)
- Non-standard random ports for dev
- Standard ports for staging/prod
