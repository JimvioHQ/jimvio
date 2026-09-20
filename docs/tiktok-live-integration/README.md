# TikTok Live Destinations — App Review & Portal Package

Jimvio TikTok integration review package. **Honest status only.**

## Binary status (do not blur)

| Capability | Status |
|---|---|
| **ACCOUNT CONNECTION** (Login Kit) | Operational when `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` are set |
| **LIVE PUBLISHING** (programmatic multistream) | **Blocked** — TikTok has not granted Jimvio an official programmatic LIVE Open API |

> TIKTOK ACCOUNT CONNECTION IS OPERATIONAL, BUT TIKTOK LIVE PUBLISHING REMAINS BLOCKED BY OFFICIAL TIKTOK PRODUCT/APPROVAL ACCESS.

## What Jimvio is

Jimvio is a production creator-commerce platform (`https://www.jimvio.com/`).

Creators start a live stream from **Jimvio Live Studio**. Architecture:

1. Browser publishes to **LiveKit** (Jimvio live session)
2. Server-side **LiveKit Egress / destination manager** fans out to supported external destinations
3. Supported today for LIVE fan-out: **Jimvio**, **YouTube**, **Twitch**, **Custom RTMP**
4. **TikTok**: Login Kit account connection is live; LIVE fan-out awaits official product access

TikTok integration is **user-initiated**. A Jimvio user connects their TikTok account through the official TikTok authorization flow. Only approved TikTok capabilities are requested.

## Official products (developers.tiktok.com audit)

| Product | Relevance to Jimvio LIVE |
|---|---|
| **Login Kit** | Used for account identity (`user.info.basic`) |
| **Content Posting API** | VOD / Direct Post / Upload — **not** LIVE streaming |
| **Programmatic LIVE / RTMP Open API** | **Not documented** as a public third-party Open API |

Manual stream keys from TikTok LIVE Center are creator-session UI and are **not** an Open API Jimvio can call on behalf of users.

## Scopes Jimvio requests (current)

- `user.info.basic` only (`TIKTOK_LOGIN_KIT_SCOPE`)

Jimvio does **not** request `video.publish` / `video.upload` for Live Destinations. Those scopes are for Content Posting (VOD), not LIVE multistream.

## Production OAuth

| Item | Value |
|---|---|
| Website | `https://www.jimvio.com/` |
| Callback | `https://www.jimvio.com/api/integrations/tiktok/callback` |
| Start | `GET /api/integrations/tiktok/start` |
| Platform | Web Login Kit (HTTPS redirect; no PKCE) |

## Portal checklist (user / admin action)

Complete in [TikTok Developer Portal](https://developers.tiktok.com/):

1. Application name, icon, description, category
2. Website URL: `https://www.jimvio.com/`
3. Privacy Policy + Terms of Service URLs (Jimvio production)
4. Web platform + redirect URI matching production callback above
5. Login Kit enabled; scope `user.info.basic`
6. URL ownership verification if required
7. App Review materials for Login Kit (if not already Live)
8. **If TikTok ever offers a LIVE product:** request that product explicitly; do not claim LIVE until granted

## Review explanation (copy for portal)

```
Jimvio is a production creator-commerce platform at https://www.jimvio.com/.

Creators use Jimvio Live Studio to start a live session. Media is handled by
LiveKit on Jimvio; a server-side destination layer fans out to platforms the
creator has authorized (YouTube, Twitch, Custom RTMP).

TikTok: users connect their TikTok account via official Login Kit OAuth
(user.info.basic) to link identity in Live Destinations. Jimvio does not
request Content Posting scopes for this flow.

Jimvio does not claim TikTok LIVE publishing until TikTok grants an official
programmatic LIVE capability for this application. Account connection and LIVE
publishing are separate.
```

## Demo video script (reviewer-ready — honest)

Show only what works today; **do not fake external TikTok LIVE**.

1. Open `https://www.jimvio.com/`
2. Authenticate
3. Open `https://www.jimvio.com/communities/live/`
4. Open Live Settings → Live Destinations
5. TikTok shows **Not connected** → **Connect**
6. Complete TikTok authorization
7. Return to Jimvio → TikTok shows **Connected**
8. Confirm TikTok **cannot** be selected for multistream while LIVE API is blocked
9. Optionally Go Live to Jimvio (+ YouTube/Twitch if connected) to show studio works
10. Stop Live; TikTok account remains Connected

**Do not** demonstrate or claim TikTok LIVE on TikTok.com until official LIVE access exists.

## Code readiness when LIVE access is granted

1. Confirm official API contract in TikTok docs (ingest URL/key, create/start/stop, status)
2. Implement `TikTokLiveDestinationAdapter` against that contract only
3. Flip `isTikTokOfficialLivePublishingAvailable()` in `lib/live/destinations/tiktok-live-gate.ts`
4. Request only the scopes that contract requires
5. Wire LiveKit egress to TikTok-provided destination details
6. Run real external LIVE verification before marking production-ready

## Environment variables (no secret values)

| Variable | Purpose | Required for | Status expectation |
|---|---|---|---|
| `TIKTOK_CLIENT_KEY` | Login Kit client key | Account connect | Must be set in production |
| `TIKTOK_CLIENT_SECRET` | Login Kit client secret | Account connect | Must be set in production |
| `LIVE_DESTINATION_ENCRYPTION_KEY` | AES encrypt stored tokens | All destinations | Must be set in production |
| `TIKTOK_LIVE_ENABLED` | Legacy flag — **ignored** for LIVE readiness | N/A | Do not use to fake LIVE |

## Exact next action for the operator

1. Open TikTok Developer Portal for the Jimvio app
2. Confirm Login Kit is Live / approved for production redirect URI
3. Check Products for any official **LIVE** / broadcast product
4. If none exists: open a TikTok partner/support request asking whether programmatic LIVE ingest is available for web apps like Jimvio
5. If a LIVE product exists but is not approved: complete App Review for that product only
6. Notify engineering when TikTok documents grantable LIVE API access — adapter can then be activated without inventing endpoints
