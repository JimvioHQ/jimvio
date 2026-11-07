import { BlueVerifiedBadge, type BlueVerifiedBadgeSize } from "@/components/verification/BlueVerifiedBadge";
import { cn } from "@/lib/utils";

/**
 * Identity verified indicator — canonical Jimvio blue tick.
 * Default is icon-only (matches UGC / Communities). Optional label for dense settings screens.
 */
export function VerifiedBadge({
  verified,
  className,
  size = "md",
  showLabel = false,
}: {
  verified: boolean;
  className?: string;
  size?: BlueVerifiedBadgeSize | "sm" | "md";
  showLabel?: boolean;
}) {
  if (!verified) return null;
  const badgeSize: BlueVerifiedBadgeSize =
    size === "sm" ? "sm" : size === "xs" || size === "lg" ? size : "md";
  return (
    <span
      title="Verified on Jimvio"
      className={cn("inline-flex items-center gap-1 align-middle", className)}
    >
      <BlueVerifiedBadge
        verified
        size={badgeSize}
        label="Verified on Jimvio"
      />
      {showLabel ? (
        <span
          className={cn(
            "font-semibold text-[#1D9BF0]",
            badgeSize === "sm" || badgeSize === "xs" ? "text-[10px]" : "text-[11px]",
          )}
        >
          Verified
        </span>
      ) : null}
    </span>
  );
}
