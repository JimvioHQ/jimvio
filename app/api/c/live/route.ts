import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canAccessSpace } from "@/services/accessControl";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { spaceId, title, description, privacy = "public", maxViewers = 100, settings = {} } = body;

  if (!spaceId || !title) {
    return NextResponse.json({ error: "spaceId and title are required" }, { status: 400 });
  }

  const { data: space } = await supabase
    .from("spaces")
    .select("id, community_id, access_type")
    .eq("id", spaceId)
    .maybeSingle();

  if (!space) {
    return NextResponse.json({ error: "Space not found" }, { status: 404 });
  }

  const hasAccess = await canAccessSpace(user.id, space.id);
  if (!hasAccess) {
    return NextResponse.json({ error: "You don't have access to this space" }, { status: 403 });
  }

  const sessionId = crypto.randomUUID();
  const streamKey = `live_${sessionId.replace(/-/g, "")}`;

  const { data: session, error } = await supabase
    .from("live_sessions")
    .insert({
      id: sessionId,
      space_id: spaceId,
      community_id: space.community_id,
      host_id: user.id,
      title,
      description: description ?? null,
      privacy,
      status: "live",
      started_at: new Date().toISOString(),
      max_viewers: maxViewers,
      stream_key: streamKey,
      settings,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase
    .from("live_session_participants")
    .insert({
      session_id: sessionId,
      user_id: user.id,
      role: "host",
    });

  return NextResponse.json({ session });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ sessions: [], membership: null });
  }

  const { searchParams } = new URL(request.url);
  const communityId = searchParams.get("communityId");
  const spaceId = searchParams.get("spaceId");
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "20");

  // Auto-detect global mode: no communityId provided (and not space-only query)
  const isGlobal = !communityId && !spaceId;

  // Global mode: fetch from all user's communities
  if (isGlobal) {
    const { data: memberships } = await supabase
      .from("community_memberships")
      .select("community_id, role, status, plan_type, space_access")
      .eq("user_id", user.id)
      .eq("status", "active");

    const communityIds = (memberships || []).map(m => m.community_id);
    
    if (communityIds.length === 0) {
      return NextResponse.json({ sessions: [], membership: null });
    }

    let query = supabase
      .from("live_sessions")
      .select(`
        *,
        space:spaces!space_id (id, name, slug, access_type),
        host:profiles!host_id (id, full_name, avatar_url, username)
      `)
      .in("community_id", communityIds)
      .order("started_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    const { data: sessions, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Use the first membership as primary membership for the response
    const primaryMembership = memberships[0] || null;

    return NextResponse.json({ sessions: sessions || [], membership: primaryMembership });
  }

  // Community-specific mode (original behavior)
  if (!communityId) {
    return NextResponse.json({ error: "communityId required" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("community_memberships")
    .select("status, role, plan_type, space_access")
    .eq("community_id", communityId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || membership.status !== "active") {
    return NextResponse.json({ sessions: [], membership: null });
  }

  let query = supabase
    .from("live_sessions")
    .select(`
      *,
      space:spaces!space_id (id, name, slug, access_type),
      host:profiles!host_id (id, full_name, avatar_url, username)
    `)
    .eq("community_id", communityId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (spaceId) {
    query = query.eq("space_id", spaceId);
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data: sessions, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sessions: sessions || [], membership });
}