import { platformCapabilities } from "../capabilities";
import type {
  AdapterContext,
  AdapterResult,
  DestinationAdapter,
} from "./base";
import type { EncryptedCredentialPayload, PreparedIngest } from "../types";

const HELIX = "https://api.twitch.tv/helix";
const TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const AUTH_URL = "https://id.twitch.tv/oauth2/authorize";

function clientCreds(): { id: string; secret: string } | null {
  const id = process.env.TWITCH_CLIENT_ID?.trim();
  const secret = process.env.TWITCH_CLIENT_SECRET?.trim();
  if (!id || !secret) return null;
  return { id, secret };
}

async function helix(
  path: string,
  accessToken: string,
  init?: RequestInit
): Promise<Response> {
  const creds = clientCreds();
  return fetch(`${HELIX}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Client-Id": creds?.id ?? "",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

/** Prefer RTMPS when available; fall back to classic ingest. */
function twitchIngestBase(): string {
  return (
    process.env.TWITCH_INGEST_URL?.trim() ||
    "rtmps://live.twitch.tv:443/app"
  );
}

export class TwitchDestinationAdapter implements DestinationAdapter {
  readonly platform = "twitch" as const;
  readonly capabilities = platformCapabilities("twitch");

  async refreshCredentials(
    ctx: AdapterContext
  ): Promise<AdapterResult<EncryptedCredentialPayload>> {
    const creds = clientCreds();
    if (!creds) {
      return {
        ok: false,
        error: "Twitch OAuth credentials are not configured.",
        permanent: true,
      };
    }
    const refresh = ctx.credentials?.refreshToken;
    if (!refresh) {
      return {
        ok: false,
        error: "Twitch authorization was revoked. Reconnect Twitch.",
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
        error: "Twitch authorization was revoked. Reconnect Twitch.",
        permanent: true,
      };
    }

    const json = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string[];
    };
    if (!json.access_token) {
      return {
        ok: false,
        error: "Twitch authorization was revoked. Reconnect Twitch.",
        permanent: true,
      };
    }

    return {
      ok: true,
      value: {
        ...ctx.credentials,
        accessToken: json.access_token,
        refreshToken: json.refresh_token ?? refresh,
        expiresAt: new Date(
          Date.now() + (json.expires_in ?? 14400) * 1000
        ).toISOString(),
        scopes: json.scope ?? ctx.credentials?.scopes,
      },
    };
  }

  private async ensureAccess(
    ctx: AdapterContext
  ): Promise<AdapterResult<string>> {
    const expires = ctx.credentials?.expiresAt
      ? new Date(ctx.credentials.expiresAt).getTime()
      : 0;
    if (ctx.credentials?.accessToken && expires > Date.now() + 60_000) {
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
        error: "Twitch OAuth credentials are not configured.",
        permanent: true,
      };
    }
    if (!ctx.credentials?.accessToken && !ctx.credentials?.refreshToken) {
      return {
        ok: false,
        error: "Twitch is not connected. Connect Twitch first.",
        permanent: true,
      };
    }
    const token = await this.ensureAccess(ctx);
    if (!token.ok) return token;

    const res = await helix("/users", token.value);
    if (res.status === 401) {
      return {
        ok: false,
        error: "Twitch authorization was revoked. Reconnect Twitch.",
        permanent: true,
      };
    }
    if (!res.ok) return { ok: false, error: "Could not validate Twitch account." };
    return { ok: true, value: { ok: true } };
  }

  async prepare(ctx: AdapterContext): Promise<AdapterResult<PreparedIngest>> {
    const token = await this.ensureAccess(ctx);
    if (!token.ok) return token;

    const userRes = await helix("/users", token.value);
    if (!userRes.ok) {
      return { ok: false, error: "Could not load Twitch broadcaster." };
    }
    const userJson = (await userRes.json()) as {
      data?: Array<{ id: string; login: string }>;
    };
    const broadcaster = userJson.data?.[0];
    if (!broadcaster?.id) {
      return { ok: false, error: "Twitch broadcaster not found." };
    }

    // Update title where API permits
    if (ctx.metadata.title) {
      await helix(`/channels?broadcaster_id=${encodeURIComponent(broadcaster.id)}`, token.value, {
        method: "PATCH",
        body: JSON.stringify({
          title: ctx.metadata.title.slice(0, 140),
        }),
      }).catch(() => undefined);
    }

    const keyRes = await helix(
      `/streams/key?broadcaster_id=${encodeURIComponent(broadcaster.id)}`,
      token.value
    );
    if (!keyRes.ok) {
      return {
        ok: false,
        error:
          "Could not obtain Twitch stream key. Reconnect Twitch with stream key permission.",
        permanent: keyRes.status === 401 || keyRes.status === 403,
      };
    }
    const keyJson = (await keyRes.json()) as {
      data?: Array<{ stream_key?: string }>;
    };
    const streamKey = keyJson.data?.[0]?.stream_key;
    if (!streamKey) {
      return { ok: false, error: "Twitch did not return a stream key." };
    }

    // Persist stream key encrypted on destination (refreshCredentials path updates later)
    ctx.credentials = {
      ...ctx.credentials,
      streamKey,
      rtmpUrl: twitchIngestBase(),
    };

    const base = twitchIngestBase();
    return {
      ok: true,
      value: {
        rtmpUrl: base,
        pushUrl: `${base.replace(/\/+$/, "")}/${streamKey}`,
        providerBroadcastId: broadcaster.id,
        providerStreamId: broadcaster.login,
      },
    };
  }

  async start(): Promise<AdapterResult<void>> {
    // Twitch goes live when RTMP ingest receives media — no separate start call.
    return { ok: true, value: undefined };
  }

  async stop(): Promise<AdapterResult<void>> {
    // Ending RTMP ends the Twitch stream.
    return { ok: true, value: undefined };
  }
}

export async function exchangeTwitchCode(input: {
  code: string;
  redirectUri: string;
}): Promise<
  AdapterResult<{
    credentials: EncryptedCredentialPayload;
    accountId: string;
    login: string;
    displayName: string;
    avatarUrl: string | null;
  }>
> {
  const creds = clientCreds();
  if (!creds) {
    return {
      ok: false,
      error: "Twitch OAuth credentials are not configured.",
      permanent: true,
    };
  }

  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.id,
      client_secret: creds.secret,
      code: input.code,
      grant_type: "authorization_code",
      redirect_uri: input.redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    return { ok: false, error: "Twitch authorization failed.", permanent: true };
  }

  const tokens = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string[];
  };
  if (!tokens.access_token) {
    return { ok: false, error: "Twitch authorization failed.", permanent: true };
  }

  const userRes = await helix("/users", tokens.access_token);
  if (!userRes.ok) {
    return { ok: false, error: "Could not load Twitch user.", permanent: true };
  }
  const userJson = (await userRes.json()) as {
    data?: Array<{
      id: string;
      login: string;
      display_name: string;
      profile_image_url?: string;
    }>;
  };
  const user = userJson.data?.[0];
  if (!user) {
    return { ok: false, error: "Twitch user not found.", permanent: true };
  }

  return {
    ok: true,
    value: {
      credentials: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(
          Date.now() + (tokens.expires_in ?? 14400) * 1000
        ).toISOString(),
        scopes: tokens.scope ?? [],
      },
      accountId: user.id,
      login: user.login,
      displayName: user.display_name,
      avatarUrl: user.profile_image_url ?? null,
    },
  };
}

export function twitchAuthUrl(input: {
  state: string;
  redirectUri: string;
}): string | null {
  const creds = clientCreds();
  if (!creds) return null;
  const params = new URLSearchParams({
    client_id: creds.id,
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: [
      "channel:manage:broadcast",
      "channel:read:stream_key",
      "user:read:email",
    ].join(" "),
    state: input.state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}
