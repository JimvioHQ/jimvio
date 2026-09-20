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
const VALIDATE_URL = "https://id.twitch.tv/oauth2/validate";
const REVOKE_URL = "https://id.twitch.tv/oauth2/revoke";

/**
 * Scopes requested for Jimvio Twitch Live destination.
 * Only scopes required by actual Helix calls in this adapter.
 */
export const TWITCH_OAUTH_SCOPES = [
  /** PATCH /helix/channels — update stream title during prepare */
  "channel:manage:broadcast",
  /** GET /helix/streams/key — obtain RTMPS stream key for LiveKit egress */
  "channel:read:stream_key",
] as const;

export const TWITCH_OAUTH_REDIRECT_PATH = "/api/integrations/twitch/callback";

/** Server-side token validation TTL (hourly per Twitch guidance for long sessions). */
export const TWITCH_TOKEN_VALIDATE_TTL_MS = 60 * 60 * 1000;

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

function helixErrorMessage(status: number, fallback: string): string {
  if (status === 401) {
    return "Twitch authorization was revoked. Reconnect Twitch.";
  }
  if (status === 403) {
    return "Twitch denied this action. Reconnect Twitch with the required permissions.";
  }
  if (status === 429) {
    return "Twitch rate limit reached. Try again shortly.";
  }
  return fallback;
}

/** Prefer RTMPS when available; fall back to classic ingest. */
function twitchIngestBase(): string {
  return (
    process.env.TWITCH_INGEST_URL?.trim() ||
    "rtmps://live.twitch.tv:443/app"
  );
}

/**
 * Official Twitch OAuth token validation.
 * https://id.twitch.tv/oauth2/validate
 * Never logs the token.
 */
export async function validateTwitchAccessToken(
  accessToken: string
): Promise<
  AdapterResult<{
    clientId: string;
    login: string | null;
    userId: string | null;
    scopes: string[];
    expiresIn: number | null;
  }>
> {
  if (!accessToken?.trim()) {
    return {
      ok: false,
      error: "Twitch is not connected. Connect Twitch first.",
      permanent: true,
    };
  }

  let res: Response;
  try {
    res = await fetch(VALIDATE_URL, {
      method: "GET",
      headers: { Authorization: `OAuth ${accessToken.trim()}` },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return { ok: false, error: "Could not validate Twitch authorization." };
  }

  if (res.status === 401) {
    return {
      ok: false,
      error: "Twitch authorization was revoked. Reconnect Twitch.",
      permanent: true,
    };
  }
  if (!res.ok) {
    return {
      ok: false,
      error: helixErrorMessage(res.status, "Could not validate Twitch authorization."),
      permanent: res.status === 403,
    };
  }

  const json = (await res.json()) as {
    client_id?: string;
    login?: string;
    user_id?: string;
    scopes?: string[];
    expires_in?: number;
  };

  return {
    ok: true,
    value: {
      clientId: json.client_id ?? "",
      login: json.login ?? null,
      userId: json.user_id ?? null,
      scopes: Array.isArray(json.scopes) ? json.scopes : [],
      expiresIn:
        typeof json.expires_in === "number" ? json.expires_in : null,
    },
  };
}

export function mapTwitchOAuthError(
  error: string | null,
  description: string | null
): string {
  const code = (error ?? "").toLowerCase();
  if (code === "access_denied") {
    return "Twitch authorization was cancelled.";
  }
  if (code === "invalid_scope") {
    return "Twitch authorization scopes are invalid. Try connecting again.";
  }
  if (code === "redirect_mismatch") {
    return "Twitch redirect URI mismatch. Contact Jimvio support.";
  }
  if (description?.trim()) {
    return description.trim().slice(0, 160);
  }
  return "Twitch authorization failed. Try connecting again.";
}

/**
 * Best-effort revoke of the Twitch user access token.
 * Local disconnect still proceeds if revoke fails.
 */
export async function revokeTwitchAccess(token: string): Promise<void> {
  if (!token?.trim()) return;
  const creds = clientCreds();
  if (!creds) return;
  try {
    await fetch(REVOKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: creds.id,
        token: token.trim(),
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    /* local disconnect still proceeds */
  }
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
      signal: AbortSignal.timeout(15_000),
    });

    if (res.status === 401 || res.status === 400) {
      return {
        ok: false,
        error: "Twitch authorization was revoked. Reconnect Twitch.",
        permanent: true,
      };
    }
    if (res.status === 429) {
      return {
        ok: false,
        error: "Twitch rate limit reached. Try again shortly.",
      };
    }
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

    const next: EncryptedCredentialPayload = {
      ...ctx.credentials,
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? refresh,
      expiresAt: new Date(
        Date.now() + (json.expires_in ?? 14400) * 1000
      ).toISOString(),
      scopes: json.scope ?? ctx.credentials?.scopes,
      extra: {
        ...(ctx.credentials?.extra ?? {}),
        tokenValidatedAt: new Date().toISOString(),
        tokenValidationStatus: "valid",
      },
    };

    // Confirm refreshed token with official validate endpoint
    const validated = await validateTwitchAccessToken(json.access_token);
    if (!validated.ok) {
      return {
        ok: false,
        error: validated.error,
        permanent: validated.permanent,
      };
    }

    return { ok: true, value: next };
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

    const validated = await validateTwitchAccessToken(token.value);
    if (!validated.ok) {
      // One refresh attempt if validate says invalid and we have a refresh token
      if (validated.permanent && ctx.credentials?.refreshToken) {
        const refreshed = await this.refreshCredentials(ctx);
        if (!refreshed.ok) return refreshed;
        ctx.credentials = refreshed.value;
        return { ok: true, value: { ok: true } };
      }
      return validated;
    }

    if (ctx.credentials) {
      ctx.credentials = {
        ...ctx.credentials,
        extra: {
          ...(ctx.credentials.extra ?? {}),
          tokenValidatedAt: new Date().toISOString(),
          tokenValidationStatus: "valid",
        },
      };
    }

    return { ok: true, value: { ok: true } };
  }

  async prepare(ctx: AdapterContext): Promise<AdapterResult<PreparedIngest>> {
    const token = await this.ensureAccess(ctx);
    if (!token.ok) return token;

    const userRes = await helix("/users", token.value);
    if (!userRes.ok) {
      return {
        ok: false,
        error: helixErrorMessage(userRes.status, "Could not load Twitch broadcaster."),
        permanent: userRes.status === 401 || userRes.status === 403,
      };
    }
    const userJson = (await userRes.json()) as {
      data?: Array<{ id: string; login: string }>;
    };
    const broadcaster = userJson.data?.[0];
    if (!broadcaster?.id) {
      return { ok: false, error: "Twitch broadcaster not found." };
    }

    // Update title when API permits (requires channel:manage:broadcast)
    if (ctx.metadata.title) {
      const titleRes = await helix(
        `/channels?broadcaster_id=${encodeURIComponent(broadcaster.id)}`,
        token.value,
        {
          method: "PATCH",
          body: JSON.stringify({
            title: ctx.metadata.title.slice(0, 140),
          }),
        }
      );
      // Non-fatal: stream can still go live without title sync
      if (!titleRes.ok && titleRes.status !== 429) {
        /* title sync failed — continue with stream key */
      }
    }

    const keyRes = await helix(
      `/streams/key?broadcaster_id=${encodeURIComponent(broadcaster.id)}`,
      token.value
    );
    if (!keyRes.ok) {
      return {
        ok: false,
        error:
          keyRes.status === 403 || keyRes.status === 401
            ? "Could not obtain Twitch stream key. Reconnect Twitch with stream key permission."
            : helixErrorMessage(
                keyRes.status,
                "Could not obtain Twitch stream key."
              ),
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

    // Persist stream key encrypted on destination (never returned to browser)
    ctx.credentials = {
      ...ctx.credentials,
      streamKey,
      rtmpUrl: twitchIngestBase(),
      extra: {
        ...(ctx.credentials?.extra ?? {}),
        tokenValidatedAt: new Date().toISOString(),
        tokenValidationStatus: "valid",
      },
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
    signal: AbortSignal.timeout(15_000),
  });

  if (!tokenRes.ok) {
    return {
      ok: false,
      error: helixErrorMessage(tokenRes.status, "Twitch authorization failed."),
      permanent: true,
    };
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

  const validated = await validateTwitchAccessToken(tokens.access_token);
  if (!validated.ok) {
    return {
      ok: false,
      error: validated.error,
      permanent: true,
    };
  }

  const userRes = await helix("/users", tokens.access_token);
  if (!userRes.ok) {
    return {
      ok: false,
      error: helixErrorMessage(userRes.status, "Could not load Twitch user."),
      permanent: true,
    };
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
        scopes: tokens.scope ?? [...TWITCH_OAUTH_SCOPES],
        extra: {
          tokenValidatedAt: new Date().toISOString(),
          tokenValidationStatus: "valid",
        },
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

  let redirectUri: string;
  try {
    const parsed = new URL(input.redirectUri);
    if (parsed.protocol !== "https:" && process.env.NODE_ENV === "production") {
      return null;
    }
    if (
      /^(localhost|127\.0\.0\.1)$/i.test(parsed.hostname) &&
      process.env.NODE_ENV === "production"
    ) {
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
    scope: TWITCH_OAUTH_SCOPES.join(" "),
    state: input.state,
    force_verify: "true",
  });
  return `${AUTH_URL}?${params.toString()}`;
}
