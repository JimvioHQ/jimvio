import { getAdminDB } from "./base";

export async function getPlatformStats() {
  const admin = getAdminDB();
  const [users, vendors, products, campaigns, communities, earnings] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("vendors").select("id", { count: "exact", head: true }).eq("is_active", true),
    admin.from("products").select("id", { count: "exact", head: true }).eq("status", "active"),
    admin.from("ugc_campaigns").select("id", { count: "exact", head: true }),
    admin.from("communities").select("id", { count: "exact", head: true }),
    admin.from("influencers").select("total_earnings").eq("is_active", true),
  ]);

  const influencerEarnings = ((earnings.data as any[]) ?? []).reduce((s, i) => s + Number(i.total_earnings || 0), 0);

  return {
    totalUsers:        users.count       ?? 0,
    totalVendors:      vendors.count     ?? 0,
    totalProducts:     products.count    ?? 0,
    totalCampaigns:    campaigns.count   ?? 0,
    totalCommunities:  communities.count ?? 0,
    totalEarnings:     influencerEarnings,
  };
}

export async function getAdminOverviewStats() {
  const admin = getAdminDB();
  const [userCount, vendorCount, orderCount, revenue, productCount] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("vendors").select("id", { count: "exact", head: true }),
    admin.from("orders").select("id", { count: "exact", head: true }),
    admin.from("orders").select("total_amount").eq("payment_status", "completed"),
    admin.from("products").select("id", { count: "exact", head: true }),
  ]);

  const totalRevenue = revenue.data?.reduce((sum: number, o: any) => sum + Number(o.total_amount), 0) ?? 0;

  return {
    totalUsers:     userCount.count    ?? 0,
    totalVendors:   vendorCount.count  ?? 0,
    totalOrders:    orderCount.count   ?? 0,
    totalRevenue:   totalRevenue,
    totalProducts:  productCount.count ?? 0,
  };
}

export async function getAdminRevenueChartData() {
  const admin = getAdminDB();
  const { data: recentOrders } = await admin
    .from("orders")
    .select("total_amount, created_at")
    .eq("payment_status", "completed")
    .order("created_at", { ascending: true })
    .limit(100);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const chartData = months.map(m => ({ name: m, revenue: 0 }));

  recentOrders?.forEach((o: any) => {
    const d = new Date(o.created_at);
    const mIdx = d.getMonth();
    chartData[mIdx].revenue += Number(o.total_amount);
  });

  return chartData;
}

export async function getPublicCommunities(limit = 12) {
  const admin = getAdminDB();
  const { data, error } = await admin
    .from("communities")
    .select("*, profiles!communities_owner_id_fkey(full_name, avatar_url, username)")
    .eq("is_active", true)
    .order("member_count", { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error("Error fetching public communities:", error);
    return [];
  }
  return data ?? [];
}
