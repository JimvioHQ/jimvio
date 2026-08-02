"use client";

import { ArrowDownRight, ArrowUpRight, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  WalletCard,
  WalletEmptyState,
  WalletErrorState,
  WalletLoading,
  WalletSectionHeading,
  WalletStat,
  cn,
  useWalletFetch,
} from "./wallet-ui";

interface IncomeExpensePoint {
  label: string;
  income: number;
  expense: number;
}

interface RevenueByModule {
  module: string;
  value: number;
  color?: string;
}

interface WalletAnalyticsResponse {
  currency?: string;
  growthPercent?: number;
  growthLabel?: string;
  incomeVsExpense?: IncomeExpensePoint[];
  revenueByModule?: RevenueByModule[];
}

const MODULE_COLORS: Record<string, string> = {
  marketplace: "#2D7DD2",
  ugc: "#FF5A1F",
  affiliate: "#8A6DF0",
  community: "#D6A400",
};

export function WalletAnalyticsClient() {
  const { status, data, error, retry } = useWalletFetch<WalletAnalyticsResponse>("/api/wallet/os/analytics");
  const currency = data?.currency || "USD";
  const series = data?.incomeVsExpense ?? [];
  const modules = data?.revenueByModule ?? [];
  const maxSeries = Math.max(1, ...series.flatMap((p) => [p.income, p.expense]));
  const maxModule = Math.max(1, ...modules.map((m) => m.value));

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pt-8">
      <WalletSectionHeading
        eyebrow="Jimvio Wallet OS"
        title="Analytics"
        description="Income vs. expenses, revenue by module, and how your earnings are trending."
        className="mb-6"
      />

      {status === "loading" && <WalletLoading label="Loading analytics…" />}
      {status === "error" && (
        <WalletErrorState message={error || "The analytics endpoint isn't available yet."} onRetry={retry} />
      )}

      {(status === "ready" || status === "empty") && (
        <div className="space-y-6">
          {typeof data?.growthPercent === "number" && (
            <WalletStat
              label={data?.growthLabel || "Growth vs. last period"}
              value={`${data.growthPercent >= 0 ? "+" : ""}${data.growthPercent.toFixed(1)}%`}
              tone={data.growthPercent >= 0 ? "success" : "warning"}
              icon={
                data.growthPercent >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />
              }
            />
          )}

          {status === "empty" && (
            <WalletEmptyState
              icon={<TrendingUp className="h-6 w-6" />}
              title="Not enough activity yet"
              description="Analytics will populate once you have income and expense history."
            />
          )}

          {series.length > 0 && (
            <WalletCard className="p-5 sm:p-6">
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9B968D]">Income vs. expenses</p>
              <div className="flex items-end gap-3" style={{ height: 180 }}>
                {series.map((p, i) => (
                  <div key={`${p.label}-${i}`} className="flex flex-1 flex-col items-center gap-1.5">
                    <div className="flex flex-1 items-end gap-1">
                      <div
                        className="w-1/2 rounded-t-md bg-[#FF5A1F] transition-all duration-500"
                        style={{ height: Math.max(3, (p.income / maxSeries) * 148) }}
                        title={`Income: ${formatCurrency(p.income, currency)}`}
                      />
                      <div
                        className="w-1/2 rounded-t-md bg-[#DDD8CC] transition-all duration-500"
                        style={{ height: Math.max(3, (p.expense / maxSeries) * 148) }}
                        title={`Expense: ${formatCurrency(p.expense, currency)}`}
                      />
                    </div>
                    <span className="text-[9.5px] font-medium text-[#9B968D]">{p.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-4 text-[11.5px] text-[#726D64]">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#FF5A1F]" /> Income
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#DDD8CC]" /> Expenses
                </span>
              </div>
            </WalletCard>
          )}

          {modules.length > 0 && (
            <WalletCard className="p-5 sm:p-6">
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9B968D]">Revenue by module</p>
              <div className="space-y-3.5">
                {modules.map((m) => {
                  const color = m.color || MODULE_COLORS[m.module.toLowerCase()] || "#9A9388";
                  const pct = (m.value / maxModule) * 100;
                  return (
                    <div key={m.module}>
                      <div className="mb-1 flex items-center justify-between text-[12.5px]">
                        <span className={cn("font-medium capitalize text-[#121113]")}>{m.module}</span>
                        <span className="font-semibold text-[#121113]">{formatCurrency(m.value, currency)}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06]">
                        <div
                          className="h-full rounded-full transition-[width] duration-700 ease-out"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </WalletCard>
          )}

          {series.length === 0 && modules.length === 0 && status === "ready" && (
            <WalletEmptyState title="No analytics data" description="Charts will appear once your wallet has activity." />
          )}
        </div>
      )}
    </div>
  );
}
