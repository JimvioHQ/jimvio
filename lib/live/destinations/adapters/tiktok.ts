import { platformCapabilities, platformReadiness } from "../capabilities";
import { ApprovalRequiredAdapter, type AdapterResult, type DestinationAdapter } from "./base";
import type { EncryptedCredentialPayload } from "../types";

/**
 * TikTok Login Kit (OAuth 2.0) + LIVE destination gate.
 *
 * Login Kit account connection is implemented below.
 * LIVE multistream remains ApprovalRequiredAdapter until official LIVE APIs
 * are approved and intentionally implemented (TIKTOK_LIVE_ENABLED).
 *
 * Do NOT confuse with UGC research view-sync tokens (separate env / product path).
 */

const AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const REVOKE_URL = "https://open.tiktokapis.com/v2/oauth/revoke/";
const USER_INFO_URL = "https://open.tiktokapis.com/v2/user/info/";

/** Baseline Login Kit scope only — never request publish/upload scopes here. */
export const TIKTOK_LOGIN_KIT_SCOPE = "user.info.basic";

export function tikTokClientCreds(): { key: string; secret: string } | null {
  const key = process.env.TIKTOK_CLIENT_KEY?.trim();
  const secret = process.env.TIKTOK_CLIENT_SECRET?.trim();
  if (!key || !secret) return null;
  return { key, secret };
}

/** Login Kit is configured when client key/secret exist (independent of LIVE gate). */
export function isTikTokLoginKitConfigured(): boolean {
  return Boolean(tikTokClientCreds());
}

/**
 * LIVE destination adapter — always approval-gated until official LIVE support.
 * Login Kit OAuth helpers below do not activate LIVE streaming.
 */
export function createTikTokAdapter(): DestinationAdapter {
  const readiness = platformReadiness("tiktok");
  return new ApprovalRequiredAdapter(
    "tiktok",
    platformCapabilities("tiktok"),
    readiness.message ??
      "TikTok Live is not currently enabled for this Jimvio integration."
  );
}

export function tiktokAuthUrl(input: {
  state: string;
  redirectUri: string;
}): string | null {
  const creds = tikTokClientCreds();
  if (!creds) return null;

  const params = new URLSearchParams({
    client_key: creds.key,
    scope: TIKTOK_LOGIN_KIT_SCOPE,
    response_type: "code",
    redirect_uri: input.redirectUri,
    state: input.state,
  });

  return `${AUTH_URL}?${params.toString()}`;
}

type TikTokTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_expires_in?: number;
  open_id?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
  log_id?: string;
};

async function postTokenForm(
  body: URLSearchParams
): Promise<AdapterResult<TikTokTokenResponse>> {
  let res: Response;
  try {
    res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
      },
      body,
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return {
      ok: false,
      error: "TikTok is temporarily unavailable. Try again.",
    };
  }

  let json: TikTokTokenResponse;
  try {
    json = (await res.json()) as TikTokTokenResponse;
  } catch {
    return { ok: false, error: "Invalid response from TikTok.", permanent: true };
  }

  if (json.error || !json.access_token) {
    const desc = json.error_description || json.error || "authorization failed";
    const permanent =
      json.error === "invalid_client" ||
      json.error === "invalid_grant" ||
      /invalid|expired|revoked/i.test(desc);
    return {
      ok: false,
      error: mapTikTokTokenError(desc),
      permanent,
    };
  }

  return { ok: true, value: json };
}

function mapTikTokTokenError(desc: string): string {
  if (/redirect_uri/i.test(desc)) {
    return "TikTok redirect URI mismatch. Check TikTok Developer portal configuration.";
  }
  if (/invalid_grant|expired|code/i.test(desc)) {
    return "TikTok authorization expired. Please connect TikTok again.";
  }
  if (/invalid_client/i.test(desc)) {
    return "TikTok app credentials are invalid.";
  }
  return "TikTok authorization failed. Please try again.";
}

function credentialsFromToken(json: TikTokTokenResponse): EncryptedCredentialPayload {
  const scopes = (json.scope ?? TIKTOK_LOGIN_KIT_SCOPE)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: new Date(
      Date.now() + (json.expires_in ?? 86400) * 1000
    ).toISOString(),
    scopes,
    extra: {
      open_id: json.open_id ?? "",
      refresh_expires_at: new Date(
        Date.now() + (json.refresh_expires_in ?? 31536000) * 1000
      ).toISOString(),
      token_type: json.token_type ?? "Bearer",
    },
  };
}

export async function exchangeTikTokCode(input: {
  code: string;
  redirectUri: string;
}): Promise<
  AdapterResult<{
    credentials: EncryptedCredentialPayload;
    openId: string;
    displayName: string;
    avatarUrl: string | null;
  }>
> {
  const creds = tikTokClientCreds();
  if (!creds) {
    return {
      ok: false,
      error: "TikTok Login Kit is not configured.",
      permanent: true,
    };
  }

  // TikTok docs: code from callback should be URL-decoded for the token request.
  const code = decodeURIComponent(input.code);

  const tokenResult = await postTokenForm(
    new URLSearchParams({
      client_key: creds.key,
      client_secret: creds.secret,
      code,
      grant_type: "authorization_code",
      redirect_uri: input.redirectUri,
    })
  );
  if (!tokenResult.ok) return tokenResult;

  const openId = tokenResult.value.open_id;
  if (!openId) {
    return {
      ok: false,
      error: "TikTok did not return a user identity.",
      permanent: true,
    };
  }

  const credentials = credentialsFromToken(tokenResult.value);
  const profile = await fetchTikTokUserInfo(credentials.accessToken!);

  return {
    ok: true,
    value: {
      credentials,
      openId,
      displayName: profile.displayName || "TikTok",
      avatarUrl: profile.avatarUrl,
    },
  };
}

export async function refreshTikTokCredentials(
  current: EncryptedCredentialPayload
): Promise<AdapterResult<EncryptedCredentialPayload>> {
  const creds = tikTokClientCreds();
  if (!creds) {
    return {
      ok: false,
      error: "TikTok Login Kit is not configured.",
      permanent: true,
    };
  }
  if (!current.refreshToken) {
    return {
      ok: false,
      error: "TikTok authorization was revoked. Reconnect TikTok.",
      permanent: true,
    };
  }

  const tokenResult = await postTokenForm(
    new URLSearchParams({
      client_key: creds.key,
      client_secret: creds.secret,
      grant_type: "refresh_token",
      refresh_token: current.refreshToken,
    })
  );
  if (!tokenResult.ok) return tokenResult;

  const next = credentialsFromToken(tokenResult.value);
  // Preserve open_id if refresh response omits it
  if (!next.extra?.open_id && current.extra?.open_id) {
    next.extra = { ...next.extra, open_id: current.extra.open_id };
  }
  return { ok: true, value: next };
}

export async function fetchTikTokUserInfo(accessToken: string): Promise<{
  displayName: string;
  avatarUrl: string | null;
  openId: string | null;
}> {
  const fields = "open_id,avatar_url,display_name";
  const url = `${USER_INFO_URL}?${new URLSearchParams({ fields }).toString()}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      return { displayName: "TikTok", avatarUrl: null, openId: null };
    }
    const json = (await res.json()) as {
      data?: {
        user?: {
          open_id?: string;
          display_name?: string;
          avatar_url?: string;
        };
      };
      error?: { code?: string; message?: string };
    };
    const user = json.data?.user;
    return {
      displayName: user?.display_name?.trim() || "TikTok",
      avatarUrl: user?.avatar_url ?? null,
      openId: user?.open_id ?? null,
    };
  } catch {
    return { displayName: "TikTok", avatarUrl: null, openId: null };
  }
}

/** Best-effort revoke via official endpoint. Never throws secrets. */
export async function revokeTikTokAccess(accessToken: string): Promise<void> {
  const creds = tikTokClientCreds();
  if (!creds || !accessToken) return;

  try {
    await fetch(REVOKE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
      },
      body: new URLSearchParams({
        client_key: creds.key,
        client_secret: creds.secret,
        token: accessToken,
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    /* disconnect still proceeds locally */
  }
}
