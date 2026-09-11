# Audit snapshot — YouTube Live OAuth (for verification recording)

Generated for Google OAuth verification demo tooling. Source of truth is the repository.

## Scope (code)

- Constant: `YOUTUBE_OAUTH_SCOPES` in `lib/live/destinations/adapters/youtube.ts`
- Value: **only** `https://www.googleapis.com/auth/youtube.force-ssl`
- Broader `https://www.googleapis.com/auth/youtube` is **not** requested in the authorize URL

## Routes

| Step | Path |
|---|---|
| Connect UI | `/communities/live?open=settings` (Live Settings → Live Destinations) |
| Legacy redirect | `/identity/live-destinations` → Live Settings |
| Start | `/api/integrations/youtube/start` |
| Google authorize | `https://accounts.google.com/o/oauth2/v2/auth` |
| Callback | `/api/integrations/youtube/callback` |
| Production redirect URI | `https://www.jimvio.com/api/integrations/youtube/callback` |

## Auth URL params (YouTube Live)

- `client_id` = `YOUTUBE_CLIENT_ID`
- `redirect_uri` = canonical app origin + `/api/integrations/youtube/callback`
- `response_type=code`
- `scope=https://www.googleapis.com/auth/youtube.force-ssl`
- `access_type=offline`
- `prompt=consent`
- `state` = single-use hashed OAuth state (`live_oauth_states`)

## Functionality using the scope

`YouTubeDestinationAdapter.prepare/start/stop`:

- `POST /youtube/v3/liveBroadcasts`
- `POST /youtube/v3/liveStreams`
- bind broadcast ↔ stream
- transition broadcast live / complete
- LiveKit Stream Egress pushes RTMP to YouTube ingest

## Separate login OAuth

`lib/auth/actions.ts` → `signInWithGoogle` via Supabase provider `google`, callback `/auth/callback`. Different purpose; do not use as the verification consent demo for YouTube Live.
