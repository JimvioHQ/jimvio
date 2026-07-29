"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import {
  AffiliateEmptyState,
  AffiliateMetricTile,
  AffiliatePageShell,
} from "./AffiliatePageShell";
import {
  AFFILIATE_BTN_PRIMARY,
  AFFILIATE_BTN_SECONDARY,
  formatAffiliateMoney,
} from "./sections/shared";
import { cn } from "@/lib/utils";

type LedgerRow = {
  id: string;
  entry_type: string;
  amount: number;
  note?: string | null;
  created_at: string;
  commission_id?: string | null;
};

type Bundle = {
  balances?: {
    pending: number;
    available: number;
    paid: number;
    total?: number;
  };
  ledger?: LedgerRow[];
  analytics?: {
    balances?: { pending: number; available: number; paid: number };
  };
};

function statusFromEntry(type: string): "pending" | "approved" | "paid" | "other" {
  const t = type.toLowerCase();
  if (t.includes("pending")) return "pending";
  if (t.includes("approve") || t.includes("available")) return "approved";
  if (t.includes("paid") || t.includes("payout") || t.includes("withdraw")) return "paid";
  return "other";
}

export function AffiliatePayoutsClient() {
  const [data, setData] = useState<Bundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "paid">("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/affiliates/dashboard?days=90", { cache: "no-store" });
      if (res.status === 401 || res.status === 403) {
        setError(res.status === 401 ? "Sign in required" : "Activate affiliate access");
        return;
      }
      if (!res.ok) throw new Error("fail");
      setData(await res.json());
    } catch {
      setError("Could not load payouts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    const list = data?.ledger ?? [];
    if (filter === "all") return list;
    return list.filter((r) => statusFromEntry(r.entry_type) === filter);
  }, [data?.ledger, filter]);

  const exportCsv = () => {
    const header = ["date", "type", "amount", "note"];
    const lines = [
      header.join(","),
      ...rows.map((r) =>
        [
          r.created_at,
          r.entry_type,
          Number(r.amount ?? 0),
          JSON.stringify(r.note ?? ""),
        ].join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jimvio-affiliate-payouts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pending = Number(data?.balances?.pending ?? data?.analytics?.balances?.pending ?? 0);
  const available = Number(data?.balances?.available ?? data?.analytics?.balances?.available ?? 0);
  const paid = Number(data?.balances?.paid ?? data?.analytics?.balances?.paid ?? 0);

  return (
    <AffiliatePageShell
      title="Payouts"
      subtitle="Pending, approved, and paid commissions with exportable payment history."
      actions={
        <button
          type="button"
          onClick={exportCsv}
          disabled={!rows.length}
          className={cn(AFFILIATE_BTN_PRIMARY, "h-10 px-3.5 text-[12.5px] disabled:opacity-50")}
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      }
    >
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-[16px] bg-[#F3F4F6]" />
          ))}
        </div>
      ) : null}

      {!loading && error ? (
        <AffiliateEmptyState
          title="Payouts unavailable"
          description={error}
          actionHref={
            error.includes("Activate")
              ? "/dashboard/activate/affiliate"
              : "/login?next=/affiliates/payouts"
          }
          actionLabel={error.includes("Activate") ? "Activate" : "Sign in"}
        />
      ) : null}

      {!loading && !error && data ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <AffiliateMetricTile label="Pending" value={formatAffiliateMoney(pending, "USD")} />
            <AffiliateMetricTile
              label="Approved / available"
              value={formatAffiliateMoney(available, "USD")}
              accent
            />
            <AffiliateMetricTile label="Paid" value={formatAffiliateMoney(paid, "USD")} />
          </div>

          <div className="flex flex-wrap gap-2">
            {(["all", "pending", "approved", "paid"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "h-9 rounded-[10px] px-3 text-[12px] font-semibold capitalize",
                  filter === f
                    ? "bg-[#111827] text-white"
                    : "border border-[#E5E7EB] bg-white text-[#4B5563]"
                )}
              >
                {f}
              </button>
            ))}
            <a
              href="/dashboard/wallet"
              className={cn(AFFILIATE_BTN_SECONDARY, "h-9 px-3 text-[12px]")}
            >
              Open wallet / invoices
            </a>
          </div>

          <div className="overflow-hidden rounded-[18px] border border-[#E8EAED] bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[13px]">
                <thead className="bg-[#F9FAFB] text-[11px] uppercase tracking-wide text-[#9CA3AF]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Note</th>
                    <th className="px-4 py-3 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-[#6B7280]">
                        No payment history yet.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => {
                      const status = statusFromEntry(r.entry_type);
                      return (
                        <tr key={r.id} className="border-t border-[#F3F4F6]">
                          <td className="whitespace-nowrap px-4 py-3 text-[#6B7280]">
                            {new Date(r.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase",
                                status === "pending" && "bg-amber-50 text-amber-700",
                                status === "approved" && "bg-sky-50 text-sky-700",
                                status === "paid" && "bg-emerald-50 text-emerald-700",
                                status === "other" && "bg-stone-100 text-stone-600"
                              )}
                            >
                              {status}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-[#111827]">
                            {r.entry_type.replace(/_/g, " ")}
                          </td>
                          <td className="max-w-[240px] truncate px-4 py-3 text-[#6B7280]">
                            {r.note || "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums text-[#111827]">
                            {formatAffiliateMoney(Number(r.amount ?? 0), "USD")}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </AffiliatePageShell>
  );
}
