import { NextResponse } from "next/server";
import { requireUser, requireVendor } from "@/lib/ugc/platform/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { db, vendor } = await requireVendor(user.id);
  if (!vendor) return NextResponse.json({ error: "Brand account required" }, { status: 403 });

  const [favoritesRes, listsRes, invitesRes] = await Promise.all([
    db
      .from("ugc_favorite_creators")
      .select(
        `
        *,
        influencer:influencers!influencer_id (
          id, display_name, profile_image, niche, total_followers, is_verified
        )
      `
      )
      .eq("brand_id", vendor.id)
      .order("updated_at", { ascending: false })
      .limit(50),
    db
      .from("ugc_crm_lists")
      .select("id, name, description, color, created_at, updated_at, members:ugc_crm_list_members(count)")
      .eq("brand_id", vendor.id)
      .order("updated_at", { ascending: false }),
    db
      .from("ugc_creator_invitations")
      .select("id, status, created_at")
      .eq("brand_id", vendor.id),
  ]);

  if (favoritesRes.error) {
    return NextResponse.json({ error: favoritesRes.error.message }, { status: 500 });
  }
  if (listsRes.error) {
    return NextResponse.json({ error: listsRes.error.message }, { status: 500 });
  }

  const invites = invitesRes.data ?? [];
  const inviteHistory = {
    total: invites.length,
    pending: invites.filter((i) => i.status === "pending").length,
    accepted: invites.filter((i) => i.status === "accepted").length,
    declined: invites.filter((i) => i.status === "declined").length,
    expired: invites.filter((i) => i.status === "expired").length,
    cancelled: invites.filter((i) => i.status === "cancelled").length,
  };

  const favorites = favoritesRes.data ?? [];
  const performance = favorites.map((f) => ({
    influencer_id: f.influencer_id,
    performance: f.performance ?? {},
    last_campaign_id: f.last_campaign_id ?? null,
    tags: f.tags ?? [],
  }));

  return NextResponse.json({
    favorites,
    lists: listsRes.data ?? [],
    inviteHistory,
    performance,
    counts: {
      favorites: favorites.length,
      lists: (listsRes.data ?? []).length,
      invites: inviteHistory.total,
    },
  });
}
