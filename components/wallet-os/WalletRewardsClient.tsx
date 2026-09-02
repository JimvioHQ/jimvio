"use client";

import { Award, Gift, Sparkles, Trophy } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  WalletButton,
  WalletCard,
  WalletEmptyState,
  WalletErrorState,
  WalletLoading,
  WalletPill,
  WalletProgressBar,
  WalletSectionHeading,
  statusTone,
  useWalletFetch,
} from "./wallet-ui";

interface RewardRecord {
  id: string;
  title: string;
  points?: number;
  amount?: number;
  currency?: string;
  status: string;
  createdAt: string;
}

interface RedeemableReward {
  id: string;
  title: string;
  description?: string;
  cost: number;
}

interface WalletRewardsResponse {
  currency?: string;
  pointsBalance?: number;
  pointsToNextTier?: number;
  tier?: string;
  totalRewardsValue?: number;
  history?: RewardRecord[];
  redeemable?: RedeemableReward[];
}

export function WalletRewardsClient() {
  const { status, data, error, retry } = useWalletFetch<WalletRewardsResponse>("/api/wallet/os/rewards");
  const currency = data?.currency || "USD";
  const history = data?.history ?? [];
  const redeemable = data?.redeemable ?? [];
  const pointsBalance = data?.pointsBalance ?? 0;
  const pointsToNextTier = data?.pointsToNextTier ?? 0;
  const progressPct = pointsToNextTier > 0 ? (pointsBalance / (pointsBalance + pointsToNextTier)) * 100 : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pt-8">
      <WalletSectionHeading
        eyebrow="Jimvio Wallet"
        title="Rewards"
        description="Points, bonuses, and perks earned from activity across Jimvio."
        className="mb-6"
      />

      {status === "loading" && <WalletLoading label="Loading rewards…" />}
      {status === "error" && (
        <WalletErrorState message={error || "The rewards endpoint isn't available yet."} onRetry={retry} />
      )}

      {(status === "ready" || status === "empty") && (
        <div className="space-y-6">
          <WalletCard tone="ink" className="relative overflow-hidden p-6">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(255,90,31,0.35),transparent_70%)] blur-2xl"
            />
            <div className="relative flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
                  <Trophy className="h-3.5 w-3.5" />
                  {data?.tier || "Rewards balance"}
                </p>
                <p className="mt-2 font-[var(--font-wallet-os-serif)] text-[38px] font-medium italic tracking-tight text-white">
                  {pointsBalance.toLocaleString()} pts
                </p>
                {typeof data?.totalRewardsValue === "number" && (
                  <p className="mt-1 text-[13px] text-white/50">
                    ≈ {formatCurrency(data.totalRewardsValue, currency)} in redeemable value
                  </p>
                )}
              </div>
              {pointsToNextTier > 0 && (
                <div className="w-full max-w-[220px] sm:w-[220px]">
                  <p className="mb-1.5 text-[11px] text-white/45">{pointsToNextTier.toLocaleString()} pts to next tier</p>
                  <WalletProgressBar value={progressPct} className="bg-white/10" />
                </div>
              )}
            </div>
          </WalletCard>

          {status === "empty" && (
            <WalletEmptyState
              icon={<Gift className="h-6 w-6" />}
              title="No rewards yet"
              description="Complete campaigns, refer creators, and stay active to start earning rewards."
            />
          )}

          {redeemable.length > 0 && (
            <div>
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9B968D]">Redeem</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {redeemable.map((r) => (
                  <WalletCard key={r.id} className="flex flex-col gap-2 p-4">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-[#FFF1EA] text-[#D6480F]">
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <p className="text-[13.5px] font-semibold text-[#121113]">{r.title}</p>
                    {r.description && <p className="text-[11.5px] text-[#8B8579]">{r.description}</p>}
                    <WalletButton
                      variant="outline"
                      size="sm"
                      className="mt-1"
                      disabled={pointsBalance < r.cost}
                    >
                      Redeem · {r.cost.toLocaleString()} pts
                    </WalletButton>
                  </WalletCard>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9B968D]">History</p>
            {history.length === 0 ? (
              <WalletEmptyState icon={<Award className="h-6 w-6" />} title="No reward activity yet" />
            ) : (
              <div className="space-y-2">
                {history.map((h) => (
                  <WalletCard key={h.id} className="flex items-center justify-between gap-3 p-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-[#121113]">{h.title}</p>
                      <p className="text-[11px] text-[#9B968D]">
                        {new Date(h.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <WalletPill tone={statusTone(h.status)}>{h.status}</WalletPill>
                      <span className="text-[13px] font-semibold text-[#1C8A44]">
                        {typeof h.points === "number" ? `+${h.points.toLocaleString()} pts` : formatCurrency(h.amount ?? 0, h.currency || currency)}
                      </span>
                    </div>
                  </WalletCard>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
