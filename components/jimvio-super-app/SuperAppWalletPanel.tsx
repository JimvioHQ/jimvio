"use client";

import Link from "next/link";
import type { JimvioSuperAppData } from "@/lib/jimvio-super-app/types";
import { cn } from "@/lib/utils";

export function SuperAppWalletPanel({ data }: { data: JimvioSuperAppData }) {
  const { wallet } = data;

  return (
    <section aria-label="Global wallet" className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {[
          { label: "Available", value: wallet.availableBalance },
          { label: "Pending", value: wallet.pendingBalance },
          { label: "Affiliate", value: wallet.affiliateEarnings },
          { label: "Creator", value: wallet.creatorEarnings },
          { label: "Refunds", value: wallet.refunds },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
            style={{ minHeight: 72 }}
          >
            <p className="text-[9px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">{item.label}</p>
            <p className="mt-1 text-lg font-black text-[var(--color-text-primary)]">{item.value}</p>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-[12px] font-bold text-[var(--color-text-primary)]">Transaction history</h4>
          <Link href="/dashboard/wallet" className="text-[10px] font-semibold text-[var(--color-accent)] hover:underline">
            Open wallet
          </Link>
        </div>
        <ul className="space-y-1.5">
          {data.transactions.map((tx) => (
            <li
              key={tx.id}
              className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2"
            >
              <span>
                <span className="block text-[11px] font-semibold">{tx.label}</span>
                <span className="text-[10px] text-[var(--color-text-muted)]">{tx.time}</span>
              </span>
              <span
                className={cn(
                  "text-[12px] font-bold",
                  tx.type === "credit" && "text-emerald-600",
                  tx.type === "debit" && "text-red-500",
                  tx.type === "pending" && "text-[var(--color-text-muted)]",
                )}
              >
                {tx.amount}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="mb-2 text-[12px] font-bold text-[var(--color-text-primary)]">Payout history</h4>
        <ul className="space-y-1.5">
          {data.payouts.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-lg bg-[var(--color-surface-secondary)] px-3 py-2">
              <span className="text-[11px] font-semibold">{p.label}</span>
              <span className="text-[11px] font-bold text-emerald-600">{p.amount}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-[10px] text-[var(--color-text-muted)]">Wallet UI placeholder — connects to existing wallet routes.</p>
    </section>
  );
}
