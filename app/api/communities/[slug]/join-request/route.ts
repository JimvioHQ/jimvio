import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { notifyCommunityStaff } from "@/lib/community/notify-community";
import { getUserMembership, isMembershipActive } from "@/services/communityService";

export const dynamic = "force-dynamic";

/**
 * Member-facing: request to join a private community.
 * Inserts/updates `community_join_requests` — does NOT create an active membership.
 * Owner approve/reject is handled by `/api/c/owner/members/join-requests`.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createServiceRoleClient();
  const { data: community } = await admin
    .from("communities")
    .select("id, slug, name, owner_id, is_private, is_free, is_active")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!community) {
    return NextResponse.json({ error: "Community not found" }, { status: 404 });
  }

  if (!community.is_private) {
    return NextResponse.json(
      { error: "This community is open — use the join endpoint instead" },
      { status: 400 }
    );
  }

  const existing = await getUserMembership(user.id, community.id);
  if (isMembershipActive(existing)) {
    return NextResponse.json({
      ok: true,
      alreadyMember: true,
      membership: existing,
      request: null,
    });
  }

  let reason: string | null = null;
  try {
    const body = (await req.json().catch(() => ({}))) as { reason?: string };
    reason =
      typeof body.reason === "string" && body.reason.trim()
        ? body.reason.trim().slice(0, 500)
        : null;
  } catch {
    reason = null;
  }

  const now = new Date().toISOString();
  const { data: prior } = await admin
    .from("community_join_requests")
    .select("id, status")
    .eq("community_id", community.id)
    .eq("user_id", user.id)
    .maybeSingle();

  let requestRow: {
    id: string;
    status: string;
    community_id: string;
    user_id: string;
    created_at?: string;
  } | null = null;

  if (prior?.status === "pending") {
    requestRow = {
      id: prior.id,
      status: prior.status,
      community_id: community.id,
      user_id: user.id,
    };
  } else if (prior) {
    const { data: updated, error } = await admin
      .from("community_join_requests")
      .update({
        status: "pending",
        reason,
        reviewed_by: null,
        reviewed_at: null,
        review_note: null,
        updated_at: now,
      })
      .eq("id", prior.id)
      .select("id, status, community_id, user_id, created_at")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    requestRow = updated;
  } else {
    const { data: inserted, error } = await admin
      .from("community_join_requests")
      .insert({
        community_id: community.id,
        user_id: user.id,
        status: "pending",
        reason,
      })
      .select("id, status, community_id, user_id, created_at")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    requestRow = inserted;
  }

  try {
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, username")
      .eq("id", user.id)
      .maybeSingle();
    const memberName =
      profile?.full_name || profile?.username || "Someone";
    await notifyCommunityStaff(admin, {
      communityId: community.id,
      ownerId: community.owner_id,
      actorId: user.id,
      title: "Join request",
      message: `${memberName} requested to join ${community.name}`,
      communitySlug: community.slug,
      data: {
        event: "join_request",
        requestId: requestRow?.id,
        communityId: community.id,
      },
    });
  } catch (err) {
    console.error("[join-request] notify failed:", err);
  }

  return NextResponse.json({
    ok: true,
    alreadyMember: false,
    request: requestRow,
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createServiceRoleClient();
  const { data: community } = await admin
    .from("communities")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!community) {
    return NextResponse.json({ error: "Community not found" }, { status: 404 });
  }

  const { data: request } = await admin
    .from("community_join_requests")
    .select("id, status, reason, created_at, reviewed_at, review_note")
    .eq("community_id", community.id)
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({ request: request ?? null });
}
