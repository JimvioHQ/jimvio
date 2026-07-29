"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Download, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ugc/campaign-detail/campaign-detail-ui";
import { UGCPageError, UGCPageLoading, UGCPageShell } from "@/components/ugc/workspace/UGCPageShell";

type PayoutItem = {
  payoutId: string;
  submissionId: string;
  influencerId: string;
  influencerName: string;
  avatarUrl: string | null;
  amount: number;
  status: "pending" | "processing" | "paid";
  createdAt: string | null;
  paidAt: string | null;
};

export default function CampaignPaymentsPage() {
  const { id } = useParams<{ id: string }>();
  const campaignId = String(id ?? "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ pending: number; processing: number; paid: number; totalAmount: number } | null>(null);
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);

  const load = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ugc/brand/campaigns/${campaignId}/payouts`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Failed to load payment history");
      setSummary(json.summary ?? null);
      setPayouts((json.payouts ?? []) as PayoutItem[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load payment history");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <UGCPageShell title="Payment History" subtitle="Loading payout ledger…">
        <UGCPageLoading />
      </UGCPageShell>
    );
  }

  if (error || !summary) {
    return <UGCPageError message={error ?? "Payment history unavailable"} onRetry={() => void load()} />;
  }

  return (
    <UGCPageShell
      title="Payment History"
      subtitle="Payout lifecycle for approved submissions: Pending → Processing → Paid."
      actions={
        <Button asChild size="sm" variant="outline" className="rounded-xl">
          <Link href="/ugc/campaign-center">Back to Campaign Center</Link>
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[16px] border border-[#EEF0F2] bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#9CA3AF]">Pending</p>
              <Pill tone="warning">Pending</Pill>
            </div>
            <p className="mt-2 text-[18px] font-bold text-[#111827] tabular-nums">{summary.pending}</p>
          </div>
          <div className="rounded-[16px] border border-[#EEF0F2] bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#9CA3AF]">Processing</p>
              <Pill tone="info">Processing</Pill>
            </div>
            <p className="mt-2 text-[18px] font-bold text-[#111827] tabular-nums">{summary.processing}</p>
          </div>
          <div className="rounded-[16px] border border-[#EEF0F2] bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#9CA3AF]">Paid</p>
              <Pill tone="success">Paid</Pill>
            </div>
            <p className="mt-2 text-[18px] font-bold text-[#111827] tabular-nums">{summary.paid}</p>
          </div>
        </div>

        <div className="rounded-[16px] border border-[#EEF0F2] bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-[#FF5A1F]" />
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#9CA3AF]">Total Amount</p>
              </div>
              <p className="mt-2 text-[22px] font-bold text-[#111827] tabular-nums">
                {summary.totalAmount.toLocaleString()}{" "}
                <span className="text-[12px] font-semibold text-[#6B7280]">RWF</span>
              </p>
            </div>

            <Button size="sm" variant="outline" className="rounded-xl" disabled>
              <Download className="mr-2 h-4 w-4" />
              Export (coming soon)
            </Button>
          </div>
        </div>

        {payouts.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-[#E5E7EB] bg-white p-10 text-center">
            <p className="text-[14px] font-semibold text-[#111827]">No payouts yet</p>
            <p className="mt-1 text-[13px] text-[#6B7280]">Approve submissions to trigger payouts.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[16px] border border-[#EEF0F2] bg-white">
            <table className="w-full text-left">
              <thead className="bg-[#F9FAFB] text-[11px] uppercase tracking-wide text-[#9CA3AF]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Creator</th>
                  <th className="px-4 py-3 font-semibold">Submission</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Dates</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.payoutId} className="border-t border-[#F3F4F6]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl overflow-hidden bg-[#F3F4F6] grid place-items-center border border-[#E5E7EB]">
                          {p.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-[12px] font-bold text-[#374151]">{p.influencerName.slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold text-[#111827]">{p.influencerName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-[#374151]">{p.submissionId.slice(0, 8)}…</td>
                    <td className="px-4 py-3">
                      <Pill
                        tone={
                          p.status === "paid" ? "success" : p.status === "processing" ? "info" : "warning"
                        }
                      >
                        {p.status}
                      </Pill>
                    </td>
                    <td className="px-4 py-3 font-bold text-[13px] tabular-nums text-[#111827]">
                      {p.amount.toLocaleString()} RWF
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#6B7280]">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—"}
                      {p.paidAt ? ` → ${new Date(p.paidAt).toLocaleDateString()}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </UGCPageShell>
  );
}

