"use client";

import { useEffect, useState } from "react";
import type { GrowthKpis } from "@/services/growth/kpi";

const labels: Array<[keyof Omit<GrowthKpis, "funnel">, string]> = [
  ["dau", "DAU"], ["wau", "WAU"], ["mau", "MAU"],
  ["postsToday", "Posts today"], ["messagesToday", "Messages today"], ["liveSessionsToday", "Live sessions today"],
  ["gmvToday", "GMV today"], ["creatorRevenueToday", "Creator revenue"], ["affiliateCommissionsToday", "Affiliate commissions"],
];

export default function GrowthKpisPage() {
  const [kpis, setKpis] = useState<GrowthKpis | null>(null);
  useEffect(() => {
    fetch("/api/admin/growth-kpis").then((r) => r.ok ? r.json() : null).then(setKpis).catch(() => undefined);
  }, []);
  return (
    <section>
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Growth KPIs</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">Today&apos;s platform activity and 30-day audience signals.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {labels.map(([key, label]) => (
          <article key={key} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
            <p className="mt-2 text-2xl font-bold text-[var(--color-text-primary)]">{kpis ? Number(kpis[key]).toLocaleString() : "—"}</p>
          </article>
        ))}
      </div>
      <h2 className="mt-8 text-base font-semibold text-[var(--color-text-primary)]">Growth funnel</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Object.entries(kpis?.funnel ?? {}).map(([event, count]) => (
          <article key={event} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className="text-xs text-[var(--color-text-muted)]">{event.replace("growth.", "").replaceAll("_", " ")}</p>
            <p className="mt-2 text-xl font-bold text-[var(--color-text-primary)]">{count.toLocaleString()}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
