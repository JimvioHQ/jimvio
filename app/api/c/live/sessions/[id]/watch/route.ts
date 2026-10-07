import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { isCommunityUuid } from "@/lib/community/resolve-community";
import { rateLimit } from "@/lib/ops/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Minimal public watch bootstrap for anonymous Live preview.
 * Returns only what is needed to render the stage — no chat, credentials,
 * or private participant payloads beyond public display names.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isCommunityUuid(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ip =
    _req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    _req.headers.get("x-real-ip") ||
    "unknown";
  const gate = rateLimit(`live-watch:${ip}`, 60, 60_000);
  if (!gate.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const db = createServiceRoleClient();
  const { data: session } = await db
    .from("live_sessions")
    .select("id, title, status, privacy, host_id, started_at, settings")
    .eq("id", id)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const privacy = String(session.privacy ?? "").toLowerCase();
  if (privacy !== "public") {
    return NextResponse.json(
      {
        error: "This Live is not public",
        canWatch: false,
      },
      { status: 403 }
    );
  }

  if (String(session.status) !== "live") {
    return NextResponse.json(
      {
        error:
          String(session.status) === "ended"
            ? "This Live has ended."
            : "This Live is not available right now.",
        canWatch: false,
        session: {
          id: session.id,
          title: typeof session.title === "string" ? session.title : null,
          status: session.status,
          privacy: "public",
          host_id: session.host_id,
        },
      },
      { status: 400 }
    );
  }

  let hostName: string | null = null;
  let hostAvatar: string | null = null;
  if (session.host_id) {
    const { data: profile } = await db
      .from("profiles")
      .select("full_name, username, avatar_url")
      .eq("id", session.host_id)
      .maybeSingle();
    hostName = profile?.full_name || profile?.username || null;
    hostAvatar = profile?.avatar_url ?? null;
  }

  const { data: participants } = await db
    .from("live_session_participants")
    .select("user_id, role, status, display_name, avatar_url")
    .eq("session_id", id)
    .eq("status", "joined")
    .limit(40);

  return NextResponse.json({
    canWatch: true,
    session: {
      id: session.id,
      community_id: null,
      space_id: null,
      room_id: null,
      host_id: session.host_id,
      title:
        typeof session.title === "string"
          ? session.title.slice(0, 120)
          : "Live",
      status: "live" as const,
      privacy: "public",
      started_at: session.started_at ?? null,
      ended_at: null,
      created_at: session.started_at ?? new Date().toISOString(),
      settings: (session.settings as Record<string, unknown>) ?? {},
    },
    hostName,
    hostAvatar,
    participants: (participants ?? []).map((p) => ({
      id: `${session.id}:${p.user_id}`,
      session_id: session.id,
      user_id: p.user_id,
      role: p.role,
      status: p.status,
      mic_on: false,
      cam_on: false,
      hand_raised: false,
      sharing: false,
      joined_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      display_name: p.display_name || null,
      avatar_url: p.avatar_url ?? null,
    })),
  });
}
