"use client";

import { CalendarClock, PauseCircle, Receipt, XCircle } from "lucide-react";
import { formatMoneyAsUSD } from "@/lib/currency/platform";
import {
  WalletButton,
  WalletCard,
  WalletEmptyState,
  WalletErrorState,
  WalletLoading,
  WalletPill,
  WalletSectionHeading,
  cn,
  statusTone,
  useWalletFetch,
} from "./wallet-ui";

interface SubscriptionRecord {
  id: string;
  name: string;
  plan?: string;
  amount: number;
  currency?: string;
  interval?: "monthly" | "yearly" | "weekly" | string;
  status: string;
  nextBillingDate?: string | null;
}

interface WalletSubscriptionsResponse {
  currency?: string;
  subscriptions?: SubscriptionRecord[];
  monthlyTotal?: number;
}

export function WalletSubscriptionsClient() {
  const { status, data, error, retry } = useWalletFetch<WalletSubscriptionsResponse>("/api/wallet/os/subscriptions");
  const currency = data?.currency || "USD";
  const subscriptions = data?.subscriptions ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pt-8">
      <WalletSectionHeading
        eyebrow="Jimvio Wallet"
        title="Subscriptions"
        description="Recurring charges billed to your Jimvio wallet — plans, boosts, and premium features."
        className="mb-6"
      />

      {typeof data?.monthlyTotal === "number" && (
        <WalletCard className="mb-6 flex items-center justify-between p-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#FFF1EA] text-[#D6480F]">
              <Receipt className="h-4 w-4" />
            </span>
            <p className="text-[13px] text-[#726D64]">Total recurring spend / month</p>
          </div>
          <p className="font-[var(--font-wallet-os-serif)] text-[19px] font-medium text-[#121113]">
            {formatMoneyAsUSD(data.monthlyTotal, currency)}
          </p>
        </WalletCard>
      )}

      {status === "loading" && <WalletLoading label="Loading subscriptions…" />}
      {status === "error" && (
        <WalletErrorState message={error || "The subscriptions endpoint isn't available yet."} onRetry={retry} />
      )}
      {(status === "empty" || (status === "ready" && subscriptions.length === 0)) && (
        <WalletEmptyState
          icon={<CalendarClock className="h-6 w-6" />}
          title="No active subscriptions"
          description="Plans and recurring features you subscribe to on Jimvio will appear here."
        />
      )}

      {status === "ready" && subscriptions.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {subscriptions.map((sub) => (
            <WalletCard key={sub.id} className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[14px] font-semibold text-[#121113]">{sub.name}</p>
                  {sub.plan && <p className="text-[11.5px] text-[#9B968D]">{sub.plan}</p>}
                </div>
                <WalletPill tone={statusTone(sub.status)}>{sub.status}</WalletPill>
              </div>
              <div className="flex items-end justify-between">
                <p className="font-[var(--font-wallet-os-serif)] text-[20px] font-medium text-[#121113]">
                  {formatMoneyAsUSD(sub.amount, sub.currency || currency)}
                  <span className="ml-1 text-[11px] font-sans font-normal text-[#9B968D]">/{sub.interval || "month"}</span>
                </p>
                {sub.nextBillingDate && (
                  <p className="flex items-center gap-1 text-[11px] text-[#9B968D]">
                    <CalendarClock className="h-3 w-3" />
                    {new Date(sub.nextBillingDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </p>
                )}
              </div>
              <div className="flex gap-2 border-t border-black/[0.06] pt-3">
                <WalletButton variant="outline" size="sm" className="flex-1">
                  <PauseCircle className="h-3.5 w-3.5" />
                  Pause
                </WalletButton>
                <WalletButton variant="ghost" size="sm" className={cn("flex-1")}>
                  <XCircle className="h-3.5 w-3.5" />
                  Cancel
                </WalletButton>
              </div>
            </WalletCard>
          ))}
        </div>
      )}
    </div>
  );
}
