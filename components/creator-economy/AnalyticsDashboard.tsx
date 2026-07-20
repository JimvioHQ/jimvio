"use client";
import { useEffect, useState } from "react";
type Analytics = { followers: number; subscribers: number; conversion: number; sales: { count: number; revenue: number }; engagement: { productViews: number; affiliateClicks: number; lessonCompletionRate: number }; ltv: number; churn: { rate: number; note: string } };
export function AnalyticsDashboard() {
  const [data, setData] = useState<Analytics | null>(null);
  useEffect(() => { fetch("/api/creator/analytics").then((r) => r.json()).then(setData); }, []);
  const stats = [["Followers", data?.followers ?? 0], ["Subscribers", data?.subscribers ?? 0], ["Conversion", `${data?.conversion ?? 0}%`], ["Sales", data?.sales?.count ?? 0], ["Product views", data?.engagement?.productViews ?? 0], ["Lesson completion", `${data?.engagement?.lessonCompletionRate ?? 0}%`], ["LTV", `$${data?.ltv ?? 0}`], ["Churn", `${data?.churn?.rate ?? 0}%`]];
  return <section className="space-y-4"><div><h1 className="text-xl font-bold text-[var(--color-text-primary)]">Creator analytics</h1><p className="text-sm text-[var(--color-text-muted)]">A practical view of audience, sales, and learning engagement.</p></div><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{stats.map(([label, value]) => <div key={String(label)} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"><p className="text-xs text-[var(--color-text-muted)]">{label}</p><p className="mt-1 text-xl font-bold text-[var(--color-text-primary)]">{value}</p></div>)}</div><p className="text-xs text-[var(--color-text-muted)]">{data?.churn?.note}</p></section>;
}
