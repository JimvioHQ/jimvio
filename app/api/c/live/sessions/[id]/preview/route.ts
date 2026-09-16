import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { isCommunityUuid } from "@/lib/community/resolve-community";
import { rateLimit } from "@/lib/ops/rate-limit";
import type { LiveGuestPreview } from "@/lib/live/guest-join";

export const dynamic = "force-dynamic";

function normalizePrivacy(raw: string | null | undefined): LiveGuestPreview["privacy"] {
  const v = (raw ?? "private").toLowerCase();
  if (v === "public" || v === "invite_only") return v;
  if (v === "private") return "private";
  return "unknown";
}

/**
 * Minimal public metadata for the Guest Join Live gate.
 * Does not return participants, chat, or private room payloads.
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
  const gate = rateLimit(`live-preview:${ip}`, 60, 60_000);
  if (!gate.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const db = createServiceRoleClient();
  const { data: session } = await db
    .from("live_sessions")
    .select("id, title, status, privacy, host_id")
    .eq("id", id)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const privacy = normalizePrivacy(session.privacy as string | null);
  const status = String(session.status ?? "");

  // Authenticated callers still get the same public shape here; full session
  // data remains on the auth-required GET /sessions/[id].
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (privacy !== "public") {
    const body: LiveGuestPreview = {
      sessionId: session.id,
      title: null,
      status,
      privacy,
      canGuestJoin: false,
      hostName: null,
      message:
        privacy === "invite_only"
          ? "This Live is invite-only. Sign in with an invited account to continue."
          : "This Live is private. Sign in with an authorized account to continue.",
    };
    return NextResponse.json({ preview: body, authenticated: Boolean(user) });
  }

  if (status !== "live" && status !== "scheduled") {
    const body: LiveGuestPreview = {
      sessionId: session.id,
      title: typeof session.title === "string" ? session.title : null,
      status,
      privacy,
      canGuestJoin: false,
      hostName: null,
      message:
        status === "ended"
          ? "This Live has ended."
          : "This Live is not available right now.",
    };
    return NextResponse.json({ preview: body, authenticated: Boolean(user) });
  }

  let hostName: string | null = null;
  if (session.host_id) {
    const { data: profile } = await db
      .from("profiles")
      .select("full_name, username")
      .eq("id", session.host_id)
      .maybeSingle();
    hostName = profile?.full_name || profile?.username || null;
  }

  const body: LiveGuestPreview = {
    sessionId: session.id,
    title: typeof session.title === "string" ? session.title.slice(0, 120) : null,
    status,
    privacy,
    canGuestJoin: status === "live",
    hostName,
  };

  return NextResponse.json({ preview: body, authenticated: Boolean(user) });
}
