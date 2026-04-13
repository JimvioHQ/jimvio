import * as React from "react";
import { cn } from "@/lib/utils";

// ── Glass Design Tokens ──────────────────────────────────────────
export const GLASS_TOKENS = {
  light: {
    background: "rgba(255, 255, 255, 0.72)",
    backdropFilter: "blur(40px) saturate(180%) brightness(105%)",
    WebkitBackdropFilter: "blur(40px) saturate(180%) brightness(105%)",
    border: "1px solid rgba(255, 255, 255, 0.88)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,1), inset 0 -1px 0 rgba(255,255,255,0.3)",
  },
  dark: {
    background: "rgba(15, 23, 42, 0.88)",
    backdropFilter: "blur(48px) saturate(180%) brightness(95%)",
    WebkitBackdropFilter: "blur(48px) saturate(180%) brightness(95%)",
    border: "1px solid rgba(255, 255, 255, 0.10)",
    boxShadow: "0 16px 48px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.08)",
  },
  pillLight: {
    background: "rgba(255, 255, 255, 0.72)",
    backdropFilter: "blur(20px) saturate(160%)",
    WebkitBackdropFilter: "blur(20px) saturate(160%)",
    border: "1px solid rgba(255, 255, 255, 0.88)",
    boxShadow: "0 2px 10px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,1)",
  },
  ctaOrange: {
    background: "rgba(251,146,60,0.12)",
    backdropFilter: "blur(20px) saturate(160%)",
    WebkitBackdropFilter: "blur(20px) saturate(160%)",
    border: "1px solid rgba(251,146,60,0.35)",
    boxShadow: "0 2px 12px rgba(249,115,22,0.10), inset 0 1px 0 rgba(255,255,255,0.9)",
  }
};

export const STYLES = {
  glassCardLight: GLASS_TOKENS.light as React.CSSProperties,
  glassCardDark: GLASS_TOKENS.dark as React.CSSProperties,
  glassPillLight: GLASS_TOKENS.pillLight as React.CSSProperties,
  glassCtaOrange: GLASS_TOKENS.ctaOrange as React.CSSProperties,
};

// ── Components ────────────────────────────────────────────────────

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

export function GlassSpecular() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 h-px"
      style={{
        background: "linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.95) 40%, rgba(255,255,255,0.7) 60%, transparent 95%)",
      }}
    />
  );
}

export function GlassAmbientGlow({
  color = "orange",
  position = "bottom-right",
  className,
}: {
  color?: "orange" | "indigo" | "blue" | "pink" | "emerald" | "amber" | "rose" | "sky" | "purple";
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
  className?: string;
}) {
  const colors = {
    orange:  "rgba(251,146,60,0.1)",
    indigo:  "rgba(99,102,241,0.08)",
    blue:    "rgba(59,130,246,0.08)",
    pink:    "rgba(236,72,153,0.08)",
    emerald: "rgba(16,185,129,0.08)",
    amber:   "rgba(245,158,11,0.08)",
    rose:    "rgba(244,63,94,0.08)",
    sky:     "rgba(14,165,233,0.08)",
    purple:  "rgba(168,85,247,0.08)",
  };

  const positions = {
    "top-left":     "top-0 left-0 -translate-x-1/2 -translate-y-1/2",
    "top-right":    "top-0 right-0 translate-x-1/2 -translate-y-1/2",
    "bottom-left":  "bottom-0 left-0 -translate-x-1/2 translate-y-1/2",
    "bottom-right": "bottom-0 right-0 translate-x-1/2 translate-y-1/2",
    "center":       "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
  };

  return (
    <div
      className={cn("absolute w-96 h-96 blur-[120px] rounded-full pointer-events-none opacity-50", positions[position], className)}
      style={{ background: colors[color] }}
    />
  );
}

export function GlassPill({
  color = "default",
  className,
  children,
  ...props
}: {
  color?: "default" | "orange" | "emerald" | "blue" | "red" | "indigo" | "amber" | "rose" | "sky" | "purple";
} & React.HTMLAttributes<HTMLDivElement>) {
  const variants = {
    default: "bg-white/70 border-white/80 text-stone-600 shadow-sm",
    orange:  "bg-orange-50/80 border-orange-100 text-orange-600 shadow-[0_2px_8px_rgba(251,146,60,0.1)]",
    emerald: "bg-emerald-50/80 border-emerald-100 text-emerald-600 shadow-[0_2px_8px_rgba(16,185,129,0.1)]",
    blue:    "bg-blue-50/80 border-blue-100 text-blue-600 shadow-[0_2px_8px_rgba(59,130,246,0.1)]",
    red:     "bg-rose-50/80 border-rose-100 text-rose-600 shadow-[0_2px_8px_rgba(244,63,94,0.1)]",
    indigo:  "bg-indigo-50/80 border-indigo-100 text-indigo-600 shadow-[0_2px_8px_rgba(99,102,241,0.1)]",
    amber:   "bg-amber-50/80 border-amber-100 text-amber-600 shadow-[0_2px_8px_rgba(245,158,11,0.1)]",
    rose:    "bg-rose-50/80 border-rose-100 text-rose-600 shadow-[0_2px_8px_rgba(244,63,94,0.1)]",
    sky:     "bg-sky-50/80 border-sky-100 text-sky-600 shadow-[0_2px_8px_rgba(14,165,233,0.1)]",
    purple:  "bg-purple-50/80 border-purple-100 text-purple-600 shadow-[0_2px_8px_rgba(168,85,247,0.1)]",
  };

  return (
    <div
      className={cn(
        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 border backdrop-blur-md transition-all",
        variants[color],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
