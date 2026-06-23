import { ADMIN_PRIMARY_CURRENCY } from "@/lib/admin/format-money";

export type AdminRevenueChartPoint = {
  month: string;
  year: number;
  revenue: number;
  orders: number;
  prevRevenue: number;
  prevOrders: number;
};

export function buildAdminRevenueChart(
  rows: Array<{ total_amount: number; created_at: string; currency?: string | null }>,
  currency = ADMIN_PRIMARY_CURRENCY,
): AdminRevenueChartPoint[] {
  const normalizedCurrency = currency.toUpperCase();
  const filteredRows = rows.filter(
    (row) => (row.currency ?? ADMIN_PRIMARY_CURRENCY).toUpperCase() === normalizedCurrency,
  );
  const now = new Date();
  const buckets: AdminRevenueChartPoint[] = [];
  let priorBucket = { revenue: 0, orders: 0 };

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      month: d.toLocaleDateString("en-US", { month: "short" }),
      year: d.getFullYear(),
      revenue: 0,
      orders: 0,
      prevRevenue: 0,
      prevOrders: 0,
    });
  }

  for (const row of filteredRows) {
    const d = new Date(row.created_at);
    const monthsAgo =
      (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    const amount = Number(row.total_amount ?? 0);

    if (monthsAgo === 12) {
      priorBucket.revenue += amount;
      priorBucket.orders += 1;
      continue;
    }

    if (monthsAgo < 0 || monthsAgo > 11) continue;
    const idx = 11 - monthsAgo;
    buckets[idx].revenue += amount;
    buckets[idx].orders += 1;
  }

  buckets[0].prevRevenue = priorBucket.revenue;
  buckets[0].prevOrders = priorBucket.orders;
  for (let i = 1; i < buckets.length; i++) {
    buckets[i].prevRevenue = buckets[i - 1].revenue;
    buckets[i].prevOrders = buckets[i - 1].orders;
  }

  return buckets;
}

export type WebhookDailyPoint = {
  day: string;
  completed: number;
  failed: number;
};

export function buildWebhookDailyChart(
  rows: Array<{ status: string; created_at: string }>,
  days = 7,
): WebhookDailyPoint[] {
  const now = new Date();
  const buckets: WebhookDailyPoint[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    buckets.push({
      day: d.toLocaleDateString("en-US", { weekday: "short" }),
      completed: 0,
      failed: 0,
    });
  }

  for (const row of rows) {
    const created = new Date(row.created_at);
    const diffDays = Math.floor((now.getTime() - created.getTime()) / 86400000);
    if (diffDays < 0 || diffDays >= days) continue;
    const idx = days - 1 - diffDays;
    if (row.status === "failed") buckets[idx].failed += 1;
    else if (row.status === "completed") buckets[idx].completed += 1;
  }

  return buckets;
}
