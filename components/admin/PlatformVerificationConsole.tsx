"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Grant = {
  id: string;
  entity_type: string;
  entity_id: string;
  category: string;
  status: string;
  reason: string | null;
  decided_at: string | null;
  expires_at: string | null;
  updated_at: string;
};

const STATUSES = [
  "all",
  "pending",
  "under_review",
  "verified",
  "rejected",
  "suspended",
  "revoked",
] as const;

const ACTIONS: { id: string; label: string; needsReason: boolean }[] = [
  { id: "approve", label: "Approve", needsReason: false },
  { id: "request_info", label: "Request info", needsReason: false },
  { id: "reject", label: "Reject", needsReason: true },
  { id: "suspend", label: "Suspend", needsReason: true },
  { id: "revoke", label: "Revoke", needsReason: true },
  { id: "renew", label: "Renew", needsReason: false },
];

export function PlatformVerificationConsole() {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("pending");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Grant | null>(null);
  const [evidence, setEvidence] = useState<{ id: string; kind: string; storage_path: string }[]>([]);
  const [audit, setAudit] = useState<{ id: string; action: string; note: string | null; created_at: string }[]>([]);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [migrationMissing, setMigrationMissing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status, limit: "50" });
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/admin/platform-verification?${params}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (res.status === 503 || json.code === "MIGRATION_REQUIRED") {
        setMigrationMissing(true);
        setGrants([]);
        return;
      }
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setMigrationMissing(false);
      setGrants(json.grants ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load grants");
    } finally {
      setLoading(false);
    }
  }, [status, q]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load verification grants on filter change
    void load();
  }, [load]);

  const openGrant = async (grant: Grant) => {
    setSelected(grant);
    setReason("");
    const res = await fetch(`/api/admin/platform-verification/${grant.id}`, { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error || "Could not load grant detail");
      return;
    }
    setEvidence(json.evidence ?? []);
    setAudit(json.audit ?? []);
  };

  const runAction = async (action: string, needsReason: boolean) => {
    if (!selected) return;
    if (needsReason && reason.trim().length < 8) {
      toast.error("Enter a reason of at least 8 characters.");
      return;
    }
    if (
      !window.confirm(
        `Confirm ${action} for ${selected.entity_type} ${selected.entity_id.slice(0, 8)}…? This updates live badge sources.`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/platform-verification/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason, confirm: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Action failed");
      toast.success(`Verification ${action} recorded.`);
      setSelected(json.grant ?? null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  if (migrationMissing) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-900">
        Platform verification tables are not applied yet. Review{" "}
        <code className="rounded bg-white px-1">supabase/migrations/20261107040000_platform_verification_grants.sql</code>{" "}
        and apply only after owner approval.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 block h-9 rounded-lg border border-[var(--color-border)] bg-white px-2 text-[13px]"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[220px] flex-1">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Entity / grant UUID
          </label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by UUID"
            className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 text-[13px]"
          />
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="h-9 rounded-lg bg-[var(--color-accent)] px-3 text-[13px] font-semibold text-white"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-white">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-[var(--color-text-muted)]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : grants.length === 0 ? (
            <p className="px-4 py-10 text-center text-[13px] text-[var(--color-text-muted)]">
              No verification grants for this filter.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {grants.map((g) => (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => void openGrant(g)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-[var(--color-surface-secondary)]",
                      selected?.id === g.id && "bg-orange-50",
                    )}
                  >
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#1D9BF0]" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-[var(--color-text-primary)]">
                        {g.category} · {g.entity_type}
                      </span>
                      <span className="block truncate font-mono text-[11px] text-[var(--color-text-muted)]">
                        {g.entity_id}
                      </span>
                    </span>
                    <span className="rounded-full bg-[var(--color-surface-secondary)] px-2 py-0.5 text-[11px] font-semibold capitalize">
                      {g.status}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-white p-4">
          {!selected ? (
            <p className="py-10 text-center text-[13px] text-[var(--color-text-muted)]">
              Select a grant to inspect evidence and take action.
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                  Selected grant
                </p>
                <p className="mt-1 text-[15px] font-bold capitalize text-[var(--color-text-primary)]">
                  {selected.status} · {selected.category}
                </p>
                <p className="font-mono text-[11px] text-[var(--color-text-muted)]">{selected.id}</p>
              </div>

              <div>
                <p className="text-[12px] font-semibold text-[var(--color-text-primary)]">Private evidence</p>
                {evidence.length === 0 ? (
                  <p className="mt-1 text-[12.5px] text-[var(--color-text-muted)]">No evidence rows.</p>
                ) : (
                  <ul className="mt-1 space-y-1 text-[12px]">
                    {evidence.map((e) => (
                      <li key={e.id} className="rounded-lg bg-[var(--color-surface-secondary)] px-2 py-1.5 font-mono">
                        {e.kind}: {e.storage_path}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="text-[12px] font-semibold text-[var(--color-text-primary)]">Audit</p>
                {audit.length === 0 ? (
                  <p className="mt-1 text-[12.5px] text-[var(--color-text-muted)]">No audit entries.</p>
                ) : (
                  <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto text-[12px]">
                    {audit.map((a) => (
                      <li key={a.id} className="border-b border-[var(--color-border)] py-1 last:border-0">
                        <span className="font-semibold">{a.action}</span>
                        {a.note ? ` — ${a.note}` : ""}
                        <span className="block text-[10.5px] text-[var(--color-text-muted)]">
                          {new Date(a.created_at).toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <label className="block text-[12px] font-semibold text-[var(--color-text-primary)]">
                Reason / note
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-[13px] font-normal"
                  placeholder="Required for reject, suspend, revoke"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                {ACTIONS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    disabled={busy}
                    onClick={() => void runAction(a.id, a.needsReason)}
                    className={cn(
                      "h-8 rounded-full px-3 text-[12px] font-semibold disabled:opacity-50",
                      a.id === "approve"
                        ? "bg-[#1D9BF0] text-white"
                        : a.needsReason
                          ? "bg-[#111827] text-white"
                          : "border border-[var(--color-border)] text-[var(--color-text-primary)]",
                    )}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
