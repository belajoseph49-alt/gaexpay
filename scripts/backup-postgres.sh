#!/usr/bin/env bash
# ============================================================
# GaexPay — PostgreSQL backup script
#
#   • pg_dump with timestamp
#   • gzip compression
#   • retention: keeps last 30 backups
#   • optional GPG encryption (set GPG_RECIPIENT env var)
#
#   Recommended cron (every 4 hours):
#     0 */4 * * *  /var/www/gaexpay/scripts/backup-postgres.sh >> /var/log/gaexpay-backup.log 2>&1
#
#   Env vars (read from environment or .env in $APP_DIR):
#     POSTGRES_HOST        default: localhost
#     POSTGRES_PORT        default: 5432
#     POSTGRES_USER        default: gaexpay
#     POSTGRES_PASSWORD    required
#     POSTGRES_DB          default: gaexpay
#     BACKUP_DIR           default: /var/backups/gaexpay/postgres
#     BACKUP_KEEP          default: 30
#     GPG_RECIPIENT        optional — encrypt with `gpg --batch -r $GPG_RECIPIENT`
# ============================================================
set -Eeuo pipefail

# ---- Config ------------------------------------------------
APP_DIR="${APP_DIR:-/var/www/gaexpay}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/gaexpay/postgres}"
BACKUP_KEEP="${BACKUP_KEEP:-30}"

# Load .env if present
if [[ -f "$APP_DIR/.env" ]]; then
    set -a
    # shellcheck disable=SC1090
    . "$APP_DIR/.env"
    set +a
fi

POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-gaexpay}"
POSTGRES_DB="${POSTGRES_DB:-gaexpay}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set}"

# ---- Helpers -----------------------------------------------
log()   { echo -e "\033[1;34m[backup]\033[0m $(date -Is) $*"; }
fatal() { echo -e "\033[1;31m[fatal]\033[0m $(date -Is) $*" >&2; exit 1; }

trap 'fatal "Backup failed at line $LINENO (exit $?)"' ERR

# ---- Pre-flight --------------------------------------------
command -v pg_dump >/dev/null 2>&1 || fatal "pg_dump not found — install postgresql-client"
command -v gzip    >/dev/null 2>&1 || fatal "gzip not found"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

TS="$(date +%Y%m%d-%H%M%S)"
BASENAME="${POSTGRES_DB}-${TS}"
DUMP_PATH="$BACKUP_DIR/${BASENAME}.sql"
OUT_PATH="$DUMP_PATH.gz"

if [[ -n "${GPG_RECIPIENT:-}" ]]; then
    command -v gpg >/dev/null 2>&1 || fatal "GPG_RECIPIENT set but gpg not found"
    OUT_PATH="$DUMP_PATH.gz.gpg"
    log "Encryption enabled (recipient: $GPG_RECIPIENT)"
fi

log "Dumping database ${POSTGRES_DB}@${POSTGRES_HOST}:${POSTGRES_PORT}…"

# Run pg_dump with PGPASSWORD — uses custom format for parallel restore.
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
    -h "$POSTGRES_HOST" \
    -p "$POSTGRES_PORT" \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    --no-owner --no-privileges \
    --format=plain \
    --serializable-deferrable \
    --file="$DUMP_PATH"

log "Compressing (gzip)…"
gzip -9 -c "$DUMP_PATH" > "${DUMP_PATH}.gz"
rm -f "$DUMP_PATH"

# Optional GPG encryption
if [[ -n "${GPG_RECIPIENT:-}" ]]; then
    log "Encrypting with GPG…"
    gpg --batch --yes --trust-model always \
        --recipient "$GPG_RECIPIENT" \
        --output "$OUT_PATH" \
        --encrypt "${DUMP_PATH}.gz"
    rm -f "${DUMP_PATH}.gz"
fi

# ---- Size + manifest ---------------------------------------
SIZE_BYTES="$(stat -c %s "$OUT_PATH" 2>/dev/null || stat -f %z "$OUT_PATH")"
SIZE_MB="$(awk "BEGIN{printf \"%.2f\", $SIZE_BYTES/1024/1024}")"
log "Backup OK: $OUT_PATH (${SIZE_MB} MB)"

# Write a sidecar manifest (useful for restore automation)
cat > "${OUT_PATH}.manifest" <<EOF
database=${POSTGRES_DB}
host=${POSTGRES_HOST}
port=${POSTGRES_PORT}
user=${POSTGRES_USER}
timestamp=${TS}
size_bytes=${SIZE_BYTES}
encrypted=$([[ -n "${GPG_RECIPIENT:-}" ]] && echo true || echo false)
sha256=$(sha256sum "$OUT_PATH" | awk '{print $1}')
EOF

# ---- Retention: keep last N --------------------------------
log "Pruning backups older than the last ${BACKUP_KEEP}…"
# Match the base name without extension to delete .gz, .gpg, .manifest together
mapfile -t KEEP_FILES < <(
    ls -1t "${BACKUP_DIR}/${POSTGRES_DB}"-*.sql.gz* 2>/dev/null \
        | grep -vE '\.manifest$' \
        | head -n "$BACKUP_KEEP"
)

shopt -s nullglob
for f in "${BACKUP_DIR}/${POSTGRES_DB}"-*.sql.gz*; do
    skip=false
    for k in "${KEEP_FILES[@]}"; do
        # Strip the .manifest / .gpg suffix for comparison
        base_k="${k%.manifest}"
        base_f="${f%.manifest}"
        if [[ "$base_f" == "$base_k" ]]; then
            skip=true
            break
        fi
    done
    if [[ "$skip" != "true" ]]; then
        log "  pruning: $f"
        rm -f "$f"
    fi
done

log "Done. Backups retained: $(ls -1 "${BACKUP_DIR}/${POSTGRES_DB}"-*.sql.gz* 2>/dev/null | grep -vcE '\.manifest$') files"
