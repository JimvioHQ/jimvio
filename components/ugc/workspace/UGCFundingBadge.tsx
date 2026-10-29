import { ShieldCheck, ShieldAlert, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UGCCampaign } from "@/types/ugc";

/**
 * Escrow truth on the board: "Funded" only when money held by Jimvio covers
 * the whole budget.
 */
export function UGCFundingBadge({
  funding,
  className,
  size = "sm",
}: {
  funding: UGCCampaign["funding"];
  className?: string;
  size?: "sm" | "md";
}) {
  if (!funding) return null;
  const md = size === "md";
  const base = cn(
    "inline-flex items-center gap-1 rounded-full font-semibold leading-none backdrop-blur",
    md ? "h-7 px-2.5 text-[12px]" : "h-[20px] px-1.5 text-[10px] sm:h-[22px] sm:px-2 sm:text-[11px]",
    className,
  );
  const icon = md ? "h-3.5 w-3.5" : "h-3 w-3";
  if (funding.state === "funded") {
    return (
      <span className={cn(base, "bg-emerald-600/95 text-white")} title="The full budget is held in escrow by Jimvio.">
        <ShieldCheck className={icon} aria-hidden="true" />
        Funded
      </span>
    );
  }
  if (funding.state === "partly_funded") {
    return (
      <span
        className={cn(base, "bg-amber-500/95 text-white")}
        title="Part of the budget is held in escrow. Payouts never exceed the money held."
      >
        <ShieldAlert className={icon} aria-hidden="true" />
        {funding.coveragePct}% funded
      </span>
    );
  }
  return (
    <span className={cn(base, "bg-[#111827]/80 text-white")} title="The brand has not funded this campaign yet.">
      <Clock className={icon} aria-hidden="true" />
      Awaiting funds
    </span>
  );
}
