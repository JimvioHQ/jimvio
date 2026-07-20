# LIVE STUDIO ROLLBACK

**Scope:** Revert Live Studio v1.0.0 release without destroying community data.

---

## Principles

- Prefer **feature flag / route disable** over dropping tables.  
- **Never** `DROP TABLE` live_* tables in production as a first response.  
- Schema repairs (`082`/`083`) are additive — leave columns in place.

---

## Immediate rollback (app)

1. **Disable Live Studio entry points**
   - Hide / unpublish `/communities/live` and hub Live nav (feature flag or layout gate).  
   - Or revert the deploy to the last known-good commit **before** Live Studio ship.

2. **Stop new sessions**
   - Optionally set `LIVE_STUDIO_REQUIRE_INFRA=false` and remove LiveKit keys so token/recording APIs return 503.  
   - End any `live_sessions` still `status = 'live'`:

   ```sql
   UPDATE public.live_sessions
   SET status = 'ended',
       ended_at = now(),
       updated_at = now()
   WHERE status = 'live';
   ```

3. **LiveKit**
   - In LiveKit Cloud, delete or empty active `jimvio-live-*` rooms if needed.  
   - Rotate API keys only if keys were exposed.

4. **Verify**
   - `GET /api/live/health` may still 200 if env present — confirm UI no longer reachable.  
   - Confirm communities hub loads without Live Studio errors.

---

## Database rollback (avoid unless required)

| Object | Rollback guidance |
|--------|-------------------|
| `live_sessions.room_id` | Leave column; unused is harmless |
| Stage columns on `live_session_participants` | Leave columns |
| `live_polls` / `live_poll_votes` | Leave tables; empty is fine |
| RLS policies from 082/083 | Leaving policies is safer than dropping mid-incident |

If a bad policy blocks unrelated community reads (unexpected), restore prior policy set from backup — do not drop tables.

---

## Git rollback

```bash
# Example — do not run unless instructed
git revert <live-studio-release-commit>
# or redeploy previous production image/tag
```

Do **not** force-push main.

---

## Communication

- Notify community owners that Live is temporarily unavailable.  
- If recording was in progress, note that incomplete egress jobs may fail cleanly.
