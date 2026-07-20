"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Flag = { key: string; enabled: boolean; rollout_percent: number; description: string | null };
type Audit = { id: string; action: string; entity_type: string; created_at: string };

export default function CommandCenterPage() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [events, setEvents] = useState<Audit[]>([]);
  useEffect(() => {
    fetch("/api/admin/feature-flags").then((r) => r.json()).then(setFlags).catch(() => {});
    fetch("/api/ops/alerts").catch(() => {});
    fetch("/api/admin/command-center").then((r) => r.ok ? r.json() : { events: [] }).then((d) => setEvents(d.events ?? [])).catch(() => {});
  }, []);
  async function toggle(flag: Flag) {
    const response = await fetch("/api/admin/feature-flags", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...flag, enabled: !flag.enabled }) });
    if (response.ok) setFlags((current) => current.map((item) => item.key === flag.key ? { ...item, enabled: !item.enabled } : item));
  }
  return <div className="space-y-6">
    <header><p className="text-xs font-semibold uppercase tracking-wider text-[#fd5000]">Admin command center</p><h1 className="mt-1 text-2xl font-semibold text-[var(--color-text-primary)]">Control plane</h1></header>
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["Operations", "/admin/operations"], ["Trust & Safety", "/admin/trust-safety"], ["Growth", "/admin/growth"], ["System analysis", "/admin/system-analysis"]].map(([name, href]) => <Link key={href} href={href} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm font-medium text-[var(--color-text-primary)] hover:border-[#fd5000]">{name}</Link>)}</section>
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"><h2 className="font-semibold text-[var(--color-text-primary)]">Kill switches</h2><p className="mt-1 text-sm text-[var(--color-text-muted)]">Feature flags are audited and apply immediately.</p><div className="mt-4 divide-y divide-[var(--color-border)]">{flags.length ? flags.map((flag) => <div className="flex items-center justify-between gap-3 py-3" key={flag.key}><div><p className="text-sm font-medium text-[var(--color-text-primary)]">{flag.key}</p><p className="text-xs text-[var(--color-text-muted)]">{flag.description ?? `${flag.rollout_percent}% rollout`}</p></div><button type="button" onClick={() => toggle(flag)} aria-pressed={flag.enabled} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${flag.enabled ? "bg-[#fd5000] text-white" : "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]"}`}>{flag.enabled ? "Enabled" : "Disabled"}</button></div>) : <p className="py-4 text-sm text-[var(--color-text-muted)]">No flags configured.</p>}</div></section>
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"><h2 className="font-semibold text-[var(--color-text-primary)]">Recent audit activity</h2><div className="mt-3 space-y-2">{events.length ? events.map((event) => <p className="text-sm text-[var(--color-text-secondary)]" key={event.id}>{event.action} · {event.entity_type}</p>) : <p className="text-sm text-[var(--color-text-muted)]">Audit activity appears here after the migration is applied.</p>}</div></section>
  </div>;
}
