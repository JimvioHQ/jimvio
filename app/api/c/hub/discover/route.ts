import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getImage } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** GET — personalized discover rails for the Creator OS home feed. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let liveRows: any[] = [];
  try {
    const liveRes = await (supabase as any)
      .from("live_sessions")
      .select("id, title, status, community_id, host_user_id")
      .eq("status", "live")
      .order("started_at", { ascending: false })
      .limit(6);
    liveRows = liveRes?.data ?? [];
  } catch {
    liveRows = [];
  }

  const [
    { data: creators },
    { data: products },
    { data: campaigns },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .not("username", "is", null)
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase
      .from("products")
      .select("id, name, slug, images, affiliate_commission_rate, price, currency")
      .eq("status", "active")
      .eq("is_active", true)
      .is("deleted_at", null)
      .eq("affiliate_enabled", true)
      .order("sale_count", { ascending: false })
      .limit(8),
    supabase
      .from("ugc_campaigns")
      .select("id, title, status, starts_at, promotion_target_url")
      .eq("status", "active")
      .order("starts_at", { ascending: false })
      .limit(6),
  ]);

  void user;

  return NextResponse.json({
    creators: (creators ?? []).map((c) => ({
      id: c.id,
      title: c.full_name || c.username || "Creator",
      subtitle: c.username ? `@${c.username}` : "Creator",
      href: c.username
        ? `/communities/profile/${c.username}`
        : "/communities/explore",
      image: c.avatar_url,
      badge: "Creator",
    })),
    products: (products ?? []).map((p) => {
      const img = getImage(p.images);
      return {
        id: p.id,
        title: p.name,
        subtitle:
          p.affiliate_commission_rate != null
            ? `${Math.round(Number(p.affiliate_commission_rate))}% commission`
            : undefined,
        href: `/affiliates/promote/${p.slug}`,
        image: img !== "/placeholder.png" ? img : null,
        badge: "Product",
      };
    }),
    campaigns: (campaigns ?? []).map((c) => ({
      id: c.id,
      title: c.title,
      subtitle: "UGC campaign",
      href: `/ugc/${c.id}`,
      image: null,
      badge: "Campaign",
    })),
    live: liveRows.map((s: any) => ({
      id: String(s.id),
      title: s.title || "Live room",
      subtitle: "Live now",
      href: `/communities/live/${s.id}`,
      image: null,
      badge: "Live",
    })),
  });
}
