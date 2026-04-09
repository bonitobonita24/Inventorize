# Decisions Log — Spec-Driven Platform V26
# Format: ## YYYY-MM-DD — [Decision title]
# Types: 🟤 decision | ⚖️ trade-off
# Never re-ask anything listed here. These are locked decisions.
# ---

## Dev Environment Mode
- Type:      🟤 decision
- Date:      2026-04-02
- Decision:  MODE A — WSL2 native (the only supported mode as of V25)
- Rationale: Devcontainer adds 4 virtualisation layers on WSL2 + Docker Desktop causing
             permission errors, shell server crashes, and socket failures. WSL2 native eliminates all of this.
             Docker Desktop provides the Docker socket to WSL2 natively. No DinD needed.
- Locked:    yes — do not re-ask or scaffold devcontainer files.

---

## Git Branching Strategy
- Type:      🟤 decision
- Date:      2026-04-02
- Decision:  feat/{slug}, scaffold/part-{N}, squash-merge
- Rationale: Phase 4 uses part-by-part execution (Rule 24). Each Part gets its own branch.
             Feature branches use feat/{slug}. Never commit directly to main.
- Locked:    yes — follows Rule 23

---

## Model Routing
- Type:      🟤 decision
- Date:      2026-04-02
- Decision:  Planning/execution/governance model assignments
- Rationale: Planning: claude-code (Phase 2) or minimax-m2.5 (Cline)
             Execution: minimax-m2.5 (default — free tier, Cline via OpenRouter)
             Governance: gemini-2.5-flash-lite (cheapest, non-critical writes)
- Locked:    yes — follows Rule 24

---

## Port Strategy (Phase 3)
- Type:      🟤 decision
- Date:      2026-04-03
- Decision:  Non-standard random ports for all dev services. Base: 44874.
             DB=44874, PgBouncer=44875, Redis=44876, MinIO=44877, MinIO Console=44878,
             MailHog SMTP=44879, MailHog UI=44880, pgAdmin=44881, App=44884, Worker=44885, Studio=44894
- Rationale: Rule 22 — unique random ports per project prevent conflicts on developer machines.
             Standard ports (5432, 6379, etc.) reserved for staging/prod.
- Locked:    yes — regenerating ports requires updating all env files and restarting services.

---

## Docker Image Publishing
- Type:      🟤 decision
- Date:      2026-04-03 (updated)
- Decision:  docker.publish: true — Docker Hub pipeline enabled.
- Registry:  docker.io (Docker Hub)
- Repository: bonitobonita24/inventorize
- Image name: inventorize
- Tags:      latest (main branch) + sha-{short} (every push)
- Platforms: linux/amd64, linux/arm64
- Trigger:   push to main (GitHub Actions) + manual promotion (push.sh)
- Rationale: User corrected original decision — Docker Hub publishing is required.
- Secrets needed in GitHub repo:
    DOCKERHUB_USERNAME — Docker Hub username (bonitobonita24)
    DOCKERHUB_TOKEN    — Docker Hub access token (not password)
- GitHub Actions variable needed:
    DOCKER_IMAGE_NAME  — inventorize
- Locked:    yes

---

## Spec Stress-Test (Phase 2.7)
- Type:      🟤 decision
- Date:      2026-04-03
- Decision:  vibe_test.enabled: true — Phase 2.7 spec stress-test enabled.
- Rationale: Found 5 PRODUCT.md gaps before Phase 3: dashboard flow, impersonation enforcement,
             first-login mechanism, slug collision handling, printableSlipNumber format. All resolved.
- Locked:    yes — Phase 2.7 auto-runs before Phase 3 on any future spec update.

---

## First Admin Account
- Type:      🟤 decision
- Date:      2026-04-03
- Decision:  Username: webmaster, Role: super_admin. Password: AI-generated 22-char, stored in CREDENTIALS.md.
             Seeded by pnpm db:seed. Exists in ALL environments (dev, staging, prod).
- Rationale: App cannot be accessed without an initial admin account. Bootstrap credential gate (Step 18).
- Locked:    yes — never hardcode password in seed script. Always read from CREDENTIALS.md.

---

## Tenant First-Login Mechanism
- Type:      🟤 decision
- Date:      2026-04-03
- Decision:  One-time setup token via /auth/setup?token=[token]. 24h expiry, single-use, stored as hash
             in VerificationToken table (Auth.js v5 compatible). Invalidated on use or expiry.
- Rationale: Phase 2.7 GAP 3 — welcome email login mechanism was undefined. Chosen: option A (password
             reset link) as it avoids sending a temporary plaintext password via email.
- Locked:    yes

---

## Tenant Slug Collision Handling
- Type:      🟤 decision
- Date:      2026-04-03
- Decision:  Auto-generate slug from tenant name (lowercased, special chars → hyphens). Editable field
             shown pre-filled. Real-time uniqueness check as super_admin types. Inline error on collision.
             Slug is permanent once tenant is created.
- Rationale: Phase 2.7 GAP 4 — slug collision handling was undefined. Chosen: editable field + inline
             error as it provides the most transparent UX without blocking the entire form.
- Locked:    yes

---

## StockOut Slip Number Format
- Type:      🟤 decision
- Date:      2026-04-03
- Decision:  Format: 'SO-' + zero-padded 5-digit sequential per tenant. e.g. SO-00001, SO-00002.
             Auto-generated at creation, immutable, unique per tenant. Counter never resets.
- Rationale: Phase 2.7 GAP 5 — printableSlipNumber format was undefined. Standard slip number
             format requested for warehouse operations.
- Locked:    yes

## Payment Gateway
- Type:      🟤 decision
- Date:      2026-04-09
- Decision:  Xendit is the platform-wide payment gateway. Multi-currency (PHP, USD, IDR).
             Subscription billing via Xendit invoices. Webhook verification via x-callback-token
             (constant-time comparison). Card data never touches our server — Xendit handles PCI-DSS.
             Test keys for dev/staging, live keys for production only.
- Rationale: Framework default for SEA markets. Powerbyte operates in PH. Xendit supports all
             required payment methods (cards, e-wallets, bank transfer, OTC).
- Locked:    yes

## Shared Global Data
- Type:      🟤 decision
- Date:      2026-04-09
- Decision:  SubscriptionPlan is shared global data (no tenantId). Plans are created/managed by
             super_admin and visible to all tenants. TenantSubscription, Payment, and Refund are
             tenant-scoped (have tenantId).
- Rationale: Subscription plans are platform-level configuration, not tenant business data.
             Each tenant selects from the same plan catalog.
- Locked:    yes

## Bot Protection
- Type:      🟤 decision
- Date:      2026-04-09
- Decision:  Cloudflare Turnstile enabled on all public-facing forms (/login, /register,
             /reset-password). Managed mode. Free tier: 1 widget, prod domain only as hostname.
             Dev and staging use Cloudflare official test keys (no real widget needed).
             Server-side siteverify validation mandatory.
- Rationale: Framework default bot protection. Free tier sufficient. WCAG 2.2 AAA compliant.
             No CAPTCHA friction for real users.
- Locked:    yes

## Deployment Model (Komodo + Traefik)
- Type:      🟤 decision
- Date:      2026-04-09
- Decision:  Staging: Komodo auto_update: true — polls Docker Hub for new :staging-latest digests,
             auto-redeploys. Production: Komodo auto_update: false — human clicks Deploy in Komodo UI
             after verifying staging. Traefik reverse proxy on staging + prod for automatic HTTPS.
             App service uses Traefik labels, no host port exposure. Dev compose unchanged.
             TRAEFIK_NETWORK=proxy. No webhooks needed for recommended deployment path.
- Rationale: V27 deployment model. Docker Hub is the handoff point between CI and deployment.
             Eliminates webhook complexity. Human gate on production deploys.
- Locked:    yes
