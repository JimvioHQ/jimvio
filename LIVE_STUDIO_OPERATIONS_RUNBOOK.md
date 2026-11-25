# LIVE STUDIO OPERATIONS RUNBOOK

**Service:** Jimvio Live Studio  
**Owners:** Platform / Community eng  
**Primary health:** `GET /api/live/health`

---

## Architecture (frozen)

```
Client (Next.js Studio)
    → Supabase (auth, live_sessions, participants, polls, chat, realtime)
    → LiveKit (SFU media only)
    → Cloudinary (assets; durable egress replay in v1.1)
```

---

## Required environment

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_LIVEKIT_URL` or `LIVEKIT_URL` | LiveKit WebSocket URL |
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | Token + egress + webhook verify |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase |
| Anon / publishable + service role | Client + server |
| `CLOUDINARY_CLOUD_NAME` / `API_KEY` / `API_SECRET` | Uploads |
| `LIVE_STUDIO_REQUIRE_INFRA=true` | Optional: fail boot if Live Studio env incomplete |

### Optional (v1.1 durable recording)

| Variable | Purpose |
|----------|---------|
| `LIVEKIT_EGRESS_S3_*` | Egress file output (or configure LiveKit Cloud storage) |

For Backblaze B2, `LIVEKIT_EGRESS_S3_ACCESS_KEY` must be the **standard S3-compatible Application Key ID** and `LIVEKIT_EGRESS_S3_SECRET` its matching **Application Key**. Do not use the B2 master application key; it is not supported by the S3-compatible API. Restrict the key to the `jimvio-live-recordings` bucket with `writeFiles` and `readFiles` access. Use the bucket's exact region (existing Jimvio recordings use `us-east-005`) and endpoint `https://s3.us-east-005.backblazeb2.com`.

Webhook URL: `https://<host>/api/live/egress/webhook`

---

## Migrations

Apply in order (SQL Editor):

1. `database/migrations/082_live_schema_repair.sql`  
2. `database/migrations/083_live_recordings_repair.sql`  
3. `NOTIFY pgrst, 'reload schema';`

Verify: `node --experimental-strip-types scripts/verify-live-db-schema.ts` → **0 FAIL**

---

## Day-2 operations

### Health check

```bash
curl -sS https://<host>/api/live/health
# expect: {"ok":true,...}
```

### Stuck live sessions

```sql
SELECT id, title, host_id, started_at
FROM public.live_sessions
WHERE status = 'live'
ORDER BY started_at DESC;
```

End abandoned sessions (ops only):

```sql
UPDATE public.live_sessions
SET status = 'ended', ended_at = now(), updated_at = now()
WHERE id = '<session_id>';
```

### LiveKit rooms

Room name pattern: `jimvio-live-<sessionUuid>`  
Inspect via LiveKit Cloud dashboard or RoomServiceClient.

### Structured logs

Look for JSON lines with `"scope":"live_studio"` (`token_mint`, `session_create`, `recording_*`, `egress_webhook`, `security_denied`).

---

## Incident playbooks

| Symptom | Check | Action |
|---------|-------|--------|
| Token 503 | Env / health | Restore LiveKit + Supabase secrets |
| Token 401 | Auth cookies | User re-login |
| No remote A/V | LiveKit URL / firewall | Confirm `wss` URL; role canPublish |
| Chat silent | Realtime publication | Ensure `live_*` / messages on `supabase_realtime` |
| Egress fail `output` | Storage config | v1.1 — configure S3 or LiveKit Cloud storage |
| High join latency | LiveKit region / cold start | Warm room create; check API latency |

---

## Verification scripts

```bash
node --experimental-strip-types scripts/verify-live-db-schema.ts
node --experimental-strip-types scripts/verify-live-studio-stage2.ts
node --experimental-strip-types scripts/verify-live-studio-release.ts
LIVE_E2E_STORAGE_STATE=.auth/live-host.json npx playwright test e2e/live-studio.spec.ts --project=chromium
```

---

## Safari QA

Automated WebKit unsupported on macOS 12 agents. Validate Safari via GitHub Actions `macos-13`/`macos-14`, a macOS 13+ machine, or manual QA.
