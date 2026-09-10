import { createHash, randomBytes } from "node:crypto";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getSiteUrl } from "@/lib/site-url";

export async function createOAuthState(input: {
  userId: string;
  platform: string;
  returnPath?: string;
}): Promise<{ state: string }> {
  const state = randomBytes(32).toString("base64url");
  const stateHash = createHash("sha256").update(state).digest("hex");
  const db = createServiceRoleClient();
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error } = await db.from("live_oauth_states").insert({
    user_id: input.userId,
    platform: input.platform,
    state_hash: stateHash,
    return_path: sanitizeReturnPath(input.returnPath),
    expires_at: expires,
  });

  if (error) throw new Error("Could not create OAuth state");
  return { state };
}

export async function consumeOAuthState(input: {
  state: string;
  platform: string;
}): Promise<{ userId: string; returnPath: string } | null> {
  const stateHash = createHash("sha256").update(input.state).digest("hex");
  const db = createServiceRoleClient();
  const now = new Date().toISOString();

  const { data } = await db
    .from("live_oauth_states")
    .select("id, user_id, return_path, expires_at, consumed_at, platform")
    .eq("state_hash", stateHash)
    .eq("platform", input.platform)
    .maybeSingle();

  if (!data || data.consumed_at || data.expires_at < now) {
    return null;
  }

  await db
    .from("live_oauth_states")
    .update({ consumed_at: now })
    .eq("id", data.id);

  return {
    userId: data.user_id as string,
    returnPath: sanitizeReturnPath(data.return_path as string),
  };
}

function sanitizeReturnPath(path: string | null | undefined): string {
  const fallback = "/communities/live";
  if (!path || typeof path !== "string") return fallback;
  if (!path.startsWith("/") || path.startsWith("//")) return fallback;
  if (path.includes("://") || path.includes("\\")) return fallback;
  return path.slice(0, 200);
}

export function integrationCallbackUrl(platform: string, origin: string): string {
  return `${origin.replace(/\/$/, "")}/api/integrations/${platform}/callback`;
}

/**
 * Canonical public origin for OAuth start/callback redirects.
 *
 * Must never emit localhost / preview hosts in production. A localhost
 * TikTok redirect_uri is classified as Desktop Login Kit and requires PKCE
 * (`code_challenge`). Jimvio is Web Login Kit only (HTTPS jimvio.com).
 */
export function resolveAppOrigin(_req?: Request): string {
  return getSiteUrl().replace(/\/$/, "");
}
