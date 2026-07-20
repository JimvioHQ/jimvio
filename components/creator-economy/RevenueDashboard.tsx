"use client";

import { useEffect, useState } from "react";

type Report = {
  total: number;
  sources: Record<string, number | string>;
  series: { date: string; amount: number }[];
};

export function RevenueDashboard() {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/creator/revenue")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed to load revenue");
        setReport(data);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, []);

  const money = (amount: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(amount || 0);
  const max = Math.max(1, ...(report?.series.map((point) => point.amount) ?? [0]));

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Creator revenue</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Last 30 days across memberships, marketplace, live, and affiliates.
          </p>
        </div>
        <a
          href="/api/creator/revenue?export=csv"
          className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)]"
        >
          Export CSV
        </a>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          Total earnings
        </p>
        <p className="mt-2 text-3xl font-bold text-[#fd5000]">{money(report?.total ?? 0)}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {["membership", "marketplace", "affiliate", "live"].map((source) => (
          <div
            key={source}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          >
            <p className="text-xs capitalize text-[var(--color-text-muted)]">{source}</p>
            <p className="mt-1 font-bold text-[var(--color-text-primary)]">
              {money(Number(report?.sources?.[source] ?? 0))}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Daily earnings</h2>
        <div
          className="mt-4 flex h-40 items-end gap-1 overflow-x-auto"
          role="img"
          aria-label="Daily revenue chart"
        >
          {(report?.series ?? []).length === 0 && (
            <p className="text-sm text-[var(--color-text-muted)]">No revenue in this period yet.</p>
          )}
          {(report?.series ?? []).map((point) => (
            <div key={point.date} className="flex min-w-6 flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-[#fd5000]"
                style={{ height: `${Math.max(4, (point.amount / max) * 100)}%` }}
                title={`${point.date}: ${money(point.amount)}`}
              />
              <span className="sr-only">
                {point.date}: {money(point.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
