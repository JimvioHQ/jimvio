"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import {
  UGCPageEmpty,
  UGCPageError,
  UGCPageLoading,
  UGCPageShell,
  UGCStatusPill,
} from "@/components/ugc/workspace/UGCPageShell";
import { EnterpriseOutlineButton, MetricCard, cardClass } from "./enterprise-ui";
import { useUgcBrandWorkspace } from "@/components/ugc/workspace/UgcBrandWorkspaceProvider";

type LedgerEntry = {
  id: string;
  campaign_id: string;
  entry_type: string;
  amount: number;
  reference?: string | null;
  created_at?: string;
};

type EscrowRow = {
  campaign_id?: string;
  amount?: number;
  status?: string;
  locked_amount?: number;
  released_amount?: number;
  refunded_amount?: number;
  campaign?: { title?: string } | null;
};

export function EscrowDashboardPage() {
  const { ugcFetch } = useUgcBrandWorkspace();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [escrows, setEscrows] = useState<EscrowRow[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [totals, setTotals] = useState({ locked: 0, released: 0, refunded: 0, held: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ugcFetch("/api/ugc/escrow/dashboard", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (res.status === 403) {
        setError("Brand account required for escrow dashboard.");
        return;
      }
      if (!res.ok) throw new Error(json.error ?? "Failed to load escrow");
      setEscrows(json.escrow ?? json.escrows ?? []);
      setLedger(json.ledger ?? []);
      const t = json.totals ?? {};
      setTotals({
        locked: Number(t.locked ?? 0),
        released: Number(t.released ?? 0),
        refunded: Number(t.refunded ?? 0),
        held: Number(t.funded ?? t.held ?? 0),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load escrow");
    } finally {
      setLoading(false);
    }
  }, [ugcFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <UGCPageShell
      titleKey="escrow"
      subtitleKey="escrowSubtitle"
      actions={
        <EnterpriseOutlineButton onClick={() => void load()}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </EnterpriseOutlineButton>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Held" value={totals.held.toLocaleString()} />
        <MetricCard label="Locked" value={totals.locked.toLocaleString()} />
        <MetricCard label="Released" value={totals.released.toLocaleString()} />
        <MetricCard label="Refunded" value={totals.refunded.toLocaleString()} />
      </div>

      {loading ? <UGCPageLoading /> : null}
      {!loading && error ? <UGCPageError message={error} onRetry={load} /> : null}

      {!loading && !error ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-[#111827]">Campaign escrow</h2>
            {escrows.length === 0 ? (
              <UGCPageEmpty title="No escrow records" description="Fund a campaign to create an escrow balance." />
            ) : (
              escrows.map((e, i) => (
                <div key={e.campaign_id ?? i} className={cardClass}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-[#111827]">
                      {e.campaign?.title || e.campaign_id || "Campaign"}
                    </p>
                    {e.status ? <UGCStatusPill status={e.status} /> : null}
                  </div>
                  <p className="mt-2 text-[12px] text-[#6B7280]">
                    Amount {Number(e.amount ?? 0).toLocaleString()} · Locked{" "}
                    {Number(e.locked_amount ?? 0).toLocaleString()} · Released{" "}
                    {Number(e.released_amount ?? 0).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-[#111827]">Ledger</h2>
            {ledger.length === 0 ? (
              <UGCPageEmpty title="No ledger entries" description="Escrow movements will appear here." />
            ) : (
              ledger.slice(0, 40).map((entry) => (
                <div key={entry.id} className={cardClass}>
                  <div className="flex items-center justify-between gap-2">
                    <UGCStatusPill status={entry.entry_type} />
                    <p className="text-sm font-bold text-[#111827]">
                      {Number(entry.amount).toLocaleString()}
                    </p>
                  </div>
                  <p className="mt-1 text-[11px] text-[#6B7280]">
                    {entry.reference || entry.campaign_id}
                    {entry.created_at ? ` · ${new Date(entry.created_at).toLocaleString()}` : ""}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </UGCPageShell>
  );
}
