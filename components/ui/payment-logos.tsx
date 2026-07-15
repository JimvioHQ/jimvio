import { cn } from "@/lib/utils";

type LogoProps = { className?: string };

/** Recognizable Visa mark — blue badge + VISA wordmark */
export function VisaLogo({ className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 60 20"
      className={cn("h-5 w-auto", className)}
      role="img"
      aria-label="Visa"
    >
      <rect width="60" height="20" rx="3" fill="#1A1F71" />
      <text
        x="30"
        y="14.5"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="11"
        fontWeight="700"
        fontFamily="Arial, Helvetica, sans-serif"
        fontStyle="italic"
        letterSpacing="0.08em"
      >
        VISA
      </text>
    </svg>
  );
}

/** Mastercard overlapping circles mark */
export function MastercardLogo({ className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 60 38"
      className={cn("h-7 w-auto", className)}
      role="img"
      aria-label="Mastercard"
    >
      <defs>
        <clipPath id="mc-clip">
          <path d="M22.5 6a13 13 0 0 1 0 20 13 13 0 1 0 0-20z" />
        </clipPath>
        <linearGradient id="mc-blend" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#EB001B" />
          <stop offset="50%" stopColor="#F79E1B" />
          <stop offset="100%" stopColor="#F79E1B" />
        </linearGradient>
      </defs>
      <g transform="translate(0, 2)">
        <circle cx="17" cy="16" r="13" fill="#EB001B" />
        <circle cx="37" cy="16" r="13" fill="#F79E1B" />
        <circle cx="27" cy="16" r="13" fill="url(#mc-blend)" clipPath="url(#mc-clip)" opacity="0.85" />
      </g>
      <text
        x="30"
        y="34"
        textAnchor="middle"
        fill="currentColor"
        fontSize="7.5"
        fontWeight="700"
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="0.15em"
      >
        Mastercard
      </text>
    </svg>
  );
}

/** Apple Pay mark — Apple icon + Pay */
export function ApplePayLogo({ className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 58 20"
      className={cn("h-5 w-auto text-[var(--color-text-primary)]", className)}
      role="img"
      aria-label="Apple Pay"
    >
      <path
        fill="currentColor"
        d="M11.8 4.4c-.7.8-1.7 1.3-2.7 1.2-.1-.9.3-1.8.9-2.4.7-.8 1.7-1.3 2.6-1.3.1 1-.3 1.9-.8 2.5zm.9 1.4c-1.3-.1-2.3.7-2.9.7-.6 0-1.4-.7-2.4-.7-1.3 0-2.4.8-3 2-.9 1.5-.7 3.7.2 5.2.6 1 1.2 2.1 2.1 2.1.9 0 1.2-.6 2.4-.6 1.2 0 1.4.6 2.4.6.9 0 1.6-.9 2.1-1.8.7-1 .9-2 1-2.1-1-.1-1.8-.7-1.8-2.7 0-1.7 1.4-2.5 1.5-2.6-.9-.7-2.3-.8-2.7-.8z"
      />
      <text
        x="22"
        y="14.5"
        fill="currentColor"
        fontSize="13"
        fontWeight="600"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      >
        Pay
      </text>
    </svg>
  );
}
