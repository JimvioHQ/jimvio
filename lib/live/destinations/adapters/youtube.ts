import { platformCapabilities } from "../capabilities";
import type {
  AdapterContext,
  AdapterResult,
  DestinationAdapter,
} from "./base";
import type { EncryptedCredentialPayload, PreparedIngest } from "../types";

const YT_API = "https://www.googleapis.com/youtube/v3";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

/**
 * Minimum scope for YouTube Live Streaming API (liveBroadcasts / liveStreams).
 * Either `youtube` or `youtube.force-ssl` is sufficient — request only one.
 * Do not also request the broader `youtube` scope (redundant sensitive scope).
 * Separate from Supabase Google login OAuth.
 */
export const YOUTUBE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/youtube.force-ssl",
] as const;

export const YOUTUBE_OAUTH_REDIRECT_PATH =
  "/api/integrations/youtube/callback";

function clientCreds(): { id: string; secret: string } | null {
  const id = process.env.YOUTUBE_CLIENT_ID?.trim();
  const secret = process.env.YOUTUBE_CLIENT_SECRET?.trim();
  if (!id || !secret) return null;
  return { id, secret };
}

async function ytFetch(
  path: string,
  accessToken: string,
  init?: RequestInit
): Promise<Response> {
  return fetch(`${YT_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

export class YouTubeDestinationAdapter implements DestinationAdapter {
  readonly platform = "youtube" as const;
  readonly capabilities = platformCapabilities("youtube");

  async refreshCredentials(
    ctx: AdapterContext
  ): Promise<AdapterResult<EncryptedCredentialPayload>> {
    const creds = clientCreds();
    if (!creds) {
      return {
        ok: false,
        error: "YouTube OAuth credentials are not configured.",
        permanent: true,
      };
    }
    const refresh = ctx.credentials?.refreshToken;
    if (!refresh) {
      return {
        ok: false,
        error: "Your YouTube connection expired. Reconnect YouTube.",
        permanent: true,
      };
    }

    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: creds.id,
        client_secret: creds.secret,
        refresh_token: refresh,
        grant_type: "refresh_token",
      }),
    });

    if (!res.ok) {
      return {
        ok: false,
        error: "Your YouTube connection expired. Reconnect YouTube.",
        permanent: true,
      };
    }

    const json = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
      scope?: string;
    };
    if (!json.access_token) {
      return {
        ok: false,
        error: "Your YouTube connection expired. Reconnect YouTube.",
        permanent: true,
      };
    }

    return {
      ok: true,
      value: {
        ...ctx.credentials,
        accessToken: json.access_token,
        refreshToken: refresh,
        expiresAt: new Date(
          Date.now() + (json.expires_in ?? 3600) * 1000
        ).toISOString(),
        scopes: json.scope?.split(" ") ?? ctx.credentials?.scopes,
      },
    };
  }

  private async ensureAccess(
    ctx: AdapterContext
  ): Promise<AdapterResult<string>> {
    const expires = ctx.credentials?.expiresAt
      ? new Date(ctx.credentials.expiresAt).getTime()
      : 0;
    if (
      ctx.credentials?.accessToken &&
      expires > Date.now() + 60_000
    ) {
      return { ok: true, value: ctx.credentials.accessToken };
    }
    const refreshed = await this.refreshCredentials(ctx);
    if (!refreshed.ok) return refreshed;
    ctx.credentials = refreshed.value;
    return { ok: true, value: refreshed.value.accessToken! };
  }

  async validate(ctx: AdapterContext): Promise<AdapterResult<{ ok: true }>> {
    if (!clientCreds()) {
      return {
        ok: false,
        error: "YouTube OAuth credentials are not configured.",
        permanent: true,
      };
    }
    if (!ctx.credentials?.refreshToken && !ctx.credentials?.accessToken) {
      return {
        ok: false,
        error: "YouTube is not connected. Connect YouTube first.",
        permanent: true,
      };
    }
    const token = await this.ensureAccess(ctx);
    if (!token.ok) return token;

    const res = await ytFetch(
      "/channels?part=snippet&mine=true",
      token.value
    );
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        error: "YouTube authorization was revoked. Reconnect YouTube.",
        permanent: true,
      };
    }
    if (!res.ok) {
      return { ok: false, error: "Could not validate YouTube channel." };
    }
    return { ok: true, value: { ok: true } };
  }

  async prepare(ctx: AdapterContext): Promise<AdapterResult<PreparedIngest>> {
    const token = await this.ensureAccess(ctx);
    if (!token.ok) return token;

    const privacy =
      ctx.metadata.privacy === "private"
        ? "private"
        : ctx.metadata.privacy === "unlisted"
          ? "unlisted"
          : "public";

    const broadcastRes = await ytFetch(
      "/liveBroadcasts?part=snippet,status,contentDetails",
      token.value,
      {
        method: "POST",
        body: JSON.stringify({
          snippet: {
            title: ctx.metadata.title.slice(0, 100) || "Jimvio Live",
            description: (ctx.metadata.description ?? "").slice(0, 5000),
            scheduledStartTime:
              ctx.metadata.scheduledStart ?? new Date().toISOString(),
          },
          status: {
            privacyStatus: privacy,
            selfDeclaredMadeForKids: false,
          },
          contentDetails: {
            enableAutoStart: true,
            enableAutoStop: true,
          },
        }),
      }
    );

    if (!broadcastRes.ok) {
      const err = await broadcastRes.text().catch(() => "");
      if (/quota/i.test(err)) {
        return { ok: false, error: "YouTube API quota exceeded. Try again later." };
      }
      return {
        ok: false,
        error: "Could not create YouTube live broadcast.",
      };
    }

    const broadcast = (await broadcastRes.json()) as { id?: string };
    if (!broadcast.id) {
      return { ok: false, error: "Invalid YouTube broadcast response." };
    }

    const streamRes = await ytFetch(
      "/liveStreams?part=snippet,cdn,status",
      token.value,
      {
        method: "POST",
        body: JSON.stringify({
          snippet: {
            title: ctx.metadata.title.slice(0, 100) || "Jimvio Live",
          },
          cdn: {
            frameRate: "variable",
            ingestionType: "rtmp",
            resolution: "variable",
          },
        }),
      }
    );

    if (!streamRes.ok) {
      return { ok: false, error: "Could not create YouTube live stream." };
    }

    const stream = (await streamRes.json()) as {
      id?: string;
      cdn?: {
        ingestionInfo?: {
          ingestionAddress?: string;
          streamName?: string;
          rtmpsIngestionAddress?: string;
        };
      };
    };

    const info = stream.cdn?.ingestionInfo;
    const base =
      info?.rtmpsIngestionAddress ||
      info?.ingestionAddress ||
      "";
    const streamName = info?.streamName || "";
    if (!stream.id || !base || !streamName) {
      return { ok: false, error: "YouTube did not return ingestion credentials." };
    }

    const bindRes = await ytFetch(
      `/liveBroadcasts/bind?id=${encodeURIComponent(broadcast.id)}&streamId=${encodeURIComponent(stream.id)}&part=id,contentDetails`,
      token.value,
      { method: "POST" }
    );
    if (!bindRes.ok) {
      return { ok: false, error: "Could not bind YouTube broadcast to stream." };
    }

    const pushUrl = `${base.replace(/\/+$/, "")}/${streamName}`;

    return {
      ok: true,
      value: {
        rtmpUrl: base,
        pushUrl,
        providerBroadcastId: broadcast.id,
        providerStreamId: stream.id,
      },
    };
  }

  async start(
    ctx: AdapterContext & { prepared: PreparedIngest }
  ): Promise<AdapterResult<void>> {
    const token = await this.ensureAccess(ctx);
    if (!token.ok) return token;
    const broadcastId = ctx.prepared.providerBroadcastId;
    if (!broadcastId) return { ok: true, value: undefined };

    // Prefer transition to live; enableAutoStart may already handle it.
    const res = await ytFetch(
      `/liveBroadcasts/transition?broadcastStatus=live&id=${encodeURIComponent(broadcastId)}&part=status`,
      token.value,
      { method: "POST" }
    );
    if (!res.ok) {
      // Non-fatal if already live / waiting for stream
      const body = await res.text().catch(() => "");
      if (!/liveStreamingNotActive|redundantTransition|invalidTransition/i.test(body)) {
        return {
          ok: false,
          error: "YouTube broadcast could not transition to live yet.",
        };
      }
    }
    return { ok: true, value: undefined };
  }

  async stop(
    ctx: AdapterContext & { prepared?: PreparedIngest | null }
  ): Promise<AdapterResult<void>> {
    const token = await this.ensureAccess(ctx);
    if (!token.ok) {
      // Best-effort stop; don't block Jimvio cleanup on expired token
      return { ok: true, value: undefined };
    }
    const broadcastId = ctx.prepared?.providerBroadcastId;
    if (!broadcastId) return { ok: true, value: undefined };

    await ytFetch(
      `/liveBroadcasts/transition?broadcastStatus=complete&id=${encodeURIComponent(broadcastId)}&part=status`,
      token.value,
      { method: "POST" }
    ).catch(() => undefined);

    return { ok: true, value: undefined };
  }
}

export async function exchangeYouTubeCode(input: {
  code: string;
  redirectUri: string;
}): Promise<
  AdapterResult<{
    credentials: EncryptedCredentialPayload;
    channelId: string;
    channelTitle: string;
    avatarUrl: string | null;
  }>
> {
  const creds = clientCreds();
  if (!creds) {
    return {
      ok: false,
      error: "YouTube OAuth credentials are not configured.",
      permanent: true,
    };
  }

  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: input.code,
      client_id: creds.id,
      client_secret: creds.secret,
      redirect_uri: input.redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return { ok: false, error: "YouTube authorization failed.", permanent: true };
  }

  const tokens = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };

  if (!tokens.access_token) {
    return { ok: false, error: "YouTube authorization failed.", permanent: true };
  }

  const chRes = await ytFetch(
    "/channels?part=snippet&mine=true",
    tokens.access_token
  );
  if (!chRes.ok) {
    return { ok: false, error: "Could not load YouTube channel.", permanent: true };
  }
  const chJson = (await chRes.json()) as {
    items?: Array<{
      id: string;
      snippet?: { title?: string; thumbnails?: { default?: { url?: string } } };
    }>;
  };
  const channel = chJson.items?.[0];
  if (!channel?.id) {
    return {
      ok: false,
      error: "No YouTube channel found for this account.",
      permanent: true,
    };
  }

  return {
    ok: true,
    value: {
      credentials: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(
          Date.now() + (tokens.expires_in ?? 3600) * 1000
        ).toISOString(),
        scopes: tokens.scope?.split(" ") ?? [],
      },
      channelId: channel.id,
      channelTitle: channel.snippet?.title ?? "YouTube",
      avatarUrl: channel.snippet?.thumbnails?.default?.url ?? null,
    },
  };
}

/** Safe user-facing copy for Google OAuth callback errors (no secrets). */
export function mapYouTubeOAuthError(
  error: string | null | undefined,
  description?: string | null
): string {
  const code = (error ?? "").trim().toLowerCase();
  const desc = (description ?? "").trim();
  const descLower = desc.toLowerCase();

  if (
    /unverified|hasn't verified|has not verified|verification required|app is in testing/i.test(
      desc
    ) ||
    /unverified|verification/i.test(code)
  ) {
    return "Google has not verified this YouTube app yet. Test users can continue from Google's warning, or complete Google Cloud OAuth verification for public use.";
  }

  if (code === "access_denied") {
    return "YouTube authorization was cancelled or denied.";
  }
  if (code === "redirect_uri_mismatch" || /redirect_uri/i.test(descLower)) {
    return "YouTube redirect URI mismatch. Confirm Google Cloud authorized redirect is https://www.jimvio.com/api/integrations/youtube/callback.";
  }
  if (code === "invalid_client" || /invalid_client/i.test(descLower)) {
    return "YouTube OAuth client is misconfigured. Check YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET.";
  }
  if (code === "invalid_grant" || /invalid_grant|expired/i.test(descLower)) {
    return "YouTube authorization expired. Please connect YouTube again.";
  }
  if (!code && !desc) {
    return "YouTube authorization was incomplete.";
  }
  if (desc && desc.length <= 160 && !/secret|token|client_id/i.test(desc)) {
    return desc;
  }
  return "YouTube authorization failed. Please try again.";
}

export function youtubeAuthUrl(input: {
  state: string;
  redirectUri: string;
}): string | null {
  const creds = clientCreds();
  if (!creds) return null;

  let redirectUri: string;
  try {
    const parsed = new URL(input.redirectUri);
    if (parsed.protocol !== "https:" && process.env.NODE_ENV === "production") {
      return null;
    }
    if (/^(localhost|127\.0\.0\.1)$/i.test(parsed.hostname) && process.env.NODE_ENV === "production") {
      return null;
    }
    redirectUri = input.redirectUri;
  } catch {
    return null;
  }

  const params = new URLSearchParams({
    client_id: creds.id,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: YOUTUBE_OAUTH_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state: input.state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
