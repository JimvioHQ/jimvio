# LIVE DATABASE APPLY GUIDE

Manual application via **Supabase SQL Editor** only.  
Do not use Docker, Supabase CLI, or `DATABASE_URL`.

**Migrations (do not rename):**

- `database/migrations/082_live_schema_repair.sql`
- `database/migrations/083_live_recordings_repair.sql`

Both files are **idempotent** — safe to run twice with zero errors when production schema matches the audited Jimvio live layer.

---

## Pre-flight (already verified in repo)

Compatible with existing production tables:

| Table | Repair behavior |
|-------|-----------------|
| `live_sessions` | `ADD COLUMN IF NOT EXISTS room_id`; keeps `space_id` |
| `live_session_participants` | Adds stage columns; no duplicate `live_participants` table |
| `live_recordings` | Column guards + indexes/RLS only (no recreate) |
| `communities` / `community_memberships` | Referenced by RLS only |
| `rooms` / `spaces` | `room_id` FK → `rooms`; sessions keep `space_id` |
| `profiles` | Poll FKs → `profiles(id)` |

Idempotency controls used:

- `ADD COLUMN IF NOT EXISTS`
- `CREATE TABLE IF NOT EXISTS`
- `CREATE INDEX IF NOT EXISTS`
- `DROP POLICY IF EXISTS` → `CREATE POLICY`
- Constraint adds gated by `pg_constraint` / unique-index checks + `EXCEPTION`
- Realtime adds gated by `pg_publication_tables` + `duplicate_object` handler

---

## STEP 1

Open **Supabase Dashboard → SQL Editor**.

Paste and run the full contents of:

```text
database/migrations/082_live_schema_repair.sql
```

Expect: **Success**. No error banner.

Optional: run the same file a second time immediately — also **Success**.

---

## STEP 2

In SQL Editor, paste and run the full contents of:

```text
database/migrations/083_live_recordings_repair.sql
```

Expect: **Success**.

Optional: run again — also **Success**.

---

## STEP 3

In SQL Editor, run:

```sql
NOTIFY pgrst, 'reload schema';
```

Expect: **Success**.

---

## STEP 4

From the repo root on your machine:

```bash
node --experimental-strip-types scripts/verify-live-db-schema.ts
```

---

## STEP 5 — Expected output

The summary line must show:

```text
0 FAIL
```

In particular these must be **PASS**:

- `col.live_sessions.room_id`
- `col.live_sessions.space_id`
- `col.live_session_participants.status` / `mic_on` / `cam_on` / `hand_raised` / `sharing` / `updated_at`
- `table.live_polls`
- `table.live_poll_votes`
- `table.live_recordings`
- `table.live_participants_absent`

If PostgREST still shows missing columns right after apply, wait ~10–30s and re-run STEP 3, then STEP 4.

---

## Safety checklist

- [ ] Did not run deprecated `080` / `081` builders (stubs only; optional)
- [ ] Ran `082` then `083` (order matters for polls → recordings is independent but keep this order)
- [ ] Reloaded PostgREST schema
- [ ] Verify script: **0 FAIL**
- [ ] No push / no merge required for this apply

---

## Rollback note

These repairs only **add** nullable columns, indexes, policies, and new poll tables. They do not drop production live tables or delete rows. Removing columns is not required for rollback of Studio features; leave added columns in place.
