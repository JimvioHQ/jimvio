# Google OAuth verification demo — status report

**Status:** Recorder lifecycle fixed and pushed (`2b5d08ea`). A headed run reached real Google OAuth + Live Studio once, but frame inspection showed **account picker + unverified-app warning without a clear YouTube permission consent UI**, and Disconnect was missing — that file was archived as incomplete. Later re-runs failed because Chrome was closed during Jimvio login.

This is **not** a claim of Google verification approval.

### Previous code 2 root cause (2026-09-11)

`page.waitForURL: Target page, context or browser has been closed` during Jimvio login pause (~42s). The script did **not** close Chrome during the pause; Chrome was closed externally. `finally` then set `exitCode=2` because blockers were non-empty.

### Recorder fixes shipped

- Indefinite headed pause with heartbeats; clear “DO NOT CLOSE” guidance
- Fail with `Browser was closed before OAuth demo completion.` (no fake success)
- Archive incomplete `.webm` under `tmp/google-oauth-verification/incomplete/`
- Require detected YouTube permission text before accepting Google return; auto-reconnect if skipped
- Disconnect via `aria-label="Disconnect destination"`
- 1920×1080 recording; save `.auth/demo-jimvio.json` after login (gitignored)


## A. Previous Google rejection root cause

1. Demo did not show the OAuth consent flow.
2. Demo did not sufficiently demonstrate app functionality beyond “Connected.”

## B. Current YouTube OAuth scope

`https://www.googleapis.com/auth/youtube.force-ssl` only  
(`YOUTUBE_OAUTH_SCOPES` in `lib/live/destinations/adapters/youtube.ts`)

## C. Exact OAuth route recorded

Production:

1. UI: `/communities/live?open=settings` → Connect YouTube  
2. Start: `/api/integrations/youtube/start`  
3. Google: `accounts.google.com/o/oauth2/v2/auth`  
4. Callback: `/api/integrations/youtube/callback`  
5. Return: Live Settings with `dest_connected=youtube`

## D–L. Recording evidence checklist

Fill after `npm run demo:youtube-oauth-record` + manual Google Allow + `npm run demo:youtube-oauth-inspect`:

| Item | Status |
|---|---|
| D. REAL Google consent screen recorded | Pending interactive run |
| E. Exact YouTube permission visible | Pending interactive run |
| F. Consent screen English | Pending (`locale: en-US` in recorder) |
| G. Authorization action recorded | Pending interactive run |
| H. Callback recorded | Pending interactive run |
| I. YouTube connection demonstrated | Pending interactive run |
| J. Exact YouTube functionality | Live Studio Go Live → destination prepare (`liveBroadcasts` / `liveStreams`) |
| K. Real YouTube result | YouTube Studio tab after Go Live (if session allows) |
| L. Disconnect demonstrated | Pending interactive run |

## M–P. Video artifact

| Item | Value |
|---|---|
| M. Duration | Target 4–6 minutes |
| N. Resolution | 1440×900 Playwright viewport (export/upscale to 1080p if needed) |
| O. Path | `tmp/google-oauth-verification/jimvio-youtube-oauth-verification.webm` (gitignored) |
| P. Method | Headed Playwright Chrome (`scripts/google-oauth-verification/record-youtube-demo.mjs`) |

## Q–S. Automated checks (pre-recording)

| Item | Result |
|---|---|
| Q. YouTube verify suite | Passed (`VERIFY_FILTER=youtube npm test`) |
| R. Typecheck / build types | Passed (`npm run type-check:build`) |
| S. Security | Recorder avoids banners on Google hosts; do not commit tokens/videos; inspect frames for secrets before upload |

## T. Manual interaction required

**MANUAL ACTION REQUIRED — Google authentication/consent**

When Chrome opens on Google:

1. Select the authorized test account  
2. Complete MFA if prompted  
3. Leave any “unverified app” warning visible; continue honestly  
4. Confirm YouTube / `youtube.force-ssl` permission in English  
5. Click **Allow** / **Continue**

Also required once: Jimvio session (login or `DEMO_STORAGE_STATE=.auth/live-host.json`).

## U. Remaining blocker

Cannot produce a truthful Google-submit video without a human completing the real Google consent screen in a headed browser. Do not mock or inject tokens.
