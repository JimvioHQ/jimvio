import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MAX_COMMUNITY_PINS, type PinnedCommunity } from "@/lib/community/pins";

export const dynamic = "force-dynamic";

const PIN_SELECT = `
  user_id,
  community_id,
  position,
  created_at,
  updated_at,
  communities (
    id,
    name,
    slug,
    tagline,
    avatar_url,
    member_count,
    category
  )
`;

function mapPin(row: any): PinnedCommunity {
  const community = row.communities ?? null;
  return {
    user_id: row.user_id,
    community_id: row.community_id,
    position: row.position,
    created_at: row.created_at,
    updated_at: row.updated_at,
    community: community
      ? {
          id: community.id,
          name: community.name,
          slug: community.slug,
          tagline: community.tagline ?? null,
          avatar_url: community.avatar_url ?? null,
          member_count: community.member_count ?? null,
          category: community.category ?? null,
        }
      : null,
  };
}

/** GET — list pinned communities for the authenticated user. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await (supabase as any)
    .from("user_community_pins")
    .select(PIN_SELECT)
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    pins: (data ?? []).map(mapPin),
    maxPins: MAX_COMMUNITY_PINS,
  });
}

/** POST — pin a community. Body: { communityId } */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const communityId =
    typeof body?.communityId === "string" ? body.communityId.trim() : "";
  if (!communityId) {
    return NextResponse.json({ error: "communityId is required" }, { status: 400 });
  }

  const { data: community, error: communityError } = await supabase
    .from("communities")
    .select("id")
    .eq("id", communityId)
    .eq("is_active", true)
    .maybeSingle();

  if (communityError) {
    return NextResponse.json({ error: communityError.message }, { status: 500 });
  }
  if (!community) {
    return NextResponse.json({ error: "Community not found" }, { status: 404 });
  }

  const { data: existingPins, error: countError } = await (supabase as any)
    .from("user_community_pins")
    .select("community_id, position")
    .eq("user_id", user.id);

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  const pins = existingPins ?? [];
  const alreadyPinned = pins.some((p: { community_id: string }) => p.community_id === communityId);
  if (alreadyPinned) {
    return NextResponse.json({ error: "Community already pinned" }, { status: 409 });
  }
  if (pins.length >= MAX_COMMUNITY_PINS) {
    return NextResponse.json(
      { error: `Maximum ${MAX_COMMUNITY_PINS} pinned communities` },
      { status: 400 }
    );
  }

  const nextPosition =
    pins.reduce(
      (max: number, p: { position?: number }) => Math.max(max, Number(p.position ?? 0)),
      -1
    ) + 1;
  const now = new Date().toISOString();

  const { data, error } = await (supabase as any)
    .from("user_community_pins")
    .insert({
      user_id: user.id,
      community_id: communityId,
      position: nextPosition,
      created_at: now,
      updated_at: now,
    })
    .select(PIN_SELECT)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ pin: mapPin(data) }, { status: 201 });
}

/** DELETE — unpin ?communityId= */
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const communityId = req.nextUrl.searchParams.get("communityId")?.trim() ?? "";
  if (!communityId) {
    return NextResponse.json({ error: "communityId is required" }, { status: 400 });
  }

  const { error } = await (supabase as any)
    .from("user_community_pins")
    .delete()
    .eq("user_id", user.id)
    .eq("community_id", communityId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/** PATCH — reorder pins. Body: { orderedCommunityIds: string[] } */
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const orderedCommunityIds = Array.isArray(body?.orderedCommunityIds)
    ? body.orderedCommunityIds.filter((id: unknown): id is string => typeof id === "string")
    : [];

  if (orderedCommunityIds.length === 0) {
    return NextResponse.json({ error: "orderedCommunityIds is required" }, { status: 400 });
  }

  const { data: existingPins, error: loadError } = await (supabase as any)
    .from("user_community_pins")
    .select("community_id")
    .eq("user_id", user.id);

  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 500 });
  }

  const allowed = new Set((existingPins ?? []).map((p: { community_id: string }) => p.community_id));
  const now = new Date().toISOString();
  const updates = orderedCommunityIds
    .filter((id: string) => allowed.has(id))
    .map((communityId: string, position: number) =>
      (supabase as any)
        .from("user_community_pins")
        .update({ position, updated_at: now })
        .eq("user_id", user.id)
        .eq("community_id", communityId)
    );

  await Promise.all(updates);

  const { data, error } = await (supabase as any)
    .from("user_community_pins")
    .select(PIN_SELECT)
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    pins: (data ?? []).map(mapPin),
    maxPins: MAX_COMMUNITY_PINS,
  });
}
