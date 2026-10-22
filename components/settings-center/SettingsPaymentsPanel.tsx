"use client";

import Link from "next/link";
import { ArrowUpRight, CreditCard, Wallet } from "lucide-react";
import { useSettingsCenter } from "./settings-center-context";
import { SettingsCard, SettingsPageHeader } from "./settings-ui";

const WALLET_LINKS = [
  { href: "/wallet", label: "Wallet overview", description: "Balance, activity, and money movement." },
  { href: "/wallet/payout-methods", label: "Payout methods", description: "Destinations used for withdrawals." },
  { href: "/wallet/withdrawals", label: "Withdrawals", description: "Request and track payouts." },
  { href: "/wallet/deposits", label: "Deposits", description: "Add funds when the wallet supports it." },
  { href: "/wallet/transactions", label: "Transactions", description: "Ledger history for this account." },
];

export function SettingsPaymentsPanel({
  affiliatePayoutMethod,
}: {
  affiliatePayoutMethod: string | null;
}) {
  const { menuButton } = useSettingsCenter();

  return (
    <div>
      <SettingsPageHeader
        title="Payments & Payouts"
        description="Wallet and payout tools stay in Wallet so balances and provider details are not duplicated here."
        menuButton={menuButton}
      />

      <div className="space-y-5">
        <SettingsCard
          title="Jimvio Wallet"
          description="Open the existing wallet to see the live balance and payment methods."
          icon={<Wallet className="h-4 w-4" />}
        >
          <div className="grid gap-2">
            {WALLET_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] px-4 py-3 hover:bg-[#F9FAFB]"
              >
                <span>
                  <span className="block text-[14px] font-semibold text-[#111827]">{item.label}</span>
                  <span className="block text-[13px] text-[#6B7280]">{item.description}</span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-[#9CA3AF]" />
              </Link>
            ))}
          </div>
        </SettingsCard>

        <SettingsCard
          title="Affiliate payout destination"
          description="Shown only when an affiliate payout method already exists. The account number stays hidden."
          icon={<CreditCard className="h-4 w-4" />}
        >
          {affiliatePayoutMethod ? (
            <p className="text-[14px] text-[#111827]">
              Current method: <span className="font-semibold">{affiliatePayoutMethod}</span>
            </p>
          ) : (
            <p className="text-[14px] text-[#6B7280]">
              No affiliate payout method is on file. Activate affiliate access and add a destination
              from Affiliates when you are eligible.
            </p>
          )}
          <Link
            href="/affiliates/payouts"
            className="mt-4 inline-flex h-11 items-center rounded-xl border border-[#E5E7EB] px-4 text-[14px] font-semibold text-[#111827] hover:bg-[#F9FAFB]"
          >
            Open affiliate payouts
          </Link>
        </SettingsCard>
      </div>
    </div>
  );
}
