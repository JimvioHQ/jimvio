"use client";

import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Lock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { EscrowSnapshot } from "@/lib/wallet-os/types";
import {
  WalletButton,
  WalletCard,
  WalletEmptyState,
  WalletErrorState,
  WalletLoading,
  WalletSectionHeading,
  WalletStat,
  useWalletFetch,
} from "./wallet-ui";

type EscrowApiResponse = {
  escrow?: EscrowSnapshot;
};

export function WalletEscrowClient() {
  const { status, data, error, retry } = useWalletFetch<EscrowApiResponse>("/api/wallet/os/escrow", {
    isEmpty: (json) => !json?.escrow || ((json.escrow.campaigns?.length ?? 0) === 0 && json.escrow.totalEscrow === 0),
  });

  const snapshot = data?.escrow;
  const currency = snapshot?.currency || "USD";
  const campaigns = snapshot?.campaigns ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pt-8">
      <WalletSectionHeading
        eyebrow="Jimvio Wallet"
        title="Reserved funds"
        description="Funds held for in-progress Marketplace orders and campaigns until they are released or returned."
        action={
          <Link href="/wallet/transactions">
            <WalletButton variant="outline" size="md">
              View transactions
              <ArrowUpRight className="h-4 w-4" />
            </WalletButton>
          </Link>
        }
        className="mb-6"
      />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <WalletStat
          label="Total reserved"
          value={formatCurrency(snapshot?.totalEscrow ?? 0, currency)}
          icon={<Lock className="h-3.5 w-3.5" />}
        />
        <WalletStat
          label="Wallet hold"
          value={formatCurrency(snapshot?.walletEscrowBalance ?? 0, currency)}
        />
        <WalletStat
          label="Campaign holds"
          value={formatCurrency(snapshot?.ugcEscrowHeld ?? 0, currency)}
          tone="warning"
        />
      </div>

      {status === "loading" && <WalletLoading label="Loading reserved funds…" />}
      {status === "error" && (
        <WalletErrorState message={error || "Could not load reserved funds."} onRetry={retry} />
      )}
      {(status === "empty" || (status === "ready" && campaigns.length === 0 && (snapshot?.totalEscrow ?? 0) === 0)) && (
        <WalletEmptyState
          icon={<Lock className="h-6 w-6" />}
          title="No reserved funds"
          description="When money is held for an order or campaign, it will appear here until it is released."
        />
      )}

      {status === "ready" && campaigns.length > 0 && (
        <WalletCard className="p-5 sm:p-6">
          <ol className="relative space-y-5 border-l border-black/[0.08] pl-6">
            {campaigns.map((campaign) => (
              <li key={campaign.campaignId} className="relative">
                <span className="absolute -left-[31px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#FFF1EA] text-[#D6480F]">
                  <Lock className="h-3 w-3" />
                </span>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[14px] font-semibold text-[#121113]">{campaign.title}</p>
                    <p className="mt-0.5 text-[12px] text-[#8B8579]">
                      {campaign.status} · {campaign.depositedAt ? new Date(campaign.depositedAt).toLocaleString() : "—"}
                    </p>
                  </div>
                  <p className="text-[14px] font-semibold text-[#121113]">
                    {formatCurrency(campaign.amount, campaign.currency || currency)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </WalletCard>
      )}

      {status === "ready" && campaigns.length === 0 && (snapshot?.walletEscrowBalance ?? 0) > 0 && (
        <WalletCard className="flex items-start gap-3 p-5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="text-[14px] font-semibold text-[#121113]">Wallet hold active</p>
            <p className="mt-1 text-[13px] text-[#6B7280]">
              {formatCurrency(snapshot?.walletEscrowBalance ?? 0, currency)} is currently reserved on your wallet.
            </p>
          </div>
        </WalletCard>
      )}

      {status === "ready" && (snapshot?.totalEscrow ?? 0) > 0 && (
        <p className="mt-4 text-[12px] text-[#8B8579]">
          Reserved amounts are separate from your Total balance until released.
        </p>
      )}
    </div>
  );
}
