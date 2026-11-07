import { BlueVerifiedBadge } from "@/components/verification/BlueVerifiedBadge";
import { cn } from "@/lib/utils";

/** UGC brand tick — thin wrapper over the platform BlueVerifiedBadge. */
export function UGCVerifiedBadge({
  className,
  verified = true,
}: {
  className?: string;
  verified?: boolean;
}) {
  return (
    <BlueVerifiedBadge
      verified={verified}
      size="md"
      label="Verified brand"
      title="Verified brand on Jimvio"
      className={cn(className)}
    />
  );
}
