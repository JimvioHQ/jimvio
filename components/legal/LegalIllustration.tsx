import { cn } from "@/lib/utils";

/** Lightweight SVG inspired by the Legal Center hero artwork. */
export function LegalIllustration({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none relative select-none",
        compact ? "h-[140px] w-[160px]" : "h-[240px] w-[280px]",
        className,
      )}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 280 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full"
      >
        <ellipse cx="150" cy="200" rx="90" ry="18" fill="rgba(255,90,31,0.12)" />
        <circle cx="168" cy="118" r="72" fill="rgba(255,90,31,0.08)" stroke="rgba(255,90,31,0.2)" />
        <circle cx="168" cy="118" r="54" fill="none" stroke="rgba(17,24,39,0.12)" strokeDasharray="4 6" />
        <path
          d="M168 72c18 10 30 28 30 46s-12 36-30 46c-18-10-30-28-30-46s12-36 30-46z"
          fill="rgba(255,255,255,0.75)"
          stroke="rgba(17,24,39,0.12)"
        />
        <path d="M138 118h60M168 88v60" stroke="rgba(255,90,31,0.45)" strokeWidth="2" />
        <g transform="translate(48 56)">
          <rect x="0" y="12" width="78" height="96" rx="10" fill="white" stroke="rgba(17,24,39,0.1)" />
          <rect x="12" y="28" width="54" height="6" rx="3" fill="rgba(17,24,39,0.12)" />
          <rect x="12" y="42" width="42" height="6" rx="3" fill="rgba(17,24,39,0.08)" />
          <rect x="12" y="56" width="48" height="6" rx="3" fill="rgba(17,24,39,0.08)" />
          <rect x="12" y="70" width="36" height="6" rx="3" fill="rgba(255,90,31,0.35)" />
        </g>
        <g transform="translate(78 36)">
          <rect x="0" y="12" width="78" height="96" rx="10" fill="white" stroke="rgba(17,24,39,0.12)" />
          <rect x="12" y="28" width="54" height="6" rx="3" fill="rgba(17,24,39,0.14)" />
          <rect x="12" y="42" width="46" height="6" rx="3" fill="rgba(17,24,39,0.08)" />
          <rect x="12" y="56" width="50" height="6" rx="3" fill="rgba(17,24,39,0.08)" />
          <rect x="12" y="70" width="30" height="6" rx="3" fill="rgba(255,90,31,0.4)" />
        </g>
        <g transform="translate(178 148)">
          <path
            d="M32 8c14 6 24 8 24 22v18c0 16-10 28-24 34C18 76 8 64 8 48V30C8 16 18 14 32 8z"
            fill="#FF5A1F"
          />
          <path
            d="M22 40l8 8 14-16"
            stroke="white"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </div>
  );
}
