# Google OAuth verification demo — status report

**Status:** Recorder lifecycle hardened (keep Chrome open during manual pauses; archive incomplete videos; 1080p). **Final submit-ready video still requires a headed interactive run** (real Google consent cannot be automated).

This is **not** a claim of Google verification approval.

### Previous code 2 root cause (2026-09-11)

`page.waitForURL: Target page, context or browser has been closed` during Jimvio login pause (~42s). The script did **not** close Chrome during the pause; Chrome was closed externally. `finally` then set `exitCode=2` because blockers were non-empty. Incomplete video lacked consent / connected / Live Studio.

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
