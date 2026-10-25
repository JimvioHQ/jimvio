import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toPublicCommunityListItem } from "@/lib/community/public-community-list";
import { getAdminDB } from "@/services/base";
import { getCommunityBySlug } from "@/services/communityService";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const data = await getCommunityBySlug(slug);
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const auth = await createClient();
    const { data: { user } } = await auth.auth.getUser();
    const isOwner = Boolean(user && data.owner_id === user.id);
    let isMember = isOwner;
    if (user && !isMember) {
      const { data: membership } = await getAdminDB()
        .from("community_memberships")
        .select("id")
        .eq("community_id", data.id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      isMember = Boolean(membership);
    }
    return NextResponse.json({
      community: toPublicCommunityListItem(data as Record<string, unknown>, { isMember, isOwner }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
