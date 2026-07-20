# LIVE STUDIO POST-DEPLOY CHECKLIST

Complete in order after production deploy. Check each box.

---

## A. Infrastructure

- [ ] Preview and Production secrets match: LiveKit URL + API key/secret  
- [ ] Supabase URL + anon + service role present  
- [ ] Cloudinary cloud name + API key/secret present  
- [ ] `GET https://<prod>/api/live/health` → `ok: true`  
- [ ] Migrations `082` + `083` applied on production DB  
- [ ] `NOTIFY pgrst, 'reload schema';` run (or schema cache refreshed)  

---

## B. Smoke (5–10 minutes)

- [ ] Host opens `/communities/live` — control dock visible  
- [ ] Host goes live / creates session  
- [ ] Second user (viewer) joins same session  
- [ ] Viewer cannot publish (subscribe-only)  
- [ ] Host invites speaker → accept → speaker publishes  
- [ ] Host removes speaker  
- [ ] Mic toggle / camera toggle work for host  
- [ ] Screen share starts (browser permission) for host  
- [ ] Chat message appears for both users  
- [ ] Host creates poll; viewer votes  
- [ ] Host ends live; session status `ended`  
- [ ] Refresh mid-session recovers media or reconnects without hard crash  

---

## C. Security

- [ ] Unauthenticated `POST /api/live/token` → 401  
- [ ] Unauthenticated `POST .../recording` → 401  
- [ ] Non-member cannot join another community’s live (403)  
- [ ] Viewer cannot call record / end / invite successfully  
- [ ] Replay/list recordings only for community members (RLS)  

---

## D. Performance (spot)

- [ ] Token mint < 500 ms (server)  
- [ ] Health < 2 s  
- [ ] Studio interactive < 5 s on production build (cold cache may be higher)  

---

## E. Recording (v1.1 optional)

- [ ] If egress storage configured: start/stop recording → webhook → `live_recordings.status=ready`  
- [ ] If **not** configured: confirm MediaRecorder path or hide durable-record marketing copy  
- [ ] Do **not** block v1.0.0 ship on this section  

---

## F. Browsers

- [ ] Chrome smoke OK  
- [ ] Firefox smoke OK  
- [ ] Edge smoke OK  
- [ ] Safari smoke OK (manual or CI macOS 13+)  
- [ ] Mobile viewport OK  

---

## G. Sign-off

| Role | Name | Date | Sign |
|------|------|------|------|
| Eng | | | |
| Ops | | | |
| Product | | | |

**Deploy URL:** _______________________  
**Release candidate:** Live Studio v1.0.0  
**Verdict:** READY FOR PRODUCTION / HOLD _______________________
