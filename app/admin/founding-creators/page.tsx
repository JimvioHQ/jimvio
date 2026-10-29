"use client";

import { useCallback, useEffect, useState } from "react";
import { Crown, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CONTRIBUTIONS, FOUNDING_SEATS } from "@/lib/founding/program";
import type { ActivitySignals } from "@/lib/founding/signals";

type Application = {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  avatar: string | null;
  contributions: string[];
  note: string;
  links: string[];
  status: "pending" | "approved" | "declined";
  decision_note: string | null;
  created_at: string;
  signals: ActivitySignals;
};

const LABEL = Object.fromEntries(CONTRIBUTIONS.map((c) => [c.id, c.label]));

function Signal({ label, value }: { label: string; value: string | number }) {
  const empty = value === 0 || value === "No";
  return (
    <div className={`rounded-xl border px-3 py-2 ${empty ? "border-[var(--color-border)]" : "border-emerald-200 bg-emerald-50/60"}`}>
      <p className="text-[11px] text-[var(--color-text-muted)]">{label}</p>
      <p className={`text-[14px] font-bold ${empty ? "text-[var(--color-text-muted)]" : "text-[var(--color-text-primary)]"}`}>{value}</p>
    </div>
  );
}

export default function AdminFoundingCreatorsPage() {
  const [status, setStatus] = useState<"pending" | "approved" | "declined">("pending");
  const [items, setItems] = useState<Application[]>([]);
  const [seatsTaken, setSeatsTaken] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/founding-creators?status=${status}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not load applications");
      setItems(json.applications ?? []);
      setSeatsTaken(json.seatsTaken ?? 0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load applications");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(id: string, decision: "approve" | "decline") {
    if (decision === "decline" && (reasons[id] ?? "").trim().length < 5) {
      toast.error("Write a short reason for the applicant first.");
      return;
    }
    setBusy(id);
    try {
      const res = await fetch("/api/admin/founding-creators", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, decision, note: reasons[id] }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast.success(decision === "approve" ? `Approved — seat #${String(json.seat).padStart(3, "0")}` : "Declined");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#fd5000]">Programs</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-[var(--color-text-primary)]">
            <Crown className="h-6 w-6 text-amber-500" /> Founding Creators
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Review each applicant&apos;s real activity, then approve (next seat number) or decline with a reason.
          </p>
        </div>
        <p className="rounded-full bg-[var(--color-surface-secondary)] px-3 py-1.5 text-sm font-semibold">
          {seatsTaken} / {FOUNDING_SEATS} seats given
        </p>
      </header>

      <div className="flex gap-2">
        {(["pending", "approved", "declined"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize ${
              status === s ? "bg-[#fd5000] text-white" : "border border-[var(--color-border)] text-[var(--color-text-secondary)]"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--color-border)] px-6 py-12 text-center text-sm text-[var(--color-text-muted)]">
          No {status} applications.
        </p>
      ) : (
        <ul className="space-y-4">
          {items.map((a) => (
            <li key={a.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {a.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.avatar} alt="" className="h-11 w-11 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fd5000]/10 font-bold text-[#fd5000]">
                      {a.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div>
                    <p className="font-bold text-[var(--color-text-primary)]">{a.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {a.email ?? "—"} · applied {new Date(a.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {a.contributions.map((c) => (
                    <span key={c} className="rounded-full bg-[#fd5000]/10 px-2.5 py-1 text-[11px] font-semibold text-[#fd5000]">
                      {LABEL[c] ?? c}
                    </span>
                  ))}
                </div>
              </div>

              <p className="mt-4 whitespace-pre-wrap rounded-xl bg-[var(--color-surface-secondary)] p-3 text-sm text-[var(--color-text-secondary)]">
                {a.note}
              </p>
              {a.links.length ? (
                <ul className="mt-2 flex flex-wrap gap-3">
                  {a.links.map((l) => (
                    <li key={l}>
                      <a href={l} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-xs font-semibold text-[#fd5000] hover:underline">
                        {l.replace(/^https?:\/\//, "").slice(0, 40)} <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}

              <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Activity on Jimvio</p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Signal
                  label="Member since"
                  value={a.signals.memberSince ? new Date(a.signals.memberSince).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "—"}
                />
                <Signal label="Communities" value={a.signals.communities} />
                <Signal label="Creator profile" value={a.signals.creatorProfile ? "Yes" : "No"} />
                <Signal label="Live products" value={a.signals.liveProducts} />
                <Signal label="Posts" value={a.signals.posts} />
                <Signal label="UGC submissions" value={a.signals.ugcSubmissions} />
                <Signal label="Affiliate links" value={a.signals.affiliateLinks} />
                <Signal label="Feedback sent" value={a.signals.feedback} />
              </div>

              {a.status === "pending" ? (
                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    disabled={busy === a.id}
                    onClick={() => void decide(a.id, "approve")}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {busy === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />} Approve
                  </button>
                  <input
                    value={reasons[a.id] ?? ""}
                    onChange={(e) => setReasons((r) => ({ ...r, [a.id]: e.target.value }))}
                    placeholder="Reason if declining (sent to the applicant)"
                    className="h-10 flex-1 rounded-xl border border-[var(--color-border)] px-3 text-sm"
                  />
                  <button
                    type="button"
                    disabled={busy === a.id}
                    onClick={() => void decide(a.id, "decline")}
                    className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:border-red-300 hover:text-red-600 disabled:opacity-60"
                  >
                    Decline
                  </button>
                </div>
              ) : a.decision_note ? (
                <p className="mt-4 text-sm text-[var(--color-text-muted)]">Reason given: {a.decision_note}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
