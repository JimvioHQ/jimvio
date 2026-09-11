# Final video checklist (Google Verification Centre)

Mark only what is **visibly present** in the final recording.

## Consent / OAuth

- [ ] End-to-end application flow
- [ ] OAuth grant process
- [ ] REAL Google OAuth Consent Screen (not simulated)
- [ ] Same exact scopes as verification (`youtube.force-ssl`)
- [ ] English consent screen
- [ ] Actual authorization action (Allow/Continue)
- [ ] Redirect/callback to Jimvio
- [ ] Unverified warning shown honestly if Google displays it

## Functionality

- [ ] Jimvio branding + purpose
- [ ] Live Studio → Live Settings → Live Destinations
- [ ] Connect YouTube
- [ ] YouTube Connected state
- [ ] Live Studio Go Live / destination fan-out
- [ ] YouTube used as live destination (not stop at Connected)
- [ ] Real YouTube API-driven result and/or YouTube Studio resource
- [ ] Disconnect

## Quality / security

- [ ] ~1080p 16:9, readable text
- [ ] No secrets/tokens/passwords/env vars
- [ ] No developer console / terminal
- [ ] Normal Jimvio Google Login not presented as YouTube Live OAuth
- [ ] `inspect-recording.mjs` passed
- [ ] Manual re-watch of consent segment completed

## Recorder artifacts

- [ ] `tmp/google-oauth-verification/jimvio-youtube-oauth-verification.webm`
- [ ] `checklist.json` / `inspection.json` reviewed
- [ ] Frames under `frames/` reviewed
