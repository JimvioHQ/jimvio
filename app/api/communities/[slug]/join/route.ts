import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  joinFreeCommunity,
  leaveCommunity,
} from "@/services/communityService";
import {
  resolveCommunityJoinVisibility,
  sanitizeInviteCode,
} from "@/lib/community/join-policy";

export const dynamic = "force-dynamic";

async function loadCommunity(slug: string) {
  const supabase = await createClient();
  const { data: community } = await supabase
    .from("communities")
    .select(
      "id, is_free, is_private, is_active, visibility, visibility_mode, archived_at"
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return { supabase, community };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { supabase, community } = await loadCommunity(slug);
  if (!community || community.archived_at) {
    return NextResponse.json({ error: "Community not found" }, { status: 404 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const visibility = resolveCommunityJoinVisibility(community);
  const admin = createServiceRoleClient();
  const { data: membership } = await admin
    .from("community_memberships")
    .select("id, status, role")
    .eq("community_id", community.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: request } = await admin
    .from("community_join_requests")
    .select("id, status")
    .eq("community_id", community.id)
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    visibility,
    membership: membership ?? null,
    pendingRequest: request?.status === "pending" ? request : null,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { supabase, community } = await loadCommunity(slug);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!community || community.archived_at) {
    return NextResponse.json({ error: "Community not found" }, { status: 404 });
  }

  let inviteCode = sanitizeInviteCode(req.nextUrl.searchParams.get("invite"));
  let reason: string | undefined;
  try {
    const body = (await req.json()) as { inviteCode?: string; reason?: string };
    if (!inviteCode) inviteCode = sanitizeInviteCode(body.inviteCode);
    if (typeof body.reason === "string") reason = body.reason.slice(0, 500);
  } catch {
    // empty body is valid
  }

  try {
    const outcome = await joinFreeCommunity(user.id, community.id, {
      inviteCode: inviteCode || undefined,
      reason,
      userEmail: user.email,
    });
    if (outcome.kind === "pending") {
      return NextResponse.json({
        pending: true,
        requestId: outcome.requestId,
        membership: null,
      });
    }
    return NextResponse.json({ membership: outcome.membership, pending: false });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Join failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: community } = await supabase
    .from("communities")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!community) return NextResponse.json({ error: "Community not found" }, { status: 404 });

  try {
    const membership = await leaveCommunity(user.id, community.id);
    return NextResponse.json({ membership });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Leave failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
