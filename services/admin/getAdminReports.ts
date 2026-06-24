import { getAdminDB } from "@/services/base";
import {
  ADMIN_PRIMARY_CURRENCY,
  formatAdminMoneyTotals,
  sumAdminMoneyForCurrency,
} from "@/lib/admin/format-money";
import { isOrderPaymentComplete } from "@/lib/payments/order-payment-utils";
import { ADMIN_RANGES, type AdminRangeKey } from "@/lib/admin/ranges";
import {
  buildCategoryRevenue,
  buildDailyRevenueTable,
  buildRevenueSummary,
  buildRevenueTrend,
  type CategoryRevenueRow,
  type DailyRevenueRow,
  type OrderRow,
  type RevenueTrendPoint,
} from "@/lib/admin/build-revenue-report";

export type { AdminRangeKey as RangeKey };

export type AdminReportsSummary = {
  orderCount: number;
  paidOrderCount: number;
  grossRevenue: number;
  grossRevenueDisplay: string;
  netRevenue: number;
  netRevenueDisplay: string;
  averageOrderValue: number;
  averageOrderValueDisplay: string;
  completedOrders: number;
  refundCount: number;
  newUsers: number;
  newVendors: number;
  pendingUgcReports: number;
};

export type AdminReportsBreakdownRow = {
  key: string;
  label: string;
  count: number;
};

export type AdminTopVendorRow = {
  id: string;
  name: string;
  slug: string;
  orders: number;
  revenue: number;
  revenueDisplay: string;
};

export type AdminReportsData = {
  range: AdminRangeKey;
  summary: AdminReportsSummary;
  revenueTrend: RevenueTrendPoint[];
  revenueByCategory: CategoryRevenueRow[];
  dailyBreakdown: DailyRevenueRow[];
  ordersByStatus: AdminReportsBreakdownRow[];
  ordersByPayment: AdminReportsBreakdownRow[];
  topVendors: AdminTopVendorRow[];
};

function rangeStart(range: AdminRangeKey): Date | null {
  return ADMIN_RANGES[range]?.start() ?? ADMIN_RANGES.mtd.start();
}

export async function getAdminReports(range: AdminRangeKey = "mtd"): Promise<AdminReportsData> {
  const admin = getAdminDB();
  const start = rangeStart(range);
  const startIso = start?.toISOString();

  let ordersQuery = admin
    .from("orders")
    .select(
      "id, total_amount, subtotal, discount_amount, currency, status, payment_status, vendor_id, created_at",
    );
  let usersQuery = admin.from("profiles").select("id", { count: "exact", head: true });
  let vendorsQuery = admin.from("vendors").select("id", { count: "exact", head: true });

  if (startIso) {
    ordersQuery = ordersQuery.gte("created_at", startIso);
    usersQuery = usersQuery.gte("created_at", startIso);
    vendorsQuery = vendorsQuery.gte("created_at", startIso);
  }

  const [{ data: orders }, { count: newUsers }, { count: newVendors }, { count: pendingUgcReports }] =
    await Promise.all([
      ordersQuery,
      usersQuery,
      vendorsQuery,
      admin.from("ugc_reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);

  const rows = (orders ?? []) as OrderRow[];
  const revenueMetrics = buildRevenueSummary(rows);
  const paid = rows.filter((o) => isOrderPaymentComplete(o.payment_status));
  const paidIds = paid.map((o) => o.id);

  let revenueByCategory: CategoryRevenueRow[] = [];
  if (paidIds.length > 0) {
    const { data: items } = await admin
      .from("order_items")
      .select(
        "total_price, product_type, product_source, products(product_categories(name))",
      )
      .in("order_id", paidIds.slice(0, 2000));

    revenueByCategory = buildCategoryRevenue(items ?? []);
  }

  const statusMap = new Map<string, number>();
  const paymentMap = new Map<string, number>();
  for (const o of rows) {
    const st = o.status ?? "unknown";
    const pay = o.payment_status ?? "unknown";
    statusMap.set(st, (statusMap.get(st) ?? 0) + 1);
    paymentMap.set(pay, (paymentMap.get(pay) ?? 0) + 1);
  }

  const vendorStats = new Map<string, { orders: number; revenue: number }>();
  for (const o of paid) {
    if (!o.vendor_id) continue;
    const cur = vendorStats.get(o.vendor_id) ?? { orders: 0, revenue: 0 };
    cur.orders += 1;
    if ((o.currency ?? ADMIN_PRIMARY_CURRENCY).toUpperCase() === ADMIN_PRIMARY_CURRENCY) {
      cur.revenue += Number(o.total_amount ?? 0);
    }
    vendorStats.set(o.vendor_id, cur);
  }

  const topVendorIds = [...vendorStats.entries()]
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 8)
    .map(([id]) => id);

  let topVendors: AdminTopVendorRow[] = [];
  if (topVendorIds.length > 0) {
    const { data: vendorRows } = await admin
      .from("vendors")
      .select("id, business_name, business_slug")
      .in("id", topVendorIds);

    topVendors = (vendorRows ?? [])
      .map((v) => {
        const stats = vendorStats.get(v.id)!;
        return {
          id: v.id,
          name: v.business_name ?? "Store",
          slug: v.business_slug ?? v.id,
          orders: stats.orders,
          revenue: stats.revenue,
          revenueDisplay: formatAdminMoneyTotals([
            { amount: stats.revenue, currency: ADMIN_PRIMARY_CURRENCY },
          ]),
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }

  const paidMoney = paid.map((o) => ({ amount: o.total_amount, currency: o.currency }));
  const grossRevenue = sumAdminMoneyForCurrency(paidMoney, ADMIN_PRIMARY_CURRENCY);

  return {
    range,
    summary: {
      orderCount: rows.length,
      paidOrderCount: revenueMetrics.paidOrderCount,
      grossRevenue: revenueMetrics.grossRevenue || grossRevenue,
      grossRevenueDisplay:
        revenueMetrics.grossRevenueDisplay ||
        formatAdminMoneyTotals([{ amount: grossRevenue, currency: ADMIN_PRIMARY_CURRENCY }]),
      netRevenue: revenueMetrics.netRevenue,
      netRevenueDisplay: revenueMetrics.netRevenueDisplay,
      averageOrderValue: revenueMetrics.averageOrderValue,
      averageOrderValueDisplay: revenueMetrics.averageOrderValueDisplay,
      completedOrders: revenueMetrics.completedOrders,
      refundCount: rows.filter((o) => o.payment_status === "refunded" || o.status === "refunded").length,
      newUsers: newUsers ?? 0,
      newVendors: newVendors ?? 0,
      pendingUgcReports: pendingUgcReports ?? 0,
    },
    revenueTrend: buildRevenueTrend(rows, range),
    revenueByCategory,
    dailyBreakdown: buildDailyRevenueTable(rows, 30),
    ordersByStatus: [...statusMap.entries()]
      .map(([key, count]) => ({ key, label: key.replace(/_/g, " "), count }))
      .sort((a, b) => b.count - a.count),
    ordersByPayment: [...paymentMap.entries()]
      .map(([key, count]) => ({ key, label: key.replace(/_/g, " "), count }))
      .sort((a, b) => b.count - a.count),
    topVendors,
  };
}
