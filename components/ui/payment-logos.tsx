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

/** American Express wordmark badge */
export function AmexLogo({ className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 64 20"
      className={cn("h-5 w-auto", className)}
      role="img"
      aria-label="American Express"
    >
      <rect width="64" height="20" rx="3" fill="#2E77BC" />
      <text
        x="32"
        y="13.5"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="8"
        fontWeight="700"
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="0.04em"
      >
        AMEX
      </text>
    </svg>
  );
}

/** Discover wordmark badge */
export function DiscoverLogo({ className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 72 20"
      className={cn("h-5 w-auto", className)}
      role="img"
      aria-label="Discover"
    >
      <rect width="72" height="20" rx="3" fill="#FF6000" />
      <text
        x="36"
        y="13.5"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="8"
        fontWeight="700"
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="0.02em"
      >
        DISCOVER
      </text>
    </svg>
  );
}

/** UnionPay mark */
export function UnionPayLogo({ className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 56 20"
      className={cn("h-5 w-auto", className)}
      role="img"
      aria-label="UnionPay"
    >
      <rect x="0" y="0" width="18" height="20" rx="2" fill="#E21836" />
      <rect x="19" y="0" width="18" height="20" rx="2" fill="#00447C" />
      <rect x="38" y="0" width="18" height="20" rx="2" fill="#007B84" />
    </svg>
  );
}

/** JCB mark */
export function JcbLogo({ className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 48 20"
      className={cn("h-5 w-auto", className)}
      role="img"
      aria-label="JCB"
    >
      <rect width="48" height="20" rx="3" fill="#0B4EA2" />
      <text
        x="24"
        y="13.5"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="9"
        fontWeight="700"
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="0.06em"
      >
        JCB
      </text>
    </svg>
  );
}

/** Google Pay mark */
export function GooglePayLogo({ className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 62 24"
      className={cn("h-5 w-auto", className)}
      role="img"
      aria-label="Google Pay"
    >
      <path
        fill="#4285F4"
        d="M25.4 10.8v2.5h3.9c-.2 1-.7 1.8-1.5 2.3-.8.6-1.8.9-3 .9-2.4 0-4.4-2-4.4-4.4s2-4.4 4.4-4.4c1.2 0 2.2.4 3 1.1l1.8-1.8c-1.2-1.1-2.8-1.8-4.8-1.8-3.9 0-7.1 3.2-7.1 7.1s3.2 7.1 7.1 7.1c2.1 0 3.8-.7 5.1-1.9 1.3-1.3 1.7-3 1.7-4.4 0-.4 0-.7-.1-1.1h-6.1z"
      />
      <path fill="#EA4335" d="M36.8 6.9h-2.4v10.8h2.4V6.9z" />
      <path
        fill="#FBBC05"
        d="M42.9 13.5c0-1.9 1.1-3.1 2.7-3.1 1.1 0 1.9.6 2.2 1.5h2.4c-.5-2-2.2-3.5-4.6-3.5-2.9 0-5.1 2.2-5.1 5.1s2.2 5.1 5.1 5.1c2.4 0 4.1-1.5 4.6-3.5h-2.4c-.3.9-1.1 1.5-2.2 1.5-1.6 0-2.7-1.2-2.7-3.1z"
      />
      <path
        fill="#34A853"
        d="M53.6 10.4c-2.8 0-5 2.2-5 5.1s2.2 5.1 5 5.1c1.5 0 2.7-.5 3.6-1.5l-1.5-1.4c-.5.5-1.2.8-2.1.8-1.5 0-2.6-1-2.8-2.4h7.1v-.6c0-2.9-2-5.1-4.3-5.1zm0 1.9c1.3 0 2.3.9 2.5 2.1h-5c.3-1.2 1.3-2.1 2.5-2.1z"
      />
      <path
        fill="#4285F4"
        d="M14.1 10.6c0-.5-.1-1-.2-1.5H7.2v2.9h3.9c-.2.9-.7 1.7-1.5 2.2v1.8h2.4c1.4-1.3 2.1-3.2 2.1-5.4z"
      />
      <path
        fill="#34A853"
        d="M7.2 17.7c2 0 3.7-.7 4.9-1.8l-2.4-1.8c-.7.5-1.5.7-2.5.7-1.9 0-3.5-1.3-4.1-3H.6v1.9c1.2 2.4 3.7 4 6.6 4z"
      />
      <path
        fill="#FBBC05"
        d="M3.1 11.8c-.2-.5-.2-1-.2-1.5s.1-1 .2-1.5V7H.6C.2 7.8 0 8.8 0 10.3s.2 2.5.6 3.3l2.5-1.8z"
      />
      <path
        fill="#EA4335"
        d="M7.2 5.7c1.1 0 2 .4 2.8 1.1l2.1-2.1C10.9 3.5 9.2 2.8 7.2 2.8 4.3 2.8 1.8 4.4.6 6.8l2.5 1.9c.6-1.7 2.2-3 4.1-3z"
      />
    </svg>
  );
}
