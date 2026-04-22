import * as React from "react";
import { cn } from "@/lib/utils";

// â"€â"€ Professional Solid Tokens (replacing glassmorphism) â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
export const GLASS_TOKENS = {
  light: {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    boxShadow: "var(--shadow-none)",
  },
  dark: {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    boxShadow: "var(--shadow-none)",
  },
  pillLight: {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    boxShadow: "var(--shadow-none)",
  },
  ctaOrange: {
    background: "rgba(249,115,22,0.06)",
    border: "1px solid rgba(249,115,22,0.2)",
    boxShadow: "none",
  }
};

export const STYLES = {
  glassCardLight: GLASS_TOKENS.light as React.CSSProperties,
  glassCardDark: GLASS_TOKENS.dark as React.CSSProperties,
  glassPillLight: GLASS_TOKENS.pillLight as React.CSSProperties,
  glassCtaOrange: GLASS_TOKENS.ctaOrange as React.CSSProperties,
};

// â"€â"€ Components â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

export interface GlassProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "light" | "dark" | "pill" | "cta";
  withSpecular?: boolean;
}

export function GlassCard({
  variant = "light",
  withSpecular = false,
  className,
  style,
  children,
  ...props
}: GlassProps) {
  let tokenStyle;
  if (variant === "dark") tokenStyle = STYLES.glassCardDark;
  else if (variant === "pill") tokenStyle = STYLES.glassPillLight;
  else if (variant === "cta") tokenStyle = STYLES.glassCtaOrange;
  else tokenStyle = STYLES.glassCardLight;

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{ ...tokenStyle, ...style }}
      {...props}
    >
      {withSpecular && <GlassSpecular />}
      {children}
    </div>
  );
}

// Specular removed — returns null for backward compat
export function GlassSpecular() { return null; }

// Ambient glow removed — returns null for backward compat
export function GlassAmbientGlow(_props: {
  color?: string;
  position?: string;
  className?: string;
}) { return null; }

export function GlassPill({
  color = "default",
  className,
  children,
  ...props
}: {
  color?: "default" | "orange" | "emerald" | "blue" | "red" | "indigo" | "amber" | "rose" | "sky" | "purple";
} & React.HTMLAttributes<HTMLDivElement>) {
  const variants = {
    default: "bg-surface/70 border-border text-stone-600 dark:text-text-muted shadow-none",
    orange:  "bg-orange-50/80 dark:bg-orange-500/10 border-orange-100 dark:border-orange-500/20 text-orange-600 dark:text-orange-500 shadow-[0_2px_8px_rgba(251,146,60,0.1)]",
    emerald: "bg-emerald-50/80 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-500 shadow-[0_2px_8px_rgba(16,185,129,0.1)]",
    blue:    "bg-blue-50/80 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 shadow-[0_2px_8px_rgba(59,130,246,0.1)]",
    red:     "bg-rose-50/80 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 shadow-[0_2px_8px_rgba(244,63,94,0.1)]",
    indigo:  "bg-indigo-50/80 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 shadow-[0_2px_8px_rgba(99,102,241,0.1)]",
    amber:   "bg-amber-50/80 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20 text-amber-600 dark:text-amber-500 shadow-[0_2px_8px_rgba(245,158,11,0.1)]",
    rose:    "bg-rose-50/80 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 shadow-[0_2px_8px_rgba(244,63,94,0.1)]",
    sky:     "bg-sky-50/80 dark:bg-sky-500/10 border-sky-100 dark:border-sky-500/20 text-sky-600 dark:text-sky-400 shadow-[0_2px_8px_rgba(14,165,233,0.1)]",
    purple:  "bg-purple-50/80 dark:bg-purple-500/10 border-purple-100 dark:border-purple-500/20 text-purple-600 dark:text-purple-400 shadow-[0_2px_8px_rgba(168,85,247,0.1)]",
  };

  return (
    <div
      className={cn(
        "px-3 py-1 rounded-none text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 border transition-all",
        variants[color],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

