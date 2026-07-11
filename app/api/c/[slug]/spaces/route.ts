import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: community } = await supabase
    .from("communities")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!community) {
    return NextResponse.json({ error: "Community not found" }, { status: 404 });
  }

  const { data: membership } = await supabase
    .from("community_memberships")
    .select("status, role, space_access")
    .eq("community_id", community.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || membership.status !== "active") {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const isAdmin = ["owner", "admin", "moderator"].includes(membership.role);

  let query = supabase
    .from("spaces")
    .select("id, name, slug, access_type, description, icon, color, sort_order")
    .eq("community_id", community.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const { data: spaces, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const filtered = (spaces || []).filter((space) => {
    if (space.access_type === "free") return true;
    if (isAdmin) return true;
    if (membership.space_access?.includes(space.id)) return true;
    return false;
  });

  return NextResponse.json({ data: filtered });
}