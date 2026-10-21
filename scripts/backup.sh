#!/usr/bin/env bash
# Backs up the database and uploaded files into backups/<timestamp>/.
#
#   scripts/backup.sh            # server with PostgreSQL installed directly (reads .env)
#   BACKUP_MODE=docker scripts/backup.sh   # Docker Compose deployment
#
# Options (environment variables):
#   BACKUP_DIR       where backups are written            (default: ./backups)
#   RETENTION_DAYS   delete local backups older than this (default: 14)
#   BACKUP_REMOTE    rclone destination for an off-site copy, e.g. "s3:my-bucket/riyada" (optional)
#
# Schedule daily with cron, e.g.:
#   15 3 * * * cd /var/www/riyada && scripts/backup.sh >> backups/backup.log 2>&1
set -euo pipefail
umask 077
cd "$(dirname "$0")/.."

MODE="${BACKUP_MODE:-local}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
STAMP="$(date -u +%Y-%m-%d_%H%M%S)"
DEST="$BACKUP_DIR/$STAMP"
mkdir -p "$DEST"

log() { echo "[$(date -u +%H:%M:%S)] $*"; }
fail() { echo "✖ $*" >&2; rm -rf "$DEST"; exit 1; }

env_value() { # reads KEY from .env without executing it
  [ -f .env ] && grep -E "^$1=" .env | tail -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' || true
}

if [ "$MODE" = "docker" ]; then
  DC="docker compose"
  PGUSER="${POSTGRES_USER:-$(env_value POSTGRES_USER)}"; PGUSER="${PGUSER:-riyada}"
  PGDB="${POSTGRES_DB:-$(env_value POSTGRES_DB)}"; PGDB="${PGDB:-riyada}"
  log "Dumping database $PGDB (docker)…"
  $DC exec -T db pg_dump -U "$PGUSER" -d "$PGDB" --format=custom --no-owner > "$DEST/db.dump" || fail "pg_dump failed"
  log "Archiving uploaded files (docker)…"
  $DC exec -T app tar -czf - -C /app/storage . > "$DEST/storage.tar.gz" || fail "storage archive failed"
else
  DB_URL="${DATABASE_URL:-$(env_value DATABASE_URL)}"
  [ -n "$DB_URL" ] || fail "DATABASE_URL is not set (in the environment or .env)"
  DB_URL="${DB_URL%%\?*}" # pg_dump does not accept Prisma's ?schema= parameter
  STORAGE="${STORAGE_DIR:-$(env_value STORAGE_DIR)}"; STORAGE="${STORAGE:-./storage}"
  log "Dumping database…"
  pg_dump --format=custom --no-owner --dbname="$DB_URL" --file="$DEST/db.dump" || fail "pg_dump failed"
  log "Archiving uploaded files from $STORAGE…"
  mkdir -p "$STORAGE"
  tar -czf "$DEST/storage.tar.gz" -C "$STORAGE" . || fail "storage archive failed"
fi

[ -s "$DEST/db.dump" ] || fail "database dump is empty"
(cd "$DEST" && sha256sum db.dump storage.tar.gz > SHA256SUMS)
log "Backup written to $DEST ($(du -sh "$DEST" | cut -f1))"

if [ -n "${BACKUP_REMOTE:-}" ]; then
  log "Copying to $BACKUP_REMOTE/$STAMP…"
  rclone copy "$DEST" "$BACKUP_REMOTE/$STAMP" || fail "off-site copy failed (local backup kept)"
fi

find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -name '20*' -mtime +"$RETENTION_DAYS" -print -exec rm -rf {} + | sed 's/^/  removed old backup: /'
log "Done."
