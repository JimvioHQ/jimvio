"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Radio, Users, Heart, Share2, Monitor, Mic, MicOff, Video, VideoOff,
  ScreenShare, ScreenShareOff, MessageSquare, Square,
  Loader2, Smile, Send, Wifi, LogIn, Link2, Copy, Check, UserPlus,
  X, AlertTriangle, CheckCircle2, Info,
  Flame, HelpCircle, BarChart3, TrendingUp, Sparkles, Plus, GraduationCap, Calendar, Wallet,
  Target, FileText, Hash, Globe, Lock, ShieldCheck, ChevronDown, ChevronUp, Compass, Crown, MoreHorizontal,
} from "lucide-react";

export function LiveIndicator({ label = "LIVE", className }: { label?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-red-600/20 px-2.5 py-1 text-[10px] font-mono font-medium text-red-400 backdrop-blur-sm", className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
      {label}
    </span>
  );
}

export function HubCard({
  className,
  children,
  padding = true,
}: {
  className?: string;
  children: React.ReactNode;
  padding?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--color-border,#e4e4e7)] bg-[var(--color-surface,#ffffff)] shadow-sm",
        padding && "p-4",
        className
      )}
    >
      {children}
    </div>
  );
}

export function HubSectionTitle({
  title,
  action,
  badge,
}: {
  title: string;
  action?: React.ReactNode;
  badge?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <h3 className="text-[13px] font-bold text-[var(--color-text-primary)]">{title}</h3>
        {badge && (
          <span className="rounded-md bg-[var(--color-surface-secondary)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-text-muted)]">
            {badge}
          </span>
        )}
      </div>
      {action}
    </div>
  );
}

export function HubBadge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: "live" | "new" | "voice" | "default" | "orange";
  className?: string;
}) {
  const styles = {
    live: "bg-red-500 text-white",
    new: "bg-[#fd5000] text-white",
    voice: "bg-violet-600 text-white",
    orange: "bg-[#fd5000]/10 text-[#fd5000]",
    default: "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function HubAvatar({
  name,
  src,
  size = 40,
  live,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  live?: boolean;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      {src ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full rounded-full object-cover ring-2 ring-white"
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-[#fd5000] to-[#ff7a30] text-[11px] font-bold text-white"
          style={{ width: size, height: size }}
        >
          {initials || "?"}
        </div>
      )}
      {live && (
        <span className="absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-white bg-red-500 px-1 text-[7px] font-bold text-white">
          LIVE
        </span>
      )}
    </div>
  );
}

export function HubStatCard({
  label,
  value,
  delta,
  icon,
  accent = "#fd5000",
}: {
  label: string;
  value: string;
  delta?: string;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <HubCard padding className="!p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium text-[var(--color-text-muted)]">{label}</p>
          <p className="mt-1 text-[18px] font-black tracking-tight text-[var(--color-text-primary)]">{value}</p>
          {delta && <p className="mt-0.5 text-[10px] font-semibold text-emerald-600">{delta}</p>}
        </div>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-md"
          style={{ background: `${accent}14`, color: accent }}
        >
          {icon}
        </div>
      </div>
    </HubCard>
  );
}

export function HubProgressBar({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]", className)}>
      <div className="h-full rounded-full bg-[var(--color-accent)] transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function FeatureStatCard({ label, value, delta, icon: Icon, color }: { label: string; value: string | number; delta?: string | null; icon: typeof Users; color: string }) {
  const colorVar = `var(--color-${color})`;
  return (
    <div className="relative group hover-lift animate-in animate-fade-in-up rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)] p-4 transition-all duration-300"
         style={{ background: `linear-gradient(135deg, var(--color-surface), var(--color-surface-secondary))` }}>
      <div className="absolute inset-0 -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
           style={{ background: `radial-gradient(circle at top right, var(--color-${color})15, transparent 60%)` }} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>{label}</p>
          <p className="mt-1 text-[20px] font-black tracking-tight" style={{ color: "var(--color-text-primary)" }}>{value}</p>
          {delta && (
            <p className="mt-1 text-[10px] font-semibold text-emerald-500 flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" /> {delta}
            </p>
          )}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
             style={{ background: `${colorVar}15`, color: colorVar }}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export function HubLinkButton({
  href,
  children,
  variant = "primary",
  className,
  ...props
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "soft";
  className?: string;
} & React.ComponentPropsWithoutRef<typeof Link>) {
  const styles = {
    primary: "bg-[#fd5000] text-white hover:bg-[#e04800] shadow-sm",
    secondary: "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]",
    ghost: "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]",
    soft: "bg-[#fd5000]/12 text-[#fd5000] hover:bg-[#fd5000]/18",
  };
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center rounded-md px-3 py-2 text-[12px] font-semibold transition-colors",
        styles[variant],
        className
      )}
      {...props}
    >
      {children}
    </Link>
  );
}

export function HubPremiumCard({ className }: { className?: string }) {
  return (
    <HubCard className={cn("overflow-hidden !p-0", className)}>
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 p-4 text-white">
        <p className="text-[13px] font-bold">👑 Go Premium</p>
        <p className="mt-1 text-[11px] leading-relaxed text-white/75">
          Unlock advanced analytics, priority support, and creator tools.
        </p>
        <Link
          href="/c/settings"
          className="mt-3 inline-flex rounded-md bg-[#fd5000] px-3 py-2 text-[11px] font-bold text-white transition hover:bg-[#e04800]"
        >
          Upgrade Now
        </Link>
      </div>
    </HubCard>
  );
}

export function HubUserCard({
  name,
  level,
  xp,
  xpMax,
  avatarUrl,
  username,
}: {
  name: string;
  level: string;
  xp: number;
  xpMax: number;
  avatarUrl?: string | null;
  username?: string;
}) {
  return (
    <HubCard padding className="!p-3">
      <div className="flex items-center gap-2.5">
        <HubAvatar name={name} src={avatarUrl} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-bold text-[var(--color-text-primary)]">{name}</p>
          <p className="text-[10px] font-semibold text-[#fd5000]">{level}</p>
        </div>
      </div>
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-[10px] font-semibold text-[var(--color-text-muted)]">
          <span>{xp.toLocaleString()} XP</span>
          <span>{xpMax.toLocaleString()}</span>
        </div>
        <HubProgressBar value={xp} max={xpMax} />
      </div>
      {username && (
        <Link
          href={`/c/profile/${username}`}
          className="mt-2 block text-[10px] font-semibold text-[#fd5000] hover:underline"
        >
          View profile
        </Link>
      )}
    </HubCard>
  );
}
