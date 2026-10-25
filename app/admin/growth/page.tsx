"use client";

import { FormEvent, useEffect, useState } from "react";

type Growth = { campaigns: Array<{ id: string; name: string; status: string; channel: string }>; invites: Array<{ id: string; code: string; status: string }>; stats: { newUsers7d: number; affiliateClicks7d: number | null } };

export default function GrowthPage() {
  const [data, setData] = useState<Growth | null>(null);
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("");
  const load = () => fetch("/api/admin/growth").then((r) => r.json()).then(setData).catch(() => {});
  useEffect(() => { void load(); }, []);
  async function create(event: FormEvent) {
    event.preventDefault();
    if (!name || !channel) return;
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    if ((await fetch("/api/admin/growth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, channel, slug }) })).ok) { setName(""); setChannel(""); load(); }
  }
  return <div className="space-y-6">
    <header><p className="text-xs font-semibold uppercase tracking-wider text-[#fd5000]">Growth engine</p><h1 className="mt-1 text-2xl font-semibold text-[var(--color-text-primary)]">Campaign operations</h1><a className="mt-2 inline-block text-sm text-[#fd5000]" href="/admin/growth/engine">Open automation control</a></header>
    <section className="grid grid-cols-2 gap-3"><Metric label="New users, 7d" value={data?.stats.newUsers7d ?? "—"} /><Metric label="Affiliate clicks, 7d" value={data?.stats.affiliateClicks7d ?? "—"} /></section>
    <form onSubmit={create} className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:grid-cols-3"><input aria-label="Campaign name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Campaign name" className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm" /><input aria-label="Campaign channel" value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="Channel" className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm" /><button className="rounded-md bg-[#fd5000] px-4 py-2 text-sm font-semibold text-white">Create campaign</button></form>
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"><h2 className="font-semibold text-[var(--color-text-primary)]">Campaigns</h2><div className="mt-3 space-y-2">{data?.campaigns.length ? data.campaigns.map((campaign) => <p key={campaign.id} className="text-sm text-[var(--color-text-secondary)]">{campaign.name} · {campaign.channel} · {campaign.status}</p>) : <p className="text-sm text-[var(--color-text-muted)]">No campaigns yet.</p>}</div></section>
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"><h2 className="font-semibold text-[var(--color-text-primary)]">Recent invites</h2><div className="mt-3 space-y-2">{data?.invites.length ? data.invites.map((invite) => <p key={invite.id} className="font-mono text-sm text-[var(--color-text-secondary)]">{invite.code} · {invite.status}</p>) : <p className="text-sm text-[var(--color-text-muted)]">No invite codes yet.</p>}</div></section>
  </div>;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"><p className="text-xs text-[var(--color-text-muted)]">{label}</p><p className="mt-1 text-2xl font-semibold text-[var(--color-text-primary)]">{value}</p></div>;
}
