"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";

type Operations = { health: { score: number; label: string }; users24h: number; orders24h: number; failedWebhooks24h: number; failedWalletCredits: number; cronSecretPresent: boolean; liveHealthConfigured: boolean; enabledFeatureFlags: number; openReports: number; recentAlerts: Array<{ id: string; severity: string; title: string; created_at: string }> };

export default function OperationsPage() {
  const [data, setData] = useState<Operations | null>(null);
  useEffect(() => { fetch("/api/admin/operations").then((r) => r.ok ? r.json() : null).then(setData).catch(() => setData(null)); }, []);
  if (!data) return <p className="text-sm text-[var(--color-text-muted)]">Loading operations health…</p>;
  const cards = [
    ["Users, 24h", data.users24h], ["Orders, 24h", data.orders24h], ["Failed webhooks", data.failedWebhooks24h],
    ["Failed credits", data.failedWalletCredits], ["Open reports", data.openReports], ["Enabled flags", data.enabledFeatureFlags],
  ];
  return <div className="space-y-6">
    <header><p className="text-xs font-semibold uppercase tracking-wider text-[#fd5000]">Platform operations</p><h1 className="mt-1 text-2xl font-semibold text-[var(--color-text-primary)]">Launch health</h1></header>
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="flex items-center gap-3"><Activity className="h-6 w-6 text-[#fd5000]" /><div><p className="font-semibold text-[var(--color-text-primary)]">{data.health.score}/100 · {data.health.label}</p><p className="text-sm text-[var(--color-text-muted)]">System analysis and operational signals</p></div></div>
    </section>
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">{cards.map(([label, value]) => <div key={String(label)} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"><p className="text-xs text-[var(--color-text-muted)]">{label}</p><p className="mt-1 text-2xl font-semibold text-[var(--color-text-primary)]">{value}</p></div>)}</section>
    <section className="grid gap-3 sm:grid-cols-2"><Status label="Cron secret" ok={data.cronSecretPresent} /><Status label="Live infrastructure" ok={data.liveHealthConfigured} /></section>
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"><h2 className="font-semibold text-[var(--color-text-primary)]">Open alerts</h2><div className="mt-3 space-y-2">{data.recentAlerts.length ? data.recentAlerts.map((alert) => <div key={alert.id} className="flex gap-2 text-sm text-[var(--color-text-secondary)]"><AlertTriangle className="h-4 w-4 shrink-0 text-[#fd5000]" />{alert.title}</div>) : <p className="text-sm text-[var(--color-text-muted)]">No open alerts.</p>}</div></section>
  </div>;
}

function Status({ label, ok }: { label: string; ok: boolean }) {
  return <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text-secondary)]">{ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <ShieldAlert className="h-4 w-4 text-[#fd5000]" />}{label}: {ok ? "configured" : "missing"}</div>;
}
