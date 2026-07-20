import { createServiceRoleClient } from "@/lib/supabase/service-role";

function db() {
  return createServiceRoleClient();
}
const count = (result: { count: number | null }) => result.count ?? 0;

/** Metrics are approximations where the core schema has no event-level source. */
export async function getCreatorAnalytics(userId: string) {
  const client = db();
  const [{ data: vendor }, { data: communities }, { data: affiliate }] = await Promise.all([
    client.from("vendors").select("id, follower_count").eq("user_id", userId).maybeSingle(),
    client.from("communities").select("id, member_count").eq("owner_id", userId),
    client.from("affiliates").select("id").eq("user_id", userId).maybeSingle(),
  ]);
  const communityIds = (communities ?? []).map((item) => item.id);
  const productResult = vendor
    ? await client
        .from("products")
        .select("id, name, view_count, sale_count, price")
        .eq("vendor_id", vendor.id)
        .is("deleted_at", null)
    : { data: [] };
  const products = productResult.data ?? [];

  const [memberships, cancelled, clicks, sales, progress] = await Promise.all([
    communityIds.length
      ? client
          .from("community_memberships")
          .select("id", { count: "exact", head: true })
          .in("community_id", communityIds)
          .eq("status", "active")
      : Promise.resolve({ count: 0 }),
    communityIds.length
      ? client
          .from("community_subscription_events")
          .select("id", { count: "exact", head: true })
          .in("community_id", communityIds)
          .eq("event_type", "cancelled")
      : Promise.resolve({ count: 0 }),
    affiliate
      ? client
          .from("affiliate_clicks")
          .select("id", { count: "exact", head: true })
          .eq("affiliate_id", affiliate.id)
      : Promise.resolve({ count: 0 }),
    vendor
      ? client
          .from("orders")
          .select("id, total_amount", { count: "exact" })
          .eq("vendor_id", vendor.id)
          .eq("payment_status", "paid")
      : Promise.resolve({ count: 0, data: [] }),
    client
      .from("lesson_progress")
      .select("id, is_completed", { count: "exact" })
      .eq("user_id", userId),
  ]);

  const views = products.reduce((total, product) => total + Number(product.view_count ?? 0), 0);
  const salesCount = count(sales as { count: number | null });
  const totalSales = (sales.data ?? []).reduce(
    (total, sale) => total + Number(sale.total_amount ?? 0),
    0
  );
  const followers =
    Number(vendor?.follower_count ?? 0) +
    (communities ?? []).reduce((total, community) => total + Number(community.member_count ?? 0), 0);
  const activeSubscribers = count(memberships as { count: number | null });
  const cancelledCount = count(cancelled as { count: number | null });
  const churnDenom = activeSubscribers + cancelledCount;
  const completed = (progress.data ?? []).filter((item) => item.is_completed).length;
  const progressCount = count(progress as { count: number | null });
  const topContent = [...products]
    .sort((a, b) => Number(b.sale_count ?? 0) - Number(a.sale_count ?? 0))
    .slice(0, 5);

  return {
    followers,
    subscribers: activeSubscribers,
    conversion: views ? Number(((salesCount / views) * 100).toFixed(2)) : 0,
    sales: { count: salesCount, revenue: totalSales },
    engagement: {
      affiliateClicks: count(clicks as { count: number | null }),
      productViews: views,
      lessonCompletionRate: progressCount
        ? Number(((completed / progressCount) * 100).toFixed(2))
        : 0,
    },
    retention: {
      activeSubscribers,
      note: "Active memberships are used as the current retention proxy.",
    },
    ltv: salesCount ? Number((totalSales / salesCount).toFixed(2)) : 0,
    churn: {
      rate: churnDenom ? Number(((cancelledCount / churnDenom) * 100).toFixed(2)) : 0,
      note: "Churn approximates cancelled subscription events vs active + cancelled memberships.",
    },
    topContent,
  };
}
