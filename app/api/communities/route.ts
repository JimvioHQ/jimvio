import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminDB } from "@/services/base";

export const dynamic = "force-dynamic";

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Bootstrap default spaces/rooms when a community has none yet (additive / safe). */
async function bootstrapDefaultSpaces(
  supabase: Awaited<ReturnType<typeof createClient>>,
  communityId: string
) {
  const { count } = await supabase
    .from("spaces")
    .select("id", { count: "exact", head: true })
    .eq("community_id", communityId);

  if ((count ?? 0) > 0) return;

  const defaults: {
    name: string;
    slug: string;
    sort_order: number;
    room: { name: string; slug: string; room_type: string };
  }[] = [
    {
      name: "General",
      slug: "general",
      sort_order: 0,
      room: { name: "General chat", slug: "general-chat", room_type: "chat" },
    },
    {
      name: "Announcements",
      slug: "announcements",
      sort_order: 1,
      room: { name: "Announcements", slug: "announcements", room_type: "posts" },
    },
    {
      name: "Resources",
      slug: "resources",
      sort_order: 2,
      room: { name: "Resources", slug: "resources", room_type: "resources" },
    },
  ];

  for (const def of defaults) {
    const { data: space, error } = await supabase
      .from("spaces")
      .insert({
        community_id: communityId,
        name: def.name,
        slug: def.slug,
        sort_order: def.sort_order,
        access_type: "free",
        is_active: true,
        room_count: 1,
      })
      .select("id")
      .single();

    if (error || !space) continue;

    await supabase.from("rooms").insert({
      space_id: space.id,
      community_id: communityId,
      name: def.room.name,
      slug: def.room.slug,
      room_type: def.room.room_type,
      access_type: "inherit",
      sort_order: 0,
      is_active: true,
    });
  }
}

export async function GET(req: NextRequest) {
  const supabase = getAdminDB();
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = 20;

  let query = supabase
    .from("communities")
    .select("*, profiles!communities_owner_id_fkey(full_name, avatar_url, username)", {
      count: "exact",
    })
    .eq("is_active", true)
    .order("member_count", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (category) query = query.eq("category", category);
  if (search?.trim()) {
    const q = `%${search.trim().replace(/%/g, "")}%`;
    query = query.ilike("name", q);
  }

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ communities: data, total: count ?? 0, page });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as Record<string, unknown>;
  const name = String(body.name ?? "");
  if (!name.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const slug = (body.slug as string) || slugify(name);
  if (!slug) return NextResponse.json({ error: "Invalid slug" }, { status: 400 });

  const insert = {
    name,
    slug,
    owner_id: user.id,
    tagline: body.tagline as string | undefined,
    description: body.description as string | undefined,
    long_description: body.long_description as string | undefined,
    avatar_url: body.avatar_url as string | undefined,
    cover_image: body.cover_image as string | undefined,
    category: body.category as string | undefined,
    tags: body.tags as string[] | undefined,
    is_private: body.is_private as boolean | undefined,
    is_free: body.is_free as boolean | undefined,
    monthly_price: body.monthly_price as number | undefined,
    yearly_price: body.yearly_price as number | undefined,
    lifetime_price: body.lifetime_price as number | undefined,
    currency: (body.currency as string) || "USD",
    trial_days: body.trial_days as number | undefined,
    platform_commission_rate: body.platform_commission_rate as number | undefined,
  };

  const { data, error } = await supabase.from("communities").insert(insert).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from("community_memberships").insert({
    community_id: data.id,
    user_id: user.id,
    role: "owner",
    plan_type: "lifetime",
    status: "active",
  });

  // Additive: only creates defaults when the community has zero spaces.
  try {
    await bootstrapDefaultSpaces(supabase, data.id);
  } catch {
    // Never fail community create if bootstrap fails.
  }

  return NextResponse.json({ community: data });
}
