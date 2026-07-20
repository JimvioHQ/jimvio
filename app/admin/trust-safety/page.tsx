"use client";

import { useEffect, useState } from "react";

type Report = { id: string; source: string; reason?: string; status?: string; created_at: string };

export default function TrustSafetyPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [suspended, setSuspended] = useState<Array<{ id: string; email?: string; full_name?: string }>>([]);
  useEffect(() => { fetch("/api/admin/trust-safety").then((r) => r.json()).then((data) => { setReports(data.reports ?? []); setSuspended(data.suspendedUsers ?? []); }).catch(() => {}); }, []);
  async function resolve(report: Report) {
    const response = await fetch("/api/admin/trust-safety", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source: report.source, id: report.id }) });
    if (response.ok) setReports((rows) => rows.filter((row) => row.id !== report.id || row.source !== report.source));
  }
  return <div className="space-y-6">
    <header><p className="text-xs font-semibold uppercase tracking-wider text-[#fd5000]">Trust & safety</p><h1 className="mt-1 text-2xl font-semibold text-[var(--color-text-primary)]">Moderation queue</h1></header>
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"><h2 className="font-semibold text-[var(--color-text-primary)]">Unified reports</h2><div className="mt-4 space-y-3">{reports.length ? reports.map((report) => <div key={`${report.source}:${report.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] p-3"><div><p className="text-sm text-[var(--color-text-primary)]">{report.reason ?? "Content report"}</p><p className="text-xs text-[var(--color-text-muted)]">{report.source} · {report.status ?? "pending"}</p></div><button type="button" onClick={() => resolve(report)} className="rounded-md bg-[#fd5000] px-3 py-1.5 text-xs font-semibold text-white">Resolve</button></div>) : <p className="text-sm text-[var(--color-text-muted)]">No open reports.</p>}</div></section>
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"><h2 className="font-semibold text-[var(--color-text-primary)]">Suspended users</h2><div className="mt-3 space-y-2">{suspended.length ? suspended.map((user) => <p key={user.id} className="text-sm text-[var(--color-text-secondary)]">{user.full_name || user.email || user.id}</p>) : <p className="text-sm text-[var(--color-text-muted)]">No suspended users found.</p>}</div></section>
  </div>;
}
