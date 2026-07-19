# GaexPay 🌍 — Cross-Platform Fintech Wallet

GaexPay is a full-stack cross-platform fintech wallet application (similar to MiniPay / Wise), built on **Next.js 16 + TypeScript + Tailwind CSS 4 + shadcn/ui + Prisma**. It ships as a single-page app with client-side view switching, backed by 30+ REST API routes, a double-entry ledger engine, an admin panel, AI assistant, marketplace, crypto trading, savings goals, KYC/KYB, and full i18n (12 languages incl. RTL).

---

## Table of Contents
1. [Quick Start (Docker)](#1-quick-start-docker)
2. [Manual VPS Setup](#2-manual-vps-setup)
3. [Environment Variables](#3-environment-variables)
4. [SSL / HTTPS Setup](#4-ssl--https-setup)
5. [Backup & Restore](#5-backup--restore)
6. [CI / CD](#6-cicd)
7. [Architecture](#7-architecture)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Quick Start (Docker)

The fastest way to run the entire stack (app + Postgres + Redis + Caddy) is via Docker Compose.

### Prerequisites
- Docker 24+ with the Compose v2 plugin
- A server with ports 80 & 443 reachable from the internet (for Let's Encrypt)
- DNS records pointing `gaexpay.com`, `www.gaexpay.com`, `admin.gaexpay.com`, `support.gaexpay.com`, `api.gaexpay.com` at your server IP

### Steps
```bash
# 1. Clone
git clone https://github.com/gaexpay/gaexpay.git
cd gaexpay

# 2. Configure environment
cp .env.example .env
$EDITOR .env        # set POSTGRES_PASSWORD, GAEXPAY_JWT_SECRET, GAEXPAY_ENC_KEY, GXP_CARD_KEK

# 3. Build & start the whole stack
docker compose up -d --build

# 4. Run database migrations + seeders
docker compose exec app bunx prisma db push --schema=prisma/schema.postgres.prisma
docker compose exec app bunx tsx prisma/seed.ts

# 5. Verify
curl -fsS https://gaexpay.com/api/health && echo OK
docker compose logs -f app
```

### Useful commands
```bash
docker compose ps                       # service status
docker compose logs -f caddy            # reverse-proxy logs (incl. ACME)
docker compose exec postgres psql -U gaexpay -d gaexpay
docker compose restart app              # zero-downtime-ish restart
docker compose down                     # stop everything (data preserved in volumes)
docker compose down -v                  # ⚠️ also deletes postgres + redis data
```

---

## 2. Manual VPS Setup

For deployments without Docker (e.g. a single VPS with Postgres installed from apt).

### Prerequisites
- Ubuntu 22.04+ or Debian 12+
- Node.js 20 LTS, Bun 1.x
- PostgreSQL 16 (or remote RDS)
- Caddy 2 (for HTTPS) — or nginx
- A dedicated `gaexpay` unix user

### Steps
```bash
# 0. System packages
sudo apt-get update
sudo apt-get install -y git curl ca-certificates build-essential \
                        postgresql-client redis-tools

# Install Bun
curl -fsSL https://bun.sh/install | bash
echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc

# Install Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 1. Create the deploy user + directory
sudo useradd --system --create-home --home /var/www/gaexpay --shell /bin/bash gaexpay
sudo -u gaexpay -H bash -lc '
  cd /var/www/gaexpay
  git clone https://github.com/gaexpay/gaexpay.git .
  cp .env.example .env
  $EDITOR .env        # fill in real secrets
'

# 2. Install deps + build
sudo -u gaexpay -H bash -lc '
  cd /var/www/gaexpay
  bun install --frozen-lockfile
  bunx prisma generate --schema=prisma/schema.postgres.prisma
  bunx prisma db push --schema=prisma/schema.postgres.prisma
  bunx tsx prisma/seed.ts
  bunx tsx prisma/seed-admin.ts
  bun run build
'

# 3. Install the systemd unit
sudo cp /var/www/gaexpay/systemd/gaexpay.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now gaexpay

# 4. (Optional) Run the deploy helper next time
sudo -u gaexpay /var/www/gaexpay/scripts/deploy-vps.sh
```

### PM2 alternative
If you prefer PM2 over systemd:
```bash
sudo npm i -g pm2
cd /var/www/gaexpay
pm2 start "node server.js" --name gaexpay --cwd .next/standalone
pm2 save
pm2 startup systemd -u root --hp /root     # enables boot-time autostart
```
Then pass `--pm2` to `scripts/deploy-vps.sh`.

---

## 3. Environment Variables

All variables are documented in [`.env.example`](./.env.example). The essential ones:

| Variable | Purpose | Example |
|---|---|---|
| `DATABASE_URL` | Postgres connection string (used by the Prisma client at runtime) | `postgresql://gaexpay:pw@localhost:5432/gaexpay?schema=public` |
| `DIRECT_URL` | Postgres connection string used for migrations / `db push` | same as above |
| `GAEXPAY_JWT_SECRET` | 32+ char hex — signs access & refresh tokens | `openssl rand -hex 32` |
| `GAEXPAY_ENC_KEY` | 32+ char hex — AES-256-GCM for PII / card PANs | `openssl rand -hex 32` |
| `GXP_CARD_KEK` | Key Encryption Key for card numbers | `openssl rand -hex 32` |
| `GXP_ALLOW_DEV_AUTH` | **MUST be `false`** in production | `false` |
| `GXP_ACCESS_TOKEN_TTL` | Access token TTL (seconds) | `900` |
| `GXP_REFRESH_TOKEN_TTL` | Refresh token TTL (seconds) | `604800` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | Transactional email (LWS Mail) | — |
| `REDIS_URL` | Redis for rate-limiting + cache | `redis://localhost:6379/0` |
| `GXP_ALLOWED_ORIGINS` | CORS allow-list | `https://gaexpay.com,https://admin.gaexpay.com` |
| `SENTRY_DSN` | Error reporting (optional) | — |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth (optional) | — |
| `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` | Facebook OAuth (optional) | — |

> ⚠️ **Never commit the real `.env`.** It is git-ignored and the CI build will fail if it appears in the tree.

---

## 4. SSL / HTTPS Setup

GaexPay uses **Caddy** in front of the Node app — Caddy provisions and renews Let's Encrypt certificates automatically.

### Docker (recommended)
`docker-compose.yml` already mounts `Caddyfile.production` and exposes `:80` + `:443`. As soon as your DNS records resolve, Caddy will fetch certs on the first HTTPS request and store them in the `caddy-data` volume.

### Manual / VPS
```bash
# 1. Install Caddy (Debian/Ubuntu)
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy

# 2. Replace the default config
sudo cp Caddyfile.production /etc/caddy/Caddyfile
sudo systemctl reload caddy

# 3. Tail logs to watch the ACME challenge
sudo journalctl -u caddy -f
```

### Testing without DNS (staging)
Comment out the `tls internal` line in `Caddyfile.production` for local testing — Caddy will issue an internal CA cert (browser warning expected) without hitting Let's Encrypt.

---

## 5. Backup & Restore

### Automated backups (cron)
```bash
# crontab -e
0 */4 * * *  /var/www/gaexpay/scripts/backup-postgres.sh >> /var/log/gaexpay-backup.log 2>&1
```

The script:
1. Runs `pg_dump` against the configured `DATABASE_URL`
2. Compresses with `gzip -9`
3. Optionally encrypts with GPG (set `GPG_RECIPIENT=user@example.com`)
4. Writes a `.manifest` sidecar (sha256, size, timestamp)
5. Prunes anything beyond the last `BACKUP_KEEP` (default 30) backups

### Restore
```bash
# Plain gzip backup
gunzip -c /var/backups/gaexpay/postgres/gaexpay-20260101-000000.sql.gz \
    | PGPASSWORD=... psql -h localhost -U gaexpay -d gaexpay

# Encrypted backup
gpg --decrypt gaexpay-20260101-000000.sql.gz.gpg | gunzip \
    | PGPASSWORD=... psql -h localhost -U gaexpay -d gaexpay
```

### Docker volume snapshots (alternative)
```bash
docker run --rm -v gaexpay-postgres-data:/data -v "$PWD":/backup alpine \
    tar czf /backup/postgres-data-$(date +%Y%m%d).tar.gz -C /data .
```

---

## 6. CI / CD

GitHub Actions (`.github/workflows/ci.yml`) runs on every PR and push to `main`:

| Trigger | Jobs |
|---|---|
| `pull_request` → `main` | `verify`: lint + typecheck + build (no push) |
| `push` → `main` | `verify` + `publish`: builds multi-arch Docker image, pushes to `ghcr.io/<owner>/gaexpay:latest` and `:sha-<short>` |

### Required GitHub secrets (for the `publish` job)
| Secret | Value |
|---|---|
| `GHCR_USER` | Your GitHub username (or org bot) |
| `GHCR_TOKEN` | A PAT with `write:packages` scope |

### Deploying from GHCR
```bash
docker pull ghcr.io/<owner>/gaexpay:latest
# Then update docker-compose.yml `image:` to point at GHCR instead of building locally.
```

---

## 7. Architecture

```
┌────────────┐   ┌─────────────┐   ┌────────────┐   ┌──────────────┐
│  Caddy :443│ ─▶│  App :3000  │ ─▶│  Postgres  │   │   Redis :6379│
│ (TLS + H2) │   │ (Next 16)   │   │   :5432    │   │  (rate-limit)│
└────────────┘   └─────────────┘   └────────────┘   └──────────────┘
                        │
                        ├─ /api/*       REST handlers (Next.js Route Handlers)
                        ├─ /api/admin/* RBAC-protected admin endpoints
                        ├─ /api/auth/*  JWT + refresh-token rotation
                        └─ /api/ai-chat z-ai-web-dev-sdk LLM
```

- **Frontend**: single `/` route, client-side view switching via Zustand.
- **Backend**: Next.js App Router API routes + Prisma ORM.
- **Database**: SQLite for dev, PostgreSQL (see `prisma/schema.postgres.prisma`) for production. Monetary fields use `Decimal(18,4)`.
- **Ledger**: `src/lib/ledger.ts` — double-entry engine, posts balanced debit+credit `LedgerEntry` rows inside `db.$transaction`.
- **Auth**: JWT (15-min access, 7-day refresh) with rotation, idempotent sessions, device fingerprints.

---

## 8. Troubleshooting

| Symptom | Fix |
|---|---|
| `bun install --frozen-lockfile` fails in CI | `bun.lockb` is out of sync — run `bun install` locally and commit the updated lockfile |
| `prisma db push` says "database does not exist" | `createdb -U postgres gaexpay` first, or set `POSTGRES_DB` in `.env` |
| Caddy issues no cert | DNS A records must resolve before Caddy will request — check `dig gaexpay.com` |
| Health check fails after deploy | `journalctl -u gaexpay -n 200` or `docker compose logs app --tail 200` |
| 502 from Caddy | App container not up / wrong upstream — verify `docker compose ps` shows `app` as healthy |
| Prisma client missing models after schema change | `bunx prisma generate` (in Docker: `docker compose exec app bunx prisma generate`) |
| `ECONNREFUSED 127.0.0.1:5432` inside container | Use the service name `postgres:5432`, not `localhost` — see `DATABASE_URL` in `docker-compose.yml` |

---

## License
Proprietary — © GaexPay. All rights reserved.
