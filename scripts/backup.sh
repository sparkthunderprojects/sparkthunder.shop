#!/usr/bin/env bash
# Dump the whole database to a compressed file. Needs pg_dump and DATABASE_URL (Supabase: Project settings, Database, Connection string).
# The file contains customers' personal data: keep it private and encrypted, never commit it.
set -euo pipefail
: "${DATABASE_URL:?Set DATABASE_URL to the Supabase connection string first}"
command -v pg_dump >/dev/null || { echo "pg_dump is not installed (install the PostgreSQL client tools)"; exit 1; }
mkdir -p backups
out="backups/spark-$(date +%Y-%m-%d-%H%M).sql.gz"
pg_dump "$DATABASE_URL" --no-owner --no-privileges --schema=public --schema=auth --schema=storage | gzip > "$out"
chmod 600 "$out"
size=$(wc -c < "$out")
[ "$size" -gt 2000 ] || { echo "Backup looks empty ($size bytes): check the connection string"; rm -f "$out"; exit 1; }
echo "Wrote $out ($size bytes). Keep it private."
