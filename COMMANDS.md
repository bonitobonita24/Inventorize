# Inventorize — Command Reference

All commands run from the project root unless noted otherwise.
ENV = dev | stage | prod

---

## 🐳 Docker — Start / Stop / Rebuild

| Command | What it does |
|---|---|
| `bash deploy/compose/start.sh dev up -d` | Start all dev services (DB + cache + storage + app). App rebuilds from source. |
| `bash deploy/compose/start.sh dev down` | Stop all dev services (containers removed, volumes preserved) |
| `bash deploy/compose/start.sh dev restart` | Restart all dev services |
| `bash deploy/compose/start.sh stage up -d` | Start staging services (pulls image from Docker Hub) |
| `bash deploy/compose/start.sh prod up -d` | Start production services (pulls image from Docker Hub) |
| `docker compose --env-file .env.dev -f deploy/compose/dev/docker-compose.app.yml logs -f` | Tail app logs in real time |
| `docker compose --env-file .env.dev -f deploy/compose/dev/docker-compose.app.yml ps` | Check service health status |
| `docker compose --env-file .env.dev -f deploy/compose/dev/docker-compose.db.yml ps` | Check DB + PgBouncer health |

---

## 🧹 Docker — Clean / Clear / Reset

> These commands are destructive. Read carefully before running.

| Command | What it does | Data lost? |
|---|---|---|
| `bash deploy/compose/start.sh dev down` | Stop + remove containers | No (volumes kept) |
| `bash deploy/compose/start.sh dev down --volumes` | Stop + remove containers + volumes | YES — all DB data |
| `docker compose --env-file .env.dev -f deploy/compose/dev/docker-compose.app.yml build --no-cache` | Rebuild app image from scratch | No |
| `docker builder prune -f` | Remove all dangling build cache | No |
| `docker system prune -f` | Remove stopped containers + dangling images + cache | No |
| `docker system prune -a -f --volumes` | Remove everything including volumes | YES — all data |
| `docker volume rm inventorize_dev_postgres_data` | Remove dev PostgreSQL volume only | YES — dev DB data |
| `docker volume rm inventorize_dev_valkey_data` | Remove dev Valkey volume only | YES — dev cache |
| `docker volume rm inventorize_dev_minio_data` | Remove dev MinIO volume only | YES — dev files |
| `docker volume ls` | List all Docker volumes | — |

**Full dev environment reset (nuclear — wipes all dev data and rebuilds):**
```bash
bash deploy/compose/start.sh dev down --volumes
docker builder prune -f
bash deploy/compose/start.sh dev up -d
pnpm db:migrate
pnpm db:seed
```

---

## 📦 Docker — Image Build & Push (Manual Pipeline)

| Command | What it does |
|---|---|
| `bash deploy/compose/push.sh dev` | Build app image from source, run tests, push dev tags to Docker Hub |
| `bash deploy/compose/push.sh staging` | Re-tag last dev image as staging, push to Docker Hub |
| `bash deploy/compose/push.sh prod` | Re-tag last staging image as production, push to Docker Hub |
| `docker pull bonitobonita24/inventorize:staging-latest` | Pull staging image on staging server |
| `docker pull bonitobonita24/inventorize:latest` | Pull prod image on production server |

**Tag format:**
- `:dev-latest` — latest dev build (mutable)
- `:dev-sha-{hash}` — specific dev commit (immutable)
- `:staging-latest` — latest promoted to staging (mutable)
- `:staging-sha-{hash}` — specific staging commit (immutable)
- `:latest` — current production (mutable)
- `:prod-sha-{hash}` — specific production commit (immutable)

**Rollback:** change image tag in docker-compose.app.yml → `docker compose up -d`

---

## 🗄️ Database

| Command | What it does |
|---|---|
| `pnpm db:migrate` | Run all pending Prisma migrations |
| `pnpm db:generate` | Regenerate Prisma client after schema change |
| `pnpm db:seed` | Run seed script — creates webmaster account + demo data |
| `pnpm db:studio` | Open Prisma Studio at http://localhost:44894 (visual DB browser) |

**First admin account** (created by `pnpm db:seed`):
| Field | Value |
|-------|-------|
| Username | `webmaster` |
| Password | See CREDENTIALS.md under "First Admin Account" |
| URL | http://localhost:44884/login |

---

## 🧪 Testing

| Command | What it does |
|---|---|
| `pnpm test` | Run all tests (unit + integration) |
| `pnpm test --passWithNoTests` | No-fail if no test files yet |

---

## 🔍 Code Quality

| Command | What it does |
|---|---|
| `pnpm lint` | ESLint across all packages |
| `pnpm typecheck` | TypeScript type check (tsc --noEmit) |
| `pnpm format` | Prettier format all files |
| `pnpm build` | Full production build via Turborepo |
| `pnpm audit --audit-level=high` | Dependency CVE scan |

---

## Governance & Validation

| Command | What it does |
|---|---|
| `pnpm tools:validate-inputs` | Validate inputs.yml against schema |
| `pnpm tools:check-env` | Check all required env vars are set |
| `pnpm tools:check-product-sync` | Validate PRODUCT.md ↔ inputs.yml alignment + private tag check |
| `pnpm tools:hydration-lint` | Check for SSR hydration mismatches |

---

## 🌿 Git Workflow (Rule 23)

| Command | What it does |
|---|---|
| `git checkout -b feat/{slug}` | Create feature branch before any work |
| `git add -A && git commit -m "feat(module): description"` | Atomic conventional commit |
| `git checkout main && git merge --squash feat/{slug}` | Squash-merge to main |
| `git branch -d feat/{slug}` | Delete feature branch after merge |

---

## 🔌 Dev Services — URLs

| Service | URL | Credentials |
|---|---|---|
| App | http://localhost:44884 | — |
| pgAdmin | http://localhost:44881 | See CREDENTIALS.md |
| MinIO Console | http://localhost:44878 | See CREDENTIALS.md |
| MailHog | http://localhost:44880 | No auth |
| Prisma Studio | http://localhost:44894 | No auth (when running) |

> All ports are in `.env.dev` — run `cat .env.dev | grep _PORT` to see them all.

---

## 🔐 Credentials & Secrets

| Command | What it does |
|---|---|
| `cat CREDENTIALS.md` | View all credentials (gitignored — safe locally) |
| `openssl rand -base64 32 \| tr -d '\n' \| head -c 22` | Generate a 22-char password |
| `git status \| grep CREDENTIALS` | Verify CREDENTIALS.md is NOT tracked |

---

## 🛠️ Utilities

| Command | What it does |
|---|---|
| `cat .env.dev \| grep _PORT` | List all assigned ports for dev |
| `docker stats` | Live CPU/memory/network stats |
| `docker exec -it inventorize_dev_postgres psql -U inventorize_14a9799a76222619ee6426 -d inventorize_dev` | Open PostgreSQL shell |
| `docker exec -it inventorize_dev_valkey valkey-cli -a "$(grep REDIS_PASSWORD .env.dev \| cut -d= -f2)"` | Open Valkey CLI |
| `docker logs inventorize_dev_app --tail 100` | Last 100 lines of app logs |
| `pnpm turbo run build --filter=@inventorize/web` | Build only the web app |
| `git log --oneline -10` | Last 10 commits |

---

## 🔁 Common Full Workflow

```bash
# 1. Start dev environment
bash deploy/compose/start.sh dev up -d

# 2. Develop + test locally
pnpm test && pnpm typecheck && pnpm lint

# 3. When ready to push to Docker Hub (dev)
bash deploy/compose/push.sh dev

# 4. When ready for staging
bash deploy/compose/push.sh staging

# 5. When ready for production
bash deploy/compose/push.sh prod
```
