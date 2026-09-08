import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/** Premium verified indicator — only render when backend confirms verification. */
export function VerifiedBadge({
  verified,
  className,
  size = "md",
}: {
  verified: boolean;
  className?: string;
  size?: "sm" | "md";
}) {
  if (!verified) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-emerald-200/80 bg-emerald-50 font-semibold text-emerald-800",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]",
        className,
      )}
    >
      <BadgeCheck className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />
      Verified
    </span>
  );
}
