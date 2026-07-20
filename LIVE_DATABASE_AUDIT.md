# LIVE DATABASE AUDIT — Jimvio Live Studio

**Date:** 2026-07-20  
**Project:** `vsfhwfimudpdipdkxbww` (from `NEXT_PUBLIC_SUPABASE_URL`)  
**Method:** Live PostgREST OpenAPI + table probes (service role). No guessed columns.

Nothing in this document was pushed or merged.

---

## 1. Root cause — `ERROR: column "room_id" does not exist`

### Exact failure chain

1. Production already had `public.live_sessions` with a **streaming** schema that includes **`space_id`** and does **not** include **`room_id`**.
2. Migration `080_live_studio.sql` used:

   ```sql
   CREATE TABLE IF NOT EXISTS public.live_sessions ( ..., room_id UUID ..., );
   ```

   Because the table already existed, this statement was a **no-op**.
3. The next statement:

   ```sql
   CREATE INDEX IF NOT EXISTS idx_live_sessions_room
     ON public.live_sessions(room_id);
   ```

   evaluated against the **existing** table and failed with:

   ```text
   ERROR: column "room_id" does not exist
   ```

### Confirmed via live API

```text
GET /rest/v1/live_sessions?select=room_id
→ 400  column live_sessions.room_id does not exist
   hint: Perhaps you meant to reference the column "live_sessions.host_id"
```

---

## 2. Existing production schema (audited)

### Community substrate (compatible)

| Table | Relevant columns (verified) |
|-------|-----------------------------|
| `communities` | `id`, `owner_id`, … |
| `community_memberships` | `community_id`, `user_id` → **profiles.id**, `role`, `status` |
| `spaces` | `id`, `community_id`, … |
| `rooms` | `id`, `space_id`, `community_id`, `room_type`, … |
| `community_messages` | `room_id` → **rooms.id**, `community_id`, `sender_id`, … |

Membership roles observed in data: `owner`, `member` (policies still allow `admin` / `moderator`).

### Live objects already present

| Table | Notes |
|-------|-------|
| `live_sessions` | **space_id** (required), host_id → profiles, streaming fields (`privacy`, `stream_key`, `settings`, counters, recording_*). **No room_id** before repair. |
| `live_session_participants` | session/user/role/joined_at/left_at/connection_id/metadata. **Not** `live_participants`. |
| `live_session_messages` | Session chat (separate from `community_messages`). |
| `live_session_signals` | Signaling payloads. |
| `live_recordings` | Already matches RC4 metadata shape (`egress_id`, Cloudinary fields, status, …). Empty rows at audit time. |

### Live objects missing before repair

| Table | Status |
|-------|--------|
| `live_participants` | Does not exist (correct — do not create a duplicate). |
| `live_polls` | Missing → created by `082`. |
| `live_poll_votes` | Missing → created by `082`. |

### Foreign keys (from OpenAPI notes)

- `live_sessions.host_id` → `profiles.id`
- `live_session_participants.user_id` → `profiles.id`
- `live_sessions.space_id` → `spaces.id`
- `community_messages.room_id` → `rooms.id`

Greenfield migration FKs to `auth.users` for polls were **wrong** for this project; repair uses `profiles(id)`.

---

## 3. Detected drift (RC3/RC4 migrations vs production)

| Assumption in 080/081 | Production reality |
|-----------------------|-------------------|
| Create new `live_sessions` with `room_id` | Table exists; uses `space_id`; no `room_id` |
| Create `live_participants` | Actual table is `live_session_participants` |
| Participants have mic/cam/hand/sharing/status | Those columns were absent |
| Create `live_recordings` | Table already exists |
| Poll FKs → `auth.users` | Project FKs use `profiles` |

---

## 4. Project `room_id` references (scope)

`room_id` is valid on: `community_messages`, `community_posts`, `community_courses`, `community_tasks`, and (after repair) `live_sessions`.

It is **not** a column on production `rooms` itself (rooms have `id`).

Live Studio backend previously inserted `live_sessions.room_id` and queried `live_participants` — both incompatible until this repair.

---

## 5. Repaired objects

### Migrations

| File | Role |
|------|------|
| `080_live_studio.sql` | **Deprecated stub** (NOTICE only) — no longer creates tables |
| `081_live_recordings.sql` | **Deprecated stub** |
| `082_live_schema_repair.sql` | **Apply this** — ALTER live_sessions / participants; create polls; RLS; realtime |
| `083_live_recordings_repair.sql` | **Apply this** — indexes/RLS/realtime for recordings (no recreate) |

### `082` changes

- `ALTER TABLE live_sessions ADD COLUMN room_id` + FK → `rooms(id)` + indexes
- Extend `live_session_participants` with `status`, `mic_on`, `cam_on`, `hand_raised`, `sharing`, `updated_at`
- Unique `(session_id, user_id)` for upserts
- Create `live_polls` / `live_poll_votes` (profiles FKs)
- RLS policies (drop/create idempotent)
- Realtime publication adds (exception-safe)

### `083` changes

- Defensive `ADD COLUMN IF NOT EXISTS` for recording metadata
- Indexes + RLS + realtime

### Backend alignment (production-compatible)

- `services/live/session-service.ts` → `live_session_participants`
- Creates sessions with required `space_id` (+ optional `room_id`, privacy/settings defaults)
- `hooks/live/useLiveSession.ts` realtime table → `live_session_participants`

---

## 6. Migration order

```text
1. 080_live_studio.sql              (optional no-op stub)
2. 081_live_recordings.sql          (optional no-op stub)
3. 082_live_schema_repair.sql       REQUIRED
4. 083_live_recordings_repair.sql  REQUIRED
5. NOTIFY pgrst, 'reload schema';   (or wait for cache refresh)
6. node --experimental-strip-types scripts/verify-live-db-schema.ts
```

Optional local fixture (Docker required):

```bash
./scripts/verify-live-db-repair.sh
```

Uses `database/migrations/fixtures/live_prod_schema_before_repair.sql` to reproduce the `room_id` error, then applies repairs twice (idempotency).

---

## 7. Verification report

### Automated (this environment)

| Check | Result |
|-------|--------|
| Live OpenAPI audit of existing tables | **PASS** (source of truth for repair) |
| Root cause reproduction (select `room_id`) | **PASS** — error confirmed |
| Docker fixture apply (`verify-live-db-repair.sh`) | **BLOCKED** — Docker/psql not installed on this machine |
| Production DDL apply | **BLOCKED** — no `DATABASE_URL` / Supabase CLI login |
| Post-repair PostgREST probe | Run after applying 082+083 in SQL editor |

### Apply instructions (human)

In Supabase Dashboard → SQL Editor, paste and run:

1. Entire contents of `database/migrations/082_live_schema_repair.sql`
2. Entire contents of `database/migrations/083_live_recordings_repair.sql`
3. `NOTIFY pgrst, 'reload schema';`

Then re-run:

```bash
node --experimental-strip-types scripts/verify-live-db-schema.ts
```

Expected: all `col.live_sessions.room_id`, participant stage columns, and `live_polls` / `live_poll_votes` tables **PASS**.

### LiveKit compatibility

LiveKit room naming remains session-id based (`liveKitRoomName(sessionId)`). No DB column required for LiveKit. Session/participant metadata stays in Supabase; media stays in LiveKit.

---

## 8. Safety guarantees

- No `DROP TABLE`
- No data deletes
- No recreation of existing live tables
- No parallel `live_participants` table
- `space_id` retained on `live_sessions`
- Idempotent `ADD COLUMN IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` / policy drop+create

---

## 9. Status

| Gate | Status |
|------|--------|
| Drift diagnosed without guessing | **DONE** |
| Safe repair migrations authored | **DONE** |
| Backend pointed at real tables | **DONE** |
| Migrations applied on production | **PENDING operator** (SQL editor) |
| Zero SQL errors on apply | **PENDING operator verification** |
| Push / merge | **NOT DONE** (per instructions) |
