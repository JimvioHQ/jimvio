import * as React from "react";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Shared visual kit for Jimvio Wallet OS (`/wallet/*`).
 *
 * Self-contained design language, independent from the dashboard's tokens
 * and from the Identity Platform's cream/editorial look — a graphite +
 * off-white "operating system" surface with the Jimvio orange used as a
 * single, deliberate accent. No purple gradients, no cream/terracotta.
 */

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const WALLET_ACCENT = "#FF5A1F";
export const WALLET_INK = "#0E0E10";

// ─── Atmosphere ─────────────────────────────────────────────────────────────

/** Quiet graphite/off-white backdrop with a single orange glow — no purple, no cream. */
export function WalletAtmosphere({ contained = false }: { contained?: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none -z-10 overflow-hidden bg-[#F5F5F4] dark:bg-[var(--color-bg)]",
        contained ? "absolute inset-0" : "fixed inset-0",
      )}
    >
      <div className="absolute -top-32 left-[8%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(255,90,31,0.14),transparent_70%)] blur-3xl" />
      <div className="absolute top-[10%] right-[-12%] h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,rgba(14,14,16,0.06),transparent_72%)] blur-3xl" />
      <div className="absolute bottom-[-15%] left-[-10%] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(255,90,31,0.07),transparent_70%)] blur-3xl" />
      <div
        className="absolute inset-0 opacity-[0.025] mix-blend-multiply dark:mix-blend-normal dark:opacity-[0.08]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}

// ─── Root scope ─────────────────────────────────────────────────────────────

export function WalletScope({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "wallet-os-scope relative isolate min-h-screen font-[var(--font-wallet-os-sans)] text-[#121113] dark:text-[var(--color-text-primary)]",
        className,
      )}
    >
      <WalletAtmosphere />
      {children}
    </div>
  );
}

// ─── Card ───────────────────────────────────────────────────────────────────

export const WalletCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean; tone?: "default" | "ink" }
>(({ className, interactive, tone = "default", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-[20px] border transition-all duration-300",
      tone === "ink"
        ? "border-white/[0.06] bg-[#141316] text-white shadow-[0_1px_2px_rgba(0,0,0,0.3),0_20px_44px_-20px_rgba(0,0,0,0.55)]"
        : "border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(16,15,14,0.04),0_10px_28px_-16px_rgba(16,15,14,0.10)] dark:border-[var(--color-border)] dark:bg-[var(--color-surface)]",
      interactive &&
        "hover:-translate-y-[1.5px] hover:shadow-[0_1px_2px_rgba(16,15,14,0.06),0_18px_36px_-16px_rgba(16,15,14,0.16)]",
      className,
    )}
    {...props}
  />
));
WalletCard.displayName = "WalletCard";

// ─── Section heading ────────────────────────────────────────────────────────

export function WalletSectionHeading({
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
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9B968D]">{eyebrow}</p>
        )}
        <h1 className="font-[var(--font-wallet-os-serif)] text-[24px] font-medium tracking-tight text-[#121113] sm:text-[27px]">
          {title}
        </h1>
        {description && <p className="mt-1 text-[13.5px] leading-relaxed text-[#75716A]">{description}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Buttons ────────────────────────────────────────────────────────────────

type WalletButtonVariant = "primary" | "dark" | "outline" | "ghost" | "danger";
type WalletButtonSize = "sm" | "md" | "lg" | "icon";

const buttonVariantClasses: Record<WalletButtonVariant, string> = {
  primary:
    "bg-[#FF5A1F] text-white shadow-[0_1px_2px_rgba(255,90,31,0.22),0_10px_22px_-10px_rgba(255,90,31,0.55)] hover:bg-[#F04E15] active:scale-[0.98]",
  dark: "bg-[#121113] text-white shadow-[0_1px_2px_rgba(0,0,0,0.25)] hover:bg-[#221F20] active:scale-[0.98]",
  outline: "border border-black/10 bg-white text-[#121113] hover:border-black/20 hover:bg-black/[0.02] active:scale-[0.98] dark:border-[var(--color-border)] dark:bg-[var(--color-surface)] dark:text-[var(--color-text-primary)] dark:hover:bg-[var(--color-surface-secondary)]",
  ghost: "text-[#726D64] hover:bg-black/[0.04] hover:text-[#121113] dark:text-[var(--color-text-muted)] dark:hover:bg-[var(--color-surface-secondary)] dark:hover:text-[var(--color-text-primary)]",
  danger: "border border-[#F3D0CB] bg-[#FCECE9] text-[#B93A2A] hover:bg-[#FBE1DC]",
};

const buttonSizeClasses: Record<WalletButtonSize, string> = {
  sm: "h-8 rounded-full px-3.5 text-[12.5px] gap-1.5",
  md: "h-10 rounded-full px-5 text-[13.5px] gap-2",
  lg: "h-12 rounded-full px-7 text-[14.5px] gap-2",
  icon: "h-9 w-9 rounded-full",
};

export interface WalletButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: WalletButtonVariant;
  size?: WalletButtonSize;
  loading?: boolean;
}

export const WalletButton = React.forwardRef<HTMLButtonElement, WalletButtonProps>(
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
      {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  ),
);
WalletButton.displayName = "WalletButton";

// ─── Pill / badge ───────────────────────────────────────────────────────────

export type WalletPillTone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

const pillToneClasses: Record<WalletPillTone, string> = {
  neutral: "bg-black/[0.04] text-[#59544B] border border-black/[0.05]",
  accent: "bg-[#FFF1EA] text-[#D6480F] border border-[#FFDCC7]",
  success: "bg-[#EAF7EE] text-[#1C8A44] border border-[#CFEFDA]",
  warning: "bg-[#FFF6E0] text-[#9A6B00] border border-[#FBE7AE]",
  danger: "bg-[#FDEDEB] text-[#C23A2F] border border-[#F8D3CE]",
  info: "bg-[#EAF1FB] text-[#2560B0] border border-[#D3E3F7]",
};

export function WalletPill({
  children,
  tone = "neutral",
  className,
  icon,
}: {
  children: React.ReactNode;
  tone?: WalletPillTone;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium tracking-[0.01em]", pillToneClasses[tone], className)}>
      {icon}
      {children}
    </span>
  );
}

/** Maps common ledger/withdrawal statuses to a pill tone. */
export function statusTone(status: string | undefined | null): WalletPillTone {
  const s = (status || "").toLowerCase();
  if (["completed", "released", "success", "paid", "active", "approved"].includes(s)) return "success";
  if (["pending", "processing", "in_review", "reviewing"].includes(s)) return "warning";
  if (["failed", "rejected", "disputed", "declined", "cancelled"].includes(s)) return "danger";
  if (["locked", "escrow", "held"].includes(s)) return "info";
  return "neutral";
}

// ─── Stat tile ──────────────────────────────────────────────────────────────

export function WalletStat({
  label,
  value,
  hint,
  tone = "default",
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "accent" | "success" | "warning" | "ink";
  icon?: React.ReactNode;
}) {
  const toneClasses: Record<string, string> = {
    default: "border-black/[0.06] bg-white dark:border-[var(--color-border)] dark:bg-[var(--color-surface)]",
    accent: "border-[#FFDCC7] bg-[#FFF6F1]",
    success: "border-[#CFEFDA] bg-[#F1FAF4]",
    warning: "border-[#FBE7AE] bg-[#FFFAEE]",
    ink: "border-white/[0.06] bg-[#141316] text-white",
  };
  return (
    <div className={cn("rounded-[18px] border p-4", toneClasses[tone])}>
      <div className="flex items-center justify-between gap-2">
        <p
          className={cn(
            "text-[10.5px] font-semibold uppercase tracking-[0.1em]",
            tone === "ink" ? "text-white/50" : "text-[#9B968D]",
          )}
        >
          {label}
        </p>
        {icon && <span className={cn(tone === "ink" ? "text-white/40" : "text-[#C7C1B4]")}>{icon}</span>}
      </div>
      <p
        className={cn(
          "mt-1.5 font-[var(--font-wallet-os-serif)] text-[21px] font-medium tracking-tight",
          tone === "ink" ? "text-white" : "text-[#121113]",
        )}
      >
        {value}
      </p>
      {hint && <p className={cn("mt-1 text-[11px]", tone === "ink" ? "text-white/40" : "text-[#9B968D]")}>{hint}</p>}
    </div>
  );
}

// ─── Progress bar ───────────────────────────────────────────────────────────

export function WalletProgressBar({ value, className }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06]", className)}>
      <div className="h-full rounded-full bg-[#FF5A1F] transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Minimal CSS bar-chart primitive — no chart library dependency. */
export function WalletBarChart({
  data,
  formatValue,
  barColor = WALLET_ACCENT,
  height = 140,
}: {
  data: { label: string; value: number }[];
  formatValue?: (n: number) => string;
  barColor?: string;
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => Math.abs(d.value)));
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => {
        const h = Math.max(3, (Math.abs(d.value) / max) * (height - 28));
        return (
          <div key={`${d.label}-${i}`} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex flex-1 items-end">
              <div
                className="w-full rounded-t-md transition-all duration-500"
                style={{ height: h, backgroundColor: d.value < 0 ? "#DDD8CC" : barColor, opacity: d.value === 0 ? 0.25 : 1 }}
                title={formatValue ? formatValue(d.value) : String(d.value)}
              />
            </div>
            <span className="text-[9.5px] font-medium text-[#9B968D]">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Empty / error / loading states ─────────────────────────────────────────

export function WalletEmptyState({
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
    <div className="flex flex-col items-center justify-center gap-3 rounded-[18px] border border-dashed border-black/10 bg-black/[0.015] px-6 py-12 text-center">
      {icon && <div className="text-[#C7C1B4]">{icon}</div>}
      <div>
        <p className="text-[14px] font-semibold text-[#121113]">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-[#8B8579]">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function WalletErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[18px] border border-[#F8D3CE] bg-[#FDEDEB] px-6 py-10 text-center">
      <p className="text-[14px] font-semibold text-[#B93A2A]">Couldn&apos;t load this view</p>
      <p className="max-w-sm text-[12.5px] leading-relaxed text-[#8B4A40]">
        {message || "Something went wrong. This section may not be wired up yet."}
      </p>
      {onRetry && (
        <WalletButton variant="outline" size="sm" onClick={onRetry}>
          Try again
        </WalletButton>
      )}
    </div>
  );
}

export function WalletSkeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-black/[0.06]", className)} />;
}

export function WalletLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#FF5A1F] border-t-transparent" />
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9B968D]">{label}</p>
    </div>
  );
}

// ─── Fetch hook ─────────────────────────────────────────────────────────────

export type WalletFetchStatus = "loading" | "ready" | "empty" | "error";

/**
 * Small client-side fetch helper shared by every Wallet OS panel so pages
 * degrade gracefully (loading/error) when a `/api/wallet/os/*` endpoint
 * isn't wired up yet.
 */
export function useWalletFetch<T>(url: string, opts?: { deps?: unknown[]; isEmpty?: (data: T) => boolean }) {
  const [status, setStatus] = React.useState<WalletFetchStatus>("loading");
  const [data, setData] = React.useState<T | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [nonce, setNonce] = React.useState(0);

  const deps = opts?.deps ?? [];

  React.useEffect(() => {
    let active = true;
    setStatus("loading");
    setError(null);
    fetch(url, { cache: "no-store" })
      .then(async (res) => {
        if (!active) return;
        if (!res.ok) {
          setStatus("error");
          setError(`Request failed (${res.status})`);
          return;
        }
        const json = (await res.json()) as T;
        if (!active) return;
        setData(json);
        setStatus(opts?.isEmpty?.(json) ? "empty" : "ready");
      })
      .catch((e) => {
        if (!active) return;
        setStatus("error");
        setError(e instanceof Error ? e.message : "Network error");
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, nonce, ...deps]);

  const retry = React.useCallback(() => setNonce((n) => n + 1), []);

  return { status, data, error, retry };
}
