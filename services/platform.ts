import { getAdminDB } from "./base";

export async function getPlatformStats() {
  const admin = getAdminDB();
  const [users, vendors, products] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("vendors").select("id", { count: "exact", head: true }).eq("is_active", true),
    admin.from("products").select("id", { count: "exact", head: true }).eq("status", "active"),
  ]);
  return {
    totalUsers:    users.count    ?? 0,
    totalVendors:  vendors.count  ?? 0,
    totalProducts: products.count ?? 0,
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
