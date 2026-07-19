#!/usr/bin/env bash
# ============================================================
# GaexPay — PostgreSQL restore script
#
#   Usage:
#     ./restore-postgres.sh <backup_file.sql.gz>
#     ./restore-postgres.sh <backup_file.sql.gz.gpg>   # encrypted
#
#   Env vars (same as backup-postgres.sh):
#     POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER,
#     POSTGRES_PASSWORD, POSTGRES_DB, APP_DIR
#
#   Options:
#     --no-confirm     Skip the interactive confirmation prompt
#     --target-db <name>  Restore into a different database (e.g. for testing)
# ============================================================
set -Eeuo pipefail

# ---- Helpers -----------------------------------------------
log()   { echo -e "\033[1;34m[restore]\033[0m $(date -Is) $*"; }
warn()  { echo -e "\033[1;33m[warn]\033[0m   $(date -Is) $*"; }
fatal() { echo -e "\033[1;31m[fatal]\033[0m  $(date -Is) $*" >&2; exit 1; }

trap 'fatal "Restore failed at line $LINENO (exit $?)"' ERR

# ---- Args --------------------------------------------------
BACKUP_FILE=""
NO_CONFIRM=false
TARGET_DB=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --no-confirm)    NO_CONFIRM=true;     shift ;;
        --target-db)     TARGET_DB="$2";      shift 2 ;;
        -*)              fatal "Unknown option: $1" ;;
        *)               BACKUP_FILE="$1";    shift ;;
    esac
done

[[ -z "$BACKUP_FILE" ]] && fatal "Usage: $0 [--no-confirm] [--target-db <name>] <backup_file>"
[[ -f "$BACKUP_FILE" ]] || fatal "File not found: $BACKUP_FILE"

# ---- Config ------------------------------------------------
APP_DIR="${APP_DIR:-/var/www/gaexpay}"
if [[ -f "$APP_DIR/.env" ]]; then
    set -a
    # shellcheck disable=SC1090
    . "$APP_DIR/.env"
    set +a
fi

POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-gaexpay}"
POSTGRES_DB="${TARGET_DB:-${POSTGRES_DB:-gaexpay}}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set}"

# ---- Pre-flight --------------------------------------------
command -v psql    >/dev/null 2>&1 || fatal "psql not found — install postgresql-client"
command -v gzip    >/dev/null 2>&1 || fatal "gzip not found"

# ---- Verify checksum if .sha256 exists ---------------------
SHA256_FILE="${BACKUP_FILE}.sha256"
if [[ -f "$SHA256_FILE" ]]; then
    log "Verifying SHA-256 checksum…"
    if command -v sha256sum >/dev/null 2>&1; then
        sha256sum --check "$SHA256_FILE" || fatal "Checksum verification failed — file may be corrupted."
    elif command -v shasum >/dev/null 2>&1; then
        shasum -a 256 --check "$SHA256_FILE" || fatal "Checksum verification failed."
    else
        warn "No sha256sum/shasum found — skipping integrity check"
    fi
    log "Checksum OK ✓"
else
    warn "No .sha256 sidecar found — skipping integrity check"
fi

# ---- Show manifest if available ----------------------------
MANIFEST_FILE="${BACKUP_FILE}.manifest"
if [[ -f "$MANIFEST_FILE" ]]; then
    log "Backup manifest:"
    while IFS='=' read -r key val; do
        printf "  %-16s %s\n" "$key:" "$val"
    done < "$MANIFEST_FILE"
fi

# ---- Connectivity check ------------------------------------
log "Checking database connectivity…"
PGPASSWORD="$POSTGRES_PASSWORD" pg_isready \
    -h "$POSTGRES_HOST" \
    -p "$POSTGRES_PORT" \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    -t 10 >/dev/null 2>&1 || fatal "Database not reachable: ${POSTGRES_HOST}:${POSTGRES_PORT}"

# ---- Confirm -----------------------------------------------
log "=== RESTORE PLAN ==="
log "  Source: $BACKUP_FILE"
log "  Target: ${POSTGRES_DB}@${POSTGRES_HOST}:${POSTGRES_PORT}"
log "  ⚠️  This will REPLACE all existing data in '${POSTGRES_DB}'."

if [[ "$NO_CONFIRM" != "true" ]]; then
    echo ""
    read -r -p "Type 'yes' to proceed: " confirm
    [[ "$confirm" == "yes" ]] || fatal "Restore aborted by user."
fi

# ---- Work in a temp dir ------------------------------------
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

WORKING="$BACKUP_FILE"

# ---- Decrypt if .gpg ---------------------------------------
if [[ "$WORKING" == *.gpg ]]; then
    command -v gpg >/dev/null 2>&1 || fatal "File is GPG-encrypted but gpg not found"
    DECRYPTED="$TMPDIR/$(basename "${WORKING%.gpg}")"
    log "Decrypting with GPG…"
    gpg --batch --yes --decrypt --output "$DECRYPTED" "$WORKING"
    WORKING="$DECRYPTED"
    log "Decryption OK ✓"
fi

# ---- Decompress if .gz -------------------------------------
if [[ "$WORKING" == *.gz ]]; then
    DECOMPRESSED="$TMPDIR/$(basename "${WORKING%.gz}")"
    log "Decompressing (gzip)…"
    gzip -d -c "$WORKING" > "$DECOMPRESSED"
    WORKING="$DECOMPRESSED"
    log "Decompression OK ✓ ($(du -sh "$DECOMPRESSED" | cut -f1) uncompressed)"
fi

# ---- Drop + recreate public schema for a clean restore -----
log "Dropping and recreating public schema in '${POSTGRES_DB}'…"
PGPASSWORD="$POSTGRES_PASSWORD" psql \
    -h "$POSTGRES_HOST" \
    -p "$POSTGRES_PORT" \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;" \
    >/dev/null

# ---- Restore -----------------------------------------------
log "Restoring…"
PGPASSWORD="$POSTGRES_PASSWORD" psql \
    -h "$POSTGRES_HOST" \
    -p "$POSTGRES_PORT" \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    --single-transaction \
    -v ON_ERROR_STOP=1 \
    -f "$WORKING"

log "=== Restore complete! ==="
log "Database '${POSTGRES_DB}' restored from $(basename "$BACKUP_FILE")"
