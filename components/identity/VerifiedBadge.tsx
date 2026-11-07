import { BlueVerifiedBadge } from "@/components/verification/BlueVerifiedBadge";
import { cn } from "@/lib/utils";

/**
 * Identity / JIP verified indicator — uses the platform blue tick.
 * Only render when a trusted backend flag confirms verification.
 */
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
      title="Verified: Jimvio confirmed this identity. Not a product certification."
      className={cn("inline-flex items-center gap-1", className)}
    >
      <BlueVerifiedBadge
        verified
        size={size === "sm" ? "sm" : "md"}
        label="Verified on Jimvio"
      />
      <span
        className={cn(
          "font-semibold text-[#1D9BF0]",
          size === "sm" ? "text-[10px]" : "text-[11px]",
        )}
      >
        Verified
      </span>
    </span>
  );
}
