import { cn } from "@/lib/utils";

export function UGCVerifiedBadge({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn("shrink-0", className)}
      aria-label="Verified brand"
      role="img"
    >
      <circle cx="8" cy="8" r="8" fill="#1D9BF0" />
      <path
        d="M4.7 8.2l2.1 2.1 4.5-4.5"
        fill="none"
        stroke="#fff"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
