import React from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { loadSupplierSourcesSettings } from "@/lib/sources/supplier-settings";
import { DEFAULT_SUPPLIER_SOURCES } from "@/lib/sources/supplier-settings-shared";
import { WITHDRAWAL_FEE_RULES, type WithdrawalFeeRule } from "@/lib/payments/withdrawal-fees";

/**
 * Pricing — what Jimvio actually charges (T-9).
 *
 * Every number on this page is read from the same settings and rules the
 * payment code uses. There are no paid plans: an earlier version sold
 * "Creator" and "Business" plans that the product never implemented.
 */
export const revalidate = 300;

async function loadFees() {
  try {
    const settings = await loadSupplierSourcesSettings(createServiceRoleClient());
    return settings;
  } catch {
    return DEFAULT_SUPPLIER_SOURCES;
  }
}

function formatRule(rule: WithdrawalFeeRule): string {
  const parts: string[] = [];
  if (rule.fixed > 0) parts.push(`$${rule.fixed}`);
  if (rule.percent > 0) parts.push(`${rule.percent}%`);
  const base = parts.join(" + ") || "$0";
  return `${base} (min $${rule.min}, max $${rule.max})`;
}

const WITHDRAWAL_LABELS: Record<string, string> = {
  mobile_money: "Mobile money",
  bank: "Bank transfer",
  binance_id: "Binance ID",
  crypto: "Crypto wallet",
};

const FREE_ITEMS = [
  "Create an account, buy, and join communities",
  "Open a store and list products",
  "Create affiliate links and join UGC or clipping campaigns",
  "Wallet, earnings history and payout requests",
];

export default async function PricingPage() {
  const fees = await loadFees();

  const saleFees = [
    { label: "Products you sell from your own store", value: fees.vendor.platform_commission_percent },
    { label: "Products synced from a connected Shopify store", value: fees.shopify.platform_commission_percent },
    { label: "Products from the Jimvio catalog", value: fees.cj.platform_commission_percent },
  ];

  const withdrawals = Object.entries(WITHDRAWAL_FEE_RULES).map(([method, rule]) => ({
    method: WITHDRAWAL_LABELS[method] ?? method,
    fee: formatRule(rule),
  }));

  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      <section className="mx-auto max-w-3xl px-4 pb-10 pt-14 text-center sm:px-6">
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#FF5A1F]">Pricing</p>
        <h1 className="mt-3 text-[clamp(2rem,5vw,3rem)] font-black leading-[1.05] tracking-tight">
          Free to join. A fee only when you earn.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
          Jimvio has no subscription plans. You pay a platform fee on sales and a small fee when
          you withdraw. The figures below come from the same settings the payment system uses.
        </p>
      </section>

      <section className="mx-auto grid max-w-5xl gap-5 px-4 pb-16 sm:px-6 md:grid-cols-2">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="text-lg font-bold">Always free</h2>
          <ul className="mt-4 space-y-3">
            {FREE_ITEMS.map((item) => (
              <li key={item} className="flex gap-2.5 text-[14px] text-[var(--color-text-secondary)]">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="text-lg font-bold">Platform fee on sales</h2>
          <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
            Taken from the sale amount before earnings reach your wallet.
          </p>
          <table className="mt-4 w-full text-left text-[14px]">
            <tbody>
              {saleFees.map((row) => (
                <tr key={row.label} className="border-t border-[var(--color-border)]">
                  <td className="py-2.5 pr-3 text-[var(--color-text-secondary)]">{row.label}</td>
                  <td className="py-2.5 text-right font-bold tabular-nums">{row.value}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="text-lg font-bold">Affiliates and campaigns</h2>
          <ul className="mt-4 space-y-3 text-[14px] text-[var(--color-text-secondary)]">
            <li>Affiliate commission is set by each seller and shown on the product before you promote it.</li>
            <li>UGC and clipping pay is set by each brand and shown on the campaign before you apply.</li>
            <li>Joining either is free.</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="text-lg font-bold">Withdrawal fees</h2>
          <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
            Jimvio&apos;s fee per withdrawal, in USD. The exact amount is shown before you confirm.
          </p>
          <table className="mt-4 w-full text-left text-[14px]">
            <tbody>
              {withdrawals.map((row) => (
                <tr key={row.method} className="border-t border-[var(--color-border)]">
                  <td className="py-2.5 pr-3 text-[var(--color-text-secondary)]">{row.method}</td>
                  <td className="py-2.5 text-right font-semibold tabular-nums">{row.fee}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-20 text-center sm:px-6">
        <p className="text-[13px] text-[var(--color-text-muted)]">
          Payment providers may add their own charges. Payout timing depends on the method; the
          wallet shows the processing note for each one. See{" "}
          <Link href="/refunds-payouts" className="underline">refunds and payouts</Link>.
        </p>
        <Link
          href="/register"
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-[#FF5A1F] px-6 text-sm font-bold text-white hover:bg-[#e04e18]"
        >
          Create a free account
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </section>
    </main>
  );
}
