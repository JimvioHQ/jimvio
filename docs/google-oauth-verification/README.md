# Google OAuth verification demo (YouTube Live Destinations)

This folder documents how to produce a **real** Google OAuth verification recording for Jimvio’s YouTube Live Destinations integration.

**Do not mock Google. Do not fabricate consent screens. Do not commit private recordings.**

## What Google rejected previously

1. Demo video did **not** show the OAuth consent flow.
2. Demo video did **not** sufficiently demonstrate app functionality (must go beyond Connected).

## Two different Google OAuth flows in Jimvio

| Flow | Client / entry | Callback | Scopes |
|---|---|---|---|
| **Jimvio Google Login** | Supabase `signInWithGoogle` | `/auth/callback` | Supabase/Google login (not YouTube Live) |
| **YouTube Live Destinations** | `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET` | `/api/integrations/youtube/callback` | `https://www.googleapis.com/auth/youtube.force-ssl` only |

The verification video must show **YouTube Live OAuth**, not present normal login as the YouTube authorization.

Google Cloud project referenced for verification: **Jimvio Auth** (`jimvio-auth`). Confirm the YouTube Web client used by production `YOUTUBE_CLIENT_*` belongs to that project.

## Exact production routes (YouTube Live)

1. UI: `https://www.jimvio.com/communities/live?open=settings` → **Live Settings → Live Destinations → Connect**
   - Legacy bookmark `/identity/live-destinations` redirects into Live Settings.
2. Start: `GET /api/integrations/youtube/start`
3. Google authorize: `https://accounts.google.com/o/oauth2/v2/auth` with scope `youtube.force-ssl`
4. Callback: `GET /api/integrations/youtube/callback` → returns to Live Settings with Connected toast
5. Functionality: Live Studio Go Live → destination prepare creates YouTube `liveBroadcasts` + `liveStreams` + bind (+ transition)

## Prepare (reset YouTube Live grant only)

Disconnects YouTube inside Jimvio so production can revoke **only** the YouTube Live Google client grant (`oauth2.googleapis.com/revoke`). This does **not** remove Sign in with Google / Supabase login.

```bash
DEMO_BASE_URL=https://www.jimvio.com npm run demo:youtube-oauth-reset
```

Optional (high-confidence Google UI only; never Delete all / Sign-in):

```bash
DEMO_FORCE_GOOGLE_UI_RESET=1 DEMO_BASE_URL=https://www.jimvio.com npm run demo:youtube-oauth-reset
```

## Record (headed Chrome)

```bash
DEMO_BASE_URL=https://www.jimvio.com npm run demo:youtube-oauth-record
```

Uses a persistent profile under `tmp/google-oauth-verification/chrome-profile` (gitignored). The recorder:

1. Keeps Chrome open during Jimvio login if needed  
2. Disconnects YouTube first (YouTube-client revoke only)  
3. Connects YouTube and drives the real Google UI (account → Advanced if needed → wait for YouTube permission → Allow)  
4. Refuses success unless YouTube permission was visible  
5. Demonstrates Live Studio + Disconnect  

**Never** revoke “How Google helps you sign in to Jimvio” / Sign in with Google.
Outputs (gitignored):

- `tmp/google-oauth-verification/jimvio-youtube-oauth-verification.webm`
- `tmp/google-oauth-verification/frames/*.png`
- `tmp/google-oauth-verification/checklist.json`
- `tmp/google-oauth-verification/run-report.json`

## Inspect

```bash
node scripts/google-oauth-verification/inspect-recording.mjs
```

Then **manually** re-watch the consent segment and confirm:

- Full real Google consent UI (uncropped)
- English
- YouTube permission matching `youtube.force-ssl`
- Allow/Continue
- Return to Jimvio Connected
- Live Studio / destination functionality
- Disconnect

## npm shortcut

```bash
npm run demo:youtube-oauth-record
npm run demo:youtube-oauth-inspect
```
