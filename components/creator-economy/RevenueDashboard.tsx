"use client";
import { useEffect, useState } from "react";
type Report = { total: number; sources: Record<string, number | string>; series: { date: string; amount: number }[] };
export function RevenueDashboard() {
  const [report, setReport] = useState<Report | null>(null);
  useEffect(() => { fetch("/api/creator/revenue").then((r) => r.json()).then(setReport); }, []);
  const money = (amount: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(amount || 0);
  return <section className="space-y-5"><div className="flex items-start justify-between gap-3"><div><h1 className="text-xl font-bold text-[var(--color-text-primary)]">Creator revenue</h1><p className="text-sm text-[var(--color-text-muted)]">Last 30 days across your creator channels.</p></div><a href="/api/creator/revenue?export=csv" className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)]">Export CSV</a></div><div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"><p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Total earnings</p><p className="mt-2 text-3xl font-bold text-[#fd5000]">{money(report?.total ?? 0)}</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{["membership", "marketplace", "affiliate", "live"].map((source) => <div key={source} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"><p className="text-xs capitalize text-[var(--color-text-muted)]">{source}</p><p className="mt-1 font-bold text-[var(--color-text-primary)]">{money(Number(report?.sources?.[source] ?? 0))}</p></div>)}</div></section>;
}
