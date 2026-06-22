# Deployment Guide — LustHub

This project is fully containerized using Docker and Docker Compose. It includes the Next.js web application, the Node.js background workers (Sync), PostgreSQL, and Redis.

## Prerequisites
- [Docker](https://docs.docker.com/get-docker/) installed and running
- [Docker Compose](https://docs.docker.com/compose/install/) installed
- `.env` file configured (see `.env.example`)

---

## Environment Variables

Before running the application, make sure your `.env` file is properly configured:

```bash
cp .env.example .env
# Edit .env and fill in all required values
```

Required variables:
- `NEXT_PUBLIC_APP_URL` — full public URL (e.g., `https://lusthub.web.id`)
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `WEBHOOK_SECRET` — strong random string for webhook authentication
- `POSTGRES_PASSWORD` — required for Docker Compose DB service
- `REDIS_PASSWORD` — required for Docker Compose Redis service

Optional:
- `GEMINI_API_KEY` — if omitted, AI classification uses fallback (no crash)

---

## Running Locally / Development

Start only the dependencies (PostgreSQL and Redis):
```bash
docker compose up -d db redis
```

Generate the Prisma client and push the schema:
```bash
npx prisma generate
npx prisma db push
```

Start the web app:
```bash
npm run dev
```

Start the background workers (separate terminal):
```bash
npx ts-node workers/index.ts
```

---

## Production Deployment

### Step 1 — Pull latest code
```bash
git pull origin main
```

### Step 2 — Build images
```bash
docker compose build --no-cache
```
> Use `--no-cache` to ensure fresh builds after dependency updates.

### Step 3 — Start dependencies first
```bash
docker compose up -d db redis
```

Wait for healthchecks to pass (approximately 15 seconds):
```bash
docker compose ps  # wait for db and redis to show "healthy"
```

### Step 4 — Apply Database Schema
```bash
docker compose run --rm web npx prisma db push
```

### Step 5 — Deploy web and worker
```bash
docker compose up -d web worker
```

### Step 6 — Verify containers are healthy
```bash
docker compose ps
docker compose logs --tail=50 web
docker compose logs --tail=50 worker
```

All containers should show `Up` status. `app_web` should show `(healthy)` within 60 seconds.

---

## Post-Deploy Smoke Tests

Run these checks immediately after every deployment. All must return the expected result before announcing the deploy complete.

| Check | Command / URL | Expected |
|---|---|---|
| Health endpoint | `curl -sf https://lusthub.web.id/api/health` | `{"status":"ok",...}` |
| Homepage | `curl -sf -o /dev/null -w "%{http_code}" https://lusthub.web.id/` | `200` |
| Sitemap index | `curl -sf -o /dev/null -w "%{http_code}" https://lusthub.web.id/sitemap.xml` | `200` |
| Sitemap segment 0 | `curl -sf -o /dev/null -w "%{http_code}" https://lusthub.web.id/sitemap/0` | `200` |
| Robots.txt | `curl -sf https://lusthub.web.id/robots.txt` | Contains `Disallow: /api/` |
| OG image | `curl -sf -o /dev/null -w "%{http_code}" https://lusthub.web.id/opengraph-image` | `200` |
| Category page | `curl -sf -o /dev/null -w "%{http_code}" https://lusthub.web.id/category/japanese` | `200` |
| Watch redirect | `curl -sI https://lusthub.web.id/watch?v=TESTID \| grep -i location` | `/watch/TESTID` |
| Video redirect | `curl -sI https://lusthub.web.id/video/TESTID \| grep -i location` | `/watch/TESTID` (via 301) |

---

## Rollback Procedure

### Option A — Quick rollback (if previous container image still present)

```bash
# 1. Stop current containers
docker compose down

# 2. Check available images
docker images | grep app_web

# 3. Tag the broken image for reference
docker tag app_web:latest app_web:broken-$(date +%Y%m%d-%H%M)

# 4. Restore previous image (if you tagged it before deploy)
# docker tag app_web:prev app_web:latest

# 5. Restart with previous image
docker compose up -d
```

### Option B — Code rollback (recommended)

```bash
# 1. Revert to previous commit
git log --oneline -5  # find the good commit hash
git revert HEAD       # or: git checkout <commit-hash>

# 2. Rebuild and redeploy
docker compose build --no-cache
docker compose up -d web worker

# 3. Run smoke tests again
```

### Pre-Deploy Image Tagging (Best Practice)

Before any deploy, tag the current running image:
```bash
docker tag app_web:latest app_web:backup-$(date +%Y%m%d)
```
This allows fast rollback without a full rebuild.

---

## Cloudflare Configuration (if using Cloudflare proxy)

### After every deployment — purge cache:
```bash
# Via Cloudflare API (replace ZONE_ID and API_TOKEN):
curl -X POST "https://api.cloudflare.com/client/v4/zones/{ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer {API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

Or via Cloudflare Dashboard: **Caching → Configuration → Purge Everything**

### Recommended Cloudflare Page Rules:

| Rule | Action |
|---|---|
| `lusthub.web.id/api/*` | Cache Level: Bypass |
| `lusthub.web.id/sitemap*` | Cache Level: Cache Everything, TTL: 1 hour |
| `lusthub.web.id/_next/static/*` | Cache Level: Cache Everything, TTL: 1 year |

### /watch?v= → /watch/{id} redirect (Cloudflare):

Since Next.js cannot 301-redirect query-param routes natively, add this Cloudflare Redirect Rule:
```
IF: Request URI Query String contains "v="
AND: URI Path equals "/watch"
THEN: Redirect URL to: https://lusthub.web.id/watch/${http.request.uri.query.split("v=")[1]}
Type: 301 Permanent
```

This ensures the legacy `/watch?v={id}` URLs send a true HTTP 301 (not 307/308) to crawlers, maximizing SEO equity transfer.

---

## Container Memory Limits

Current limits (see `docker-compose.yml`):

| Service | Limit | Notes |
|---|---|---|
| `db` (PostgreSQL) | 512MB | Increase to 1g on servers with >4GB RAM |
| `redis` | 128MB | Includes 96MB Redis maxmemory + OS overhead |
| `web` (Next.js) | 512MB | Increase to 1g under heavy traffic |
| `worker` | 256MB | Sufficient for BullMQ + Gemini API calls |

To increase a limit, edit `docker-compose.yml`:
```yaml
web:
  mem_limit: 1g
  memswap_limit: 1g
```

---

## Monitoring

### Check container health status:
```bash
docker inspect app_web --format='{{.State.Health.Status}}'
# Expected: healthy
```

### Watch live logs:
```bash
docker compose logs -f web       # Next.js app logs
docker compose logs -f worker    # Sync worker logs
```

### Check sync job status (PostgreSQL):
```bash
docker compose exec db psql -U appuser -d appdb -c "SELECT * FROM sync_jobs ORDER BY created_at DESC LIMIT 5;"
```
