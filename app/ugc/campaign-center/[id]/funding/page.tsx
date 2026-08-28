"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Calendar, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ugc/campaign-detail/campaign-detail-ui";
import { UGCPageError, UGCPageLoading, UGCPageShell } from "@/components/ugc/workspace/UGCPageShell";

type EscrowRow = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  paymentMethod: string | null;
  paymentRef: string | null;
  depositedAt: string | null;
  releasedAt: string | null;
};

export default function CampaignFundingPage() {
  const { id } = useParams<{ id: string }>();
  const campaignId = String(id ?? "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [escrow, setEscrow] = useState<EscrowRow[]>([]);

  const load = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ugc/brand/campaigns/${campaignId}/escrow`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Failed to load funding history");
      setEscrow((json.escrow ?? []) as EscrowRow[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load funding history");
      setError(e instanceof Error ? e.message : "Failed to load funding history");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <UGCPageShell titleKey="fundingHistory" subtitle="Loading escrow ledger…">
        <UGCPageLoading />
      </UGCPageShell>
    );
  }

  if (error) {
    return <UGCPageError message={error} onRetry={() => void load()} />;
  }

  return (
    <UGCPageShell
      titleKey="fundingHistory"
      subtitle="Escrow deposits associated with your campaigns."
      actions={
        <Button asChild size="sm" variant="outline" className="rounded-xl">
          <Link href="/ugc/campaign-center">Back to Campaign Center</Link>
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="rounded-[16px] border border-[#EEF0F2] bg-white p-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-[#FF5A1F]" />
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#9CA3AF]">Escrow</p>
          </div>
          <p className="mt-2 text-[13px] text-[#6B7280]">
            Deposits are held until campaign activation and payout processing.
          </p>
        </div>

        {escrow.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-[#E5E7EB] bg-white p-10 text-center">
            <p className="text-[14px] font-semibold text-[#111827]">No escrow records</p>
            <p className="mt-1 text-[13px] text-[#6B7280]">Fund the campaign to create an escrow deposit.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {escrow.map((e) => (
              <div key={e.id} className="rounded-[16px] border border-[#EEF0F2] bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[12px] font-bold uppercase tracking-wide text-[#9CA3AF]">Deposit</p>
                    <p className="mt-1 text-[18px] font-bold text-[#111827] tabular-nums">
                      {e.amount.toLocaleString()} <span className="text-[12px] text-[#6B7280]">{e.currency}</span>
                    </p>
                  </div>
                  <Pill tone={e.status === "released" ? "success" : "warning"}>{e.status}</Pill>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-[#EEF0F2] bg-[#FAFAFA] p-3">
                    <div className="flex items-center gap-2 text-[12px] font-semibold text-[#374151]">
                      <Calendar className="h-4 w-4 text-[#FF5A1F]" />
                      Deposited at
                    </div>
                    <p className="mt-2 text-[13px] text-[#6B7280]">
                      {e.depositedAt ? new Date(e.depositedAt).toLocaleString() : "—"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#EEF0F2] bg-[#FAFAFA] p-3">
                    <div className="flex items-center gap-2 text-[12px] font-semibold text-[#374151]">
                      <Calendar className="h-4 w-4 text-[#FF5A1F]" />
                      Released at
                    </div>
                    <p className="mt-2 text-[13px] text-[#6B7280]">
                      {e.releasedAt ? new Date(e.releasedAt).toLocaleString() : "—"}
                    </p>
                  </div>
                </div>

                {(e.paymentRef ?? e.paymentMethod) ? (
                  <div className="mt-3 text-[12px] text-[#6B7280]">
                    Ref: <span className="font-semibold">{e.paymentRef ?? "—"}</span> · Method:{" "}
                    <span className="font-semibold">{e.paymentMethod ?? "—"}</span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </UGCPageShell>
  );
}

