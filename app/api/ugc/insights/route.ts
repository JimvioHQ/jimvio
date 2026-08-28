import { NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";

export const dynamic = "force-dynamic";

function topCounts(values: Array<string | null | undefined>, limit = 10) {
  const map = new Map<string, number>();
  for (const v of values) {
    const key = (v || "Unknown").trim() || "Unknown";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export async function GET() {
  const { user, db, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { data: adminRole } = await db
    .from("user_roles")
    .select("id")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .eq("is_active", true)
    .maybeSingle();
  const showEarnings = Boolean(adminRole);

  const [
    profilesRes,
    vendorsRes,
    campaignsRes,
    creatorsRes,
    brandSpendRes,
    trendingRes,
  ] = await Promise.all([
    db.from("profiles").select("country").not("country", "is", null).limit(2000),
    db.from("vendors").select("business_country").not("business_country", "is", null).limit(2000),
    db.from("ugc_campaigns").select("campaign_type, status").limit(2000),
    showEarnings
      ? db
          .from("influencers")
          .select("id, display_name, profile_image, total_earnings, niche, is_verified")
          .order("total_earnings", { ascending: false })
          .limit(10)
      : db
          .from("influencers")
          .select("id, display_name, profile_image, total_earnings, niche, is_verified")
          .order("display_name", { ascending: true })
          .limit(10),
    showEarnings
      ? db
          .from("ugc_campaigns")
          .select("brand_id, spent_budget, vendors!brand_id(id, business_name, business_logo)")
          .order("spent_budget", { ascending: false })
          .limit(200)
      : db
          .from("ugc_campaigns")
          .select("brand_id, spent_budget, vendors!brand_id(id, business_name, business_logo)")
          .order("created_at", { ascending: false })
          .limit(200),
    db
      .from("ugc_campaigns")
      .select(
        `
        id, title, campaign_type, status, total_views_tracked, submission_count, approved_count,
        total_budget, spent_budget, created_at,
        vendor:vendors!brand_id (business_name, business_logo)
      `
      )
      .eq("status", "active")
      .order("total_views_tracked", { ascending: false })
      .limit(12),
  ]);

  const profileCountries = topCounts((profilesRes.data ?? []).map((p) => p.country));
  const vendorCountries = topCounts((vendorsRes.data ?? []).map((v) => v.business_country));
  const mergedCountries = new Map<string, number>();
  for (const row of [...profileCountries, ...vendorCountries]) {
    mergedCountries.set(row.key, (mergedCountries.get(row.key) ?? 0) + row.count);
  }
  const topCountries = Array.from(mergedCountries.entries())
    .map(([key, count]) => ({ country: key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const campaignTypes = topCounts((campaignsRes.data ?? []).map((c) => c.campaign_type));

  const brandSpendMap = new Map<
    string,
    { brand_id: string; spend: number; business_name: string | null; business_logo: string | null }
  >();
  for (const row of brandSpendRes.data ?? []) {
    const brandId = String(row.brand_id);
    const vendor = Array.isArray(row.vendors) ? row.vendors[0] : row.vendors;
    const prev = brandSpendMap.get(brandId);
    const spend = Number(row.spent_budget ?? 0) + (prev?.spend ?? 0);
    brandSpendMap.set(brandId, {
      brand_id: brandId,
      spend,
      business_name: (vendor as { business_name?: string } | null)?.business_name ?? prev?.business_name ?? null,
      business_logo: (vendor as { business_logo?: string } | null)?.business_logo ?? prev?.business_logo ?? null,
    });
  }
  const topBrandsBySpend = Array.from(brandSpendMap.values())
    .sort((a, b) =>
      showEarnings
        ? b.spend - a.spend
        : String(a.business_name ?? "").localeCompare(String(b.business_name ?? "")),
    )
    .slice(0, 10);

  return NextResponse.json({
    topCountries,
    campaignTypes: campaignTypes.map((c) => ({ type: c.key, count: c.count })),
    topCreatorsByEarnings: (creatorsRes.data ?? []).map((c) => ({
      id: c.id,
      display_name: c.display_name,
      profile_image: c.profile_image,
      niche: c.niche,
      is_verified: c.is_verified,
      total_earnings: showEarnings ? Number(c.total_earnings ?? 0) : null,
    })),
    topBrandsBySpend: showEarnings
      ? topBrandsBySpend
      : topBrandsBySpend.map((b) => ({ ...b, spend: null })),
    trendingCampaigns: (trendingRes.data ?? []).map((row) => {
      const campaign = row as Record<string, unknown>;
      if (showEarnings) return campaign;
      const { total_budget: _tb, spent_budget: _sb, ...rest } = campaign;
      return rest;
    }),
  });
}
