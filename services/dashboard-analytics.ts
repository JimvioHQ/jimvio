import { getDB } from "./base";

/**
 * BUYER ANALYTICS
 */
export async function getBuyerDashboardStats(userId: string) {
  const db = await getDB();

  const [ordersRes, wishlistRes, libraryRes] = await Promise.all([
    db.from("orders").select("total_amount, created_at").eq("buyer_id", userId).eq("payment_status", "completed"),
    db.from("wishlists").select("id", { count: "exact", head: true }).eq("user_id", userId),
    db.from("order_items")
      .select("id, orders!inner(buyer_id, payment_status), products!inner(product_type)", { count: "exact", head: true })
      .eq("orders.buyer_id", userId)
      .eq("orders.payment_status", "completed")
      .eq("products.product_type", "digital")
  ]);

  const orders = ordersRes.data ?? [];
  const totalSpent = orders.reduce((s, o) => s + Number(o.total_amount), 0);
  const totalPurchases = orders.length;
  const wishlistCount = wishlistRes.count ?? 0;
  const libraryCount = libraryRes.count ?? 0;

  // Timeline (last 6 months)
  const timeline: Record<string, { spent: number; purchases: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const month = d.toLocaleString("default", { month: "short" });
    timeline[month] = { spent: 0, purchases: 0 };
  }

  orders.forEach(o => {
    const d = new Date(o.created_at);
    const month = d.toLocaleString("default", { month: "short" });
    if (timeline[month]) {
      timeline[month].spent += Number(o.total_amount);
      timeline[month].purchases += 1;
    }
  });

  const chartData = Object.entries(timeline).map(([month, data]) => ({
    month,
    ...data
  }));

  return {
    totalPurchases,
    totalSpent,
    libraryCount,
    wishlistCount,
    chartData
  };
}

/**
 * COMMUNITY ANALYTICS
 */
export async function getCommunityDashboardStats(userId: string) {
  const db = await getDB();

  const { data: communities } = await db
    .from("communities")
    .select("id, member_count, post_count")
    .eq("owner_id", userId);

  const comms = communities ?? [];
  const totalMembers = comms.reduce((s, c) => s + (c.member_count ?? 0), 0);
  const totalPosts = comms.reduce((s, c) => s + (c.post_count ?? 0), 0);

  // Moderators
  const communityIds = comms.map(c => c.id);
  let moderatorCount = 0;
  if (communityIds.length > 0) {
    const { count } = await db
      .from("community_members")
      .select("id", { count: "exact", head: true })
      .in("community_id", communityIds)
      .eq("role", "moderator");
    moderatorCount = count ?? 0;
  }

  // Activity Rate (mock logic or real if possible)
  const activityRate = totalMembers > 0 ? Math.min(Math.round((totalPosts / (totalMembers * 2)) * 100), 100) : 0;

  // Growth Chart (last 7 days)
  const chartData: any[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const dayName = d.toLocaleString("default", { weekday: "short" });
    const dateStr = d.toISOString().slice(0, 10);
    chartData.push({ day: dayName, date: dateStr, members: 0, engagement: 0 });
  }

  if (communityIds.length > 0) {
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const [membersRes, engagementRes] = await Promise.all([
      db.from("community_members").select("created_at").in("community_id", communityIds).gte("created_at", since),
      db.from("community_posts").select("created_at").in("community_id", communityIds).gte("created_at", since),
    ]);

    (membersRes.data ?? []).forEach(m => {
      const d = m.created_at.slice(0, 10);
      const point = chartData.find(p => p.date === d);
      if (point) point.members += 1;
    });

    (engagementRes.data ?? []).forEach(p => {
      const d = p.created_at.slice(0, 10);
      const point = chartData.find(p => p.date === d);
      if (point) point.engagement += 10; // Weighted engagement
    });
  }

  return {
    totalMembers,
    totalPosts,
    moderatorCount,
    activityRate,
    chartData
  };
}

/**
 * VENDOR CAMPAIGN ANALYTICS
 */
export async function getVendorCampaignStats(userId: string) {
  const db = await getDB();
  
  const { data: vendor } = await db.from("vendors").select("id").eq("user_id", userId).maybeSingle();
  if (!vendor) return null;

  const { data: campaigns } = await db
    .from("ugc_campaigns")
    .select("id, title, status, submission_count, approved_count, total_views_tracked, total_budget, spent_budget")
    .eq("brand_id", vendor.id);

  const camps = campaigns ?? [];
  const activeCount = camps.filter(c => c.status === "active").length;
  const totalSubmissions = camps.reduce((s, c) => s + (c.submission_count ?? 0), 0);
  const totalApproved = camps.reduce((s, c) => s + (c.approved_count ?? 0), 0);
  const totalSpent = camps.reduce((s, c) => s + Number(c.spent_budget ?? 0), 0);
  const qualityRate = totalSubmissions > 0 ? Math.round((totalApproved / totalSubmissions) * 100) : 0;

  // Chart data (Escrow burn by campaign)
  const chartData = camps.map(c => ({
    campaign: c.title,
    deployed: Number(c.spent_budget ?? 0),
    verified: c.approved_count ?? 0
  })).sort((a, b) => b.deployed - a.deployed).slice(0, 8);

  return {
    activeCount,
    totalSubmissions,
    totalSpent,
    qualityRate,
    chartData
  };
}
