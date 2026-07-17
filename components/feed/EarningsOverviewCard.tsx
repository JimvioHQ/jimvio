import Link from "next/link";
import { Triangle } from "lucide-react";
import { EARNINGS } from "@/lib/feed/mock-data";

export function EarningsOverviewCard() {
  const maxBar = Math.max(...EARNINGS.chartBars);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#121212] p-5 text-white shadow-sm">
      {/* Top-right orange glow */}
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full opacity-60"
        style={{
          background: "radial-gradient(circle, rgba(255,140,0,0.45) 0%, rgba(255,102,0,0.15) 45%, transparent 70%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/20" />

      <h3 className="relative text-sm font-bold text-white">Earnings Overview</h3>

      <p className="relative mt-4 text-xs font-medium text-[#B0B0B0]">Total Earnings</p>
      <p className="relative mt-0.5 text-[28px] font-bold leading-tight tabular-nums tracking-tight text-white">
        {EARNINGS.total}
      </p>

      <p className="relative mt-1.5 flex items-center gap-1 text-xs text-[#B0B0B0]">
        <Triangle className="h-2.5 w-2.5 shrink-0 fill-white text-white" />
        {EARNINGS.delta}
      </p>

      {/* Bar chart */}
      <div className="relative mt-5 flex h-14 items-end gap-[3px] px-0.5">
        {EARNINGS.chartBars.map((height, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm bg-white/25"
            style={{ height: `${Math.max(18, (height / maxBar) * 100)}%` }}
          />
        ))}
      </div>

      <Link
        href="/communities/wallet"
        className="relative mt-5 flex w-full items-center justify-center rounded-sm bg-[#FF6600] py-3 text-sm font-bold text-white transition-colors hover:bg-orange-600"
      >
        View Payouts
      </Link>
    </div>
  );
}
