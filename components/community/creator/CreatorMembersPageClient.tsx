"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { normalizeMemberRows, type MemberRow } from "@/lib/creator-member-rows";

export type { MemberRow } from "@/lib/creator-member-rows";
export { normalizeMemberRows } from "@/lib/creator-member-rows";

const TABS = ["All", "Free", "Monthly", "Yearly", "Lifetime", "Banned"] as const;

export function CreatorMembersPageClient({
  communityId,
  initialRows,
}: {
  communityId: string;
  initialRows: MemberRow[];
}) {
  const [rows, setRows] = useState<MemberRow[]>(initialRows);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const email = r.profiles?.email || "";
      const name = r.profiles?.full_name || r.profiles?.username || "";
      if (q.trim()) {
        const qq = q.toLowerCase();
        if (!name.toLowerCase().includes(qq) && !email.toLowerCase().includes(qq)) return false;
      }
      const plan = (r.plan_type || "free").toLowerCase();
      const st = (r.status || "").toLowerCase();
      if (tab === "Banned") return st === "banned";
      if (tab === "Free") return plan === "free";
      if (tab === "Monthly") return plan === "monthly";
      if (tab === "Yearly") return plan === "yearly";
      if (tab === "Lifetime") return plan === "lifetime";
      return true;
    });
  }, [rows, q, tab]);

  async function refresh() {
    const supabase = createClient();
    const { data } = await supabase
      .from("community_memberships")
      .select("id, user_id, plan_type, status, created_at, amount_paid, profiles(email, full_name, avatar_url, username)")
      .eq("community_id", communityId);
    setRows(normalizeMemberRows(data ?? []));
  }

  async function banMember(id: string) {
    if (!confirm("Ban this member?")) return;
    setBusy(id);
    try {
      const supabase = createClient();
      await supabase.from("community_memberships").update({ status: "banned" }).eq("id", id);
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  async function setPlan(id: string, plan: string) {
    setBusy(id);
    try {
      const supabase = createClient();
      await supabase.from("community_memberships").update({ plan_type: plan }).eq("id", id);
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  function exportCsv() {
    const header = ["Name", "Email", "Plan", "Status", "Joined", "Amount paid"];
    const lines = [header.join(",")];
    for (const r of filtered) {
      lines.push(
        [
          `"${(r.profiles?.full_name || r.profiles?.username || "").replace(/"/g, '—')}"`,
          `"${(r.profiles?.email || "").replace(/"/g, '—')}"`,
          r.plan_type,
          r.status,
          r.created_at || "",
          r.amount_paid ?? "",
        ].join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `members-${communityId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black text-[var(--color-text-primary)]">Members</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Manage access and plans.</p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total", value: rows.length },
          { label: "Active (7d est.)", value: rows.filter((r) => r.status === "active").length },
          { label: "Paid", value: rows.filter((r) => r.plan_type && r.plan_type !== "free").length },
          { label: "Free", value: rows.filter((r) => !r.plan_type || r.plan_type === "free").length },
        ].map((s) => (
          <div key={s.label} className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className="text-[10px] font-black uppercase text-[var(--color-text-muted)]">{s.label}</p>
            <p className="text-2xl font-black text-[var(--color-text-primary)]">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "px-3 py-1.5 rounded-sm text-xs font-black",
                tab === t ? "bg-[var(--color-accent-light)] text-[var(--color-accent)]" : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]"
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Input placeholder="Search name or email…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs rounded-sm border-[var(--color-border)]" />
          <Button type="button" variant="outline" className="rounded-sm border-[var(--color-border)] font-bold" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="rounded-sm border border-[var(--color-border)] overflow-x-auto bg-[var(--color-surface)]">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/60 text-left text-[10px] font-black uppercase text-[var(--color-text-muted)]">
              <th className="py-3 px-3">Member</th>
              <th className="py-3 px-3">Plan</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Joined</th>
              <th className="py-3 px-3">Paid</th>
              <th className="py-3 px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-[var(--color-border)] last:border-0">
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-sm overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                      {r.profiles?.avatar_url ? (
                        <Image src={r.profiles.avatar_url} alt="" width={36} height={36} className="object-cover h-full w-full" unoptimized />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-[10px] font-black text-[var(--color-accent)]">
                          {(r.profiles?.full_name || r.profiles?.username || "?")[0]}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold truncate">{r.profiles?.full_name || r.profiles?.username || ""}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)] truncate">{r.profiles?.email || ""}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 font-semibold">{r.plan_type || "free"}</td>
                <td className="py-3 px-3">
                  <span className="text-xs font-black px-2 py-0.5 rounded-sm bg-[var(--color-surface-secondary)]">{r.status}</span>
                </td>
                <td className="py-3 px-3 text-xs text-[var(--color-text-muted)]">{r.created_at ? new Date(r.created_at).toLocaleDateString() : ""}</td>
                <td className="py-3 px-3 text-xs">{r.amount_paid != null ? Number(r.amount_paid).toFixed(2) : ""}</td>
                <td className="py-3 px-3">
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-sm border-[var(--color-danger)] text-[var(--color-danger)] text-[10px] h-7"
                      disabled={busy === r.id}
                      onClick={() => banMember(r.id)}
                    >
                      Ban
                    </Button>
                    <select
                      className="text-[10px] rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-1 py-0.5"
                      value={r.plan_type || "free"}
                      onChange={(e) => setPlan(r.id, e.target.value)}
                      disabled={busy === r.id}
                    >
                      <option value="free">free</option>
                      <option value="monthly">monthly</option>
                      <option value="yearly">yearly</option>
                      <option value="lifetime">lifetime</option>
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center text-sm text-[var(--color-text-muted)] py-10">No members match.</p>}
      </div>
    </div>
  );
}

