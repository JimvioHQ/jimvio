import { ADMIN_PRIMARY_CURRENCY, formatAdminAmount } from "@/lib/admin/format-money";
import { isOrderPaymentComplete } from "@/lib/payments/order-payment-utils";
import type { AdminRangeKey } from "@/lib/admin/ranges";

export type OrderRow = {
  id: string;
  total_amount: number | null;
  subtotal?: number | null;
  discount_amount?: number | null;
  currency?: string | null;
  status?: string | null;
  payment_status?: string | null;
  created_at: string | null;
  vendor_id?: string | null;
};

const CATEGORY_COLORS = ["var(--color-accent)", "#8b5cf6", "#3b82f6", "#22c55e", "#ec4899", "#14b8a6", "#eab308"];

function inPrimaryCurrency(o: OrderRow): boolean {
  return (o.currency ?? ADMIN_PRIMARY_CURRENCY).toUpperCase() === ADMIN_PRIMARY_CURRENCY;
}

function orderGross(o: OrderRow): number {
  const total = Number(o.total_amount ?? 0);
  const discount = Number(o.discount_amount ?? 0);
  return total + discount;
}

function orderDiscount(o: OrderRow): number {
  return Number(o.discount_amount ?? 0);
}

function orderNet(o: OrderRow): number {
  if (o.payment_status === "refunded" || o.status === "refunded") return 0;
  return Number(o.total_amount ?? 0);
}

function orderRefund(o: OrderRow): number {
  if (o.payment_status === "refunded" || o.status === "refunded") {
    return Number(o.total_amount ?? 0);
  }
  return 0;
}

function isCompletedOrder(o: OrderRow): boolean {
  const st = (o.status ?? "").toLowerCase();
  return st === "delivered" || st === "completed";
}

export function buildRevenueSummary(rows: OrderRow[]) {
  const paid = rows.filter((o) => isOrderPaymentComplete(o.payment_status) && inPrimaryCurrency(o));
  const gross = paid.reduce((s, o) => s + orderGross(o), 0);
  const net = paid.reduce((s, o) => s + orderNet(o), 0);
  const discounts = paid.reduce((s, o) => s + orderDiscount(o), 0);
  const refunds = rows.filter((o) => inPrimaryCurrency(o)).reduce((s, o) => s + orderRefund(o), 0);
  const completed = paid.filter(isCompletedOrder).length;
  const aov = paid.length > 0 ? net / paid.length : 0;

  return {
    grossRevenue: gross,
    netRevenue: net,
    totalDiscounts: discounts,
    totalRefunds: refunds,
    paidOrderCount: paid.length,
    completedOrders: completed,
    averageOrderValue: aov,
    grossRevenueDisplay: formatAdminAmount(gross, ADMIN_PRIMARY_CURRENCY, ADMIN_PRIMARY_CURRENCY),
    netRevenueDisplay: formatAdminAmount(net, ADMIN_PRIMARY_CURRENCY, ADMIN_PRIMARY_CURRENCY),
    averageOrderValueDisplay: formatAdminAmount(aov, ADMIN_PRIMARY_CURRENCY, ADMIN_PRIMARY_CURRENCY),
  };
}

export type RevenueTrendPoint = {
  label: string;
  gross: number;
  net: number;
};

export function buildRevenueTrend(rows: OrderRow[], range: AdminRangeKey): RevenueTrendPoint[] {
  const paid = rows.filter((o) => isOrderPaymentComplete(o.payment_status) && inPrimaryCurrency(o));
  const useDaily = range === "today" || range === "7d";
  const now = new Date();

  if (useDaily) {
    const days = range === "today" ? 1 : 7;
    const buckets: RevenueTrendPoint[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      buckets.push({
        label: d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" }),
        gross: 0,
        net: 0,
      });
    }
    for (const o of paid) {
      if (!o.created_at) continue;
      const created = new Date(o.created_at);
      const diff = Math.floor((now.getTime() - created.getTime()) / 86400000);
      if (diff < 0 || diff >= days) continue;
      const idx = days - 1 - diff;
      buckets[idx].gross += orderGross(o);
      buckets[idx].net += orderNet(o);
    }
    return buckets;
  }

  const months = range === "ytd" ? now.getMonth() + 1 : 12;
  const buckets: RevenueTrendPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      label: d.toLocaleDateString("en-US", { month: "short" }),
      gross: 0,
      net: 0,
    });
  }

  for (const o of paid) {
    if (!o.created_at) continue;
    const created = new Date(o.created_at);
    const monthsAgo = (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth());
    if (monthsAgo < 0 || monthsAgo >= months) continue;
    const idx = months - 1 - monthsAgo;
    buckets[idx].gross += orderGross(o);
    buckets[idx].net += orderNet(o);
  }

  return buckets;
}

export type DailyRevenueRow = {
  dateKey: string;
  dateLabel: string;
  orders: number;
  grossRevenue: number;
  discounts: number;
  refunds: number;
  netRevenue: number;
  grossDisplay: string;
  discountsDisplay: string;
  refundsDisplay: string;
  netDisplay: string;
};

export function buildDailyRevenueTable(rows: OrderRow[], limit = 30): DailyRevenueRow[] {
  const byDay = new Map<
    string,
    { orders: number; gross: number; discounts: number; refunds: number; net: number }
  >();

  for (const o of rows) {
    if (!o.created_at || !inPrimaryCurrency(o)) continue;
    const day = o.created_at.slice(0, 10);
    const cur = byDay.get(day) ?? { orders: 0, gross: 0, discounts: 0, refunds: 0, net: 0 };

    if (isOrderPaymentComplete(o.payment_status)) {
      cur.orders += 1;
      cur.gross += orderGross(o);
      cur.discounts += orderDiscount(o);
      cur.net += orderNet(o);
    }
    cur.refunds += orderRefund(o);
    byDay.set(day, cur);
  }

  return [...byDay.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, limit)
    .map(([dateKey, v]) => ({
      dateKey,
      dateLabel: new Date(dateKey + "T12:00:00").toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      orders: v.orders,
      grossRevenue: v.gross,
      discounts: v.discounts,
      refunds: v.refunds,
      netRevenue: v.net,
      grossDisplay: formatAdminAmount(v.gross, ADMIN_PRIMARY_CURRENCY, ADMIN_PRIMARY_CURRENCY),
      discountsDisplay: formatAdminAmount(v.discounts, ADMIN_PRIMARY_CURRENCY, ADMIN_PRIMARY_CURRENCY),
      refundsDisplay: formatAdminAmount(v.refunds, ADMIN_PRIMARY_CURRENCY, ADMIN_PRIMARY_CURRENCY),
      netDisplay: formatAdminAmount(v.net, ADMIN_PRIMARY_CURRENCY, ADMIN_PRIMARY_CURRENCY),
    }));
}

export type CategoryRevenueRow = {
  name: string;
  revenue: number;
  revenueDisplay: string;
  color: string;
};

export function buildCategoryRevenue(
  items: Array<{
    total_price: number | null;
    product_type?: string | null;
    product_source?: string | null;
    products?: { product_categories?: { name: string } | null } | null;
  }>,
): CategoryRevenueRow[] {
  const map = new Map<string, number>();

  for (const item of items) {
    const cat =
      item.products?.product_categories?.name ??
      item.product_type ??
      item.product_source ??
      "Other";
    const label = String(cat).replace(/_/g, " ");
    map.set(label, (map.get(label) ?? 0) + Number(item.total_price ?? 0));
  }

  return [...map.entries()]
    .map(([name, revenue], i) => ({
      name,
      revenue,
      revenueDisplay: formatAdminAmount(revenue, ADMIN_PRIMARY_CURRENCY, ADMIN_PRIMARY_CURRENCY),
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);
}
