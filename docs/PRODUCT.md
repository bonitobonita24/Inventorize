# Inventorize

## App Identity
Name:           Inventorize by Powerbyte
Tagline:        Track your inventory, anytime, anywhere.
Industry:       SaaS / internal operations / inventory management
Primary users:  Platform super admin, tenant admins, warehouse staff, purchasing staff

## Problem Statement
Small and mid-size companies still track inventory in spreadsheets — leading to stock discrepancies, no audit trail, and zero visibility into stock movements. Existing inventory software is either too expensive, too complex, or requires on-premise installation. Inventorize provides a multi-tenant SaaS where each company gets its own isolated inventory workspace with barcode scanning, serial tracking, purchase orders, stock movement history, and full audit logging — all from a browser. The platform operator manages tenant onboarding, subscription billing via Xendit, and cross-tenant health monitoring from a super admin dashboard.

## Core User Flows

1. **Super admin onboards a new tenant**: Super admin opens tenant management → creates new tenant (name, slug auto-generated from name, contact email) → selects subscription plan → system provisions tenant workspace with subdirectory route (app.com/tenant-slug/) → super admin creates the tenant's first admin user account with tenant assignment → tenant admin receives welcome email → logs in and begins setup. Error: duplicate slug → block, show specific error. Error: user creation fails → roll back tenant record, show retry option.

2. **Super admin manages the platform**: Super admin views all tenants list with status (active/suspended/trial) → can suspend or reactivate a tenant → can view cross-tenant metrics (total tenants, total products across platform, active users per tenant, subscription revenue summary) → can impersonate a tenant admin for support (read-only mode, session carries isImpersonating: true, UI shows banner) → all super admin actions create AuditLog entries. Error: suspending a tenant with active users → confirm prompt before proceeding.

3. **Super admin manages subscription plans**: Super admin creates/edits subscription plans (name, price, billing cycle: monthly/yearly, currency, feature limits) → plans visible to tenants during subscription flow. Error: editing a plan with active subscribers → confirm impact before saving.

4. **Tenant subscribes or renews**: Tenant admin opens billing page → selects subscription plan → system creates Xendit invoice (multi-currency: PHP, USD, IDR, etc.) → tenant pays via Xendit payment methods → Xendit webhook confirms payment → system activates/renews subscription → creates Payment record → AuditLog. Error: payment fails → subscription remains in pending/expired state, tenant sees retry option. Error: Xendit webhook delivery fails → retry 3× with exponential backoff.

5. **Tenant requests refund**: Tenant admin submits refund request with reason → super admin reviews in platform dashboard → approves or rejects → if approved, system calls Xendit refund API → Refund record created → AuditLog. Error: Xendit refund API fails → flag for manual resolution, notify super admin.

6. **Tenant admin creates a product**: Tenant admin opens product creation form → enters productCode, barcodeValue, name, category, unit, supplierCost, markupPercent, lowStockThreshold, serialTrackingEnabled → system auto-calculates sellingPrice → save with currentQuantity = 0 → AuditLog created with tenantId. All data scoped to tenant automatically via RLS. Error: duplicate productCode within tenant → block save. Error: duplicate barcodeValue within tenant → block save.

7. **Tenant admin edits a product**: Open existing product → edit allowed fields → recalculate sellingPrice if pricing changed → save → AuditLog with before/after values. Error: invalid values → block save. Note: currentQuantity never editable through this form.

8. **Tenant admin or purchasing staff creates a purchase order**: Select supplier (tenant-scoped) → add products with ordered quantities → system snapshots supplierCost → optionally upload attachment → save as "draft" → later update status (ordered → partially_received → received, or cancel) → AuditLog on create and every status change. Error: no items → block. Error: attachment upload fails → preserve PO data, allow retry.

9. **Any tenant staff records stock in**: Select product manually or scan product barcode via browser camera → enter quantity → optionally link PO → if serialTrackingEnabled, scan/enter serial numbers (count must equal quantity) → optionally upload delivery receipt → system validates → increase Product.currentQuantity atomically → create SerialNumber records as "in_stock" if serial-tracked → create StockMovementLog → AuditLog → if linked to PO, update receivedQty and PO status. Error: duplicate serial for product within tenant → block. Error: any failure → roll back entire transaction.

10. **Tenant admin or warehouse staff records stock out**: Select product manually or scan barcode → enter quantity, requestedByName, usedFor, optional notes → if serialTrackingEnabled, scan/select exact serials (must be "in_stock", count must equal quantity) → validate sufficient stock → decrease Product.currentQuantity atomically → update serial status to "issued" → StockMovementLog → AuditLog → optionally generate printable slip. Error: insufficient stock → block, show available. Error: serial not in_stock → block. Error: any failure → roll back.

11. **Tenant admin performs stock adjustment**: Enter reason and notes → select product → enter quantityDelta → if serial-tracked, identify serials → validate resulting stock not negative → apply atomically → StockMovementLog → AuditLog. approvedByUserId is optional audit trail only. Error: negative result → block. Error: any failure → roll back.

12. **Any tenant user views product history**: Open product detail → view info, current quantity, serials if enabled → view StockMovementLog → filter by date, type, user, reference. Admin sees AuditLog entries. Pricing visibility enforced by role. All data tenant-scoped — users never see other tenants' data.

13. **System runs low stock monitoring per tenant**: Daily scheduled job at 00:00 UTC checks products per tenant where currentQuantity <= lowStockThreshold → per-tenant dashboard alert → low stock report → daily email to tenant admin and purchasing_staff → LowStockNotificationLog. Error: email fails → retry 3× with exponential backoff.

14. **Any tenant user runs reports and exports**: Open dashboard or reports → apply filters (Today / This Week / This Month / Custom range) → view data per role permissions → export as CSV (max 1 year date range per export) → AuditLog for every export. All report data is tenant-scoped.

## Modules + Features

### Platform Administration (super_admin only)
- Tenant list with search, filter by status (active/suspended/trial)
- Tenant create form (name, slug auto-generated, contact email, subscription plan)
- Tenant suspend / reactivate
- Cross-tenant metrics dashboard (total tenants, total products, active users per tenant, subscription revenue)
- Tenant admin impersonation (read-only support mode, UI banner "You are viewing as [tenant name]")
- Platform-level audit log viewer
- Subscription plan management (create, edit plans)
- Refund request review and approval/rejection

### Billing (super_admin + tenant admin)
- Subscription plan selection and checkout (tenant admin)
- Xendit payment integration (invoice creation, payment confirmation via webhook)
- Payment history per tenant
- Refund request submission (tenant admin)
- Refund approval/rejection (super_admin)
- Multi-currency support (PHP, USD, IDR, etc.)

### Dashboard (per tenant)
- KPI summary cards: total active products, total stock quantity, low stock count, stock in/out counts for period, inventory value (admin/purchasing only)
- Stock In vs Stock Out bar chart by period
- Low stock alert banner
- Period selector: Today / This Week / This Month / Custom range

### Products
- Product list with search, filter, sort, pagination (tenant-scoped)
- Product create/edit form (tenant admin only)
- Product detail page with history tab
- Barcode scanning for quick product lookup
- Serial number list per product (if serial-tracked)

### Suppliers
- Supplier list with search (tenant admin and purchasing_staff)
- Supplier create/edit form (tenant-scoped)

### Purchase Orders
- PO list with status filter (tenant admin and purchasing_staff)
- PO create form with line items and attachment upload
- PO detail page with status management
- PO receiving (links to stock in)

### Stock In
- Stock in form with barcode scanning
- PO linkage (optional)
- Serial number entry for serial-tracked products
- Delivery receipt upload
- Stock in history list

### Stock Out
- Stock out form with barcode scanning
- Serial selection for serial-tracked products
- requestedByName and usedFor fields
- Printable stock out slip
- Stock out history list

### Stock Adjustments
- Adjustment form (tenant admin only)
- Reason and notes required
- Positive or negative quantity delta
- Serial identification when applicable
- Adjustment history list

### Reports
- Low Stock Report
- Stock Movement Report (filterable by date, product, type, user — max 1 year per export)
- Current Inventory Report
- Product History Report
- Audit Trail Report (tenant admin only, searchable)
- CSV export for all reports

### Audit Logs
- Searchable audit log viewer (tenant admin only — tenant-scoped)
- Filter by action type, entity, user, date

### Users
- User list (tenant admin only — shows only tenant's users)
- User create/edit/disable (no hard delete) — managed via Auth.js v5 with sessions in PostgreSQL
- Role assignment within tenant

## Roles + Permissions

| Role | Scope | Can do | Cannot do |
|------|-------|--------|-----------|
| super_admin | Platform-wide | Manage all tenants (create, suspend, reactivate). Manage subscription plans. Approve/reject refund requests. View cross-tenant metrics and revenue. Impersonate tenant admin (read-only). View platform audit logs. Create first admin user for new tenants. | Cannot modify tenant business data (products, stock, POs). Cannot create stock transactions. Cannot hard-delete tenants. |
| admin | Tenant-scoped | Manage users within own tenant (create, update, disable). Manage products (create, edit). View and update all pricing. Manage suppliers. Manage purchase orders. Create stock in/out. Create stock adjustments. View audit logs (own tenant only). View reports and export CSV. Subscribe to plans and manage billing. Request refunds. | Cannot see other tenants' data. Cannot manage platform. Cannot hard-delete users or products. Cannot directly edit currentQuantity. Cannot approve own refund requests. |
| warehouse_staff | Tenant-scoped | View products (selling price only). Create stock in. Create stock out. View stock movement logs. View reports and export CSV. | Cannot view supplierCost or markupPercent. Cannot manage users, suppliers, POs, adjustments, or billing. Cannot view audit logs. Cannot see other tenants' data. |
| purchasing_staff | Tenant-scoped | View products with all pricing. Manage suppliers. Manage purchase orders. Create stock in. View stock out (read only). View stock movement logs. View reports and export CSV. | Cannot create stock out. Cannot manage users, adjustments, or billing. Cannot view audit logs. Cannot see other tenants' data. |

## Data Entities

### Platform-level (no tenantId)
- Tenant: id, name, slug (unique, auto-generated, globally permanent), contactEmail, status (enum: active/suspended/trial), createdAt, updatedAt
- User: id, tenantId → Tenant (null for super_admin), name, email, hashedPassword, role (enum: super_admin/admin/warehouse_staff/purchasing_staff), isActive, lastLoginAt, createdAt, updatedAt
- SubscriptionPlan: id, name, priceAmount, currency, billingCycle (enum: monthly/yearly), description, isActive, createdAt, updatedAt

### Tenant-scoped (all have tenantId, enforced by RLS)
- TenantSubscription: id, tenantId → Tenant, planId → SubscriptionPlan, status (enum: active/expired/cancelled/pending), currentPeriodStart, currentPeriodEnd, xenditSubscriptionId, createdAt, updatedAt
- Payment: id, tenantId → Tenant, subscriptionId → TenantSubscription, amount, currency, status (enum: pending/paid/failed/refunded), xenditInvoiceId, xenditPaymentMethod, paidAt, createdAt
- Refund: id, tenantId → Tenant, paymentId → Payment, amount, currency, reason, status (enum: requested/approved/rejected/processed/failed), requestedByUserId → User, reviewedByUserId → User (super_admin), xenditRefundId, processedAt, createdAt, updatedAt
- Product: id, tenantId → Tenant, productCode (unique per tenant), barcodeValue (unique per tenant), name, category, unit, supplierCost, markupPercent, sellingPrice (computed), currentQuantity (system-managed), lowStockThreshold, serialTrackingEnabled, isActive, createdAt, updatedAt
- Supplier: id, tenantId → Tenant, name, contactPerson, phone, email, address, notes, isActive, createdAt, updatedAt
- PurchaseOrder: id, tenantId → Tenant, poNumber (unique per tenant), supplierId → Supplier, orderDate, expectedDate, status (enum: draft/ordered/partially_received/received/cancelled), notes, attachmentUrl, createdByUserId → User, createdAt, updatedAt
- PurchaseOrderItem: id, purchaseOrderId → PurchaseOrder, productId → Product, orderedQty, receivedQty, supplierCostSnapshot
- StockIn: id, tenantId → Tenant, referenceNumber (unique per tenant), purchaseOrderId → PurchaseOrder (optional), receivedDate, receivedByUserId → User, notes, attachmentUrl, createdAt
- StockInItem: id, stockInId → StockIn, productId → Product, quantity, supplierCostSnapshot
- StockOut: id, tenantId → Tenant, referenceNumber (unique per tenant), releasedDate, releasedByUserId → User, requestedByName, usedFor, notes, printableSlipNumber, createdAt
- StockOutItem: id, stockOutId → StockOut, productId → Product, quantity, sellingPriceSnapshot
- SerialNumber: id, tenantId → Tenant, productId → Product, serialValue, barcodeValue, status (enum: in_stock/issued/adjusted), stockInItemId → StockInItem (optional), stockOutItemId → StockOutItem (optional), createdAt, updatedAt. Unique constraint: [tenantId, productId, serialValue].
- StockAdjustment: id, tenantId → Tenant, adjustmentDate, reason, notes, createdByUserId → User, approvedByUserId → User (optional — audit trail only, not blocking), createdAt
- StockAdjustmentItem: id, stockAdjustmentId → StockAdjustment, productId → Product, quantityDelta, serialNumberId → SerialNumber (optional)
- StockMovementLog: id, tenantId → Tenant, productId → Product, movementType (enum: stock_in/stock_out/adjustment), referenceType, referenceId, quantityBefore, quantityDelta, quantityAfter, serialNumberId (optional), performedByUserId → User, requestedByName, usedFor, performedAt, notes — IMMUTABLE
- AuditLog: id, tenantId → Tenant (null for platform-level actions), actorUserId → User, actionType, entityType, entityId, fieldChangesJson, beforeStateJson, afterStateJson, createdAt — IMMUTABLE
- LowStockNotificationLog: id, tenantId → Tenant, productId → Product, notifiedToUserId → User, sentAt, status

### Key Business Rules (CRITICAL — agents must enforce)
- Product.currentQuantity is system-managed only — never directly editable
- Product.sellingPrice is always computed: supplierCost + (supplierCost × markupPercent / 100)
- Stock can never go negative — any violating transaction must be blocked
- All stock quantity changes must be atomic — full transaction rollback on any failure
- Every quantity change must create a StockMovementLog with before/after values
- Every important action must create an AuditLog entry — immutable
- All tenant-scoped data must include tenantId — enforced by RLS at database level
- Users can never see, query, or modify another tenant's data
- Unique constraints (productCode, barcodeValue, poNumber, referenceNumber, serialValue) are scoped per tenant, not globally
- Serial tracking applies only when product has serialTrackingEnabled = true
- Barcode/QR scanning is input helper only — all scanned values must pass server-side validation
- Xendit webhook callbacks must verify x-callback-token before processing (prevents spoofed payments)
- Tenant with expired/cancelled subscription retains read-only access to data but cannot create new transactions

## Integrations
- Xendit (payment gateway): subscription billing, invoice creation, payment confirmation via webhooks, refund processing — multi-currency (PHP, USD, IDR). Test + live API keys. Webhook x-callback-token verification mandatory. Docs: https://docs.xendit.co — Paid/API
- Cloudflare Turnstile (bot protection): invisible/managed challenge on login, register, password reset pages. Free tier, 1 widget, Managed mode. Dev uses official test keys. Server-side validation mandatory. Docs: https://developers.cloudflare.com/turnstile/ — Free/API
- Email (SMTP): daily low stock notification emails per tenant, welcome emails for new tenant admins, payment/subscription confirmation emails — SES in production, MailHog in dev — OSS/Paid
- No external auth service — Auth.js v5 sessions stored in PostgreSQL (white-label, zero external dependency)

## Background Jobs
- low-stock-check | scheduled daily at 00:00 UTC | checks all products per tenant where currentQuantity <= lowStockThreshold, sends email summary to tenant admin and purchasing_staff, creates LowStockNotificationLog entries | queue: notifications | retry: 3 with exponential backoff | DLQ: no (log-only)
- email-notifications | triggered on email send failure | retries failed low stock notification and payment confirmation emails | queue: notifications | retry: 3 with exponential backoff | DLQ: no (log-only)
- xendit-webhook-processor | triggered on Xendit webhook receipt | verifies x-callback-token, updates TenantSubscription/Payment/Refund status | queue: notifications | retry: 3 with exponential backoff | DLQ: no (log-only, flag for manual resolution)

## File Uploads
- Use cases: purchase order attachments, stock in delivery receipts
- Allowed types: PDF, JPG, PNG
- Max size: 10MB per file
- Store originals: yes
- Image variants: no
- Files viewable and downloadable through the app UI (not write-only)
- Storage paths:
  - Purchase orders: purchase-orders/{tenantId}/{poId}/{filename}
  - Stock in: stock-in/{tenantId}/{stockInId}/{filename}
- File downloads must verify tenantId matches storage path prefix (L2 enforcement)

## Reporting & Dashboards
### Dashboard KPIs
- Total active products
- Total current stock quantity
- Low stock item count
- Stock in count for selected period
- Stock out count for selected period
- Total inventory value (admin and purchasing_staff only)
- Subscription revenue summary (super_admin platform dashboard only)

### Period selector
- Today / This Week / This Month / Custom range

### Named Reports
- Low Stock Report
- Stock Movement Report (max 1 year date range per export)
- Current Inventory Report
- Product History Report
- Audit Trail Report (tenant admin only)

### Charts
- Summary cards (KPI numbers)
- Stock In vs Stock Out bar chart (by period)
- Tabular data with sorting, filtering, pagination

### Export
- CSV export for all reports

## Deployment Config
Environments: dev / staging / prod
Hosting:      Single VPS or managed services
Dev mode:     MODE A — WSL2 native (pre-locked)
Docker Hub:   enabled — hub_repo: bonitobonita24/inventorize

## Mobile Needs
None — web only. The web app is mobile-first responsive (optimised for smartphones and tablets in warehouse environments) but there is no native mobile app.

## Non-functional Requirements
Performance:    < 500ms API response for all CRUD operations. Stock transactions < 1s including all log writes. Tenant context resolution (slug → tenantId) < 10ms (cached). Xendit webhook processing < 2s.
Uptime:         99.5% SLA for production (SaaS — customer-facing)
Data retention: All traceability records kept minimum 7 years. Users disabled, never deleted. Tenants suspended, never deleted. Payment and refund records kept indefinitely.
Compliance:     None specific. Standard data protection practices. Cross-tenant data isolation enforced at database level via RLS. Xendit handles PCI-DSS compliance for card data.

## Tenancy Model
multi — subdirectory routing
URL pattern: app.com/[tenant-slug]/dashboard, app.com/[tenant-slug]/products, etc.
Shared global data: SubscriptionPlan (plans are global, subscriptions are tenant-scoped)
Roles: global (same role set across all tenants: admin, warehouse_staff, purchasing_staff)
DB isolation: shared schema + tenant_id column on all tenant-scoped tables + PostgreSQL RLS
DB isolation exception: none (inventory and payment data does not require separate schema)

## User-Facing URLs
/login                              public — Auth.js v5 authentication (Turnstile protected)
/register                           public — new user registration (Turnstile protected)
/reset-password                     public — password reset (Turnstile protected)
/platform/tenants                   super_admin — tenant management
/platform/plans                     super_admin — subscription plan management
/platform/refunds                   super_admin — refund request review
/platform/metrics                   super_admin — cross-tenant metrics + revenue
/platform/audit-logs                super_admin — platform audit logs
/[tenant-slug]/dashboard            tenant — main dashboard
/[tenant-slug]/billing              tenant — subscription and payment management (admin only)
/[tenant-slug]/products             tenant — product list
/[tenant-slug]/products/[id]        tenant — product detail
/[tenant-slug]/products/[id]/history tenant — product movement history
/[tenant-slug]/suppliers            tenant — supplier list
/[tenant-slug]/purchase-orders      tenant — PO list
/[tenant-slug]/purchase-orders/[id] tenant — PO detail
/[tenant-slug]/stock-in             tenant — stock receiving
/[tenant-slug]/stock-out            tenant — stock releasing
/[tenant-slug]/adjustments          tenant — stock adjustments (admin only)
/[tenant-slug]/reports              tenant — reports and exports
/[tenant-slug]/audit-logs           tenant — audit log viewer (admin only)
/[tenant-slug]/users                tenant — user management (admin only)

## Access Control
Public routes:    /login, /register, /reset-password (all Turnstile protected)
Protected routes: all other routes require authenticated session via Auth.js v5
Super-admin only: /platform/* routes
Tenant admin only: /[tenant-slug]/users, /[tenant-slug]/audit-logs, /[tenant-slug]/adjustments, /[tenant-slug]/billing
Tenant admin + purchasing: /[tenant-slug]/purchase-orders, /[tenant-slug]/suppliers
All tenant roles: /[tenant-slug]/dashboard, /[tenant-slug]/products, /[tenant-slug]/stock-in, /[tenant-slug]/stock-out, /[tenant-slug]/reports

### Tenant isolation rules
- Authenticated user's tenantId is extracted from Auth.js v5 session/JWT on every request (L1)
- Every tenant-scoped DB query is automatically filtered by tenantId via Prisma middleware (L2)
- PostgreSQL RLS provides database-level enforcement as defense-in-depth
- A user assigned to tenant A can never access routes or data for tenant B
- super_admin has no tenantId — accesses only /platform/* routes, never tenant business data directly
- Tenant middleware cross-checks URL slug against session tenantId (prevents tenant-switching attacks)

## Data Sensitivity
PII stored:       yes — user name, email, hashed password (in PostgreSQL via Auth.js v5), requestedByName
Financial data:   yes — supplierCost, markupPercent, sellingPrice, purchase order values, inventory valuation, subscription payments, refund amounts (restricted by role, scoped by tenant). Card data handled by Xendit (never touches our server — PCI-DSS compliant).
Health data:      no
Audit required:   tenant creation/suspension/reactivation, subscription plan create/edit, subscription activation/expiry/cancellation, payment success/failure, refund request/approval/rejection/processing, user creation/role changes/disabling, login events, product create/update/pricing/threshold changes, supplier create/update, PO create/update/status change, stock in, stock out, stock adjustment, serial number creation/status changes, file upload/removal, report export, notification send/failure, every quantity-affecting stock movement, super_admin impersonation events
GDPR/compliance:  no specific regulatory requirement — standard data protection. Cross-tenant data isolation enforced at DB level. 7-year retention. No hard deletes. Xendit handles PCI-DSS for payment card data.

## Security Requirements
Rate limiting:    public: 60/min per IP | authenticated: 300/min per user | upload: 10/min per user
CORS origins:     dev: localhost:* | staging: https://inventorize-staging.powerbyte.app | prod: https://inventorize.powerbyte.app
Security layers:  L1 app-layer tenant scoping (tenantId from Auth.js session/JWT) — ACTIVE
                  L2 Prisma auto-inject middleware (tenantId on every query) — ACTIVE
                  L3 RBAC tRPC middleware (role-based access on every endpoint) — ACTIVE
                  L4 PgBouncer per-tenant connection pool limits — ACTIVE
                  L5 AuditLog (immutable record on every mutation) — ACTIVE
                  L6 Prisma query guardrails (automatic data scoping via $allOperations) — ACTIVE

### Bot protection (Cloudflare Turnstile)
- Protected pages: /login, /register, /reset-password
- NOT protected: authenticated pages (use rate limiting instead)
- Mode: Managed (invisible challenge)
- Free tier: 1 widget per app, prod domain only as hostname
- Dev + staging: use Cloudflare official test keys (no account needed)
- Server-side validation mandatory — client widget alone provides no protection

### Payment security (Xendit)
- All Xendit webhook endpoints must verify x-callback-token header before processing
- Auth errors must not reveal whether accounts or tenants exist (anti-enumeration)
- Xendit API keys stored in CREDENTIALS.md (gitignored) and GitHub Secrets
- Test keys for dev/staging, live keys for production only

### Inventory-specific security
- No negative stock — enforced at database transaction level
- Audit logs immutable — no update or delete operations permitted
- Stock movement logs immutable — no update or delete operations permitted
- Tenant admin cannot view other tenants' audit logs
- Warehouse staff cannot view supplier cost or markup pricing data
- All barcode/QR scanned values must pass server-side validation
- super_admin actions are audit-logged separately at platform level
- Superadmin operations use separate router + dedicated Prisma client
- File downloads verify tenantId matches storage path prefix
- Cron jobs iterate over tenants explicitly — no unscoped queries

### Browser camera scanning
- Camera permission requested before use
- Client-side JavaScript barcode/QR library (html5-qrcode or zxing-js)
- Supported: Android Chrome, iOS Safari, laptop webcam
- Manual text input fallback always available
- Live scanner preview with clear success/error feedback
- Large tap targets for warehouse mobile use

## Domain / Base URL Expectations
Dev:     http://localhost:[port assigned by Phase 3 — do not specify a number here]
Stage:   https://inventorize-staging.powerbyte.app
Prod:    https://inventorize.powerbyte.app

## Infrastructure Notes
Default: all services run in Docker Compose — mono-server for dev/staging/prod.
Docker Hub publishing: enabled — hub_repo: bonitobonita24/inventorize
pgAdmin: included on all environments — credentials auto-generated by Phase 3
CREDENTIALS.md: generated by Phase 3 — master credentials list for all envs, strictly gitignored
Security: HTTP headers + rate limiter + DOMPurify sanitizer scaffolded by Phase 4 — always-on defaults
Spec stress-test: Phase 2.7 runs automatically before Phase 3 — catches PRODUCT.md gaps early
AWS path when ready: RDS, S3, ElastiCache, SES — update .env.{env} only, zero code changes.

### Deployment model (Komodo + Traefik — V27)
- Staging: Komodo auto_update: true — polls Docker Hub for new :staging-latest digests, auto-redeploys
- Production: Komodo auto_update: false — human clicks Deploy in Komodo UI after verifying staging
- Docker Hub is the handoff point. GitHub Actions pushes images. Komodo pulls them. No webhooks needed.
- Traefik reverse proxy on staging + prod: app service uses Traefik labels for automatic HTTPS routing
- App service does not expose host ports in staging/prod — Traefik routes via Docker internal network
- Dev compose unchanged (direct port mapping via Docker Desktop)
- TRAEFIK_NETWORK=proxy (locked decision)
- .env.staging/.env.prod: TRAEFIK_NETWORK=proxy and APP_DOMAIN env vars set by Phase 3

### Compose services (dev)
- Next.js app (web server + tRPC API)
- PostgreSQL (primary database with RLS policies — also stores Auth.js v5 sessions)
- Valkey (cache + BullMQ job queue)
- MinIO (S3-compatible file storage for uploads)
- pgAdmin (database management UI)
- PgBouncer (connection pooling with per-tenant limits)

### Production path
- Managed PostgreSQL with RLS (e.g. RDS, Supabase, or DigitalOcean Managed DB)
- S3-compatible storage (AWS S3, Cloudflare R2, or DigitalOcean Spaces)
- Managed Redis/Valkey (e.g. ElastiCache, Upstash)
- PgBouncer (connection pooling)
- Traefik reverse proxy (automatic HTTPS via Let's Encrypt)
- SES or equivalent for email notifications

## Tech Stack Preferences
Frontend framework:        Next.js
API style:                 tRPC
ORM / DB layer:            Prisma
Auth provider:             Auth.js v5 (sessions in PostgreSQL — white-label, zero external service)
Auth strategy:             authjs
Primary database:          PostgreSQL
Cache / queue:             Valkey + BullMQ
File storage:              MinIO (dev) / S3 (prod)
Payment gateway:           Xendit (test keys dev/staging, live keys prod)
Bot protection:            Cloudflare Turnstile (Managed mode, free tier)
UI component library:      shadcn/ui + Tailwind CSS (locked — no alternatives)
Chart library:             shadcn/ui Chart (Recharts) — dashboard KPIs and bar charts
Map library:               mapcn (MapLibre GL) — locked for future feature, no flows/modules yet
Complex UI components:     none — standard shadcn/ui primitives cover current scope
Icon set:                  lucide-react (shadcn/ui default — no other icon libraries)

## Design Identity
Brand feel:         professional/enterprise
Target aesthetic:   Clean, dense information layout optimised for fast warehouse operations. Minimal decorative elements. High contrast for readability in bright warehouse environments. Large tap targets and clear feedback for scanning workflows. Tenant branding kept minimal — platform-consistent UI.
Industry category:  SaaS / inventory management
Dark mode required: optional toggle (default: light mode)
Key constraint:     Mobile-first responsive layout — warehouse staff primarily use smartphones and tablets. Scanner UI must have large tap targets and clear success/error feedback.
Theming approach:   shadcn/ui CSS variables (--primary, --secondary, etc.) — customized in globals.css
                    Reference: https://ui.shadcn.com/docs/theming · Dark mode: https://ui.shadcn.com/docs/dark-mode

## Out of Scope
- Multi-warehouse support per tenant (single location per tenant, no warehouse-to-warehouse transfers)
- Approval workflows (approvedByUserId on StockAdjustment is optional audit trail only — not blocking)
- Native mobile app (web app is mobile-first responsive, not a native iOS/Android app)
- Realtime push updates or WebSocket connections
- Advanced demand forecasting or predictive analytics
- Supplier analytics or supplier performance scoring
- Complex enterprise ERP features (accounting, general ledger, HR, payroll)
- Offline-first functionality (requires internet connection)
- Public API for external integrations
- Multi-language / i18n support
- Customer self-service tenant registration (super_admin onboards tenants manually)
- Custom branding per tenant (single platform-wide look and feel)
- Tenant data export/migration tooling
- External IAM platform (no Logto, Auth0, or Clerk — Auth.js v5 handles all auth natively)
- Usage-based metering or per-transaction billing (subscription plans only)
- Custom payment gateway selection per tenant (Xendit platform-wide)
