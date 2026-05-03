import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import crypto from "crypto";

// ─────────────────────────────────────────────────────────────
// POST /api/clips/track-view
// Fraud-resistant view counter:
//   - Deduplicates by hash(IP) per clip per hour (DB unique index)
//   - Minimum 3s watch time required (client sends watchedSeconds)
//   - Rejects known bot user-agents
// ─────────────────────────────────────────────────────────────

const BOT_UA_PATTERNS = /bot|crawl|spider|slurp|teoma|facebook|prerender|headless/i;
const VIEW_SALT = process.env.VIEW_HASH_SALT ?? "jimvio-salt-2025";

export async function POST(req: NextRequest) {
  try {
    // Reject bots
    const ua = req.headers.get("user-agent") ?? "";
    if (BOT_UA_PATTERNS.test(ua)) {
      return NextResponse.json({ ok: false, reason: "bot" });
    }

    const body = await req.json() as { clipId?: string; watchedSeconds?: number };
    const { clipId, watchedSeconds = 0 } = body;

    if (!clipId) return NextResponse.json({ error: "clipId required" }, { status: 400 });

    // Require at least 3 seconds of watch time to count
    if (Number(watchedSeconds) < 3) {
      return NextResponse.json({ ok: false, reason: "too_short" });
    }

    // Build privacy-safe IP hash (SHA-256, not reversible)
    const rawIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    const ipHash = crypto
      .createHash("sha256")
      .update(rawIp + VIEW_SALT)
      .digest("hex");

    // Optionally attach user_id (best-effort, no auth failure on error)
    let userId: string | null = null;
    try {
      const cookieStore = await cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
      );
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    } catch {
      // non-fatal
    }

    const db = createServiceRoleClient();

    // Insert into clip_view_logs — DB unique index deduplicates per (clip, ip_hash, hour)
    const { error: logError } = await db.from("clip_view_logs").insert({
      clip_id: clipId,
      user_id: userId,
      ip_hash: ipHash,
    });

    if (logError) {
      // 23505 = unique_violation — already counted this view this hour
      if (logError.code === "23505") {
        return NextResponse.json({ ok: false, reason: "duplicate" });
      }
      throw logError;
    }

    // Increment view counter: read current, write +1 (atomic-enough for this use case)
    const { data: clipRow } = await db
      .from("viral_clips")
      .select("total_views")
      .eq("id", clipId)
      .single();

    if (clipRow) {
      await db
        .from("viral_clips")
        .update({ total_views: (clipRow.total_views as number ?? 0) + 1 })
        .eq("id", clipId);
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
