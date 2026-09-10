import { createHash, randomBytes } from "node:crypto";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

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

export function resolveAppOrigin(req: Request): string {
  const env =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "";
  if (env) return env.replace(/\/$/, "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  if (host) return `${proto}://${host}`;
  return "http://localhost:3000";
}
