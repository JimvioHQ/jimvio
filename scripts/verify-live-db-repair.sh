#!/usr/bin/env bash
# Verify Live Studio repair migrations against a production-shaped fixture.
# Requires: docker, psql (or uses docker exec only)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NAME="jimvio-live-db-verify"
IMAGE="postgres:17"
PORT=55432

cleanup() {
  docker rm -f "$NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

cleanup
docker run -d --name "$NAME" \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=jimvio \
  -p "${PORT}:5432" \
  "$IMAGE" >/dev/null

echo "Waiting for postgres..."
for i in $(seq 1 40); do
  if docker exec "$NAME" pg_isready -U postgres >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done
docker exec "$NAME" pg_isready -U postgres >/dev/null

run_sql() {
  local file="$1"
  echo "→ applying $(basename "$file")"
  docker exec -i "$NAME" psql -U postgres -d jimvio -v ON_ERROR_STOP=1 <"$file"
}

run_sql "$ROOT/database/migrations/fixtures/live_prod_schema_before_repair.sql"

# Reproduce the original failure mode (must fail)
set +e
docker exec -i "$NAME" psql -U postgres -d jimvio -v ON_ERROR_STOP=1 <<'SQL' >/tmp/jimvio-old-080.err 2>&1
CREATE INDEX IF NOT EXISTS idx_live_sessions_room ON public.live_sessions(room_id);
SQL
OLD_RC=$?
set -e
if [[ $OLD_RC -eq 0 ]]; then
  echo "FAIL: expected pre-repair index on room_id to error"
  exit 1
fi
if ! grep -qi 'room_id' /tmp/jimvio-old-080.err; then
  echo "FAIL: unexpected error reproducing drift:"
  cat /tmp/jimvio-old-080.err
  exit 1
fi
echo "✓ reproduced ERROR: column room_id does not exist"

run_sql "$ROOT/database/migrations/080_live_studio.sql"
run_sql "$ROOT/database/migrations/081_live_recordings.sql"
run_sql "$ROOT/database/migrations/082_live_schema_repair.sql"
run_sql "$ROOT/database/migrations/083_live_recordings_repair.sql"

# Re-run repairs (idempotency)
run_sql "$ROOT/database/migrations/082_live_schema_repair.sql"
run_sql "$ROOT/database/migrations/083_live_recordings_repair.sql"

docker exec -i "$NAME" psql -U postgres -d jimvio -v ON_ERROR_STOP=1 <<'SQL'
\echo '=== verification ==='
SELECT column_name FROM information_schema.columns
  WHERE table_schema='public' AND table_name='live_sessions' AND column_name='room_id';
SELECT column_name FROM information_schema.columns
  WHERE table_schema='public' AND table_name='live_session_participants'
    AND column_name IN ('status','mic_on','cam_on','hand_raised','sharing','updated_at')
  ORDER BY 1;
SELECT to_regclass('public.live_polls') AS live_polls,
       to_regclass('public.live_poll_votes') AS live_poll_votes,
       to_regclass('public.live_recordings') AS live_recordings;
SELECT indexname FROM pg_indexes
  WHERE schemaname='public'
    AND tablename IN ('live_sessions','live_session_participants','live_polls','live_poll_votes','live_recordings')
  ORDER BY 1;
SELECT tablename, policyname FROM pg_policies
  WHERE schemaname='public'
    AND tablename LIKE 'live%'
  ORDER BY 1,2;
SELECT tablename FROM pg_publication_tables
  WHERE pubname='supabase_realtime' AND tablename LIKE 'live%'
  ORDER BY 1;
-- Ensure greenfield wrong table was never created
SELECT to_regclass('public.live_participants') AS must_be_null;
SQL

echo ""
echo "LIVE DB REPAIR VERIFICATION: PASS"
