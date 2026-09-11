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

## Record (headed Chrome)

```bash
# Optional: reuse a Jimvio Playwright storage state (NOT Google YouTube tokens)
# node --experimental-strip-types scripts/setup-live-e2e-auth.ts

DEMO_BASE_URL=https://www.jimvio.com \
DEMO_STORAGE_STATE=.auth/live-host.json \
node scripts/google-oauth-verification/record-youtube-demo.mjs
```

**Do not close the Playwright Chrome window** during pauses. The script keeps Chrome open indefinitely (`DEMO_MANUAL_TIMEOUT_MS=0` default), prints heartbeats, and continues only after detecting success.

When the terminal prints `JIMVIO LOGIN REQUIRED` or `GOOGLE OAUTH CONSENT REQUIRED`:

1. Complete the step in the **visible** Chrome window.
2. Leave Chrome open.
3. Return to the terminal — recording continues automatically.

For Google consent: complete the **real** account selection / MFA / Allow (including any unverified-app warning). Do not bypass Google.

If you manually close Chrome, the run fails with: `Browser was closed before OAuth demo completion.` Incomplete `.webm` files are archived under `tmp/google-oauth-verification/incomplete/`.

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
