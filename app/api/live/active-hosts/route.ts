import { NextResponse } from "next/server";
import { createServiceRoleClient, hasSupabaseSecretKey } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Public host → session map for Live badges. No settings, email, or tokens. */
export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("session");
  const db = hasSupabaseSecretKey() ? createServiceRoleClient() : await createClient();
  let query = db.from("live_sessions").select("id, host_id, status").eq("status", "live").limit(80);
  if (sessionId) query = query.eq("id", sessionId);
  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ hosts: [], error: "Live status unavailable" }, { status: 200 });
  }
  const hosts = (data ?? [])
    .filter((row) => row.host_id && row.id)
    .map((row) => ({ userId: row.host_id as string, sessionId: row.id as string }));
  return NextResponse.json(
    { hosts, available: sessionId ? hosts.length > 0 : undefined },
    { headers: { "Cache-Control": "private, max-age=8" } },
  );
}
