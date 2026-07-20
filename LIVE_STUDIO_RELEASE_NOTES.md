# LIVE STUDIO RELEASE NOTES

**Product:** Jimvio Live Studio  
**Version candidate:** v1.0.0  
**Date:** 2026-07-20  
**Status:** READY FOR PRODUCTION (durable LiveKit Egress recording deferred to v1.1)

**Final verification (2026-07-20):** TypeScript `tsc --noEmit` PASS · ESLint 0 errors · `next build` PASS · Chromium E2E 14/14 PASS · `.auth/` / `test-results/` / `.env*.local` gitignored

---

## Summary

Live Studio ships community live sessions with LiveKit media transport, Supabase session/roles/realtime, stage controls, chat, polls, and security-gated APIs. Automated QA passed on Chrome, Firefox, and Edge. Safari automation is an OS environment limitation on macOS 12 agents, not a product defect.

---

## What’s included (v1.0.0)

- Host creates / ends live sessions  
- Viewer join / leave  
- Co-host and speaker roles (invite, accept, remove)  
- Camera / microphone / screen share (role-gated LiveKit publish)  
- Live chat via community messages + realtime  
- Polls create + vote  
- LiveKit JWT tokens (2h TTL) with role-scoped publish grants  
- Reconnect / offline media recovery hooks  
- Recording UI + MediaRecorder fallback; Cloudinary credentials wired  
- Health endpoint: `GET /api/live/health`  
- Production schema repair: `082` + `083` (applied)

---

## Deferred to v1.1 (optional — not a v1.0.0 blocker)

- **Durable LiveKit Egress → webhook → Cloudinary → Community Replay**  
  Requires LiveKit Cloud egress storage or `LIVEKIT_EGRESS_S3_*`.  
  Until configured, hosts may use in-browser MediaRecorder upload.

---

## Environment notes

| Item | Note |
|------|------|
| Safari/WebKit E2E | Blocked on macOS 12 Playwright hosts — validate via GHA macOS 13/14, macOS 13+ machine, or manual Safari QA |
| Chrome / Firefox / Edge | Automated matrix PASS |
| Database | 31 PASS / 0 FAIL |

---

## Known limitations

- Durable cloud recording not configured in this environment  
- Safari not auto-certified on macOS 12 agent  
- Dev-mode first paint slower than production build; measure on prod deploy  

---

## Operator prerequisites

1. LiveKit: `NEXT_PUBLIC_LIVEKIT_URL` (or `LIVEKIT_URL`), `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`  
2. Supabase URL + anon + service role  
3. Cloudinary (for asset upload paths)  
4. Migrations `082_live_schema_repair.sql` then `083_live_recordings_repair.sql` applied  
5. Optional for v1.1 recording: egress storage + webhook → `/api/live/egress/webhook`
