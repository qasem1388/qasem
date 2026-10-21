#!/usr/bin/env bash
# Restores a backup made by scripts/backup.sh. REPLACES the current database and uploads.
#
#   scripts/restore.sh backups/2026-10-21_031500
#   BACKUP_MODE=docker scripts/restore.sh backups/2026-10-21_031500
set -euo pipefail
cd "$(dirname "$0")/.."

SRC="${1:-}"
[ -n "$SRC" ] && [ -f "$SRC/db.dump" ] && [ -f "$SRC/storage.tar.gz" ] || {
  echo "Usage: scripts/restore.sh <backup-folder>   (must contain db.dump and storage.tar.gz)" >&2
  exit 1
}
MODE="${BACKUP_MODE:-local}"

env_value() { [ -f .env ] && grep -E "^$1=" .env | tail -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' || true; }

echo "Verifying checksums…"
(cd "$SRC" && sha256sum -c SHA256SUMS)

if [ "${RESTORE_CONFIRM:-}" != "yes" ]; then
  read -r -p "This replaces the current database and uploaded files with $SRC. Type 'restore' to continue: " answer
  [ "$answer" = "restore" ] || { echo "Cancelled."; exit 1; }
fi

if [ "$MODE" = "docker" ]; then
  DC="docker compose"
  PGUSER="${POSTGRES_USER:-$(env_value POSTGRES_USER)}"; PGUSER="${PGUSER:-riyada}"
  PGDB="${POSTGRES_DB:-$(env_value POSTGRES_DB)}"; PGDB="${PGDB:-riyada}"
  echo "Restoring database…"
  $DC exec -T db pg_restore -U "$PGUSER" -d "$PGDB" --clean --if-exists --no-owner --single-transaction < "$SRC/db.dump"
  echo "Restoring uploaded files…"
  $DC exec -T app sh -c 'find /app/storage -mindepth 1 -delete && tar -xzf - -C /app/storage' < "$SRC/storage.tar.gz"
else
  DB_URL="${DATABASE_URL:-$(env_value DATABASE_URL)}"
  DB_URL="${DB_URL%%\?*}"
  STORAGE="${STORAGE_DIR:-$(env_value STORAGE_DIR)}"; STORAGE="${STORAGE:-./storage}"
  echo "Restoring database…"
  pg_restore --clean --if-exists --no-owner --single-transaction --dbname="$DB_URL" "$SRC/db.dump"
  echo "Restoring uploaded files into $STORAGE…"
  mkdir -p "$STORAGE"
  find "$STORAGE" -mindepth 1 -delete
  tar -xzf "$SRC/storage.tar.gz" -C "$STORAGE"
fi
echo "✔ Restore complete."
echo "  Next: sign in to /admin → الإعدادات العامة → «تحديث صفحات الموقع» so cached pages show the restored content."
