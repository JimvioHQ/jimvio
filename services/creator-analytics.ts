import { getDB } from "./base";


export interface CreatorDashboardStats {
  totalViews: number;
  totalSubmissions: number;
  approvedSubmissions: number;
  pendingSubmissions: number;
  // Earnings
  pendingEarnings: number;
  availableBalance: number;
  totalEarned: number;
  paidEarnings: number;
  totalUgCEarnings: number;
  // Affiliate
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
}

export interface TopClip {
  id: string;
  title: string;
  platform: string;
  post_url: string;
  total_views: number;
  earnings: number;
  status: string;
}

export interface EarningsByDay {
  date: string;
  views: number;
  earnings: number;
  conversions: number;
}

// ─────────────────────────────────────────────────────────────
// MAIN STATS
// ─────────────────────────────────────────────────────────────
export async function getCreatorDashboardStats(userId: string): Promise<CreatorDashboardStats> {
  const db = await getDB();

  const [infRes, affRes] = await Promise.all([
    db
      .from("influencers")
      .select("id")                               // FIX: removed total_clicks/total_conversions — those columns don't exist on influencers
      .eq("user_id", userId)
      .maybeSingle(),
    db
      .from("affiliates")
      .select("id, total_earnings, available_balance, pending_earnings, paid_earnings, conversion_rate, total_clicks, total_conversions") // FIX: total_clicks/total_conversions live on affiliates
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const influencer = infRes.data;
  const affiliate = affRes.data;

  let submissions: Array<{ total_views_earned: number | null; total_earnings: number | null; status: string }> = [];
  if (influencer) {
    const { data } = await db
      .from("ugc_submissions")
      .select("total_views_earned, total_earnings, status") // FIX: view_count → total_views_earned (schema column name)
      .eq("influencer_id", influencer.id);
    submissions = data ?? [];
  }

  const totalViews = submissions.reduce((s, c) => s + (Number(c.total_views_earned) || 0), 0); // FIX: view_count → total_views_earned
  const totalUgCEarnings = submissions.reduce((s, c) => s + (Number(c.total_earnings) || 0), 0);
  const approvedSubmissions = submissions.filter(s => s.status === "approved").length;
  const pendingSubmissions = submissions.filter(s => s.status === "pending" || s.status === "in_review").length;

  return {
    totalViews,
    totalSubmissions: submissions.length,
    approvedSubmissions,
    pendingSubmissions,
    pendingEarnings: Number(affiliate?.pending_earnings ?? 0),
    availableBalance: Number(affiliate?.available_balance ?? 0),
    totalEarned: Number(affiliate?.total_earnings ?? 0) + totalUgCEarnings,
    paidEarnings: Number(affiliate?.paid_earnings ?? 0),
    totalUgCEarnings,
    totalClicks: Number(affiliate?.total_clicks ?? 0),         // FIX: read from affiliate, not influencer
    totalConversions: Number(affiliate?.total_conversions ?? 0), // FIX: read from affiliate, not influencer
    conversionRate: Number(affiliate?.conversion_rate ?? 0),
  };
}

// ─────────────────────────────────────────────────────────────
// TOP PERFORMING SUBMISSIONS
// ─────────────────────────────────────────────────────────────
export async function getTopPerformingClips(userId: string, limit = 5): Promise<TopClip[]> {
  const db = await getDB();

  const infRes = await db
    .from("influencers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!infRes.data) return [];

  const { data: submissions } = await db
    .from("ugc_submissions")
    .select("id, platform, post_url, total_views_earned, total_earnings, status, ugc_campaigns(title)") // FIX: view_count → total_views_earned
    .eq("influencer_id", infRes.data.id)
    .order("total_views_earned", { ascending: false }) // FIX: view_count → total_views_earned
    .limit(limit);

  return (submissions ?? []).map((c: any) => ({
    id: c.id,
    title: c.ugc_campaigns?.title ?? "Unknown Campaign",
    platform: c.platform ?? "unknown",
    post_url: c.post_url,
    total_views: Number(c.total_views_earned) || 0, // FIX: view_count → total_views_earned
    earnings: Number(c.total_earnings) || 0,
    status: c.status ?? "review",
  }));
}

// ─────────────────────────────────────────────────────────────
// EARNINGS TIMELINE (last N days)
// ─────────────────────────────────────────────────────────────
export async function getEarningsTimeline(userId: string, days = 30): Promise<EarningsByDay[]> {
  const db = await getDB();
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const affRes = await db
    .from("affiliates")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!affRes.data) return [];

  const { data: commissions } = await db
    .from("affiliate_commissions")
    .select("commission_amount, created_at")
    .eq("affiliate_id", affRes.data.id)
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  // Group by date
  const byDate: Record<string, { earnings: number; conversions: number; views: number }> = {};

  for (const c of commissions ?? []) {
    // FIX: Supabase returns TIMESTAMPTZ as an ISO string — .slice(0, 10) is sufficient and safe.
    // Wrapping in new Date().toISOString() adds an unnecessary parse/re-serialize round-trip
    // and can silently shift dates across timezone boundaries. Slice directly instead.
    const date = (c.created_at as string).slice(0, 10);
    if (!date) continue;

    if (!byDate[date]) byDate[date] = { earnings: 0, conversions: 0, views: 0 };
    byDate[date].earnings += Number(c.commission_amount ?? 0);
    byDate[date].conversions += 1;
  }

  // Fill in missing days so the chart always has a full range
  const result: EarningsByDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    const date = d.toISOString().slice(0, 10);
    result.push({
      date,
      earnings: byDate[date]?.earnings ?? 0,
      conversions: byDate[date]?.conversions ?? 0,
      views: byDate[date]?.views ?? 0,
    });
  }

  return result;
}

// ─────────────────────────────────────────────────────────────
// AFFILIATE LINK PERFORMANCE
// ─────────────────────────────────────────────────────────────
export async function getCreatorAffiliateLinkStats(userId: string) {
  const db = await getDB();

  const affRes = await db
    .from("affiliates")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!affRes.data) return [];

  const { data } = await db
    .from("affiliate_links")
    .select(`
      id, link_code, total_clicks, unique_clicks, total_conversions, total_earnings,
      is_active, created_at,
      products ( id, name, slug, images, price )
    `)
    .eq("affiliate_id", affRes.data.id)
    .order("total_clicks", { ascending: false })
    .limit(20);

  return data ?? [];
}

// ─────────────────────────────────────────────────────────────
// RECENT COMMISSIONS
// ─────────────────────────────────────────────────────────────
export async function getRecentCommissions(userId: string, limit = 10) {
  const db = await getDB();

  const affRes = await db
    .from("affiliates")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!affRes.data) return [];

  const { data } = await db
    .from("affiliate_commissions")
    .select(`
      id, commission_amount, commission_rate, status, created_at,
      orders ( order_number, total_amount )
    `)
    .eq("affiliate_id", affRes.data.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}