#!/usr/bin/env bash
# ============================================================
# GaexPay — PostgreSQL backup script
#
#   • pg_dump with timestamp
#   • gzip compression
#   • retention: keeps last 30 backups
#   • optional GPG encryption (set GPG_RECIPIENT env var)
#   • optional S3 upload (set S3_BUCKET env var)
#   • SHA-256 integrity check
#   • Slack/webhook notifications on failure or success
#   • Health-check ping (e.g. Healthchecks.io)
#   • Full companion restore mode: pass --restore <file>
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
#     S3_BUCKET            optional — s3://bucket-name/prefix/
#     S3_STORAGE_CLASS     default: STANDARD_IA
#     SLACK_WEBHOOK_URL    optional — notify on success/failure
#     HEALTHCHECK_URL      optional — ping on success (e.g. https://hc-ping.com/uuid)
#     NOTIFY_ON_SUCCESS    default: false — also notify Slack on success
# ============================================================
set -Eeuo pipefail

# ---- Mode check: restore? ----------------------------------
if [[ "${1:-}" == "--restore" ]]; then
    shift
    RESTORE_FILE="${1:?Usage: $0 --restore <backup_file.sql.gz[.gpg]>}"
    exec "$(dirname "$0")/backup-postgres.sh" __restore__ "$RESTORE_FILE"
fi

if [[ "${1:-}" == "__restore__" ]]; then
    shift
    source_restore() {
        local file="$1"
        APP_DIR="${APP_DIR:-/var/www/gaexpay}"
        [[ -f "$APP_DIR/.env" ]] && { set -a; . "$APP_DIR/.env"; set +a; }

        POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
        POSTGRES_PORT="${POSTGRES_PORT:-5432}"
        POSTGRES_USER="${POSTGRES_USER:-gaexpay}"
        POSTGRES_DB="${POSTGRES_DB:-gaexpay}"
        POSTGRES_PASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set}"

        log "=== RESTORE MODE ==="
        log "Source: $file"
        log "Target: ${POSTGRES_DB}@${POSTGRES_HOST}:${POSTGRES_PORT}"

        local working="$file"

        # Decrypt if needed
        if [[ "$working" == *.gpg ]]; then
            command -v gpg >/dev/null 2>&1 || fatal "gpg not found"
            local decrypted="${working%.gpg}"
            log "Decrypting with GPG…"
            gpg --batch --yes --decrypt --output "$decrypted" "$working"
            working="$decrypted"
        fi

        # Decompress
        if [[ "$working" == *.gz ]]; then
            log "Decompressing…"
            local decompressed="${working%.gz}"
            gzip -d -c "$working" > "$decompressed"
            working="$decompressed"
        fi

        # Restore
        log "Restoring into ${POSTGRES_DB} — this will DROP and recreate all tables."
        read -r -p "Continue? (yes/no): " confirm
        [[ "$confirm" == "yes" ]] || fatal "Restore aborted by user."

        PGPASSWORD="$POSTGRES_PASSWORD" psql \
            -h "$POSTGRES_HOST" \
            -p "$POSTGRES_PORT" \
            -U "$POSTGRES_USER" \
            -d "$POSTGRES_DB" \
            --single-transaction \
            -f "$working"

        # Cleanup tmp files
        [[ "$working" != "$file" ]] && rm -f "$working"
        [[ -f "${file%.gpg}" && "${file%.gpg}" != "$file" ]] && rm -f "${file%.gpg}"

        log "Restore complete."
    }
    log()   { echo -e "\033[1;34m[backup]\033[0m $(date -Is) $*"; }
    fatal() { echo -e "\033[1;31m[fatal]\033[0m $(date -Is) $*" >&2; exit 1; }
    source_restore "$1"
    exit 0
fi

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

S3_BUCKET="${S3_BUCKET:-}"
S3_STORAGE_CLASS="${S3_STORAGE_CLASS:-STANDARD_IA}"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-}"
NOTIFY_ON_SUCCESS="${NOTIFY_ON_SUCCESS:-false}"

# ---- Helpers -----------------------------------------------
log()   { echo -e "\033[1;34m[backup]\033[0m $(date -Is) $*"; }
warn()  { echo -e "\033[1;33m[warn]\033[0m  $(date -Is) $*"; }
fatal() { echo -e "\033[1;31m[fatal]\033[0m $(date -Is) $*" >&2; exit 1; }

# ---- Notification helpers ----------------------------------
notify_slack() {
    local status="$1"   # success | failure
    local message="$2"
    local color="good"
    [[ "$status" == "failure" ]] && color="danger"

    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        curl -fsSL -X POST "$SLACK_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"GaexPay DB Backup — ${status^^}\",
                    \"text\": \"$message\",
                    \"footer\": \"$(hostname) • $(date -Is)\"
                }]
            }" >/dev/null 2>&1 || warn "Slack notification failed"
    fi
}

ping_healthcheck() {
    local status="${1:-}"   # empty = success, "fail" = failure
    if [[ -n "$HEALTHCHECK_URL" ]]; then
        local url="$HEALTHCHECK_URL"
        [[ "$status" == "fail" ]] && url="$HEALTHCHECK_URL/fail"
        curl -fsSL --retry 3 "$url" >/dev/null 2>&1 || warn "Healthcheck ping failed"
    fi
}

# ---- Error trap --------------------------------------------
on_error() {
    local exit_code=$?
    local line_no=$1
    local msg="Backup failed on $(hostname) at line ${line_no} (exit ${exit_code}). DB: ${POSTGRES_DB}@${POSTGRES_HOST}"
    fatal "$msg"
    notify_slack "failure" "$msg"
    ping_healthcheck "fail"
}
trap 'on_error $LINENO' ERR

# ---- Pre-flight --------------------------------------------
command -v pg_dump  >/dev/null 2>&1 || fatal "pg_dump not found — install postgresql-client"
command -v gzip     >/dev/null 2>&1 || fatal "gzip not found"
command -v sha256sum >/dev/null 2>&1 || command -v shasum >/dev/null 2>&1 || warn "sha256sum/shasum not found — checksum will be skipped"

if [[ -n "$S3_BUCKET" ]]; then
    command -v aws >/dev/null 2>&1 || fatal "S3_BUCKET set but aws CLI not found"
fi

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

# ---- Connectivity check ------------------------------------
log "Checking database connectivity…"
PGPASSWORD="$POSTGRES_PASSWORD" pg_isready \
    -h "$POSTGRES_HOST" \
    -p "$POSTGRES_PORT" \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    -t 10 \
    >/dev/null 2>&1 || fatal "Database not reachable: ${POSTGRES_HOST}:${POSTGRES_PORT}"

# ---- Filenames ---------------------------------------------
TS="$(date +%Y%m%d-%H%M%S)"
BASENAME="${POSTGRES_DB}-${TS}"
DUMP_PATH="$BACKUP_DIR/${BASENAME}.sql"
GZ_PATH="${DUMP_PATH}.gz"
OUT_PATH="$GZ_PATH"

if [[ -n "${GPG_RECIPIENT:-}" ]]; then
    command -v gpg >/dev/null 2>&1 || fatal "GPG_RECIPIENT set but gpg not found"
    OUT_PATH="${GZ_PATH}.gpg"
    log "Encryption enabled (recipient: $GPG_RECIPIENT)"
fi

# ---- Dump --------------------------------------------------
log "Dumping database ${POSTGRES_DB}@${POSTGRES_HOST}:${POSTGRES_PORT}…"

PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
    -h "$POSTGRES_HOST" \
    -p "$POSTGRES_PORT" \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    --no-owner \
    --no-privileges \
    --no-acl \
    --format=plain \
    --serializable-deferrable \
    --file="$DUMP_PATH"

log "Dump size (raw): $(du -sh "$DUMP_PATH" | cut -f1)"

# ---- Compress ----------------------------------------------
log "Compressing (gzip -9)…"
gzip -9 -c "$DUMP_PATH" > "$GZ_PATH"
rm -f "$DUMP_PATH"

# ---- Encrypt (optional) ------------------------------------
if [[ -n "${GPG_RECIPIENT:-}" ]]; then
    log "Encrypting with GPG (recipient: $GPG_RECIPIENT)…"
    gpg --batch --yes \
        --trust-model always \
        --recipient "$GPG_RECIPIENT" \
        --output "$OUT_PATH" \
        --encrypt "$GZ_PATH"
    rm -f "$GZ_PATH"
fi

# ---- Integrity checksum ------------------------------------
log "Computing SHA-256 checksum…"
CHECKSUM=""
if command -v sha256sum >/dev/null 2>&1; then
    CHECKSUM="$(sha256sum "$OUT_PATH" | awk '{print $1}')"
elif command -v shasum >/dev/null 2>&1; then
    CHECKSUM="$(shasum -a 256 "$OUT_PATH" | awk '{print $1}')"
else
    warn "Checksum tool not available — skipping"
fi

[[ -n "$CHECKSUM" ]] && echo "$CHECKSUM  $OUT_PATH" > "${OUT_PATH}.sha256"

# ---- Manifest ----------------------------------------------
SIZE_BYTES="$(stat -c %s "$OUT_PATH" 2>/dev/null || stat -f %z "$OUT_PATH")"
SIZE_MB="$(awk "BEGIN{printf \"%.2f\", $SIZE_BYTES/1024/1024}")"

cat > "${OUT_PATH}.manifest" <<EOF
database=${POSTGRES_DB}
host=${POSTGRES_HOST}
port=${POSTGRES_PORT}
user=${POSTGRES_USER}
timestamp=${TS}
hostname=$(hostname)
size_bytes=${SIZE_BYTES}
size_mb=${SIZE_MB}
encrypted=$([[ -n "${GPG_RECIPIENT:-}" ]] && echo true || echo false)
s3_uploaded=false
sha256=${CHECKSUM:-n/a}
EOF

log "Backup OK: $OUT_PATH (${SIZE_MB} MB)"
[[ -n "$CHECKSUM" ]] && log "SHA-256:   $CHECKSUM"

# ---- S3 Upload (optional) ----------------------------------
if [[ -n "$S3_BUCKET" ]]; then
    log "Uploading to S3: ${S3_BUCKET}…"

    S3_KEY="${S3_BUCKET%/}/${POSTGRES_DB}/${TS}/$(basename "$OUT_PATH")"

    aws s3 cp "$OUT_PATH" "s3://${S3_KEY}" \
        --storage-class "$S3_STORAGE_CLASS" \
        --no-progress \
        --metadata "sha256=${CHECKSUM:-},database=${POSTGRES_DB},timestamp=${TS}" \
        --sse AES256

    # Also upload manifest and checksum
    aws s3 cp "${OUT_PATH}.manifest" "s3://${S3_BUCKET%/}/${POSTGRES_DB}/${TS}/$(basename "${OUT_PATH}").manifest" \
        --storage-class "$S3_STORAGE_CLASS" --no-progress --quiet || true

    [[ -f "${OUT_PATH}.sha256" ]] && \
    aws s3 cp "${OUT_PATH}.sha256" "s3://${S3_BUCKET%/}/${POSTGRES_DB}/${TS}/$(basename "${OUT_PATH}").sha256" \
        --storage-class "$S3_STORAGE_CLASS" --no-progress --quiet || true

    # Update manifest with S3 status
    sed -i 's/s3_uploaded=false/s3_uploaded=true/' "${OUT_PATH}.manifest"
    log "S3 upload complete: s3://${S3_KEY}"
fi

# ---- Retention: keep last N --------------------------------
log "Pruning backups older than the last ${BACKUP_KEEP}…"

mapfile -t KEEP_FILES < <(
    ls -1t "${BACKUP_DIR}/${POSTGRES_DB}"-*.sql.gz* 2>/dev/null \
        | grep -vE '\.(manifest|sha256)$' \
        | head -n "$BACKUP_KEEP"
)

PRUNED=0
shopt -s nullglob
for f in "${BACKUP_DIR}/${POSTGRES_DB}"-*.sql.gz*; do
    skip=false
    base_f="${f%.manifest}"
    base_f="${base_f%.sha256}"

    for k in "${KEEP_FILES[@]:-}"; do
        base_k="${k%.manifest}"
        base_k="${base_k%.sha256}"
        if [[ "$base_f" == "$base_k" ]]; then
            skip=true
            break
        fi
    done

    if [[ "$skip" != "true" ]]; then
        log "  pruning: $(basename "$f")"
        rm -f "$f"
        (( PRUNED++ )) || true
    fi
done

RETAINED="$(ls -1 "${BACKUP_DIR}/${POSTGRES_DB}"-*.sql.gz* 2>/dev/null | grep -vcE '\.(manifest|sha256)$' || echo 0)"

# ---- Summary -----------------------------------------------
SUMMARY="DB: ${POSTGRES_DB}@${POSTGRES_HOST} | Size: ${SIZE_MB} MB | Retained: ${RETAINED} | Pruned: ${PRUNED}"
[[ -n "$S3_BUCKET" ]] && SUMMARY+=" | S3: ✅"
log "Done. $SUMMARY"

# ---- Notifications -----------------------------------------
[[ "$NOTIFY_ON_SUCCESS" == "true" ]] && notify_slack "success" "Backup succeeded. $SUMMARY"
ping_healthcheck
