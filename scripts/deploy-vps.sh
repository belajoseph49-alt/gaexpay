#!/usr/bin/env bash
# ============================================================
# GaexPay — VPS deploy script
#
#   Pulls the latest code, installs deps, runs migrations +
#   seeders, then restarts the systemd unit / PM2 process and
#   performs a rolling health check.
#
#   Usage:
#     sudo -u gaexpay scripts/deploy-vps.sh
#     sudo -u gaexpay scripts/deploy-vps.sh --skip-seed
# ============================================================
set -Eeuo pipefail

# ---- Config ------------------------------------------------
APP_DIR="${APP_DIR:-/var/www/gaexpay}"
BRANCH="${BRANCH:-main}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3000/api/health}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-90}"   # seconds
SERVICE_NAME="${SERVICE_NAME:-gaexpay}"
PROCESS_MANAGER="${PROCESS_MANAGER:-systemd}"   # systemd | pm2
KEEP_BUILDS="${KEEP_BUILDS:-5}"
SKIP_SEED=false

# ---- Helpers -----------------------------------------------
log()   { echo -e "\033[1;32m[deploy]\033[0m $*"; }
warn()  { echo -e "\033[1;33m[warn]\033[0m  $*"; }
fatal() { echo -e "\033[1;31m[fatal]\033[0m $*" >&2; exit 1; }

trap 'fatal "Deploy failed at line $LINENO (exit $?)"' ERR

# ---- Parse args --------------------------------------------
for arg in "$@"; do
    case "$arg" in
        --skip-seed) SKIP_SEED=true ;;
        --skip-pull) SKIP_PULL=true ;;
        --pm2)       PROCESS_MANAGER=pm2 ;;
        --systemd)   PROCESS_MANAGER=systemd ;;
        *) warn "Unknown arg: $arg" ;;
    esac
done

cd "$APP_DIR" || fatal "APP_DIR $APP_DIR does not exist"
log "Deploying GaexPay from $APP_DIR (branch=$BRANCH, manager=$PROCESS_MANAGER)"

# ---- 1. Pull latest code -----------------------------------
if [[ "${SKIP_PULL:-false}" != "true" ]]; then
    log "Pulling latest code ($BRANCH)…"
    git fetch --prune origin "$BRANCH"
    git reset --hard "origin/$BRANCH"
fi

# ---- 2. Install dependencies -------------------------------
log "Installing dependencies with Bun…"
if command -v bun >/dev/null 2>&1; then
    bun install --frozen-lockfile
elif command -v npm >/dev/null 2>&1; then
    npm ci
else
    fatal "Neither bun nor npm found on PATH"
fi

# ---- 3. Generate Prisma client -----------------------------
log "Generating Prisma client…"
if [[ -f prisma/schema.postgres.prisma ]]; then
    bunx prisma generate --schema=prisma/schema.postgres.prisma
else
    bunx prisma generate
fi

# ---- 4. Run database migrations ----------------------------
log "Pushing schema to database…"
if [[ -f prisma/schema.postgres.prisma ]]; then
    bunx prisma db push --schema=prisma/schema.postgres.prisma --accept-data-loss=false
else
    bunx prisma db push
fi

# ---- 5. Run seeders ----------------------------------------
if [[ "$SKIP_SEED" != "true" ]]; then
    log "Running seeders…"
    if [[ -f prisma/seed.ts ]]; then
        bunx tsx prisma/seed.ts || warn "seed.ts exited non-zero (continuing)"
    fi
    if [[ -f prisma/seed-admin.ts ]]; then
        bunx tsx prisma/seed-admin.ts || warn "seed-admin.ts exited non-zero (continuing)"
    fi
else
    log "Skipping seeders (--skip-seed)"
fi

# ---- 6. Build the Next.js standalone bundle ----------------
log "Building Next.js (standalone)…"
bun run build

# ---- 7. Rotate previous build artifacts --------------------
BUILD_TS="$(date +%Y%m%d-%H%M%S)"
if [[ -d .next/standalone ]]; then
    log "Archiving current build → .next/standalone.$BUILD_TS.bak"
    cp -r .next/standalone ".next/standalone.$BUILD_TS.bak" || true
    # Keep only the last N backups
    ls -1dt .next/standalone.*.bak 2>/dev/null | tail -n +"$((KEEP_BUILDS + 1))" \
        | xargs -r rm -rf
fi

# ---- 8. Restart the service --------------------------------
log "Restarting process via $PROCESS_MANAGER…"
case "$PROCESS_MANAGER" in
    systemd)
        sudo systemctl daemon-reload
        sudo systemctl restart "$SERVICE_NAME"
        ;;
    pm2)
        if pm2 describe "$SERVICE_NAME" >/dev/null 2>&1; then
            pm2 reload "$SERVICE_NAME" --update-env
        else
            pm2 start "node server.js" --name "$SERVICE_NAME" --cwd "$APP_DIR/.next/standalone"
        fi
        pm2 save
        ;;
    *)
        fatal "Unknown PROCESS_MANAGER=$PROCESS_MANAGER"
        ;;
esac

# ---- 9. Health check ---------------------------------------
log "Health check against $HEALTH_URL (timeout ${HEALTH_TIMEOUT}s)…"
deadline=$(( $(date +%s) + HEALTH_TIMEOUT ))
ok=false
while [[ $(date +%s) -lt $deadline ]]; do
    code="$(curl -s -o /dev/null -w '%{http_code}' "$HEALTH_URL" || true)"
    if [[ "$code" == "200" ]]; then
        ok=true
        break
    fi
    sleep 2
done

if [[ "$ok" != "true" ]]; then
    fatal "Health check failed — service did not respond 200 within ${HEALTH_TIMEOUT}s"
fi

log "Health check passed ✓"
log "Deploy complete in ${SECONDS}s ✓"
