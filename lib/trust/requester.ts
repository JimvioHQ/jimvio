import "server-only";
import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const HOURLY_LIMIT_ANON = 6;
export const HOURLY_LIMIT_USER = 40;

export async function currentRequester(headers: Headers): Promise<{ userId: string | null; hash: string }> {
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    userId = null;
  }
  const ip = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
  const salt = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "jimvio").slice(-24);
  const hash = createHash("sha256").update(`${userId ?? `ip:${ip}`}|${salt}`).digest("hex").slice(0, 40);
  return { userId, hash };
}

/** Counts this requester's scans in the last hour (works across server instances). */
export async function withinHourlyLimit(r: { userId: string | null; hash: string }): Promise<boolean> {
  const db = createServiceRoleClient() as unknown as { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await db.from("trust_scans").select("id", { count: "exact", head: true }).eq("requester_hash", r.hash).gte("created_at", since);
  return (count ?? 0) < (r.userId ? HOURLY_LIMIT_USER : HOURLY_LIMIT_ANON);
}
