"use client";

import { useEffect, useState } from "react";

type Analytics = {
  followers: number;
  subscribers: number;
  conversion: number;
  sales: { count: number; revenue: number };
  engagement: {
    productViews: number;
    affiliateClicks: number;
    lessonCompletionRate: number;
  };
  retention: { activeSubscribers: number; note: string };
  ltv: number;
  churn: { rate: number; note: string };
  topContent: Array<{ id: string; name: string; sale_count: number | null; view_count: number | null }>;
};

export function AnalyticsDashboard() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/creator/analytics")
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || "Failed to load analytics");
        setData(body);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, []);

  const money = (amount: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(amount || 0);

  const stats: Array<[string, string | number]> = [
    ["Followers", data?.followers ?? 0],
    ["Subscribers", data?.subscribers ?? 0],
    ["Conversion", `${data?.conversion ?? 0}%`],
    ["Sales", data?.sales?.count ?? 0],
    ["Sales revenue", money(data?.sales?.revenue ?? 0)],
    ["Product views", data?.engagement?.productViews ?? 0],
    ["Affiliate clicks", data?.engagement?.affiliateClicks ?? 0],
    ["Lesson completion", `${data?.engagement?.lessonCompletionRate ?? 0}%`],
    ["LTV", money(data?.ltv ?? 0)],
    ["Churn", `${data?.churn?.rate ?? 0}%`],
    ["Retention", data?.retention?.activeSubscribers ?? 0],
  ];

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Creator analytics</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Audience, conversion, retention, and top-performing content.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          >
            <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
            <p className="mt-1 text-xl font-bold text-[var(--color-text-primary)]">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Top content</h2>
        <ul className="mt-3 space-y-2">
          {(data?.topContent ?? []).map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 text-sm text-[var(--color-text-primary)]"
            >
              <span className="truncate">{item.name}</span>
              <span className="shrink-0 text-[var(--color-text-muted)]">
                {Number(item.sale_count ?? 0)} sales · {Number(item.view_count ?? 0)} views
              </span>
            </li>
          ))}
          {!data?.topContent?.length && (
            <li className="text-sm text-[var(--color-text-muted)]">No products yet.</li>
          )}
        </ul>
      </div>

      <p className="text-xs text-[var(--color-text-muted)]">{data?.churn?.note}</p>
      <p className="text-xs text-[var(--color-text-muted)]">{data?.retention?.note}</p>
    </section>
  );
}
