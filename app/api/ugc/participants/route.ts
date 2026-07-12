import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServiceRoleClient();
  const { searchParams } = req.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(50, Number(searchParams.get("limit") ?? 20));
  const offset = (page - 1) * limit;
  const status = searchParams.get("status") ?? undefined;

  const { data: influencer } = await db
    .from("influencers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!influencer) {
    return NextResponse.json({ data: [], total: 0, page, limit, needsProfile: true });
  }

  let query = db
    .from("ugc_campaign_participants")
    .select(
      `
      *,
      campaign:ugc_campaigns!campaign_id (
        id,
        title,
        status,
        campaign_type,
        ends_at,
        payment_model,
        fixed_rate,
        rate_per_1k_views,
        media:ugc_campaign_media(*),
        vendor:vendors!brand_id (
          business_name,
          business_logo,
          business_slug
        )
      )
    `,
      { count: "exact" },
    )
    .eq("influencer_id", influencer.id)
    .order("joined_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data ?? [], total: count ?? 0, page, limit });
}
