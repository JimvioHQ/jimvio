import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { seatLabel } from "@/lib/founding/program";

/** Permanent badge for a Founding Creator seat holder. */
export function FoundingBadge({ seat, compact, className }: { seat: number; compact?: boolean; className?: string }) {
  return (
    <span
      title={seatLabel(seat)}
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 font-bold text-amber-800 ring-1 ring-amber-300/70",
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]",
        className,
      )}
    >
      <Crown className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />
      {compact ? `Founding #${seat}` : seatLabel(seat)}
    </span>
  );
}
