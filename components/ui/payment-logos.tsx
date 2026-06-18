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
      viewBox="0 0 52 32"
      className={cn("h-6 w-auto", className)}
      role="img"
      aria-label="Mastercard"
    >
      <circle cx="18" cy="16" r="12" fill="#EB001B" />
      <circle cx="34" cy="16" r="12" fill="#F79E1B" />
      <path d="M26 6.5a12 12 0 0 0 0 19A12 12 0 0 0 26 6.5z" fill="#FF5F00" />
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
