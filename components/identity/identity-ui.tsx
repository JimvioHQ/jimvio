import * as React from "react";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Self-contained visual kit for the Jimvio Identity Platform (JIP).
 * Deliberately independent from the dashboard's design tokens so the
 * identity surfaces (`/u`, `/identity`, `/admin/identity`) can carry a
 * distinct, premium editorial feel — Instrument Sans + Newsreader,
 * refined neutrals, and the Jimvio orange (#FF5A1F) used sparingly.
 */

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const IDENTITY_ACCENT = "#FF5A1F";

// ─── Atmosphere ─────────────────────────────────────────────────────────────

/** Soft, one-composition backdrop — no purple gradients, no cream/terracotta clichés. */
export function IdentityAtmosphere({ contained = false }: { contained?: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none -z-10 overflow-hidden bg-[#FBFAF8]",
        contained ? "absolute inset-0" : "fixed inset-0",
      )}
    >
      <div className="absolute -top-40 right-[-10%] h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(255,90,31,0.16),transparent_70%)] blur-3xl" />
      <div className="absolute top-[20%] left-[-15%] h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,rgba(30,30,28,0.05),transparent_70%)] blur-3xl" />
      <div className="absolute bottom-[-20%] right-[10%] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(255,90,31,0.08),transparent_70%)] blur-3xl" />
      <div
        className="absolute inset-0 opacity-[0.03] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.6))]" />
    </div>
  );
}

// ─── Shell / chrome ─────────────────────────────────────────────────────────

export function IdentityShell({
  children,
  className,
  contained = false,
}: {
  children: React.ReactNode;
  className?: string;
  contained?: boolean;
}) {
  return (
    <div
      className={cn(
        "identity-scope relative isolate font-[var(--font-identity-sans)] text-[#1C1B19]",
        contained ? "min-h-full" : "min-h-screen",
        className,
      )}
    >
      <IdentityAtmosphere contained={contained} />
      {children}
    </div>
  );
}

// ─── Card ───────────────────────────────────────────────────────────────────

export const IdentityCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }
>(({ className, interactive, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-[22px] border border-black/[0.06] bg-white/80 shadow-[0_1px_2px_rgba(20,18,15,0.04),0_12px_32px_-16px_rgba(20,18,15,0.10)] backdrop-blur-sm",
      interactive &&
        "transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_1px_2px_rgba(20,18,15,0.05),0_20px_40px_-16px_rgba(20,18,15,0.16)]",
      className,
    )}
    {...props}
  />
));
IdentityCard.displayName = "IdentityCard";

export function IdentitySectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div>
        {eyebrow && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A9388]">
            {eyebrow}
          </p>
        )}
        <h2 className="font-[var(--font-identity-serif)] text-[20px] font-medium tracking-tight text-[#161512] sm:text-[22px]">
          {title}
        </h2>
        {description && <p className="mt-1 text-[13.5px] leading-relaxed text-[#7C766B]">{description}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Buttons ────────────────────────────────────────────────────────────────

type IdentityButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type IdentityButtonSize = "sm" | "md" | "lg" | "icon";

const buttonVariantClasses: Record<IdentityButtonVariant, string> = {
  primary:
    "bg-[#FF5A1F] text-white shadow-[0_1px_2px_rgba(255,90,31,0.2),0_10px_24px_-10px_rgba(255,90,31,0.55)] hover:bg-[#F04E15] active:scale-[0.98]",
  secondary:
    "bg-[#161512] text-white shadow-[0_1px_2px_rgba(20,18,15,0.2)] hover:bg-[#262420] active:scale-[0.98]",
  outline:
    "border border-black/10 bg-white text-[#1C1B19] hover:border-black/20 hover:bg-black/[0.02] active:scale-[0.98]",
  ghost: "text-[#7C766B] hover:bg-black/[0.04] hover:text-[#1C1B19]",
  danger: "bg-[#E4463A]/10 text-[#C23A2F] hover:bg-[#E4463A]/15 border border-[#E4463A]/20",
};

const buttonSizeClasses: Record<IdentityButtonSize, string> = {
  sm: "h-8 rounded-full px-3.5 text-[12.5px] gap-1.5",
  md: "h-10 rounded-full px-5 text-[13.5px] gap-2",
  lg: "h-12 rounded-full px-7 text-[14.5px] gap-2",
  icon: "h-9 w-9 rounded-full",
};

export interface IdentityButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IdentityButtonVariant;
  size?: IdentityButtonSize;
  loading?: boolean;
}

export const IdentityButton = React.forwardRef<HTMLButtonElement, IdentityButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50",
        buttonVariantClasses[variant],
        buttonSizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  ),
);
IdentityButton.displayName = "IdentityButton";

// ─── Badge / Pill ───────────────────────────────────────────────────────────

type IdentityBadgeTone = "neutral" | "accent" | "success" | "warning" | "danger";

const badgeToneClasses: Record<IdentityBadgeTone, string> = {
  neutral: "bg-black/[0.04] text-[#59544B] border border-black/[0.05]",
  accent: "bg-[#FFF1EA] text-[#D6480F] border border-[#FFDCC7]",
  success: "bg-[#EAF7EE] text-[#1C8A44] border border-[#CFEFDA]",
  warning: "bg-[#FFF6E0] text-[#9A6B00] border border-[#FBE7AE]",
  danger: "bg-[#FDEDEB] text-[#C23A2F] border border-[#F8D3CE]",
};

export function IdentityPill({
  children,
  tone = "neutral",
  className,
  icon,
}: {
  children: React.ReactNode;
  tone?: IdentityBadgeTone;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium tracking-[0.01em]",
        badgeToneClasses[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

// ─── Progress primitives ───────────────────────────────────────────────────

export function IdentityProgressBar({
  value,
  className,
  trackClassName,
  barClassName,
}: {
  value: number;
  className?: string;
  trackClassName?: string;
  barClassName?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06]", trackClassName, className)}>
      <div
        className={cn("h-full rounded-full bg-[#FF5A1F] transition-[width] duration-700 ease-out", barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function IdentityScoreRing({
  value,
  size = 72,
  strokeWidth = 6,
  label,
  color = IDENTITY_ACCENT,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  color?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-[16px] font-semibold text-[#161512]">{Math.round(pct)}</span>
        {label && <span className="text-[9px] font-medium uppercase tracking-wide text-[#9A9388]">{label}</span>}
      </div>
    </div>
  );
}

// ─── Empty state ────────────────────────────────────────────────────────────

export function IdentityEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[18px] border border-dashed border-black/10 bg-black/[0.015] px-6 py-10 text-center">
      {icon && <div className="text-[#B9B3A6]">{icon}</div>}
      <div>
        <p className="text-[14px] font-semibold text-[#1C1B19]">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-xs text-[13px] leading-relaxed text-[#8B8579]">{description}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

export function IdentitySkeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-black/[0.06]", className)} />;
}
